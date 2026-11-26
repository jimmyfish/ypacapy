import "./TaskManager.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { useStore } from "../store";
import type { Conn, Engine } from "../types";
import { ConnTile } from "./ConnTile";
import { EmptyState } from "./EmptyState";
import { Activity, CircleCheck, CircleStop, LoaderCircle, X, ico } from "./Icon";

/**
 * The Task manager (preview .hallmark/preview/tasks.html): what ypacapy is running, on every open connection, and Stop.
 * Only ypacapy's own runs, read from the tabs' run state: nothing is asked of the server to list them. Stop is the
 * result pane's Cancel (pg_cancel_backend, KILL QUERY; MongoDB and Redis drop the reply).
 *
 * The title strip shows an Activity button while nothing runs (it opens the Task manager), and a chip while anything
 * runs: how many, and how long the oldest has been going. The chip opens a popover of the runs; its Task manager button
 * opens the dialog. ⌥⌘A: the popover while something runs, the dialog when nothing does.
 */

export interface RunItem {
  runId: string;
  tabId: string;
  conn: Conn;
  /** the tab's name: a query's title, a table, a key */
  label: string;
  text: string;
  startedAt: number;
  write: boolean;
}

/** runs Stop was pressed on, until their tab leaves running */
const useStopping = create<{ ids: Record<string, true>; add: (id: string) => void }>()((set) => ({
  ids: {},
  add: (id) => set((s) => ({ ids: { ...s.ids, [id]: true } })),
}));

