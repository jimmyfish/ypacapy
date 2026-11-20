//! Redis, through redis-rs: per connection, one multiplexed connection for the tree, key tabs and Info, and
//! one for the console, so a slow or blocking command there never holds up browsing. Opened on demand, kept
//! for the session, on the connection's own database only (0 unless it names another).
//!
//! The same rule as the other engines: ypacapy only runs cheap reads on its own.
//! - the tree reads keys with SCAN (about scan_count per call, more only when asked), never KEYS, plus one
//!   pipelined TYPE and PTTL per key it got; the database's size is DBSIZE
//! - a key tab reads its O(1) length (STRLEN, HLEN, LLEN, SCARD, ZCARD, XLEN) and one page of its value
//!   (GETRANGE up to STRING_CAP, HSCAN, LRANGE, SSCAN, ZRANGE, XREVRANGE)
//! - Info is TYPE, OBJECT ENCODING, PTTL, MEMORY USAGE (5 samples) and OBJECT IDLETIME, read when the dialog
//!   opens and on Refresh
//!
//! The console takes redis-cli text (redis_cli parses it). Redis cannot stop a command it started: Cancel and
//! the command timeout stop the wait here and drop the console's connection, so the next run opens a new one.

use ::redis::aio::MultiplexedConnection;
use ::redis::{AsyncConnectionConfig, Client, ClientTlsConfig, ConnectionAddr, IntoConnectionInfo, RedisConnectionInfo, RedisError, TlsCertificates, Value};

use super::*;
use crate::conns::MongoTls;
use crate::redis_cli::{self, Cmd, Kind};

/// A string value is read up to this many bytes; the rest is left on the server
const STRING_CAP: i64 = 1 << 20;

pub struct ROpen {
    client: Client,
    /// the tree, key tabs, Info and the heartbeat; the heartbeat puts a new one in when it stops answering
    browse: std::sync::Mutex<MultiplexedConnection>,
    /// the console; None after a run was given up on, opened again by the next run
    console: tokio::sync::Mutex<Option<MultiplexedConnection>>,
    /// "Redis 7.2.4", ", replica" when it is one
    pub server: String,
    pub heartbeat: Option<bool>,
    db: i64,
    wait: Duration,
    name: String,
}

fn trimmed(s: &Option<String>) -> Option<String> {
    s.as_deref().map(str::trim).filter(|x| !x.is_empty()).map(String::from)
}

/// The connection's database number; empty is 0
pub fn db_of(conn: &Conn) -> Result<i64, String> {
    match trimmed(&conn.database) {
        None => Ok(0),
        Some(d) => d.trim_start_matches("db").parse::<u32>().map(i64::from).map_err(|_| format!("The database is a number, such as 0. {d} is not one.")),
    }
}

fn client(conn: &Conn, password: Option<String>) -> Result<Client, String> {
    let host = trimmed(&conn.host).unwrap_or_else(|| "localhost".into());
    let port = conn.port.unwrap_or(6379);
    let tls = conn.tls.unwrap_or(MongoTls::Off);
    let addr = match tls {
        MongoTls::Off => ConnectionAddr::Tcp(host, port),
        MongoTls::On => ConnectionAddr::TcpTls { host, port, insecure: false, tls_params: None },
        MongoTls::Insecure => ConnectionAddr::TcpTls { host, port, insecure: true, tls_params: None },
    };
    let mut r = RedisConnectionInfo::default().set_db(db_of(conn)?);
    if let Some(u) = trimmed(&conn.user) {
        r = r.set_username(u);
    }
    if let Some(p) = password.filter(|p| !p.is_empty()) {
        r = r.set_password(p);
    }
    let info = addr.into_connection_info().map_err(|e| err_text(&e))?.set_redis_settings(r);
    let read = |f: &Option<String>| -> Result<Option<Vec<u8>>, String> {
        trimmed(f).map(|p| crate::paths::expand_tilde(&p)).map(|p| std::fs::read(&p).map_err(|e| format!("Could not read {}: {e}", p.display()))).transpose()
    };
    let (ca, cert) = (read(&conn.ssl_ca)?, read(&conn.tls_cert)?);
    if tls != MongoTls::Off && (ca.is_some() || cert.is_some()) {
        // one PEM file holds the client certificate and its key; each is read from it
        let certs = TlsCertificates { client_tls: cert.map(|b| ClientTlsConfig { client_cert: b.clone(), client_key: b }), root_cert: ca };
        return Client::build_with_tls(info, certs).map_err(|e| err_text(&e));
    }
    Client::open(info).map_err(|e| err_text(&e))
}

/// The server's error as redis-cli prints it after "(error) ": WRONGTYPE Operation against a key …
pub fn err_text(e: &RedisError) -> String {
    match (e.code(), e.detail()) {
        (Some(c), Some(d)) => format!("{c} {d}"),
        (Some(c), None) => c.to_string(),
        _ => e.to_string(),
    }
}

fn lost(e: &RedisError) -> bool {
    e.is_io_error() || e.is_connection_dropped() || e.is_connection_refusal() || e.is_timeout()
}

fn secs(n: Option<u32>, default: u64) -> Duration {
    Duration::from_secs(n.filter(|s| *s > 0).map(u64::from).unwrap_or(default))
}

async fn open_one(client: &Client, wait: Duration, name: &str) -> Result<MultiplexedConnection, RedisError> {
    let cfg = AsyncConnectionConfig::new().set_connection_timeout(Some(wait)).set_response_timeout(None);
    let mut c = client.get_multiplexed_async_connection_with_config(&cfg).await?;
    // the name shows in CLIENT LIST; a server that refuses it is fine
    let _: Result<Value, _> = ::redis::cmd("CLIENT").arg("SETNAME").arg(name).query_async(&mut c).await;
    Ok(c)
}

