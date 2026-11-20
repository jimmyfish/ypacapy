import "./CollectionPane.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_ROW_LIMIT, uid, useCurrent, useStore } from "../store";
import { api } from "../lib/api";
import { estimate } from "../lib/cells";
import { docsToSet, fieldsOf } from "../lib/bson";
import { duration } from "../lib/time";
import type { ColMeta, TableTab } from "../types";
import { ErrorState, RunGroup } from "./QueryPane";
import { RowPick } from "./TablePane";
import { DocsActions, ResultGrid } from "./ResultGrid";
import { DocCards } from "./DocCards";
import { mongoColl } from "./Sidebar";
import { Braces, ChevronLeft, ChevronRight, Funnel, Key, Link, Plus, RefreshCw, RotateCcw, SlidersHorizontal, SquareCode, Table2, ico, icoC } from "./Icon";

/** a query bar box that grows with its text, one line to eight, then scrolls */
/** icon: stands in for the label when the bar is narrow (the filter's funnel) */
function Box({ id, label, icon, value, placeholder, invalid, onChange, className = "" }: { id: string; label: string; icon?: ReactNode; value: string; placeholder: string; invalid?: boolean; onChange: (v: string) => void; className?: string }) {
  const rows = Math.min(8, Math.max(1, value.split("\n").length));
  return (
    <label className={`mq-field${className ? " " + className : ""}`} htmlFor={id}>
      <span className="mq-k" title={icon ? label[0].toUpperCase() + label.slice(1) : undefined}>
        {icon}
        {icon ? <span className="mq-k-t">{label}</span> : label}
      </span>
      <textarea
        id={id}
        className="mq-in"
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * A MongoDB collection: its documents under the query bar (find(filter, project).sort().skip().limit(), no sort
 * it was not given), the fields seen on this page, and its indexes. Enter in a box adds a line; ⌘↵ runs.
 */
export function CollectionPane({ tab }: { tab: TableTab }) {
  const { conn, session } = useCurrent();
  const appLimit = useStore((s) => s.settings.rowLimit);
  const rowLimit = conn?.rowLimit || appLimit || DEFAULT_ROW_LIMIT;
  const limit = Number(tab.limit) > 0 ? Number(tab.limit) : rowLimit;
  const st = useStore.getState();
  const busy = tab.run.status === "running";
  const o = tab.run.outcome;
  const raw = o?.kind === "done" ? o.sets[o.sets.length - 1] : undefined;
  const set = useMemo(() => (raw?.docs ? docsToSet(raw.docs, raw.truncated) : undefined), [raw]);
  const fields = useMemo(() => (set?.docs ? fieldsOf(set.docs) : []), [set]);
  // an empty page past the first: Table keeps the fields of the last page that had documents (an empty page has none)
  const lastCols = useRef<{ id: string; cols: ColMeta[] }>(undefined);
  if (set?.rows.length) lastCols.current = { id: tab.id, cols: set.columns };
  const est = session?.tree[tab.schema]?.data?.tables.find((t) => t.name === tab.table)?.estimate;
  // JSON first: a MongoDB collection holds documents
  const as = tab.as ?? "json";
  // Project, Sort, Skip and Limit start folded under Options; the count says how many are set while folded
  const [optsOpen, setOptsOpen] = useState(false);
  // Add document: a key the JSON view takes to open an empty new document; drafting keeps the list up for it
  const [addKey, setAddKey] = useState(0);
  const [drafting, setDrafting] = useState(false);
  // the pager's total with a filter: one countDocuments, run when asked, kept for that filter
  const [count, setCount] = useState<{ filter: string; n?: number; busy?: boolean; err?: string } | null>(null);
  // a read of the page (Run, a page turn, a write's re-read) may follow changed data: the count is asked for again
  useEffect(() => setCount((c) => (c?.busy ? c : null)), [tab.run.runId]);

  // ⌘↵ reads the documents again, from any box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "Enter" || useStore.getState().modal) return;
      e.preventDefault();
      void st.readTable(tab.id, { offset: tab.offset });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!conn || !session) return null;
  const read = (offset = tab.offset) => void st.readTable(tab.id, { offset });
  const put = (patch: Partial<TableTab>) => st.updateTab(tab.id, patch);
  // which box Rust could not read, from its title ("The sort is not valid")
  const bad = o?.kind === "error" && !o.lost ? /^The (filter|project|sort) is not valid/.exec(o.title)?.[1] : undefined;
  // a box Rust could not read opens the options, so its red outline shows
  const showOpts = optsOpen || bad === "project" || bad === "sort";
  const docs = set?.docs ?? [];
  const n = docs.length;
  const from = tab.offset + 1;
  const to = tab.offset + n;
  const emptyPage = o?.kind === "done" && tab.offset > 0 && n === 0;
  const view = tab.view;
  const setView = (v: TableTab["view"]) => put({ view: v });

  const console_ = () => {
    const parts = [`${mongoColl(tab.table)}.find(${tab.where.trim() || "{}"}${tab.project?.trim() ? `, ${tab.project.trim()}` : ""})`];
    if (tab.sort?.trim()) parts.push(`.sort(${tab.sort.trim()})`);
    if (tab.offset) parts.push(`.skip(${tab.offset})`);
    parts.push(`.limit(${limit})`);
    const text = parts.join("") + "\n";
    if (tab.schema !== session.database) void st.setDatabase(tab.schema).then(() => useStore.getState().newQueryTab(text, tab.table));
    else st.newQueryTab(text, tab.table);
  };
  const reset = () => {
    put({ where: "", project: "", sort: "", limit: "" });
    setTimeout(() => void useStore.getState().readTable(tab.id, { offset: 0 }), 0);
  };

  const optsSet = [tab.project?.trim(), tab.sort?.trim(), tab.offset > 0, tab.limit && Number(tab.limit) !== rowLimit].filter(Boolean).length;
  const seg = (
    <span className="seg seg--lead" role="group" aria-label="Show documents as">
      <button type="button" aria-pressed={as === "json"} onClick={() => put({ as: "json" })}>
        <Braces {...ico} />
        JSON
      </button>
      <button type="button" aria-pressed={as === "table"} onClick={() => put({ as: "table" })}>
        <Table2 {...ico} />
        Table
      </button>
    </span>
  );
  // The pager, as Compass has it: "1 – 20 of N". No filter: N is the estimate from collection metadata (~), never
  // counted. A filter: N waits for "count", one countDocuments(filter) the user asks for, kept until the filter changes.
  const filterText = tab.where.trim();
  const noFilter = !filterText || /^\{\s*\}$/.test(filterText);
  const counted = count && count.filter === filterText ? count : null;
  const runCount = async () => {
    setCount({ filter: filterText, busy: true });
    const out = await api
      .runQuery({ runId: uid(), connId: conn.id, database: tab.schema, sql: `${mongoColl(tab.table)}.countDocuments(${filterText})`, addLimit: false, history: false })
      .catch((e) => ({ kind: "error" as const, title: String(e), message: "" }));
    const v = out.kind === "done" ? (out.sets[out.sets.length - 1]?.docs?.[0] as { count?: unknown } | undefined)?.count : undefined;
    const num = typeof v === "number" ? v : v && typeof v === "object" ? Number(Object.values(v)[0]) : NaN;
    setCount(Number.isFinite(num) ? { filter: filterText, n: num } : { filter: filterText, err: out.kind === "error" ? out.title : "The count did not come back" });
  };
  const total = noFilter ? (
    est !== null && est !== undefined ? (
      <span className="pager-est" title="Estimated from collection metadata, not counted">
        ~{est.toLocaleString()}
      </span>
    ) : null
  ) : counted?.busy ? (
    <span className="spinner spinner--sm" aria-label="Counting" />
  ) : counted?.n !== undefined ? (
    counted.n.toLocaleString()
  ) : (
    <button type="button" className="link pager-count" title={counted?.err ?? `Count the documents this filter matches: one countDocuments on ${conn.name}`} onClick={() => void runCount()}>
      {counted?.err ? "count failed, again?" : "count"}
    </button>
  );
  const pager = (
    <div className="pager" role="group" aria-label="Pages">
      <RowPick tab={tab} rowLimit={rowLimit} label="Documents" />
      <span className="pager-n" aria-live="polite">
        {n ? `${from} – ${to}` : "No documents"}
        {n > 0 && total !== null && <> of {total}</>}
      </span>
      <button type="button" className="icon-btn" title="Read this page again  ⌘↵" aria-label="Refresh" disabled={busy || session.status !== "open"} onClick={() => read()}>
        <RefreshCw {...ico} />
      </button>
      <button type="button" className="icon-btn" title="Previous page" aria-label="Previous page" disabled={tab.offset === 0} onClick={() => read(Math.max(0, tab.offset - limit))}>
        <ChevronLeft {...ico} />
      </button>
      {/* nothing is counted: Next stays on until a page comes back empty */}
      <button type="button" className="icon-btn" title="Next page" aria-label="Next page" disabled={n === 0} onClick={() => read(tab.offset + limit)}>
        <ChevronRight {...ico} />
      </button>
    </div>
  );
  const add = () => {
    if (as !== "json") put({ as: "json" });
    setAddKey((k) => k + 1);
  };
  const addBtn = (
    <button type="button" className="btn btn--quiet res-add" title="Add a document" aria-label="Add a document" onClick={add}>
      <Plus {...ico} />
      <span className="btn-label">Add document</span>
    </button>
  );

  let docsBody;
  if (busy)
    docsBody = (
      <div className="state">
        <div className="empty">
          <span className="spinner" />
          <strong>Reading {tab.table}</strong>
          <span>
            {conn.name}, {tab.schema}.{tab.table}
          </span>
        </div>
      </div>
    );
  else if (o?.kind === "error") docsBody = <ErrorState o={o} onReconnect={() => void st.reconnect(conn.id).then(() => st.readTable(tab.id))} />;
  else if (o?.kind === "cancelled")
    docsBody = (
      <div className="state">
        <div className="empty">
          <strong>{o.timeout ? "Stopped by the statement timeout" : "Cancelled"}</strong>
        </div>
      </div>
    );
  else if (set && (n > 0 || drafting || addKey > 0 || emptyPage))
    docsBody =
      as === "table" && (n > 0 || emptyPage) ? (
        <div className="state">
          <ResultGrid set={n > 0 ? set : { ...set, columns: lastCols.current?.id === tab.id ? lastCols.current.cols : [] }} label={`Documents of ${tab.table}`} exportName={tab.table} lead={<>{seg}{addBtn}</>} trail={pager} />
        </div>
      ) : (
        <div className="state">
          <div className="res-tools">
            {seg}
            {addBtn}
            <DocsActions set={set} exportName={tab.table} />
            {pager}
          </div>
          <DocCards
            docs={docs}
            label={`Documents of ${tab.table}`}
            edit={{ tabId: tab.id, collection: tab.table, projected: !!tab.project?.trim() }}
            addKey={addKey}
            onAdded={() => setAddKey(0)}
            onDrafting={setDrafting}
          />
        </div>
      );
  else if (o?.kind === "done")
    docsBody = (
      <div className="state">
        <div className="empty">
          {tab.where.trim() && tab.where.trim() !== "{}" ? (
            <>
              <strong>No document in {tab.table} matches this filter</strong>
              <button type="button" className="link" onClick={reset}>
                Clear the filter
              </button>
            </>
          ) : (
            <>
              <strong>{tab.table} has no documents</strong>
              <button type="button" className="link" onClick={add}>
                Add a document
              </button>
            </>
          )}
        </div>
      </div>
    );

  const info = tab.info;
  const structure =
    view === "columns" ? (
      <div className="structure">
        <h3>Fields</h3>
        <p className="fields-note">
          From the {n} document{n === 1 ? "" : "s"} on this page. Capy doesn't dig through the whole collection, so a field that lives only on other documents isn't here.
        </p>
        {fields.length ? (
          <div className="grid-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Types seen</th>
                  <th scope="col">In documents</th>
                  <th scope="col">Index</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const ix = info?.indexes.find((i) => new RegExp(`^\\{ "?${f.path.replace(/[.$]/g, "\\$&")}"?:`).test(i.columns));
                  const parts = f.path.split(".");
                  return (
                    <tr key={f.path}>
                      <td className="fpath">
                        {parts.slice(0, -1).map((p, i) => (
                          <span key={i} className="fp-parent">
                            {p}.
                          </span>
                        ))}
                        {parts[parts.length - 1]}
                      </td>
                      <td>{f.types}</td>
                      <td className="num">{f.count === n ? `all ${n}` : `${f.count} of ${n}`}</td>
                      <td>
                        {ix && (
                          <span className="key">
                            {ix.primary ? <Key {...ico} /> : <Link {...ico} />}
                            {ix.name}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Read some documents first: Fields come from the page.</p>
        )}
      </div>
    ) : !info ? (
      <div className="state">
        {tab.infoError ? (
          <div className="error-box">
            <strong>Could not read the indexes</strong>
            <span className="msg">{tab.infoError}</span>
          </div>
        ) : (
          <div className="empty">
            <span className="spinner" />
            <strong>Reading the indexes</strong>
          </div>
        )}
      </div>
    ) : (
      <div className="structure">
        <h3>Indexes</h3>
        {info.indexes.length ? (
          <div className="grid-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Keys</th>
                  <th scope="col">Unique</th>
                  <th scope="col">Options</th>
                </tr>
              </thead>
              <tbody>
                {info.indexes.map((i) => (
                  <tr key={i.name}>
                    <td>{i.name}</td>
                    <td className="mono">{i.columns}</td>
                    <td>{i.unique ? "yes" : "no"}</td>
                    <td className="mono">{i.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No indexes. A view has none of its own.</p>
        )}
      </div>
    );

  const ms = o && "ms" in o ? o.ms : null;
  return (
    <div className="work-body">
      <div className="mq-bar" role="group" aria-label={`Query for ${tab.table}`}>
        <div className="mq-row">
          <Box id={`mq-f-${tab.id}`} label="filter" icon={<Funnel {...icoC("mq-k-ico")} />} className="mq-filter" placeholder="{ field: value }" value={tab.where} invalid={bad === "filter"} onChange={(v) => put({ where: v })} />
        </div>
        <div className="mq-actions">
          {/* narrow, the buttons drop their words for icons (styles: .mq-bar); aria-label keeps each one's name */}
          <button type="button" className="btn btn--quiet mq-more mq-ico-btn" aria-label="Options" aria-expanded={showOpts} aria-controls={`mq-opts-${tab.id} mq-paging-${tab.id}`} title="Project, sort, skip and limit" onClick={() => setOptsOpen(!showOpts)}>
            <ChevronRight {...icoC("mq-more-ico")} />
            <SlidersHorizontal {...icoC("mq-narrow-ico")} />
            <span className="btn-label">Options</span>
            {!showOpts && optsSet > 0 && (
              <span className="mq-set" title={`${optsSet} option${optsSet > 1 ? "s" : ""} set`}>
                {optsSet}
              </span>
            )}
          </button>
          <button type="button" className="btn btn--quiet mq-ico-btn" title="Back to the empty filter" aria-label="Reset" onClick={reset}>
            <RotateCcw {...icoC("mq-narrow-ico")} />
            <span className="btn-label">Reset</span>
          </button>
          <button type="button" className="btn btn--quiet mq-ico-btn" title={`Open this query as ${mongoColl(tab.table)}.find(…) in a new query tab`} aria-label="Open as a query" onClick={console_}>
            <SquareCode {...ico} />
            <span className="btn-label">Open as a query</span>
          </button>
          <RunGroup busy={busy} disabled={session.status !== "open"} onRun={() => read()} kbd="⌘↵" />
        </div>
        <div className="mq-row mq-opts" id={`mq-opts-${tab.id}`} hidden={!showOpts}>
          <Box id={`mq-p-${tab.id}`} label="project" placeholder="{ field: 0 }" value={tab.project ?? ""} invalid={bad === "project"} onChange={(v) => put({ project: v })} />
          <Box id={`mq-s-${tab.id}`} label="sort" placeholder="{ field: -1 }" value={tab.sort ?? ""} invalid={bad === "sort"} onChange={(v) => put({ sort: v })} />
        </div>
        <div className="mq-paging" id={`mq-paging-${tab.id}`} hidden={!showOpts}>
          <label className="mq-field mq-num">
            <span className="mq-k">skip</span>
            <input
              className="mq-in"
              inputMode="numeric"
              placeholder="0"
              spellCheck={false}
              autoComplete="off"
              value={tab.offset ? String(tab.offset) : ""}
              onChange={(e) => put({ offset: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              onKeyDown={(e) => e.key === "Enter" && read()}
            />
          </label>
          <label className="mq-field mq-num">
            <span className="mq-k">limit</span>
            <input
              className="mq-in"
              inputMode="numeric"
              placeholder={String(rowLimit)}
              spellCheck={false}
              autoComplete="off"
              value={tab.limit ?? ""}
              onChange={(e) => put({ limit: e.target.value.replace(/\D/g, "") })}
              onKeyDown={(e) => e.key === "Enter" && read(0)}
            />
          </label>
        </div>
      </div>
      <div className="req-title">
        <span className="name name--static">{tab.table}</span>
        <span className="path">
          {conn.name} / {tab.schema}
        </span>
      </div>
      <section className="response" aria-label={tab.table}>
        <nav className="subtabs" aria-label="Collection">
          <button type="button" className="subtab" aria-pressed={view === "rows"} onClick={() => setView("rows")}>
            Documents
            {est !== null && est !== undefined && (
              <span className="n" title="Estimated from collection metadata">
                {estimate(est)}
              </span>
            )}
          </button>
          <button type="button" className="subtab" aria-pressed={view === "columns"} onClick={() => setView("columns")}>
            Fields{set && <span className="n" title="Seen on this page">{fields.length}</span>}
          </button>
          <button type="button" className="subtab" aria-pressed={view === "indexes"} onClick={() => setView("indexes")}>
            Indexes{info && <span className="n">{info.indexes.length}</span>}
          </button>
          <span className="push meta">
            <span className="dim">{busy ? "reading" : ms !== null ? duration(ms) : ""}</span>
          </span>
        </nav>
        {view === "rows" ? docsBody : structure}
      </section>
    </div>
  );
}
