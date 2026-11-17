/**
 * Editing result rows: which table a result came from, and the UPDATE / DELETE statements for the changes.
 * A result is editable only when it reads one table plainly (no join, group, union or distinct) and has
 * every primary key column of that table among its columns, unrenamed.
 */
import type { Engine, ResultSet, TableColumn } from "../types";
import { kindOf } from "./cells";
import { quoteIdent } from "./sql";

/** Pending changes of one result set, by its row index (the database's order) and column. */
export interface Edits {
  cells: Record<number, Record<number, string | null>>;
  deleted: Record<number, true>;
}

export const NO_EDITS: Edits = { cells: {}, deleted: {} };

export const editCount = (e: Edits) => Object.keys(e.deleted).length + Object.entries(e.cells).filter(([r, c]) => !e.deleted[Number(r)] && Object.keys(c).length).length;

/** Where a result's edits go. */
export interface EditTarget {
  engine: Engine;
  /** schema-qualified, quoted */
  from: string;
  /** the table column behind each result column; null: not editable (an expression, a rename, bytes) */
  cols: (string | null)[];
  /** result column indexes of the primary key */
  pk: number[];
}

// ---------- reading the statement ----------

const TOKEN = /(\s+|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\$([A-Za-z_]\w*)?\$[\s\S]*?(?:\$\4\$|$))|("(?:[^"]|"")*"?|`(?:[^`]|``)*`?|\[[^\]]*\]?)|([A-Za-z_][\w$]*)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(::|<>|<=|>=|!=|\|\||.)/g;

interface Tok {
  t: "str" | "qid" | "id" | "num" | "p";
  v: string;
}

function tokens(sql: string): Tok[] {
  const out: Tok[] = [];
  for (const m of sql.matchAll(TOKEN)) {
    if (m[1]) continue;
    if (m[2] || m[3]) out.push({ t: "str", v: m[0] });
    else if (m[5]) out.push({ t: "qid", v: m[5] });
    else if (m[6]) out.push({ t: "id", v: m[6] });
    else if (m[7]) out.push({ t: "num", v: m[7] });
    else out.push({ t: "p", v: m[0] });
  }
  return out;
}

/** The statements of a run, split at top-level semicolons, comments and blanks dropped. */
export function statements(sql: string): Tok[][] {
  const out: Tok[][] = [[]];
  for (const t of tokens(sql)) {
    if (t.t === "p" && t.v === ";") out.push([]);
    else out[out.length - 1].push(t);
  }
  return out.filter((s) => s.length);
}

const kw = (t: Tok | undefined, ...w: string[]) => t?.t === "id" && w.includes(t.v.toLowerCase());

/** a statement that returns rows (one result set each), in run order */
export const returnsRows = (s: Tok[]) => kw(s[0], "select", "with", "table", "values", "show", "explain", "describe", "desc", "pragma") || (s[0]?.t === "p" && s[0].v === "(");

/** an identifier as the database stores it: quoted as written; unquoted lower case in PostgreSQL */
function ident(t: Tok, engine: Engine): string {
  if (t.t === "qid") {
    const q = t.v[0];
    const close = q === "[" ? "]" : q;
    return t.v.slice(1, t.v.endsWith(close) ? -1 : undefined).replaceAll(close + close, close);
  }
  return engine === "postgres" ? t.v.toLowerCase() : t.v;
}

const isName = (t: Tok | undefined) => t?.t === "id" || t?.t === "qid";
const AFTER_FROM = ["where", "order", "limit", "offset", "fetch", "for"];
const NOT_ALIAS = new Set([...AFTER_FROM, "join", "inner", "left", "right", "full", "cross", "natural", "group", "having", "union", "intersect", "except", "window", "using", "on", "lateral", "tablesample"]);

export interface Source {
  schema?: string;
  table: string;
  /** the select list: "*", or per item the column it reads (null: an expression) */
  items: "*" | (string | null)[];
}

