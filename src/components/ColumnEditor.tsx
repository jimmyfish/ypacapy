import "./ColumnEditor.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type Modal } from "../store";
import { api, errText } from "../lib/api";
import { alterStatements, alterText, alterWarnings, changeCount, changed, draftsOf, locked, newDraft, noDrop, problems, touched, type ColDraft, type ColField } from "../lib/alter";
import type { Approval, Ask, Engine, RunOutcome, TableTab } from "../types";
import { Actions, FinalLine, Shell } from "./Ask";
import { Caps, Err, PassField } from "./AuthDialog";
import { Fingerprint, Info, Key, Link, LoaderCircle, Lock, LockOpen, Play, Plus, Shield, Shredder, SquareCode, TriangleAlert, Undo2, X, ico, icoC } from "./Icon";

/** the types the Type field suggests; anything the server takes can be typed */
const TYPES: Record<Engine, string[]> = {
  postgres: ["int2", "int4", "int8", "numeric(12,2)", "real", "float8", "text", "varchar(255)", "char(3)", "bool", "date", "time", "timestamp", "timestamptz", "interval", "uuid", "json", "jsonb", "bytea"],
  mysql: ["tinyint", "int", "bigint", "decimal(12,2)", "double", "varchar(255)", "char(3)", "text", "boolean", "date", "datetime", "timestamp", "json", "blob"],
  sqlite: ["INTEGER", "REAL", "NUMERIC", "TEXT", "BLOB"],
  mongo: [],
  redis: [],
};
const LABEL: Record<Exclude<ColField, "nullable">, string> = { name: "Name", type: "Type", def: "Default" };
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * A table's columns, edited in place. Every cell is a quiet field: a changed cell turns green, the shredder marks a
 * column to drop (red and struck through until undone), Add column adds a green row. Nothing reaches the server
 * until Review SQL › Apply. The drafts live in the store (colEdits), so they stay while the tab is away.
 */
