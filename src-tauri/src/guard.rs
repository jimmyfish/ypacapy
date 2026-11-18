//! The write guard. Statements are classified from sqlparser's AST (every statement of a run, and
//! statements nested in CTEs, EXPLAIN ANALYZE and the like); when the dialect cannot parse the text,
//! sqlparser's tokenizer splits it at top-level semicolons and the leading keywords decide. Never a
//! regex over the text. Text that cannot even be tokenized counts as unreadable, which asks too.

use std::collections::{BTreeSet, HashMap};
use std::ops::ControlFlow;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use sqlparser::ast::{SetExpr, Statement, Visit, Visitor};
use sqlparser::dialect::{Dialect, MySqlDialect, PostgreSqlDialect, SQLiteDialect};
use sqlparser::keywords::Keyword;
use sqlparser::parser::Parser;
use sqlparser::tokenizer::{Token, Tokenizer};
use tauri::State;

use crate::conns::{Conn, Engine, SecurityLevel};

/// Every statement kind that writes, in What to protect's order. Ask to confirm asks about all of them;
/// passphrase protection about the ones in a connection's What to protect. SELECT never asks.
pub const STATEMENTS: [&str; 10] = ["INSERT", "UPDATE", "DELETE", "REPLACE", "ALTER", "DROP", "TRUNCATE", "CREATE", "GRANT", "REVOKE"];
/// MongoDB has no statements: what it asks about are kinds of write method, in Writes to ask about's order.
/// mongo_shell::kinds maps each method (and each runCommand) to one of these; reads never ask.
pub const MONGO_KINDS: [&str; 10] = ["insert", "update", "delete", "findAndModify", "bulkWrite", "$out/$merge", "drop", "create", "rename", "users"];
const INSERT: usize = 0;
const UPDATE: usize = 1;
const DELETE: usize = 2;
const REPLACE: usize = 3;
const ALTER: usize = 4;
const DROP: usize = 5;
const TRUNCATE: usize = 6;
const CREATE: usize = 7;
const GRANT: usize = 8;
const REVOKE: usize = 9;

#[derive(Debug, Default)]
pub struct Classified {
    /// Indexes into STATEMENTS, in that order.
    pub kinds: BTreeSet<usize>,
    /// Statements in the run.
    pub count: usize,
    /// The text could not be tokenized: nobody can say what it does.
    pub unreadable: bool,
    /// The last statement is a query (rows expected).
    pub last_is_query: bool,
    /// One query, no LIMIT/FETCH/locking clause of its own: the row limit can be added to it.
    pub limitable: bool,
    /// Byte offset where the statement text ends (before a trailing semicolon and comments).
    pub end: usize,
}

impl Classified {
    pub fn names(&self) -> Vec<&'static str> {
        self.kinds.iter().map(|&k| STATEMENTS[k]).collect()
    }
    /// CREATE, ALTER or DROP: the schema tree is stale afterwards.
    pub fn ddl(&self) -> bool {
        [CREATE, ALTER, DROP].iter().any(|k| self.kinds.contains(k))
    }
}

fn dialect(engine: Engine) -> Box<dyn Dialect> {
    match engine {
        Engine::Postgres => Box::new(PostgreSqlDialect {}),
        Engine::Mysql => Box::new(MySqlDialect {}),
        Engine::Sqlite => Box::new(SQLiteDialect {}),
        // MongoDB text never reaches sqlparser (mongo_shell parses it); a dialect only to keep the match whole
        Engine::Mongo => Box::new(sqlparser::dialect::GenericDialect {}),
    }
}

pub fn classify(sql: &str, engine: Engine) -> Classified {
    let d = dialect(engine);
    let mut c = Classified { end: statement_end(sql, &*d), ..Default::default() };
    match Parser::parse_sql(&*d, sql) {
        Ok(stmts) => {
            c.count = stmts.len();
            for s in &stmts {
                classify_stmt(s, &mut c.kinds);
            }
            if let Some(Statement::Query(q)) = stmts.last() {
                c.last_is_query = true;
                let plain_body = matches!(q.body.as_ref(), SetExpr::Select(s) if s.into.is_none()) || matches!(q.body.as_ref(), SetExpr::SetOperation { .. } | SetExpr::Query(_));
                c.limitable = stmts.len() == 1 && plain_body && q.limit_clause.is_none() && q.fetch.is_none() && q.locks.is_empty() && q.for_clause.is_none();
            }
        }
        Err(_) => classify_tokens(sql, &*d, &mut c),
    }
    c
}

