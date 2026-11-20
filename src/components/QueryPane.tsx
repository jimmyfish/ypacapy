import "./QueryPane.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isDirty, useCurrent, useStore } from "../store";
import { ENGINE_LABEL, ENGINE_NAME, formatSql, statementAt } from "../lib/sql";
import { highlightMongo, mongoStatementAt } from "../lib/mongosh";
import { highlightRedis, redisCommandAt } from "../lib/rediscli";
import { docsToSet, shellPretty } from "../lib/bson";
import { duration } from "../lib/time";
import { returnsRows, sourceOf, statements, targetOf, type EditTarget } from "../lib/edit";
import { api, errText } from "../lib/api";
import type { QueryTab, ResultSet, RunOutcome, RunState } from "../types";
import { ResultGrid, type GridEdit } from "./ResultGrid";
import { SqlEditor, type Completer } from "./SqlEditor";
import { useDismiss } from "./useDismiss";
import { Braces, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, LoaderCircle, Play, Table2, WandSparkles, ico, icoC } from "./Icon";
import { DocCards } from "./DocCards";

/** The connection's database and schema pickers, inside the query line's filled field. */
function CtxSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const opts = options.includes(value) || !value ? options : [value, ...options];
  // one choice, e.g. a connection limited to its database: a label, not a menu
  if (value && opts.length <= 1)
    return (
      <span className="ctx-select ctx-fixed" aria-label={label}>
        {value}
      </span>
    );
  return (
    <span className="ctx-select">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="">(none)</option>}
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown {...ico} />
    </span>
  );
}

export function QueryContext() {
  const { conn, session } = useCurrent();
  const st = useStore.getState();
  if (!conn || !session) return null;
  const info = session.info;
  return (
    <div className="ctx">
      <span className={`e e-${conn.engine}`}>{ENGINE_LABEL[conn.engine]}</span>
      <strong>{conn.name}</strong>
      {/* Redis: the connection's own database only; it changes in Edit connection */}
      {conn.engine === "redis" && info && (
        <>
          <span className="sep">/</span>
          <span className="ctx-db" title="The connection's database. Change it in Edit connection.">
            db{session.database || "0"}
          </span>
        </>
      )}
      {conn.engine !== "sqlite" && conn.engine !== "redis" && info && (
        <>
          <span className="sep">/</span>
          <CtxSelect label="Database" value={session.database} options={info.databases} onChange={(v) => void st.setDatabase(v)} />
        </>
      )}
      {conn.engine === "postgres" && info && (
        <>
          <span className="sep">/</span>
          <CtxSelect label="Schema" value={session.schema} options={info.schemas} onChange={(v) => st.setSchema(v)} />
        </>
      )}
    </div>
  );
}

/**
 * Run: a play icon, the label and its shortcut inside the button. While a run is out the button is
 * disabled and a turning loader takes the play icon's place. With `items`, a menu opens from a chevron beside it.
 */
