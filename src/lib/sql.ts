/**
 * SQL for the console: colouring, a light formatter, identifier quoting. This only paints and lays out
 * text; what a statement does is decided in Rust (sqlparser) before anything runs.
 */
import { format, type SqlLanguage } from "sql-formatter";
import type { Engine } from "../types";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const KEYWORDS = new Set(
  (
    "select from where and or not in is null as on join left right inner outer full cross natural using group by order having limit offset fetch first next rows only " +
    "union all intersect except distinct case when then else end insert into values update set delete returning create table view index unique primary key foreign " +
    "references drop alter add column constraint default check truncate grant revoke to with recursive asc desc nulls last exists between like ilike similar " +
    "interval true false begin commit rollback transaction explain analyze replace if cascade restrict materialized schema database lateral over partition window " +
    "filter within conflict do nothing escape collate show use describe pragma vacuum for of share nowait skip locked temporary temp sequence trigger function procedure"
  ).split(" "),
);
const TYPES = new Set(
  (
    "int integer smallint bigint tinyint mediumint int2 int4 int8 serial bigserial numeric decimal real float float4 float8 double precision money text varchar char " +
    "character varying bpchar uuid json jsonb bool boolean date time timestamp timestamptz timetz bytea blob inet cidr macaddr xml datetime year enum bit"
  ).split(" "),
);

// comment | string | dollar-quoted | quoted identifier | number | word | anything else
const TOKEN = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\$([A-Za-z_]\w*)?\$[\s\S]*?(?:\$\4\$|$))|("(?:[^"]|"")*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_][\w$]*)/g;

export type Run = [cls: string, text: string];

// Table names (q-tb): the name after FROM, JOIN, UPDATE, INTO, TABLE, TRUNCATE, REFERENCES, each name in a
// FROM list (a, b), and every part of schema.table. FROM counts only where this paren level holds a
// SELECT/DELETE, so EXTRACT(x FROM ts) and IS DISTINCT FROM y stay plain. After FROM/JOIN a name followed
// by "(" is a function (generate_series); after INTO/TABLE it is the table with its column list.
const TABLE_AFTER = new Set(["from", "join", "update", "into", "table", "truncate", "references"]);
const KEEP_WANT = new Set(["only", "lateral", "if", "not", "exists"]);
const KEEP_LIST = new Set(["as", "only", "lateral", "join", "left", "right", "inner", "outer", "full", "cross", "natural"]);

/** the text in coloured runs: class q-c comment, q-s string, q-k keyword, q-t type, q-f function, q-n number, q-tb table, "" the rest */
export function runs(src: string): Run[] {
  const out: Run[] = [];
  let last = 0;
  let depth = 0, list = -1, want = "", tableEnd = -1, prevKw = "";
  let sel: boolean[] = [false];
  const gap = (text: string) => {
    for (const ch of text) {
      if (ch === "(") { depth++; sel[depth] = false; want = ""; }
      else if (ch === ")") { if (depth > 0) depth--; if (list > depth) list = -1; want = ""; }
      else if (ch === "," && list === depth) want = "from";
      else if (ch === ";") { depth = 0; sel = [false]; list = -1; want = ""; }
    }
  };
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
    if (m.index > last) {
      out.push(["", src.slice(last, m.index)]);
      gap(src.slice(last, m.index));
    }
    const qualified = tableEnd >= 0 && src.slice(tableEnd, m.index) === ".";
    tableEnd = -1;
    let cls = "";
    if (m[1]) cls = "q-c";
    else if (m[2] || m[3] || m[6]) {
      cls = m[6] ? "q-n" : "q-s";
      want = "";
      prevKw = "";
    } else {
      const w = (m[7] || "").toLowerCase();
      const call = /^\s*\(/.test(src.slice(m.index + m[0].length));
      if (m[7] && KEYWORDS.has(w)) {
        cls = "q-k";
        if (w === "select" || w === "delete") sel[depth] = true;
        if (TABLE_AFTER.has(w) && !(w === "from" && (!sel[depth] || prevKw === "distinct"))) {
          want = w;
          if (w === "from") list = depth;
        } else if (!KEEP_WANT.has(w)) want = "";
        if (list === depth && !KEEP_LIST.has(w) && w !== "from") list = -1;
        prevKw = w;
      } else {
        const fn = call && (want === "from" || want === "join" || !want) && !qualified;
        cls = (want || qualified) && !fn ? "q-tb" : !m[7] ? "" : TYPES.has(w) ? "q-t" : call ? "q-f" : "";
        if (cls === "q-tb") tableEnd = m.index + m[0].length;
        want = "";
        prevKw = "";
      }
    }
    out.push([cls, m[0]]);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(["", src.slice(last)]);
  return out;
}

/** One `.l` block per line, leading spaces in `.ind`, tokens coloured; runs never cross a line. */
export function highlightSql(src: string, cur?: number): string {
  const lines: string[] = [""];
  for (const [cls, text] of runs(src)) {
    text.split("\n").forEach((part, k) => {
      if (k > 0) lines.push("");
      if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
    });
  }
  return lines
    .map((html, i) => {
      const m = /^ +/.exec(html);
      const lead = m ? `<span class="ind">${m[0]}</span>` : "";
      return `<span class="l${i === cur ? " cur" : ""}">${lead}${m ? html.slice(m[0].length) : html}</span>`;
    })
    .join("");
}

/** The words of one line of SQL, coloured, for small samples (no line numbers). */
export const highlightInline = (src: string) => runs(src).map(([c, t]) => (c ? `<span class="${c}">${esc(t)}</span>` : esc(t))).join("");

/**
 * The statement around the cursor: from the `;` before it to the next `;` (or the end), trimmed and
 * without the `;`. Semicolons inside strings, quoted names and comments do not count. A cursor right
 * after a `;` on the same line (`select 1;|`), or on a stretch with nothing in it, takes the statement
 * before. Empty string when the editor holds no statement.
 */
export function statementAt(src: string, cursor: number): string {
  const semis: number[] = [];
  let last = 0;
  const scan = (text: string, at: number) => {
    for (let i = text.indexOf(";"); i >= 0; i = text.indexOf(";", i + 1)) semis.push(at + i);
  };
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
    scan(src.slice(last, m.index), last);
    last = m.index + m[0].length;
  }
  scan(src.slice(last), last);

  // statement i runs from bounds[i] up to semis[i] (or the end of the text)
  const bounds = [0, ...semis.map((s) => s + 1)];
  const end = (i: number) => (i < semis.length ? semis[i] : src.length);
  const blank = (i: number) => !src.slice(bounds[i], end(i)).replace(/--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g, "").trim();
  let i = bounds.length - 1;
  while (i > 0 && bounds[i] > cursor) i--;
  if (i > 0 && (blank(i) || /^[ \t]*$/.test(src.slice(bounds[i], cursor)))) i--;
  while (i > 0 && blank(i)) i--;
  return src.slice(bounds[i], end(i)).trim();
}