fn classify_stmt(s: &Statement, out: &mut BTreeSet<usize>) {
    // EXPLAIN without ANALYZE only plans: the statement under it does not run
    if matches!(s, Statement::Explain { analyze: false, .. } | Statement::ExplainTable { .. }) {
        return;
    }
    struct V<'a>(&'a mut BTreeSet<usize>);
    impl Visitor for V<'_> {
        type Break = ();
        fn pre_visit_statement(&mut self, s: &Statement) -> ControlFlow<()> {
            kind_of(s, self.0);
            ControlFlow::Continue(())
        }
        fn pre_visit_query(&mut self, q: &sqlparser::ast::Query) -> ControlFlow<()> {
            // PostgreSQL's SELECT … INTO new_table creates a table
            if let SetExpr::Select(sel) = q.body.as_ref() {
                if sel.into.is_some() {
                    self.0.insert(CREATE);
                }
            }
            ControlFlow::Continue(())
        }
    }
    let _ = s.visit(&mut V(out));
}

fn kind_of(s: &Statement, out: &mut BTreeSet<usize>) {
    match s {
        Statement::Insert(i) => {
            out.insert(if i.replace_into { REPLACE } else { INSERT });
        }
        Statement::Update { .. } => {
            out.insert(UPDATE);
        }
        Statement::Delete { .. } => {
            out.insert(DELETE);
        }
        Statement::Merge { .. } => {
            out.extend([INSERT, UPDATE, DELETE]);
        }
        Statement::Truncate { .. } => {
            out.insert(TRUNCATE);
        }
        Statement::Grant { .. } | Statement::GrantRole { .. } => {
            out.insert(GRANT);
        }
        Statement::Revoke { .. } | Statement::RevokeRole { .. } => {
            out.insert(REVOKE);
        }
        Statement::Copy { to: false, .. } | Statement::LoadData { .. } => {
            out.insert(INSERT);
        }
        Statement::RenameTable { .. } => {
            out.insert(ALTER);
        }
        _ => {
            // the Create*, Alter* and Drop* families have dozens of AST variants: go by the variant's name
            let dbg = format!("{s:?}");
            let name: String = dbg.chars().take_while(|c| c.is_ascii_alphanumeric()).collect();
            if name.starts_with("Create") {
                out.insert(CREATE);
            } else if name.starts_with("Alter") {
                out.insert(ALTER);
            } else if name.starts_with("Drop") {
                out.insert(DROP);
            }
        }
    }
}

/// The dialect could not parse the text: split it with the tokenizer and read the leading keywords.
fn classify_tokens(sql: &str, d: &dyn Dialect, c: &mut Classified) {
    let Ok(tokens) = Tokenizer::new(d, sql).tokenize() else {
        c.unreadable = true;
        c.count = 1;
        return;
    };
    let mut stmts: Vec<Vec<Token>> = vec![vec![]];
    let mut depth = 0i32;
    for t in tokens {
        match &t {
            Token::Whitespace(_) => continue,
            Token::LParen => depth += 1,
            Token::RParen => depth -= 1,
            Token::SemiColon if depth <= 0 => {
                stmts.push(vec![]);
                continue;
            }
            _ => {}
        }
        stmts.last_mut().unwrap().push(t);
    }
    stmts.retain(|s| !s.is_empty());
    c.count = stmts.len();
    for s in &stmts {
        let words: Vec<Keyword> = s.iter().map(|t| if let Token::Word(w) = t { w.keyword } else { Keyword::NoKeyword }).collect();
        let first = words.iter().find(|k| **k != Keyword::NoKeyword).copied().unwrap_or(Keyword::NoKeyword);
        match first {
            Keyword::INSERT | Keyword::COPY | Keyword::LOAD => {
                c.kinds.insert(INSERT);
            }
            Keyword::UPDATE => {
                c.kinds.insert(UPDATE);
            }
            Keyword::DELETE => {
                c.kinds.insert(DELETE);
            }
            Keyword::REPLACE => {
                c.kinds.insert(REPLACE);
            }
            Keyword::MERGE => {
                c.kinds.extend([INSERT, UPDATE, DELETE]);
            }
            Keyword::ALTER | Keyword::RENAME => {
                c.kinds.insert(ALTER);
            }
            Keyword::DROP => {
                c.kinds.insert(DROP);
            }
            Keyword::TRUNCATE => {
                c.kinds.insert(TRUNCATE);
            }
            Keyword::CREATE => {
                c.kinds.insert(CREATE);
            }
            Keyword::GRANT => {
                c.kinds.insert(GRANT);
            }
            Keyword::REVOKE => {
                c.kinds.insert(REVOKE);
            }
            Keyword::WITH | Keyword::SELECT | Keyword::EXPLAIN | Keyword::VALUES | Keyword::TABLE => {
                // a data-modifying CTE or EXPLAIN ANALYZE of a write still writes
                let explain_only = first == Keyword::EXPLAIN && !words.contains(&Keyword::ANALYZE);
                if !explain_only {
                    for (i, k) in words.iter().enumerate() {
                        let prev = if i > 0 { words[i - 1] } else { Keyword::NoKeyword };
                        match k {
                            Keyword::INSERT => {
                                c.kinds.insert(INSERT);
                            }
                            Keyword::DELETE => {
                                c.kinds.insert(DELETE);
                            }
                            // FOR UPDATE / FOR NO KEY UPDATE lock rows, they do not change them
                            Keyword::UPDATE if !matches!(prev, Keyword::FOR | Keyword::KEY) => {
                                c.kinds.insert(UPDATE);
                            }
                            _ => {}
                        }
                    }
                }
                c.last_is_query = first != Keyword::EXPLAIN;
                continue;
            }
            _ => {}
        }
        c.last_is_query = false;
    }
}

