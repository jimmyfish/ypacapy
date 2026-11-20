//! MongoDB, through the official driver: one Client per connection, opened on demand, kept for the session.
//! The same rule as the SQL engines: ypacapy only runs catalog reads and limited reads on its own.
//! - the tree lists collections (listCollections) and their estimatedDocumentCount, which reads collection
//!   metadata and scans nothing; a database with more than ESTIMATE_MAX collections shows no estimates
//! - a collection opens with find(filter).limit(n), no sort it was not given
//! - Info is one $collStats (storage stats are metadata), read when the dialog opens and on Refresh
//! - indexes are listIndexes
//!
//! The console takes mongosh text (mongo_shell parses it). Each run carries maxTimeMS, so the statement
//! timeout stops the work on the server, not only the wait here.

use mongodb::bson::{doc, Bson, Document};
use mongodb::error::{Error as MError, ErrorKind, WriteFailure};
use mongodb::options::{AuthMechanism, ClientOptions, Credential, Hint, IndexOptions, ReadPreference, ReturnDocument, SelectionCriteria, Tls, TlsOptions, UpdateModifications};
use mongodb::{Client, Database, IndexModel};

use super::*;
use crate::conns::MongoTls;
use crate::mongo_shell::{self, Command, Target};

/// Above this many collections the tree shows no estimates: each is one more round trip
const ESTIMATE_MAX: usize = 100;

pub struct MOpen {
    pub client: Client,
    /// "MongoDB 7.0.14"
    pub server: String,
    pub heartbeat: Option<bool>,
}

fn secs(n: Option<u32>, default: u64) -> Duration {
    Duration::from_secs(n.filter(|s| *s > 0).map(u64::from).unwrap_or(default))
}

fn trimmed(s: &Option<String>) -> Option<String> {
    s.as_deref().map(str::trim).filter(|x| !x.is_empty()).map(String::from)
}

/// The driver's options from a connection's fields. The password never goes into a URI.
async fn client_options(conn: &Conn, password: Option<String>) -> Result<ClientOptions, String> {
    let host = trimmed(&conn.host).unwrap_or_else(|| "localhost".into());
    let uri = if conn.srv {
        format!("mongodb+srv://{host}/")
    } else {
        // a seed list stays as typed: h1:27017,h2:27017; a host without a port takes the Port field
        let port = conn.port.unwrap_or(27017);
        let hosts: Vec<String> = host.split(',').map(str::trim).filter(|h| !h.is_empty()).map(|h| if h.rsplit_once(':').is_some_and(|(_, p)| p.parse::<u16>().is_ok()) && !h.ends_with(']') { h.to_string() } else { format!("{h}:{port}") }).collect();
        format!("mongodb://{}/", hosts.join(","))
    };
    let mut o = ClientOptions::parse(&uri).await.map_err(|e| err_text(&e))?;
    o.app_name = Some(trimmed(&conn.app_name).unwrap_or_else(|| "ypacapy".into()));
    let wait = secs(conn.connect_timeout, 15);
    o.connect_timeout = Some(wait);
    o.server_selection_timeout = Some(wait);
    o.heartbeat_freq = Some(secs(conn.server_check, 60));
    o.max_pool_size = Some(4);
    if let Some(rs) = trimmed(&conn.replica_set) {
        o.repl_set_name = Some(rs);
    }
    if conn.direct {
        o.direct_connection = Some(true);
    }
    if let Some(rp) = trimmed(&conn.read_pref) {
        let pref = match rp.as_str() {
            "primaryPreferred" => ReadPreference::PrimaryPreferred { options: None },
            "secondary" => ReadPreference::Secondary { options: None },
            "secondaryPreferred" => ReadPreference::SecondaryPreferred { options: None },
            "nearest" => ReadPreference::Nearest { options: None },
            _ => ReadPreference::Primary,
        };
        o.selection_criteria = Some(SelectionCriteria::ReadPreference(pref));
    }
    let ca = trimmed(&conn.ssl_ca).map(|c| crate::paths::expand_tilde(&c));
    let cert = trimmed(&conn.tls_cert).map(|c| crate::paths::expand_tilde(&c));
    let tls = conn.tls.or(if conn.srv || ca.is_some() || cert.is_some() { Some(MongoTls::On) } else { None });
    match tls {
        Some(MongoTls::Off) => o.tls = Some(Tls::Disabled),
        Some(mode) => {
            let mut t = TlsOptions::default();
            t.ca_file_path = ca.map(Into::into);
            t.cert_key_file_path = cert.clone().map(Into::into);
            if mode == MongoTls::Insecure {
                // rustls has one switch: the certificate and its host name both go unchecked
                t.allow_invalid_certificates = Some(true);
            }
            o.tls = Some(Tls::Enabled(t));
        }
        None => {}
    }
    let user = trimmed(&conn.user);
    if let Some(u) = user {
        let mut c = Credential::default();
        c.username = Some(u);
        c.password = password.filter(|p| !p.is_empty());
        c.source = Some(trimmed(&conn.auth_source).unwrap_or_else(|| "admin".into()));
        o.credential = Some(c);
    } else if cert.is_some() {
        let mut c = Credential::default();
        c.mechanism = Some(AuthMechanism::MongoDbX509);
        o.credential = Some(c);
    }
    Ok(o)
}

/// "MongoDB 7.0.14, replica set rs0". Reading buildInfo is what makes the driver connect and sign in.
async fn server_of(client: &Client) -> Result<String, MError> {
    let admin = client.database("admin");
    let info = admin.run_command(doc! { "buildInfo": 1 }).await?;
    let mut s = format!("MongoDB {}", info.get_str("version").unwrap_or(""));
    if let Ok(h) = admin.run_command(doc! { "hello": 1 }).await {
        if let Ok(set) = h.get_str("setName") {
            s += &format!(", replica set {set}");
        }
    }
    Ok(s)
}

async fn connect(conn: &Conn, password: Option<String>) -> Result<(Client, String), String> {
    let o = client_options(conn, password).await?;
    let client = Client::with_options(o).map_err(|e| err_text(&e))?;
    match server_of(&client).await {
        Ok(s) => Ok((client, s)),
        Err(e) => {
            client.shutdown().immediate(true).await;
            Err(err_text(&e))
        }
    }
}

impl DbState {
    pub(super) async fn mongo(&self, conn: &Conn) -> Result<Arc<MOpen>, String> {
        if let Some(o) = self.mongo.lock().await.get(&conn.id) {
            return Ok(o.clone());
        }
        let password = password_for(conn).await?;
        let (client, server) = connect(conn, password).await?;
        let open = Arc::new(MOpen { client, server, heartbeat: conn.heartbeat });
        Ok(self.mongo.lock().await.entry(conn.id.clone()).or_insert(open).clone())
    }
    pub(super) async fn drop_mongo(&self, id: &str) {
        let gone = self.mongo.lock().await.remove(id);
        // shutdown() waits for the driver's monitors to stop, which can take a heartbeat (seconds):
        // in the background, so closing the tab doesn't wait for it
        if let Some(o) = gone {
            tauri::async_runtime::spawn(async move { o.client.clone().shutdown().immediate(true).await });
        }
    }
}

