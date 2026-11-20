//! The Redis console's text, read the way redis-cli reads a line: words split on spaces, "double quotes" with
//! backslash escapes (\n \r \t \b \a \\ \" \xHH), 'single quotes' with only \' escaped. One command per line;
//! blank lines and lines starting with # are skipped. Nothing is evaluated: each command goes to the server as
//! its words.
//!
//! The write guard reads the command name (and, for a few, a subcommand or option) against the lists below.
//! A command that is in none of them is asked about as unreadable: ypacapy cannot say whether it writes.

/// One command of the console text
#[derive(Debug, Clone, PartialEq)]
pub struct Cmd {
    pub args: Vec<Vec<u8>>,
    /// 0-based line in the text
    pub line: usize,
    /// the line as typed, for history and messages
    pub text: String,
}

impl Cmd {
    /// The command name, upper case: DEL, CONFIG
    pub fn name(&self) -> String {
        String::from_utf8_lossy(&self.args[0]).to_ascii_uppercase()
    }
    /// An argument, upper case, for subcommands and options
    pub fn upper(&self, i: usize) -> Option<String> {
        self.args.get(i).map(|a| String::from_utf8_lossy(a).to_ascii_uppercase())
    }
    pub fn has(&self, opt: &str) -> bool {
        self.args.iter().skip(1).any(|a| a.eq_ignore_ascii_case(opt.as_bytes()))
    }
}

#[derive(Debug, PartialEq)]
pub struct ParseError {
    pub message: String,
    pub line: usize,
    /// 0-based column, in characters
    pub column: usize,
}

impl ParseError {
    /// redis-cli's complaint, with the line and a caret under the place
    pub fn says(&self, src: &str) -> String {
        let line = src.lines().nth(self.line).unwrap_or("");
        format!("{} at line {}, column {}\n{line}\n{}^", self.message, self.line + 1, self.column + 1, " ".repeat(self.column))
    }
}

fn hex(c: char) -> Option<u8> {
    c.to_digit(16).map(|d| d as u8)
}

/// One line into its words
fn split_line(line: &str, n: usize) -> Result<Vec<Vec<u8>>, ParseError> {
    let chars: Vec<char> = line.chars().collect();
    let err = |message: &str, column: usize| ParseError { message: message.into(), line: n, column };
    let mut out = vec![];
    let mut i = 0;
    while i < chars.len() {
        if chars[i].is_whitespace() {
            i += 1;
            continue;
        }
        let mut word: Vec<u8> = vec![];
        let start = i;
        loop {
            if i >= chars.len() || chars[i].is_whitespace() {
                break;
            }
            match chars[i] {
                '"' => {
                    let open = i;
                    i += 1;
                    loop {
                        let Some(&c) = chars.get(i) else { return Err(err("A double quote is not closed", open)) };
                        i += 1;
                        match c {
                            '"' => break,
                            '\\' => {
                                let Some(&e) = chars.get(i) else { return Err(err("A double quote is not closed", open)) };
                                i += 1;
                                match e {
                                    'n' => word.push(b'\n'),
                                    'r' => word.push(b'\r'),
                                    't' => word.push(b'\t'),
                                    'b' => word.push(8),
                                    'a' => word.push(7),
                                    'x' => match (chars.get(i).copied().and_then(hex), chars.get(i + 1).copied().and_then(hex)) {
                                        (Some(h), Some(l)) => {
                                            word.push(h * 16 + l);
                                            i += 2;
                                        }
                                        _ => word.extend_from_slice(b"x"),
                                    },
                                    other => {
                                        let mut b = [0; 4];
                                        word.extend_from_slice(other.encode_utf8(&mut b).as_bytes());
                                    }
                                }
                            }
                            c => {
                                let mut b = [0; 4];
                                word.extend_from_slice(c.encode_utf8(&mut b).as_bytes());
                            }
                        }
                    }
                    // redis-cli wants a space (or the end) after a closing quote
                    if chars.get(i).is_some_and(|c| !c.is_whitespace()) {
                        return Err(err("A closing quote must be followed by a space", i));
                    }
                }
                '\'' => {
                    let open = i;
                    i += 1;
                    loop {
                        let Some(&c) = chars.get(i) else { return Err(err("A single quote is not closed", open)) };
                        i += 1;
                        match c {
                            '\'' => break,
                            '\\' if chars.get(i) == Some(&'\'') => {
                                word.push(b'\'');
                                i += 1;
                            }
                            c => {
                                let mut b = [0; 4];
                                word.extend_from_slice(c.encode_utf8(&mut b).as_bytes());
                            }
                        }
                    }
                    if chars.get(i).is_some_and(|c| !c.is_whitespace()) {
                        return Err(err("A closing quote must be followed by a space", i));
                    }
                }
                c => {
                    let mut b = [0; 4];
                    word.extend_from_slice(c.encode_utf8(&mut b).as_bytes());
                    i += 1;
                }
            }
        }
        let _ = start;
        out.push(word);
    }
    Ok(out)
}