/// Where the statement text ends: before a trailing semicolon and anything after it that is only
/// whitespace or comments. Used to add the row limit after the query, not after a comment.
fn statement_end(sql: &str, d: &dyn Dialect) -> usize {
    let Ok(tokens) = Tokenizer::new(d, sql).tokenize_with_location() else { return sql.trim_end().len() };
    let line_starts: Vec<usize> = std::iter::once(0).chain(sql.match_indices('\n').map(|(i, _)| i + 1)).collect();
    // locations are 1-based lines and 1-based character columns
    let offset = |line: u64, col: u64| -> usize {
        let Some(&start) = line_starts.get(line.saturating_sub(1) as usize) else { return sql.len() };
        sql[start..].char_indices().nth(col.saturating_sub(1) as usize).map(|(i, _)| start + i).unwrap_or(sql.len())
    };
    let significant = |t: &Token| !matches!(t, Token::Whitespace(_) | Token::SemiColon | Token::EOF);
    let Some(last) = tokens.iter().rposition(|t| significant(&t.token)) else { return 0 };
    // tokens are contiguous (whitespace and comments are tokens too): the last one ends where the next starts
    match tokens.get(last + 1) {
        Some(next) if next.token != Token::EOF => offset(next.span.start.line, next.span.start.column),
        _ => sql.len(),
    }
}

// ---------- state ----------

#[derive(Default)]
struct Inner {
    /// Per connection id: after its passphrase or Touch ID, its protected statements run without
    /// asking until then. Unlocking one connection never unlocks another.
    unlocked_until: HashMap<String, Instant>,
    /// What to protect and passphrase protection, opened for changes until Settings or the
    /// connection dialog closes.
    protect_unlocked: bool,
}

#[derive(Default)]
pub struct GuardState(Mutex<Inner>);

impl GuardState {
    pub fn protect_unlocked(&self) -> bool {
        self.0.lock().map(|g| g.protect_unlocked).unwrap_or(false)
    }
    fn unlocked(&self, conn_id: &str) -> bool {
        self.0.lock().ok().and_then(|g| g.unlocked_until.get(conn_id).copied()).is_some_and(|t| Instant::now() < t)
    }
    fn note_unlock(&self, conn_id: &str, secs: u32) {
        if let Ok(mut g) = self.0.lock() {
            if secs > 0 {
                g.unlocked_until.insert(conn_id.to_string(), Instant::now() + Duration::from_secs(secs.into()));
            } else {
                g.unlocked_until.remove(conn_id);
            }
        }
    }
    fn reset(&self) {
        if let Ok(mut g) = self.0.lock() {
            *g = Inner::default();
        }
    }
}

