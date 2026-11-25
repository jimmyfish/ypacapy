import "./TablePane.css";
import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_ROW_LIMIT, useCurrent, useStore } from "../store";
import { estimate } from "../lib/cells";
import { tableSelect } from "../lib/sql";
import { targetOf } from "../lib/edit";
import { duration } from "../lib/time";
import type { ColMeta, ResultSet, TableTab } from "../types";
import { ErrorState, RunGroup } from "./QueryPane";
import { ResultGrid, type ColKey, type GridEdit } from "./ResultGrid";
import { ColumnEditor } from "./ColumnEditor";
import { ChevronDown, ChevronLeft, ChevronRight, KeyRound, Link, Rows3, SearchX, ico } from "./Icon";
import { EmptyRow, EmptyState, Obj, QueryChip } from "./EmptyState";

/**
 * Rows (or documents) per page on a table or collection tab: just the number. The default is the connection's row
 * limit, else Settings'; a pick holds for this tab (its `limit`) and reads from the first page again. Settings stay.
 */
export function RowPick({ tab, rowLimit, label }: { tab: TableTab; rowLimit: number; label: string }) {
  const cur = Number(tab.limit) > 0 ? Number(tab.limit) : rowLimit;
  const opts = [...new Set([rowLimit, cur, 50, 100, 200, 500, 1000])].sort((a, b) => a - b);
  return (
    // the number and its chevron are the face; the select lies over them, unseen, so the box hugs the number
    <span className="row-pick">
      <span className="row-pick-face" aria-hidden="true">
        {cur.toLocaleString("en-US")}
        <ChevronDown {...ico} />
      </span>
      <select
          aria-label={`${label} per page for this tab`}
          title={`${label} per page`}
          value={cur}
          disabled={tab.run.status === "running"}
          onChange={(e) => {
            const n = Number(e.target.value);
            const st = useStore.getState();
            st.updateTab(tab.id, { limit: n === rowLimit ? "" : String(n) });
            void st.readTable(tab.id, { offset: 0 });
          }}
        >
        {opts.map((n) => (
          <option key={n} value={n}>
            {n.toLocaleString("en-US")}
          </option>
        ))}
      </select>
    </span>
  );
}

/** A table: its rows under a where filter (select … limit, no order by), its columns (edited in ColumnEditor), its indexes and keys. */
export function TablePane({ tab }: { tab: TableTab }) {
  const { conn, session } = useCurrent();
  const appLimit = useStore((s) => s.settings.rowLimit);
  const rowLimit = conn?.rowLimit || appLimit || DEFAULT_ROW_LIMIT;
  const limit = Number(tab.limit) > 0 ? Number(tab.limit) : rowLimit;
  const st = useStore.getState();
  const busy = tab.run.status === "running";
  const o = tab.run.outcome;
  const set = o?.kind === "done" ? o.sets[o.sets.length - 1] : undefined;
  // an empty page past the first shows the grid with the columns of the last page that had rows (none come with no rows)
  const lastCols = useRef<{ id: string; cols: ColMeta[] }>(undefined);
  if (set?.rows.length) lastCols.current = { id: tab.id, cols: set.columns };
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
  const emptyPage = o?.kind === "done" && tab.offset > 0 && rows === 0;
  const cols = lastCols.current?.id === tab.id ? lastCols.current.cols : (tab.info?.columns ?? []).map((c) => ({ name: c.name, type: c.type }));
  const shownSet: ResultSet | undefined = set && rows > 0 ? set : emptyPage ? { columns: cols, rows: [], truncated: false } : undefined;
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
  else if (shownSet)
    rowsBody = (
      <div className="state">
        <ResultGrid
          set={shownSet}
          keys={keys}
          edit={rows > 0 ? edit : undefined}
          label={`Rows of ${tab.table}`}
          exportName={tab.table}
          lead={
            rows > 0 ? (
              <span className="muted">
                Rows {from} to {to}
              </span>
            ) : undefined
          }
          foot={
            <div className="grid-foot">
              <RowPick tab={tab} rowLimit={rowLimit} label="Rows" />
              {/* no totals: the page number only */}
              <span>Page {Math.floor(tab.offset / limit) + 1}</span>
              <button type="button" className="icon-btn" aria-label="Previous page" disabled={tab.offset === 0} onClick={() => void st.readTable(tab.id, { offset: Math.max(0, tab.offset - limit) })}>
                <ChevronLeft {...ico} />
              </button>
              {/* nothing is counted: Next stays on until a page comes back empty */}
              <button type="button" className="icon-btn" aria-label="Next page" disabled={rows === 0} onClick={() => void st.readTable(tab.id, { offset: tab.offset + limit })}>
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
        {tab.where.trim() ? (
          <EmptyState
            tone="match"
            icon={SearchX}
            title={
              <>
                No row of <Obj>{tab.table}</Obj> matches this filter
              </>
            }
            line="The where clause is sent as you typed it."
            actions={
              <QueryChip
                q={tab.where.trim()}
                onClear={() => {
                  st.updateTab(tab.id, { where: "" });
                  setTimeout(() => void useStore.getState().readTable(tab.id), 0);
                }}
              />
            }
          />
        ) : (
          <EmptyState
            tone="empty"
            icon={Rows3}
            title={
              <>
                <Obj>{tab.table}</Obj> has no rows
              </>
            }
          />
        )}
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
      <ColumnEditor tab={tab} engine={conn.engine} />
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
          <EmptyRow icon={KeyRound} title="No indexes." />
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
          <EmptyRow icon={Link} title="No foreign keys." />
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
