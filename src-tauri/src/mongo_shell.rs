//! mongosh syntax, the part ypacapy runs: one call on `db` or on a collection, with chained cursor methods
//! (`db.orders.find({…}).sort({…}).limit(50)`), and the JavaScript-like values inside it: unquoted keys,
//! either quote, trailing commas, comments, ObjectId(), ISODate(), NumberDecimal() and the like, /regex/.
//! The text is parsed, never evaluated. There is no JavaScript engine, so a variable, a function or a loop is
//! an error that says so, never a guess.
//!
//! The collection tab's Filter, Project and Sort boxes are one value each, read by `parse_value`.

use mongodb::bson::{oid::ObjectId, spec::BinarySubtype, Binary, Bson, DateTime, Decimal128, Document, Regex, Timestamp};

use crate::guard::MONGO_KINDS;

#[derive(Debug, Clone, PartialEq)]
pub enum Target {
    Db,
    Coll(String),
}

#[derive(Debug, Clone)]
pub struct Call {
    pub name: String,
    pub args: Vec<Bson>,
}

/// One statement: `db.<collection>.<call>(…)<.chain(…)…>` or `db.<call>(…)`.
#[derive(Debug, Clone)]
pub struct Command {
    pub target: Target,
    pub call: Call,
    pub chain: Vec<Call>,
}

#[derive(Debug, PartialEq)]
pub struct ParseError {
    pub message: String,
    /// byte offset into the text
    pub pos: usize,
}

impl ParseError {
    /// 1-based line and column (in characters) of the error
    pub fn line_col(&self, src: &str) -> (usize, usize) {
        let before = &src[..self.pos.min(src.len())];
        let line = before.matches('\n').count() + 1;
        let col = before.rsplit('\n').next().map(|l| l.chars().count()).unwrap_or(0) + 1;
        (line, col)
    }
    /// The error, then the line it is on with a caret under the place, as the preview shows it
    pub fn says(&self, src: &str) -> String {
        let (line, col) = self.line_col(src);
        let text = src.lines().nth(line - 1).unwrap_or("");
        format!("{} at line {line}, column {col}\n{text}\n{}^", self.message, " ".repeat(col - 1))
    }
}

type R<T> = Result<T, ParseError>;

#[derive(Debug, Clone, PartialEq)]
enum Tok {
    Punct(char),
    Str(String),
    Num(String),
    Ident(String),
    Regex(String, String),
    End,
}

struct Lexer<'a> {
    src: &'a str,
    i: usize,
    /// the last token, to tell a /regex/ (where a value starts) from anything else
    prev: Option<Tok>,
}

fn err<T>(message: impl Into<String>, pos: usize) -> R<T> {
    Err(ParseError { message: message.into(), pos })
}

