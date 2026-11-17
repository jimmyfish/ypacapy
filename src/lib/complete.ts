/**
 * The SQL editor's autocomplete: what fits at the caret, and the names that match what is typed.
 *
 * Nothing here queries the database. Table names come from the schema tree the sidebar already loaded;
 * columns come from the session's cache, which `loadColumns` fills with one catalog read per table.
 * A keystroke scans the statement around the caret and filters short lists in memory.
 */
import type { ColumnsEntry, Engine, TreeTable } from "../types";
import { estimate } from "./cells";
import { KEYWORDS, quoteIdent, runs } from "./sql";

/** a table the statement names, with its alias; `known` once it matches a loaded schema's table */
export interface Ref {
  schema: string;
  table: string;
  alias: string | null;
  known: boolean;
}

interface Base {
  /** the part of a name typed so far, and where it starts in the text */
  word: string;
  wordStart: number;
  /** the name before a dot: an alias, a table or a schema */
  qual: string | null;
  /** right after from, join, update, into or table */
  afterKw: boolean;
}

export type Ctx = (Base & { mode: "tables"; schema: string }) | (Base & { mode: "columns"; tables: Ref[] });

export interface Source {
  engine: Engine;
  /** the open schema: unqualified names live here */
  schema: string;
  /** every schema of the database, loaded or not */
  schemas: string[];
  /** a loaded schema's tables and views; undefined while it is not loaded */
  tables(schema: string): TreeTable[] | undefined;
  columns(schema: string, table: string): ColumnsEntry | undefined;
}

export interface Item {
  key: string;
  name: string;
  kind: "table" | "view" | "schema" | "column";
  /** column type, row estimate, "view" or "schema" */
  meta: string;
  /** the alias or table a column belongs to, when the statement names more than one */
  src?: string;
  primary?: boolean;
  /** what goes into the text, quoted when it has to be */
  insert: string;
}

export interface Suggest {
  head: { label: "Tables in" | "Columns of"; parts: { name: string; alias: string | null }[] };
  items: Item[];
  /** matches before the cut to MAX_ITEMS */
  total: number;
  /** tables whose columns are being read */
  waiting: string[];
  /** the schema named before the dot is not loaded yet */
  notLoaded: string | null;
  /** tables whose columns nobody asked for yet: the editor asks the store */
  missing: { schema: string; table: string }[];
  /** the lowercased word, for marking the match */
  word: string;
}

export const MAX_ITEMS = 50;

const rows = (n: number | null) => {
  const e = estimate(n);
  return e ? `${e} rows` : "";
};

const TABLE_KW = new Set(["from", "join", "update", "into", "table"]);
const CLAUSE = new Set(["select", "from", "join", "where", "on", "by", "having", "set", "update", "into", "table", "returning", "using", "limit", "offset", "values", "and", "or", "when", "then", "else"]);
const NO_COLUMNS = new Set(["limit", "offset", "values", "into", "table", "update", "from", "join"]);

interface Tok {
  t: string;
  lo: string;
  pos: number;
  end: number;
}

const PIECE = /"(?:[^"]|"")*"|`[^`]*`|[A-Za-z_][\w$]*|\d[\w.]*|\S/g;

/** words and punctuation outside strings and comments */
function tokens(src: string): Tok[] {
  const out: Tok[] = [];
  let pos = 0;
  for (const [cls, t] of runs(src)) {
    if (cls !== "q-c" && cls !== "q-s") {
      PIECE.lastIndex = 0;
      for (let m = PIECE.exec(t); m; m = PIECE.exec(t)) out.push({ t: m[0], lo: m[0].toLowerCase(), pos: pos + m.index, end: pos + m.index + m[0].length });
    }
    pos += t.length;
  }
  return out;
}

const unquote = (t: string) => (t[0] === '"' ? t.slice(1, -1).replace(/""/g, '"') : t[0] === "`" ? t.slice(1, -1).replace(/``/g, "`") : t);
const isName = (k: Tok | undefined): k is Tok => !!k && (k.t[0] === '"' || k.t[0] === "`" || (/^[A-Za-z_]/.test(k.t) && !KEYWORDS.has(k.lo)));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function findSchema(src: Source, name: string): string | null {
  return src.schemas.find((s) => s === name) ?? src.schemas.find((s) => same(s, name)) ?? null;
}

function findTable(src: Source, schema: string, name: string): string | null {
  const ts = src.tables(schema);
  if (!ts) return null;
  return (ts.find((t) => t.name === name) ?? ts.find((t) => same(t.name, name)))?.name ?? null;
}