export function ColumnEditor({ tab, engine }: { tab: TableTab; engine: Engine }) {
  const info = tab.info!;
  const saved = useStore((s) => s.colEdits[tab.id]);
  const base = useMemo(() => draftsOf(info.columns), [info]);
  const ds = saved ?? base;
  const st = useStore.getState();
  const put = (next: ColDraft[] | null) => st.setColEdits(tab.id, next);
  const edit = (i: number, patch: Partial<ColDraft>) => put(ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const bad = useMemo(() => problems(engine, ds), [engine, ds]);
  const n = changeCount(ds);
  const body = useRef<HTMLTableSectionElement>(null);
  const focusName = useRef<number | null>(null);

  // a new row's name takes the focus once it's drawn
  useEffect(() => {
    if (focusName.current === null) return;
    body.current?.querySelector<HTMLInputElement>(`[data-row="${focusName.current}"][data-f="name"]`)?.focus();
    focusName.current = null;
  });

  const review = () => {
    if (n && !bad.length) st.openModal({ kind: "alterColumns", tabId: tab.id });
  };
  // ⌘S opens Review while the Columns view is up
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key !== "s" || useStore.getState().modal) return;
      e.preventDefault();
      e.stopPropagation();
      review();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const field = (d: ColDraft, i: number, f: Exclude<ColField, "nullable">) => {
    const lock = locked(engine, d, f);
    const err = bad.find((p) => p.index === i && p.field === f);
    const mark = changed(d, f) || (!d.from && !!d[f].trim());
    const cls = [mark && "cell-edit", lock && "col-lock"].filter(Boolean).join(" ");
    return (
      <td className={cls || undefined} title={err?.message ?? lock ?? undefined}>
        <input
          className={f === "name" ? "col-in" : "col-in mono"}
          data-row={i}
          data-f={f}
          value={d[f]}
          disabled={d.drop || !!lock}
          list={f === "type" ? `col-types-${engine}` : undefined}
          placeholder={f === "def" ? "none" : f === "name" && !d.from ? "new_column" : undefined}
          aria-label={`${LABEL[f]} of ${d.from?.name ?? "the new column"}`}
          aria-invalid={err ? true : undefined}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onChange={(e) => edit(i, { [f]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape" && d.from) {
              // back to what the catalog says, for this cell only
              e.preventDefault();
              edit(i, { [f]: f === "def" ? (d.from.default ?? "") : d.from[f] });
            } else if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </td>
    );
  };

  const what = ds.filter(touched).map((d) => (!d.from ? `${d.name.trim() || "new column"} added` : d.drop ? `${d.from.name} dropped` : changed(d, "name") ? `${d.from.name} renamed` : `${d.from.name} changed`));

  return (
    <div className="structure col-ed">
      <div className="res-tools col-tools">
        <span className="muted">Click a cell to change it</span>
        {n > 0 && (
          <div className="edit-bar" role="group" aria-label="Unsaved changes">
            <span className="edit-n">{plural(n, "change")}</span>
            <button type="button" className="btn btn--primary" disabled={!!bad.length} title="See the SQL, then apply it  ⌘S" onClick={review}>
              Review SQL
            </button>
            <button type="button" className="btn" title="Drop the changes" onClick={() => put(null)}>
              Discard
            </button>
          </div>
        )}
      </div>
      {engine === "sqlite" && (
        <p className="col-note">
          <Info {...ico} />
          <span>SQLite can rename, add and drop columns. Changing a type, nullable or default means rebuilding the table, so do that one in a console.</span>
        </p>
      )}
      <div className="grid-wrap">
        <table className="grid col-grid">
          <colgroup>
            <col className="cg-name" />
            <col className="cg-type" />
            <col className="cg-null" />
            <col className="cg-def" />
            <col className="cg-key" />
            <col className="cg-act" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Type</th>
              <th scope="col">Nullable</th>
              <th scope="col">Default</th>
              <th scope="col">Key</th>
              <th scope="col">
                <span className="sr-only">Drop</span>
              </th>
            </tr>
          </thead>
          <tbody ref={body}>
            {ds.map((d, i) => {
              const nullLock = locked(engine, d, "nullable");
              const why = noDrop(engine, d, info);
              return (
                <tr key={d.from ? `c:${d.from.name}` : `n:${i}`} className={d.drop ? "row-del" : !d.from ? "row-edit row-new" : undefined}>
                  {field(d, i, "name")}
                  {field(d, i, "type")}
                  <td className={[changed(d, "nullable") && "cell-edit", nullLock && "col-lock"].filter(Boolean).join(" ") || undefined} title={nullLock ?? undefined}>
                    <label className="col-chk">
                      <input type="checkbox" checked={d.nullable} disabled={d.drop || !!nullLock} aria-label={`${d.name.trim() || "The new column"} can be null`} onChange={(e) => edit(i, { nullable: e.target.checked })} />
                      <span>{d.nullable ? "yes" : "no"}</span>
                    </label>
                  </td>
                  {field(d, i, "def")}
                  <td>
                    {d.from?.primary ? (
                      <span className="key">
                        <Key {...ico} />
                        Primary
                      </span>
                    ) : d.from?.references ? (
                      <span className="key">
                        <Link {...ico} />
                        {d.from.references}
                      </span>
                    ) : null}
                  </td>
                  <td className="col-act">
                    {!d.from ? (
                      <button type="button" className="icon-btn" title="Remove this new column" aria-label="Remove this new column" onClick={() => put(ds.filter((_, j) => j !== i))}>
                        <X {...ico} />
                      </button>
                    ) : d.drop ? (
                      <button type="button" className="icon-btn" title="Keep this column" aria-label={`Keep ${d.from.name}`} onClick={() => edit(i, { drop: false })}>
                        <Undo2 {...ico} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn col-shred"
                        title={why ?? "Drop this column"}
                        aria-label={why ?? `Drop ${d.from.name}`}
                        disabled={!!why}
                        // a dropped column goes as the catalog has it: its edits are dropped with it
                        onClick={() => put(ds.map((x, j) => (j === i ? { ...draftsOf([d.from!])[0], drop: true } : x)))}
                      >
                        <Shredder {...ico} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id={`col-types-${engine}`}>
        {TYPES[engine].map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="grid-foot col-foot">
        <button
          type="button"
          className="btn btn--quiet grid-add"
          onClick={() => {
            focusName.current = ds.length;
            put([...ds, newDraft()]);
          }}
        >
          <Plus {...ico} />
          Add column
        </button>
        <span className={bad.length ? "edit-what err" : "edit-what"}>{bad.length ? bad[0].message : what.join(" · ")}</span>
      </div>
    </div>
  );
}

/** the table tab a modal is about, and its connection's id */
const tabWhere = (s: ReturnType<typeof useStore.getState>, tabId: string) => Object.keys(s.sessions).find((id) => s.sessions[id].tabs.some((t) => t.id === tabId));

/**
 * Review SQL: the exact statements, what may go wrong, then Apply. It stands in for the write guard's ask: on Low
 * this is the confirm; on Strict (and locked) the passphrase well shows here. Apply sends the statements with
 * apply_edits (ddl), behind the guard; an error keeps the dialog and the edits.
 */
export function AlterColumnsAsk({ m, onClose }: { m: Extract<Modal, { kind: "alterColumns" }>; onClose: () => void }) {
  const connId = useStore((s) => tabWhere(s, m.tabId));
  const conn = useStore((s) => s.conns.find((c) => c.id === connId));
  const session = useStore((s) => (connId ? s.sessions[connId] : undefined));
  const tab = session?.tabs.find((t) => t.id === m.tabId);
  const saved = useStore((s) => s.colEdits[m.tabId]);
  const [ask, setAsk] = useState<Omit<Ask, "kind"> | null | undefined>(undefined);
  const [pass, setPass] = useState("");
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const table = tab?.kind === "table" ? tab : undefined;
  const engine = conn?.engine;
  const ds = saved ?? [];
  const statements = useMemo(() => (engine && table ? alterStatements(engine, table.schema, table.table, ds) : []), [engine, table, ds]);
  const text = engine ? alterText(engine, statements) : "";

  // what the guard will ask (nothing runs): Strict and locked shows the passphrase well up front
  useEffect(() => {
    if (!connId || !text) return;
    let live = true;
    api.guardAsk(connId, text).then(
      (a) => live && setAsk(a),
      () => live && setAsk(null),
    );
    return () => {
      live = false;
    };
  }, [connId, text]);

  if (!conn || !session || !table || !engine || !table.info || !statements.length) return null;
  const n = changeCount(ds);
  const dropped = ds.filter((d) => d.drop && d.from).map((d) => d.from!.name);
  const warns = alterWarnings(engine, table.table, ds, table.info);
  const strict = ask?.level === "strict";
  const where = engine === "sqlite" && table.schema === "main" ? table.table : `${table.schema}.${table.table}`;

  const submit = async (approval: Approval) => {
    if (busy) return;
    setBusy(true);
    setErr("");
    const out: RunOutcome = await api
      .applyEdits({ connId: conn.id, database: session.database, statements, approval, ddl: true })
      .catch((e) => ({ kind: "error", title: errText(e), says: null, message: errText(e), hint: null, lost: false, ms: 0 }));
    setBusy(false);
    if (out.kind === "ask") {
      // Strict and locked (or a wrong passphrase): the well shows, with the reason
      setAsk(out);
      setPass("");
      return;
    }
    if (out.kind === "done") {
      const st = useStore.getState();
      st.setColEdits(table.id, null);
      onClose();
      void st.loadTableInfo(table.id);
      st.refreshTree(conn.id);
      // rows read before have the old columns: read them again (row edits on them can't go anywhere now)
      if (table.run.outcome) void st.readTable(table.id, { discard: true });
      st.showToast(`${plural(n, "change")} applied to ${table.table}`);
      return;
    }
    if (out.kind === "cancelled")
      setErr(engine === "mysql" ? "Stopped by the statement timeout. MySQL may still finish the ALTER, so refresh the columns to see where it ended up." : "Stopped by the statement timeout. It was rolled back, so nothing changed.");
    else if (out.kind === "error") setErr(out.lost ? `${out.title}. Refresh the columns to see what's there now.` : `${out.title}. Nothing changed.`);
  };

  const RunIcon = busy ? LoaderCircle : dropped.length ? Shredder : strict ? LockOpen : Play;
  return (
    <Shell
      title={`Change ${table.table} on ${conn.name}?`}
      sub={`${plural(n, "change")} to ${where}. ${engine === "mysql" ? "One ALTER, so it all goes in or none of it does." : "They run in one transaction: all or nothing."}`}
      tone={strict ? undefined : "warn"}
      badge={strict ? <Lock {...ico} /> : <Shield {...ico} />}
      onClose={onClose}
    >
      <div className="ask-what">
        <div className="ask-kinds">
          <code className="ask-chip">ALTER</code>
        </div>
        <pre className="ask-cmd col-sql">{text}</pre>
      </div>
      {warns.length > 0 && (
        <ul className="auth-scope ask-warns">
          {warns.map((w) => (
            <li key={w}>
              <TriangleAlert {...ico} />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
      {strict && (
        <p className="auth-note">
          <Lock {...ico} />
          <span>{conn.name} is Strict, so it needs the passphrase.</span>
        </p>
      )}
      <form
        className="col-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (strict && !pass) return;
          void submit(strict ? { kind: "passphrase", passphrase: pass } : { kind: "confirm" });
        }}
        noValidate
      >
        {dropped.length > 0 && <FinalLine text={`Dropping ${dropped.join(" and ")} deletes ${dropped.length > 1 ? "their values" : "its value"} in every row. It can't be undone.`} />}
        {strict && (
          <>
            <PassField id="col-pass" label="Passphrase" value={pass} onChange={setPass} autoComplete="current-password" autoFocus invalid={!!ask?.error} placeholder="Capy's passphrase" onCaps={setCaps} />
            <Caps on={caps} />
            <Err text={ask?.error ?? ""} />
            {ask?.touchId && (
              <button type="button" className="btn auth-btn auth-touch-btn" disabled={busy} onClick={() => void submit({ kind: "touchId" })}>
                <Fingerprint {...ico} />
                Use Touch ID
              </button>
            )}
          </>
        )}
        <Err text={err} />
        <div className="auth-or" aria-hidden="true">
          <span>or</span>
        </div>
        <button
          type="button"
          className="btn auth-btn ask-alt"
          onClick={() => {
            onClose();
            useStore.getState().newQueryTab(text + "\n", table.table);
          }}
        >
          <SquareCode {...ico} />
          Open in a console instead
        </button>
        <Actions onClose={onClose} danger={dropped.length > 0} icon={<RunIcon {...(busy ? icoC("col-busy") : ico)} />} label={busy ? "Applying" : "Apply"} autoFocus={!strict} disabled={busy || ask === undefined} />
      </form>
    </Shell>
  );
}