/// The driver's error in the words MongoDB used, without the driver's wrapping
pub fn err_text(e: &MError) -> String {
    match e.kind.as_ref() {
        ErrorKind::Command(c) => format!("{}: {}", c.code_name, c.message),
        ErrorKind::Write(WriteFailure::WriteError(w)) => w.message.clone(),
        ErrorKind::Write(WriteFailure::WriteConcernError(w)) => w.message.clone(),
        ErrorKind::Authentication { message, .. } | ErrorKind::ServerSelection { message, .. } | ErrorKind::DnsResolve { message, .. } | ErrorKind::InvalidArgument { message, .. } | ErrorKind::InvalidTlsConfig { message, .. } => message.clone(),
        _ => e.to_string(),
    }
}

/// mongosh's own error line: MongoServerError[BadValue]: unknown operator: $inn
fn says(e: &MError) -> Option<String> {
    match e.kind.as_ref() {
        ErrorKind::Command(c) => Some(format!("MongoServerError[{}]: {}\ncode: {}, codeName: '{}'", c.code_name, c.message, c.code, c.code_name)),
        ErrorKind::Write(WriteFailure::WriteError(w)) => Some(format!("MongoServerError[{}]: {}", w.code_name.as_deref().unwrap_or("WriteError"), w.message)),
        _ => None,
    }
}

fn code_name(e: &MError) -> Option<&str> {
    match e.kind.as_ref() {
        ErrorKind::Command(c) => Some(&c.code_name),
        _ => None,
    }
}

fn lost(e: &MError) -> bool {
    matches!(e.kind.as_ref(), ErrorKind::ServerSelection { .. } | ErrorKind::Io(_) | ErrorKind::ConnectionPoolCleared { .. } | ErrorKind::DnsResolve { .. })
}

fn run_error(e: &MError, conn: &Conn, ms: u64) -> RunOutcome {
    if lost(e) {
        let what = if matches!(e.kind.as_ref(), ErrorKind::ServerSelection { .. }) { format!("No server answered for {}", conn.name) } else { format!("Lost the connection to {}", conn.name) };
        return RunOutcome::Error { title: what, says: None, message: err_text(e), hint: Some("Nothing was changed.".into()), lost: true, ms, fix: None };
    }
    let msg = match e.kind.as_ref() {
        ErrorKind::Command(c) => c.message.clone(),
        _ => err_text(e),
    };
    RunOutcome::Error { title: capitalise(msg.lines().next().unwrap_or("")), says: says(e), message: msg, hint: None, lost: false, ms, fix: None }
}

/// mongosh's way of printing a value, on one line: { status: 1, created_at: -1 }
pub fn shell(b: &Bson) -> String {
    let key = |k: &str| if k.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$') && !k.starts_with(|c: char| c.is_ascii_digit()) { k.to_string() } else { format!("\"{k}\"") };
    match b {
        Bson::Document(d) if d.is_empty() => "{}".into(),
        Bson::Document(d) => format!("{{ {} }}", d.iter().map(|(k, v)| format!("{}: {}", key(k), shell(v))).collect::<Vec<_>>().join(", ")),
        Bson::Array(a) => format!("[ {} ]", a.iter().map(shell).collect::<Vec<_>>().join(", ")),
        Bson::String(s) => format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\"")),
        Bson::ObjectId(o) => format!("ObjectId(\"{o}\")"),
        Bson::DateTime(d) => format!("ISODate(\"{}\")", d.try_to_rfc3339_string().unwrap_or_default()),
        Bson::Decimal128(d) => format!("Decimal128(\"{d}\")"),
        Bson::Int64(n) => format!("Long(\"{n}\")"),
        Bson::RegularExpression(r) => format!("/{}/{}", r.pattern, r.options),
        Bson::Null => "null".into(),
        other => other.to_string(),
    }
}

fn canonical(d: Document) -> serde_json::Value {
    Bson::Document(d).into_canonical_extjson()
}

/// Whole numbers from stats, whatever BSON type the server used
fn num(b: Option<&Bson>) -> Option<i64> {
    match b? {
        Bson::Int32(n) => Some(*n as i64),
        Bson::Int64(n) => Some(*n),
        Bson::Double(n) => Some(*n as i64),
        _ => None,
    }
}

fn docs_set(docs: Vec<Document>, truncated: bool) -> ResultSet {
    ResultSet { truncated, docs: Some(docs.into_iter().map(canonical).collect()), ..Default::default() }
}

fn database_of(conn: &Conn, database: Option<&str>) -> String {
    database.map(str::trim).filter(|d| !d.is_empty()).map(String::from).or_else(|| trimmed(&conn.database)).unwrap_or_else(|| "test".into())
}

// ---------- connections and catalog ----------

pub async fn test(conn: &Conn, password: Option<String>) -> Result<TestResult, String> {
    let t = Instant::now();
    let (client, server) = connect(conn, password).await?;
    let ms = t.elapsed().as_millis() as u64;
    client.shutdown().immediate(true).await;
    Ok(TestResult { server, ms })
}

/// The databases the user may see (listDatabases with authorizedDatabases), or only the connection's own
/// database when even that is not allowed. admin, config and local are listed; the sidebar folds them away.
pub async fn open_info(state: &DbState, conn: &Conn, database: &str) -> Result<OpenInfo, String> {
    let open = state.mongo(conn).await?;
    let mut dbs = open.client.list_database_names().authorized_databases(true).await.unwrap_or_default();
    // no database picked or set on the connection: the first of the user's own (not admin, config or local)
    let cur = if database.trim().is_empty() && trimmed(&conn.database).is_none() {
        dbs.iter().filter(|d| !["admin", "config", "local"].contains(&d.as_str())).min().cloned().unwrap_or_else(|| "test".into())
    } else {
        database_of(conn, Some(database))
    };
    if !dbs.contains(&cur) {
        dbs.push(cur.clone());
    }
    dbs.sort();
    Ok(OpenInfo { server: open.server.clone(), databases: dbs.clone(), database: cur.clone(), schemas: dbs, default_schema: cur })
}

/// One database of the tree: its collections and views, loaded when it is expanded
pub async fn collections(state: &DbState, conn: &Conn, database: &str) -> Result<SchemaObjects, String> {
    let open = state.mongo(conn).await?;
    let db = open.client.database(database);
    let mut specs: Vec<_> = db.list_collections().await.map_err(|e| err_text(&e))?.try_collect::<Vec<_>>().await.map_err(|e| err_text(&e))?;
    specs.retain(|s| !s.name.starts_with("system."));
    specs.sort_by(|a, b| a.name.cmp(&b.name));
    let kinds: Vec<&str> = specs
        .iter()
        .map(|s| match s.collection_type {
            mongodb::results::CollectionType::View => "view",
            mongodb::results::CollectionType::Timeseries => "timeseries",
            _ => "collection",
        })
        .collect();
    let counted = specs.iter().zip(&kinds).filter(|(_, k)| **k != "view").count() <= ESTIMATE_MAX;
    let mut estimates = vec![None; specs.len()];
    if counted {
        // eight at a time; a collection the user may not count shows no estimate
        let idx: Vec<usize> = (0..specs.len()).filter(|&i| kinds[i] != "view").collect();
        for chunk in idx.chunks(8) {
            let got = futures_util::future::join_all(chunk.iter().map(|&i| {
                let c = db.collection::<Document>(&specs[i].name);
                async move { c.estimated_document_count().await }
            }))
            .await;
            for (&i, n) in chunk.iter().zip(got) {
                estimates[i] = n.ok().map(|n| n as i64);
            }
        }
    }
    let tables = specs.into_iter().zip(kinds).zip(estimates).map(|((s, k), e)| TreeTable { name: s.name, kind: k.into(), estimate: e }).collect();
    Ok(SchemaObjects { tables, functions: vec![] })
}

