import "./ResultGrid.css";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { save } from "@tauri-apps/plugin-dialog";
import { FORMATS, FORMAT_EXT, boolOf, kindOf, render, tsParts, type Format, type Kind } from "../lib/cells";
import { MONGO_EXT, MONGO_FORMATS, cellValue, renderDocs, shellTokens, type MongoFormat } from "../lib/bson";
import { api, errText } from "../lib/api";
import { NO_EDITS, applied, editCount, editPlan, type EditTarget, type Edits } from "../lib/edit";
import { useStore } from "../store";
import type { Approval, ColMeta, ResultSet, RunOutcome } from "../types";
import { useDismiss } from "./useDismiss";
import { ArrowDown, ArrowUp, ArrowUpDown, Braces, Brackets, CalendarClock, Check, ChevronDown, CircleAlert, CircleDot, Columns3, Copy, Download, Hash, IdCard, KeyRound, Link, ToggleLeft, Type, icoC, ico } from "./Icon";

export interface ColKey {
  primary?: boolean;
  references?: string | null;
}

/** a key of more columns than this is not frozen */
const MAX_PINNED = 4;
/** narrowest a frozen column gets in a small window; below it nothing is frozen */
const MIN_PIN_W = 80;

const TYPE_ICON: Record<Kind, typeof Hash> = { num: Hash, ts: CalendarClock, bool: ToggleLeft, json: Braces, bytes: Type, text: Type, oid: IdCard, doc: Braces, arr: Brackets };

/** MongoDB: a value in mongosh's words, coloured like the JSON cells */
export function ShellText({ s }: { s: string }) {
  return (
    <>
      {shellTokens(s).map((t, i) => (t.c ? <span key={i} className={{ k: "jk", s: "js", n: "jnum", b: "jn", f: "jf", p: "jp" }[t.c]}>{t.t}</span> : t.t))}
    </>
  );
}

type AnyFormat = Format | MongoFormat;

/** JSON on one line, keys, strings and literals coloured (the cell); the inspector shows the text as is. */
function jsonHtml(v: unknown): ReactNode {
  if (v === null) return <span className="jn">null</span>;
  if (typeof v === "string") return <span className="js">{JSON.stringify(v)}</span>;
  if (typeof v !== "object") return <span className="jn">{String(v)}</span>;
  if (Array.isArray(v))
    return (
      <>
        [
        {v.map((x, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {jsonHtml(x)}
          </span>
        ))}
        ]
      </>
    );
  const entries = Object.entries(v as Record<string, unknown>);
  return (
    <>
      {"{ "}
      {entries.map(([k, x], i) => (
        <span key={k}>
          {i > 0 && ", "}
          <span className="jk">{JSON.stringify(k)}</span>: {jsonHtml(x)}
        </span>
      ))}
      {entries.length ? " }" : "}"}
    </>
  );
}

function Cell({ v, kind, sel, ci, edited, editor, pin, missing }: { v: string | null; kind: Kind; sel: boolean; ci: number; edited: boolean; editor?: ReactNode; pin?: string; missing?: boolean }) {
  const s = (sel ? " cell-sel" : "") + (edited ? " cell-edit" : "") + (pin ? ` ${pin}` : "");
  // MongoDB: the document has no such field. Not null: no pill, a faint hatch, and the inspector says so.
  if (missing)
    return (
      <td className={`missing${s}`} data-c={ci}>
        <span className="visually-hidden">missing</span>
      </td>
    );
  if (editor)
    return (
      <td className={`cell-editing${kind === "num" ? " num" : ""}${pin ? ` ${pin}` : ""}`} data-c={ci}>
        {editor}
      </td>
    );
  if (v === null)
    return (
      <td className={`null${kind === "num" ? " num" : ""}${s}`} data-c={ci}>
        <span className="null-pill">null</span>
      </td>
    );
  if (kind === "num")
    return (
      <td className={`num${s}`} data-c={ci}>
        {v}
      </td>
    );
  if (kind === "oid")
    return (
      <td className={`oid${s}`} data-c={ci}>
        {v}
      </td>
    );
  if (kind === "doc" || kind === "arr")
    return (
      <td className={`json${s}`} data-c={ci}>
        <ShellText s={v} />
      </td>
    );
  if (kind === "bool") {
    const b = boolOf(v);
    if (b !== null)
      return (
        <td className={`bool${s}`} data-c={ci}>
          {/* both as words: an icon for one and a word for the other read as two kinds of value */}
          <span className={b ? "yes" : "no"}>{b ? "True" : "False"}</span>
        </td>
      );
  }
  if (kind === "ts") {
    const p = tsParts(v);
    if (p)
      return (
        <td className={`ts${s}`} data-c={ci}>
          {p.d && <span className="d">{p.d}</span>}
          {p.d && p.t ? " " : ""}
          {p.t && <span className="t">{p.t}</span>}
          {p.tz && <span className="tz">{p.tz}</span>}
        </td>
      );
  }
  if (kind === "json") {
    try {
      return (
        <td className={`json${s}`} data-c={ci}>
          {jsonHtml(JSON.parse(v))}
        </td>
      );
    } catch {
      /* not JSON after all: plain text */
    }
  }
  const nl = v.indexOf("\n");
  if (nl >= 0) {
    const more = v.split("\n").length - 1;
    return (
      <td className={`long${s}`} data-c={ci}>
        <span className="first">{v.slice(0, nl)}</span>
        <span className="more">
          +{more} line{more > 1 ? "s" : ""}
        </span>
      </td>
    );
  }
  return (
    <td className={s.trim() || undefined} data-c={ci}>
      {v}
    </td>
  );
}