/// What the person gave when ypacapy asked before a guarded run.
#[derive(Deserialize, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Approval {
    Confirm,
    Passphrase { passphrase: String },
    TouchId,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Ask {
    pub kinds: Vec<&'static str>,
    /// MongoDB: the methods the run calls that are asked about (deleteMany, $merge), shown in place of the kinds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ops: Option<Vec<String>>,
    /// low (confirm) or strict (passphrase)
    pub level: SecurityLevel,
    pub touch_id: bool,
    pub unreadable: bool,
    /// a wrong passphrase on the previous try
    pub error: Option<String>,
}

/// Whether a run may go ahead. Ok(None): run. Ok(Some(ask)): ask first, then call again with an approval.
///
/// By the connection's security level, for the statements it asks about (and SQL that cannot be read):
/// None runs; Low asks to confirm; Strict asks for the passphrase, or Touch ID when the connection allows
/// it, and the connection then stays unlocked for its own window. Other statements run.
pub async fn check(c: &Classified, conn: &Conn, approval: Option<Approval>, guard: &GuardState) -> Result<Option<Ask>, String> {
    check_kinds(c.names(), c.unreadable, None, conn, approval, guard).await
}

/// check() for any engine: `writes` are kinds (STATEMENTS, or MONGO_KINDS for MongoDB); `ops` the MongoDB
/// methods behind them, as (kind, method), shown in the ask for the kinds it asks about.
pub async fn check_kinds(writes: Vec<&'static str>, unreadable: bool, ops: Option<Vec<(&'static str, String)>>, conn: &Conn, approval: Option<Approval>, guard: &GuardState) -> Result<Option<Ask>, String> {
    if conn.level == SecurityLevel::None || (writes.is_empty() && !unreadable) {
        return Ok(None);
    }
    let list = conn.protect_list();
    let asked: Vec<&'static str> = writes.iter().copied().filter(|k| list.contains(k)).collect();
    if asked.is_empty() && !unreadable {
        return Ok(None);
    }
    let ops = ops.map(|o| o.into_iter().filter(|(k, _)| asked.contains(k)).map(|(_, m)| m).collect::<Vec<_>>());
    let c = Classified { unreadable, ..Default::default() };
    // Strict without a passphrase (it was disabled meanwhile) asks as Low does
    let strict = conn.level == SecurityLevel::Strict && tokio::task::spawn_blocking(crate::keychain::has_passphrase).await.map_err(|e| e.to_string())??;
    if !strict {
        return Ok(match approval {
            Some(_) => None,
            None => Some(Ask { kinds: asked, ops, level: SecurityLevel::Low, touch_id: false, unreadable: c.unreadable, error: None }),
        });
    }
    let touch = conn.touch_id;
    let window = conn.unlock_window.unwrap_or(0);
    let ask = |error: Option<String>| Ask { kinds: asked.clone(), ops: ops.clone(), level: SecurityLevel::Strict, touch_id: touch, unreadable: c.unreadable, error };
    if guard.unlocked(&conn.id) {
        return Ok(None);
    }
    match approval {
        Some(Approval::Passphrase { passphrase }) => {
            if tokio::task::spawn_blocking(move || crate::keychain::check_passphrase(&passphrase)).await.map_err(|e| e.to_string())?? {
                guard.note_unlock(&conn.id, window);
                Ok(None)
            } else {
                Ok(Some(ask(Some("That passphrase is not right.".into()))))
            }
        }
        Some(Approval::TouchId) if touch => match touchid::authenticate("run a statement that changes data".into()).await {
            Ok(()) => {
                guard.note_unlock(&conn.id, window);
                Ok(None)
            }
            Err(e) => Ok(Some(ask(Some(e)))),
        },
        _ => Ok(Some(ask(None))),
    }
}

/// Lowering a connection from Strict: the passphrase, or Touch ID when that connection allows it.
pub async fn approve_lowering(conn: &Conn, approval: Option<Approval>) -> Result<(), String> {
    match approval {
        Some(Approval::TouchId) if conn.touch_id => touchid::authenticate("lower the security level".into()).await,
        Some(Approval::Passphrase { passphrase }) => verify(passphrase).await,
        _ => Err("Enter the passphrase to lower the security level.".into()),
    }
}

// ---------- commands ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassStatus {
    set: bool,
    touch_id_available: bool,
}

#[tauri::command]
pub async fn passphrase_status() -> Result<PassStatus, String> {
    let set = tokio::task::spawn_blocking(crate::keychain::has_passphrase).await.map_err(|e| e.to_string())??;
    Ok(PassStatus { set, touch_id_available: touchid::available() })
}