impl<'a> Lexer<'a> {
    fn peek_char(&self) -> Option<char> {
        self.src[self.i..].chars().next()
    }
    fn skip_space(&mut self) -> R<()> {
        loop {
            let rest = &self.src[self.i..];
            if let Some(c) = rest.chars().next().filter(|c| c.is_whitespace()) {
                self.i += c.len_utf8();
            } else if rest.starts_with("//") {
                self.i += rest.find('\n').unwrap_or(rest.len());
            } else if rest.starts_with("/*") {
                match rest[2..].find("*/") {
                    Some(e) => self.i += e + 4,
                    None => return err("A comment is not closed", self.i),
                }
            } else {
                return Ok(());
            }
        }
    }
    fn value_may_start(&self) -> bool {
        matches!(self.prev, None | Some(Tok::Punct('(' | ',' | ':' | '[' | '{')))
    }
    fn next(&mut self) -> R<(Tok, usize)> {
        self.skip_space()?;
        let start = self.i;
        let Some(c) = self.peek_char() else { return Ok((Tok::End, start)) };
        let tok = if c == '"' || c == '\'' {
            self.string(c)?
        } else if c == '/' && self.value_may_start() {
            self.regex()?
        } else if c.is_ascii_digit() || ((c == '-' || c == '.') && self.src[self.i + 1..].chars().next().is_some_and(|d| d.is_ascii_digit() || d == '.')) {
            // digits, letters (hex, exponent), dots and _; a sign only right after an exponent marker: 1e-5
            let rest = &self.src[self.i..];
            let b = rest.as_bytes();
            let hex = rest.trim_start_matches('-').starts_with("0x");
            let mut j = 1;
            while j < b.len() && (b[j].is_ascii_alphanumeric() || b[j] == b'.' || b[j] == b'_' || ((b[j] == b'-' || b[j] == b'+') && !hex && matches!(b[j - 1], b'e' | b'E'))) {
                j += 1;
            }
            self.i += j;
            Tok::Num(rest[..j].replace('_', ""))
        } else if c.is_alphabetic() || c == '_' || c == '$' {
            let rest = &self.src[self.i..];
            let len = rest.char_indices().find(|(_, d)| !(d.is_alphanumeric() || *d == '_' || *d == '$')).map(|(j, _)| j).unwrap_or(rest.len());
            self.i += len;
            Tok::Ident(rest[..len].to_string())
        } else if "{}[]():,.;".contains(c) {
            self.i += 1;
            Tok::Punct(c)
        } else {
            return err(format!("Capy can't read {c} here"), start);
        };
        self.prev = Some(tok.clone());
        Ok((tok, start))
    }
    fn string(&mut self, q: char) -> R<Tok> {
        let start = self.i;
        self.i += 1;
        let mut out = String::new();
        loop {
            let Some(c) = self.peek_char() else { return err("A string is not closed", start) };
            self.i += c.len_utf8();
            match c {
                c if c == q => return Ok(Tok::Str(out)),
                '\n' => return err("A string is not closed before the end of its line", start),
                '\\' => {
                    let Some(e) = self.peek_char() else { return err("A string is not closed", start) };
                    self.i += e.len_utf8();
                    match e {
                        'n' => out.push('\n'),
                        't' => out.push('\t'),
                        'r' => out.push('\r'),
                        'b' => out.push('\u{8}'),
                        'f' => out.push('\u{c}'),
                        '0' => out.push('\0'),
                        'u' => {
                            let hex = self.src.get(self.i..self.i + 4).filter(|h| h.chars().all(|x| x.is_ascii_hexdigit()));
                            let Some(ch) = hex.and_then(|h| u32::from_str_radix(h, 16).ok()).and_then(char::from_u32) else {
                                return err("\\u needs four hex digits", self.i - 2);
                            };
                            self.i += 4;
                            out.push(ch);
                        }
                        '\n' => {}
                        other => out.push(other),
                    }
                }
                c => out.push(c),
            }
        }
    }
    fn regex(&mut self) -> R<Tok> {
        let start = self.i;
        self.i += 1;
        let mut pat = String::new();
        let mut class = false;
        loop {
            let Some(c) = self.peek_char() else { return err("A /regex/ is not closed", start) };
            self.i += c.len_utf8();
            match c {
                '\n' => return err("A /regex/ is not closed before the end of its line", start),
                '\\' => {
                    pat.push('\\');
                    if let Some(e) = self.peek_char() {
                        self.i += e.len_utf8();
                        pat.push(e);
                    }
                }
                '[' => {
                    class = true;
                    pat.push(c);
                }
                ']' => {
                    class = false;
                    pat.push(c);
                }
                '/' if !class => break,
                c => pat.push(c),
            }
        }
        let rest = &self.src[self.i..];
        let len = rest.char_indices().find(|(_, d)| !d.is_ascii_alphabetic()).map(|(j, _)| j).unwrap_or(rest.len());
        let flags = rest[..len].to_string();
        if let Some(bad) = flags.chars().find(|f| !"imsxu".contains(*f)) {
            return err(format!("MongoDB has no regex flag {bad}"), self.i);
        }
        self.i += len;
        Ok(Tok::Regex(pat, flags))
    }
}

struct Parser<'a> {
    lx: Lexer<'a>,
    tok: Tok,
    at: usize,
}