export function RunGroup({ busy, disabled, onRun, kbd, items }: { busy: boolean; disabled?: boolean; onRun: () => void; kbd: string; items?: { label: string; kbd?: string; run: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const run = (
    <button type="button" className="btn btn--primary btn--run" aria-label="Run" aria-busy={busy || undefined} disabled={disabled || busy} title={`Run  ${kbd}`} onClick={onRun}>
      {busy ? <LoaderCircle {...icoC("run-spin")} /> : <Play {...icoC("run-ico")} />}
      <span className="btn-label">Run</span>
      <span className="run-kbd" aria-hidden="true">
        {kbd}
      </span>
    </button>
  );
  if (!items) return run;
  return (
    <div className="joined" ref={ref}>
      {run}
      <button type="button" className="btn btn--primary joined-tail" aria-label="More run options" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
        <ChevronDown {...ico} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Run">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              {it.label}
              {it.kbd && <kbd>{it.kbd}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Started 0.4 s ago", ticking while a run is out (a screen timer; nothing is sent to the database). */
export function Elapsed({ since }: { since?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  return <span>Started {((now - (since ?? now)) / 1000).toFixed(1)}&nbsp;s ago</span>;
}

/** The OK / Error / Running chip and the timing in the results bar. */
export function RunMeta({ run, extra }: { run: RunState; extra?: ReactNode }) {
  const o = run.outcome;
  if (run.status === "running")
    return (
      <span className="push meta">
        <span className="dim">Running</span>
        {extra}
      </span>
    );
  if (!o) return <span className="push meta">{extra}</span>;
  const [cls, text] = o.kind === "done" ? ["ok", "OK"] : o.kind === "error" ? ["fail", o.lost ? "Disconnected" : "Error"] : ["dim", o.kind === "cancelled" && o.timeout ? "Timed out" : "Cancelled"];
  return (
    <span className="push meta">
      <span className={cls}>{text}</span>
      {"ms" in o && <span className="dim">{duration(o.ms)}</span>}
      {o.kind === "done" && o.limit !== null && <span className="dim">limit {o.limit}</span>}
      {extra}
    </span>
  );
}

/** Error states: the database's own words, or a lost connection with Reconnect. */
export function ErrorState({ o, onReconnect, onFix }: { o: Extract<RunOutcome, { kind: "error" }>; onReconnect: () => void; onFix?: (command: string) => void }) {
  if (o.lost)
    return (
      <div className="state">
        <div className="error-box">
          <strong>{o.title}</strong>
          <span className="msg">{o.message}</span>
          {o.hint && <span className="hint-line">{o.hint} Run it again once it is back.</span>}
          <div className="actions">
            <button type="button" className="btn" onClick={onReconnect}>
              Reconnect
            </button>
          </div>
        </div>
      </div>
    );
  const [first, ...rest] = (o.says ?? o.message).split("\n");
  return (
    <div className="state">
      <div className="error-box">
        <strong>{o.title || "The query did not run"}</strong>
        {o.hint && <span className="hint-line">{o.hint}</span>}
        <pre className="db-says">
          <span className="bad">{first}</span>
          {rest.length ? "\n" + rest.join("\n") : ""}
        </pre>
        {/* Redis: the command that reads the key's real type */}
        {o.fix && onFix && (
          <div className="actions">
            <button type="button" className="btn" onClick={() => onFix(o.fix!)}>
              Use {o.fix.split(" ")[0]} and run
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The table a query result can be edited in: the select that gave it, read for its one table, and that
 * table's columns from the catalog (one lookup per run). A string says why it cannot be edited; null: reading.
 */
function useEditTarget(tab: QueryTab, shown: ResultSet | undefined, index: number): EditTarget | string | null {
  const { conn, session } = useCurrent();
  const o = tab.run.outcome;
  const sets = o?.kind === "done" ? o.sets.length : 0;
  const src = (() => {
    if (!conn || !session || !shown) return "";
    if (!tab.run.sql) return "Run the query again to edit its rows.";
    const rowStmts = statements(tab.run.sql).filter(returnsRows);
    if (rowStmts.length !== sets) return "Could not tell which statement gave these rows.";
    const s = sourceOf(rowStmts[index], conn.engine);
    if (typeof s === "string") return s;
    const schema = s.schema ?? (conn.engine === "postgres" ? session.schema || session.info?.defaultSchema || "public" : conn.engine === "mysql" ? session.database : "main");
    return { ...s, schema };
  })();
  const lookup = typeof src === "object" ? `${tab.run.runId}|${src.schema}|${src.table}` : "";
  const [cols, setCols] = useState<{ lookup: string; cols?: Awaited<ReturnType<typeof api.tableInfo>>["columns"]; err?: string } | null>(null);
  useEffect(() => {
    if (!lookup || typeof src !== "object" || !conn || !session) return;
    let live = true;
    api.tableInfo(conn.id, session.database, src.schema, src.table).then(
      (info) => live && setCols({ lookup, cols: info.columns }),
      (e) => live && setCols({ lookup, err: errText(e) }),
    );
    return () => {
      live = false;
    };
  }, [lookup]);
  return useMemo(() => {
    if (typeof src === "string") return src || null;
    if (!conn || !shown || cols?.lookup !== lookup) return null;
    if (cols.err) return `Could not read the columns of ${src.table}: ${cols.err}`;
    return targetOf(conn.engine, src.schema, src.table, src.items, shown, cols.cols ?? []);
  }, [typeof src === "string" ? src : lookup, cols, shown, conn?.engine]);
}

function QueryResults({ tab }: { tab: QueryTab }) {
  const { conn, session } = useCurrent();
  const [sub, setSub] = useState<"results" | "messages">("results");
  const [setIdx, setSetIdx] = useState<number | null>(null);
  const st = useStore.getState();
  const run = tab.run;
  const o = run.outcome;
  const mongo = conn?.engine === "mongo";
  const redis = conn?.engine === "redis";
  // MongoDB: documents become columns and rows here (lib/bson.ts); shown as a table or as mongosh prints them.
  // Redis: a reply as a table, or as redis-cli prints it (raw)
  // MongoDB opens on JSON (documents); Redis and SQL on the table
  const [as, setAs] = useState<"table" | "json" | "raw">(mongo ? "json" : "table");
  const raw = o?.kind === "done" ? o.sets : [];
  const sets = useMemo(() => raw.map((x) => (x.docs ? docsToSet(x.docs, x.truncated) : x)), [raw]);
  const shownIdx = Math.min(setIdx ?? sets.length - 1, sets.length - 1);
  const shown = sets.length ? sets[shownIdx] : undefined;
  // a save replaces a set in place (same run): the picked set stays
  useEffect(() => setSetIdx(null), [run.runId]);
  // Paging, only on a run ypacapy added the row limit to (o.limit): Next is that run again with an offset.
  // Nothing is counted, so the bar says the page number and Next stays on until a page comes back empty.
  const limit = o?.kind === "done" && !redis ? o.limit : null;
  const offset = tab.offset ?? 0;
  const pageRows = shown?.rows.length ?? 0;
  // an empty page: the grid keeps the last page's columns (none come with no rows)
  const emptyPage: ResultSet | undefined = limit !== null && offset > 0 && pageRows === 0 ? { columns: tab.pageCols ?? [], rows: [], truncated: false } : undefined;
  const gridSet = emptyPage ?? shown;
  // the hint: without an order the database may hand back rows in a different order on each run
  const ordered = mongo ? /\.sort\s*\(|\$sort\b/.test(run.sql ?? "") : /\border\s+by\b/i.test(run.sql ?? "");
  const target = useEditTarget(tab, mongo || redis ? undefined : shown, shownIdx);
  // no grid editing on MongoDB documents or Redis replies yet
  const edit: GridEdit | undefined = conn && session && shown && !mongo && !redis ? { target, connId: conn.id, connName: conn.name, database: session.database, key: `${tab.id}:${shownIdx}`, onSaved: (rs) => st.replaceSet(tab.id, shownIdx, rs) } : undefined;
  const asSeg = redis ? (
    <span className="seg" role="group" aria-label="Show the reply as">
      <button type="button" aria-pressed={as === "table"} onClick={() => setAs("table")}>
        Table
      </button>
      <button type="button" aria-pressed={as !== "table"} onClick={() => setAs("raw")}>
        Raw
      </button>
    </span>
  ) : (
    mongo && (
      // JSON first and on the left: the results are documents
      <span className="seg seg--lead" role="group" aria-label="Show documents as">
        <button type="button" aria-pressed={as !== "table"} onClick={() => setAs("json")}>
          <Braces {...ico} />
          JSON
        </button>
        <button type="button" aria-pressed={as === "table"} onClick={() => setAs("table")}>
          <Table2 {...ico} />
          Table
        </button>
      </span>
    )
  );
  // Redis: the reply was nil (the key does not exist)
  const nil = redis && shown?.raw === "(nil)";
  const name = conn?.name ?? "";

  let body: ReactNode;
  if (sub === "messages") {
    const lines = o?.kind === "done" ? [...o.messages, `${duration(o.ms).replace(/ /g, " ")} on ${name} (${o.server})`] : o?.kind === "error" ? (o.says ?? o.message).split("\n") : o?.kind === "cancelled" ? [o.timeout ? "Stopped by the statement timeout" : "Cancelled"] : [];
    body = (
      <div className="state">
        <pre className="code messages" aria-label="Messages">
          {lines.length ? (
            lines.map((l, i) => (
              <span className="l" key={i}>
                {l}
              </span>
            ))
          ) : (
            <span className="l">No messages yet</span>
          )}
        </pre>
      </div>
    );
  } else if (run.status === "running")
    body = (
      <div className="state">
        <div className="empty">
          <span className="spinner" />
          <strong>Running on {name}</strong>
          <Elapsed since={run.startedAt} />
          <button type="button" className="btn" onClick={() => st.cancel(tab.id)}>
            Cancel
          </button>
        </div>
      </div>
    );
  else if (!o)
    body = (
      <div className="state">
        <div className="empty">
          <strong>Run a query to see its rows here</strong>
          <span>{redis ? "⌘↵ runs the command on the cursor's line, ⇧⌘↵ every line in order." : mongo ? "⌘↵ runs the selection or the statement at the cursor." : "⌘↵ runs the selection or the statement at the cursor, ⇧⌘↵ the whole editor."}</span>
        </div>
      </div>
    );
  else if (o.kind === "error")
    body = (
      <ErrorState
        o={o}
        onReconnect={() => conn && void st.reconnect(conn.id).then(() => st.run(tab.id))}
        // Redis WRONGTYPE: the line that failed becomes the command that reads the key's type, and runs
        onFix={(cmd) => {
          const failed = (run.sql ?? "").trim();
          const next = failed && tab.sql.includes(failed) ? tab.sql.replace(failed, cmd) : tab.sql;
          st.updateTab(tab.id, { sql: next });
          void st.run(tab.id, { sql: cmd });
        }}
      />
    );
  else if (o.kind === "cancelled")
    body = (
      <div className="state">
        <div className="empty">
          <strong>{o.timeout ? "Stopped by the statement timeout" : "Cancelled"}</strong>
          <span>
            {redis
              ? "Redis cannot stop a command it started. ypacapy stopped waiting and opens a new connection for the next one."
              : o.timeout
                ? "Settings › Queries sets how long a statement may run."
                : "ypacapy asked the database to stop the statement."}
          </span>
        </div>
      </div>
    );
  // Redis: a write says what it did, with the reply as redis-cli prints it
  else if (o.kind === "done" && redis && !o.lastIsQuery)
    body = (
      <div className="state">
        <div className="empty write-res">
          <CircleCheck {...icoC("ok-ico")} />
          <strong>{[...o.messages].reverse().find((m) => / replied /.test(m)) ?? "Done"}</strong>
          {shown?.raw !== undefined && <pre className="db-says">{shown.raw}</pre>}
        </div>
      </div>
    );
  else if (o.kind === "done" && nil)
    body = (
      <div className="state">
        <div className="empty">
          <strong>(nil)</strong>
          <span>No value: the key does not exist, or it expired.</span>
        </div>
      </div>
    );
  else if (o.kind === "done" && shown && redis && as === "raw")
    body = (
      <div className="state">
        <div className="res-tools">
          {sets.length > 1 ? (
            <div className="seg" role="group" aria-label="Reply">
              {sets.map((_, i) => (
                <button key={i} type="button" aria-pressed={shown === sets[i]} onClick={() => setSetIdx(i)}>
                  Reply {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <span className="muted">As redis-cli prints it</span>
          )}
          {asSeg}
        </div>
        <pre className="code docs raw" tabIndex={0} aria-label={`Reply to ${tab.title}`}>
          {(shown.raw ?? "").split("\n").map((l, i) => {
            const m = /^(\s*\d+[)#] )+/.exec(l);
            return (
              <span key={i} className="l">
                {m && <span className="idx">{m[0]}</span>}
                <span className={/^"/.test(l.slice(m?.[0].length ?? 0)) ? "j-str" : /^\((integer|double)\)/.test(l.slice(m?.[0].length ?? 0)) ? "j-num" : undefined}>{l.slice(m?.[0].length ?? 0)}</span>
              </span>
            );
          })}
        </pre>
      </div>
    );
  // MongoDB: a write says what it changed, with the server's own reply under it
  else if (o.kind === "done" && mongo && o.affected !== null)
    body = (
      <div className="state">
        <div className="empty write-res">
          <CircleCheck {...icoC("ok-ico")} />
          <strong>{o.messages[0] ?? "Done"}</strong>
          {shown?.docs?.[0] !== undefined && <pre className="db-says">{shellPretty(shown.docs[0])}</pre>}
        </div>
      </div>
    );
  else if (o.kind === "done" && shown && mongo && as === "json")
    body = (
      <div className="state">
        <div className="res-tools">
          {asSeg}
          {shown.truncated ? <span className="muted">First {shown.rows.length} documents; the rest were left unread</span> : <span className="muted">{shown.rows.length} documents</span>}
        </div>
        <DocCards docs={shown.docs ?? []} label={`Documents of ${tab.title}`} />
      </div>
    );
  else if (o.kind === "done" && gridSet)
    body = (
      <div className="state">
        <ResultGrid
          set={gridSet}
          edit={edit}
          label={`Results of ${tab.title}`}
          exportName={tab.title}
          lead={
            sets.length > 1 ? (
              <>
                {mongo && asSeg}
                <div className="seg" role="group" aria-label="Result set">
                  {sets.map((_, i) => (
                    <button key={i} type="button" aria-pressed={shown === sets[i]} onClick={() => setSetIdx(i)}>
                      {redis ? "Reply" : "Result"} {i + 1}
                    </button>
                  ))}
                </div>
                {redis && asSeg}
              </>
            ) : gridSet.truncated ? (
              <>
                {mongo && asSeg}
                <span className="muted">First {gridSet.rows.length} rows; the rest were left unread</span>
                {redis && asSeg}
              </>
            ) : (
              asSeg || undefined
            )
          }
        />
      </div>
    );
  else if (o.kind === "done")
    body = (
      <div className="state">
        <div className="empty">
          {o.lastIsQuery ? (
            <>
              <strong>{mongo ? "The query returned no documents" : "The query returned no rows"}</strong>
            </>
          ) : (
            <>
              <strong>Done</strong>
              <span>{o.affected !== null ? `${o.affected} row${o.affected === 1 ? "" : "s"} affected.` : o.messages.join(", ")}</span>
            </>
          )}
        </div>
      </div>
    );

  const n = o?.kind === "done" && run.status !== "running" ? (shown ? shown.rows.length : o.lastIsQuery ? 0 : null) : null;
  return (
    <section className="response" aria-label="Results">
      <nav className="subtabs" aria-label="Results">
        <button type="button" className="subtab" aria-pressed={sub === "results"} onClick={() => setSub("results")}>
          Results{n !== null && <span className="n">{n}</span>}
        </button>
        <button type="button" className="subtab" aria-pressed={sub === "messages"} onClick={() => setSub("messages")}>
          Messages
        </button>
        <RunMeta run={run} />
      </nav>
      {session && body}
      {session && limit !== null && limit > 0 && sub === "results" && run.status !== "running" && (
        <div className="grid-foot q-pager" role="group" aria-label="Pages">
          {!ordered && <span className="pager-hint">{mongo ? "No sort, so documents can shift between pages" : "No order by, so rows can shift between pages"}</span>}
          <span>Page {Math.floor(offset / limit) + 1}</span>
          <button type="button" className="icon-btn" title="Previous page" aria-label="Previous page" disabled={offset === 0} onClick={() => void st.page(tab.id, offset - limit)}>
            <ChevronLeft {...ico} />
          </button>
          <button type="button" className="icon-btn" title="Next page" aria-label="Next page" disabled={pageRows === 0} onClick={() => void st.page(tab.id, offset + limit)}>
            <ChevronRight {...ico} />
          </button>
        </div>
      )}
    </section>
  );
}

export function QueryPane({ tab }: { tab: QueryTab }) {
  const { conn, session } = useCurrent();
  const editor = useRef<HTMLTextAreaElement>(null);
  // autocomplete reads the schema tree and the column cache; it changes only when those do, not per keystroke
  const engine = conn?.engine;
  const { status, schema, info, tree, columns } = session ?? {};
  const complete = useMemo<Completer | undefined>(() => {
    // MongoDB and Redis: no autocomplete (documents and keys declare no columns)
    if (!engine || engine === "mongo" || engine === "redis" || status !== "open" || !schema || !tree || !columns) return undefined;
    return {
      engine,
      schema,
      schemas: info?.schemas.length ? info.schemas : Object.keys(tree),
      tables: (s) => (tree[s]?.state === "loaded" ? tree[s].data?.tables : undefined),
      columns: (s, t) => columns[`${s}.${t}`],
      load: (s, t) => useStore.getState().loadColumns(s, t),
    };
  }, [engine, status, schema, info, tree, columns]);
  // Format goes through insertText, like Tab and the comment toggle, so ⌘Z brings the text back as typed
  const formatEditor = () => {
    const el = editor.current;
    if (!conn || !tab.sql.trim()) return;
    let next: string;
    try {
      next = formatSql(tab.sql, conn.engine);
    } catch (e) {
      st.showToast(`Could not format: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      return;
    }
    if (next === tab.sql) return;
    if (el) {
      el.focus();
      el.select();
      if (document.execCommand("insertText", false, next)) return;
    }
    st.updateTab(tab.id, { sql: next });
  };
  const [ratio, setRatio] = useState(1);
  const st = useStore.getState();
  const busy = tab.run.status === "running";

  const selection = () => {
    const el = editor.current;
    return el && el.selectionEnd > el.selectionStart ? tab.sql.slice(el.selectionStart, el.selectionEnd) : "";
  };
  const runAll = () => void st.run(tab.id);
  // the selection when there is one, else the statement the cursor is in
  const runSel = () => {
    const at = editor.current?.selectionStart ?? tab.sql.length;
    const s = selection().trim() ? selection() : conn?.engine === "mongo" ? mongoStatementAt(tab.sql, at) : conn?.engine === "redis" ? redisCommandAt(tab.sql, at) : statementAt(tab.sql, at);
    if (s.trim()) void st.run(tab.id, { sql: s });
  };

  // ⌘↵ runs the selection or the statement at the cursor, ⇧⌘↵ everything, wherever the focus is in this tab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "Enter" || useStore.getState().modal) return;
      e.preventDefault();
      if (e.shiftKey) runAll();
      else runSel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = e.currentTarget;
    d.setPointerCapture(e.pointerId);
    const body = d.parentElement!.getBoundingClientRect();
    document.body.classList.add("row-resizing");
    const move = (ev: PointerEvent) => {
      const y = ev.clientY - body.top;
      setRatio(Math.max(0.3, Math.min(3, (y / Math.max(1, body.height - y)) * 1.1)));
    };
    const up = () => {
      d.removeEventListener("pointermove", move);
      d.removeEventListener("pointerup", up);
      document.body.classList.remove("row-resizing");
    };
    d.addEventListener("pointermove", move);
    d.addEventListener("pointerup", up);
  };

  const rename = () =>
    st.openModal({
      kind: "prompt",
      title: "Rename query",
      label: "Name",
      initial: tab.title,
      onSubmit: (title) => {
        st.updateTab(tab.id, { title });
        if (tab.savedId) void st.saveTab(tab.id, title);
      },
    });

  const saved = !!tab.savedId && !isDirty(tab);
  if (!session) return null;
  return (
    <div className="work-body">
      <div className="req-pane" style={{ flexGrow: ratio }}>
        <div className="request-line">
          <div className="url-field">
            <QueryContext />
          </div>
          {/* Saved and unchanged, Save reads "Saved" and does nothing; one width either way, so Run stays put */}
          <button
            type="button"
            className="btn btn--save"
            data-saved={saved}
            disabled={saved}
            title={saved ? "No changes since the last save" : "Save  ⌘S"}
            onClick={() => void st.saveTab(tab.id)}
          >
            {saved && <CircleCheck {...icoC("save-ico")} />}
            {saved ? "Saved" : "Save"}
          </button>
          {/* the click does what ⌘↵ does; ⇧⌘↵ runs the whole editor */}
          <RunGroup busy={busy} disabled={session.status !== "open"} onRun={runSel} kbd="⌘↵" />
        </div>
        <div className="req-title">
          <button type="button" className="name" title="Rename" onClick={rename}>
            {tab.title}
          </button>
          <span className="path">{tab.savedId ? `Saved queries${tab.savedFolder ? ` / ${tab.savedFolder}` : ""}` : "Not saved"}</span>
        </div>
        <div className="section">
          <SqlEditor
            ref={editor}
            value={tab.sql}
            onChange={(sql) => st.updateTab(tab.id, { sql })}
            label={`${conn?.engine === "mongo" ? "Query" : conn?.engine === "redis" ? "Command" : "SQL"} editor, ${tab.title}`}
            complete={complete}
            highlight={conn?.engine === "mongo" ? highlightMongo : conn?.engine === "redis" ? highlightRedis : undefined}
            empty={
              conn?.engine === "redis" ? (
                <>
                  <strong>Write a command for Redis</strong>
                  <span>As in redis-cli: HGETALL user:3107. One command per line; # starts a comment.</span>
                </>
              ) : conn?.engine === "mongo" ? (
                <>
                  <strong>Write a query for MongoDB</strong>
                  <span>As in mongosh: db.orders.find({"{ status: 'paid' }"}). A find or aggregate without a limit of its own gets the row limit from Settings.</span>
                </>
              ) : (
                <>
                  <strong>Write SQL for {conn ? ENGINE_NAME[conn.engine] : "the database"}</strong>
                  <span>A select without a limit of its own gets the row limit from Settings.</span>
                </>
              )
            }
            tools={
              conn?.engine === "mongo" || conn?.engine === "redis" ? undefined : (
                <button type="button" className="btn btn--quiet" onClick={formatEditor}>
                  <WandSparkles {...ico} />
                  Format
                </button>
              )
            }
          />
        </div>
      </div>
      <div
        className="divider"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panes"
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") setRatio((r) => Math.max(0.3, r * 0.9));
          if (e.key === "ArrowDown") setRatio((r) => Math.min(3, r * 1.1));
        }}
      />
      <QueryResults tab={tab} />
    </div>
  );
}