/// A collection's indexes, for its Indexes view: keys as mongosh prints them, the options that matter
pub async fn indexes(state: &DbState, conn: &Conn, database: &str, collection: &str) -> Result<TableInfo, String> {
    let open = state.mongo(conn).await?;
    let coll = open.client.database(database).collection::<Document>(collection);
    let list: Vec<IndexModel> = match coll.list_indexes().await {
        Ok(c) => c.try_collect().await.map_err(|e| err_text(&e))?,
        // a view has no indexes of its own
        Err(e) if code_name(&e) == Some("CommandNotSupportedOnView") => vec![],
        Err(e) => return Err(err_text(&e)),
    };
    let indexes = list
        .into_iter()
        .map(|m| {
            let o = m.options.unwrap_or_default();
            let name = o.name.clone().unwrap_or_default();
            let mut notes = vec![];
            if o.sparse == Some(true) {
                notes.push("sparse".to_string());
            }
            if let Some(ttl) = o.expire_after {
                notes.push(format!("TTL {} s", ttl.as_secs()));
            }
            if let Some(p) = &o.partial_filter_expression {
                notes.push(format!("partial: {}", shell(&Bson::Document(p.clone()))));
            }
            if o.hidden == Some(true) {
                notes.push("hidden".to_string());
            }
            TableIndex { primary: name == "_id_", unique: o.unique == Some(true) || name == "_id_", columns: shell(&Bson::Document(m.keys)), method: notes.join(", "), name }
        })
        .collect();
    Ok(TableInfo { columns: vec![], indexes, foreign_keys: vec![] })
}

// ---------- running ----------

/// What one statement gave back
#[derive(Debug)]
struct Out {
    docs: Option<(Vec<Document>, bool)>,
    messages: Vec<String>,
    affected: Option<u64>,
    /// the row limit ypacapy added
    limit: Option<usize>,
    /// a collection, index or database was created or dropped: the tree reloads
    ddl: bool,
}

impl Out {
    fn docs(docs: Vec<Document>, truncated: bool, messages: Vec<String>) -> Self {
        Out { docs: Some((docs, truncated)), messages, affected: None, limit: None, ddl: false }
    }
    fn write(msg: String, n: u64, result: Document) -> Self {
        Out { docs: Some((vec![result], false)), messages: vec![msg], affected: Some(n), limit: None, ddl: false }
    }
    fn ddl(msg: String, result: Document) -> Self {
        Out { docs: Some((vec![result], false)), messages: vec![msg], affected: None, limit: None, ddl: true }
    }
}

fn plural_docs(n: u64) -> String {
    format!("{n} document{}", if n == 1 { "" } else { "s" })
}

/// The arguments of a call, read by position, with errors in mongosh's terms
struct Args<'a> {
    method: &'a str,
    args: &'a [Bson],
}

impl Args<'_> {
    fn doc(&self, i: usize, what: &str) -> Result<Document, String> {
        match self.args.get(i) {
            None | Some(Bson::Null) => Ok(Document::new()),
            Some(Bson::Document(d)) => Ok(d.clone()),
            Some(_) => Err(format!("{}() takes {what} as an object, {{ … }}", self.method)),
        }
    }
    fn opt_doc(&self, i: usize, what: &str) -> Result<Option<Document>, String> {
        match self.args.get(i) {
            None | Some(Bson::Null) => Ok(None),
            _ => self.doc(i, what).map(Some),
        }
    }
    fn need_doc(&self, i: usize, what: &str) -> Result<Document, String> {
        match self.args.get(i) {
            Some(Bson::Document(d)) => Ok(d.clone()),
            _ => Err(format!("{}() needs {what}, {{ … }}", self.method)),
        }
    }
    fn string(&self, i: usize, what: &str) -> Result<String, String> {
        match self.args.get(i) {
            Some(Bson::String(s)) => Ok(s.clone()),
            _ => Err(format!("{}() needs {what} in quotes", self.method)),
        }
    }
    fn int(&self, i: usize) -> Result<i64, String> {
        match self.args.get(i) {
            Some(Bson::Int32(n)) => Ok(*n as i64),
            Some(Bson::Int64(n)) => Ok(*n),
            Some(Bson::Double(n)) if n.fract() == 0.0 => Ok(*n as i64),
            _ => Err(format!("{}() needs a whole number", self.method)),
        }
    }
    fn none_after(&self, n: usize) -> Result<(), String> {
        if self.args.len() > n {
            return Err(format!("{}() takes at most {n} argument{}; Capy doesn't pass the rest", self.method, if n == 1 { "" } else { "s" }));
        }
        Ok(())
    }
}

/// update's second argument: an update document or a pipeline
fn modifications(a: &Args, i: usize) -> Result<UpdateModifications, String> {
    match a.args.get(i) {
        Some(Bson::Document(d)) => Ok(UpdateModifications::Document(d.clone())),
        Some(Bson::Array(p)) => p.iter().map(|s| s.as_document().cloned().ok_or_else(|| "An update pipeline holds stages, { … }".to_string())).collect::<Result<Vec<_>, _>>().map(UpdateModifications::Pipeline),
        _ => Err(format!("{}() needs the update, {{ $set: {{ … }} }}", a.method)),
    }
}

/// Options ypacapy passes on (the rest are an error, never dropped quietly)
fn take_opts(opts: &Option<Document>, known: &[&str], method: &str) -> Result<Document, String> {
    let d = opts.clone().unwrap_or_default();
    if let Some(k) = d.keys().find(|k| !known.contains(&k.as_str())) {
        return Err(format!("Capy doesn't pass the option {k} to {method}() yet"));
    }
    Ok(d)
}

fn is_true(d: &Document, k: &str) -> bool {
    d.get_bool(k).unwrap_or(false)
}

async fn collect(mut cursor: mongodb::Cursor<Document>, cap: usize) -> Result<(Vec<Document>, bool), MError> {
    let mut out = vec![];
    while let Some(d) = cursor.try_next().await? {
        if out.len() >= cap {
            return Ok((out, true));
        }
        out.push(d);
    }
    Ok((out, false))
}