fn describe(t: &Tok) -> String {
    match t {
        Tok::Punct(c) => format!("{c}"),
        Tok::Str(s) => format!("\"{s}\""),
        Tok::Num(n) => n.clone(),
        Tok::Ident(i) => i.clone(),
        Tok::Regex(p, f) => format!("/{p}/{f}"),
        Tok::End => "the end".into(),
    }
}

impl<'a> Parser<'a> {
    fn new(src: &'a str) -> R<Self> {
        let mut lx = Lexer { src, i: 0, prev: None };
        let (tok, at) = lx.next()?;
        Ok(Parser { lx, tok, at })
    }
    fn bump(&mut self) -> R<(Tok, usize)> {
        let (t, a) = self.lx.next()?;
        Ok((std::mem::replace(&mut self.tok, t), std::mem::replace(&mut self.at, a)))
    }
    fn is(&self, c: char) -> bool {
        self.tok == Tok::Punct(c)
    }
    fn expect(&mut self, c: char, after: &str) -> R<()> {
        if self.is(c) {
            self.bump()?;
            Ok(())
        } else {
            err(format!("Expected {c} {after}, found {}", describe(&self.tok)), self.at)
        }
    }

    fn value(&mut self) -> R<Bson> {
        let (t, at) = self.bump()?;
        match t {
            Tok::Punct('{') => self.object().map(Bson::Document),
            Tok::Punct('[') => self.array(),
            Tok::Str(s) => Ok(Bson::String(s)),
            Tok::Num(n) => number(&n, at),
            Tok::Regex(p, f) => {
                // MongoDB keeps regex options sorted
                let mut o: Vec<char> = f.chars().collect();
                o.sort();
                Ok(Bson::RegularExpression(Regex { pattern: p, options: o.into_iter().collect() }))
            }
            Tok::Ident(id) => self.ident_value(&id, at),
            Tok::End => err("Expected a value, found the end", at),
            t => err(format!("Expected a value, found {}", describe(&t)), at),
        }
    }

    fn object(&mut self) -> R<Document> {
        let mut d = Document::new();
        loop {
            if self.is('}') {
                self.bump()?;
                return Ok(d);
            }
            let (t, at) = self.bump()?;
            let key = match t {
                Tok::Ident(k) | Tok::Str(k) | Tok::Num(k) => k,
                t => return err(format!("Expected a field name, found {}", describe(&t)), at),
            };
            self.expect(':', &format!("after {key}"))?;
            let v = self.value()?;
            d.insert(key.clone(), v);
            if self.is(',') {
                self.bump()?;
            } else if !self.is('}') {
                return err(format!("Expected , or }} after the value of {key}"), self.at);
            }
        }
    }

    fn array(&mut self) -> R<Bson> {
        let mut out = vec![];
        loop {
            if self.is(']') {
                self.bump()?;
                return Ok(Bson::Array(out));
            }
            out.push(self.value()?);
            if self.is(',') {
                self.bump()?;
            } else if !self.is(']') {
                return err(format!("Expected , or ] after {}", short(out.last())), self.at);
            }
        }
    }

    /// The arguments of a call, after its (
    fn args(&mut self) -> R<Vec<Bson>> {
        let mut out = vec![];
        loop {
            if self.is(')') {
                self.bump()?;
                return Ok(out);
            }
            out.push(self.value()?);
            if self.is(',') {
                self.bump()?;
            } else if !self.is(')') {
                return err("Expected , or ) after an argument", self.at);
            }
        }
    }

