import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurrent, useStore, type SideView } from "../store";
import { api, errText } from "../lib/api";
import { estimate } from "../lib/cells";
import { quoteIdent } from "../lib/sql";
import { clockOf, dayLabel, startOfDay } from "../lib/time";
import type { Saved } from "../types";
import { useDismiss } from "./useDismiss";
import { ChevronDown, ChevronRight, Copy, Ellipsis, Eye, Folder, Plus, RefreshCw, Search, SquareCode, SquareFunction, Table2, Trash2, icoC, ico } from "./Icon";

export function Sidebar({ view, onResizeStart }: { view: SideView; onResizeStart: (e: React.MouseEvent) => void }) {
  return (
    <aside className="sidebar">
      <div className="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide" onMouseDown={onResizeStart} />
      {view === "schema" ? <SchemaSide /> : view === "history" ? <HistorySide /> : <SavedSide />}
    </aside>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  sep?: boolean;
  run: () => void;
}

/** A tree row's "…" menu, inside the row (voidHTTP's row menu). */
function RowMore({ name, items, open, setOpen }: { name: string; items: MenuItem[]; open: boolean; setOpen: (open: boolean) => void }) {
  const ref = useDismiss(open, () => setOpen(false));
  return (
    // display: contents keeps the button and menu where the row's CSS expects them; the span only scopes outside clicks
    <span ref={ref} style={{ display: "contents" }}>
      <button
        type="button"
        className="icon-btn row-more"
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <Ellipsis {...ico} />
      </button>
      {open && (
        <div className="menu row-menu" role="menu" aria-label={`Actions for ${name}`}>
          {items.map((it) =>
            it.sep ? (
              <hr key={it.label} />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={it.danger ? "danger" : undefined}
                onClick={() => {
                  setOpen(false);
                  it.run();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </span>
  );
}

/** One tree row; its "…" menu (name + items) marks the row while open. A right-click opens the same menu. */
function Row({ indent, current, className = "", children, name, items }: { indent?: number; current?: boolean; className?: string; children: ReactNode; name?: string; items?: MenuItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = !!(name && items);
  return (
    <div
      className={`row ${className}${menuOpen ? " menu-open" : ""}`.trim()}
      style={indent ? ({ "--indent": `${indent}px` } as React.CSSProperties) : undefined}
      aria-current={current ? "page" : undefined}
      onContextMenu={
        hasMenu
          ? (e) => {
              e.preventDefault();
              setMenuOpen(true);
            }
          : undefined
      }
    >
      {children}
      {hasMenu && <RowMore name={name!} items={items!} open={menuOpen} setOpen={setMenuOpen} />}
    </div>
  );
}

function SchemaSide() {
  const { id, conn, session } = useCurrent();
  const [filter, setFilter] = useState("");
  const st = useStore.getState();
  const activeTab = session?.tabs.find((t) => t.id === session.activeTabId);
  const q = filter.trim().toLowerCase();
  if (!id || !conn || !session) return null;
  const engine = conn.engine;
  const schemas = session.info?.schemas ?? [];
  const hits = (name: string) => !q || name.toLowerCase().includes(q);
  const qualified = (schema: string, name: string) => (engine === "sqlite" && schema === "main" ? quoteIdent(engine, name) : `${quoteIdent(engine, schema)}.${quoteIdent(engine, name)}`);
  const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => st.showToast(`Copied ${text}`));

  const tableMenu = (schema: string, name: string, view: boolean): MenuItem[] => [
    { label: "Open rows", icon: <Table2 {...ico} />, run: () => st.openTable(schema, name) },
    { label: "New query on this table", icon: <SquareCode {...ico} />, run: () => st.newQueryTab(`select *\nfrom ${qualified(schema, name)}\n`) },
    { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(name) },
    { label: "sep", sep: true, run: () => {} },
    // never run on the person's behalf: the statement opens in a query tab, behind the write guard
    ...(view ? [] : [{ label: "Truncate", danger: true, run: () => st.newQueryTab(`truncate table ${qualified(schema, name)};\n`, "Truncate " + name) }]),
    { label: "Drop", danger: true, run: () => st.newQueryTab(`drop ${view ? "view" : "table"} ${qualified(schema, name)};\n`, "Drop " + name) },
  ];

  let anyLeaf = false;
  const body = schemas.map((schema) => {
    const node = session.tree[schema];
    const open = !!session.expanded[schema] || (!!q && node?.state === "loaded");
    const tables = node?.data?.tables.filter((t) => t.kind !== "view") ?? [];
    const views = node?.data?.tables.filter((t) => t.kind === "view") ?? [];
    const fns = node?.data?.functions ?? [];
    const groups: [string, string, { name: string; est?: number | null; kind: string }[]][] = [
      ["tables", "Tables", tables.map((t) => ({ name: t.name, est: t.estimate, kind: t.kind }))],
      ["views", "Views", views.map((t) => ({ name: t.name, kind: "view" }))],
      ...(engine === "sqlite" ? [] : [["functions", "Functions", fns.map((f) => ({ name: f, kind: "function" }))] as [string, string, { name: string; kind: string }[]]]),
    ];
    const matching = groups.map(([k, l, items]) => [k, l, items.filter((i) => hits(i.name))] as const);
    const count = node?.data ? node.data.tables.length + node.data.functions.length : null;
    if (q && node?.state === "loaded" && !matching.some(([, , items]) => items.length)) return null;
    if (q && node?.state !== "loaded") return null;
    return (
      <div key={schema}>
        <Row className="collection" name={schema} items={[{ label: "Refresh schema", icon: <RefreshCw {...ico} />, run: () => void st.loadSchema(schema) }, { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(schema) }]}>
          <button type="button" className="row-main" aria-expanded={open} onClick={() => st.toggle(schema)}>
            {open ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
            <span className="name">{schema}</span>
            {count !== null && <span className="count">({count})</span>}
            {node?.state === "loading" && <span className="spinner" aria-label="Loading" />}
          </button>
        </Row>
        {open && node?.state === "error" && (
          <div className="tree-note err" style={{ "--indent": "16px" } as React.CSSProperties}>
            {node.error}
          </div>
        )}
        {open &&
          node?.state === "loaded" &&
          matching.map(([key, label, items]) => {
            const path = `${schema}/${key}`;
            const gOpen = q ? items.length > 0 : !!session.expanded[path];
            if (q && !items.length) return null;
            return (
              <div key={key}>
                <Row indent={16}>
                  <button type="button" className="row-main" aria-expanded={gOpen} onClick={() => st.toggle(path)}>
                    {gOpen ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
                    <Folder {...icoC("folder")} />
                    <span className="name">{label}</span>
                    <span className="count">({items.length})</span>
                  </button>
                </Row>
                {gOpen &&
                  items.map((it) => {
                    anyLeaf = true;
                    const isFn = it.kind === "function";
                    const cur = activeTab?.kind === "table" && activeTab.schema === schema && activeTab.table === it.name;
                    const Kind = isFn ? SquareFunction : it.kind === "view" ? Eye : Table2;
                    return (
                      <Row
                        key={it.name}
                        indent={40}
                        current={cur}
                        name={it.name} items={isFn ? [{ label: "Copy name", icon: <Copy {...ico} />, run: () => copy(it.name) }] : tableMenu(schema, it.name, it.kind === "view")}
                      >
                        <button type="button" className="row-main" onClick={() => (isFn ? copy(it.name) : st.openTable(schema, it.name))} title={isFn ? "Copy the name" : `Open the rows of ${it.name}`}>
                          <Kind {...icoC("kind")} />
                          <span className="name">{it.name}</span>
                          {it.est !== undefined && it.est !== null && (
                            <span className="count est" title="Estimate from table statistics">
                              {estimate(it.est)}
                            </span>
                          )}
                        </button>
                      </Row>
                    );
                  })}
              </div>
            );
          })}
      </div>
    );
  });

  return (
    <>
      <div className="side-head">
        <h2>Schema</h2>
      </div>
      <div className="side-tools">
        <div className="search">
          <Search {...ico} />
          <input className="field" placeholder="Filter tables" aria-label="Filter tables, views and functions" autoComplete="off" spellCheck={false} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button type="button" className="icon-btn icon-btn--outline" title="Refresh schema" aria-label="Refresh schema" onClick={() => st.refreshTree()}>
          <RefreshCw {...ico} />
        </button>
        <button type="button" className="icon-btn icon-btn--filled" title="New query  ⌘T" aria-label="New query" onClick={() => st.newQueryTab()}>
          <Plus {...ico} />
        </button>
      </div>
      <div className="tree">
        {session.status === "opening" && <div className="tree-note">Connecting…</div>}
        {body}
        {q && !anyLeaf && (
          <div className="empty">
            <strong>Nothing matches "{filter.trim()}"</strong>
            <span>Searches table, view and function names in the schemas loaded so far.</span>
            <button type="button" className="link" onClick={() => setFilter("")}>
              Clear the filter
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// History belongs to the open connection: only its runs show, Clear empties only its list, and removing the
// connection removes its history. A run on another database than the picked one names that database.
function HistorySide() {
  const history = useStore((s) => s.history);
  const { id, conn, session } = useCurrent();
  const [search, setSearch] = useState("");
  const st = useStore.getState();
  useEffect(() => {
    const t = setTimeout(() => void useStore.getState().loadHistory(search.trim() || undefined), 200);
    return () => clearTimeout(t);
  }, [search, id]);
  const days = useMemo(() => {
    const out: [number, typeof history][] = [];
    for (const h of history) {
      const d = startOfDay(h.startedAt);
      const last = out[out.length - 1];
      if (last && last[0] === d) last[1].push(h);
      else out.push([d, [h]]);
    }
    return out;
  }, [history]);

  const name = conn?.name ?? "";
  const picked = session?.database ?? "";
  // opens on this connection, on the database it ran on
  const openEntry = async (sql: string, database: string) => {
    const s = useStore.getState();
    if (database && database !== picked) await s.setDatabase(database);
    useStore.getState().newQueryTab(sql);
  };

  return (
    <>
      <div className="side-head">
        <h2>History</h2>
        <button
          type="button"
          className="btn btn--quiet"
          disabled={!history.length}
          onClick={() =>
            st.openModal({
              kind: "confirm",
              title: `Clear ${name} history?`,
              message: `Every query run on ${name} is removed from ypacapy.db. Other connections' history and saved queries are not touched.`,
              confirmLabel: "Clear",
              onConfirm: () => {
                if (!id) return;
                api.clearHistory(id).then(
                  () => useStore.getState().loadHistory(),
                  (e) => useStore.getState().showToast(errText(e)),
                );
              },
            })
          }
        >
          Clear
        </button>
      </div>
      <div className="side-tools">
        <div className="search">
          <Search {...ico} />
          <input className="field" placeholder={`Search ${name} history`} aria-label={`Search ${name} history`} autoComplete="off" spellCheck={false} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="tree">
        {!history.length && (
          <div className="empty">
            <strong>{search ? "Nothing matches" : `No queries on ${name} yet`}</strong>
            <span>{search ? "Searches the SQL text." : "Each query you run is kept here, on this Mac."}</span>
          </div>
        )}
        {days.map(([d, items]) => (
          <div key={d}>
            <div className="day">{dayLabel(d)}</div>
            {items.map((h) => (
              <div className="row" key={h.id}>
                <button type="button" className="row-main" title={`${name}${h.database ? ` / ${h.database}` : ""}\n${h.sql}`} onClick={() => void openEntry(h.sql, h.database)}>
                  {h.database && h.database !== picked && <span className="hdb">{h.database}</span>}
                  <span className="name hq">{h.sql.replace(/\s+/g, " ").trim()}</span>
                  <span className="htime">{clockOf(h.startedAt)}</span>
                  <span className={`hstatus ${h.status === "ok" ? "rows" : "fail"}`}>{h.status === "ok" ? (h.rows ?? "ok") : h.status === "error" ? "error" : "stopped"}</span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function SavedSide() {
  const saved = useStore((s) => s.saved);
  const { session } = useCurrent();
  const [search, setSearch] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const st = useStore.getState();
  const q = search.trim().toLowerCase();
  const folders = useMemo(() => {
    const m = new Map<string, Saved[]>();
    for (const s of saved) {
      if (q && !s.name.toLowerCase().includes(q) && !s.sql.toLowerCase().includes(q)) continue;
      m.set(s.folder, [...(m.get(s.folder) ?? []), s]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [saved, q]);
  const activeSaved = session?.tabs.find((t) => t.id === session.activeTabId);
  const openSaved = (s: Saved) => {
    const ses = useStore.getState().sessions[useStore.getState().currentId ?? ""];
    const open = ses?.tabs.find((t) => t.kind === "query" && t.savedId === s.id);
    if (open) st.setActiveTab(open.id);
    else st.newQueryTab(s.sql, s.name, s);
  };
  const menu = (s: Saved): MenuItem[] => [
    { label: "Open", icon: <SquareCode {...ico} />, run: () => openSaved(s) },
    { label: "Rename", icon: undefined, run: () => st.openModal({ kind: "prompt", title: "Rename saved query", label: "Name", initial: s.name, onSubmit: (name) => void api.saveQuery({ ...s, name }).then(() => useStore.getState().loadSaved()) }) },
    { label: "sep", sep: true, run: () => {} },
    {
      label: "Delete",
      danger: true,
      icon: <Trash2 {...ico} />,
      run: () =>
        st.openModal({
          kind: "confirm",
          title: `Delete ${s.name}?`,
          message: "The saved query is removed from ypacapy.db.",
          onConfirm: () => void api.deleteSaved(s.id).then(() => useStore.getState().loadSaved()),
        }),
    },
  ];

  return (
    <>
      <div className="side-head">
        <h2>Saved queries</h2>
      </div>
      <div className="side-tools">
        <div className="search">
          <Search {...ico} />
          <input className="field" placeholder="Search saved queries" aria-label="Search saved queries" autoComplete="off" spellCheck={false} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="tree">
        {!folders.length && (
          <div className="empty">
            <strong>{q ? "Nothing matches" : "No saved queries"}</strong>
            <span>{q ? "Searches names and SQL." : "Save a query from its tab (⌘S) to keep it here."}</span>
          </div>
        )}
        {folders.map(([folder, items]) =>
          folder ? (
            <div key={folder}>
              <div className="row collection">
                <button type="button" className="row-main" aria-expanded={!closed[folder]} onClick={() => setClosed({ ...closed, [folder]: !closed[folder] })}>
                  {closed[folder] ? <ChevronRight {...icoC("caret")} /> : <ChevronDown {...icoC("caret")} />}
                  <span className="name">{folder}</span>
                  <span className="count">({items.length})</span>
                </button>
              </div>
              {!closed[folder] &&
                items.map((s) => (
                  <Row key={s.id} indent={24} current={activeSaved?.kind === "query" && activeSaved.savedId === s.id} name={s.name} items={menu(s)}>
                    <button type="button" className="row-main" title={s.sql} onClick={() => openSaved(s)}>
                      <SquareCode {...icoC("kind")} />
                      <span className="name">{s.name}</span>
                    </button>
                  </Row>
                ))}
            </div>
          ) : (
            items.map((s) => (
              <Row key={s.id} current={activeSaved?.kind === "query" && activeSaved.savedId === s.id} name={s.name} items={menu(s)}>
                <button type="button" className="row-main" title={s.sql} onClick={() => openSaved(s)}>
                  <SquareCode {...icoC("kind")} />
                  <span className="name">{s.name}</span>
                </button>
              </Row>
            ))
          ),
        )}
      </div>
    </>
  );
}