/// "Redis 7.2.4"; ", replica" when this server is one. INFO may be off for this user: then just "Redis".
async fn server_of(c: &mut MultiplexedConnection) -> String {
    let info: Result<String, _> = ::redis::cmd("INFO").arg("server").query_async(c).await;
    let Ok(info) = info else { return "Redis".into() };
    let field = |k: &str| info.lines().find_map(|l| l.strip_prefix(k)).map(|v| v.trim().to_string());
    let name = if field("server_name:").as_deref() == Some("valkey") { "Valkey" } else { "Redis" };
    let mut s = format!("{name} {}", field("valkey_version:").or_else(|| field("redis_version:")).unwrap_or_default()).trim().to_string();
    let rep: Result<String, _> = ::redis::cmd("INFO").arg("replication").query_async(c).await;
    if rep.is_ok_and(|r| r.lines().any(|l| l.trim() == "role:slave")) {
        s += ", replica";
    }
    s
}

async fn connect(conn: &Conn, password: Option<String>) -> Result<ROpen, String> {
    let client = client(conn, password)?;
    let wait = secs(conn.connect_timeout, 15);
    let name = trimmed(&conn.app_name).unwrap_or_else(|| "ypacapy".into()).replace(char::is_whitespace, "-");
    let mut browse = tokio::time::timeout(wait, open_one(&client, wait, &name)).await.map_err(|_| format!("No answer in {} s", wait.as_secs()))?.map_err(|e| err_text(&e))?;
    let pong: Result<Value, _> = ::redis::cmd("PING").query_async(&mut browse).await;
    pong.map_err(|e| err_text(&e))?;
    let server = server_of(&mut browse).await;
    Ok(ROpen { client, browse: std::sync::Mutex::new(browse), console: tokio::sync::Mutex::new(None), server, heartbeat: conn.heartbeat, db: db_of(conn)?, wait, name })
}

impl DbState {
    pub(super) async fn redis(&self, conn: &Conn) -> Result<Arc<ROpen>, String> {
        if let Some(o) = self.redis.lock().await.get(&conn.id) {
            return Ok(o.clone());
        }
        let password = password_for(conn).await?;
        let open = Arc::new(connect(conn, password).await?);
        Ok(self.redis.lock().await.entry(conn.id.clone()).or_insert(open).clone())
    }
    pub(super) async fn drop_redis(&self, id: &str) {
        // dropping the last handle closes the sockets
        self.redis.lock().await.remove(id);
    }
}

impl ROpen {
    fn browse(&self) -> MultiplexedConnection {
        self.browse.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }
    /// A multiplexed connection doesn't heal: open a new one, and use it if it answers
    async fn renew(&self) -> bool {
        let fresh = async {
            let mut c = open_one(&self.client, self.wait, &self.name).await?;
            let _: Value = ::redis::cmd("PING").query_async(&mut c).await?;
            Ok::<_, RedisError>(c)
        };
        match tokio::time::timeout(super::BEAT_WAIT, fresh).await {
            Ok(Ok(c)) => {
                *self.browse.lock().unwrap_or_else(|e| e.into_inner()) = c;
                self.drop_console().await;
                true
            }
            _ => false,
        }
    }
    async fn console(&self) -> Result<MultiplexedConnection, RedisError> {
        let mut c = self.console.lock().await;
        if let Some(con) = c.as_ref() {
            return Ok(con.clone());
        }
        let con = open_one(&self.client, self.wait, &self.name).await?;
        *c = Some(con.clone());
        Ok(con)
    }
    async fn drop_console(&self) {
        *self.console.lock().await = None;
    }
}

// ---------- values, as redis-cli shows them ----------

/// A value as text: itself when it is UTF-8, else redis-cli's escapes (\x00)
pub fn text(b: &[u8]) -> String {
    match std::str::from_utf8(b) {
        Ok(s) => s.to_string(),
        Err(_) => escaped(b),
    }
}

fn escaped(b: &[u8]) -> String {
    let mut s = String::new();
    for ch in String::from_utf8_lossy(b).chars() {
        if ch == char::REPLACEMENT_CHARACTER {
            // the bytes behind it are not UTF-8: show them one by one
            break;
        }
        s.push(ch);
    }
    if s.len() == b.len() || std::str::from_utf8(b).is_ok() {
        return s;
    }
    b.iter().map(|&c| if c.is_ascii_graphic() || c == b' ' { (c as char).to_string() } else { format!("\\x{c:02x}") }).collect()
}

/// redis-cli's quoted string: "a\"b\n"
fn quoted(b: &[u8]) -> String {
    let mut s = String::from("\"");
    let t = std::str::from_utf8(b);
    match t {
        Ok(t) => {
            for ch in t.chars() {
                match ch {
                    '"' => s += "\\\"",
                    '\\' => s += "\\\\",
                    '\n' => s += "\\n",
                    '\r' => s += "\\r",
                    '\t' => s += "\\t",
                    '\u{7}' => s += "\\a",
                    '\u{8}' => s += "\\b",
                    c if c.is_control() => s += &format!("\\x{:02x}", c as u32),
                    c => s.push(c),
                }
            }
        }
        Err(_) => {
            for &c in b {
                match c {
                    b'"' => s += "\\\"",
                    b'\\' => s += "\\\\",
                    c if c.is_ascii_graphic() || c == b' ' => s.push(c as char),
                    c => s += &format!("\\x{c:02x}"),
                }
            }
        }
    }
    s.push('"');
    s
}

/// The reply as redis-cli prints it, one line per entry, nested arrays indented under their number
fn raw_lines(v: &Value) -> Vec<String> {
    match v {
        Value::Nil => vec!["(nil)".into()],
        Value::Int(n) => vec![format!("(integer) {n}")],
        Value::BulkString(b) => vec![quoted(b)],
        Value::SimpleString(s) => vec![s.clone()],
        Value::Okay => vec!["OK".into()],
        Value::Double(d) => vec![format!("(double) {d}")],
        Value::Boolean(b) => vec![format!("({b})")],
        Value::VerbatimString { text, .. } => text.lines().map(String::from).collect(),
        Value::ServerError(e) => vec![format!("(error) {} {}", e.code(), e.details().unwrap_or(""))],
        Value::Attribute { data, .. } => raw_lines(data),
        Value::Array(a) | Value::Set(a) | Value::Push { data: a, .. } => numbered(a.iter().map(raw_lines).collect(), ")"),
        Value::Map(m) => numbered(m.iter().map(|(k, v)| { let mut l = raw_lines(k); let r = raw_lines(v); let last = l.pop().unwrap_or_default(); l.push(format!("{last} => {}", r.first().cloned().unwrap_or_default())); l.extend(r.into_iter().skip(1)); l }).collect(), "#"),
        other => vec![format!("{other:?}")],
    }
}