/// One statement, on one database. `row_limit` is added to a find or aggregate without a limit of its own;
/// `offset` (the console's Next) skips that many more documents first, only where the row limit was added.
async fn exec(db: &Database, client: &Client, cmd: &Command, row_limit: usize, offset: u64, max_time: Duration) -> Result<Result<Out, String>, MError> {
    let a = Args { method: &cmd.call.name, args: &cmd.call.args };
    let Target::Coll(name) = &cmd.target else {
        return exec_db(db, client, cmd, &a, max_time).await;
    };
    let coll = db.collection::<Document>(name);
    let chain_only = |allowed: &[&str]| -> Result<(), String> {
        match cmd.chain.iter().find(|c| !allowed.contains(&c.name.as_str())) {
            Some(c) => Err(format!("Capy doesn't run .{}() after {}()", c.name, a.method)),
            None => Ok(()),
        }
    };
    Ok(Ok(match a.method {
        "find" => {
            let filter = match a.doc(0, "the filter") {
                Ok(f) => f,
                Err(e) => return Ok(Err(e)),
            };
            let mut projection = match a.opt_doc(1, "the projection") {
                Ok(p) => p,
                Err(e) => return Ok(Err(e)),
            };
            if let Err(e) = chain_only(&["sort", "limit", "skip", "project", "projection", "hint", "maxTimeMS", "toArray", "pretty", "count", "explain"]) {
                return Ok(Err(e));
            }
            let (mut sort, mut limit, mut skip, mut hint) = (None, None, None, None);
            for c in &cmd.chain {
                let ca = Args { method: &c.name, args: &c.args };
                match c.name.as_str() {
                    "sort" => sort = Some(match ca.need_doc(0, "the sort") {
                        Ok(d) => d,
                        Err(e) => return Ok(Err(e)),
                    }),
                    "limit" => limit = Some(match ca.int(0) {
                        Ok(n) => n,
                        Err(e) => return Ok(Err(e)),
                    }),
                    "skip" => skip = Some(match ca.int(0) {
                        Ok(n) => n.max(0) as u64,
                        Err(e) => return Ok(Err(e)),
                    }),
                    "project" | "projection" => projection = Some(match ca.need_doc(0, "the projection") {
                        Ok(d) => d,
                        Err(e) => return Ok(Err(e)),
                    }),
                    "hint" => hint = match c.args.first() {
                        Some(Bson::String(s)) => Some(Hint::Name(s.clone())),
                        Some(Bson::Document(d)) => Some(Hint::Keys(d.clone())),
                        _ => return Ok(Err("hint() takes an index name or its keys".into())),
                    },
                    _ => {}
                }
            }
            if cmd.chain.iter().any(|c| c.name == "count") {
                let n = coll.count_documents(filter).max_time(max_time).await?;
                return Ok(Ok(Out::docs(vec![doc! { "count": n as i64 }], false, vec![format!("{} match", plural_docs(n))])));
            }
            if let Some(c) = cmd.chain.iter().find(|c| c.name == "explain") {
                let mut find = doc! { "find": name, "filter": filter };
                if let Some(p) = projection {
                    find.insert("projection", p);
                }
                if let Some(s) = sort {
                    find.insert("sort", s);
                }
                if let Some(l) = limit {
                    find.insert("limit", l);
                }
                return explain(db, find, c).await;
            }
            let added = limit.is_none_or(|l| l == 0) && row_limit > 0;
            let lim = if added { Some(row_limit as i64) } else { limit };
            let mut f = coll.find(filter).max_time(max_time);
            if let Some(s) = sort {
                f = f.sort(s);
            }
            if let Some(p) = projection {
                f = f.projection(p);
            }
            // a page past the first: the find's own skip, then the pages before this one
            let skip = if added && offset > 0 { Some(skip.unwrap_or(0) + offset) } else { skip };
            if let Some(s) = skip {
                f = f.skip(s);
            }
            if let Some(l) = lim {
                f = f.limit(l.abs());
            }
            if let Some(h) = hint {
                f = f.hint(h);
            }
            let cap = lim.map(|l| l.unsigned_abs() as usize).unwrap_or(HARD_CAP);
            let (docs, cut) = collect(f.await?, cap).await?;
            let mut msgs = vec![format!("{} returned{}", plural_docs(docs.len() as u64), if cut { ", more were left unread" } else { "" })];
            if added {
                msgs.push(format!("The find had no limit, so Capy tacked on .limit({row_limit})."));
            }
            Out { limit: added.then_some(row_limit), ..Out::docs(docs, cut, msgs) }
        }
        "findOne" => {
            let (filter, projection) = match (a.doc(0, "the filter"), a.opt_doc(1, "the projection")) {
                (Ok(f), Ok(p)) => (f, p),
                (Err(e), _) | (_, Err(e)) => return Ok(Err(e)),
            };
            let mut f = coll.find_one(filter).max_time(max_time);
            if let Some(p) = projection {
                f = f.projection(p);
            }
            let d = f.await?;
            let n = d.is_some() as u64;
            Out::docs(d.into_iter().collect(), false, vec![format!("{} returned", plural_docs(n))])
        }
        "aggregate" => {
            let mut stages: Vec<Document> = match a.args.first() {
                Some(Bson::Array(p)) => match p.iter().map(|s| s.as_document().cloned()).collect::<Option<Vec<_>>>() {
                    Some(s) => s,
                    None => return Ok(Err("A pipeline holds stages, { $match: … }".into())),
                },
                None => vec![],
                Some(_) => return Ok(Err("aggregate() takes the pipeline, [ { $match: … }, … ]".into())),
            };
            if let Err(e) = chain_only(&["toArray", "pretty", "explain"]) {
                return Ok(Err(e));
            }
            let opts = match a.opt_doc(1, "its options").and_then(|o| take_opts(&o, &["allowDiskUse", "maxTimeMS", "comment", "hint"], "aggregate")) {
                Ok(o) => o,
                Err(e) => return Ok(Err(e)),
            };
            if let Some(c) = cmd.chain.iter().find(|c| c.name == "explain") {
                return explain(db, doc! { "aggregate": name, "pipeline": stages.clone(), "cursor": {} }, c).await;
            }
            let pipeline: Vec<Bson> = stages.iter().cloned().map(Bson::Document).collect();
            let writes = mongo_shell::writes_out(&pipeline);
            let added = !writes && row_limit > 0 && !stages.iter().any(|s| s.contains_key("$limit"));
            if added {
                if offset > 0 {
                    stages.push(doc! { "$skip": offset as i64 });
                }
                stages.push(doc! { "$limit": row_limit as i64 });
            }
            let mut ag = coll.aggregate(stages).max_time(max_time);
            if is_true(&opts, "allowDiskUse") {
                ag = ag.allow_disk_use(true);
            }
            let (docs, cut) = collect(ag.await?, if added { row_limit } else { HARD_CAP }).await?;
            if writes {
                let target = pipeline.iter().filter_map(Bson::as_document).find_map(|d| d.get("$out").or_else(|| d.get("$merge")).cloned()).map(|t| match t {
                    Bson::String(s) => s,
                    Bson::Document(d) => d.get("into").or_else(|| d.get("coll")).map(|x| match x {
                        Bson::String(s) => s.clone(),
                        other => shell(other),
                    }).unwrap_or_default(),
                    other => shell(&other),
                });
                return Ok(Ok(Out { docs: None, messages: vec![format!("The pipeline wrote to {}", target.unwrap_or_default())], affected: None, limit: None, ddl: true }));
            }
            let mut msgs = vec![format!("{} returned{}", plural_docs(docs.len() as u64), if cut { ", more were left unread" } else { "" })];
            if added {
                msgs.push(format!("The pipeline had no $limit, so Capy tacked {{ $limit: {row_limit} }} onto its end."));
            }
            Out { limit: added.then_some(row_limit), ..Out::docs(docs, cut, msgs) }
        }
        "countDocuments" => {
            let filter = match a.doc(0, "the filter") {
                Ok(f) => f,
                Err(e) => return Ok(Err(e)),
            };
            let n = coll.count_documents(filter).max_time(max_time).await?;
            Out::docs(vec![doc! { "count": n as i64 }], false, vec![format!("{} match", plural_docs(n))])
        }
        "estimatedDocumentCount" => {
            let n = coll.estimated_document_count().max_time(max_time).await?;
            Out::docs(vec![doc! { "count": n as i64 }], false, vec![format!("About {}, from collection metadata", plural_docs(n))])
        }
        "distinct" => {
            let (field, filter) = match (a.string(0, "the field name"), a.doc(1, "the filter")) {
                (Ok(f), Ok(q)) => (f, q),
                (Err(e), _) | (_, Err(e)) => return Ok(Err(e)),
            };
            let vals = coll.distinct(&field, filter).max_time(max_time).await?;
            let n = vals.len();
            Out::docs(vals.into_iter().map(|v| doc! { field.clone(): v }).collect(), false, vec![format!("{n} distinct value{}", if n == 1 { "" } else { "s" })])
        }
        "getIndexes" => {
            let list: Vec<IndexModel> = coll.list_indexes().await?.try_collect().await?;
            let docs = list.into_iter().map(|m| {
                let mut d = doc! { "key": m.keys };
                if let Some(o) = m.options.and_then(|o| mongodb::bson::to_document(&o).ok()) {
                    d.extend(o);
                }
                d
            });
            let docs: Vec<Document> = docs.collect();
            let n = docs.len();
            Out::docs(docs, false, vec![format!("{n} index{}", if n == 1 { "" } else { "es" })])
        }
        "insertOne" => {
            let d = match a.need_doc(0, "the document") {
                Ok(d) => d,
                Err(e) => return Ok(Err(e)),
            };
            let r = coll.insert_one(d).await?;
            Out::write(format!("Inserted 1 document into {name}"), 1, doc! { "acknowledged": true, "insertedId": r.inserted_id })
        }
        "insertMany" => {
            let docs = match a.args.first() {
                Some(Bson::Array(v)) => match v.iter().map(|x| x.as_document().cloned()).collect::<Option<Vec<_>>>() {
                    Some(d) => d,
                    None => return Ok(Err("insertMany() takes a list of documents, [ { … }, … ]".into())),
                },
                _ => return Ok(Err("insertMany() takes a list of documents, [ { … }, … ]".into())),
            };
            let r = coll.insert_many(docs).await?;
            let n = r.inserted_ids.len() as u64;
            let ids: Vec<Bson> = (0..r.inserted_ids.len()).filter_map(|i| r.inserted_ids.get(&i).cloned()).collect();
            Out::write(format!("Inserted {} into {name}", plural_docs(n)), n, doc! { "acknowledged": true, "insertedIds": ids })
        }
        "updateOne" | "updateMany" | "replaceOne" => {
            let filter = match a.need_doc(0, "the filter") {
                Ok(f) => f,
                Err(e) => return Ok(Err(e)),
            };
            let opts = match a.opt_doc(2, "its options").and_then(|o| take_opts(&o, &["upsert", "arrayFilters"], a.method)) {
                Ok(o) => o,
                Err(e) => return Ok(Err(e)),
            };
            let upsert = is_true(&opts, "upsert");
            let filters: Option<Vec<Document>> = opts.get_array("arrayFilters").ok().map(|v| v.iter().filter_map(|x| x.as_document().cloned()).collect());
            let r = if a.method == "replaceOne" {
                let repl = match a.need_doc(1, "the new document") {
                    Ok(d) => d,
                    Err(e) => return Ok(Err(e)),
                };
                coll.replace_one(filter, repl).upsert(upsert).await?
            } else {
                let m = match modifications(&a, 1) {
                    Ok(m) => m,
                    Err(e) => return Ok(Err(e)),
                };
                let mut u = if a.method == "updateOne" { coll.update_one(filter, m) } else { coll.update_many(filter, m) };
                u = u.upsert(upsert);
                if let Some(f) = filters {
                    u = u.array_filters(f);
                }
                u.await?
            };
            let mut res = doc! { "acknowledged": true, "matchedCount": r.matched_count as i64, "modifiedCount": r.modified_count as i64 };
            let mut msg = format!("Matched {}, changed {} in {name}", r.matched_count, plural_docs(r.modified_count));
            if let Some(id) = r.upserted_id {
                res.insert("upsertedId", id);
                msg += ", inserted 1";
            }
            Out::write(msg, r.modified_count, res)
        }
        "deleteOne" | "deleteMany" => {
            let filter = match a.need_doc(0, "the filter ({} deletes every document)") {
                Ok(f) => f,
                Err(e) => return Ok(Err(e)),
            };
            let r = if a.method == "deleteOne" { coll.delete_one(filter).await? } else { coll.delete_many(filter).await? };
            Out::write(format!("Deleted {} from {name}", plural_docs(r.deleted_count)), r.deleted_count, doc! { "acknowledged": true, "deletedCount": r.deleted_count as i64 })
        }
        "findOneAndUpdate" | "findOneAndReplace" | "findOneAndDelete" => {
            let filter = match a.need_doc(0, "the filter") {
                Ok(f) => f,
                Err(e) => return Ok(Err(e)),
            };
            let at = if a.method == "findOneAndDelete" { 1 } else { 2 };
            let opts = match a.opt_doc(at, "its options").and_then(|o| take_opts(&o, &["upsert", "sort", "projection", "returnDocument", "returnNewDocument"], a.method)) {
                Ok(o) => o,
                Err(e) => return Ok(Err(e)),
            };
            let after = opts.get_str("returnDocument").is_ok_and(|v| v == "after") || is_true(&opts, "returnNewDocument");
            let ret = if after { ReturnDocument::After } else { ReturnDocument::Before };
            let (sort, projection) = (opts.get_document("sort").ok().cloned(), opts.get_document("projection").ok().cloned());
            let got = match a.method {
                "findOneAndDelete" => {
                    let mut f = coll.find_one_and_delete(filter).max_time(max_time);
                    if let Some(s) = sort {
                        f = f.sort(s);
                    }
                    if let Some(p) = projection {
                        f = f.projection(p);
                    }
                    f.await?
                }
                "findOneAndReplace" => {
                    let repl = match a.need_doc(1, "the new document") {
                        Ok(d) => d,
                        Err(e) => return Ok(Err(e)),
                    };
                    let mut f = coll.find_one_and_replace(filter, repl).max_time(max_time).upsert(is_true(&opts, "upsert")).return_document(ret);
                    if let Some(s) = sort {
                        f = f.sort(s);
                    }
                    if let Some(p) = projection {
                        f = f.projection(p);
                    }
                    f.await?
                }
                _ => {
                    let m = match modifications(&a, 1) {
                        Ok(m) => m,
                        Err(e) => return Ok(Err(e)),
                    };
                    let mut f = coll.find_one_and_update(filter, m).max_time(max_time).upsert(is_true(&opts, "upsert")).return_document(ret);
                    if let Some(s) = sort {
                        f = f.sort(s);
                    }
                    if let Some(p) = projection {
                        f = f.projection(p);
                    }
                    f.await?
                }
            };
            let n = got.is_some() as u64;
            let verb = match a.method {
                "findOneAndDelete" => "Deleted",
                "findOneAndReplace" => "Replaced",
                _ => "Updated",
            };
            Out { docs: Some((got.into_iter().collect(), false)), messages: vec![format!("{verb} {} in {name}", plural_docs(n))], affected: Some(n), limit: None, ddl: false }
        }
        "drop" => {
            if let Err(e) = a.none_after(0) {
                return Ok(Err(e));
            }
            coll.drop().await?;
            Out::ddl(format!("Dropped the collection {name}"), doc! { "ok": 1 })
        }
        "createIndex" => {
            let keys = match a.need_doc(0, "the keys, { field: 1 }") {
                Ok(k) => k,
                Err(e) => return Ok(Err(e)),
            };
            let opts: Option<IndexOptions> = match a.opt_doc(1, "its options") {
                Ok(Some(o)) => match mongodb::bson::from_document(o) {
                    Ok(o) => Some(o),
                    Err(e) => return Ok(Err(format!("createIndex() options: {e}"))),
                },
                Ok(None) => None,
                Err(e) => return Ok(Err(e)),
            };
            let r = coll.create_index(IndexModel::builder().keys(keys).options(opts).build()).max_time(max_time).await?;
            Out::ddl(format!("Created the index {} on {name}", r.index_name), doc! { "ok": 1, "name": r.index_name })
        }
        "dropIndex" => {
            match a.args.first() {
                Some(Bson::String(s)) => coll.drop_index(s).await?,
                Some(Bson::Document(keys)) => {
                    db.run_command(doc! { "dropIndexes": name, "index": keys.clone() }).await?;
                }
                _ => return Ok(Err("dropIndex() takes the index name in quotes, or its keys".into())),
            }
            Out::ddl(format!("Dropped the index from {name}"), doc! { "ok": 1 })
        }
        "renameCollection" => {
            let to = match a.string(0, "the new name") {
                Ok(t) => t,
                Err(e) => return Ok(Err(e)),
            };
            let drop_target = matches!(a.args.get(1), Some(Bson::Boolean(true)));
            let dbn = db.name();
            client.database("admin").run_command(doc! { "renameCollection": format!("{dbn}.{name}"), "to": format!("{dbn}.{to}"), "dropTarget": drop_target }).await?;
            Out::ddl(format!("Renamed {name} to {to}"), doc! { "ok": 1 })
        }
        "stats" => {
            let r = db.run_command(doc! { "collStats": name }).await?;
            Out::docs(vec![r], false, vec![])
        }
        "bulkWrite" => return Ok(Err("Capy can't run bulkWrite() yet. Run each write on its own.".into())),
        m => return Ok(Err(format!("Capy doesn't know db.{name}.{m}()"))),
    }))
}