/** MongoDB never reaches the SQL formatter (its Format is lib/bson-free: mongosh is formatted as typed) */
const DIALECT: Record<Engine, SqlLanguage> = { postgres: "postgresql", mysql: "mysql", sqlite: "sqlite", mongo: "sql", redis: "sql" };

/**
 * Formats SQL in the dialect of the connection, one clause per line with its keyword beside it:
 *   SELECT *
 *   FROM active_packages
 *   WHERE used_quota_data > 0
 *     AND order_id IS NOT NULL
 * Keywords and type names upper case; names, strings, functions and comments as typed.
 * Throws when the text cannot be parsed; the caller keeps the text and says why.
 */
export function formatSql(src: string, engine: Engine): string {
  const out = format(src, { language: DIALECT[engine], keywordCase: "upper", dataTypeCase: "upper", functionCase: "preserve", identifierCase: "preserve", tabWidth: 2, linesBetweenQueries: 1, expressionWidth: 60 });
  // sql-formatter puts a clause keyword alone on its line with the body two spaces in: bring the first body line up beside it
  const lines = out.split("\n"), joined: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^( *)([A-Z]+(?: [A-Z]+)*)$/), next = lines[i + 1];
    if (m && next !== undefined && next.startsWith(m[1] + "  ") && !next.startsWith(m[1] + "   ")) {
      joined.push(`${m[1]}${m[2]} ${next.trim()}`);
      i++;
    } else joined.push(lines[i]);
  }
  return joined.join("\n") + "\n";
}

export function quoteIdent(engine: Engine, name: string): string {
  return engine === "mysql" ? "`" + name.replace(/`/g, "``") + "`" : '"' + name.replace(/"/g, '""') + '"';
}

/** select * from the table, with the where clause the person typed; no order by they did not choose. */
export function tableSelect(engine: Engine, schema: string, table: string, where: string, limit: number, offset: number): string {
  const from = engine === "sqlite" && schema === "main" ? quoteIdent(engine, table) : `${quoteIdent(engine, schema)}.${quoteIdent(engine, table)}`;
  const w = where.trim();
  return `select * from ${from}${w ? `\nwhere ${w}` : ""}\nlimit ${limit}${offset ? ` offset ${offset}` : ""}`;
}

export const ENGINE_LABEL: Record<Engine, string> = { postgres: "PG", mysql: "MYSQL", sqlite: "SQLITE", mongo: "MDB", redis: "REDIS" };
export const ENGINE_NAME: Record<Engine, string> = { postgres: "PostgreSQL", mysql: "MySQL", sqlite: "SQLite", mongo: "MongoDB", redis: "Redis" };
