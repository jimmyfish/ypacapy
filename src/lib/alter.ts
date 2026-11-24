/**
 * Editing a table's columns (Columns tab): drafts of each column, what's wrong with them, and the ALTER statements
 * that make the table match. Nothing here talks to the database; the Review dialog sends the statements through
 * apply_edits (ddl), behind the write guard.
 *
 * PostgreSQL: renames first, then one ALTER TABLE with every other change, all in one transaction.
 * MySQL/MariaDB: one ALTER TABLE (it commits DDL on its own, so one statement is what keeps it all-or-nothing).
 *   MODIFY / CHANGE restate the whole column, so its charset, auto_increment, on update and comment are said again.
 * SQLite: one ALTER TABLE per change, in one transaction. It can only add, rename and drop columns.
 */
import type { Engine, TableColumn, TableInfo } from "../types";
import { quoteIdent } from "./sql";

export interface ColDraft {
  /** the column as the catalog has it; null: a new column */
  from: TableColumn | null;
  name: string;
  type: string;
  nullable: boolean;
  /** SQL, as the catalog says it ('pending'::text, now()); empty: no default */
  def: string;
  drop: boolean;
}

export type ColField = "name" | "type" | "nullable" | "def";

export const draftsOf = (cols: TableColumn[]): ColDraft[] => cols.map((c) => ({ from: c, name: c.name, type: c.type, nullable: c.nullable, def: c.default ?? "", drop: false }));
export const newDraft = (): ColDraft => ({ from: null, name: "", type: "", nullable: true, def: "", drop: false });

const orig = (c: TableColumn, f: ColField) => (f === "def" ? (c.default ?? "") : c[f]);
/** a field of an existing, kept column that differs from the catalog (text compared trimmed) */
export function changed(d: ColDraft, f: ColField): boolean {
  if (!d.from || d.drop) return false;
  const a = d[f], b = orig(d.from, f);
  return typeof a === "string" ? a.trim() !== String(b).trim() : a !== b;
}
export const touched = (d: ColDraft) => !d.from || d.drop || (["name", "type", "nullable", "def"] as const).some((f) => changed(d, f));
export const changeCount = (ds: ColDraft[]) => ds.filter(touched).length;

const generated = (c: TableColumn | null) => !!c?.mysql && /\bgenerated\b/.test(c.mysql.extra.replace("default_generated", ""));

/** Why a field of a column can't be changed here; null: it can. */
export function locked(engine: Engine, d: ColDraft, f: ColField): string | null {
  if (!d.from) return null;
  if (engine === "sqlite" && f !== "name") return "SQLite can't change this without rebuilding the table. Do that one in a console.";
  if (engine === "mysql" && generated(d.from)) return "It's a generated column. Change it in a console.";
  return null;
}

/** Why a column can't be dropped here; null: it can. */
export function noDrop(engine: Engine, d: ColDraft, info: TableInfo): string | null {
  const c = d.from;
  if (!c) return null;
  const indexed = info.indexes.some((i) => i.columns.split(", ").includes(c.name));
  if (engine === "sqlite" && (c.primary || c.references || indexed)) return "SQLite won't drop a column that's a key or indexed. Rebuild the table in a console.";
  if (engine === "mysql" && c.references) {
    const fk = info.foreignKeys.find((k) => k.column.split(", ").includes(c.name));
    return `MySQL won't drop it while ${fk?.name ?? "a foreign key"} uses it. Drop the key first.`;
  }
  return null;
}

export interface Problem {
  index: number;
  field: ColField;
  message: string;
}

/** What stops Review: a name missing or taken twice, a type missing, SQLite's NOT NULL without a default. */
export function problems(engine: Engine, ds: ColDraft[]): Problem[] {
  const out: Problem[] = [];
  const key = (n: string) => (engine === "postgres" ? n.trim() : n.trim().toLowerCase());
  const live = ds.map((d, index) => ({ d, index })).filter(({ d }) => !d.drop);
  for (const { d, index } of live) {
    const label = d.name.trim() || "the new column";
    if (!d.name.trim()) out.push({ index, field: "name", message: "Every column needs a name" });
    else if (live.filter((o) => key(o.d.name) === key(d.name)).length > 1) out.push({ index, field: "name", message: `There are two columns named ${d.name.trim()}` });
    if (!d.type.trim()) out.push({ index, field: "type", message: `${label} needs a type` });
    if (engine === "sqlite" && !d.from && !d.nullable && !d.def.trim()) out.push({ index, field: "def", message: `SQLite needs a default for ${label}, since it's NOT NULL` });
  }
  return out;
}

// ---------- the SQL ----------

/** the table as a statement names it: SQLite's main schema is left out, as tableSelect does */
const tableRef = (engine: Engine, schema: string, table: string) =>
  engine === "sqlite" && schema === "main" ? quoteIdent(engine, table) : `${quoteIdent(engine, schema)}.${quoteIdent(engine, table)}`;

const mysqlStr = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
const TEXTY = /^\s*(var)?char\b|^\s*(tiny|medium|long)?text\b|^\s*enum\b|^\s*set\b/i;

