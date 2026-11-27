//! Console history: every statement or command ypacapy sends to a server, told to the window as it happens
//! (`console-entry`), so the bar can show a live log per connection. What the person typed and what the app
//! sends on its own (tree, table reads, lookups, saves, heartbeat, cancel) alike. Nothing is kept here: the
//! window holds the log in memory and drops it on quit.
//!
//! Each Tauri command that reaches a server opens a scope (`scope`) naming the connection, who asked and a
//! short label; the helpers that send (db.rs catalog and raw_rows, the run loop, mongo.rs, redis.rs) call
//! `log(..).send()` with the text as sent and a short outcome. Outside a scope (unit tests, a spawned task
//! that opened none) or before the app is set up, recording does nothing. Only counts are recorded, never
//! result data, and never a password: Redis AUTH is masked before it gets here.

use std::future::Future;
use std::sync::OnceLock;
use std::time::Instant;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

static APP: OnceLock<AppHandle> = OnceLock::new();

/// Set once in setup; until then (and in unit tests) nothing is emitted
pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Who {
    /// a statement the person typed in a query or console tab
    You,
    /// everything else ypacapy sends on its own
    App,
}

impl Who {
    fn as_str(self) -> &'static str {
        match self {
            Who::You => "you",
            Who::App => "app",
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Flag {
    Err,
    /// changed data or structure, and it worked
    Write,
    Ping,
    /// cancelled or timed out
    Cancel,
}

impl Flag {
    fn as_str(self) -> &'static str {
        match self {
            Flag::Err => "err",
            Flag::Write => "write",
            Flag::Ping => "ping",
            Flag::Cancel => "cancel",
        }
    }
}

#[derive(Clone)]
struct Ctx {
    conn: String,
    who: Who,
    what: String,
}

tokio::task_local! {
    static CTX: Ctx;
}

/// Runs `f` with this connection, who and label as the context of everything it sends. Task-locals don't
/// cross `tokio::spawn`: a spawned task opens its own scope.
pub async fn scope<F: Future>(conn: &str, who: Who, what: impl Into<String>, f: F) -> F::Output {
    CTX.scope(Ctx { conn: conn.to_string(), who, what: what.into() }, f).await
}

/// The same connection under another label, sent by the app: opening a connection, or the cancel statement,
/// in the middle of something else. Without a scope it just runs `f`.
pub async fn again<F: Future>(what: &str, f: F) -> F::Output {
    match CTX.try_with(|c| c.clone()) {
        Ok(mut c) => {
            c.who = Who::App;
            c.what = what.to_string();
            CTX.scope(c, f).await
        }
        Err(_) => f.await,
    }
}

/// Something would be recorded: there is a scope and a window to tell. Callers check this before building
/// text that costs anything (binds, mongosh renderings, statement splits).
pub fn on() -> bool {
    APP.get().is_some() && CTX.try_with(|_| ()).is_ok()
}

/// When a statement started, wall clock (for `at`) and monotonic (for `ms`)
#[derive(Clone, Copy, Debug)]
pub struct Started {
    at: i64,
    t: Instant,
}

pub fn start() -> Started {
    Started { at: crate::conns::now_ms(), t: Instant::now() }
}

impl Started {
    /// ms since it started
    pub fn ms(&self) -> f64 {
        self.t.elapsed().as_secs_f64() * 1000.0
    }
}

/// The `console-entry` payload; the frontend codes against these names
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub conn_id: String,
    /// ms since the epoch when the statement started
    pub at: i64,
    /// "you" or "app"
    pub who: &'static str,
    pub what: String,
    pub text: String,
    pub result: String,
    pub ms: f64,
    /// err, write, ping or cancel; absent when none
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flag: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// One entry being put together: `log(&started, text).result("3 rows").flag(Flag::Write).send()`
#[must_use]
pub struct Log {
    started: Started,
    text: String,
    result: String,
    flag: Option<Flag>,
    error: Option<String>,
    /// sent by the app under this label, whatever the scope says
    app_as: Option<String>,
    /// how long it took, when it is recorded after the fact; else the time since `started`
    ms: Option<f64>,
}

pub fn log(started: &Started, text: impl Into<String>) -> Log {
    Log { started: *started, text: text.into(), result: "ok".into(), flag: None, error: None, app_as: None, ms: None }
}

impl Log {
    pub fn result(mut self, r: impl Into<String>) -> Self {
        self.result = r.into();
        self
    }
    pub fn flag(mut self, f: Flag) -> Self {
        self.flag = Some(f);
        self
    }
    pub fn flag_if(mut self, yes: bool, f: Flag) -> Self {
        if yes {
            self.flag = Some(f);
        }
        self
    }
    /// failed: result "error", flag err, the message
    pub fn err(mut self, e: impl Into<String>) -> Self {
        self.result = "error".into();
        self.flag = Some(Flag::Err);
        self.error = Some(e.into());
        self
    }
    /// cancelled, or stopped by the statement timeout
    pub fn cancelled(mut self, timeout: bool) -> Self {
        self.result = if timeout { "timed out".into() } else { "cancelled".into() };
        self.flag = Some(Flag::Cancel);
        self
    }
    /// recorded later than it finished: the duration measured then
    pub fn took(mut self, ms: f64) -> Self {
        self.ms = Some(ms);
        self
    }
    pub fn app_as(mut self, what: impl Into<String>) -> Self {
        self.app_as = Some(what.into());
        self
    }
    /// text, result and flag, for tests
    #[cfg(test)]
    pub fn peek(&self) -> (String, String, Option<Flag>) {
        (self.text.clone(), self.result.clone(), self.flag)
    }
    pub fn send(self) {
        let Some(app) = APP.get() else { return };
        let Ok(ctx) = CTX.try_with(|c| c.clone()) else { return };
        let (who, what) = match self.app_as {
            Some(w) => (Who::App, w),
            None => (ctx.who, ctx.what),
        };
        let e = Entry {
            conn_id: ctx.conn,
            at: self.started.at,
            who: who.as_str(),
            what,
            text: self.text,
            result: self.result,
            ms: self.ms.unwrap_or_else(|| self.started.ms()),
            flag: self.flag.map(Flag::as_str),
            error: self.error,
        };
        let _ = app.emit("console-entry", e);
    }
}

/// "1 row", "20 rows"; any noun with a plain s plural
pub fn count(n: usize, one: &str) -> String {
    format!("{n} {one}{}", if n == 1 { "" } else { "s" })
}

/// A catalog statement with its binds as a trailing comment, the way the console shows it:
/// `select … where n.nspname = $1  -- $1 = 'public'`. PostgreSQL numbers them $n, the others ?n.
pub fn with_binds(sql: &str, binds: &[&str], dollar: bool) -> String {
    if binds.is_empty() {
        return sql.to_string();
    }
    let list: Vec<String> = binds.iter().enumerate().map(|(i, b)| format!("{}{} = '{}'", if dollar { "$" } else { "?" }, i + 1, b.replace('\'', "''"))).collect();
    format!("{sql}  -- {}", list.join(", "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binds_trail_as_a_comment() {
        assert_eq!(with_binds("select 1", &[], true), "select 1");
        assert_eq!(with_binds("select $1, $2", &["a", "it's"], true), "select $1, $2  -- $1 = 'a', $2 = 'it''s'");
        assert_eq!(with_binds("select ?", &["x"], false), "select ?  -- ?1 = 'x'");
    }

    #[tokio::test]
    async fn nothing_is_sent_without_an_app() {
        // no AppHandle in unit tests: recording is a no-op, inside a scope or not
        assert!(!on());
        scope("c1", Who::You, "Console", async {
            assert!(!on());
            log(&start(), "select 1").result("1 row").send();
            again("Cancel", async { log(&start(), "select pg_cancel_backend(1)").send() }).await;
        })
        .await;
    }
}