/** What fits at the caret, or null when nothing should come up (a string, a comment, an alias, a selection). */
export function completeContext(text: string, at: number, src: Source): Ctx | null {
  // the statement around the caret; nothing inside a string or a comment
  let pos = 0;
  let start = 0;
  let end = text.length;
  for (const [cls, t] of runs(text)) {
    const next = pos + t.length;
    if (!cls) {
      for (let i = t.indexOf(";"); i >= 0; i = t.indexOf(";", i + 1)) {
        const p = pos + i;
        if (p < at) start = p + 1;
        else if (end === text.length) end = p;
      }
    } else if ((cls === "q-c" || cls === "q-s") && pos < at && at <= next) {
      const closed = at === next && (cls === "q-s" ? t.length > 1 && t.endsWith(t[0]) : t.startsWith("/*") && t.length > 3 && t.endsWith("*/"));
      if (!closed) return null;
    }
    pos = next;
  }
  const stmt = text.slice(start, end);
  const rel = at - start;
  const before = stmt.slice(0, rel);
  if (/[\w$]/.test(stmt[rel] ?? "")) return null; // the caret is inside a word
  const m = /(?:([A-Za-z_][\w$]*|"(?:[^"]|"")+"|`[^`]+`)\.)?([A-Za-z_][\w$]*)?$/.exec(before)!;
  const word = m[2] ?? "";
  const qual = m[1] ? unquote(m[1]) : null;
  const from = rel - m[0].length;
  if (from > 0 && /[\w$."`]/.test(before[from - 1])) return null; // 12abc, a.b.c
  const toks = tokens(stmt);
  const prior = toks.filter((k) => k.end <= from);
  const prev = prior[prior.length - 1];

  // the tables the statement names: from a x, b y / join c z / update d / into e
  const refs: Ref[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (!TABLE_KW.has(toks[i].lo)) continue;
    let j = i + 1;
    for (;;) {
      const a = toks[j];
      if (!isName(a)) break;
      let schema = src.schema;
      let table = unquote(a.t);
      let last = a;
      const b = toks[j + 2];
      if (toks[j + 1]?.t === "." && isName(b)) {
        schema = findSchema(src, table) ?? table;
        table = unquote(b.t);
        last = b;
        j += 3;
      } else j += 1;
      if (last.end === rel || toks[j]?.t === ".") break; // still being typed
      let alias: string | null = null;
      if (toks[j]?.lo === "as") j++;
      const c = toks[j];
      if (isName(c) && c.end !== rel) {
        alias = unquote(c.t);
        j++;
      }
      const found = findTable(src, schema, table);
      refs.push({ schema, table: found ?? table, alias, known: !!found });
      if (toks[i].lo === "from" && toks[j]?.t === ",") {
        j++;
        continue;
      }
      break;
    }
  }
  let clause: string | null = null;
  for (let i = prior.length - 1; i >= 0; i--)
    if (CLAUSE.has(prior[i].lo)) {
      clause = prior[i].lo;
      break;
    }

  const base: Base = { word, wordStart: at - word.length, qual, afterKw: !!prev && TABLE_KW.has(prev.lo) && !qual };
  if (qual !== null) {
    const r = refs.find((x) => x.alias !== null && same(x.alias, qual)) ?? refs.find((x) => same(x.table, qual));
    if (r) return { ...base, mode: "columns", tables: [r] };
    const schema = findSchema(src, qual);
    if (schema) return { ...base, mode: "tables", schema };
    const t = findTable(src, src.schema, qual);
    if (t) return { ...base, mode: "columns", tables: [{ schema: src.schema, table: t, alias: null, known: true }] };
    return null;
  }
  if (!prev) return null;
  if (TABLE_KW.has(prev.lo) || (prev.t === "," && clause === "from")) return { ...base, mode: "tables", schema: src.schema };
  if (prev.lo === "as" || (clause && TABLE_KW.has(clause) && isName(prev))) return null; // naming an alias
  if (!clause || NO_COLUMNS.has(clause)) return null;
  return { ...base, mode: "columns", tables: refs };
}

/** a name as it must be written: bare when it can be, quoted otherwise */
export function sqlName(engine: Engine, name: string): string {
  const bare = engine === "postgres" ? /^[a-z_][a-z0-9_$]*$/ : /^[A-Za-z_][A-Za-z0-9_$]*$/;
  return bare.test(name) && !KEYWORDS.has(name.toLowerCase()) ? name : quoteIdent(engine, name);
}

/** The names that fit the context and match the word: names that start with it first, then names that contain it. */
export function suggest(ctx: Ctx, src: Source): Suggest | null {
  const w = ctx.word.toLowerCase();
  const all: Item[] = [];
  const waiting: string[] = [];
  const missing: { schema: string; table: string }[] = [];
  let notLoaded: string | null = null;
  let head: Suggest["head"];
  if (ctx.mode === "tables") {
    head = { label: "Tables in", parts: [{ name: ctx.schema, alias: null }] };
    const ts = src.tables(ctx.schema);
    if (!ts) notLoaded = ctx.schema;
    else
      for (const t of ts) {
        const view = t.kind === "view" || t.kind === "matview";
        all.push({ key: `t:${t.name}`, name: t.name, kind: view ? "view" : "table", meta: view ? (t.kind === "matview" ? "matview" : "view") : rows(t.estimate), insert: sqlName(src.engine, t.name) });
      }
    if (ctx.qual === null)
      for (const s of src.schemas) if (s !== ctx.schema) all.push({ key: `s:${s}`, name: s, kind: "schema", meta: "schema", insert: `${sqlName(src.engine, s)}.` });
  } else {
    const seen = new Set<string>();
    const known = ctx.tables.filter((t) => {
      const k = `${t.alias ?? ""}|${t.schema}.${t.table}`;
      if (!t.known || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!known.length) return null;
    head = { label: "Columns of", parts: known.map((t) => ({ name: t.table, alias: t.alias })) };
    for (const t of known) {
      const c = src.columns(t.schema, t.table);
      if (!c) missing.push({ schema: t.schema, table: t.table });
      if (!c || c.state === "loading") {
        waiting.push(t.table);
        continue;
      }
      if (c.state === "error") continue;
      for (const col of c.cols)
        all.push({ key: `c:${t.alias ?? t.table}.${col.name}`, name: col.name, kind: "column", meta: col.type, primary: col.primary, src: known.length > 1 ? (t.alias ?? t.table) : undefined, insert: sqlName(src.engine, col.name) });
    }
  }
  const pre: Item[] = [];
  const mid: Item[] = [];
  for (const it of all) {
    const n = it.name.toLowerCase();
    if (!w || n.startsWith(w)) pre.push(it);
    else if (n.includes(w)) mid.push(it);
  }
  return { head, items: pre.concat(mid).slice(0, MAX_ITEMS), total: pre.length + mid.length, waiting, notLoaded, missing, word: w };
}