/// The console text into commands, one per line
pub fn parse(src: &str) -> Result<Vec<Cmd>, ParseError> {
    let mut cmds = vec![];
    for (n, line) in src.lines().enumerate() {
        let t = line.trim();
        if t.is_empty() || t.starts_with('#') {
            continue;
        }
        let args = split_line(line, n)?;
        if !args.is_empty() {
            cmds.push(Cmd { args, line: n, text: t.to_string() });
        }
    }
    if cmds.is_empty() {
        return Err(ParseError { message: "There is no command to run".into(), line: 0, column: 0 });
    }
    Ok(cmds)
}

// ---------- the write guard's lists ----------

/// The kinds Commands to ask about lists, in its order (src/types.ts REDIS_KINDS, the same order)
pub const KINDS: [&str; 12] = ["strings", "hashes", "lists", "sets", "zsets", "streams", "keys", "expire", "flush", "scripts", "server", "KEYS"];

const STRINGS: &[&str] = &["SET", "SETNX", "SETEX", "PSETEX", "MSET", "MSETNX", "APPEND", "INCR", "INCRBY", "INCRBYFLOAT", "DECR", "DECRBY", "SETRANGE", "GETSET", "GETDEL", "GETEX", "SETBIT", "BITOP", "PFADD", "PFMERGE"];
const HASHES: &[&str] = &["HSET", "HSETNX", "HMSET", "HDEL", "HINCRBY", "HINCRBYFLOAT", "HEXPIRE", "HPEXPIRE", "HEXPIREAT", "HPEXPIREAT", "HPERSIST", "HGETDEL", "HGETEX", "HSETEX"];
const LISTS: &[&str] = &["LPUSH", "RPUSH", "LPUSHX", "RPUSHX", "LPOP", "RPOP", "LREM", "LTRIM", "LSET", "LINSERT", "LMOVE", "BLMOVE", "RPOPLPUSH", "BRPOPLPUSH", "BLPOP", "BRPOP", "LMPOP", "BLMPOP"];
const SETS: &[&str] = &["SADD", "SREM", "SMOVE", "SPOP", "SINTERSTORE", "SUNIONSTORE", "SDIFFSTORE"];
const ZSETS: &[&str] = &["ZADD", "ZREM", "ZINCRBY", "ZREMRANGEBYSCORE", "ZREMRANGEBYRANK", "ZREMRANGEBYLEX", "ZPOPMIN", "ZPOPMAX", "BZPOPMIN", "BZPOPMAX", "ZMPOP", "BZMPOP", "ZRANGESTORE", "ZINTERSTORE", "ZUNIONSTORE", "ZDIFFSTORE", "GEOADD", "GEORADIUS", "GEORADIUSBYMEMBER", "GEOSEARCHSTORE"];
const STREAMS: &[&str] = &["XADD", "XDEL", "XTRIM", "XGROUP", "XACK", "XCLAIM", "XAUTOCLAIM", "XSETID", "XREADGROUP", "XDELEX", "XACKDEL"];
const KEYS_W: &[&str] = &["DEL", "UNLINK", "RENAME", "RENAMENX", "MOVE", "COPY", "RESTORE", "MIGRATE"];
const EXPIRE: &[&str] = &["EXPIRE", "PEXPIRE", "EXPIREAT", "PEXPIREAT", "PERSIST"];
const FLUSH: &[&str] = &["FLUSHDB", "FLUSHALL", "SWAPDB"];
const SCRIPTS: &[&str] = &["EVAL", "EVALSHA", "FCALL"];
const SERVER: &[&str] = &["SHUTDOWN", "DEBUG", "REPLICAOF", "SLAVEOF", "FAILOVER", "SAVE", "BGSAVE", "BGREWRITEAOF", "MODULE", "CLUSTER"];
/// Commands that only read, or only touch this connection. They never ask.
const READS: &[&str] = &[
    "GET", "MGET", "LCS", "GETRANGE", "SUBSTR", "STRLEN", "GETBIT", "BITCOUNT", "BITPOS", "PFCOUNT", "EXISTS", "TYPE", "TTL", "PTTL", "EXPIRETIME", "PEXPIRETIME", "DUMP", "RANDOMKEY",
    "SCAN", "DBSIZE", "TOUCH", "HGET", "HMGET", "HGETALL", "HKEYS", "HVALS", "HLEN", "HEXISTS", "HSTRLEN", "HRANDFIELD", "HSCAN", "HTTL", "HPTTL", "HEXPIRETIME", "HPEXPIRETIME",
    "LRANGE", "LINDEX", "LLEN", "LPOS", "SMEMBERS", "SISMEMBER", "SMISMEMBER", "SCARD", "SRANDMEMBER", "SINTER", "SINTERCARD", "SUNION", "SDIFF", "SSCAN", "ZRANGE", "ZREVRANGE",
    "ZRANGEBYSCORE", "ZREVRANGEBYSCORE", "ZRANGEBYLEX", "ZREVRANGEBYLEX", "ZSCORE", "ZMSCORE", "ZRANK", "ZREVRANK", "ZCARD", "ZCOUNT", "ZLEXCOUNT", "ZRANDMEMBER", "ZINTER", "ZUNION",
    "ZDIFF", "ZINTERCARD", "ZSCAN", "GEOPOS", "GEODIST", "GEOHASH", "GEOSEARCH", "GEORADIUS_RO", "GEORADIUSBYMEMBER_RO", "XRANGE", "XREVRANGE", "XLEN", "XREAD", "XINFO", "XPENDING",
    "PING", "ECHO", "TIME", "INFO", "LASTSAVE", "ROLE", "LOLWUT", "COMMAND", "MEMORY", "OBJECT", "LATENCY", "SLOWLOG", "WAIT", "WAITAOF", "EVAL_RO", "EVALSHA_RO", "FCALL_RO", "PUBLISH",
    "SPUBLISH", "PUBSUB", "READONLY", "READWRITE",
];
/// Commands that would leave this connection in another state than the one ypacapy keeps it in (another
/// database, a transaction, a subscription). The console does not send them.
const REFUSED: &[(&str, &str)] = &[
    ("SELECT", "Capy stays on this connection's database. To work in another, add a connection with that database number."),
    ("MULTI", "Transactions are not available in the console yet. Each command runs on its own."),
    ("EXEC", "Transactions are not available in the console yet. Each command runs on its own."),
    ("DISCARD", "Transactions are not available in the console yet. Each command runs on its own."),
    ("WATCH", "Transactions are not available in the console yet. Each command runs on its own."),
    ("UNWATCH", "Transactions are not available in the console yet. Each command runs on its own."),
    ("SUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("PSUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("SSUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("UNSUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("PUNSUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("SUNSUBSCRIBE", "The console shows replies only, so subscribing is not available."),
    ("MONITOR", "MONITOR streams every command the server gets. The console shows replies only."),
    ("SYNC", "SYNC is for replicas only."),
    ("PSYNC", "PSYNC is for replicas only."),
    ("QUIT", "Close the connection's tab to disconnect."),
    ("RESET", "RESET would leave the connection in another state than Capy keeps it in."),
    ("HELLO", "Capy speaks RESP2 on this connection; HELLO would change that."),
    ("AUTH", "Sign in with another user by editing the connection, so the password stays in the keychain."),
];

/// What one command is, for the guard
#[derive(Debug, PartialEq)]
pub enum Kind {
    Read,
    /// one of KINDS
    Write(&'static str),
    /// not on any list: asked about as unreadable
    Unknown,
    /// never sent; the reason
    Refused(&'static str),
}

pub fn kind(c: &Cmd) -> Kind {
    let name = c.name();
    let n = name.as_str();
    if let Some((_, why)) = REFUSED.iter().find(|(r, _)| *r == n) {
        return Kind::Refused(why);
    }
    if n == "CLIENT" && c.upper(1).as_deref() == Some("REPLY") {
        return Kind::Refused("CLIENT REPLY would stop the replies the console shows.");
    }
    let sub = c.upper(1).unwrap_or_default();
    let w = |k: &'static str| Kind::Write(k);
    match n {
        "KEYS" => w("KEYS"),
        // SORT and the geo radius reads write when they STORE
        "SORT" | "SORT_RO" => if n == "SORT" && c.has("STORE") { w("keys") } else { Kind::Read },
        "GEORADIUS" | "GEORADIUSBYMEMBER" => if c.has("STORE") || c.has("STOREDIST") { w("zsets") } else { Kind::Read },
        // BITFIELD writes with SET or INCRBY; BITFIELD_RO never
        "BITFIELD" => if c.has("SET") || c.has("INCRBY") { w("strings") } else { Kind::Read },
        "BITFIELD_RO" => Kind::Read,
        "CONFIG" => if sub == "GET" || sub == "HELP" { Kind::Read } else { w("server") },
        "SCRIPT" => if sub == "FLUSH" || sub == "KILL" { w("server") } else { Kind::Read },
        "FUNCTION" => if matches!(sub.as_str(), "LIST" | "DUMP" | "STATS" | "HELP") { Kind::Read } else { w("scripts") },
        "ACL" => if matches!(sub.as_str(), "WHOAMI" | "LIST" | "USERS" | "GETUSER" | "CAT" | "LOG" | "DRYRUN" | "GENPASS" | "HELP") { Kind::Read } else { w("server") },
        "CLIENT" => if matches!(sub.as_str(), "KILL" | "PAUSE" | "UNPAUSE" | "NO-EVICT" | "NO-TOUCH") { w("server") } else { Kind::Read },
        _ if STRINGS.contains(&n) => w("strings"),
        _ if HASHES.contains(&n) => w("hashes"),
        _ if LISTS.contains(&n) => w("lists"),
        _ if SETS.contains(&n) => w("sets"),
        _ if ZSETS.contains(&n) => w("zsets"),
        _ if STREAMS.contains(&n) => w("streams"),
        _ if KEYS_W.contains(&n) => w("keys"),
        _ if EXPIRE.contains(&n) => w("expire"),
        _ if FLUSH.contains(&n) => w("flush"),
        _ if SCRIPTS.contains(&n) => w("scripts"),
        _ if SERVER.contains(&n) => w("server"),
        _ if READS.contains(&n) => Kind::Read,
        _ => Kind::Unknown,
    }
}

/// Commands whose change can be taken back (an add, a new expiry), so the ask does not say it cannot be undone
const ONLY_ADDS: &[&str] = &["EXPIRE", "PEXPIRE", "EXPIREAT", "PEXPIREAT", "PERSIST", "LPUSH", "RPUSH", "LPUSHX", "RPUSHX", "SADD", "XADD", "PFADD", "SETNX", "MSETNX", "HSETNX", "RENAMENX", "GEOADD", "CONFIG", "CLIENT", "SCRIPT", "SAVE", "BGSAVE", "BGREWRITEAOF", "KEYS"];

/// Whether the asked commands include one that deletes or overwrites
pub fn is_final(ops: &[String]) -> bool {
    ops.iter().any(|o| !ONLY_ADDS.contains(&o.as_str()))
}

/// The kinds and the commands behind them (kind, COMMAND), and whether any command is unknown; the reason
/// for the first refused command, if one is
/// (kind, COMMAND) pairs, in Commands to ask about's order
pub type Ops = Vec<(&'static str, String)>;

pub fn kinds(cmds: &[Cmd]) -> Result<(Ops, bool), (usize, &'static str)> {
    let mut ops: Vec<(&'static str, String)> = vec![];
    let mut unknown = false;
    for (i, c) in cmds.iter().enumerate() {
        match kind(c) {
            Kind::Refused(why) => return Err((i, why)),
            Kind::Write(k) => {
                let op = if matches!(k, "server" | "scripts") && c.args.len() > 1 && matches!(c.name().as_str(), "CONFIG" | "SCRIPT" | "FUNCTION" | "ACL" | "CLIENT") { format!("{} {}", c.name(), c.upper(1).unwrap_or_default()) } else { c.name() };
                if !ops.iter().any(|(_, o)| *o == op) {
                    ops.push((k, op));
                }
            }
            Kind::Unknown => unknown = true,
            Kind::Read => {}
        }
    }
    // in Commands to ask about's order
    ops.sort_by_key(|(k, _)| KINDS.iter().position(|x| x == k));
    Ok((ops, unknown))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn words(s: &str) -> Vec<String> {
        parse(s).unwrap()[0].args.iter().map(|a| String::from_utf8_lossy(a).into_owned()).collect()
    }

    #[test]
    fn splits_like_redis_cli() {
        assert_eq!(words("SET  greeting \"hello world\""), ["SET", "greeting", "hello world"]);
        assert_eq!(words(r#"SET k "a\"b\n""#), ["SET", "k", "a\"b\n"]);
        assert_eq!(words(r"SET k 'it\'s'"), ["SET", "k", "it's"]);
        assert_eq!(parse(r#"SET k "\x41\x42""#).unwrap()[0].args[2], b"AB");
        // one command per line; comments and blank lines skipped
        let c = parse("# top ten\n\nZRANGE lb 0 9 REV WITHSCORES\nGET a").unwrap();
        assert_eq!((c.len(), c[0].line, c[1].line), (2, 2, 3));
        assert!(c[0].has("withscores"));
    }

    #[test]
    fn says_where_the_text_is_wrong() {
        let e = parse("GET \"open").unwrap_err();
        assert_eq!((e.line, e.column), (0, 4));
        assert!(parse("SET k \"a\"b").is_err());
        assert!(parse("# only a comment").is_err());
    }

    #[test]
    fn classifies_for_the_guard() {
        let k = |s: &str| kind(&parse(s).unwrap()[0]);
        assert_eq!(k("get a"), Kind::Read);
        assert_eq!(k("DEL a b"), Kind::Write("keys"));
        assert_eq!(k("KEYS session:*"), Kind::Write("KEYS"));
        assert_eq!(k("CONFIG GET maxmemory"), Kind::Read);
        assert_eq!(k("config set maxmemory 1gb"), Kind::Write("server"));
        assert_eq!(k("SORT list STORE out"), Kind::Write("keys"));
        assert_eq!(k("SORT list"), Kind::Read);
        assert_eq!(k("JSON.SET doc $ 1"), Kind::Unknown);
        assert!(matches!(k("SELECT 1"), Kind::Refused(_)));
        assert!(matches!(k("MULTI"), Kind::Refused(_)));
        let (ops, unknown) = kinds(&parse("DEL a\nGET b\nEXPIRE c 10\nDEL d").unwrap()).unwrap();
        assert_eq!(ops, vec![("keys", "DEL".to_string()), ("expire", "EXPIRE".to_string())]);
        assert!(!unknown);
        assert!(is_final(&["DEL".into()]));
        assert!(!is_final(&["LPUSH".into(), "KEYS".into()]));
    }
}