fn numbered(items: Vec<Vec<String>>, mark: &str) -> Vec<String> {
    if items.is_empty() {
        return vec!["(empty array)".into()];
    }
    let w = items.len().to_string().len();
    let mut out = vec![];
    for (i, lines) in items.into_iter().enumerate() {
        let p = format!("{:>w$}{mark} ", i + 1);
        for (j, l) in lines.into_iter().enumerate() {
            out.push(if j == 0 { format!("{p}{l}") } else { format!("{}{l}", " ".repeat(p.len())) });
        }
    }
    out
}

pub fn raw(v: &Value) -> String {
    raw_lines(v).join("\n")
}

/// One value for a table cell: text as it is; a nested reply on one line
fn cell(v: &Value) -> Option<String> {
    match v {
        Value::Nil => None,
        Value::Int(n) => Some(n.to_string()),
        Value::BulkString(b) => Some(text(b)),
        Value::SimpleString(s) => Some(s.clone()),
        Value::Okay => Some("OK".into()),
        Value::Double(d) => Some(d.to_string()),
        Value::Boolean(b) => Some(b.to_string()),
        Value::VerbatimString { text, .. } => Some(text.clone()),
        Value::Array(a) | Value::Set(a) => Some(format!("[{}]", a.iter().map(|x| match x { Value::BulkString(b) => quoted(b), o => cell(o).unwrap_or_else(|| "nil".into()) }).collect::<Vec<_>>().join(", "))),
        other => Some(raw(other).replace('\n', " ")),
    }
}

fn col(name: &str, ty: &str) -> ColMeta {
    ColMeta { name: name.into(), ty: ty.into() }
}

fn items(v: &Value) -> Option<&Vec<Value>> {
    match v {
        Value::Array(a) | Value::Set(a) => Some(a),
        _ => None,
    }
}

/// pairs of a flat array: field value field value …
fn pairs(a: &[Value], left: &str, right: (&str, &str)) -> Table {
    (vec![col(left, "string"), col(right.0, right.1)], a.chunks(2).map(|p| vec![cell(&p[0]), p.get(1).and_then(cell)]).collect())
}

/// A stream's entries ([id, [field, value, …]] each): the id, then a column per field in first-seen order
/// columns and rows of a table
type Table = (Vec<ColMeta>, Vec<Vec<Option<String>>>);

fn entries(a: &[Value]) -> Option<Table> {
    let mut fields: Vec<String> = vec![];
    let mut parsed = vec![];
    for e in a {
        let pair = items(e)?;
        let (id, kv) = (pair.first().and_then(cell)?, items(pair.get(1)?)?);
        let kv: Vec<(String, Option<String>)> = kv.chunks(2).map(|p| (cell(&p[0]).unwrap_or_default(), p.get(1).and_then(cell))).collect();
        for (k, _) in &kv {
            if !fields.contains(k) {
                fields.push(k.clone());
            }
        }
        parsed.push((id, kv));
    }
    let mut cols = vec![col("id", "stream id")];
    cols.extend(fields.iter().map(|f| col(f, "string")));
    let rows = parsed.into_iter().map(|(id, kv)| std::iter::once(Some(id)).chain(fields.iter().map(|f| kv.iter().find(|(k, _)| k == f).and_then(|(_, v)| v.clone()))).collect()).collect();
    Some((cols, rows))
}

/// The table for one reply, shaped by the command that asked: pairs for HGETALL and WITHSCORES, the items of a
/// SCAN, the fields of INFO, a column per field for stream entries, else one row per element. Also a note.
fn table(c: &Cmd, v: &Value) -> (Vec<ColMeta>, Vec<Vec<Option<String>>>, Option<String>) {
    let name = c.name();
    let n = name.as_str();
    let scalar = |ty: &str| (vec![col("value", ty)], vec![vec![cell(v)]], None);
    match v {
        Value::Int(_) => return (vec![col("integer", "integer")], vec![vec![cell(v)]], None),
        Value::Double(_) => return scalar("double"),
        Value::BulkString(b) if n == "INFO" || (n == "CLIENT" && c.upper(1).as_deref() == Some("LIST")) => {
            let t = text(b);
            if n == "INFO" {
                let rows = t.lines().filter_map(|l| l.split_once(':')).map(|(k, x)| vec![Some(k.to_string()), Some(x.trim().to_string())]).collect();
                return (vec![col("field", "string"), col("value", "string")], rows, None);
            }
            return (vec![col("client", "string")], t.lines().map(|l| vec![Some(l.to_string())]).collect(), None);
        }
        Value::Array(_) | Value::Set(_) => {}
        _ => return scalar("string"),
    }
    let a = items(v).unwrap();
    // SCAN family: [cursor, [items]]
    if matches!(n, "SCAN" | "HSCAN" | "SSCAN" | "ZSCAN") && a.len() == 2 {
        let cursor = cell(&a[0]).unwrap_or_default();
        let note = Some(if cursor == "0" { "Cursor 0, so the scan is done".to_string() } else { format!("Next cursor {cursor}. Run again with it for the next batch") });
        let list = items(&a[1]).cloned().unwrap_or_default();
        let (cols, rows) = match n {
            "HSCAN" if !c.has("NOVALUES") => pairs(&list, "field", ("value", "string")),
            "ZSCAN" => pairs(&list, "member", ("score", "double")),
            "SCAN" => (vec![col("key", "string")], list.iter().map(|x| vec![cell(x)]).collect()),
            _ => (vec![col("member", "string")], list.iter().map(|x| vec![cell(x)]).collect()),
        };
        return (cols, rows, note);
    }
    let with_scores = c.has("WITHSCORES") || matches!(n, "ZPOPMIN" | "ZPOPMAX");
    if n.starts_with('Z') && with_scores && a.iter().all(|x| !matches!(x, Value::Array(_))) {
        let (c, r) = pairs(a, "member", ("score", "double"));
        return (c, r, None);
    }
    if matches!(n, "HGETALL" | "CONFIG") || (n == "HRANDFIELD" && c.has("WITHVALUES")) {
        let (c, r) = pairs(a, "field", ("value", "string"));
        return (c, r, None);
    }
    if matches!(n, "XRANGE" | "XREVRANGE") {
        if let Some((c, r)) = entries(a) {
            return (c, r, None);
        }
    }
    let head = match n {
        "KEYS" => "key",
        "SMEMBERS" | "SRANDMEMBER" | "SINTER" | "SUNION" | "SDIFF" | "ZRANGE" | "ZREVRANGE" | "ZRANGEBYSCORE" | "ZREVRANGEBYSCORE" | "ZRANGEBYLEX" | "ZREVRANGEBYLEX" => "member",
        "HKEYS" => "field",
        _ => "value",
    };
    (vec![col(head, "string")], a.iter().map(|x| vec![cell(x)]).collect(), None)
}

