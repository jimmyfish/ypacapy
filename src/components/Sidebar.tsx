import "./Sidebar.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurrent, useStore, type SideView } from "../store";
import { api, errText } from "../lib/api";
import { estimate } from "../lib/cells";
import { quoteIdent } from "../lib/sql";
import { clockOf, dayLabel, startOfDay } from "../lib/time";
import { ttlLeft } from "../lib/time";
import type { Saved, ScanKey } from "../types";
import { useDismiss } from "./useDismiss";
import { Braces, ChevronDown, ChevronRight, Copy, Database, Ellipsis, Eye, Folder, Info, Key, Network, RefreshCw, Search, Shredder, SquareCode, SquareFunction, Table2, Timer, icoC, ico } from "./Icon";

/** MongoDB's own databases: listed, but folded under one group at the end */
const MONGO_SYSTEM = ["admin", "config", "local"];
/** db.<name> when the name allows it, db.getCollection("…") otherwise */
export const mongoColl = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) && !["getCollection", "runCommand"].includes(name) ? `db.${name}` : `db.getCollection(${JSON.stringify(name)})`);

/** Redis: an argument as redis-cli reads it, in double quotes when it has spaces or quotes */
export const redisArg = (k: string) => (/^[^\s"'\\]+$/.test(k) && k ? k : `"${k.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`);
/** Redis: the command that reads a key whole, by type */
export const READ_WHOLE: Record<string, (k: string) => string> = {
  string: (k) => `GET ${k}`,
  hash: (k) => `HGETALL ${k}`,
  list: (k) => `LRANGE ${k} 0 -1`,
  set: (k) => `SMEMBERS ${k}`,
  zset: (k) => `ZRANGE ${k} 0 -1 REV WITHSCORES`,
  stream: (k) => `XREVRANGE ${k} + - COUNT 100`,
};
/** Redis: a key's type as a badge, coloured from the connection palette (River, Amethyst, Emerald, Carrot, Sunflower, Turquoise) */
const TYPE_BADGE: Record<string, [string, number]> = { string: ["STR", 1], hash: ["HASH", 4], list: ["LIST", 2], set: ["SET", 3], zset: ["ZSET", 7], stream: ["STREAM", 5] };
export function RedisType({ type }: { type: string }) {
  const [label, n] = TYPE_BADGE[type] ?? [type.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() || "?", 8];
  return (
    <span className="rtype" style={{ "--fg": `var(--proj-${n}-fg)`, "--bg": `var(--proj-${n}-bg)` } as React.CSSProperties} title={type}>
      {label}
    </span>
  );
}

export function Sidebar({ view, onResizeStart }: { view: SideView; onResizeStart: (e: React.MouseEvent) => void }) {
  const { conn } = useCurrent();
  return (
    <aside className="sidebar">
      <div className="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide" onMouseDown={onResizeStart} />
      {view === "schema" ? conn?.engine === "redis" ? <RedisSide /> : <SchemaSide /> : view === "history" ? <HistorySide /> : <SavedSide />}
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

  const mongo = engine === "mongo";
  // MongoDB: a collection's menu. Drop opens db.x.drop() in a query tab, behind the write guard, never run here.
  const collMenu = (db: string, name: string, view: boolean): MenuItem[] => [
    { label: "Open documents", icon: <Braces {...ico} />, run: () => st.openTable(db, name) },
    { label: "New query on this collection", icon: <SquareCode {...ico} />, run: () => (db !== session.database ? void st.setDatabase(db).then(() => st.newQueryTab(`${mongoColl(name)}.find({})\n`)) : st.newQueryTab(`${mongoColl(name)}.find({})\n`)) },
    { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(name) },
    { label: "Info", icon: <Info {...ico} />, run: () => st.openModal({ kind: "collInfo", connId: id, database: db, collection: name }) },
    { label: "sep", sep: true, run: () => {} },
    { label: view ? "Drop view" : "Drop collection", danger: true, run: () => st.newQueryTab(`${mongoColl(name)}.drop()\n`, "Drop " + name) },
  ];
  const tableMenu = (schema: string, name: string, view: boolean): MenuItem[] => [
    { label: "Open rows", icon: <Table2 {...ico} />, run: () => st.openTable(schema, name) },
    { label: "New query on this table", icon: <SquareCode {...ico} />, run: () => st.newQueryTab(`select *\nfrom ${qualified(schema, name)}\n`) },
    // views declare no keys and are never drawn
    ...(view ? [] : [{ label: "Show diagram", icon: <Network {...ico} />, run: () => st.openDiagram(schema, name) }]),
    { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(name) },
    { label: "sep", sep: true, run: () => {} },
    // never run on the person's behalf: the statement opens in a query tab, behind the write guard
    ...(view ? [] : [{ label: "Truncate", danger: true, run: () => st.newQueryTab(`truncate table ${qualified(schema, name)};\n`, "Truncate " + name) }]),
    { label: "Drop", danger: true, run: () => st.newQueryTab(`drop ${view ? "view" : "table"} ${qualified(schema, name)};\n`, "Drop " + name) },
  ];

  let anyLeaf = false;
  // MongoDB: admin, config and local go last, under System databases, folded until opened
  const sysOpen = !!session.expanded["~system/"] || !!q;
  const ordered = mongo ? [...schemas.filter((x) => !MONGO_SYSTEM.includes(x)), ...schemas.filter((x) => MONGO_SYSTEM.includes(x))] : schemas;
  const renderSchema = (schema: string) => {
    const base = mongo && MONGO_SYSTEM.includes(schema) ? 16 : 0;
    const node = session.tree[schema];
    const open = !!session.expanded[schema] || (!!q && node?.state === "loaded");
    const tables = node?.data?.tables.filter((t) => t.kind !== "view") ?? [];
    const views = node?.data?.tables.filter((t) => t.kind === "view") ?? [];
    const fns = node?.data?.functions ?? [];
    const groups: [string, string, { name: string; est?: number | null; kind: string }[]][] = [
      ["tables", mongo ? "Collections" : "Tables", tables.map((t) => ({ name: t.name, est: t.estimate, kind: t.kind }))],
      ["views", "Views", views.map((t) => ({ name: t.name, kind: "view" }))],
      ...(engine === "sqlite" || mongo ? [] : [["functions", "Functions", fns.map((f) => ({ name: f, kind: "function" }))] as [string, string, { name: string; kind: string }[]]]),
    ];
    const matching = groups.map(([k, l, items]) => [k, l, items.filter((i) => hits(i.name))] as const);
    const count = node?.data ? node.data.tables.length + node.data.functions.length : null;
    if (q && node?.state === "loaded" && !matching.some(([, , items]) => items.length)) return null;
    if (q && node?.state !== "loaded") return null;
    return (
      <div key={schema}>
        <Row
          className={base ? undefined : "collection"}
          indent={base || undefined}
          name={schema}
          items={[
            { label: mongo ? "Refresh database" : "Refresh schema", icon: <RefreshCw {...ico} />, run: () => void st.loadSchema(schema) },
            { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(schema) },
            // ER diagram: SQL engines only (MongoDB declares no foreign keys)
            ...(mongo ? [] : [{ label: "Show diagram", icon: <Network {...ico} />, run: () => st.openDiagram(schema, null) }]),
          ]}
        >
          <button type="button" className="row-main" aria-expanded={open} onClick={() => st.toggle(schema)}>
            {open ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
            <span className="name">{schema}</span>
            {count !== null && <span className="count">({count})</span>}
            {node?.state === "loading" && <span className="spinner" aria-label="Loading" />}
          </button>
        </Row>
        {open && node?.state === "error" && (
          <div className="tree-note err" style={{ "--indent": `${base + 16}px` } as React.CSSProperties}>
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
                <Row indent={base + 16}>
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
                    const Kind = isFn ? SquareFunction : it.kind === "view" ? Eye : mongo ? Braces : Table2;
                    return (
                      <Row
                        key={it.name}
                        indent={base + 40}
                        current={cur}
                        name={it.name}
                        items={isFn ? [{ label: "Copy name", icon: <Copy {...ico} />, run: () => copy(it.name) }] : mongo ? collMenu(schema, it.name, it.kind === "view") : tableMenu(schema, it.name, it.kind === "view")}
                      >
                        <button type="button" className="row-main" onClick={() => (isFn ? copy(it.name) : st.openTable(schema, it.name))} title={isFn ? "Copy the name" : mongo ? `Open the documents of ${it.name}` : `Open the rows of ${it.name}`}>
                          <Kind {...icoC("kind")} />
                          <span className="name">{it.name}</span>
                          {it.est !== undefined && it.est !== null && (
                            <span className="count est" title={mongo ? "Estimated from collection metadata" : "Estimate from table statistics"}>
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
  };
  const userDbs = ordered.filter((x) => !(mongo && MONGO_SYSTEM.includes(x)));
  const sysDbs = mongo ? ordered.filter((x) => MONGO_SYSTEM.includes(x)) : [];
  const body = (
    <>
      {userDbs.map(renderSchema)}
      {sysDbs.length > 0 && (
        <>
          <Row className="collection">
            <button type="button" className="row-main" aria-expanded={sysOpen} onClick={() => st.toggle("~system/")}>
              {sysOpen ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
              <Database {...icoC("folder")} />
              <span className="name">System databases</span>
              <span className="count">({sysDbs.length})</span>
            </button>
          </Row>
          {sysOpen && sysDbs.map(renderSchema)}
        </>
      )}
    </>
  );

  return (
    <>
      <div className="side-head">
        <h2>{mongo ? "Databases" : "Schema"}</h2>
      </div>
      <div className="side-tools">
        <div className="search">
          <Search {...ico} />
          <input
            className="field"
            placeholder={mongo ? "Filter collections" : "Filter tables"}
            aria-label={mongo ? "Filter collections and views" : "Filter tables, views and functions"}
            autoComplete="off"
            spellCheck={false}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button type="button" className="icon-btn icon-btn--outline" title={mongo ? "Refresh databases" : "Refresh schema"} aria-label={mongo ? "Refresh databases" : "Refresh schema"} onClick={() => st.refreshTree()}>
          <RefreshCw {...ico} />
        </button>
      </div>
      <div className="tree">
        {session.status === "opening" && <div className="tree-note">Connecting…</div>}
        {body}
        {q && !anyLeaf && (
          <div className="empty">
            <strong>Nothing matches "{filter.trim()}"</strong>
            <span>{mongo ? "Searches collection and view names in the databases loaded so far." : "Searches table, view and function names in the schemas loaded so far."}</span>
            <button type="button" className="link" onClick={() => setFilter("")}>
              Clear the filter
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Redis: the keys read so far, put into folders on the key separator. A folder's count is of the keys read. */
interface KeyFolder {
  name: string;
  path: string;
  folders: KeyFolder[];
  keys: ScanKey[];
  count: number;
}
function foldKeys(keys: ScanKey[], sep: string): KeyFolder {
  const root: KeyFolder = { name: "", path: "", folders: [], keys: [], count: 0 };
  for (const k of keys) {
    const parts = sep ? k.key.split(sep) : [k.key];
    let at = root;
    at.count++;
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join(sep) + sep;
      let f = at.folders.find((x) => x.path === path);
      if (!f) at.folders.push((f = { name: parts[i] + sep, path, folders: [], keys: [], count: 0 }));
      f.count++;
      at = f;
    }
    at.keys.push(k);
  }
  const sort = (f: KeyFolder) => {
    f.folders.sort((a, b) => a.name.localeCompare(b.name));
    f.keys.sort((a, b) => a.key.localeCompare(b.key));
    f.folders.forEach(sort);
  };
  sort(root);
  return root;
}

/**
 * Redis: the connection's database, its keys read with SCAN (never KEYS), about Keys per scan at a time and more
 * only on Scan more. TYPE and PTTL come with each read, so the badges and timers cost nothing more. The filter
 * narrows the keys read so far; Enter scans the database for keys that match it.
 */
function RedisSide() {
  const { id, conn, session } = useCurrent();
  const [filter, setFilter] = useState("");
  const [ttlOnly, setTtlOnly] = useState(false);
  const st = useStore.getState();
  const keys = session?.keys;
  const sep = conn?.keySep ?? ":";
  const q = filter.trim().toLowerCase();
  const shown = useMemo(() => (keys?.keys ?? []).filter((k) => (!ttlOnly || k.ttlMs >= 0) && (!q || k.key.toLowerCase().includes(q))), [keys, ttlOnly, q]);
  const tree = useMemo(() => foldKeys(shown, sep), [shown, sep]);
  if (!id || !conn || !session) return null;
  const activeTab = session.tabs.find((t) => t.id === session.activeTabId);
  const db = `db${session.database || "0"}`;
  const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => st.showToast(`Copied ${text}`));
  // folders open on a click; a filter or Expiring only opens every one that holds a match
  const opened = (path: string) => !!q || ttlOnly || !!session.expanded[`k/${path}`];
  const read = keys?.readAt ? clockOf(keys.readAt) : "";
  const scanFor = () => {
    const t = filter.trim();
    // a pattern of its own, or the text anywhere in the key
    const pattern = !t ? "" : /[*?[]/.test(t) ? t : `*${t}*`;
    setFilter("");
    void st.scanKeys({ pattern });
  };
  const keyMenu = (k: ScanKey): MenuItem[] => [
    { label: "Open key", icon: <Key {...ico} />, run: () => st.openKey(k.key) },
    { label: "New command on this key", icon: <SquareCode {...ico} />, run: () => st.newQueryTab(`${(READ_WHOLE[k.type] ?? ((x: string) => `TYPE ${x}`))(redisArg(k.key))}\n`, k.key) },
    { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(k.key) },
    { label: "Info", icon: <Info {...ico} />, run: () => st.openModal({ kind: "keyInfo", connId: id, key: k.key }) },
    { label: "sep", sep: true, run: () => {} },
    // never run on the person's behalf: DEL opens in a query tab, behind the write guard
    { label: "Delete key", danger: true, icon: <Shredder {...ico} />, run: () => st.newQueryTab(`DEL ${redisArg(k.key)}\n`, "Delete " + k.key) },
  ];
  // inside a folder a key shows the part after the folder's path; the full key is on hover
  const leaf = (k: ScanKey, indent: number, folder = "") => {
    return (
      <Row key={k.key} indent={indent} current={activeTab?.kind === "key" && activeTab.key === k.key} name={k.key} items={keyMenu(k)}>
        <button type="button" className="row-main" title={k.key} onClick={() => st.openKey(k.key)}>
          <RedisType type={k.type} />
          <span className="name">{folder && k.key.startsWith(folder) ? k.key.slice(folder.length) || k.key : k.key}</span>
          {k.ttlMs >= 0 && (
            <span className="rttl" title={`Expires in ${ttlLeft(k.ttlMs)}, as of the scan at ${read}`}>
              <span className="visually-hidden">Expires in {ttlLeft(k.ttlMs)}</span>
              <Timer {...ico} />
            </span>
          )}
        </button>
      </Row>
    );
  };
  const folder = (f: KeyFolder, indent: number): ReactNode => {
    const open = opened(f.path);
    return (
      <div key={f.path}>
        <Row indent={indent}>
          <button type="button" className="row-main" aria-expanded={open} onClick={() => st.toggle(`k/${f.path}`)}>
            {open ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
            <Folder {...icoC("folder")} />
            <span className="name">{f.name}</span>
            <span className="count">({f.count})</span>
          </button>
        </Row>
        {open && (
          <>
            {f.folders.map((x) => folder(x, indent + 16))}
            {f.keys.map((k) => leaf(k, indent + 24, f.path))}
          </>
        )}
      </div>
    );
  };
  const dbOpen = !session.expanded["k/~db"];
  const n = keys?.keys.length ?? 0;
  const expiring = (keys?.keys ?? []).filter((k) => k.ttlMs >= 0).length;
  const more = keys && keys.cursor !== "0";

  return (
    <>
      <div className="side-head">
        <h2>Keys</h2>
      </div>
      <div className="side-tools">
        <div className="search">
          <Search {...ico} />
          <input
            className="field"
            placeholder="Filter keys"
            aria-label="Filter keys"
            aria-describedby="key-filter-h"
            autoComplete="off"
            spellCheck={false}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scanFor()}
          />
        </div>
        <button type="button" className="icon-btn icon-btn--outline ttl-only" aria-pressed={ttlOnly} title={ttlOnly ? "Show every key" : "Show only keys that expire"} aria-label="Expiring keys only" onClick={() => setTtlOnly(!ttlOnly)}>
          <Timer {...ico} />
        </button>
        <button type="button" className="icon-btn icon-btn--outline" title="Scan again from the start" aria-label="Scan keys again" onClick={() => void st.scanKeys()}>
          <RefreshCw {...ico} />
        </button>
      </div>
      <p className="sr-only" id="key-filter-h">
        Narrows the keys read so far. Enter scans the database for keys that match.
      </p>
      <div className="tree">
        {session.status === "opening" && <div className="tree-note">Connecting…</div>}
        {session.status === "open" && (
          <Row className="collection" name={db} items={[{ label: "Scan again", icon: <RefreshCw {...ico} />, run: () => void st.scanKeys() }, { label: "Copy name", icon: <Copy {...ico} />, run: () => copy(db) }]}>
            <button type="button" className="row-main" aria-expanded={dbOpen} onClick={() => st.toggle("k/~db")}>
              {dbOpen ? <ChevronDown {...icoC("caret")} /> : <ChevronRight {...icoC("caret")} />}
              <span className="name">{db}</span>
              {keys && <span className="count" title="DBSIZE">({keys.total.toLocaleString()})</span>}
              {keys?.state === "loading" && <span className="spinner" aria-label="Loading" />}
            </button>
          </Row>
        )}
        {dbOpen && keys?.state === "error" && (
          <div className="tree-note err" style={{ "--indent": "16px" } as React.CSSProperties}>
            {keys.error}
          </div>
        )}
        {dbOpen && keys && (
          <>
            {tree.folders.map((f) => folder(f, 16))}
            {tree.keys.map((k) => leaf(k, 24))}
            {keys.state === "loaded" && !keys.total && <div className="tree-note">{db} has no keys</div>}
          </>
        )}
        {(q || ttlOnly) && keys?.state === "loaded" && n > 0 && !shown.length && (
          <div className="empty">
            <strong>{q ? `Nothing matches "${filter.trim()}"` : "No key read so far expires"}</strong>
            <span>{q ? `Searches the keys read so far. Press Enter to scan ${db} for keys that match.` : more ? "Scan more to read more keys." : "None of the keys has a TTL."}</span>
            {q && (
              <button type="button" className="link" onClick={() => setFilter("")}>
                Clear the filter
              </button>
            )}
          </div>
        )}
      </div>
      {/* what the scan has read, at the sidebar's foot whatever the tree's length */}
      {keys && (
        <div className="side-foot">
          {keys.pattern && (
            <div className="scan-more">
              <span>
                Keys matching <code>{keys.pattern}</code>
              </span>
              <button type="button" className="link" onClick={() => void st.scanKeys({ pattern: "" })}>
                Show all
              </button>
            </div>
          )}
          {keys.state !== "error" && (
            <div className="scan-more">
              <span>
                {ttlOnly
                  ? `${expiring} of the ${n} keys read expire`
                  : more
                    ? `${n.toLocaleString()} of ${keys.total.toLocaleString()} keys read`
                    : keys.pattern
                      ? `${n.toLocaleString()} key${n === 1 ? "" : "s"} match`
                      : `All ${n.toLocaleString()} key${n === 1 ? "" : "s"} read`}
              </span>
              {more && (
                <button type="button" className="link" disabled={keys.state === "loading"} title="SCAN from where the last call stopped" onClick={() => void st.scanKeys({ more: true })}>
                  Scan more
                </button>
              )}
            </div>
          )}
        </div>
      )}
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
              final: true,
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
                  <span className={`hstatus ${h.status === "ok" ? "rows" : "fail"}`}>{h.status === "ok" ? (h.rows ?? "ok") : h.status === "error" ? "error" : "cancelled"}</span>
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
      icon: <Shredder {...ico} />,
      run: () =>
        st.openModal({
          kind: "confirm",
          title: `Delete ${s.name}?`,
          message: "The saved query is removed from ypacapy.db.",
          final: true,
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