// a write, roughly, from the first word: only for the tag and the note, never for the guard (that's Rust's)
const stripLead = (t: string) => t.replace(/^(\s+|--[^\n]*(\n|$)|#[^\n]*(\n|$)|\/\*[\s\S]*?\*\/)+/, "");
const SQL_WRITE = /^(insert|update|delete|merge|replace|upsert|alter|drop|create|truncate|rename|grant|revoke|call|copy|vacuum|reindex|cluster|load)\b/i;
const MONGO_WRITE = /\.(insert\w*|update\w*|replace\w*|delete\w*|findOneAnd\w+|bulkWrite|drop\w*|create\w*|renameCollection)\s*\(|\$(out|merge)\b/;
const REDIS_WRITE = /^(set\w*|mset\w*|del|unlink|expire\w*|persist|incr\w*|decr\w*|append|hset\w*|hdel|hincr\w*|[lr]push\w*|[lr]pop|lrem|ltrim|lset|sadd|srem|smove|zadd|zrem\w*|zincrby|xadd|xdel|xtrim|rename\w*|flushdb|flushall|copy|move|restore)\b/i;
function isWrite(engine: Engine, text: string): boolean {
  const t = stripLead(text);
  if (engine === "mongo") return MONGO_WRITE.test(t);
  if (engine === "redis") return REDIS_WRITE.test(t);
  return SQL_WRITE.test(t);
}

/** what Stop does, said while it happens */
function stoppingLine(c: Conn): string {
  if (c.engine === "postgres") return `Asked ${c.name} to stop it, with pg_cancel_backend`;
  if (c.engine === "mysql") return `Asked ${c.name} to stop it, with KILL QUERY`;
  if (c.engine === "sqlite") return "Stopping at the next row";
  return "Stopping it…";
}
/** the one thing worth knowing before Stop, when there is one */
function note(r: RunItem): string | null {
  if (r.conn.engine === "sqlite") return "SQLite stops at the next row it reads.";
  if (!r.write) return null;
  if (r.conn.engine === "postgres" || r.conn.engine === "mysql") return "Stopping rolls back the statement it's on. Statements before it stay done.";
  if (r.conn.engine === "mongo") return "MongoDB may still finish this write after you stop it.";
  return null;
}

/** every tab running on an open connection, oldest first */
export function useRuns(): RunItem[] {
  const sessions = useStore((s) => s.sessions);
  const conns = useStore((s) => s.conns);
  const openIds = useStore((s) => s.openIds);
  return useMemo(() => {
    const out: RunItem[] = [];
    for (const id of openIds) {
      const conn = conns.find((c) => c.id === id);
      const ses = sessions[id];
      if (!conn || !ses) continue;
      for (const t of ses.tabs) {
        if (t.run.status !== "running" || !t.run.runId) continue;
        const label = t.kind === "query" ? t.title : t.kind === "table" ? t.table : t.kind === "key" ? t.key : "Diagram";
        const text = t.run.text ?? (t.kind === "query" ? t.sql : "");
        out.push({ runId: t.run.runId, tabId: t.id, conn, label, text, startedAt: t.run.startedAt ?? Date.now(), write: isWrite(conn.engine, text) });
      }
    }
    return out.sort((a, b) => a.startedAt - b.startedAt);
  }, [sessions, conns, openIds]);
}

/** the clock, every `ms` while `on` */
function useNow(on: boolean, ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return now;
}

/** a run shows in the title strip once it has gone this long, so a quick query doesn't flash the chip */
const SHOW_AFTER_MS = 800;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const stop = (r: RunItem) => {
  useStopping.getState().add(r.runId);
  useStore.getState().cancel(r.tabId);
};
const goTo = (r: RunItem) => {
  const st = useStore.getState();
  void st.openConn(r.conn.id);
  st.setActiveTab(r.tabId);
};

/** the title strip: Activity while nothing runs, the chip and its popover while anything does */
export function RunsChip() {
  const all = useRuns();
  const stopping = useStopping((s) => s.ids);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const now = useNow(all.length > 0, 250);
  const runs = all.filter((r) => now - r.startedAt >= SHOW_AFTER_MS);
  const busy = runs.length > 0;

  // the last run gone while the popover is open: it says so for a moment, then the chip turns back into Activity
  useEffect(() => {
    if (busy || !open) return;
    const t = setTimeout(() => setOpen(false), 1200);
    return () => clearTimeout(t);
  }, [busy, open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  // ⌥⌘A (by its key, since ⌥ changes the letter)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey && e.altKey && e.code === "KeyA")) return;
      const s = useStore.getState();
      if (s.modal && s.modal.kind !== "tasks") return;
      e.preventDefault();
      if (s.modal?.kind === "tasks") s.openModal(null);
      else if (runs.length) setOpen((o) => !o);
      else s.openModal({ kind: "tasks" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runs.length]);

  const openDialog = () => {
    setOpen(false);
    useStore.getState().openModal({ kind: "tasks" });
  };

  if (!busy && !open) {
    return (
      <button type="button" className="icon-btn tm-idle" title="Task manager  ⌥⌘A" aria-label="Task manager: nothing running" onClick={openDialog}>
        <Activity {...ico} />
      </button>
    );
  }

  const conns = new Set(runs.map((r) => r.conn.id)).size;
  const oldest = runs[0];
  return (
    <div className="tm-anchor" ref={ref}>
      <button type="button" className="tm-chip" aria-haspopup="dialog" aria-expanded={open} title="Running queries  ⌥⌘A" onClick={() => setOpen((o) => !o)}>
        <span className="tm-pulse" aria-hidden="true">
          <i />
        </span>
        {runs.length} running
        {oldest && <span className="tm-chip-time">{mmss(now - oldest.startedAt)}</span>}
      </button>
      {open && (
        <div className="tm-pop" role="dialog" aria-label="Running queries">
          <div className="tm-pop-head">
            <p className="upd-title">{runs.length === 1 ? "1 query running" : `${runs.length} queries running`}</p>
            {busy && <span className="upd-sub">On {conns === 1 ? "1 connection" : `${conns} connections`}, from this Mac</span>}
          </div>
          {busy ? (
            <ol className="tm-runs">
              {runs.map((r) => {
                const isStopping = !!stopping[r.runId];
                const n = note(r);
                return (
                  <li key={r.runId} className="tm-run" data-stopping={isStopping || undefined}>
                    <ConnTile conn={r.conn} small typed />
                    <div className="tm-run-main">
                      <button
                        type="button"
                        className="tm-where"
                        title={`Go to ${r.label} on ${r.conn.name}`}
                        onClick={() => {
                          setOpen(false);
                          goTo(r);
                        }}
                      >
                        <strong>{r.conn.name}</strong>
                        <span className="tm-tab">{r.label}</span>
                        {r.write && <span className="tm-tag">write</span>}
                      </button>
                      {r.text && (
                        <code className="tm-sql" title={r.text}>
                          {r.text}
                        </code>
                      )}
                      {isStopping ? (
                        <span className="tm-note tm-note--stop">
                          <LoaderCircle {...ico} className="ico upd-spin" />
                          {stoppingLine(r.conn)}
                        </span>
                      ) : (
                        n && <span className="tm-note">{n}</span>
                      )}
                    </div>
                    <span className="tm-time">{mmss(now - r.startedAt)}</span>
                    <button type="button" className="icon-btn tm-stop" aria-label={`Stop ${r.label} on ${r.conn.name}`} title="Stop" disabled={isStopping} onClick={() => stop(r)}>
                      <CircleStop {...ico} />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="tm-done">
              <CircleCheck {...ico} />
              Nothing running now.
            </p>
          )}
          <div className="tm-pop-foot">
            <button type="button" className="btn btn--quiet" onClick={openDialog}>
              <Activity {...ico} />
              Task manager
            </button>
            <button type="button" className="btn" disabled={!busy} onClick={() => runs.forEach((r) => !stopping[r.runId] && stop(r))}>
              <CircleStop {...ico} />
              Stop all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** the dialog: the same runs as a table */
export function TaskManagerModal({ onClose }: { onClose: () => void }) {
  const runs = useRuns();
  const stopping = useStopping((s) => s.ids);
  const now = useNow(runs.length > 0);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog tm" role="dialog" aria-modal="true" aria-labelledby="tm-h">
        <header className="tm-head">
          <h2 id="tm-h">Task manager</h2>
          {runs.length > 0 && <span className="tm-n">{runs.length}</span>}
          <button type="button" className="icon-btn tm-x" aria-label="Close" title="Close  Esc" onClick={onClose}>
            <X {...ico} />
          </button>
        </header>
        <section className="tm-pane">
          <p className="tm-lede">Queries ypacapy is running right now, on every open connection. Stop asks the server to cancel the statement. Its tab says Cancelled.</p>
          {runs.length > 0 ? (
            <div className="tm-table-wrap">
              <table className="tm-table">
                <colgroup>
                  <col style={{ width: 170 }} />
                  <col style={{ width: 128 }} />
                  <col />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 96 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Connection</th>
                    <th scope="col">Tab</th>
                    <th scope="col">Query</th>
                    <th scope="col" className="num">
                      Running
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Stop</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const isStopping = !!stopping[r.runId];
                    return (
                      <tr key={r.runId} data-gone={isStopping || undefined}>
                        <td>
                          <span className="tm-conn">
                            <ConnTile conn={r.conn} small typed />
                            {r.conn.name}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="tm-link"
                            title={`Go to ${r.label}`}
                            onClick={() => {
                              onClose();
                              goTo(r);
                            }}
                          >
                            {r.label}
                          </button>
                          {r.write && <span className="tm-tag">write</span>}
                        </td>
                        <td className="tm-q">
                          <code title={r.text}>{r.text}</code>
                        </td>
                        <td className="num">
                          <span className="tm-time">{isStopping ? "stopping…" : mmss(now - r.startedAt)}</span>
                        </td>
                        <td className="tm-act">
                          <button type="button" className="btn tm-row-stop" onClick={() => stop(r)}>
                            <CircleStop {...ico} />
                            Stop
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tm-none">
              <EmptyState size="sm" icon={CircleCheck} title="Nothing running" line="Queries show up here while they run." />
            </div>
          )}
        </section>
        {runs.length > 0 && (
          <footer className="tm-foot">
            <button type="button" className="btn" onClick={() => runs.forEach((r) => !stopping[r.runId] && stop(r))}>
              <CircleStop {...ico} />
              Stop all
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