async fn exec_db(db: &Database, client: &Client, cmd: &Command, a: &Args<'_>, max_time: Duration) -> Result<Result<Out, String>, MError> {
    let _ = max_time;
    if !cmd.chain.is_empty() {
        return Ok(Err(format!("Capy doesn't run .{}() after db.{}()", cmd.chain[0].name, a.method)));
    }
    Ok(Ok(match a.method {
        "runCommand" | "adminCommand" => {
            let c = match a.need_doc(0, "the command") {
                Ok(c) => c,
                Err(e) => return Ok(Err(e)),
            };
            let target = if a.method == "adminCommand" { client.database("admin") } else { db.clone() };
            let (kinds, _) = mongo_shell::kinds(cmd);
            let r = target.run_command(c).await?;
            Out { ddl: kinds.iter().any(|(k, _)| matches!(*k, "drop" | "create" | "rename")), ..Out::docs(vec![r], false, vec![]) }
        }
        "getCollectionNames" => {
            let mut names = db.list_collection_names().await?;
            names.sort();
            let n = names.len();
            Out::docs(names.into_iter().map(|x| doc! { "name": x }).collect(), false, vec![format!("{n} collection{}", if n == 1 { "" } else { "s" })])
        }
        "createCollection" => {
            let name = match a.string(0, "the collection name") {
                Ok(n) => n,
                Err(e) => return Ok(Err(e)),
            };
            let mut c = doc! { "create": name.clone() };
            match a.opt_doc(1, "its options") {
                Ok(Some(o)) => c.extend(o),
                Ok(None) => {}
                Err(e) => return Ok(Err(e)),
            }
            db.run_command(c).await?;
            Out::ddl(format!("Created the collection {name}"), doc! { "ok": 1 })
        }
        "dropDatabase" => {
            db.drop().await?;
            Out::ddl(format!("Dropped the database {}", db.name()), doc! { "ok": 1 })
        }
        "stats" => Out::docs(vec![db.run_command(doc! { "dbStats": 1 }).await?], false, vec![]),
        "getName" => Out::docs(vec![doc! { "name": db.name() }], false, vec![]),
        m => return Ok(Err(format!("Capy doesn't know db.{m}()"))),
    }))
}