    /// ObjectId("…"), ISODate("…"), true, null and the rest of the names a value can be
    fn ident_value(&mut self, id: &str, at: usize) -> R<Bson> {
        match id {
            "true" => return Ok(Bson::Boolean(true)),
            "false" => return Ok(Bson::Boolean(false)),
            "null" | "undefined" => return Ok(Bson::Null),
            "Infinity" => return Ok(Bson::Double(f64::INFINITY)),
            "NaN" => return Ok(Bson::Double(f64::NAN)),
            "MinKey" | "MaxKey" if !self.is('(') => return Ok(if id == "MinKey" { Bson::MinKey } else { Bson::MaxKey }),
            "new" => {
                let (t, at2) = self.bump()?;
                let Tok::Ident(name) = t else { return err("Expected a type after new", at2) };
                return self.ident_value(&name, at2);
            }
            _ => {}
        }
        if !self.is('(') {
            return err(format!("Capy doesn't run JavaScript, so {id} has no value here. Write the value itself"), at);
        }
        self.bump()?;
        let args = self.args()?;
        let one_str = |what: &str| -> R<String> {
            match args.as_slice() {
                [Bson::String(s)] => Ok(s.clone()),
                _ => err(format!("{id}() takes {what}"), at),
            }
        };
        let num_arg = || -> Option<String> {
            match args.as_slice() {
                [Bson::String(s)] => Some(s.clone()),
                [Bson::Int32(n)] => Some(n.to_string()),
                [Bson::Int64(n)] => Some(n.to_string()),
                [Bson::Double(n)] => Some(n.to_string()),
                _ => None,
            }
        };
        match id {
            "ObjectId" | "ObjectID" => {
                if args.is_empty() {
                    return Ok(Bson::ObjectId(ObjectId::new()));
                }
                let s = one_str("24 hex digits in quotes")?;
                ObjectId::parse_str(&s).map(Bson::ObjectId).or_else(|_| err(format!("{s} is not an ObjectId. An ObjectId has 24 hex digits."), at))
            }
            "ISODate" | "Date" => match args.as_slice() {
                [] => Ok(Bson::DateTime(DateTime::now())),
                [Bson::String(s)] => date(s).map(Bson::DateTime).ok_or_else(|| ParseError { message: format!("{s} isn't a date Capy reads, such as 2026-10-19 or 2026-10-19T10:00:00Z"), pos: at }),
                [Bson::Int32(n)] => Ok(Bson::DateTime(DateTime::from_millis(*n as i64))),
                [Bson::Int64(n)] => Ok(Bson::DateTime(DateTime::from_millis(*n))),
                [Bson::Double(n)] => Ok(Bson::DateTime(DateTime::from_millis(*n as i64))),
                _ => err(format!("{id}() takes one date"), at),
            },
            "NumberDecimal" | "Decimal128" => {
                let s = num_arg().ok_or_else(|| ParseError { message: format!("{id}() takes one number"), pos: at })?;
                s.parse::<Decimal128>().map(Bson::Decimal128).or_else(|_| err(format!("{s} is not a decimal"), at))
            }
            "NumberLong" | "Long" => {
                let s = num_arg().ok_or_else(|| ParseError { message: format!("{id}() takes one number"), pos: at })?;
                s.parse::<i64>().map(Bson::Int64).or_else(|_| err(format!("{s} is not a whole number that fits in 64 bits"), at))
            }
            "NumberInt" | "Int32" => {
                let s = num_arg().ok_or_else(|| ParseError { message: format!("{id}() takes one number"), pos: at })?;
                s.parse::<i32>().map(Bson::Int32).or_else(|_| err(format!("{s} is not a whole number that fits in 32 bits"), at))
            }
            "Double" => {
                let s = num_arg().ok_or_else(|| ParseError { message: format!("{id}() takes one number"), pos: at })?;
                s.parse::<f64>().map(Bson::Double).or_else(|_| err(format!("{s} is not a number"), at))
            }
            "Timestamp" => {
                let (t, i) = match args.as_slice() {
                    [a, b] => (a.as_i64().or(a.as_i32().map(i64::from)), b.as_i64().or(b.as_i32().map(i64::from))),
                    [Bson::Document(d)] => (d.get("t").and_then(|v| v.as_i64().or(v.as_i32().map(i64::from))), d.get("i").and_then(|v| v.as_i64().or(v.as_i32().map(i64::from)))),
                    _ => (None, None),
                };
                match (t, i) {
                    (Some(t), Some(i)) => Ok(Bson::Timestamp(Timestamp { time: t as u32, increment: i as u32 })),
                    _ => err("Timestamp() takes seconds and an increment", at),
                }
            }
            "UUID" => {
                let s = one_str("a UUID in quotes")?;
                let hex: String = s.chars().filter(|c| *c != '-').collect();
                let bytes = (hex.len() == 32).then(|| (0..16).map(|k| u8::from_str_radix(&hex[k * 2..k * 2 + 2], 16).ok()).collect::<Option<Vec<u8>>>()).flatten();
                match bytes {
                    Some(bytes) => Ok(Bson::Binary(Binary { subtype: BinarySubtype::Uuid, bytes })),
                    None => err(format!("{s} is not a UUID"), at),
                }
            }
            "MinKey" => Ok(Bson::MinKey),
            "MaxKey" => Ok(Bson::MaxKey),
            _ => err(format!("Capy doesn't know {id}(). It reads values only."), at),
        }
    }
}