async fn verify(passphrase: String) -> Result<(), String> {
    let ok = tokio::task::spawn_blocking(move || crate::keychain::check_passphrase(&passphrase)).await.map_err(|e| e.to_string())??;
    if ok {
        Ok(())
    } else {
        Err("That passphrase is not right.".into())
    }
}

/// Set a passphrase, or change it (then `current` must match).
#[tauri::command]
pub async fn set_passphrase(new: String, current: Option<String>) -> Result<(), String> {
    if new.is_empty() {
        return Err("The passphrase cannot be empty.".into());
    }
    if tokio::task::spawn_blocking(crate::keychain::has_passphrase).await.map_err(|e| e.to_string())?? {
        verify(current.ok_or("Enter the current passphrase.")?).await?;
    }
    tokio::task::spawn_blocking(move || crate::keychain::set_passphrase(&new)).await.map_err(|e| e.to_string())?
}

/// Disable the passphrase: Strict connections become Low.
#[tauri::command]
pub async fn disable_passphrase(current: String, guard: State<'_, GuardState>) -> Result<(), String> {
    verify(current).await?;
    tokio::task::spawn_blocking(crate::keychain::clear_passphrase).await.map_err(|e| e.to_string())??;
    guard.reset();
    crate::conns::strict_to_low()
}

/// Forgot the passphrase: the Mac's owner (Touch ID or the login password) sets a new one. The old one
/// cannot be shown: the keychain holds only its hash. Connections keep their protection; any unlock and
/// open What to protect end, so the new passphrase is asked for from the next protected run.
#[tauri::command]
pub async fn reset_passphrase(new: String, guard: State<'_, GuardState>) -> Result<(), String> {
    if new.is_empty() {
        return Err("The passphrase cannot be empty.".into());
    }
    if !tokio::task::spawn_blocking(crate::keychain::has_passphrase).await.map_err(|e| e.to_string())?? {
        return Err("No passphrase is set. Use Set passphrase.".into());
    }
    touchid::authenticate_owner("reset the ypacapy passphrase".into()).await?;
    tokio::task::spawn_blocking(move || crate::keychain::set_passphrase(&new)).await.map_err(|e| e.to_string())??;
    guard.reset();
    Ok(())
}

/// Opens a Strict connection for lowering changes until lock_protect (the connection dialog closes).
/// Touch ID only when that connection, as saved, allows it.
#[tauri::command]
pub async fn unlock_protect(conn_id: String, passphrase: Option<String>, touch_id: bool, guard: State<'_, GuardState>) -> Result<(), String> {
    let allows_touch = crate::conns::find(&conn_id).map(|c| c.touch_id).unwrap_or(false);
    if touch_id && allows_touch {
        touchid::authenticate("change what the write guard protects".into()).await?;
    } else {
        verify(passphrase.unwrap_or_default()).await?;
    }
    if let Ok(mut g) = guard.0.lock() {
        g.protect_unlocked = true;
    }
    Ok(())
}

#[tauri::command]
pub fn lock_protect(guard: State<'_, GuardState>) {
    if let Ok(mut g) = guard.0.lock() {
        g.protect_unlocked = false;
    }
}