/// .explain(): the plan, never the run, unless executionStats or allPlansExecution is asked for by name
async fn explain(db: &Database, command: Document, c: &mongo_shell::Call) -> Result<Result<Out, String>, MError> {
    let verbosity = match c.args.first() {
        None => "queryPlanner".to_string(),
        Some(Bson::String(s)) if ["queryPlanner", "executionStats", "allPlansExecution"].contains(&s.as_str()) => s.clone(),
        Some(Bson::Boolean(true)) => "allPlansExecution".into(),
        Some(Bson::Boolean(false)) => "queryPlanner".into(),
        _ => return Ok(Err("explain() takes queryPlanner, executionStats or allPlansExecution".into())),
    };
    let r = db.run_command(doc! { "explain": command, "verbosity": verbosity.clone() }).await?;
    Ok(Ok(Out::docs(vec![r], false, vec![format!("The plan ({verbosity})")])))
}

enum Got {
    Done(Out, String),
    /// ypacapy did not send it (an argument it cannot pass)
    Refused(String),
    Failed(MError),
    NoConn(String),
    Cancelled(bool),
}

/// The console's run: parse, ask the guard, run with maxTimeMS, record it in history.
pub async fn run(req: RunRequest, conn: Conn, state: &DbState, settings: &SettingsState, guard_state: &GuardState, store: &LocalStore) -> Result<RunOutcome, String> {
    let t = Instant::now();
    let cmd = match mongo_shell::parse_command(&req.sql) {
        Ok(c) => c,
        Err(e) => {
            return Ok(RunOutcome::Error {
                title: "Capy couldn't make sense of the query".into(),
                says: Some(e.says(&req.sql)),
                message: e.message.clone(),
                hint: Some(format!("Capy reads it before sending, so nothing was sent to {}.", conn.name)),
                lost: false,
                ms: t.elapsed().as_millis() as u64, fix: None,
            })
        }
    };
    let (ops, unreadable) = mongo_shell::kinds(&cmd);
    let mut writes: Vec<&'static str> = ops.iter().map(|(k, _)| *k).collect();
    writes.dedup();
    if let Some(ask) = guard::check_kinds(writes, unreadable, Some(ops), &conn, req.approval, guard_state).await? {
        return Ok(RunOutcome::Ask(ask));
    }
    let row_limit = if req.add_limit { conn.row_limit.map(u64::from).unwrap_or_else(|| settings.u64("rowLimit", 100)) as usize } else { 0 };
    let timeout_s = conn.statement_timeout.map(u64::from).unwrap_or_else(|| settings.u64("statementTimeout", 30));
    let database = database_of(&conn, req.database.as_deref());
    let token = CancellationToken::new();
    if let Ok(mut runs) = state.runs.lock() {
        runs.insert(req.run_id.clone(), token.clone());
    }
    let started_at = conns::now_ms();
    let res = match state.mongo(&conn).await {
        Ok(open) => {
            let db = open.client.database(&database);
            // the server stops at maxTimeMS; the wait here stops a little later, or on Cancel
            let max_time = Duration::from_secs(if timeout_s > 0 { timeout_s } else { 24 * 3600 });
            let fut = exec(&db, &open.client, &cmd, row_limit, req.offset, max_time);
            tokio::pin!(fut);
            let sleep = async {
                if timeout_s > 0 {
                    tokio::time::sleep(Duration::from_secs(timeout_s + 2)).await
                } else {
                    std::future::pending::<()>().await
                }
            };
            tokio::select! {
                r = &mut fut => match r {
                    Ok(Ok(out)) => Got::Done(out, open.server.clone()),
                    Ok(Err(msg)) => Got::Refused(msg),
                    Err(e) => Got::Failed(e),
                },
                _ = token.cancelled() => Got::Cancelled(false),
                _ = sleep => Got::Cancelled(true),
            }
        }
        Err(e) => Got::NoConn(e),
    };
    if let Ok(mut runs) = state.runs.lock() {
        runs.remove(&req.run_id);
    }
    let ms = t.elapsed().as_millis() as u64;
    let outcome = match res {
        Got::Cancelled(timeout) => RunOutcome::Cancelled { ms, timeout },
        Got::Failed(e) if code_name(&e) == Some("MaxTimeMSExpired") => RunOutcome::Cancelled { ms, timeout: true },
        Got::Failed(e) => {
            let out = run_error(&e, &conn, ms);
            if lost(&e) {
                state.lose(&conn).await;
            }
            out
        }
        Got::NoConn(msg) => RunOutcome::Error { title: format!("Could not open {}", conn.name), says: None, message: msg, hint: None, lost: true, ms, fix: None },
        Got::Refused(msg) => RunOutcome::Error { title: msg.clone(), says: None, message: msg, hint: Some(format!("Nothing was sent to {}.", conn.name)), lost: false, ms, fix: None },
        Got::Done(out, server) => {
            let docs = out.docs;
            RunOutcome::Done {
                last_is_query: docs.is_some(),
                sets: docs.map(|(d, cut)| vec![docs_set(d, cut)]).unwrap_or_default(),
                messages: out.messages,
                ms,
                limit: out.limit,
                affected: out.affected,
                ddl: out.ddl,
                server,
            }
        }
    };
    if req.history && conn.keeps_history(&settings) {
        let (status, rows, error) = match &outcome {
            RunOutcome::Done { sets, affected, .. } => ("ok", affected.map(|a| a as i64).or(sets.last().and_then(|s| s.docs.as_ref()).map(|d| d.len() as i64)), None),
            RunOutcome::Error { title, .. } => ("error", None, Some(title.clone())),
            _ => ("cancelled", None, None),
        };
        let _ = store
            .add_history(HistoryEntry { id: 0, conn_id: conn.id.clone(), conn_name: conn.name.clone(), engine: conn.engine, database, sql: req.sql.clone(), started_at, ms: ms as i64, rows, status: status.into(), error })
            .await;
    }
    Ok(outcome)
}

