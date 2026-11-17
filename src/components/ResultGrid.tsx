import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { save } from "@tauri-apps/plugin-dialog";
import { FORMATS, FORMAT_EXT, boolOf, kindOf, render, tsParts, type Format, type Kind } from "../lib/cells";
import { api, errText } from "../lib/api";
import { NO_EDITS, applied, editCount, editStatements, type EditTarget, type Edits } from "../lib/edit";
import { useStore } from "../store";
import type { Approval, ColMeta, ResultSet, RunOutcome } from "../types";
import { useDismiss } from "./useDismiss";
import { ArrowDown, ArrowUp, ArrowUpDown, Braces, CalendarClock, Check, Columns3, Copy, Download, Hash, KeyRound, Link, Minus, ToggleLeft, Type, X, icoC, ico } from "./Icon";

export interface ColKey {
  primary?: boolean;
  references?: string | null;
}

const TYPE_ICON: Record<Kind, typeof Hash> = { num: Hash, ts: CalendarClock, bool: ToggleLeft, json: Braces, bytes: Type, text: Type };

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

function Cell({ v, kind, sel, ci, edited, editor }: { v: string | null; kind: Kind; sel: boolean; ci: number; edited: boolean; editor?: ReactNode }) {
  const s = (sel ? " cell-sel" : "") + (edited ? " cell-edit" : "");
  if (editor)
    return (
      <td className={`cell-editing${kind === "num" ? " num" : ""}`} data-c={ci}>
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
  if (kind === "bool") {
    const b = boolOf(v);
    if (b !== null)
      return (
        <td className={`bool${s}`} data-c={ci}>
          {b ? <Check {...icoC("yes")} /> : <Minus {...icoC("no")} />}
          <span className="visually-hidden">{String(b)}</span>
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
}: {
  row: (string | null)[];
  n: number;
  kinds: Kind[];
  selCol: number;
  /** values edited and not yet saved, by column */
  changed?: Record<number, string | null>;
  deleted?: boolean;
  editCol: number;
  editor?: ReactNode;
}) {
  return (
    <tr aria-selected={selCol >= 0 ? true : undefined} data-n={n} className={deleted ? "row-del" : changed ? "row-edit" : undefined}>
      <td className="rownum">{n + 1}</td>
      {row.map((v, i) => {
        const ed = !!changed && i in changed;
        return <Cell key={i} v={ed ? changed![i] : v} kind={kinds[i]} sel={i === selCol} ci={i} edited={ed} editor={i === editCol ? editor : undefined} />;
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
function CellMenu({ x, y, isNull, items, onValue, onRow, onClose }: { x: number; y: number; isNull: boolean; items: MenuItem[]; onValue: () => void; onRow: (f: Format) => void; onClose: () => void }) {
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
      {FORMATS.map((f) => (
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
}

type SaveError = Extract<RunOutcome, { kind: "error" }>;

/**
 * The result grid: values read by their column type, a cell is the unit (click or arrow keys), the inspector
 * under the grid holds the selected cell's full value. A head sorts the rows already on screen (no new query);
 * the row numbers keep the order the database returned. When the rows come from one table with its primary
 * key, a double-click (or Enter, or typing) edits a cell; changes stay on screen (green, deleted rows red)
 * until Save (⌘S) writes them in one transaction, or Revert drops them.
 */
export function ResultGrid({ set, keys, label, exportName, lead, foot, edit }: { set: ResultSet; keys?: Record<string, ColKey>; label: string; exportName: string; lead?: ReactNode; foot?: ReactNode; edit?: GridEdit }) {
  const kinds = useMemo(() => set.columns.map((c) => kindOf(c.type)), [set]);
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(() => (set.rows.length && set.columns.length ? { r: 0, c: 0 } : null));
  const [ctx, setCtx] = useState<{ x: number; y: number; r: number; c: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const showToast = useStore((s) => s.showToast);

  // ---- editing ----
  const target = edit && edit.target && typeof edit.target === "object" ? edit.target : null;
  const edits = useStore((s) => (edit ? s.edits[edit.key] : undefined)) ?? NO_EDITS;
  const pending = editCount(edits);
  /** r: index into set.rows */
  const [editing, setEditing] = useState<{ r: number; c: number; draft: string; orig: string | null } | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<SaveError | null>(null);

  // display order: indexes into set.rows
  const order = useMemo(() => {
    const idx = set.rows.map((_, i) => i);
    if (!sort) return idx;
    const { col, dir } = sort;
    const num = kinds[col] === "num";
    const key = (i: number) => {
      const v = set.rows[i][col];
      if (v === null) return null;
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
  }, [set, sort, kinds]);

  // a new result (other columns) starts over; the same one after a save keeps its sort and place
  useEffect(() => {
    setSort(null);
    setSel(set.rows.length && set.columns.length ? { r: 0, c: 0 } : null);
  }, [set.columns]);
  useEffect(() => {
    setEditing(null);
    setSel((s) => (s && set.rows.length ? { r: Math.min(s.r, set.rows.length - 1), c: s.c } : null));
  }, [set]);

  // keep the selected cell in view
  useEffect(() => {
    if (!sel || !wrap.current) return;
    const td = wrap.current.querySelector(`tbody tr:nth-child(${sel.r + 1}) td[data-c="${sel.c}"]`);
    (td as HTMLElement | null)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  /** a cell's value as shown: the edit if there is one */
  const cur = (r: number, c: number): string | null | undefined => {
    const e = edits.cells[r];
    return e && c in e ? e[c] : set.rows[r]?.[c];
  };
  const value = sel ? cur(order[sel.r], sel.c) : undefined;
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
    if (edit.target.cols[c] === null) return `${set.columns[c].name} is not a plain column of the table, so it cannot be edited.`;
    if (latest().deleted[r]) return "This row is marked for deletion. Restore it to edit it.";
    return null;
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
  const finishEdit = (keep: boolean, move?: number, blurred?: boolean) => {
    const e = editingRef.current;
    if (!e) return;
    editingRef.current = null;
    setEditing(null);
    if (keep && (e.orig === null ? e.draft !== "" : e.draft !== e.orig)) setCell(e.r, e.c, e.draft);
    if (move !== undefined) {
      const dr = order.indexOf(e.r);
      const c = Math.max(0, Math.min(set.columns.length - 1, e.c + move));
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
    const statements = editStatements(target, base, e);
    if (!statements.length) return;
    setSaving(true);
    setSaveErr(null);
    const out: RunOutcome = await api
      .applyEdits({ connId: edit.connId, database: edit.database, statements, approval })
      .catch((err) => ({ kind: "error", title: "Nothing was saved", says: null, message: errText(err), hint: null, lost: false, ms: 0 }));
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
      setSaveErr({ kind: "error", title: "Stopped by the statement timeout", says: null, message: "Nothing was saved: the transaction was rolled back.", hint: null, lost: false, ms: out.ms });
    } else setSaveErr(out);
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
    const cur = sel ?? { r: 0, c: 0 };
    const jump = e.metaKey;
    const r = jump ? (d[0] > 0 ? order.length - 1 : d[0] < 0 ? 0 : cur.r) : Math.max(0, Math.min(order.length - 1, cur.r + d[0]));
    const c = jump ? (d[1] > 0 ? set.columns.length - 1 : d[1] < 0 ? 0 : cur.c) : Math.max(0, Math.min(set.columns.length - 1, cur.c + d[1]));
    setSel({ r, c });
  };

  /** the body cell under the pointer, as display row and column; the row number picks the selected column */
  const cellAt = (e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest("td");
    const tr = td?.closest("tr");
    if (!td || !tr || !tr.parentElement || tr.parentElement.tagName !== "TBODY") return null;
    return { r: [...tr.parentElement.children].indexOf(tr), c: td.classList.contains("rownum") ? (sel?.c ?? 0) : Number(td.dataset.c), rownum: td.classList.contains("rownum") };
  };
  const onClick = (e: React.MouseEvent) => {
    const at = cellAt(e);
    if (at) setSel({ r: at.r, c: at.c });
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const at = cellAt(e);
    if (!at || at.rownum) return;
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

  const ordered = () => order.map((i) => set.rows[i]);
  const exportAs = async (f: Format) => {
    const path = await save({ defaultPath: `${exportName}.${FORMAT_EXT[f]}`, title: `Export rows as ${f}` }).catch(() => null);
    if (!path) return;
    try {
      await api.writeTextFile(path, render(f, set.columns, ordered()));
      showToast(`Exported ${set.rows.length} rows`);
    } catch (e) {
      showToast(errText(e));
    }
  };

  const col = sel ? set.columns[sel.c] : undefined;
  const pin = set.columns.length > 6;
  const editor = editing && (
    <CellEditor value={editing.draft} onChange={(draft) => setEditing((x) => (x ? { ...x, draft } : x))} onDone={finishEdit} />
  );

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
      { label: "Set to NULL", disabled: locked || cur(r, c) === null, run: close(() => setCell(r, c, null)) },
      ...(changed ? [{ label: "Revert value", run: close(() => setCell(r, c, set.rows[r][c])) }] : []),
      { label: edits.deleted[r] ? "Restore row" : "Delete row", kbd: "⌘⌫", disabled: !target, run: close(() => toggleDelete(r)) },
    ];
  };

  return (
    <>
      <div className="res-tools">
        {lead}
        {edit && (pending > 0 || saving) && (
          <div className="edit-bar" role="group" aria-label="Unsaved changes">
            <span className="edit-n">
              {pending} change{pending === 1 ? "" : "s"}
            </span>
            <button type="button" className="btn btn--primary" aria-busy={saving || undefined} disabled={saving} title="Write the changes in one transaction  ⌘S" onClick={() => void submit()}>
              {saving && <span className="spinner" />}
              Save
            </button>
            <button type="button" className="btn" disabled={saving} title="Drop the changes" onClick={revertAll}>
              Revert
            </button>
          </div>
        )}
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
                      wrap.current?.querySelectorAll("thead th")[i + 1]?.scrollIntoView({ block: "nearest", inline: "center" });
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
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        close();
                        if (what === "Copy") void copyText(render(f, set.columns, ordered()), `${set.rows.length} rows as ${f}`);
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
      </div>
      {saveErr && (
        <div className="edit-err" role="alert">
          <div className="edit-err-text">
            <strong>{saveErr.title || "Nothing was saved"}</strong>
            <span>{saveErr.message}</span>
            {saveErr.hint && <span className="hint-line">{saveErr.hint}</span>}
            {saveErr.says && <pre className="db-says">{saveErr.says}</pre>}
          </div>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setSaveErr(null)}>
            <X {...ico} />
          </button>
        </div>
      )}
      <div className="grid-wrap" tabIndex={0} aria-label={label} ref={wrap} onKeyDown={onKey} onClick={onClick} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
        <table className={`grid${pin ? " pin" : ""}`}>
          <thead>
            <tr>
              <th className="rownum" scope="col">
                <span className="visually-hidden">Row</span>
              </th>
              {set.columns.map((c, i) => {
                const TI = TYPE_ICON[kinds[i]];
                const k = keys?.[c.name] ?? (target?.pk.includes(i) ? { primary: true } : undefined);
                const dir = sort?.col === i ? sort.dir : 0;
                return (
                  <th key={i} scope="col" className={kinds[i] === "num" ? "num" : undefined} aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}>
                    <button type="button" className="th-btn" title="Sort the rows on screen" onClick={() => sortBy(i)}>
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
                n={ri}
                kinds={kinds}
                selCol={sel?.r === di ? sel.c : -1}
                changed={edits.cells[ri]}
                deleted={edits.deleted[ri]}
                editCol={editing?.r === ri ? editing.c : -1}
                editor={editing?.r === ri ? editor : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
      {col && sel && (
        <div className="inspector" aria-live="polite">
          <div className="ins-where">
            <span className="ins-col">{col.name}</span>
            <span className="ins-type">{col.type}</span>
            <span className="ins-row">row {order[sel.r] + 1}</span>
            {edits.cells[order[sel.r]] && sel.c in edits.cells[order[sel.r]] && <span className="ins-edited">edited</span>}
            {edits.deleted[order[sel.r]] && <span className="ins-deleted">to delete</span>}
          </div>
          <div className={`ins-value${value === null ? " is-null" : ""}`}>{value === null ? "null, no value" : value}</div>
          <button type="button" className="icon-btn ins-copy" title="Copy value" aria-label="Copy value" disabled={value === null} onClick={() => value !== null && value !== undefined && void copyText(value, "the value")}>
            <Copy {...ico} />
          </button>
        </div>
      )}
      {ctx && (
        <CellMenu
          x={ctx.x}
          y={ctx.y}
          isNull={cur(order[ctx.r], ctx.c) === null}
          items={editItems(ctx.r, ctx.c)}
          onClose={closeCtx}
          onValue={() => {
            const v = cur(order[ctx.r], ctx.c);
            setCtx(null);
            wrap.current?.focus();
            if (v !== null && v !== undefined) void copyText(v, "the value");
          }}
          onRow={(f) => {
            const row = set.rows[order[ctx.r]];
            setCtx(null);
            wrap.current?.focus();
            if (row) void copyText(render(f, set.columns, [row]), `the row as ${f}`);
          }}
        />
      )}
      {foot}
    </>
  );
}