fn short(b: Option<&Bson>) -> String {
    match b {
        Some(Bson::String(s)) => format!("\"{s}\""),
        Some(Bson::Int32(n)) => n.to_string(),
        Some(Bson::Int64(n)) => n.to_string(),
        Some(Bson::Double(n)) => n.to_string(),
        Some(Bson::Document(_)) => "{ … }".into(),
        Some(Bson::Array(_)) => "[ … ]".into(),
        _ => "the value".into(),
    }
}

/// 12 → Int32, 5000000000 → Int64, 1.5 or 1e3 → Double; hex 0x1f too
fn number(n: &str, at: usize) -> R<Bson> {
    let (neg, body) = n.strip_prefix('-').map(|b| (true, b)).unwrap_or((false, n));
    if let Some(hex) = body.strip_prefix("0x").or_else(|| body.strip_prefix("0X")) {
        return i64::from_str_radix(hex, 16).map(|v| int(if neg { -v } else { v })).or_else(|_| err(format!("{n} is not a number"), at));
    }
    if !body.contains(['.', 'e', 'E']) {
        if let Ok(v) = n.parse::<i64>() {
            return Ok(int(v));
        }
    }
    n.parse::<f64>().map(Bson::Double).or_else(|_| err(format!("{n} is not a number"), at))
}

fn int(v: i64) -> Bson {
    i32::try_from(v).map(Bson::Int32).unwrap_or(Bson::Int64(v))
}

/// ISODate's text: a day (midnight UTC), or a time with or without its zone (UTC when missing), as mongosh reads it
fn date(s: &str) -> Option<DateTime> {
    let s = s.trim();
    let full = if s.len() == 10 {
        format!("{s}T00:00:00Z")
    } else {
        let t = s.replacen(' ', "T", 1);
        let has_zone = t.ends_with('Z') || t.ends_with('z') || t[t.find('T').map(|i| i + 1).unwrap_or(t.len())..].contains(['+', '-']);
        if has_zone {
            t
        } else {
            format!("{t}Z")
        }
    };
    // seconds are optional in mongosh: 2026-10-19T10:00
    let full = if full.len() >= 16 && full.as_bytes().get(16).is_some_and(|b| !b.is_ascii_digit() && *b != b':') { format!("{}:00{}", &full[..16], &full[16..]) } else { full };
    DateTime::parse_rfc3339_str(&full).ok()
}

/// One value: what the Filter, Project and Sort boxes hold. Empty text is None.
pub fn parse_value(src: &str) -> R<Option<Bson>> {
    let mut p = Parser::new(src)?;
    if p.tok == Tok::End {
        return Ok(None);
    }
    let v = p.value()?;
    if p.tok != Tok::End {
        return err(format!("Expected the end after the value, found {}", describe(&p.tok)), p.at);
    }
    Ok(Some(v))
}

/// A box that must hold an object ({ … }) or nothing
pub fn parse_doc(src: &str, what: &str) -> R<Option<Document>> {
    match parse_value(src)? {
        None => Ok(None),
        Some(Bson::Document(d)) => Ok(Some(d)),
        Some(_) => err(format!("{what} must be an object, such as {{ status: \"paid\" }}"), src.len() - src.trim_start().len()),
    }
}