/** The one table a plain select reads, or why its rows cannot be edited. */
export function sourceOf(s: Tok[], engine: Engine): Source | string {
  if (!kw(s[0], "select")) return "Only the rows of a plain select can be edited.";
  let i = 1;
  if (kw(s[i], "all")) i++;
  if (kw(s[i], "distinct")) return "A select distinct has no row to change.";
  // the select list, to the top-level from
  const items: Tok[][] = [[]];
  let depth = 0;
  for (; i < s.length; i++) {
    const t = s[i];
    if (t.t === "p" && t.v === "(") depth++;
    else if (t.t === "p" && t.v === ")") depth--;
    if (depth === 0 && kw(t, "from")) break;
    if (depth === 0 && t.t === "p" && t.v === ",") items.push([]);
    else items[items.length - 1].push(t);
  }
  if (i >= s.length) return "This select reads no table.";
  i++;
  // from [schema.]table [[as] alias]
  const names: Tok[] = [];
  if (!isName(s[i])) return "This select does not read a table by name.";
  names.push(s[i++]);
  while (s[i]?.t === "p" && s[i].v === "." && isName(s[i + 1])) {
    names.push(s[i + 1]);
    i += 2;
  }
  if (names.length > 2) return "Rows read across databases cannot be edited.";
  const table = ident(names[names.length - 1], engine);
  const schema = names.length === 2 ? ident(names[0], engine) : undefined;
  let alias: string | undefined;
  if (kw(s[i], "as")) i++;
  if (isName(s[i]) && !(s[i].t === "id" && NOT_ALIAS.has(s[i].v.toLowerCase()))) alias = ident(s[i++], engine);
  if (kw(s[i], "group", "having", "union", "intersect", "except", "window")) return `A select with ${s[i].v.toLowerCase()} has no row to change.`;
  if (i < s.length && !kw(s[i], ...AFTER_FROM)) return "Rows read from more than one table cannot be edited.";
  depth = 0;
  for (; i < s.length; i++) {
    const t = s[i];
    if (t.t === "p" && t.v === "(") depth++;
    else if (t.t === "p" && t.v === ")") depth--;
    else if (depth === 0 && kw(t, "group", "having", "union", "intersect", "except", "join", "window")) return `A select with ${t.v.toLowerCase()} has no row to change.`;
  }
  // the select list: * or columns read as they are
  const own = (t: Tok) => [table, alias].includes(ident(t, engine));
  const star = (it: Tok[]) => (it.length === 1 && it[0].v === "*") || (it.length === 3 && own(it[0]) && it[1].v === "." && it[2].v === "*");
  if (items.length === 1 && star(items[0])) return { schema, table, items: "*" };
  if (items.some(star)) return "Write out the columns, or select * alone, to edit these rows.";
  const cols = items.map((it) => {
    let c = it;
    if (c.length === 3 && isName(c[0]) && own(c[0]) && c[1].v === ".") c = c.slice(2);
    if (c.length !== 1 || !isName(c[0])) return null;
    // a bare column, not a keyword value like true / null / current_date
    if (c[0].t === "id" && ["true", "false", "null", "current_date", "current_time", "current_timestamp", "localtime", "localtimestamp", "current_user", "session_user", "user"].includes(c[0].v.toLowerCase())) return null;
    return ident(c[0], engine);
  });
  // an alias renames the result column but the table column is still the source: [col] [as] alias
  const withAlias = items.map((it, k) => {
    if (cols[k] !== null) return cols[k];
    let c = it;
    if (c.length >= 3 && isName(c[0]) && own(c[0]) && c[1].v === ".") c = c.slice(2);
    if (c.length === 3 && isName(c[0]) && kw(c[1], "as") && isName(c[2])) return ident(c[0], engine);
    if (c.length === 2 && isName(c[0]) && isName(c[1])) return ident(c[0], engine);
    return null;
  });
  return { schema, table, items: withAlias };
}

/** A table column by name: exact, else the one match ignoring case (MySQL and SQLite names are not case sensitive). */
function column(cols: TableColumn[], name: string): TableColumn | undefined {
  const hit = cols.find((c) => c.name === name);
  if (hit) return hit;
  const ci = cols.filter((c) => c.name.toLowerCase() === name.toLowerCase());
  return ci.length === 1 ? ci[0] : undefined;
}

export function qualified(engine: Engine, schema: string, table: string): string {
  return engine === "sqlite" && schema === "main" ? quoteIdent(engine, table) : `${quoteIdent(engine, schema)}.${quoteIdent(engine, table)}`;
}

/** Ties a result's columns to the table's: every primary key column must be there. */
export function targetOf(engine: Engine, schema: string, table: string, items: Source["items"], set: ResultSet, columns: TableColumn[]): EditTarget | string {
  if (!columns.length) return `Could not read the columns of ${table}.`;
  const pkCols = columns.filter((c) => c.primary);
  if (!pkCols.length) return `${table} has no primary key, so a row cannot be picked out to change.`;
  if (items !== "*" && items.length !== set.columns.length) return "The result's columns do not line up with the select list.";
  const cols = set.columns.map((rc, i) => {
    const name = items === "*" ? rc.name : items[i];
    if (name === null) return null;
    const c = column(columns, name);
    return c && kindOf(rc.type) !== "bytes" ? c.name : null;
  });
  const pk: number[] = [];
  for (const k of pkCols) {
    const at = cols.indexOf(k.name);
    if (at < 0) return `Add the primary key column ${k.name} to the select to edit these rows.`;
    pk.push(at);
  }
  return { engine, from: qualified(engine, schema, table), cols, pk };
}

// ---------- writing the changes ----------

export function literal(engine: Engine, v: string | null): string {
  if (v === null) return "null";
  let s = v.replace(/'/g, "''");
  // MySQL reads backslash escapes in strings unless NO_BACKSLASH_ESCAPES is set
  if (engine === "mysql") s = s.replace(/\\/g, "\\\\");
  return `'${s}'`;
}

/** One UPDATE or DELETE per changed row, keyed by the row's primary key values as read. */
export function editStatements(t: EditTarget, set: ResultSet, e: Edits): string[] {
  const q = (i: number) => quoteIdent(t.engine, t.cols[i]!);
  const where = (row: (string | null)[]) => t.pk.map((i) => `${q(i)} = ${literal(t.engine, row[i])}`).join(" and ");
  const out: string[] = [];
  for (const r of Object.keys(e.deleted).map(Number).sort((a, b) => a - b)) out.push(`delete from ${t.from} where ${where(set.rows[r])}`);
  for (const [rs, cells] of Object.entries(e.cells)) {
    const r = Number(rs);
    const cs = Object.entries(cells);
    if (e.deleted[r] || !cs.length) continue;
    const sets = cs.map(([c, v]) => `${q(Number(c))} = ${literal(t.engine, v)}`).join(", ");
    out.push(`update ${t.from} set ${sets} where ${where(set.rows[r])}`);
  }
  return out;
}

/** The result after the changes were saved: edited values in, deleted rows out. */
export function applied(set: ResultSet, e: Edits): ResultSet {
  const rows = set.rows.flatMap((row, r) => {
    if (e.deleted[r]) return [];
    const c = e.cells[r];
    return [c ? row.map((v, i) => (i in c ? c[i] : v)) : row];
  });
  return { ...set, rows };
}