const GridRow = memo(function GridRow({
  row,
  n,
  kinds,
  selCol,
  changed,
  deleted,
  editCol,
  editor,
  view,
  pins,
  missing,
  failed,
}: {
  row: (string | null)[];
  /** MongoDB: the cells whose document has no such field */
  missing?: boolean[];
  n: number;
  kinds: Kind[];
  /** the columns in the order they are drawn: indexes into row */
  view: number[];
  /** the frozen columns' classes, by column */
  pins: Record<number, string>;
  selCol: number;
  /** values edited and not yet saved, by column */
  changed?: Record<number, string | null>;
  deleted?: boolean;
  editCol: number;
  editor?: ReactNode;
  /** the last save stopped at this row's statement */
  failed?: boolean;
}) {
  const cls = [deleted ? "row-del" : changed ? "row-edit" : "", failed ? "row-fail" : ""].join(" ").trim();
  return (
    <tr aria-selected={selCol >= 0 ? true : undefined} data-n={n} className={cls || undefined}>
      {view.map((i) => {
        const ed = !!changed && i in changed;
        return <Cell key={i} v={ed ? changed![i] : row[i]} kind={kinds[i]} sel={i === selCol} ci={i} edited={ed} editor={i === editCol ? editor : undefined} pin={pins[i]} missing={missing?.[i]} />;
      })}
    </tr>
  );
});

/** The textbox over a cell being edited. Enter or leaving it keeps the text, Tab moves on, Esc puts the value back. */
function CellEditor({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: (keep: boolean, move?: number, blurred?: boolean) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
  }, []);
  return (
    <textarea
      ref={ref}
      className="cell-input"
      rows={1}
      spellCheck={false}
      autoComplete="off"
      aria-label="Cell value"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.metaKey && e.key === "s") return;
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onDone(false);
        } else if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          onDone(true);
        } else if (e.key === "Tab") {
          e.preventDefault();
          onDone(true, e.shiftKey ? -1 : 1);
        }
      }}
      onBlur={() => onDone(true, undefined, true)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    />
  );
}

/**
 * Editing an enum cell: the box filters the type's labels (prefix matches first, then the rest that contain the
 * text, each in declared order) and the list under the cell picks one. Arrows move, Enter or a click sets, Tab
 * sets and moves on, Esc or leaving keeps the old value. Only a label can be set, so a typo never reaches the
 * server. The current value has the check.
 */
function EnumEditor({ value, orig, typed, values, type, onDone }: { value: string; orig: string | null; typed: boolean; values: string[]; type: string; onDone: (keep: boolean, move?: number, blurred?: boolean, pick?: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(value);
  const [q, setQ] = useState(typed ? value : "");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return values;
    const starts = values.filter((v) => v.toLowerCase().startsWith(s));
    return [...starts, ...values.filter((v) => !starts.includes(v) && v.toLowerCase().includes(s))];
  }, [q, values]);
  const [at, setAt] = useState(() => (typed ? 0 : Math.max(0, values.indexOf(orig ?? ""))));
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus();
    if (typed) t.setSelectionRange(t.value.length, t.value.length);
    else t.select();
  }, []);
  // the list sits under the cell (above it near the window's bottom), fixed, so the grid's overflow doesn't cut it
  useLayoutEffect(() => {
    const place = () => {
      const td = ref.current?.closest("td");
      const m = list.current?.parentElement;
      if (!td || !m) return;
      const r = td.getBoundingClientRect();
      const h = m.offsetHeight;
      const w = m.offsetWidth;
      setPos({ left: Math.max(8, Math.min(r.left, innerWidth - w - 8)), top: r.bottom + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4 });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [shown.length]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${at}"]`)?.scrollIntoView({ block: "nearest" });
  }, [at, shown]);
  const pick = (v: string | undefined, move?: number) => (v === undefined ? onDone(false) : onDone(true, move, undefined, v));
  return (
    <>
      <input
        ref={ref}
        className="cell-input enum-input"
        role="combobox"
        aria-expanded="true"
        aria-controls="enum-list"
        aria-label={`Cell value, one of ${type}`}
        spellCheck={false}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setQ(e.target.value);
          setAt(0);
        }}
        onKeyDown={(e) => {
          if (e.metaKey && e.key === "s") return;
          e.stopPropagation();
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setAt((i) => Math.max(0, Math.min(shown.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(shown[at]);
          } else if (e.key === "Tab") {
            e.preventDefault();
            pick(shown[at] ?? orig ?? undefined, e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onDone(false);
          }
        }}
        onBlur={() => onDone(false, undefined, true)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      />
      <ChevronDown {...icoC("enum-chev")} />
      {createPortal(
        <div className="menu enum-menu" style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}>
          <div className="enum-head">
            <b>{type}</b>
            <span className="enum-count">{q.trim() ? `${shown.length} of ${values.length}` : `${values.length} values`}</span>
          </div>
          <div className="enum-list" id="enum-list" role="listbox" aria-label={`Values of ${type}`} ref={list}>
            {shown.map((v, i) => (
              <button
                key={v}
                type="button"
                role="option"
                tabIndex={-1}
                data-i={i}
                className="enum-item"
                aria-selected={i === at}
                aria-current={v === orig || undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(v);
                }}
              >
                <Check {...icoC("enum-cur")} />
                <span className="enum-name">{v}</span>
              </button>
            ))}
          </div>
          {!shown.length && <p className="enum-none">No value of {type} has that</p>}
        </div>,
        document.body,
      )}
    </>
  );
}