/// One mongosh statement. More than one, or anything that is not a call on db, is an error.
pub fn parse_command(src: &str) -> R<Command> {
    let mut p = Parser::new(src)?;
    match &p.tok {
        Tok::Ident(d) if d == "db" => {}
        Tok::End => return err("Nothing to run", 0),
        Tok::Ident(w) if w == "use" || w == "show" => return err(format!("Capy doesn't run {w}. Pick the database in the query line, and see collections in the sidebar"), p.at),
        t => return err(format!("A query starts with db, as in db.orders.find(), not {}", describe(t)), p.at),
    }
    p.bump()?;
    // db.a.b.find(): the names before the one followed by ( are the collection, dots and all
    let mut names: Vec<String> = vec![];
    let call_name;
    loop {
        if p.is('[') {
            p.bump()?;
            let (t, at) = p.bump()?;
            let Tok::Str(n) = t else { return err("Expected a collection name in quotes inside [ ]", at) };
            p.expect(']', "after the collection name")?;
            names.push(n);
            continue;
        }
        p.expect('.', "after db")?;
        let (t, at) = p.bump()?;
        let Tok::Ident(n) = t else { return err(format!("Expected a name after the dot, found {}", describe(&t)), at) };
        if p.is('(') {
            if n == "getCollection" && names.is_empty() {
                p.bump()?;
                let a = p.args()?;
                let [Bson::String(c)] = a.as_slice() else { return err("getCollection() takes the collection name in quotes", at) };
                names.push(c.clone());
                continue;
            }
            call_name = n;
            break;
        }
        names.push(n);
    }
    p.bump()?;
    let call = Call { name: call_name, args: p.args()? };
    let mut chain = vec![];
    while p.is('.') {
        p.bump()?;
        let (t, at) = p.bump()?;
        let Tok::Ident(n) = t else { return err("Expected a method after the dot", at) };
        p.expect('(', &format!("after {n}"))?;
        chain.push(Call { name: n, args: p.args()? });
    }
    if p.is(';') {
        p.bump()?;
    }
    if p.tok != Tok::End {
        return err("Capy runs one statement at a time. Select the one to run, or remove the rest", p.at);
    }
    Ok(Command { target: if names.is_empty() { Target::Db } else { Target::Coll(names.join(".")) }, call, chain })
}

// ---------- what a statement does, for the write guard ----------

fn kind(k: &str) -> &'static str {
    MONGO_KINDS.iter().copied().find(|x| *x == k).expect("a MONGO_KINDS name")
}

/// The write kind of a collection or db method; None for a read
fn method_kind(m: &str) -> Option<&'static str> {
    Some(kind(match m {
        "insertOne" | "insertMany" | "insert" => "insert",
        "updateOne" | "updateMany" | "replaceOne" | "update" => "update",
        "deleteOne" | "deleteMany" | "remove" => "delete",
        "findOneAndUpdate" | "findOneAndReplace" | "findOneAndDelete" | "findAndModify" => "findAndModify",
        "bulkWrite" => "bulkWrite",
        "drop" | "dropIndex" | "dropIndexes" | "dropDatabase" => "drop",
        "createIndex" | "createIndexes" | "createCollection" | "createView" => "create",
        "renameCollection" => "rename",
        "createUser" | "dropUser" | "updateUser" | "grantRolesToUser" | "revokeRolesFromUser" | "dropAllUsersFromDatabase" | "createRole" | "dropRole" => "users",
        _ => return None,
    }))
}