fn summary(v: &Value) -> String {
    match v {
        Value::Nil => "(nil)".into(),
        Value::Int(n) => format!("(integer) {n}"),
        Value::Okay => "OK".into(),
        Value::SimpleString(s) => s.clone(),
        Value::BulkString(b) => format!("a string of {} byte{}", b.len(), if b.len() == 1 { "" } else { "s" }),
        Value::Array(a) | Value::Set(a) => plural(a.len(), "element"),
        Value::Double(d) => format!("(double) {d}"),
        _ => "a reply".into(),
    }
}

fn query(c: &Cmd) -> ::redis::Cmd {
    let mut q = ::redis::cmd(&String::from_utf8_lossy(&c.args[0]));
    for a in &c.args[1..] {
        q.arg(a.as_slice());
    }
    q
}

// ---------- connections ----------

pub async fn test(conn: &Conn, password: Option<String>) -> Result<TestResult, String> {
    let t = Instant::now();
    let open = connect(conn, password).await?;
    let mut c = open.browse();
    let size: Option<i64> = ::redis::cmd("DBSIZE").query_async(&mut c).await.ok();
    let ms = t.elapsed().as_millis() as u64;
    let server = match size {
        Some(n) => format!("{}. db{} holds {} key{}", open.server, open.db, group(n), if n == 1 { "" } else { "s" }),
        None => open.server.clone(),
    };
    Ok(TestResult { server, ms })
}

