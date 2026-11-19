import { useEffect, useMemo } from "react";
import { DEFAULT_ROW_LIMIT, useCurrent, useStore } from "../store";
import { estimate } from "../lib/cells";
import { tableSelect } from "../lib/sql";
import { targetOf } from "../lib/edit";
import { duration } from "../lib/time";
import type { TableTab } from "../types";
import { ErrorState, RunGroup } from "./QueryPane";
import { ResultGrid, type ColKey, type GridEdit } from "./ResultGrid";
import { ChevronLeft, ChevronRight, Key, Link, ico } from "./Icon";

/** A table: its rows under a where filter (select … limit, no order by), its columns, its indexes and keys. */
export function TablePane({ tab }: { tab: TableTab }) {
  const { conn, session } = useCurrent();
  const appLimit = useStore((s) => s.settings.rowLimit);
  const limit = conn?.rowLimit || appLimit || DEFAULT_ROW_LIMIT;
  const st = useStore.getState();
  const busy = tab.run.status === "running";
  const o = tab.run.outcome;
  const set = o?.kind === "done" ? o.sets[o.sets.length - 1] : undefined;
  const est = session?.tree[tab.schema]?.data?.tables.find((t) => t.name === tab.table)?.estimate;
  const keys = useMemo(() => {
    const k: Record<string, ColKey> = {};
    for (const c of tab.info?.columns ?? []) k[c.name] = { primary: c.primary, references: c.references };
    return k;
  }, [tab.info]);

  const engine = conn?.engine;
  const target = useMemo(() => {
    if (!engine || !set) return null;
    if (tab.infoError) return `Could not read the columns of ${tab.table}: ${tab.infoError}`;
    if (!tab.info) return null;
    return targetOf(engine, tab.schema, tab.table, "*", set, tab.info.columns);
  }, [engine, set, tab.info, tab.infoError, tab.schema, tab.table]);

  // ⌘↵ re-reads the rows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "Enter" || useStore.getState().modal) return;
      e.preventDefault();
      void st.readTable(tab.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!conn || !session) return null;
  const path = [conn.name, session.database, conn.engine === "mysql" ? "" : tab.schema].filter(Boolean).join(" / ");
  const rows = set?.rows.length ?? 0;
  const from = tab.offset + 1;
  const to = tab.offset + rows;
  const view = tab.view;
  const setView = (v: TableTab["view"]) => st.updateTab(tab.id, { view: v });
  const edit: GridEdit = {
    target,
    connId: conn.id,
    connName: conn.name,
    database: session.database,
    key: `${tab.id}:0`,
    onSaved: (rs) => o?.kind === "done" && st.replaceSet(tab.id, o.sets.length - 1, rs),
  };

  let rowsBody;
  if (busy)
    rowsBody = (
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
  else if (o?.kind === "error") rowsBody = <ErrorState o={o} onReconnect={() => void st.reconnect(conn.id).then(() => st.readTable(tab.id))} />;
  else if (o?.kind === "cancelled")
    rowsBody = (
      <div className="state">
        <div className="empty">
          <strong>{o.timeout ? "Stopped by the statement timeout" : "Cancelled"}</strong>
        </div>
      </div>
    );
  else if (set && rows > 0)
    rowsBody = (
      <div className="state">
        <ResultGrid
          set={set}
          keys={keys}
          edit={edit}
          label={`Rows of ${tab.table}`}
          exportName={tab.table}
          lead={
            <span className="muted">
              Rows {from} to {to}
            </span>
          }
          foot={
            <div className="grid-foot">
              <span>
                {from} to {to}
              </span>
              <button type="button" className="icon-btn" aria-label="Previous page" disabled={tab.offset === 0} onClick={() => void st.readTable(tab.id, { offset: Math.max(0, tab.offset - limit) })}>
                <ChevronLeft {...ico} />
              </button>
              {/* no totals: a full page means there may be more */}
              <button type="button" className="icon-btn" aria-label="Next page" disabled={rows < limit} onClick={() => void st.readTable(tab.id, { offset: tab.offset + limit })}>
                <ChevronRight {...ico} />
              </button>
            </div>
          }
        />
      </div>
    );
  else if (o?.kind === "done")
    rowsBody = (
      <div className="state">
        <div className="empty">
          {tab.where.trim() ? (
            <>
              <strong>No row of {tab.table} matches this filter</strong>
              <span>The where clause is sent as you typed it.</span>
              <button
                type="button"
                className="link"
                onClick={() => {
                  st.updateTab(tab.id, { where: "" });
                  setTimeout(() => void useStore.getState().readTable(tab.id), 0);
                }}
              >
                Clear the filter
              </button>
            </>
          ) : tab.offset > 0 ? (
            <>
              <strong>No more rows</strong>
              <button type="button" className="link" onClick={() => void st.readTable(tab.id, { offset: 0 })}>
                Back to the first page
              </button>
            </>
          ) : (
            <strong>{tab.table} has no rows</strong>
          )}
        </div>
      </div>
    );

  const info = tab.info;
  const structure =
    view === "rows" ? null : !info ? (
      <div className="state">
        {tab.infoError ? (
          <div className="error-box">
            <strong>Could not read the catalog</strong>
            <span className="msg">{tab.infoError}</span>
          </div>
        ) : (
          <div className="empty">
            <span className="spinner" />
            <strong>Reading the catalog</strong>
          </div>
        )}
      </div>
    ) : view === "columns" ? (
      <div className="structure">
        <h3>Columns</h3>
        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th scope="col">Column</th>
                <th scope="col">Type</th>
                <th scope="col">Nullable</th>
                <th scope="col">Default</th>
                <th scope="col">Key</th>
              </tr>
            </thead>
            <tbody>
              {info.columns.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{c.nullable ? "yes" : "no"}</td>
                  {c.default === null ? <td className="null">none</td> : <td>{c.default}</td>}
                  <td>
                    {c.primary ? (
                      <span className="key">
                        <Key {...ico} />
                        Primary
                      </span>
                    ) : c.references ? (
                      <span className="key">
                        <Link {...ico} />
                        {c.references}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  <th scope="col">Columns</th>
                  <th scope="col">Method</th>
                  <th scope="col">Unique</th>
                </tr>
              </thead>
              <tbody>
                {info.indexes.map((i) => (
                  <tr key={i.name}>
                    <td>{i.name}</td>
                    <td>{i.columns}</td>
                    <td>{i.method}</td>
                    <td>{i.unique ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No indexes.</p>
        )}
        <h3>Foreign keys</h3>
        {info.foreignKeys.length ? (
          <div className="grid-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Column</th>
                  <th scope="col">References</th>
                  <th scope="col">On delete</th>
                </tr>
              </thead>
              <tbody>
                {info.foreignKeys.map((f) => (
                  <tr key={f.name}>
                    <td>{f.name}</td>
                    <td>{f.column}</td>
                    <td>{f.references}</td>
                    <td>{f.onDelete}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No foreign keys.</p>
        )}
      </div>
    );

  const ms = o && "ms" in o ? o.ms : null;
  return (
    <div className="work-body">
      <div className="request-line">
        <div className="url-field">
          <span className="where-k">where</span>
          <input
            className="where-in"
            aria-label={`Where clause for ${tab.table}`}
            placeholder="a condition, sent as typed"
            spellCheck={false}
            autoComplete="off"
            value={tab.where}
            onChange={(e) => st.updateTab(tab.id, { where: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && void st.readTable(tab.id)}
          />
        </div>
        <RunGroup
          busy={busy}
          disabled={session.status !== "open"}
          onRun={() => void st.readTable(tab.id)}
          kbd="⌘↵"
          items={[
            { label: "Run", kbd: "⌘↵", run: () => void st.readTable(tab.id) },
            { label: "Open as a query", run: () => st.newQueryTab(tableSelect(conn.engine, tab.schema, tab.table, tab.where, limit, tab.offset) + "\n", tab.table) },
            { label: "Refresh columns and indexes", run: () => void st.loadTableInfo(tab.id) },
          ]}
        />
      </div>
      <div className="req-title">
        <span className="name name--static">{tab.table}</span>
        <span className="path">{path}</span>
      </div>
      <section className="response" aria-label={tab.table}>
        <nav className="subtabs" aria-label="Table">
          <button type="button" className="subtab" aria-pressed={view === "rows"} onClick={() => setView("rows")}>
            Rows
            {est !== null && est !== undefined && (
              <span className="n" title="Estimate from table statistics">
                {estimate(est)}
              </span>
            )}
          </button>
          <button type="button" className="subtab" aria-pressed={view === "columns"} onClick={() => setView("columns")}>
            Columns{info && <span className="n">{info.columns.length}</span>}
          </button>
          <button type="button" className="subtab" aria-pressed={view === "indexes"} onClick={() => setView("indexes")}>
            Indexes{info && <span className="n">{info.indexes.length}</span>}
          </button>
          <span className="push meta">
            <span className="dim">{busy ? "reading" : ms !== null ? duration(ms) : ""}</span>
          </span>
        </nav>
        {view === "rows" ? rowsBody : structure}
      </section>
    </div>
  );
}