// ---------- commands: the collection tab and Info ----------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindRequest {
    run_id: String,
    conn_id: String,
    database: Option<String>,
    collection: String,
    #[serde(default)]
    filter: String,
    #[serde(default)]
    projection: String,
    #[serde(default)]
    sort: String,
    skip: Option<u64>,
    limit: Option<i64>,
}

/// The collection tab's query bar: find(filter, projection).sort(sort).skip(skip).limit(limit). Each box is
/// read here first, so a typo never reaches the server. No sort unless one was given: stored order.
#[tauri::command]
pub async fn mongo_find(req: FindRequest, state: State<'_, DbState>, settings: State<'_, SettingsState>) -> Result<RunOutcome, String> {
    let conn = conns::find(&req.conn_id)?;
    let t = Instant::now();
    let mut parsed = vec![];
    for (label, text) in [("Filter", &req.filter), ("Project", &req.projection), ("Sort", &req.sort)] {
        match mongo_shell::parse_doc(text, label) {
            Ok(d) => parsed.push(d),
            Err(e) => {
                return Ok(RunOutcome::Error {
                    title: format!("The {} is not valid", label.to_lowercase()),
                    says: Some(e.says(text)),
                    message: e.message.clone(),
                    hint: Some(format!("Capy reads it before sending, so nothing was sent to {}.", conn.name)),
                    lost: false,
                    ms: t.elapsed().as_millis() as u64, fix: None,
                })
            }
        }
    }
    let (filter, projection, sort) = (parsed[0].take().unwrap_or_default(), parsed[1].take(), parsed[2].take());
    let limit = req.limit.filter(|l| *l > 0).unwrap_or_else(|| conn.row_limit.map(i64::from).unwrap_or_else(|| settings.u64("rowLimit", 100) as i64));
    let timeout_s = conn.statement_timeout.map(u64::from).unwrap_or_else(|| settings.u64("statementTimeout", 30));
    let token = CancellationToken::new();
    if let Ok(mut runs) = state.runs.lock() {
        runs.insert(req.run_id.clone(), token.clone());
    }
    let res = match state.mongo(&conn).await {
        Ok(open) => {
            let coll = open.client.database(&database_of(&conn, req.database.as_deref())).collection::<Document>(&req.collection);
            let mut f = coll.find(filter).limit(limit).max_time(Duration::from_secs(if timeout_s > 0 { timeout_s } else { 24 * 3600 }));
            if let Some(p) = projection {
                f = f.projection(p);
            }
            if let Some(s) = sort {
                f = f.sort(s);
            }
            if let Some(s) = req.skip.filter(|s| *s > 0) {
                f = f.skip(s);
            }
            let work = async { collect(f.await?, limit as usize).await };
            tokio::select! {
                r = work => Ok(r.map(|d| (d, open.server.clone()))),
                _ = token.cancelled() => Err(false),
            }
        }
        Err(e) => Ok(Err(MError::custom(e))),
    };
    if let Ok(mut runs) = state.runs.lock() {
        runs.remove(&req.run_id);
    }
    let ms = t.elapsed().as_millis() as u64;
    Ok(match res {
        Err(timeout) => RunOutcome::Cancelled { ms, timeout },
        Ok(Err(e)) if code_name(&e) == Some("MaxTimeMSExpired") => RunOutcome::Cancelled { ms, timeout: true },
        Ok(Err(e)) => {
            if let ErrorKind::Custom(c) = e.kind.as_ref() {
                if let Some(s) = c.downcast_ref::<String>() {
                    return Ok(RunOutcome::Error { title: format!("Could not open {}", conn.name), says: None, message: s.clone(), hint: None, lost: true, ms, fix: None });
                }
            }
            if lost(&e) {
                state.lose(&conn).await;
            }
            run_error(&e, &conn, ms)
        }
        Ok(Ok(((docs, cut), server))) => RunOutcome::Done {
            messages: vec![format!("{} returned", plural_docs(docs.len() as u64))],
            sets: vec![docs_set(docs, cut)],
            ms,
            limit: Some(limit as usize),
            affected: None,
            ddl: false,
            last_is_query: true,
            server,
        },
    })
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CollInfo {
    /// collection, view or timeseries
    kind: String,
    /// the count the server keeps, not counted
    count: Option<i64>,
    avg_size: Option<i64>,
    /// uncompressed
    data_size: Option<i64>,
    /// on disk, compressed
    storage_size: Option<i64>,
    /// zstd, snappy, zlib; from WiredTiger's creation string
    compression: Option<String>,
    index_size: Option<i64>,
    /// each index and its size, in the order the server gave
    indexes: Vec<(String, i64)>,
    capped: bool,
    /// the validator's top-level keys ($jsonSchema), its level and action
    validator: Option<String>,
    validation_level: Option<String>,
    validation_action: Option<String>,
    /// ms since the epoch, when this was read
    read_at: i64,
}

/// Info: listCollections for the kind and validator, then $collStats storage stats (metadata, nothing
/// scanned), summed over shards. Read when the dialog opens and on Refresh, never on its own.
#[tauri::command]
pub async fn mongo_stats(id: String, database: Option<String>, collection: String, state: State<'_, DbState>) -> Result<CollInfo, String> {
    let conn = conns::find(&id)?;
    let open = state.mongo(&conn).await?;
    stats(&open.client.database(&database_of(&conn, database.as_deref())), &collection).await
}

async fn stats(db: &Database, collection: &str) -> Result<CollInfo, String> {
    let collection = collection.to_string();
    let mut info = CollInfo { read_at: conns::now_ms(), kind: "collection".into(), ..Default::default() };
    let spec: Option<Document> = db
        .run_command(doc! { "listCollections": 1, "filter": { "name": collection.clone() }, "nameOnly": false })
        .await
        .ok()
        .and_then(|r| r.get_document("cursor").ok().and_then(|c| c.get_array("firstBatch").ok()).and_then(|b| b.first().and_then(Bson::as_document).cloned()));
    if let Some(s) = &spec {
        info.kind = s.get_str("type").unwrap_or("collection").to_string();
        if let Ok(o) = s.get_document("options") {
            info.capped = o.get_bool("capped").unwrap_or(false);
            info.validator = o.get_document("validator").ok().filter(|v| !v.is_empty()).map(|v| v.keys().cloned().collect::<Vec<_>>().join(", "));
            info.validation_level = o.get_str("validationLevel").ok().map(String::from);
            info.validation_action = o.get_str("validationAction").ok().map(String::from);
        }
    }
    if info.kind == "view" {
        return Ok(info);
    }
    let shards: Vec<Document> = match db.collection::<Document>(&collection).aggregate([doc! { "$collStats": { "storageStats": {} } }]).await {
        Ok(c) => c.try_collect().await.map_err(|e| err_text(&e))?,
        // older servers and some hosted tiers: the collStats command
        Err(_) => vec![doc! { "storageStats": db.run_command(doc! { "collStats": collection.clone() }).await.map_err(|e| err_text(&e))? }],
    };
    let add = |a: Option<i64>, b: Option<i64>| match (a, b) {
        (None, None) => None,
        (a, b) => Some(a.unwrap_or(0) + b.unwrap_or(0)),
    };
    for s in shards.iter().filter_map(|d| d.get_document("storageStats").ok()) {
        info.count = add(info.count, num(s.get("count")));
        info.data_size = add(info.data_size, num(s.get("size")));
        info.storage_size = add(info.storage_size, num(s.get("storageSize")));
        info.index_size = add(info.index_size, num(s.get("totalIndexSize")));
        if let Ok(sizes) = s.get_document("indexSizes") {
            for (k, v) in sizes {
                let n = num(Some(v)).unwrap_or(0);
                match info.indexes.iter_mut().find(|(name, _)| name == k) {
                    Some(e) => e.1 += n,
                    None => info.indexes.push((k.clone(), n)),
                }
            }
        }
        if info.compression.is_none() {
            info.compression = s.get_document("wiredTiger").ok().and_then(|w| w.get_str("creationString").ok()).and_then(|c| c.split(',').find_map(|p| p.strip_prefix("block_compressor=").map(String::from))).filter(|c| !c.is_empty());
        }
    }
    info.avg_size = match (info.data_size, info.count) {
        (Some(s), Some(c)) if c > 0 => Some(s / c),
        _ => None,
    };
    Ok(info)
}

/// The optional heartbeat: ping on each open MongoDB connection that has it on. The driver opens its
/// connections again on its own, so a ping that answers after a drop is the reconnect.
pub(super) async fn heartbeat(state: &DbState, global: bool, beat: &mut super::Beat<'_>) {
    let opens: Vec<(String, Arc<MOpen>)> = state.mongo.lock().await.iter().filter(|(_, o)| o.heartbeat.unwrap_or(global)).map(|(id, o)| (id.clone(), o.clone())).collect();
    for (id, o) in opens {
        beat.start(&id);
        let up = matches!(tokio::time::timeout(super::BEAT_WAIT, o.client.database("admin").run_command(doc! { "ping": 1 })).await, Ok(Ok(_)));
        beat.done(&id, Some(up));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A MongoDB to run against, with nothing in it worth keeping: it uses the database ypacapy_test.
    /// YPACAPY_TEST_MONGO=localhost:27017 cargo test --lib mongo -- --ignored
    fn conn() -> Conn {
        let host = std::env::var("YPACAPY_TEST_MONGO").unwrap_or_else(|_| "localhost:27017".into());
        toml::from_str(&format!("id = \"\"\nname = \"test\"\nengine = \"mongo\"\nhost = \"{host}\"\nconnectTimeout = 5\n")).unwrap()
    }

    async fn run(state: &DbState, c: &Conn, src: &str, limit: usize) -> Result<Result<Out, String>, MError> {
        let open = state.mongo(c).await.unwrap();
        let cmd = mongo_shell::parse_command(src).unwrap();
        exec(&open.client.database("ypacapy_test"), &open.client, &cmd, limit, 0, Duration::from_secs(10)).await
    }

    #[tokio::test]
    #[ignore]
    async fn console_against_a_server() {
        let (state, c) = (DbState::default(), conn());
        let open = state.mongo(&c).await.expect("a MongoDB at YPACAPY_TEST_MONGO");
        assert!(open.server.starts_with("MongoDB "));
        open.client.database("ypacapy_test").drop().await.unwrap();

        let w = run(&state, &c, r#"db.orders.insertMany([{ n: 1, s: "paid", at: ISODate("2026-11-01") }, { n: 2, s: "paid" }, { n: 3, s: "lost", tags: ["a"] }])"#, 0).await.unwrap().unwrap();
        assert_eq!(w.affected, Some(3));

        // a find without a limit gets the row limit, and says so
        let f = run(&state, &c, "db.orders.find({ s: 'paid' }).sort({ n: -1 })", 1).await.unwrap().unwrap();
        let (docs, _) = f.docs.unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].get_i32("n").unwrap(), 2);
        assert_eq!(f.limit, Some(1));

        // a pipeline without $limit gets one; with $merge it writes and gets none
        let a = run(&state, &c, "db.orders.aggregate([{ $match: {} }])", 2).await.unwrap().unwrap();
        assert_eq!(a.docs.unwrap().0.len(), 2);
        let m = run(&state, &c, "db.orders.aggregate([{ $group: { _id: '$s', c: { $sum: 1 } } }, { $merge: { into: 'by_status' } }])", 2).await.unwrap().unwrap();
        assert!(m.ddl && m.docs.is_none());

        // the server's own error, by its code name
        let e = run(&state, &c, "db.orders.find({ s: { $inn: ['paid'] } })", 10).await.unwrap_err();
        assert_eq!(code_name(&e), Some("BadValue"));

        let d = run(&state, &c, "db.orders.deleteMany({ s: 'lost' })", 0).await.unwrap().unwrap();
        assert_eq!(d.affected, Some(1));

        // the tree, indexes and Info
        let objs = collections(&state, &c, "ypacapy_test").await.unwrap();
        assert!(objs.tables.iter().any(|t| t.name == "orders" && t.estimate == Some(2)));
        let ix = indexes(&state, &c, "ypacapy_test", "orders").await.unwrap();
        assert_eq!(ix.indexes[0].name, "_id_");
        // Info: the server's own numbers, summed from $collStats
        let st = stats(&open.client.database("ypacapy_test"), "orders").await.unwrap();
        assert_eq!((st.kind.as_str(), st.count), ("collection", Some(2)));
        assert!(st.data_size.unwrap() > 0 && st.storage_size.is_some() && st.index_size.is_some());
        assert_eq!(st.indexes[0].0, "_id_");
        open.client.database("ypacapy_test").drop().await.unwrap();
    }
}
