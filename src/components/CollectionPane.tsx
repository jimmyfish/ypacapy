import { useEffect, useMemo } from "react";
import { DEFAULT_ROW_LIMIT, useCurrent, useStore } from "../store";
import { estimate } from "../lib/cells";
import { docsToSet, fieldsOf, shellPretty } from "../lib/bson";
import { duration } from "../lib/time";
import type { TableTab } from "../types";
import { ErrorState, RunGroup } from "./QueryPane";
import { ResultGrid, ShellText } from "./ResultGrid";
import { mongoColl } from "./Sidebar";
import { ChevronLeft, ChevronRight, Key, Link, SquareCode, ico } from "./Icon";

/** a query bar box that grows with its text, one line to eight, then scrolls */
function Box({ id, label, value, placeholder, invalid, onChange, className = "" }: { id: string; label: string; value: string; placeholder: string; invalid?: boolean; onChange: (v: string) => void; className?: string }) {
  const rows = Math.min(8, Math.max(1, value.split("\n").length));
  return (
    <label className={`mq-field${className ? " " + className : ""}`} htmlFor={id}>
      <span className="mq-k">{label}</span>
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
  const est = session?.tree[tab.schema]?.data?.tables.find((t) => t.name === tab.table)?.estimate;
  const as = tab.as ?? "table";

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
  const docs = set?.docs ?? [];
  const n = docs.length;
  const from = tab.offset + 1;
  const to = tab.offset + n;
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

  const seg = (
    <span className="seg" role="group" aria-label="Show documents as">
      <button type="button" aria-pressed={as === "table"} onClick={() => put({ as: "table" })}>
        Table
      </button>
      <button type="button" aria-pressed={as === "json"} onClick={() => put({ as: "json" })}>
        JSON
      </button>
    </span>
  );
  const lead = (
    <span className="muted">
      Documents {from} to {to}, {tab.sort?.trim() ? "sorted" : "in stored order"}
    </span>
  );
  const foot = (
    <div className="grid-foot">
      <span>
        {from} to {to}
      </span>
      <button type="button" className="icon-btn" aria-label="Previous page" disabled={tab.offset === 0} onClick={() => read(Math.max(0, tab.offset - limit))}>
        <ChevronLeft {...ico} />
      </button>
      {/* no totals: a full page means there may be more */}
      <button type="button" className="icon-btn" aria-label="Next page" disabled={n < limit} onClick={() => read(tab.offset + limit)}>
        <ChevronRight {...ico} />
      </button>
    </div>
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
  else if (set && n > 0)
    docsBody =
      as === "table" ? (
        <div className="state">
          <ResultGrid set={set} label={`Documents of ${tab.table}`} exportName={tab.table} lead={<>{lead}{seg}</>} foot={foot} />
        </div>
      ) : (
        <div className="state">
          <div className="res-tools">
            {lead}
            {seg}
          </div>
          <pre className="code docs" tabIndex={0} aria-label={`Documents of ${tab.table}`}>
            {docs.map((d, i) =>
              shellPretty(d)
                .split("\n")
                .map((line, j) => (
                  <span key={`${i}:${j}`} className={`l${j === 0 && i ? " doc-start" : ""}`}>
                    <ShellText s={line} />
                  </span>
                )),
            )}
          </pre>
          {foot}
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
          ) : tab.offset > 0 ? (
            <>
              <strong>No more documents</strong>
              <button type="button" className="link" onClick={() => read(0)}>
                Back to the first page
              </button>
            </>
          ) : (
            <strong>{tab.table} has no documents</strong>
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
          From the {n} document{n === 1 ? "" : "s"} on this page. ypacapy does not sample the collection, so a field only on other documents is not here.
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
          <Box id={`mq-f-${tab.id}`} label="filter" className="mq-filter" placeholder="{ field: value }" value={tab.where} invalid={bad === "filter"} onChange={(v) => put({ where: v })} />
        </div>
        <div className="mq-actions">
          <button type="button" className="btn btn--quiet" title="Back to the empty filter" onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn btn--quiet" title={`Open this query as ${mongoColl(tab.table)}.find(…) in a new query tab`} onClick={console_}>
            <SquareCode {...ico} />
            Open in console
          </button>
          <RunGroup busy={busy} disabled={session.status !== "open"} onRun={() => read()} kbd="⌘↵" />
        </div>
        <div className="mq-row mq-opts">
          <Box id={`mq-p-${tab.id}`} label="project" placeholder="{ field: 0 }" value={tab.project ?? ""} invalid={bad === "project"} onChange={(v) => put({ project: v })} />
          <Box id={`mq-s-${tab.id}`} label="sort" placeholder="{ field: -1 }" value={tab.sort ?? ""} invalid={bad === "sort"} onChange={(v) => put({ sort: v })} />
        </div>
        <div className="mq-paging">
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
              <span className="n" title="Estimate from collection metadata, not a count">
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
