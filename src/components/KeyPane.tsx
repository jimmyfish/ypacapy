import "./KeyPane.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrent, useStore } from "../store";
import { duration, ttlLeft } from "../lib/time";
import type { Edits } from "../lib/edit";
import type { KeyTab, ResultSet } from "../types";
import { RunGroup } from "./QueryPane";
import { ResultGrid, type GridEdit } from "./ResultGrid";
import { READ_WHOLE, RedisType, redisArg } from "./Sidebar";
import { Select } from "./Select";
import { useDismiss } from "./useDismiss";
import { SqlEditor } from "./SqlEditor";
import { esc } from "../lib/sql";
import { ChevronLeft, ChevronRight, ChevronsLeft, Copy, Inbox, Info, KeyRound, Pencil, RefreshCw, SearchX, SquareCode, Timer, ico, icoC } from "./Icon";
import { EmptyState, Obj, QueryChip } from "./EmptyState";

/** what a key's value is made of, by type */
const PARTS: Record<string, [string, string]> = { string: ["Value", "bytes"], hash: ["Fields", "fields"], list: ["Items", "items"], set: ["Members", "members"], zset: ["Members", "members"], stream: ["Entries", "entries"] };

/**
 * JSON text, pretty (two spaces); null when the text is not JSON. Reindented token by token, never parsed and
 * printed again, so numbers too big for a double and strings stay exactly as written (Save writes this text).
 */
function prettyJson(text: string): string | null {
  const t = text.trim();
  if (!/^[{[]/.test(t) || !isJson(t)) return null;
  const m = minifyJson(t);
  let out = "";
  let depth = 0;
  const nl = () => "\n" + "  ".repeat(depth);
  for (let i = 0; i < m.length; i++) {
    const ch = m[i];
    if (ch === '"') {
      // a whole string, escapes and all
      let j = i + 1;
      while (j < m.length && m[j] !== '"') j += m[j] === "\\" ? 2 : 1;
      out += m.slice(i, j + 1);
      i = j;
    } else if (ch === "{" || ch === "[") {
      // an empty object or array stays on one line
      if (m[i + 1] === (ch === "{" ? "}" : "]")) {
        out += ch + m[++i];
        continue;
      }
      depth++;
      out += ch + nl();
    } else if (ch === "}" || ch === "]") {
      depth--;
      out += nl() + ch;
    } else if (ch === ",") out += "," + nl();
    else if (ch === ":") out += ": ";
    else out += ch;
  }
  return out;
}

/** JSON text without the whitespace between its tokens; strings and numbers stay exactly as written */
function minifyJson(text: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\") out += text[++i] ?? "";
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
      out += ch;
    } else if (!/\s/.test(ch)) out += ch;
  }
  return out;
}

const isJson = (t: string) => {
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
};

/**
 * The string editor's colouring: JSON keys, strings, numbers and punctuation in the JSON view's colours, one
 * <span class="l"> per line (the caret's line marked). Text that isn't JSON is coloured as far as it reads.
 */
function highlightJson(src: string, cur?: number): string {
  const TOKEN = /("(?:[^"\\\n]|\\.)*"?)(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b)|([{}[\],:])/g;
  const lines: string[] = [""];
  const put = (cls: string, text: string) =>
    text.split("\n").forEach((part, k) => {
      if (k > 0) lines.push("");
      if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
    });
  let at = 0;
  for (const m of src.matchAll(TOKEN)) {
    put("", src.slice(at, m.index));
    if (m[1] !== undefined) {
      // a string followed by a colon is a key
      put(m[2] !== undefined ? "j-key" : "j-str", m[1]);
      if (m[2] !== undefined) {
        put("", m[2].slice(0, -1));
        put("j-p", ":");
      }
    } else if (m[3] !== undefined) put("j-num", m[3]);
    else put("j-p", m[4]);
    at = m.index + m[0].length;
  }
  put("", src.slice(at));
  return lines.map((html, i) => `<span class="l${i === cur ? " cur" : ""}">${html}</span>`).join("");
}

/** plain text, line by line, for a string that isn't JSON */
const highlightPlain = (src: string, cur?: number) =>
  src
    .split("\n")
    .map((l, i) => `<span class="l${i === cur ? " cur" : ""}">${esc(l)}</span>`)
    .join("");