export interface MenuItem {
  label: string;
  kbd?: string;
  disabled?: boolean;
  run: () => void;
}

/** A small menu next to the results: columns to jump to, copy and export formats. */
function MenuButton({ label, title, icon, children }: { label: string; title: string; icon: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="icon-btn" title={title} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {icon}
      </button>
      {open && children(() => setOpen(false))}
    </div>
  );
}

/** A result cell's right-click menu: copy its value, or its row in the Copy button's formats. Opens at the pointer. */
function CellMenu({ x, y, isNull, items, formats, onValue, onRow, onClose }: { x: number; y: number; isNull: boolean; items: MenuItem[]; formats: readonly AnyFormat[]; onValue: () => void; onRow: (f: AnyFormat) => void; onClose: () => void }) {
  const ref = useDismiss(true, onClose);
  const [pos, setPos] = useState({ left: x, top: y });
  // kept inside the window: flips up or left near an edge
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = m.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(x, innerWidth - r.width - 8)), top: y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y });
    m.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [x, y, ref]);
  // a scroll or resize moves the cell away from the menu
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [onClose]);
  return createPortal(
    <div className="menu ctx-menu" role="menu" aria-label="Cell" ref={ref} style={pos} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it) => (
        <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={it.run}>
          {it.label}
          {it.kbd && <kbd>{it.kbd}</kbd>}
        </button>
      ))}
      {items.length > 0 && <hr />}
      <button type="button" role="menuitem" disabled={isNull} onClick={onValue}>
        Copy value<kbd>⌘C</kbd>
      </button>
      <hr />
      <p className="menu-note">Copy row as</p>
      {formats.map((f) => (
        <button key={f} type="button" role="menuitem" onClick={() => onRow(f)}>
          {f}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/** Where the grid's edits go, and what to do once they are saved. */
export interface GridEdit {
  /** the table behind the rows; a string says why they cannot be edited; null while the table is being read */
  target: EditTarget | string | null;
  connId: string;
  connName: string;
  database: string;
  /** the store key the unsaved edits are kept under */
  key: string;
  /** the rows as they are after a save */
  onSaved: (set: ResultSet) => void;
  /**
   * writes the changes itself instead of the SQL transaction (a Redis hash's HSET and HDEL). Resolves to the error
   * to show, null when they were written, undefined when the write guard's ask was cancelled.
   */
  save?: (base: ResultSet, edits: Edits) => Promise<string | null | undefined>;
  /** why a cell cannot be edited (beyond the target's columns), or null */
  lockCell?: (r: number, c: number) => string | null;
  /** the Save button's tooltip */
  saveTitle?: string;
  /** what a row is called in the right-click menu (a hash's "field"); and whether its values can be NULL */
  rowWord?: string;
  noNull?: boolean;
}

type SaveError = Extract<RunOutcome, { kind: "error" }>;

/**
 * The result grid: values read by their column type, a cell is the unit (click or arrow keys), the inspector
 * under the grid holds the selected cell's full value. A head sorts the rows already on screen (no new query),
 * unless the caller takes the click (onOrderBy: a table tab reads its rows again with order by). There is no
 * row-number column: a number beside the rows read as a value (beside id, as the id); the inspector says which
 * row. When the rows come from one table with its primary
 * key, a double-click (or Enter, or typing) edits a cell; changes stay on screen (green, deleted rows red)
 * until Save (⌘S) writes them in one transaction, or Revert drops them.
 */
/**
 * Copy and Export for MongoDB documents shown without the grid (the JSON view): the grid's two menus, in MongoDB's
 * formats, for every document on the page.
 */
export function DocsActions({ set, exportName }: { set: ResultSet; exportName: string }) {
  const showToast = useStore((s) => s.showToast);
  const text = (f: MongoFormat) => ((f === "mongosh" || f === "Extended JSON") && set.docs ? renderDocs(f, set.docs) : render(f as Format, set.columns, set.rows));
  const n = `${set.rows.length} document${set.rows.length === 1 ? "" : "s"}`;
  const run = async (what: "Copy" | "Export", f: MongoFormat) => {
    if (what === "Copy")
      return navigator.clipboard?.writeText(text(f)).then(
        () => showToast(`Copied ${n} as ${f}`),
        (e) => showToast(errText(e)),
      );
    const path = await save({ defaultPath: `${exportName}.${MONGO_EXT[f]}`, title: `Export documents as ${f}` }).catch(() => null);
    if (!path) return;
    try {
      await api.writeTextFile(path, text(f));
      showToast(`Exported ${n}`);
    } catch (e) {
      showToast(errText(e));
    }
  };
  return (
    <div className="res-actions">
      {(["Copy", "Export"] as const).map((what) => (
        <MenuButton key={what} label={`${what} documents`} title={what} icon={what === "Copy" ? <Copy {...ico} /> : <Download {...ico} />}>
          {(close) => (
            <div className="menu" role="menu" aria-label={`${what} as`}>
              <p className="menu-note">{what} as</p>
              {MONGO_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    void run(what, f);
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </MenuButton>
      ))}
    </div>
  );
}

/**
 * pager: before Columns, Copy and Export (paging | actions). trail: after them, at the toolbar's right end.
 * toolsIn: the toolbar's place when the caller keeps it elsewhere (the Results or Rows line, so the toolbar and the
 * subtabs are one line); null while that place is not mounted yet.
 */
export function ResultGrid({ set, keys, label, exportName, lead, pager, trail, foot, edit, orderBy, onOrderBy, toolsIn }: { set: ResultSet; keys?: Record<string, ColKey>; label: string; exportName: string; lead?: ReactNode; pager?: ReactNode; trail?: ReactNode; foot?: ReactNode; edit?: GridEdit; orderBy?: { col: string; desc?: boolean }; onOrderBy?: (col: string) => void; toolsIn?: HTMLElement | null }) {
  const kinds = useMemo(() => set.columns.map((c) => kindOf(c.type)), [set]);
  const target = edit && edit.target && typeof edit.target === "object" ? edit.target : null;

  // The primary key's columns, in SELECT order, are drawn first and stay on screen while the rest scrolls.
  // Only the drawing order changes: a column keeps its index everywhere else (selection, edits, copy, export).
  // No known key (a join, a group by, a table without one, the key not selected): nothing is frozen.
  const pk = useMemo(() => set.columns.map((c, i) => (keys?.[c.name]?.primary || target?.pk.includes(i) ? i : -1)).filter((i) => i >= 0), [set.columns, keys, target]);
  const view = useMemo(() => [...pk, ...set.columns.map((_, i) => i).filter((i) => !pk.includes(i))], [set.columns, pk]);
  const pins = useMemo(() => {
    const m: Record<number, string> = {};
    if (pk.length <= MAX_PINNED) pk.forEach((c, k) => (m[c] = `pin-${k}${k === pk.length - 1 ? " pin-last" : ""}`));
    return m;
  }, [pk]);

  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(() => (set.rows.length && set.columns.length ? { r: 0, c: view[0] } : null));
  const [ctx, setCtx] = useState<{ x: number; y: number; r: number; c: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const showToast = useStore((s) => s.showToast);

  // ---- editing ----
  const edits = useStore((s) => (edit ? s.edits[edit.key] : undefined)) ?? NO_EDITS;
  const pending = editCount(edits);
  /** r: index into set.rows */
  const [editing, setEditing] = useState<{ r: number; c: number; draft: string; orig: string | null } | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const [saving, setSaving] = useState(false);
  /** the last save's error; row: the row (index into set.rows) whose statement failed, when the error names one */
  const [saveErr, setSaveErr] = useState<{ err: SaveError; row: number | null } | null>(null);
  const [failOpen, setFailOpen] = useState(false);
  const failWith = (err: SaveError, row: number | null = null) => {
    setFailOpen(false);
    setSaveErr({ err, row });
  };

  // display order: indexes into set.rows
  const order = useMemo(() => {
    const idx = set.rows.map((_, i) => i);
    if (!sort || onOrderBy) return idx;
    const { col, dir } = sort;
    const num = kinds[col] === "num";
    const key = (i: number) => {
      const v = set.rows[i][col];
      if (v === null || set.missing?.[i]?.[col]) return null;
      if (num) {
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
      }
      return v;
    };
    return idx.sort((a, b) => {
      const p = key(a);
      const q = key(b);
      if (p === null) return q === null ? 0 : 1;
      if (q === null) return -1;
      const r = typeof p === "number" && typeof q === "number" ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true });
      return r * dir;
    });
  }, [set, sort, kinds, onOrderBy]);

  // a new result (other columns) starts over; the same one after a save keeps its sort and place
  useEffect(() => {
    setSort(null);
    setSel(set.rows.length && set.columns.length ? { r: 0, c: view[0] } : null);
  }, [set.columns]);
  useEffect(() => {
    setEditing(null);
    setSaveErr(null);
    setSel((s) => (s && set.rows.length ? { r: Math.min(s.r, set.rows.length - 1), c: s.c } : null));
  }, [set]);
  // every change dropped one by one: nothing is left to fail
  useEffect(() => {
    if (!pending) setSaveErr(null);
  }, [pending]);

  // keep the selected cell in view
  useEffect(() => {
    if (!sel || !wrap.current) return;
    const td = wrap.current.querySelector(`tbody tr:nth-child(${sel.r + 1}) td[data-c="${sel.c}"]`);
    (td as HTMLElement | null)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  /** a cell's value as shown: the edit if there is one */
  const cur = (r: number, c: number): string | null | undefined => {
    const e = edits.cells[r];
    if (e && c in e) return e[c];
    // MongoDB: the value itself, in mongosh across lines; a missing field has none
    if (set.docs) return cellValue(set, r, c);
    return set.rows[r]?.[c];
  };
  const value = sel ? cur(order[sel.r], sel.c) : undefined;
  const missingAt = (r: number, c: number) => !!set.missing?.[r]?.[c];
  const selMissing = sel ? missingAt(order[sel.r], sel.c) : false;
  const formats: readonly AnyFormat[] = set.docs ? MONGO_FORMATS : FORMATS;
  /** rows (indexes into set.rows) in a copy or export format; MongoDB's own two come from the documents */
  const renderAny = (f: AnyFormat, idx: number[]) =>
    (f === "mongosh" || f === "Extended JSON") && set.docs ? renderDocs(f, idx.map((i) => set.docs![i])) : render(f as Format, set.columns, idx.map((i) => set.rows[i]));
  const copyText = (text: string, what: string) =>
    navigator.clipboard?.writeText(text).then(
      () => showToast(`Copied ${what}`),
      (e) => showToast(errText(e)),
    );

  const putEdits = (e: Edits) => edit && useStore.getState().setEdits(edit.key, e);
  const latest = () => (edit ? useStore.getState().edits[edit.key] : undefined) ?? NO_EDITS;
  /** why a cell cannot be edited, or null */
  const lockedWhy = (r: number, c: number): string | null => {
    if (!edit) return "These rows cannot be edited.";
    if (edit.target === null) return "Still reading the table's columns; try again in a moment.";
    if (typeof edit.target === "string") return edit.target;
    if (edit.target.cols[c] === null) return edit.save ? `${set.columns[c].name} can't be changed here.` : `${set.columns[c].name} is not a plain column of the table, so it cannot be edited.`;
    if (latest().deleted[r]) return "This row is marked for deletion. Restore it to edit it.";
    return edit.lockCell?.(r, c) ?? null;
  };
  const setCell = (r: number, c: number, v: string | null) => {
    const e = latest();
    const row = { ...(e.cells[r] ?? {}) };
    if (v === set.rows[r][c]) delete row[c];
    else row[c] = v;
    const cells = { ...e.cells };
    if (Object.keys(row).length) cells[r] = row;
    else delete cells[r];
    putEdits({ ...e, cells });
  };
  const toggleDelete = (r: number) => {
    if (!target) {
      showToast(lockedWhy(r, 0) ?? "These rows cannot be edited.");
      return;
    }
    const e = latest();
    const deleted = { ...e.deleted };
    if (deleted[r]) delete deleted[r];
    else deleted[r] = true;
    putEdits({ ...e, deleted });
  };
  const startEdit = (dr: number, c: number, typed?: string) => {
    const r = order[dr];
    if (r === undefined) return;
    const why = lockedWhy(r, c);
    if (why) {
      showToast(why);
      return;
    }
    setSel({ r: dr, c });
    const v = cur(r, c) ?? null;
    setEditing({ r, c, draft: typed ?? v ?? "", orig: v });
  };
  /** keep (or drop) the textbox's text; move: a column step after Tab; blurred: focus went elsewhere, leave it there */
  /** pick: the value an enum list set, in place of the textbox's text */
  const finishEdit = (keep: boolean, move?: number, blurred?: boolean, pick?: string) => {
    const e = editingRef.current;
    if (!e) return;
    editingRef.current = null;
    setEditing(null);
    const draft = pick ?? e.draft;
    if (keep && (e.orig === null ? pick !== undefined || draft !== "" : draft !== e.orig)) setCell(e.r, e.c, draft);
    if (move !== undefined) {
      const dr = order.indexOf(e.r);
      const c = view[Math.max(0, Math.min(view.length - 1, view.indexOf(e.c) + move))];
      setSel({ r: dr, c });
      if (c !== e.c && target?.cols[c] != null) {
        const v = cur(e.r, c) ?? null;
        setEditing({ r: e.r, c, draft: v ?? "", orig: v });
        return;
      }
    }
    if (!blurred) wrap.current?.focus();
  };
  const revertAll = () => {
    editingRef.current = null;
    setEditing(null);
    setSaveErr(null);
    if (edit) useStore.getState().setEdits(edit.key, null);
    wrap.current?.focus();
  };

  const submit = async (approval?: Approval) => {
    if (!edit || !target || saving) return;
    if (editingRef.current) finishEdit(true, undefined, true);
    const base = set;
    const e = latest();
    if (edit.save) {
      if (!editCount(e)) return;
      setSaving(true);
      setSaveErr(null);
      const err = await edit.save(base, e);
      setSaving(false);
      if (err === undefined) return;
      if (err !== null) {
        failWith({ kind: "error", title: err, says: null, message: err, hint: null, lost: false, ms: 0 });
        return;
      }
      const n = editCount(e);
      useStore.getState().setEdits(edit.key, null);
      edit.onSaved(applied(base, e));
      showToast(`Saved ${n} change${n === 1 ? "" : "s"}`);
      wrap.current?.focus();
      return;
    }
    const plan = editPlan(target, base, e);
    if (!plan.length) return;
    setSaving(true);
    setSaveErr(null);
    const out: RunOutcome & { statement?: number } = await api
      .applyEdits({ connId: edit.connId, database: edit.database, statements: plan.map((p) => p.sql), approval })
      .catch((err) => ({ kind: "error", title: errText(err), says: null, message: errText(err), hint: null, lost: false, ms: 0 }));
    setSaving(false);
    if (out.kind === "ask") {
      useStore.getState().openModal({ kind: "guard", ask: out, connName: edit.connName, onApprove: (a) => void submit(a) });
      return;
    }
    if (out.kind === "done") {
      const n = editCount(e);
      useStore.getState().setEdits(edit.key, null);
      edit.onSaved(applied(base, e));
      showToast(`Saved ${n} change${n === 1 ? "" : "s"}`);
      wrap.current?.focus();
    } else if (out.kind === "cancelled") {
      failWith({ kind: "error", title: "Stopped by the statement timeout", says: null, message: "The transaction was rolled back, so nothing was saved.", hint: null, lost: false, ms: out.ms });
    } else failWith(out, out.statement === undefined ? null : (plan[out.statement]?.row ?? null));
  };

  // ⌘S submits the changes; in a query tab the SQL editor keeps ⌘S for saving the query
  useEffect(() => {
    if (!edit) return;
    const onKey = (ev: KeyboardEvent) => {
      if (!ev.metaKey || ev.key !== "s" || useStore.getState().modal) return;
      if (!editingRef.current && !editCount(latest())) return;
      const a = document.activeElement;
      if (a instanceof HTMLTextAreaElement && !wrap.current?.contains(a)) return;
      ev.preventDefault();
      ev.stopPropagation();
      void submit();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "c" && sel && value !== undefined && window.getSelection()?.isCollapsed !== false) {
      e.preventDefault();
      void copyText(value ?? "", "the value");
      return;
    }
    if (edit && sel && !editing) {
      if ((e.key === "Enter" && !e.metaKey) || e.key === "F2") {
        e.preventDefault();
        startEdit(sel.r, sel.c);
        return;
      }
      if (e.metaKey && e.key === "Backspace") {
        e.preventDefault();
        toggleDelete(order[sel.r]);
        return;
      }
      // typing over a cell starts editing it with that character
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && target && target.cols[sel.c] !== null && !edits.deleted[order[sel.r]]) {
        e.preventDefault();
        startEdit(sel.r, sel.c, e.key);
        return;
      }
    }
    const d = ({ ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!d || !set.rows.length) return;
    e.preventDefault();
    const cur = sel ?? { r: 0, c: view[0] };
    const jump = e.metaKey;
    const r = jump ? (d[0] > 0 ? order.length - 1 : d[0] < 0 ? 0 : cur.r) : Math.max(0, Math.min(order.length - 1, cur.r + d[0]));
    // left and right follow the columns as drawn
    const p = view.indexOf(cur.c);
    const c = view[jump ? (d[1] > 0 ? view.length - 1 : d[1] < 0 ? 0 : p) : Math.max(0, Math.min(view.length - 1, p + d[1]))];
    setSel({ r, c });
  };

  /** the body cell under the pointer, as display row and column */
  const cellAt = (e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest("td");
    const tr = td?.closest("tr");
    if (!td || !tr || !tr.parentElement || tr.parentElement.tagName !== "TBODY" || td.dataset.c === undefined) return null;
    return { r: [...tr.parentElement.children].indexOf(tr), c: Number(td.dataset.c) };
  };
  const onClick = (e: React.MouseEvent) => {
    const at = cellAt(e);
    if (at) setSel({ r: at.r, c: at.c });
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const at = cellAt(e);
    if (!at) return;
    window.getSelection()?.removeAllRanges();
    startEdit(at.r, at.c);
  };
  const onContextMenu = (e: React.MouseEvent) => {
    const at = cellAt(e);
    if (!at) return;
    e.preventDefault();
    setSel({ r: at.r, c: at.c });
    setCtx({ x: e.clientX, y: e.clientY, r: at.r, c: at.c });
  };
  const closeCtx = useCallback(() => setCtx(null), []);

  const sortBy = (i: number) =>
    setSort((s) => {
      if (!s || s.col !== i) return { col: i, dir: 1 };
      return s.dir === 1 ? { col: i, dir: -1 } : null;
    });

  const exportAs = async (f: AnyFormat) => {
    const ext = f in FORMAT_EXT ? FORMAT_EXT[f as Format] : MONGO_EXT[f as MongoFormat];
    const path = await save({ defaultPath: `${exportName}.${ext}`, title: `Export rows as ${f}` }).catch(() => null);
    if (!path) return;
    try {
      await api.writeTextFile(path, renderAny(f, order));
      showToast(`Exported ${set.rows.length} rows`);
    } catch (e) {
      showToast(errText(e));
    }
  };

  const col = sel ? set.columns[sel.c] : undefined;
  // The frozen columns get at most half the visible width between them: in a narrow window a wide key is cut
  // short (… and the full value in the inspector) rather than unfrozen. Only when each would get less than
  // MIN_PIN_W is nothing frozen. Then their left edges, measured, as --pl0..--pl3.
  const table = useRef<HTMLTableElement>(null);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const t = table.current;
    const w = wrap.current;
    if (!t || !w || !pk.length || pk.length > MAX_PINNED) return;
    const heads = () => pk.map((c) => t.querySelector<HTMLElement>(`thead th[data-c="${c}"]`));
    const measure = () => {
      let left = 0;
      const cap = Math.floor((w.clientWidth / 2 - left) / pk.length);
      if (cap < MIN_PIN_W) {
        w.style.scrollPaddingLeft = "";
        setFits(false);
        return;
      }
      t.style.setProperty("--pin-max", `${cap}px`);
      setFits(true);
      heads().forEach((th, k) => {
        t.style.setProperty(`--pl${k}`, `${left}px`);
        left += th?.getBoundingClientRect().width ?? 0;
      });
      // a cell scrolled into view (arrow keys, Go to a column) lands right of the frozen columns, not under them
      w.style.scrollPaddingLeft = `${left}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    for (const th of heads()) if (th) ro.observe(th);
    return () => {
      ro.disconnect();
      w.style.scrollPaddingLeft = "";
    };
  }, [pk, set]);
  const pin = pk.length > 0 && pk.length <= MAX_PINNED && fits;
  const enumOf = editing ? set.columns[editing.c]?.enumValues : undefined;
  const editor =
    editing &&
    (enumOf?.length ? (
      <EnumEditor key={`${editing.r}:${editing.c}`} value={editing.draft} orig={editing.orig} typed={editing.draft !== (editing.orig ?? "")} values={enumOf} type={set.columns[editing.c].type} onDone={finishEdit} />
    ) : (
      <CellEditor value={editing.draft} onChange={(draft) => setEditing((x) => (x ? { ...x, draft } : x))} onDone={finishEdit} />
    ));

  // A failed save marks its row and says why in the inspector while that row is selected (always, when the error
  // names no row). Save failed in the edit bar goes to the row.
  const failRow = saveErr?.row ?? null;
  const showFail = !!saveErr && (failRow === null || (!!sel && order[sel.r] === failRow));
  const goToFail = () => {
    if (failRow === null) return;
    const dr = order.indexOf(failRow);
    if (dr < 0) return;
    const ed = edits.cells[failRow];
    const c = ed ? (view.find((i) => i in ed) ?? view[0]) : (sel?.c ?? view[0]);
    setSel({ r: dr, c });
    wrap.current?.focus();
  };
  const failBlock = saveErr && showFail && (() => {
    const { err } = saveErr;
    const pkVals = failRow !== null && target ? target.pk.map((i) => set.rows[failRow]?.[i]).filter((v) => v != null) : [];
    const who = failRow === null ? null : pkVals.length ? `Row ${pkVals.join(", ")}` : `Row ${failRow + 1}`;
    const what = failRow !== null && edits.deleted[failRow] ? "wasn't deleted" : "wasn't saved";
    // "stopped at line 1" points into one generated statement: no help on a row
    const hint = err.hint && !/stopped at line \d+/i.test(err.hint) ? err.hint : null;
    return (
      <div className="ins-fail" role="alert">
        <p className="ins-fail-head">
          <CircleAlert {...icoC("ins-fail-ico")} />
          <strong>{who ? `${who} ${what}.` : "Nothing was saved."}</strong> <span>{err.title || err.message}</span>
          {hint && <span className="ins-fail-hint"> {hint}</span>}
          {err.says && (
            <>
              {" "}
              <button type="button" className="ins-fail-more" aria-expanded={failOpen} onClick={() => setFailOpen((o) => !o)}>
                {failOpen ? "Hide details" : "Details"}
              </button>
            </>
          )}
        </p>
        {failOpen && err.says && <pre className="db-says">{err.says}</pre>}
      </div>
    );
  })();

  /** the right-click menu's edit items for display row dr, column c */
  const editItems = (dr: number, c: number): MenuItem[] => {
    if (!edit) return [];
    const r = order[dr];
    const locked = !!lockedWhy(r, c);
    const changed = !!edits.cells[r] && c in edits.cells[r];
    const close = (f: () => void) => () => {
      setCtx(null);
      wrap.current?.focus();
      f();
    };
    return [
      { label: "Edit value", kbd: "↵", disabled: locked, run: close(() => startEdit(dr, c)) },
      ...(edit.noNull ? [] : [{ label: "Set to NULL", disabled: locked || cur(r, c) === null, run: close(() => setCell(r, c, null)) }]),
      ...(changed ? [{ label: "Revert value", run: close(() => setCell(r, c, set.rows[r][c])) }] : []),
      { label: `${edits.deleted[r] ? "Restore" : "Delete"} ${edit.rowWord ?? "row"}`, kbd: "⌘⌫", disabled: !target, run: close(() => toggleDelete(r)) },
    ];
  };

  const tools = (
    <>
      {lead}
      {edit && (pending > 0 || saving) && (
        <div className="edit-bar" role="group" aria-label="Unsaved changes">
          {saveErr && !saving ? (
            failRow !== null ? (
              <button type="button" className="edit-fail" title="Go to the row that wasn't saved" onClick={goToFail}>
                <CircleAlert {...icoC("edit-fail-ico")} />
                Save failed
              </button>
            ) : (
              <span className="edit-fail">
                <CircleAlert {...icoC("edit-fail-ico")} />
                Save failed
              </span>
            )
          ) : (
            <span className="edit-n">
              {pending} change{pending === 1 ? "" : "s"}
            </span>
          )}
          <button type="button" className="btn btn--primary" aria-busy={saving || undefined} disabled={saving} title={edit.saveTitle ?? "Write the changes in one transaction  ⌘S"} onClick={() => void submit()}>
            {saving && <span className="spinner" />}
            Save
          </button>
          <button type="button" className="btn" disabled={saving} title="Discard the changes" onClick={revertAll}>
            Discard
          </button>
        </div>
      )}
      {pager}
      <div className="res-actions">
        <MenuButton label="Go to a column" title="Columns" icon={<Columns3 {...ico} />}>
          {(close) => (
            <div className="menu cols-menu" role="menu" aria-label="Go to a column">
              <p className="menu-note">{set.columns.length} columns</p>
              {set.columns.map((c: ColMeta, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    setSel({ r: sel?.r ?? 0, c: i });
                    wrap.current?.querySelector(`thead th[data-c="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
                    wrap.current?.focus();
                  }}
                >
                  <span>{c.name}</span>
                  <span className="col-t">{c.type}</span>
                </button>
              ))}
            </div>
          )}
        </MenuButton>
        {(["Copy", "Export"] as const).map((what) => (
          <MenuButton key={what} label={`${what} rows`} title={what} icon={what === "Copy" ? <Copy {...ico} /> : <Download {...ico} />}>
            {(close) => (
              <div className="menu" role="menu" aria-label={`${what} as`}>
                <p className="menu-note">{what} as</p>
                {formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      if (what === "Copy") void copyText(renderAny(f, order), `${set.rows.length} rows as ${f}`);
                      else void exportAs(f);
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </MenuButton>
        ))}
      </div>
      {trail}
    </>
  );

  return (
    <>
      {toolsIn === undefined ? <div className="res-tools">{tools}</div> : toolsIn && createPortal(tools, toolsIn)}
      <div className="grid-wrap" tabIndex={0} aria-label={label} ref={wrap} onKeyDown={onKey} onClick={onClick} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
        <table className={`grid${pin ? " pin" : ""}${view.length === 1 ? " one" : ""}`} ref={table}>
          <thead>
            <tr>
              {view.map((i) => {
                const c = set.columns[i];
                // an enum's type is its own name: the one-of glyph says what it is
                const TI = c.enumValues ? CircleDot : TYPE_ICON[kinds[i]];
                const k = keys?.[c.name] ?? (target?.pk.includes(i) ? { primary: true } : undefined);
                const dir = onOrderBy ? (orderBy?.col === c.name ? (orderBy.desc ? -1 : 1) : 0) : sort?.col === i ? sort.dir : 0;
                return (
                  <th key={i} scope="col" data-c={i} data-enum={c.enumValues ? "" : undefined} className={[kinds[i] === "num" ? "num" : "", pins[i] ?? ""].join(" ").trim() || undefined} aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}>
                    <button type="button" className="th-btn" title={onOrderBy ? "Order the table by this column" : "Sort the rows on screen"} onClick={() => (onOrderBy ? onOrderBy(c.name) : sortBy(i))}>
                      <TI {...icoC("t-ico")} />
                      <span className="col-name">{c.name}</span>
                      {k?.primary && (
                        <span className="col-key" title="Primary key">
                          <KeyRound {...icoC("k-ico")} />
                        </span>
                      )}
                      {!k?.primary && k?.references && (
                        <span className="col-key" title={`References ${k.references}`}>
                          <Link {...icoC("k-ico")} />
                        </span>
                      )}
                      {dir === 1 ? <ArrowUp {...icoC("sort-ico")} /> : dir === -1 ? <ArrowDown {...icoC("sort-ico")} /> : <ArrowUpDown {...icoC("sort-ico")} />}
                    </button>
                    <span className="col-type">{c.type}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* TODO: virtualise rows; today every row is in the DOM (at most the row limit, or 10,000 when none could be added) */}
            {order.map((ri, di) => (
              <GridRow
                key={ri}
                row={set.rows[ri]}
                missing={set.missing?.[ri]}
                n={ri}
                kinds={kinds}
                selCol={sel?.r === di ? sel.c : -1}
                changed={edits.cells[ri]}
                deleted={edits.deleted[ri]}
                editCol={editing?.r === ri ? editing.c : -1}
                editor={editing?.r === ri ? editor : undefined}
                view={view}
                pins={pins}
                failed={failRow === ri}
              />
            ))}
          </tbody>
        </table>
      </div>
      {col && sel ? (
        <div className="inspector" aria-live="polite">
          {failBlock}
          <div className="ins-where">
            <span className="ins-col">{col.name}</span>
            <span className="ins-type">{col.type}</span>
            <span className="ins-row">row {order[sel.r] + 1}</span>
            {edits.cells[order[sel.r]] && sel.c in edits.cells[order[sel.r]] && <span className="ins-edited">edited</span>}
            {edits.deleted[order[sel.r]] && <span className="ins-deleted">to delete</span>}
          </div>
          <div className={`ins-value${value === null || selMissing ? " is-null" : ""}`}>{selMissing ? "missing, this document has no such field" : value === null ? "null, no value" : value}</div>
          <button type="button" className="icon-btn ins-copy" title="Copy value" aria-label="Copy value" disabled={value === null} onClick={() => value !== null && value !== undefined && void copyText(value, "the value")}>
            <Copy {...ico} />
          </button>
        </div>
      ) : (
        failBlock && <div className="inspector">{failBlock}</div>
      )}
      {ctx && (
        <CellMenu
          x={ctx.x}
          y={ctx.y}
          isNull={cur(order[ctx.r], ctx.c) === null || missingAt(order[ctx.r], ctx.c)}
          formats={formats}
          items={editItems(ctx.r, ctx.c)}
          onClose={closeCtx}
          onValue={() => {
            const v = cur(order[ctx.r], ctx.c);
            setCtx(null);
            wrap.current?.focus();
            if (v !== null && v !== undefined) void copyText(v, "the value");
          }}
          onRow={(f) => {
            const ri = order[ctx.r];
            setCtx(null);
            wrap.current?.focus();
            if (set.rows[ri]) void copyText(renderAny(f, [ri]), `the row as ${f}`);
          }}
        />
      )}
      {foot}
    </>
  );
}