/// runCommand's command name: Some(kind) writes, Ok(None) reads, Err(()) unknown
fn command_kind(name: &str, cmd: &Document) -> Result<Option<&'static str>, ()> {
    const READS: [&str; 30] = [
        "find", "count", "distinct", "listCollections", "listIndexes", "listDatabases", "collStats", "dbStats", "ping", "hello", "isMaster", "ismaster", "buildInfo", "buildinfo",
        "serverStatus", "connectionStatus", "hostInfo", "getParameter", "getCmdLineOpts", "replSetGetStatus", "currentOp", "top", "validate", "dataSize", "explain", "usersInfo", "rolesInfo",
        "getMore", "killCursors", "profile",
    ];
    if name == "aggregate" {
        return Ok(cmd.get_array("pipeline").ok().filter(|p| writes_out(p)).map(|_| kind("$out/$merge")));
    }
    if READS.contains(&name) {
        // profile with a level changes the profiler; reading it is { profile: -1 }
        return Ok(if name == "profile" && cmd.get("profile").and_then(Bson::as_i32).is_some_and(|l| l >= 0) { Some(kind("create")) } else { None });
    }
    Ok(Some(kind(match name {
        "insert" => "insert",
        "update" => "update",
        "delete" => "delete",
        "findAndModify" | "findandmodify" => "findAndModify",
        "bulkWrite" => "bulkWrite",
        "drop" | "dropDatabase" | "dropIndexes" | "deleteIndexes" => "drop",
        "create" | "createIndexes" => "create",
        "renameCollection" | "collMod" => "rename",
        "createUser" | "dropUser" | "updateUser" | "grantRolesToUser" | "revokeRolesFromUser" | "dropAllUsersFromDatabase" | "createRole" | "dropRole" | "grantPrivilegesToRole" | "revokePrivilegesFromRole" => "users",
        _ => return Err(()),
    })))
}

/// An aggregate that ends in $out or $merge writes
pub fn writes_out(pipeline: &[Bson]) -> bool {
    pipeline.iter().any(|s| s.as_document().is_some_and(|d| d.contains_key("$out") || d.contains_key("$merge")))
}