/// Touch ID through LocalAuthentication's LAContext (biometrics only; the passphrase is the fallback).
mod touchid {
    #[cfg(target_os = "macos")]
    pub fn available() -> bool {
        use objc2_local_authentication::{LAContext, LAPolicy};
        let ctx = unsafe { LAContext::new() };
        unsafe { ctx.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics) }.is_ok()
    }

    /// Touch ID only: approving a protected run, opening What to protect.
    #[cfg(target_os = "macos")]
    pub async fn authenticate(reason: String) -> Result<(), String> {
        evaluate(reason, false).await
    }

    /// The Mac's owner: Touch ID, or the login password when Touch ID is missing, off or locked out.
    /// Resetting a forgotten passphrase. No weaker than the passphrase's own keychain item, which the
    /// login password already controls.
    #[cfg(target_os = "macos")]
    pub async fn authenticate_owner(reason: String) -> Result<(), String> {
        evaluate(reason, true).await
    }

    #[cfg(target_os = "macos")]
    async fn evaluate(reason: String, owner: bool) -> Result<(), String> {
        tokio::task::spawn_blocking(move || {
            use block2::RcBlock;
            use objc2::runtime::Bool;
            use objc2_foundation::{NSError, NSString};
            use objc2_local_authentication::{LAContext, LAPolicy};

            let policy = if owner { LAPolicy::DeviceOwnerAuthentication } else { LAPolicy::DeviceOwnerAuthenticationWithBiometrics };
            let what = if owner { "macOS authentication" } else { "Touch ID" };
            let ctx = unsafe { LAContext::new() };
            if let Err(e) = unsafe { ctx.canEvaluatePolicy_error(policy) } {
                return Err(format!("{what} is not available: {}", e.localizedDescription()));
            }
            let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
            let reply = RcBlock::new(move |ok: Bool, err: *mut NSError| {
                let res = if ok.as_bool() {
                    Ok(())
                } else {
                    // SAFETY: LocalAuthentication passes a valid NSError or nil
                    Err(unsafe { err.as_ref() }.map(|e| e.localizedDescription().to_string()).unwrap_or_else(|| format!("{what} did not succeed")))
                };
                let _ = tx.send(res);
            });
            unsafe { ctx.evaluatePolicy_localizedReason_reply(policy, &NSString::from_str(&reason), &reply) };
            // the context must live until the reply arrives
            let res = rx.recv().map_err(|_| format!("{what} was interrupted"))?;
            drop(ctx);
            res
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "macos"))]
    pub fn available() -> bool {
        false
    }

    #[cfg(not(target_os = "macos"))]
    pub async fn authenticate(_: String) -> Result<(), String> {
        Err("Touch ID is only available on macOS".into())
    }

    #[cfg(not(target_os = "macos"))]
    pub async fn authenticate_owner(_: String) -> Result<(), String> {
        Err("macOS authentication is only available on macOS".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kinds(sql: &str, e: Engine) -> Vec<&'static str> {
        classify(sql, e).names()
    }

    #[test]
    fn reads_never_ask() {
        assert!(kinds("select * from orders", Engine::Postgres).is_empty());
        assert!(kinds("select * from orders for update", Engine::Postgres).is_empty());
        assert!(kinds("explain update orders set x = 1", Engine::Postgres).is_empty());
        assert!(kinds("show tables", Engine::Mysql).is_empty());
    }

    #[test]
    fn writes_and_ddl() {
        assert_eq!(kinds("update orders set x = 1; delete from t", Engine::Postgres), vec!["UPDATE", "DELETE"]);
        assert_eq!(kinds("replace into t values (1)", Engine::Mysql), vec!["REPLACE"]);
        assert_eq!(kinds("create index i on t (a); drop table x", Engine::Sqlite), vec!["DROP", "CREATE"]);
        assert_eq!(kinds("truncate orders", Engine::Postgres), vec!["TRUNCATE"]);
        assert_eq!(kinds("grant select on t to bob", Engine::Postgres), vec!["GRANT"]);
        assert_eq!(kinds("alter table t add column c int", Engine::Mysql), vec!["ALTER"]);
        assert_eq!(kinds("explain analyze delete from t", Engine::Postgres), vec!["DELETE"]);
        assert_eq!(kinds("with d as (delete from t returning *) select * from d", Engine::Postgres), vec!["DELETE"]);
        assert_eq!(kinds("select * into t2 from t", Engine::Postgres), vec!["CREATE"]);
    }

    #[test]
    fn strings_and_comments_do_not_count() {
        assert!(kinds("select 'drop table x' -- delete from y", Engine::Postgres).is_empty());
    }

    #[test]
    fn fallback_tokenizer() {
        // not parseable by the dialect, still split and read by the tokenizer
        let c = classify("vacuum full; delete from t where frobnicate @@@ 1", Engine::Postgres);
        assert!(c.names().contains(&"DELETE"));
    }

    #[test]
    fn row_limit_target() {
        let c = classify("select 1 -- note\n; -- trailing", Engine::Postgres);
        assert!(c.limitable);
        assert_eq!(&"select 1 -- note\n; -- trailing"[..c.end], "select 1");
        let c = classify("select * from t limit 5", Engine::Postgres);
        assert!(!c.limitable);
        let c = classify("select 1; select 2", Engine::Postgres);
        assert!(!c.limitable);
        let c = classify("select 'a;b' from t", Engine::Postgres);
        assert_eq!(&"select 'a;b' from t"[..c.end], "select 'a;b' from t");
    }
}
