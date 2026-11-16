import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { FORMATS, FORMAT_EXT, boolOf, kindOf, render, tsParts, type Format, type Kind } from "../lib/cells";
import { api, errText } from "../lib/api";
import { useStore } from "../store";
import type { ColMeta, ResultSet } from "../types";
import { useDismiss } from "./useDismiss";
import { ArrowDown, ArrowUp, ArrowUpDown, Braces, CalendarClock, Check, Columns3, Copy, Download, Hash, KeyRound, Link, Minus, ToggleLeft, Type, icoC, ico } from "./Icon";

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

function Cell({ v, kind, sel, ci }: { v: string | null; kind: Kind; sel: boolean; ci: number }) {
  const s = sel ? " cell-sel" : "";
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

const GridRow = memo(function GridRow({ row, n, kinds, selCol }: { row: (string | null)[]; n: number; kinds: Kind[]; selCol: number }) {
  return (
    <tr aria-selected={selCol >= 0 ? true : undefined} data-n={n}>
      <td className="rownum">{n + 1}</td>
      {row.map((v, i) => (
        <Cell key={i} v={v} kind={kinds[i]} sel={i === selCol} ci={i} />
      ))}
    </tr>
  );
});

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

/**
 * The result grid: values read by their column type, a cell is the unit (click or arrow keys), the inspector
 * under the grid holds the selected cell's full value. A head sorts the rows already on screen (no new query);
 * the row numbers keep the order the database returned.
 */
export function ResultGrid({ set, keys, label, exportName, lead, foot }: { set: ResultSet; keys?: Record<string, ColKey>; label: string; exportName: string; lead?: ReactNode; foot?: ReactNode }) {
  const kinds = useMemo(() => set.columns.map((c) => kindOf(c.type)), [set]);
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(() => (set.rows.length && set.columns.length ? { r: 0, c: 0 } : null));
  const wrap = useRef<HTMLDivElement>(null);
  const showToast = useStore((s) => s.showToast);

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

  useEffect(() => {
    setSort(null);
    setSel(set.rows.length && set.columns.length ? { r: 0, c: 0 } : null);
  }, [set]);

  // keep the selected cell in view
  useEffect(() => {
    if (!sel || !wrap.current) return;
    const td = wrap.current.querySelector(`tbody tr:nth-child(${sel.r + 1}) td[data-c="${sel.c}"]`);
    (td as HTMLElement | null)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  const value = sel ? set.rows[order[sel.r]]?.[sel.c] : undefined;
  const copyText = (text: string, what: string) =>
    navigator.clipboard?.writeText(text).then(
      () => showToast(`Copied ${what}`),
      (e) => showToast(errText(e)),
    );

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "c" && sel && value !== undefined && window.getSelection()?.isCollapsed !== false) {
      e.preventDefault();
      void copyText(value ?? "", "the value");
      return;
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

  const onClick = (e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest("td");
    const tr = td?.closest("tr");
    if (!td || !tr || !tr.parentElement || tr.parentElement.tagName !== "TBODY") return;
    const r = [...tr.parentElement.children].indexOf(tr);
    const c = td.classList.contains("rownum") ? (sel?.c ?? 0) : Number(td.dataset.c);
    setSel({ r, c });
  };

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

  return (
    <>
      <div className="res-tools">
        {lead}
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
      <div className="grid-wrap" tabIndex={0} aria-label={label} ref={wrap} onKeyDown={onKey} onClick={onClick}>
        <table className={`grid${pin ? " pin" : ""}`}>
          <thead>
            <tr>
              <th className="rownum" scope="col">
                <span className="visually-hidden">Row</span>
              </th>
              {set.columns.map((c, i) => {
                const TI = TYPE_ICON[kinds[i]];
                const k = keys?.[c.name];
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
              <GridRow key={ri} row={set.rows[ri]} n={ri} kinds={kinds} selCol={sel?.r === di ? sel.c : -1} />
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
          </div>
          <div className={`ins-value${value === null ? " is-null" : ""}`}>{value === null ? "null, no value" : value}</div>
          <button type="button" className="icon-btn ins-copy" title="Copy value" aria-label="Copy value" disabled={value === null} onClick={() => value !== null && value !== undefined && void copyText(value, "the value")}>
            <Copy {...ico} />
          </button>
        </div>
      )}
      {foot}
    </>
  );
}
