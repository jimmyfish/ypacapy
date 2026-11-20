import "./KeyPane.css";
import { useEffect, useMemo } from "react";
import { useCurrent, useStore } from "../store";
import { duration, ttlLeft } from "../lib/time";
import type { KeyTab, ResultSet } from "../types";
import { RunGroup } from "./QueryPane";
import { ResultGrid } from "./ResultGrid";
import { READ_WHOLE, RedisType, redisArg } from "./Sidebar";
import { ChevronLeft, ChevronRight, Copy, Info, RefreshCw, SquareCode, Timer, ico } from "./Icon";

/** what a key's value is made of, by type */
const PARTS: Record<string, [string, string]> = { string: ["Value", "bytes"], hash: ["Fields", "fields"], list: ["Items", "items"], set: ["Members", "members"], zset: ["Members", "members"], stream: ["Entries", "entries"] };

/** JSON text, pretty, coloured as the JSON cells; null when the text is not JSON */
function prettyJson(text: string): string | null {
  const t = text.trim();
  if (!/^[{[]/.test(t)) return null;
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return null;
  }
}

function JsonLine({ line }: { line: string }) {
  const m = /^(\s*)(?:("(?:[^"\\]|\\.)*")(: ))?(.*?)(,?)$/.exec(line);
  if (!m) return <>{line}</>;
  const [, ind, key, colon, val, comma] = m;
  const cls = /^"/.test(val) ? "j-str" : /^(true|false|null|-?\d)/.test(val) ? "j-num" : "j-p";
  return (
    <>
      {ind}
      {key && (
        <>
          <span className="j-key">{key}</span>
          <span className="j-p">{colon}</span>
        </>
      )}
      <span className={cls}>{val}</span>
      {comma && <span className="j-p">{comma}</span>}
    </>
  );
}

/**
 * A Redis key: its type, length and TTL over one page of its value, drawn for its type. The read is the key's
 * O(1) length and one page (HSCAN, LRANGE, SSCAN, ZRANGE, XREVRANGE, or GETRANGE for a string). Refresh and Enter
 * in the pattern read it again; nothing runs on a timer.
 */
export function KeyPane({ tab }: { tab: KeyTab }) {
  const { conn, session } = useCurrent();
  const st = useStore.getState();
  const busy = tab.run.status === "running";
  const d = tab.data;
  const type = d?.type ?? session?.keys?.keys.find((k) => k.key === tab.key)?.type ?? "";
  const set: ResultSet | undefined = useMemo(() => (d && d.columns.length ? { columns: d.columns, rows: d.rows, truncated: false } : undefined), [d]);

  // ⌘R reads the page again
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "r" || useStore.getState().modal) return;
      e.preventDefault();
      void st.readKey(tab.id, { page: tab.page });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!conn || !session) return null;
  const put = (patch: Partial<KeyTab>) => st.updateTab(tab.id, patch);
  // a new pattern or order starts at the first page
  const restart = (patch: Partial<KeyTab>) => {
    put({ ...patch, starts: [""], page: 0 });
    setTimeout(() => void useStore.getState().readKey(tab.id), 0);
  };
  const db = `db${session.database || "0"}`;
  const [part, unit] = PARTS[type] ?? ["Value", ""];
  const len = d?.len ?? null;
  const ttl = d ? d.ttlMs : -1;
  const canMatch = type === "hash" || type === "set";
  const console_ = () => {
    const make = READ_WHOLE[type];
    st.newQueryTab(make ? make(redisArg(tab.key)) + "\n" : `TYPE ${redisArg(tab.key)}\n`, tab.key);
  };
  const copy = () => void navigator.clipboard?.writeText(tab.key).then(() => st.showToast(`Copied ${tab.key}`));

  const n = d?.rows.length ?? 0;
  // where this page sits: an index for lists and sorted sets; HSCAN, SSCAN and streams have no position
  const offset = type === "list" || type === "zset" ? Number(tab.starts[tab.page] || 0) : null;
  const span = offset !== null ? (type === "list" ? `${offset} to ${offset + n - 1}` : `${offset + 1} to ${offset + n}`) : `Page ${tab.page + 1}`;
  const hasNext = tab.starts.length > tab.page + 1;
  const foot = (
    <div className="grid-foot">
      <span>
        {span}
        {len !== null && offset !== null ? ` of ${len.toLocaleString()}` : ""}
      </span>
      <button type="button" className="icon-btn" aria-label={type === "stream" ? "Newer" : "Previous page"} disabled={tab.page === 0 || busy} onClick={() => void st.readKey(tab.id, { page: tab.page - 1 })}>
        <ChevronLeft {...ico} />
      </button>
      <button type="button" className="icon-btn" aria-label={type === "stream" ? "Older" : "Next page"} disabled={!hasNext || busy} onClick={() => void st.readKey(tab.id, { page: tab.page + 1 })}>
        <ChevronRight {...ico} />
      </button>
    </div>
  );
  const lead =
    type === "hash" ? (
      <span className="muted">Fields in HSCAN order</span>
    ) : type === "set" ? (
      <span className="muted">Members in SSCAN order. A set has no order of its own.</span>
    ) : type === "list" ? (
      <span className="muted">Items from the head</span>
    ) : type === "stream" ? (
      <span className="muted">Newest first, read with XREVRANGE</span>
    ) : type === "zset" ? (
      <span className="seg" role="group" aria-label="Order">
        <button type="button" aria-pressed={!tab.ascending} onClick={() => restart({ ascending: false })}>
          Score high to low
        </button>
        <button type="button" aria-pressed={!!tab.ascending} onClick={() => restart({ ascending: true })}>
          Low to high
        </button>
      </span>
    ) : undefined;

  let body;
  if (busy && !d)
    body = (
      <div className="state">
        <div className="empty">
          <span className="spinner" />
          <strong>Reading {tab.key}</strong>
          <span>
            {conn.name}, {db}
          </span>
        </div>
      </div>
    );
  else if (tab.error)
    body = (
      <div className="state">
        <div className="error-box">
          <strong>Could not read {tab.key}</strong>
          <span className="msg">{tab.error}</span>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void st.reconnect(conn.id).then(() => useStore.getState().readKey(tab.id))}>
              Reconnect
            </button>
          </div>
        </div>
      </div>
    );
  else if (d?.type === "none")
    body = (
      <div className="state">
        <div className="error-box">
          <strong>{tab.key} is gone</strong>
          <span className="hint-line">It expired or was deleted after the sidebar read it.</span>
          <pre className="db-says">
            <span className="bad">TYPE {tab.key} → none</span>
          </pre>
          <div className="actions">
            <button type="button" className="btn" onClick={() => st.closeTab(tab.id, true)}>
              Close this tab
            </button>
          </div>
        </div>
      </div>
    );
  else if (d && type === "string") {
    const pretty = d.binary ? null : prettyJson(d.value ?? "");
    const as = pretty ? (tab.as ?? "json") : "text";
    body = (
      <div className="state">
        <div className="res-tools">
          <span className="muted">
            {d.binary ? "Not UTF-8: bytes shown as \\x escapes" : pretty ? "Valid JSON" : "Text"}
            {d.cut ? `, the first ${(1 << 20).toLocaleString()} bytes of ${len?.toLocaleString()}` : ""}
          </span>
          {pretty && (
            <span className="seg" role="group" aria-label="Show the value as">
              <button type="button" aria-pressed={as === "text"} onClick={() => put({ as: "text" })}>
                Text
              </button>
              <button type="button" aria-pressed={as === "json"} onClick={() => put({ as: "json" })}>
                JSON
              </button>
            </span>
          )}
          <span className="res-actions">
            <button type="button" className="icon-btn" title="Copy the value" aria-label="Copy the value" onClick={() => void navigator.clipboard?.writeText(d.value ?? "").then(() => st.showToast("Copied the value"))}>
              <Copy {...ico} />
            </button>
          </span>
        </div>
        {as === "json" && pretty ? (
          <pre className="code docs" tabIndex={0} aria-label={`Value of ${tab.key}, as JSON`}>
            {pretty.split("\n").map((l, i) => (
              <span key={i} className="l">
                <JsonLine line={l} />
              </span>
            ))}
          </pre>
        ) : (
          <pre className="code docs str-val" tabIndex={0} aria-label={`Value of ${tab.key}`}>
            <span className="l">{d.value}</span>
          </pre>
        )}
      </div>
    );
  } else if (d && set && n > 0)
    body = (
      <div className="state">
        <ResultGrid key={`${tab.page}:${tab.pattern}:${tab.ascending}`} set={set} label={`${part} of ${tab.key}`} exportName={tab.key.replace(/[^\w.-]+/g, "_")} lead={lead} foot={foot} />
      </div>
    );
  else if (d && PARTS[type])
    body = (
      <div className="state">
        <div className="empty">
          {canMatch && tab.pattern ? (
            <>
              <strong>
                No {type === "hash" ? "field" : "member"} in {tab.key} matches {tab.pattern}
              </strong>
              {hasNext && <span>{type === "hash" ? "HSCAN" : "SSCAN"} has more to read: the next page may hold some.</span>}
              <button type="button" className="link" onClick={() => restart({ pattern: "" })}>
                Clear the pattern
              </button>
            </>
          ) : tab.page > 0 ? (
            <>
              <strong>Nothing more</strong>
              <button type="button" className="link" onClick={() => void st.readKey(tab.id, { page: 0 })}>
                Back to the first page
              </button>
            </>
          ) : (
            <strong>{tab.key} is empty</strong>
          )}
        </div>
        {hasNext && foot}
      </div>
    );
  else if (d)
    body = (
      <div className="state">
        <div className="empty">
          <strong>ypacapy does not draw a {type} yet</strong>
          <span>Read it in a query tab with the module's own commands.</span>
        </div>
      </div>
    );

  return (
    <div className="work-body">
      <div className="rk-bar" role="group" aria-label="Key">
        <div className="rk-id">
          {type && type !== "none" && <RedisType type={type} />}
          {/* one line; a long key keeps its end in view (the part that tells keys apart) and the middle gives way */}
          <h2 className="rk-name" title={tab.key}>
            {tab.key.length > 32 ? (
              <>
                <span className="rk-head">{tab.key.slice(0, -14)}</span>
                <span className="rk-tail">{tab.key.slice(-14)}</span>
              </>
            ) : (
              <span className="rk-head">{tab.key}</span>
            )}
          </h2>
          <button type="button" className="icon-btn" title="Copy the key name" aria-label="Copy the key name" onClick={copy}>
            <Copy {...ico} />
          </button>
        </div>
        <div className="mq-actions">
          <button type="button" className="btn btn--quiet" title="Info" aria-label="Info" onClick={() => st.openModal({ kind: "keyInfo", connId: conn.id, key: tab.key })}>
            <Info {...ico} />
            <span className="btn-label">Info</span>
          </button>
          <button type="button" className="btn btn--quiet" title="Open a query tab with the command that reads this key" aria-label="Open as a query" onClick={console_}>
            <SquareCode {...ico} />
            <span className="btn-label">Open as a query</span>
          </button>
          <button type="button" className="btn" title="Read this page again  ⌘R" disabled={busy || session.status !== "open"} aria-label="Refresh" onClick={() => void st.readKey(tab.id, { page: tab.page })}>
            <RefreshCw {...ico} />
            <span className="btn-label">Refresh</span>
          </button>
        </div>
        <p className="rk-meta">
          {len !== null && (
            <span>
              {len.toLocaleString()} {len === 1 ? unit.replace(/s$/, "") : unit}
            </span>
          )}
          {d && d.type !== "none" && (
            <span className={ttl >= 0 ? "has-ttl" : undefined} title={ttl >= 0 ? `PTTL said ${ttl.toLocaleString()} ms when this page was read` : "PTTL -1: no TTL set"}>
              <Timer {...ico} />
              <span>{ttl >= 0 ? `Expires in ${ttlLeft(ttl)}` : "No expiry"}</span>
            </span>
          )}
          <span className="rk-db">{db}</span>
        </p>
        {canMatch && (
          <>
            <div className="mq-row">
              <label className="mq-field">
                <span className="mq-k">match</span>
                <input
                  className="mq-in"
                  placeholder="*"
                  spellCheck={false}
                  autoComplete="off"
                  aria-describedby={`rk-h-${tab.id}`}
                  value={tab.pattern}
                  onChange={(e) => put({ pattern: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && restart({})}
                />
              </label>
              <RunGroup busy={busy} disabled={session.status !== "open"} onRun={() => restart({})} kbd="↵" />
            </div>
            <p className="help rk-match-h" id={`rk-h-${tab.id}`}>
              A pattern for {type === "hash" ? "HSCAN" : "SSCAN"}: * any text, ? one character. Enter reads again.
            </p>
          </>
        )}
      </div>
      <section className="response" aria-label={`Value of ${tab.key}`}>
        <nav className="subtabs" aria-label="Key">
          <button type="button" className="subtab" aria-pressed="true">
            {part}
            {len !== null && type !== "string" && <span className="n">{len.toLocaleString()}</span>}
          </button>
          <span className="push meta">
            <span className="dim">{busy ? "reading" : d ? duration(d.ms) : ""}</span>
          </span>
        </nav>
        {body}
      </section>
    </div>
  );
}
