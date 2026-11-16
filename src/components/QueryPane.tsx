import { useEffect, useRef, useState, type ReactNode } from "react";
import { isDirty, useCurrent, useStore } from "../store";
import { ENGINE_LABEL, ENGINE_NAME, formatSql } from "../lib/sql";
import { duration } from "../lib/time";
import type { QueryTab, RunOutcome, RunState } from "../types";
import { ResultGrid } from "./ResultGrid";
import { SqlEditor } from "./SqlEditor";
import { useDismiss } from "./useDismiss";
import { ChevronDown, CircleCheck, WandSparkles, ico } from "./Icon";

/** The connection's database and schema pickers, inside the query line's filled field. */
function CtxSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const opts = options.includes(value) || !value ? options : [value, ...options];
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
      {conn.engine !== "sqlite" && info && (
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

/** Run, and its menu. */
export function RunGroup({ busy, disabled, onRun, items }: { busy: boolean; disabled?: boolean; onRun: () => void; items: { label: string; kbd?: string; run: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="joined" ref={ref}>
      <button type="button" className="btn btn--primary" aria-busy={busy || undefined} disabled={disabled} onClick={onRun}>
        {busy && <span className="spinner" />}
        Run
      </button>
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
  const [cls, text] = o.kind === "done" ? ["ok", "OK"] : o.kind === "error" ? ["fail", o.lost ? "Disconnected" : "Error"] : ["dim", "Stopped"];
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
export function ErrorState({ o, onReconnect }: { o: Extract<RunOutcome, { kind: "error" }>; onReconnect: () => void }) {
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
      </div>
    </div>
  );
}

function QueryResults({ tab }: { tab: QueryTab }) {
  const { conn, session } = useCurrent();
  const [sub, setSub] = useState<"results" | "messages">("results");
  const [setIdx, setSetIdx] = useState<number | null>(null);
  const st = useStore.getState();
  const run = tab.run;
  const o = run.outcome;
  const sets = o?.kind === "done" ? o.sets : [];
  const shown = sets.length ? sets[Math.min(setIdx ?? sets.length - 1, sets.length - 1)] : undefined;
  useEffect(() => setSetIdx(null), [o]);
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
          <span>⌘↵ runs the whole editor, ⇧⌘↵ only the selection.</span>
        </div>
      </div>
    );
  else if (o.kind === "error") body = <ErrorState o={o} onReconnect={() => conn && void st.reconnect(conn.id).then(() => st.run(tab.id))} />;
  else if (o.kind === "cancelled")
    body = (
      <div className="state">
        <div className="empty">
          <strong>{o.timeout ? "Stopped by the statement timeout" : "Cancelled"}</strong>
          <span>{o.timeout ? "Settings › Queries sets how long a statement may run." : "The database was asked to stop the statement."}</span>
        </div>
      </div>
    );
  else if (o.kind === "done" && shown)
    body = (
      <div className="state">
        <ResultGrid
          set={shown}
          label={`Results of ${tab.title}`}
          exportName={tab.title}
          lead={
            sets.length > 1 ? (
              <div className="seg" role="group" aria-label="Result set">
                {sets.map((_, i) => (
                  <button key={i} type="button" aria-pressed={shown === sets[i]} onClick={() => setSetIdx(i)}>
                    Result {i + 1}
                  </button>
                ))}
              </div>
            ) : shown.truncated ? (
              <span className="muted">First {shown.rows.length} rows; the rest were left unread</span>
            ) : undefined
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
              <strong>The query ran and returned no rows</strong>
              <span>Nothing matched. Widen the conditions and run it again.</span>
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
    </section>
  );
}

export function QueryPane({ tab }: { tab: QueryTab }) {
  const { conn, session } = useCurrent();
  const editor = useRef<HTMLTextAreaElement>(null);
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
  const runSel = () => {
    const s = selection();
    void st.run(tab.id, s.trim() ? { sql: s } : {});
  };
  const explain = () => {
    const s = (selection() || tab.sql).trim();
    if (!s || !conn) return;
    void st.run(tab.id, { sql: `${conn.engine === "sqlite" ? "explain query plan" : "explain"} ${s}` });
  };

  // ⌘↵ runs everything, ⇧⌘↵ the selection, wherever the focus is in this tab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "Enter" || useStore.getState().modal) return;
      e.preventDefault();
      if (e.shiftKey) runSel();
      else runAll();
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
          <RunGroup
            busy={busy}
            disabled={session.status !== "open"}
            onRun={runAll}
            items={[
              { label: "Run all", kbd: "⌘↵", run: runAll },
              { label: "Run selection", kbd: "⇧⌘↵", run: runSel },
              { label: "Explain", run: explain },
            ]}
          />
          <div className="joined">
            <button type="button" className="btn" onClick={() => void st.saveTab(tab.id)} title="Save  ⌘S">
              Save
            </button>
            {saved && (
              <span className="btn joined-tail save-state ok" role="img" aria-label="Saved" title="Saved">
                <CircleCheck {...ico} />
              </span>
            )}
          </div>
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
            label={`SQL editor, ${tab.title}`}
            empty={
              <>
                <strong>Write SQL for {conn ? ENGINE_NAME[conn.engine] : "the database"}</strong>
                <span>A select without a limit of its own gets the row limit from Settings.</span>
              </>
            }
            tools={
              <button type="button" className="btn btn--quiet" onClick={formatEditor}>
                <WandSparkles {...ico} />
                Format
              </button>
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