/// 1204331 as 1,204,331
fn group(n: i64) -> String {
    let s = n.abs().to_string();
    let mut out = String::new();
    for (i, ch) in s.chars().enumerate() {
        if i > 0 && (s.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(ch);
    }
    if n < 0 { format!("-{out}") } else { out }
}

/// The connection's database is the only one: no list of the others is read
pub async fn open_info(state: &DbState, conn: &Conn) -> Result<OpenInfo, String> {
    let open = state.redis(conn).await?;
    let db = open.db.to_string();
    Ok(OpenInfo { server: open.server.clone(), databases: vec![db.clone()], database: db.clone(), schemas: vec![db.clone()], default_schema: db })
}

// ---------- the tree: SCAN ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanKey {
    key: String,
    /// string, hash, list, set, zset, stream, or a module's type name; none when it went away meanwhile
    #[serde(rename = "type")]
    kind: String,
    /// ms left, as PTTL said when it was read; -1 no expiry
    ttl_ms: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanPage {
    /// "0" when the scan is done
    cursor: String,
    keys: Vec<ScanKey>,
    /// DBSIZE, with this page
    total: i64,
}

/// One SCAN step from `cursor` ("0" starts over), with TYPE and PTTL for each key it returned, in one pipeline.
/// `pattern` is SCAN's MATCH. COUNT is the connection's Keys per scan.
#[tauri::command]
pub async fn redis_scan(id: String, cursor: String, pattern: Option<String>, state: State<'_, DbState>) -> Result<ScanPage, String> {
    let conn = conns::find(&id)?;
    let open = state.redis(&conn).await?;
    let mut c = open.browse();
    let count = conn.scan_count.filter(|n| *n > 0).unwrap_or(1000);
    let mut q = ::redis::cmd("SCAN");
    q.arg(cursor.trim().parse::<u64>().unwrap_or(0));
    if let Some(p) = pattern.as_deref().map(str::trim).filter(|p| !p.is_empty()) {
        q.arg("MATCH").arg(p);
    }
    q.arg("COUNT").arg(count);
    let res = async {
        let (next, keys): (String, Vec<Vec<u8>>) = q.query_async(&mut c).await?;
        let mut p = ::redis::pipe();
        p.ignore_errors();
        for k in &keys {
            p.cmd("TYPE").arg(k.as_slice()).cmd("PTTL").arg(k.as_slice());
        }
        p.cmd("DBSIZE");
        let got: Vec<Value> = p.query_async(&mut c).await?;
        Ok::<_, RedisError>((next, keys, got))
    }
    .await;
    let (next, keys, got) = match res {
        Ok(r) => r,
        Err(e) => {
            if lost(&e) {
                state.lose(&conn).await;
            }
            return Err(err_text(&e));
        }
    };
    let int = |v: Option<&Value>| match v {
        Some(Value::Int(n)) => *n,
        _ => -1,
    };
    let keys = keys
        .iter()
        .enumerate()
        .map(|(i, k)| ScanKey {
            key: text(k),
            kind: match got.get(i * 2) {
                Some(Value::SimpleString(s)) => s.clone(),
                Some(Value::Okay) => "string".into(),
                _ => "none".into(),
            },
            ttl_ms: int(got.get(i * 2 + 1)),
        })
        .filter(|k| k.kind != "none")
        .collect();
    Ok(ScanPage { cursor: next, keys, total: int(got.last()).max(0) })
}

// ---------- the key tab ----------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyRequest {
    run_id: String,
    conn_id: String,
    key: String,
    /// hash and set: the SCAN cursor of this page ("0" for the first)
    cursor: Option<String>,
    /// list and sorted set: the index this page starts at
    offset: Option<i64>,
    /// stream: the page starts after this id (newest first); none for the newest
    after: Option<String>,
    /// hash and set: HSCAN or SSCAN's MATCH
    pattern: Option<String>,
    /// sorted set: lowest score first; the default is highest first
    #[serde(default)]
    ascending: bool,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct KeyPage {
    /// string, hash, list, set, zset, stream, a module's type, or none (the key is gone)
    #[serde(rename = "type")]
    kind: String,
    /// STRLEN (bytes), HLEN, LLEN, SCARD, ZCARD or XLEN
    len: Option<i64>,
    /// ms left; -1 no expiry
    ttl_ms: i64,
    columns: Vec<ColMeta>,
    rows: Vec<Vec<Option<String>>>,
    /// string: its value, up to STRING_CAP bytes, as text
    value: Option<String>,
    /// string: not UTF-8, shown with \x escapes
    binary: bool,
    /// string: longer than what was read
    cut: bool,
    /// hash and set: the next page's cursor; list and zset: its offset; stream: the last id. None at the end
    next: Option<String>,
    ms: u64,
}

async fn read_key(c: &mut MultiplexedConnection, r: &KeyRequest, page: i64) -> Result<KeyPage, RedisError> {
    let key = r.key.as_bytes();
    let (kind, ttl): (String, i64) = ::redis::pipe().cmd("TYPE").arg(key).cmd("PTTL").arg(key).query_async(c).await?;
    let mut p = KeyPage { kind: kind.clone(), ttl_ms: ttl, ..Default::default() };
    let len_cmd = match kind.as_str() {
        "string" => "STRLEN",
        "hash" => "HLEN",
        "list" => "LLEN",
        "set" => "SCARD",
        "zset" => "ZCARD",
        "stream" => "XLEN",
        _ => return Ok(p),
    };
    p.len = ::redis::cmd(len_cmd).arg(key).query_async(c).await.ok();
    let pattern = r.pattern.as_deref().map(str::trim).filter(|x| !x.is_empty() && *x != "*");
    let cursor = r.cursor.as_deref().and_then(|x| x.parse::<u64>().ok()).unwrap_or(0);
    let offset = r.offset.unwrap_or(0).max(0);
    let next_offset = |n: usize| if (n as i64) < page { None } else { Some((offset + page).to_string()) };
    match kind.as_str() {
        "string" => {
            let v: Vec<u8> = ::redis::cmd("GETRANGE").arg(key).arg(0).arg(STRING_CAP - 1).query_async(c).await?;
            p.binary = std::str::from_utf8(&v).is_err();
            p.cut = p.len.is_some_and(|l| l > STRING_CAP);
            p.value = Some(text(&v));
        }
        "hash" | "set" => {
            let mut q = ::redis::cmd(if kind == "hash" { "HSCAN" } else { "SSCAN" });
            q.arg(key).arg(cursor);
            if let Some(m) = pattern {
                q.arg("MATCH").arg(m);
            }
            q.arg("COUNT").arg(page);
            let (next, list): (String, Vec<Value>) = q.query_async(c).await?;
            let (cols, rows) = if kind == "hash" { pairs(&list, "field", ("value", "string")) } else { (vec![col("member", "string")], list.iter().map(|x| vec![cell(x)]).collect()) };
            (p.columns, p.rows) = (cols, rows);
            p.next = Some(next).filter(|n| n != "0");
        }
        "list" => {
            let list: Vec<Value> = ::redis::cmd("LRANGE").arg(key).arg(offset).arg(offset + page - 1).query_async(c).await?;
            p.columns = vec![col("index", "integer"), col("value", "string")];
            p.rows = list.iter().enumerate().map(|(i, x)| vec![Some((offset + i as i64).to_string()), cell(x)]).collect();
            p.next = next_offset(list.len());
        }
        "zset" => {
            let mut q = ::redis::cmd("ZRANGE");
            q.arg(key).arg(offset).arg(offset + page - 1);
            if !r.ascending {
                q.arg("REV");
            }
            let list: Vec<Value> = q.arg("WITHSCORES").query_async(c).await?;
            p.columns = vec![col("rank", "integer"), col("member", "string"), col("score", "double")];
            p.rows = list.chunks(2).enumerate().map(|(i, x)| vec![Some((offset + i as i64 + 1).to_string()), cell(&x[0]), x.get(1).and_then(cell)]).collect();
            p.next = next_offset(list.len() / 2);
        }
        "stream" => {
            let start = r.after.as_deref().map(|id| format!("({id}")).unwrap_or_else(|| "+".into());
            let list: Vec<Value> = ::redis::cmd("XREVRANGE").arg(key).arg(start).arg("-").arg("COUNT").arg(page).query_async(c).await?;
            let (cols, rows) = entries(&list).unwrap_or_default();
            p.next = if (rows.len() as i64) < page { None } else { rows.last().and_then(|r| r[0].clone()) };
            (p.columns, p.rows) = (cols, rows);
        }
        _ => {}
    }
    Ok(p)
}

/// One page of a key, read for its type. Run again for the next page with the `next` it gave.
#[tauri::command]
pub async fn redis_key(req: KeyRequest, state: State<'_, DbState>, settings: State<'_, SettingsState>) -> Result<KeyPage, String> {
    let conn = conns::find(&req.conn_id)?;
    let t = Instant::now();
    let open = state.redis(&conn).await?;
    let page = conn.row_limit.map(i64::from).unwrap_or_else(|| settings.u64("rowLimit", 100) as i64).clamp(1, 10_000);
    let token = CancellationToken::new();
    if let Ok(mut runs) = state.runs.lock() {
        runs.insert(req.run_id.clone(), token.clone());
    }
    let mut c = open.browse();
    let out = tokio::select! {
        r = read_key(&mut c, &req, page) => Some(r),
        _ = token.cancelled() => None,
    };
    if let Ok(mut runs) = state.runs.lock() {
        runs.remove(&req.run_id);
    }
    match out {
        None => Err("Stopped reading the key.".into()),
        Some(Ok(mut p)) => {
            p.ms = t.elapsed().as_millis() as u64;
            Ok(p)
        }
        Some(Err(e)) => {
            if lost(&e) {
                state.lose(&conn).await;
            }
            Err(err_text(&e))
        }
    }
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct KeyInfo {
    #[serde(rename = "type")]
    kind: String,
    encoding: Option<String>,
    len: Option<i64>,
    ttl_ms: i64,
    /// MEMORY USAGE with 5 samples; None when the server does not allow it
    memory: Option<i64>,
    /// seconds since the last read or write; None under an LFU eviction policy
    idle: Option<i64>,
    read_at: i64,
}

/// Info: TYPE, OBJECT ENCODING, the length, PTTL, MEMORY USAGE (5 samples) and OBJECT IDLETIME, in one pipeline.
/// Read when the dialog opens and on Refresh, never on its own.
#[tauri::command]
pub async fn redis_key_info(id: String, key: String, state: State<'_, DbState>) -> Result<KeyInfo, String> {
    let conn = conns::find(&id)?;
    let open = state.redis(&conn).await?;
    let mut c = open.browse();
    let k = key.as_bytes();
    let kind: String = ::redis::cmd("TYPE").arg(k).query_async(&mut c).await.map_err(|e| err_text(&e))?;
    let len_cmd = match kind.as_str() {
        "string" => Some("STRLEN"),
        "hash" => Some("HLEN"),
        "list" => Some("LLEN"),
        "set" => Some("SCARD"),
        "zset" => Some("ZCARD"),
        "stream" => Some("XLEN"),
        _ => None,
    };
    let mut p = ::redis::pipe();
    p.ignore_errors();
    p.cmd("OBJECT").arg("ENCODING").arg(k).cmd("PTTL").arg(k).cmd("MEMORY").arg("USAGE").arg(k).arg("SAMPLES").arg(5).cmd("OBJECT").arg("IDLETIME").arg(k);
    if let Some(l) = len_cmd {
        p.cmd(l).arg(k);
    }
    let got: Vec<Value> = p.query_async(&mut c).await.map_err(|e| err_text(&e))?;
    let int = |i: usize| match got.get(i) {
        Some(Value::Int(n)) => Some(*n),
        _ => None,
    };
    Ok(KeyInfo {
        encoding: match got.first() {
            Some(Value::BulkString(b)) => Some(text(b)),
            Some(Value::SimpleString(s)) => Some(s.clone()),
            _ => None,
        },
        ttl_ms: int(1).unwrap_or(-2),
        memory: int(2),
        idle: int(3),
        len: if len_cmd.is_some() { int(4) } else { None },
        kind,
        read_at: conns::now_ms(),
    })
}

// ---------- the console ----------

enum Step {
    Done(Vec<(Cmd, Value, u64)>),
    /// a command failed; the replies before it, then which and why
    Failed(Vec<(Cmd, Value, u64)>, usize, RedisError),
    Cancelled(bool),
}

/// For WRONGTYPE: the command that reads the key's real type whole
fn reader(kind: &str, key: &str) -> Option<String> {
    let k = if key.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'') { quoted(key.as_bytes()) } else { key.to_string() };
    Some(match kind {
        "string" => format!("GET {k}"),
        "hash" => format!("HGETALL {k}"),
        "list" => format!("LRANGE {k} 0 -1"),
        "set" => format!("SMEMBERS {k}"),
        "zset" => format!("ZRANGE {k} 0 -1 WITHSCORES"),
        "stream" => format!("XRANGE {k} - +"),
        _ => return None,
    })
}

const TYPE_WORDS: &[(&str, &str)] = &[("string", "a string"), ("hash", "a hash"), ("list", "a list"), ("set", "a set"), ("zset", "a sorted set"), ("stream", "a stream")];

pub async fn run(req: RunRequest, conn: Conn, state: &DbState, settings: &SettingsState, guard_state: &GuardState, store: &LocalStore) -> Result<RunOutcome, String> {
    let t = Instant::now();
    let ms = |t: &Instant| t.elapsed().as_millis() as u64;
    let cmds = match redis_cli::parse(&req.sql) {
        Ok(c) => c,
        Err(e) => {
            return Ok(RunOutcome::Error {
                title: "Capy couldn't make sense of the command".into(),
                says: Some(e.says(&req.sql)),
                message: e.message.clone(),
                hint: Some(format!("Capy reads it before sending, so nothing was sent to {}.", conn.name)),
                lost: false,
                ms: ms(&t),
                fix: None,
            })
        }
    };
    let (ops, unknown) = match redis_cli::kinds(&cmds) {
        Ok(k) => k,
        Err((i, why)) => {
            return Ok(RunOutcome::Error { title: format!("Capy won't send {}", cmds[i].name()), says: None, message: why.into(), hint: Some(format!("Nothing was sent to {}.", conn.name)), lost: false, ms: ms(&t), fix: None })
        }
    };
    let mut writes: Vec<&'static str> = ops.iter().map(|(k, _)| *k).collect();
    writes.dedup();
    if let Some(ask) = guard::check_kinds(writes, unknown, Some(ops), &conn, req.approval, guard_state).await? {
        return Ok(RunOutcome::Ask(ask));
    }
    let timeout_s = conn.statement_timeout.map(u64::from).unwrap_or_else(|| settings.u64("statementTimeout", 30));
    let token = CancellationToken::new();
    if let Ok(mut runs) = state.runs.lock() {
        runs.insert(req.run_id.clone(), token.clone());
    }
    let started_at = conns::now_ms();
    let open = match state.redis(&conn).await {
        Ok(o) => o,
        Err(e) => {
            if let Ok(mut runs) = state.runs.lock() {
                runs.remove(&req.run_id);
            }
            return Ok(RunOutcome::Error { title: format!("Could not open {}", conn.name), says: None, message: e, hint: None, lost: true, ms: ms(&t), fix: None });
        }
    };
    let work = async {
        let mut con = match open.console().await {
            Ok(c) => c,
            Err(e) => return Step::Failed(vec![], 0, e),
        };
        let mut done = vec![];
        for (i, c) in cmds.iter().enumerate() {
            let t1 = Instant::now();
            match query(c).query_async::<Value>(&mut con).await {
                Ok(v) => done.push((c.clone(), v, t1.elapsed().as_millis() as u64)),
                Err(e) => return Step::Failed(done, i, e),
            }
        }
        Step::Done(done)
    };
    let sleep = async {
        if timeout_s > 0 {
            tokio::time::sleep(Duration::from_secs(timeout_s)).await
        } else {
            std::future::pending::<()>().await
        }
    };
    let step = tokio::select! {
        s = work => s,
        _ = token.cancelled() => Step::Cancelled(false),
        _ = sleep => Step::Cancelled(true),
    };
    if let Ok(mut runs) = state.runs.lock() {
        runs.remove(&req.run_id);
    }
    let elapsed = ms(&t);
    let outcome = match step {
        Step::Cancelled(timeout) => {
            // the command may still be running on the server; this connection is not used again
            open.drop_console().await;
            RunOutcome::Cancelled { ms: elapsed, timeout }
        }
        Step::Failed(before, i, e) => {
            let ran = if before.is_empty() { None } else { Some(format!("The {} before it ran.", if before.len() == 1 { "command".to_string() } else { format!("{} commands", before.len()) })) };
            if lost(&e) {
                open.drop_console().await;
                state.lose(&conn).await;
                RunOutcome::Error {
                    title: format!("Lost the connection to {}", conn.name),
                    says: None,
                    message: err_text(&e),
                    hint: Some(ran.unwrap_or_else(|| "A read is safe to send again; Capy never resends a write on its own.".into())),
                    lost: true,
                    ms: elapsed,
                    fix: None,
                }
            } else {
                let c = &cmds[i];
                let msg = err_text(&e);
                let (mut title, mut hint, mut fix) = (capitalise(msg.lines().next().unwrap_or("")), ran.clone(), None);
                if e.code() == Some("WRONGTYPE") && c.args.len() > 1 {
                    let key = text(&c.args[1]);
                    let mut b = open.browse();
                    let real: Option<String> = ::redis::cmd("TYPE").arg(&c.args[1]).query_async(&mut b).await.ok();
                    if let Some((ty, words)) = real.as_deref().and_then(|r| TYPE_WORDS.iter().find(|(k, _)| *k == r)) {
                        title = format!("{key} is {words}, and {} does not read {}", c.name(), if *ty == "string" { "strings" } else { "that type" });
                        fix = reader(ty, &key);
                        hint = Some(format!("Redis checked the key's type and read nothing.{}{}", fix.as_ref().map(|f| format!(" {} reads {words} whole.", f.split(' ').next().unwrap_or(""))).unwrap_or_default(), ran.map(|r| format!(" {r}")).unwrap_or_default()));
                    }
                }
                RunOutcome::Error { title, says: Some(format!("(error) {msg}")), message: msg, hint, lost: false, ms: elapsed, fix }
            }
        }
        Step::Done(replies) => {
            let mut messages = vec![];
            let mut sets = vec![];
            let mut ddl = false;
            for (c, v, t1) in &replies {
                messages.push(format!("{} replied {} in {t1} ms", c.name(), summary(v)));
                if let Some(note) = table(c, v).2 {
                    messages.push(note);
                }
                if matches!(redis_cli::kind(c), Kind::Write("keys" | "flush")) {
                    ddl = true;
                }
                let (columns, mut rows, _) = table(c, v);
                let truncated = rows.len() > HARD_CAP;
                rows.truncate(HARD_CAP);
                sets.push(ResultSet { columns, rows, truncated, raw: Some(raw(v)), ..Default::default() });
            }
            messages.push(format!("From {}, db{} ({})", conn.name, open.db, open.server));
            let (last_c, last_v, _) = replies.last().expect("at least one command");
            let wrote = matches!(redis_cli::kind(last_c), Kind::Write(_));
            RunOutcome::Done {
                affected: match (wrote, last_v) {
                    (true, Value::Int(n)) if *n >= 0 => Some(*n as u64),
                    _ => None,
                },
                last_is_query: !wrote,
                sets,
                messages,
                ms: elapsed,
                limit: None,
                ddl,
                server: open.server.clone(),
            }
        }
    };
    if req.history && conn.keeps_history(&settings) {
        let (status, rows, error) = match &outcome {
            RunOutcome::Done { sets, affected, .. } => ("ok", affected.map(|a| a as i64).or(sets.last().map(|s| s.rows.len() as i64)), None),
            RunOutcome::Error { title, .. } => ("error", None, Some(title.clone())),
            _ => ("cancelled", None, None),
        };
        let _ = store
            .add_history(HistoryEntry { id: 0, conn_id: conn.id.clone(), conn_name: conn.name.clone(), engine: conn.engine, database: open.db.to_string(), sql: req.sql.clone(), started_at, ms: elapsed as i64, rows, status: status.into(), error })
            .await;
    }
    Ok(outcome)
}

/// The optional heartbeat: PING on each open Redis connection that has it on; one that doesn't answer
/// gets a new connection in its place, if the server answers that.
pub(super) async fn heartbeat(state: &DbState, global: bool, beat: &mut super::Beat<'_>) {
    let opens: Vec<(String, Arc<ROpen>)> = state.redis.lock().await.iter().filter(|(_, o)| o.heartbeat.unwrap_or(global)).map(|(id, o)| (id.clone(), o.clone())).collect();
    for (id, o) in opens {
        beat.start(&id);
        let mut c = o.browse();
        let pong = tokio::time::timeout(super::BEAT_WAIT, ::redis::cmd("PING").query_async::<Value>(&mut c)).await;
        let up = matches!(pong, Ok(Ok(_))) || o.renew().await;
        beat.done(&id, Some(up));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn c(s: &str) -> Cmd {
        redis_cli::parse(s).unwrap().remove(0)
    }
    fn b(s: &str) -> Value {
        Value::BulkString(s.as_bytes().to_vec())
    }

    #[test]
    fn prints_like_redis_cli() {
        assert_eq!(raw(&Value::Nil), "(nil)");
        assert_eq!(raw(&Value::Int(3)), "(integer) 3");
        assert_eq!(raw(&b("a\"b\n")), r#""a\"b\n""#);
        assert_eq!(raw(&Value::Array(vec![])), "(empty array)");
        let nested = Value::Array(vec![b("x"), Value::Array(vec![b("a"), b("b")])]);
        assert_eq!(raw(&nested), "1) \"x\"\n2) 1) \"a\"\n   2) \"b\"");
        let ten = Value::Array((0..10).map(|i| b(&i.to_string())).collect());
        assert!(raw(&ten).starts_with(" 1) \"0\"\n"));
        assert_eq!(quoted(&[0xff, b'a']), "\"\\xffa\"");
    }

    #[test]
    fn shapes_replies_into_tables() {
        let (cols, rows, _) = table(&c("ZRANGE lb 0 1 REV WITHSCORES"), &Value::Array(vec![b("mei"), b("4820"), b("ana"), b("4415")]));
        assert_eq!((cols[0].name.as_str(), cols[1].ty.as_str(), rows.len()), ("member", "double", 2));
        let (cols, rows, _) = table(&c("HGETALL user:1"), &Value::Array(vec![b("email"), b("a@b"), b("city"), b("Osaka")]));
        assert_eq!((cols[0].name.as_str(), rows[1][1].as_deref()), ("field", Some("Osaka")));
        let (cols, rows, note) = table(&c("SCAN 0 MATCH s:*"), &Value::Array(vec![b("17"), Value::Array(vec![b("s:1"), b("s:2")])]));
        assert_eq!((cols[0].name.as_str(), rows.len()), ("key", 2));
        assert!(note.unwrap().contains("17"));
        let entry = |id: &str, kv: &[&str]| Value::Array(vec![b(id), Value::Array(kv.iter().map(|s| b(s)).collect())]);
        let (cols, rows, _) = table(&c("XRANGE ev - +"), &Value::Array(vec![entry("1-0", &["a", "1"]), entry("2-0", &["b", "2"])]));
        assert_eq!(cols.iter().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["id", "a", "b"]);
        assert_eq!(rows[1], vec![Some("2-0".into()), None, Some("2".into())]);
        let (cols, _, _) = table(&c("DEL a"), &Value::Int(1));
        assert_eq!(cols[0].name, "integer");
    }

    #[test]
    fn reads_the_database_number() {
        let mut conn: Conn = toml::from_str("id = \"\"\nname = \"t\"\nengine = \"redis\"\n").unwrap();
        assert_eq!(db_of(&conn), Ok(0));
        conn.database = Some("3".into());
        assert_eq!(db_of(&conn), Ok(3));
        conn.database = Some("main".into());
        assert!(db_of(&conn).is_err());
        assert_eq!(group(1204331), "1,204,331");
    }

    /// A Redis to run against, with nothing in it worth keeping: it uses database 15 and flushes it.
    /// YPACAPY_TEST_REDIS=localhost:6379 cargo test --lib redis -- --ignored
    #[tokio::test]
    #[ignore]
    async fn against_a_server() {
        let host = std::env::var("YPACAPY_TEST_REDIS").unwrap_or_else(|_| "localhost:6379".into());
        let (h, p) = host.split_once(':').unwrap_or((&host, "6379"));
        let conn: Conn = toml::from_str(&format!("id = \"\"\nname = \"test\"\nengine = \"redis\"\nhost = \"{h}\"\nport = {p}\ndatabase = \"15\"\nconnectTimeout = 5\n")).unwrap();
        let open = connect(&conn, None).await.expect("a Redis at YPACAPY_TEST_REDIS");
        assert!(open.server.starts_with("Redis ") || open.server.starts_with("Valkey "));
        let mut con = open.browse();
        let _: () = ::redis::cmd("FLUSHDB").query_async(&mut con).await.unwrap();
        let _: () = ::redis::pipe().cmd("HSET").arg("user:1").arg("email").arg("a@b").arg("city").arg("Osaka").ignore().cmd("SET").arg("s:1").arg("{\"a\":1}").arg("EX").arg(600).ignore().cmd("RPUSH").arg("q").arg("x").arg("y").ignore().query_async(&mut con).await.unwrap();
        let req = |key: &str| KeyRequest { run_id: String::new(), conn_id: String::new(), key: key.into(), cursor: None, offset: None, after: None, pattern: None, ascending: false };
        let h = read_key(&mut con, &req("user:1"), 20).await.unwrap();
        assert_eq!((h.kind.as_str(), h.len, h.rows.len(), h.ttl_ms), ("hash", Some(2), 2, -1));
        let s = read_key(&mut con, &req("s:1"), 20).await.unwrap();
        assert!(s.ttl_ms > 0 && s.value.as_deref() == Some("{\"a\":1}"));
        let l = read_key(&mut con, &req("q"), 1).await.unwrap();
        assert_eq!((l.rows.len(), l.next.as_deref()), (1, Some("1")));
        let gone = read_key(&mut con, &req("nope"), 20).await.unwrap();
        assert_eq!(gone.kind, "none");
        let _: () = ::redis::cmd("FLUSHDB").query_async(&mut con).await.unwrap();
    }
}