/** a value redis-cli showed with \xHH escapes: its bytes are not UTF-8 text, so editing the text would change them */
const looksBinary = (v: string | null) => v !== null && /\\x[0-9a-f]{2}/i.test(v);

const UNITS: [number, string][] = [
  [1, "seconds"],
  [60, "minutes"],
  [3600, "hours"],
  [86400, "days"],
];

/** The expiry in the key's head: a button whose popover sets it with EXPIRE, or takes it off with PERSIST. */
function KeyTtl({ tab, ttl, disabled }: { tab: KeyTab; ttl: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [none, setNone] = useState(false);
  const [n, setN] = useState("30");
  const [unit, setUnit] = useState(86400);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = useCallback(() => !busy && setOpen(false), [busy]);
  const ref = useDismiss(open, close);
  const show = () => {
    // starts from the TTL the page read, in the largest unit it fills
    if (ttl >= 0) {
      const secs = Math.max(1, Math.round(ttl / 1000));
      const [u] = [...UNITS].reverse().find(([u]) => secs >= u) ?? UNITS[0];
      setUnit(u);
      setN(String(Math.max(1, Math.round(secs / u))));
    } else {
      setUnit(86400);
      setN("30");
    }
    setNone(ttl < 0);
    setErr(null);
    setOpen(true);
  };
  const secs = Number(n) * unit;
  const valid = none || (/^\d+$/.test(n.trim()) && secs > 0);
  const k = redisArg(tab.key);
  const cmd = none ? `PERSIST ${k}` : `EXPIRE ${k} ${valid ? secs : "…"}`;
  const label = none ? "Remove expiry" : "Set expiry";
  const conn = useCurrent().conn;
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    const out = await useStore.getState().writeKey(tab.id, cmd, { help: `It changes when ${tab.key} expires${conn ? `, on ${conn.name}` : ""}.`, label, safe: true });
    setBusy(false);
    if (out === null) setOpen(false);
    else if (out) setErr(out);
  };
  return (
    <span className="menu-anchor rk-ttl-anchor" ref={ref}>
      <button
        type="button"
        className={`rk-ttl-btn${ttl >= 0 ? " has-ttl" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        title={ttl >= 0 ? `PTTL said ${ttl.toLocaleString()} ms when this page was read. Click to change it.` : "PTTL -1: no TTL set. Click to set one."}
        onClick={() => (open ? close() : show())}
      >
        <Timer {...ico} />
        <span>{ttl >= 0 ? `Expires in ${ttlLeft(ttl)}` : "No expiry"}</span>
        <Pencil {...icoC("rk-ttl-pen")} />
      </button>
      {open && (
        <div
          className="upd-pop ttl-pop"
          role="dialog"
          aria-label="Expiry"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
              e.preventDefault();
              void submit();
            }
          }}
        >
          <p className="upd-title">
            Expiry of&nbsp;<code className="ttl-key">{tab.key}</code>
          </p>
          <label className="check">
            <input type="radio" name={`ttl-${tab.id}`} checked={none} onChange={() => setNone(true)} />
            No expiry
          </label>
          <div className="ttl-in">
            <label className="check">
              <input type="radio" name={`ttl-${tab.id}`} checked={!none} onChange={() => setNone(false)} />
              Expires in
            </label>
            <input className="field ttl-n" inputMode="numeric" aria-label="How long" disabled={none} value={n} autoFocus onChange={(e) => setN(e.target.value)} />
            <Select className="field" aria-label="Unit" disabled={none} value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
              {UNITS.map(([u, l]) => (
                <option key={u} value={u}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <p className="upd-sub mono ttl-cmd">{cmd}</p>
          {err && (
            <p className="ttl-err" role="alert">
              {err}
            </p>
          )}
          <div className="ttl-actions">
            <button type="button" className="btn" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" aria-busy={busy || undefined} disabled={!valid || busy} onClick={() => void submit()}>
              {busy && <span className="spinner" />}
              {label}
            </button>
          </div>
        </div>
      )}
    </span>
  );
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
  /** a string being edited: its text, and whether it started as pretty JSON (saved compact again when it was compact) */
  const [draft, setDraft] = useState<{ text: string; pretty: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // Edit puts the caret at the top of the value
  const editor = useRef<HTMLTextAreaElement>(null);
  const editing = draft !== null;
  useEffect(() => {
    if (!editing) return;
    editor.current?.focus();
    editor.current?.setSelectionRange(0, 0);
  }, [editing]);
  // another key, or the key read again by someone else's hand: the edit starts over
  useEffect(() => {
    setDraft(null);
    setSaveErr(null);
  }, [tab.key]);

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
  const open = session.status === "open";
  // a hash's values are edited in the grid: HSET for the changed ones, HDEL for the deleted fields
  const hashEdit: GridEdit | undefined =
    type === "hash" && set
      ? {
          target: { engine: "redis", from: tab.key, cols: [null, "value"], pk: [0] },
          connId: conn.id,
          connName: conn.name,
          database: session.database,
          key: `${tab.id}:0`,
          saveTitle: "Write the changes with HSET and HDEL  ⌘S",
          rowWord: "field",
          noNull: true,
          lockCell: (r) => (looksBinary(set.rows[r][0]) || looksBinary(set.rows[r][1]) ? "This field may hold raw bytes (shown as \\xHH), so edit it in a query tab." : null),
          onSaved: () => {},
          save: (base: ResultSet, e: Edits) => {
            const k = redisArg(tab.key);
            const sets = Object.entries(e.cells).filter(([r, c]) => !e.deleted[Number(r)] && 1 in c);
            const dels = Object.keys(e.deleted).map(Number);
            if (dels.some((r) => looksBinary(base.rows[r][0]))) return Promise.resolve("A deleted field may hold raw bytes (shown as \\xHH). Delete it in a query tab.");
            const lines = [
              ...(sets.length ? [`HSET ${k} ${sets.map(([r, c]) => `${redisArg(base.rows[Number(r)][0] ?? "")} ${redisArg(c[1] ?? "")}`).join(" ")}`] : []),
              ...(dels.length ? [`HDEL ${k} ${dels.map((r) => redisArg(base.rows[r][0] ?? "")).join(" ")}`] : []),
            ];
            const what = [sets.length ? `changes ${sets.length} field${sets.length === 1 ? "" : "s"}` : "", dels.length ? `deletes ${dels.length} field${dels.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ");
            return st.writeKey(tab.id, lines.join("\n"), { help: `It ${what} of ${tab.key}, on ${conn.name}.`, label: "Save" });
          },
        }
      : undefined;
  // a string: Edit opens the value in a text box; Save writes SET … KEEPTTL so the expiry stays
  const canEditStr = !!d && type === "string" && !d.binary && !d.cut && open;
  const startStr = () => {
    if (!d || !canEditStr) return;
    const pretty = (tab.as ?? "json") === "json" ? prettyJson(d.value ?? "") : null;
    setDraft({ text: pretty ?? d.value ?? "", pretty: pretty !== null });
    setSaveErr(null);
  };
  /** what Save writes: pretty JSON goes back compact when the value was compact */
  const strOut = (t: string) => (draft?.pretty && d?.value !== undefined && d.value !== null && minifyJson(d.value) === d.value && isJson(t) ? minifyJson(t) : t);
  const saveStr = async () => {
    if (!draft || saving) return;
    const out = strOut(draft.text);
    // nothing changed: ⌘S does nothing, like the disabled Save
    if (out === d?.value) return;
    setSaving(true);
    setSaveErr(null);
    const err = await st.writeKey(tab.id, `SET ${redisArg(tab.key)} ${redisArg(out)} KEEPTTL`, { help: `It replaces the value of ${tab.key} on ${conn.name}, keeping its expiry.`, label: "Save" });
    setSaving(false);
    if (err === null) {
      setDraft(null);
      st.showToast(`Saved ${tab.key}`);
    } else if (err) setSaveErr(err);
  };
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
      <span className="muted">Fields in HSCAN order. Double-click a value to change it, ⌘⌫ deletes a field.</span>
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
  else if (d && type === "string" && draft) {
    const bytes = new TextEncoder().encode(strOut(draft.text)).length;
    const json = isJson(draft.text);
    const same = strOut(draft.text) === d.value;
    body = (
      <div className="state">
        <div className="res-tools">
          <span className="muted str-check">
            {json ? "Valid JSON" : draft.pretty ? "Not valid JSON any more, saved as text" : "Text"}, {bytes.toLocaleString()} bytes
          </span>
          <div className="edit-bar" role="group" aria-label="Unsaved changes">
            <span className={`edit-n${same ? " edit-n--none" : ""}`}>{same ? "No changes" : "Changed"}</span>
            <button type="button" className="btn btn--primary" aria-busy={saving || undefined} disabled={saving || same} title="Write it with SET … KEEPTTL  ⌘S" onClick={() => void saveStr()}>
              {saving && <span className="spinner" />}
              Save
            </button>
            {/* nothing to drop: the button only leaves the editor */}
            <button type="button" className="btn" disabled={saving} title={same ? "Stop editing  Esc" : "Drop the change  Esc"} onClick={() => (setDraft(null), setSaveErr(null))}>
              {same ? "Cancel" : "Discard"}
            </button>
          </div>
        </div>
        {saveErr && (
          <div className="edit-err" role="alert">
            <div className="edit-err-text">
              <strong>Nothing was saved</strong>
              <span>{saveErr}</span>
            </div>
          </div>
        )}
        <div
          className="rk-edit"
          onKeyDown={(e) => {
            if (e.metaKey && e.key === "s") {
              e.preventDefault();
              e.stopPropagation();
              void saveStr();
            } else if (e.key === "Escape" && !saving) {
              e.preventDefault();
              setDraft(null);
              setSaveErr(null);
            }
          }}
        >
          <SqlEditor ref={editor} value={draft.text} onChange={(text) => setDraft({ ...draft, text })} label={`Value of ${tab.key}`} highlight={draft.pretty ? highlightJson : highlightPlain} />
        </div>
        <p className="help str-note">
          Save writes it with SET … KEEPTTL, so its expiry stays.{draft.pretty && d.value !== null && minifyJson(d.value) === d.value ? " The JSON goes back compact, as it was." : ""}
        </p>
      </div>
    );
  } else if (d && type === "string") {
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
          {canEditStr && (
            <button type="button" className="btn btn--quiet" title="Change the value" onClick={startStr}>
              <Pencil {...ico} />
              Edit
            </button>
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
        <ResultGrid key={`${tab.page}:${tab.pattern}:${tab.ascending}`} set={set} label={`${part} of ${tab.key}`} exportName={tab.key.replace(/[^\w.-]+/g, "_")} lead={lead} foot={foot} edit={open ? hashEdit : undefined} />
      </div>
    );
  else if (d && PARTS[type])
    body = (
      <div className="state">
        {canMatch && tab.pattern ? (
          <EmptyState
            tone="match"
            icon={SearchX}
            title={
              <>
                No {type === "hash" ? "field" : "member"} in <Obj>{tab.key}</Obj> matches <QueryChip q={tab.pattern} label="Clear the pattern" onClear={() => restart({ pattern: "" })} />
              </>
            }
            line={hasNext ? `${type === "hash" ? "HSCAN" : "SSCAN"} has more to read: the next page may hold some.` : undefined}
          />
        ) : tab.page > 0 ? (
          <EmptyState
            tone="empty"
            icon={Inbox}
            title="Nothing more"
            actions={
              <button type="button" className="btn" onClick={() => void st.readKey(tab.id, { page: 0 })}>
                <ChevronsLeft {...ico} />
                Back to the first page
              </button>
            }
          />
        ) : (
          <EmptyState
            tone="empty"
            icon={KeyRound}
            title={
              <>
                <Obj>{tab.key}</Obj> is empty
              </>
            }
          />
        )}
        {hasNext && foot}
      </div>
    );
  else if (d)
    body = (
      <div className="state">
        <div className="empty">
          <strong>Capy can't draw a {type} yet</strong>
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
          {d && d.type !== "none" && <KeyTtl tab={tab} ttl={ttl} disabled={!open || busy} />}
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