/// What a statement writes, for the guard: (kind, the method or stage as shown) for each, and whether ypacapy
/// cannot tell (a runCommand it does not know), which asks too.
pub fn kinds(cmd: &Command) -> (Vec<(&'static str, String)>, bool) {
    let m = cmd.call.name.as_str();
    if m == "aggregate" {
        let stages: Vec<Bson> = match cmd.call.args.first() {
            Some(Bson::Array(a)) => a.clone(),
            _ => cmd.call.args.iter().filter(|a| a.as_document().is_some()).cloned().collect(),
        };
        return match stages.iter().filter_map(Bson::as_document).find_map(|d| ["$out", "$merge"].into_iter().find(|k| d.contains_key(*k))) {
            Some(stage) => (vec![(kind("$out/$merge"), stage.to_string())], false),
            None => (vec![], false),
        };
    }
    if matches!(m, "runCommand" | "adminCommand") {
        let Some(Bson::Document(d)) = cmd.call.args.first() else { return (vec![], true) };
        let Some(name) = d.keys().next() else { return (vec![], true) };
        return match command_kind(name, d) {
            Ok(Some(k)) => (vec![(k, name.clone())], false),
            Ok(None) => (vec![], false),
            Err(()) => (vec![], true),
        };
    }
    match method_kind(m) {
        Some(k) => (vec![(k, m.to_string())], false),
        None => (vec![], false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mongodb::bson::doc;

    #[test]
    fn values_as_mongosh_writes_them() {
        let v = parse_value(r#"{ status: { $in: ['paid', "shipped",], }, total: { $gte: 100 }, n: -1.5, big: 5000000000, "a.b": /x\/y/i }"#).unwrap().unwrap();
        let d = v.as_document().unwrap();
        assert_eq!(d.get_document("status").unwrap().get_array("$in").unwrap(), &vec![Bson::String("paid".into()), Bson::String("shipped".into())]);
        assert_eq!(d.get_document("total").unwrap().get("$gte"), Some(&Bson::Int32(100)));
        assert_eq!(d.get("n"), Some(&Bson::Double(-1.5)));
        assert_eq!(d.get("big"), Some(&Bson::Int64(5_000_000_000)));
        assert_eq!(d.get("a.b"), Some(&Bson::RegularExpression(Regex { pattern: "x\\/y".into(), options: "i".into() })));
    }

    #[test]
    fn typed_values() {
        let d = parse_value(r#"{ _id: ObjectId("6553a1f2c9e77b0012ab0f1e"), at: ISODate("2026-10-19"), t: new Date("2026-10-19T10:00:00+07:00"), p: NumberDecimal("12.50"), l: NumberLong(7), u: null }"#).unwrap().unwrap();
        let d = d.as_document().unwrap();
        assert!(matches!(d.get("_id"), Some(Bson::ObjectId(_))));
        assert_eq!(d.get_datetime("at").unwrap().try_to_rfc3339_string().unwrap(), "2026-10-19T00:00:00Z");
        assert_eq!(d.get_datetime("t").unwrap().try_to_rfc3339_string().unwrap(), "2026-10-19T03:00:00Z");
        assert!(matches!(d.get("p"), Some(Bson::Decimal128(_))));
        assert_eq!(d.get("l"), Some(&Bson::Int64(7)));
        assert_eq!(d.get("u"), Some(&Bson::Null));
    }

    #[test]
    fn errors_point_at_the_place() {
        let src = r#"{ status: { $in: ["paid" "shipped"] } }"#;
        let e = parse_value(src).unwrap_err();
        assert_eq!(e.message, "Expected , or ] after \"paid\"");
        assert_eq!(e.line_col(src), (1, 26));
        assert!(parse_value("{ a: someVar }").unwrap_err().message.contains("doesn't run JavaScript"));
        assert!(parse_value("{ a: 1 } { b: 2 }").is_err());
        assert_eq!(parse_value("  ").unwrap(), None);
    }

    #[test]
    fn statements() {
        let c = parse_command("// note\ndb.orders.find({ status: 'paid' }, { items: 0 }).sort({ created_at: -1 }).limit(50);").unwrap();
        assert_eq!(c.target, Target::Coll("orders".into()));
        assert_eq!(c.call.name, "find");
        assert_eq!(c.call.args.len(), 2);
        assert_eq!(c.chain.iter().map(|x| x.name.as_str()).collect::<Vec<_>>(), vec!["sort", "limit"]);
        assert_eq!(parse_command("db.system.profile.find()").unwrap().target, Target::Coll("system.profile".into()));
        assert_eq!(parse_command("db.getCollection('my-coll').find()").unwrap().target, Target::Coll("my-coll".into()));
        assert_eq!(parse_command("db['a b'].find()").unwrap().target, Target::Coll("a b".into()));
        assert_eq!(parse_command("db.runCommand({ ping: 1 })").unwrap().target, Target::Db);
        assert!(parse_command("db.a.find(); db.b.find()").unwrap_err().message.contains("one statement"));
        assert!(parse_command("show dbs").is_err());
        assert!(parse_command("const x = 1").is_err());
    }

    #[test]
    fn guard_kinds() {
        let k = |s: &str| kinds(&parse_command(s).unwrap());
        assert_eq!(k("db.orders.find({})"), (vec![], false));
        assert_eq!(k("db.carts.deleteMany({})"), (vec![("delete", "deleteMany".to_string())], false));
        assert_eq!(k("db.o.aggregate([{ $match: {} }, { $merge: { into: 'x' } }])"), (vec![("$out/$merge", "$merge".to_string())], false));
        assert_eq!(k("db.o.aggregate([{ $match: {} }])"), (vec![], false));
        assert_eq!(k("db.runCommand({ dropDatabase: 1 })"), (vec![("drop", "dropDatabase".to_string())], false));
        assert_eq!(k("db.runCommand({ ping: 1 })"), (vec![], false));
        assert_eq!(k("db.runCommand({ frobnicate: 1 })"), (vec![], true));
        assert_eq!(k("db.runCommand({ aggregate: 'o', pipeline: [{ $out: 'x' }], cursor: {} })").0[0].0, "$out/$merge");
        assert!(command_kind("find", &doc! {}).unwrap().is_none());
    }
}