/** a column as ADD COLUMN, MODIFY and CHANGE say it */
function colDef(engine: Engine, d: ColDraft): string {
  const q = (n: string) => quoteIdent(engine, n);
  const type = d.type.trim(), def = d.def.trim();
  if (engine !== "mysql") return `${q(d.name.trim())} ${type}${d.nullable ? "" : " NOT NULL"}${def ? ` DEFAULT ${def}` : ""}`;
  const my = d.from?.mysql;
  const extra = my?.extra ?? "";
  // COLUMN_TYPE carries no charset: say the column's own again while it stays a text type
  const cs = my?.charset && TEXTY.test(type) && !/\bcharacter set\b|\bcollate\b/i.test(type) ? ` CHARACTER SET ${my.charset}${my.collation ? ` COLLATE ${my.collation}` : ""}` : "";
  const onUpdate = extra.match(/on update (current_timestamp(\(\d*\))?)/)?.[1];
  return (
    `${q(d.name.trim())} ${type}${cs}${d.nullable ? " NULL" : " NOT NULL"}${def ? ` DEFAULT ${def}` : ""}` +
    (onUpdate ? ` ON UPDATE ${onUpdate.toUpperCase()}` : "") +
    (/\binvisible\b/.test(extra) ? " INVISIBLE" : "") +
    (/\bauto_increment\b/.test(extra) ? " AUTO_INCREMENT" : "") +
    (my?.comment ? ` COMMENT ${mysqlStr(my.comment)}` : "")
  );
}

/** The statements that make the table match the drafts, in the order they run. */
export function alterStatements(engine: Engine, schema: string, table: string, ds: ColDraft[]): string[] {
  const t = tableRef(engine, schema, table);
  const q = (n: string) => quoteIdent(engine, n);
  const live = ds.filter(touched);
  if (engine === "postgres") {
    const out = live.filter((d) => changed(d, "name")).map((d) => `ALTER TABLE ${t} RENAME COLUMN ${q(d.from!.name)} TO ${q(d.name.trim())}`);
    const cl: string[] = [];
    for (const d of live) {
      if (d.drop) cl.push(`DROP COLUMN ${q(d.from!.name)}`);
      else if (!d.from) cl.push(`ADD COLUMN ${colDef(engine, d)}`);
      else {
        const n = q(d.name.trim());
        if (changed(d, "type")) cl.push(`ALTER COLUMN ${n} TYPE ${d.type.trim()}`);
        if (changed(d, "nullable")) cl.push(`ALTER COLUMN ${n} ${d.nullable ? "DROP" : "SET"} NOT NULL`);
        if (changed(d, "def")) cl.push(d.def.trim() ? `ALTER COLUMN ${n} SET DEFAULT ${d.def.trim()}` : `ALTER COLUMN ${n} DROP DEFAULT`);
      }
    }
    if (cl.length) out.push(`ALTER TABLE ${t}\n  ${cl.join(",\n  ")}`);
    return out;
  }
  if (engine === "mysql") {
    // CHANGE renames (any MySQL or MariaDB has it; RENAME COLUMN needs 8.0 or 10.5)
    const cl = live.map((d) =>
      d.drop ? `DROP COLUMN ${q(d.from!.name)}` : !d.from ? `ADD COLUMN ${colDef(engine, d)}` : changed(d, "name") ? `CHANGE COLUMN ${q(d.from.name)} ${colDef(engine, d)}` : `MODIFY COLUMN ${colDef(engine, d)}`,
    );
    return cl.length ? [`ALTER TABLE ${t}\n  ${cl.join(",\n  ")}`] : [];
  }
  return live.map((d) => `ALTER TABLE ${t} ${d.drop ? `DROP COLUMN ${q(d.from!.name)}` : !d.from ? `ADD COLUMN ${colDef(engine, d)}` : `RENAME COLUMN ${q(d.from.name)} TO ${q(d.name.trim())}`}`);
}

/** The SQL as Review shows it and Open in a console writes it: the transaction spelled out where there is one. */
export function alterText(engine: Engine, statements: string[]): string {
  const body = statements.map((s) => `${s};`).join("\n");
  return engine === "mysql" ? body : `BEGIN;\n${body}\nCOMMIT;`;
}

/** What may go wrong or take a while: amber rows in Review. Drops get the shredder line there instead. */
export function alterWarnings(engine: Engine, table: string, ds: ColDraft[], info: TableInfo): string[] {
  const w: string[] = [];
  for (const d of ds.filter(touched)) {
    const c = d.from;
    if (d.drop && c) {
      if (c.primary) w.push(`${c.name} is in the primary key. Dropping it drops the key, and whatever references it stops working.`);
      const fks = info.foreignKeys.filter((k) => k.column.split(", ").includes(c.name)).map((k) => k.name);
      if (fks.length && engine === "postgres") w.push(`${c.name} is a foreign key. ${fks.join(" and ")} goes with it.`);
      const idx = info.indexes.filter((i) => !i.primary && i.columns.split(", ").includes(c.name)).map((i) => i.name);
      if (idx.length && engine !== "sqlite") w.push(`Indexes on ${c.name} change or go with it: ${idx.join(", ")}.`);
      continue;
    }
    const n = d.name.trim();
    if (c && changed(d, "type"))
      w.push(
        engine === "postgres"
          ? `${n} changes type. Postgres rewrites ${table} for that and locks it till it's done. Values that don't cast make it fail.`
          : `${n} changes type. MySQL copies ${table} for that and blocks writes till it's done.`,
      );
    if (c && changed(d, "nullable") && !d.nullable) w.push(`${n} becomes NOT NULL. If any row holds null there, it fails.`);
    if (!c && !d.nullable && !d.def.trim() && engine === "postgres") w.push(`${n} is NOT NULL with no default, so it fails if ${table} has any rows.`);
  }
  return w;
}
