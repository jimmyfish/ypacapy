/**
 * MongoDB documents as Rust sends them (canonical Extended JSON: { $oid }, { $date: { $numberLong } },
 * { $numberInt } …) turned into what the app draws: the grid's columns and rows, mongosh's way of printing a
 * value, the Fields seen on a page, and the copy and export formats. Nothing here reads the database.
 */
import type { ResultSet } from "../types";

export type BsonType =
  | "objectId"
  | "date"
  | "int32"
  | "int64"
  | "double"
  | "decimal128"
  | "string"
  | "bool"
  | "null"
  | "object"
  | "array"
  | "binData"
  | "regex"
  | "timestamp"
  | "minKey"
  | "maxKey"
  | "other";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
/** a one-key { $something } wrapper of canonical Extended JSON */
const wrap = (v: Obj, k: string) => Object.keys(v).length === 1 && k in v;

export function typeOf(v: unknown): BsonType {
  if (v === null) return "null";
  if (typeof v === "string") return "string";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int32" : "double";
  if (Array.isArray(v)) return "array";
  if (!isObj(v)) return "other";
  if (wrap(v, "$oid")) return "objectId";
  if (wrap(v, "$date")) return "date";
  if (wrap(v, "$numberInt")) return "int32";
  if (wrap(v, "$numberLong")) return "int64";
  if (wrap(v, "$numberDouble")) return "double";
  if (wrap(v, "$numberDecimal")) return "decimal128";
  if (wrap(v, "$binary")) return "binData";
  if (wrap(v, "$regularExpression")) return "regex";
  if (wrap(v, "$timestamp")) return "timestamp";
  if (wrap(v, "$minKey")) return "minKey";
  if (wrap(v, "$maxKey")) return "maxKey";
  if (wrap(v, "$symbol") || wrap(v, "$code") || wrap(v, "$undefined") || wrap(v, "$dbPointer") || ("$code" in v && "$scope" in v)) return "other";
  return "object";
}

const NUM = new Set<BsonType>(["int32", "int64", "double", "decimal128"]);

/** ISO text of a $date, "" when it is outside what a JS Date holds */
function iso(v: Obj): string {
  const d = v.$date;
  const ms = isObj(d) ? Number(d.$numberLong) : typeof d === "string" ? Date.parse(d) : Number(d);
  try {
    return new Date(ms).toISOString();
  } catch {
    return String(ms);
  }
}

/** a number's own text: 12, 5000000000, 12.5, 12.50 (a decimal keeps its digits) */
function numText(v: unknown): string {
  if (typeof v === "number") return String(v);
  const o = v as Obj;
  return String(o.$numberInt ?? o.$numberLong ?? o.$numberDouble ?? o.$numberDecimal);
}

const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
const q = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;

/** A scalar as mongosh prints it inside a document; null for objects and arrays */
function scalarShell(v: unknown): string | null {
  const t = typeOf(v);
  const o = v as Obj;
  switch (t) {
    case "null":
      return "null";
    case "string":
      return q(v as string);
    case "bool":
      return String(v);
    case "int32":
    case "double":
      return numText(v);
    case "int64":
      return `Long('${numText(v)}')`;
    case "decimal128":
      return `Decimal128('${numText(v)}')`;
    case "objectId":
      return `ObjectId('${o.$oid}')`;
    case "date":
      return `ISODate('${iso(o)}')`;
    case "binData": {
      const b = o.$binary as Obj;
      return b.subType === "04" ? `UUID('${uuid(String(b.base64))}')` : `Binary.createFromBase64('${b.base64}', ${parseInt(String(b.subType), 16)})`;
    }
    case "regex": {
      const r = o.$regularExpression as Obj;
      return `/${r.pattern}/${r.options}`;
    }
    case "timestamp": {
      const ts = o.$timestamp as Obj;
      return `Timestamp({ t: ${ts.t}, i: ${ts.i} })`;
    }
    case "minKey":
      return "MinKey()";
    case "maxKey":
      return "MaxKey()";
    case "other":
      return JSON.stringify(v);
    default:
      return null;
  }
}

function uuid(b64: string): string {
  try {
    const hex = Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return b64;
  }
}

/** mongosh on one line: { status: 'paid', total: Decimal128('12.50') } */
export function shellInline(v: unknown): string {
  const s = scalarShell(v);
  if (s !== null) return s;
  if (Array.isArray(v)) return v.length ? `[ ${v.map(shellInline).join(", ")} ]` : "[]";
  const e = Object.entries(v as Obj);
  return e.length ? `{ ${e.map(([k, x]) => `${key(k)}: ${shellInline(x)}`).join(", ")} }` : "{}";
}

/** mongosh across lines, two spaces a level, as the inspector and the JSON view show a document */
export function shellPretty(v: unknown, pad = ""): string {
  const s = scalarShell(v);
  if (s !== null) return s;
  const inner = pad + "  ";
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    // a short list of scalars stays on one line
    const flat = shellInline(v);
    if (!v.some((x) => typeOf(x) === "object" || typeOf(x) === "array") && flat.length <= 72) return flat;
    return `[\n${v.map((x) => inner + shellPretty(x, inner)).join(",\n")}\n${pad}]`;
  }
  const e = Object.entries(v as Obj);
  if (!e.length) return "{}";
  return `{\n${e.map(([k, x]) => `${inner}${key(k)}: ${shellPretty(x, inner)}`).join(",\n")}\n${pad}}`;
}

/** Relaxed Extended JSON (what the Extended JSON export writes): plain numbers and ISO dates where exact */
export function relaxed(v: unknown): unknown {
  const t = typeOf(v);
  const o = v as Obj;
  if (t === "int32" || (t === "double" && Number.isFinite(Number(numText(v))))) return Number(numText(v));
  if (t === "int64") {
    const n = Number(numText(v));
    return Number.isSafeInteger(n) ? n : v;
  }
  if (t === "date") {
    const s = iso(o);
    return /^\d{4}-/.test(s) ? { $date: s } : v;
  }
  if (t === "array") return (v as unknown[]).map(relaxed);
  if (t === "object") return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, relaxed(x)]));
  return v;
}

/** A grid cell's text, by type. A date reads as the grid's other timestamps do: 2026-11-14 11:02:11.204Z */
function cellText(v: unknown): string | null {
  const t = typeOf(v);
  if (t === "null") return null;
  if (t === "string") return v as string;
  if (t === "bool") return String(v);
  if (NUM.has(t)) return numText(v);
  if (t === "objectId") return String((v as Obj).$oid);
  if (t === "date") return iso(v as Obj).replace("T", " ");
  return shellInline(v);
}

/**
 * The documents as a result set: one column per top-level field, in the order first seen. A column's type is
 * what its values were (`int32 · string`), `· null` when some were null, and `· 14 of 20` when not every
 * document has the field. A cell whose document lacks the field is marked in `missing`, never shown as null.
 */
export function docsToSet(docs: unknown[], truncated: boolean): ResultSet {
  const ds = docs.filter(isObj);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const d of ds)
    for (const k of Object.keys(d))
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
  const columns = keys.map((k) => {
    const has = ds.filter((d) => k in d);
    const types = [...new Set(has.map((d) => typeOf(d[k])))];
    const nonNull = types.filter((t) => t !== "null");
    let type = (nonNull.length ? nonNull : ["null"]).join(" · ");
    if (nonNull.length && types.includes("null")) type += " · null";
    if (has.length < ds.length) type += ` · ${has.length} of ${ds.length}`;
    return { name: k, type };
  });
  const rows = ds.map((d) => keys.map((k) => (k in d ? cellText(d[k]) : null)));
  const missing = ds.map((d) => keys.map((k) => !(k in d)));
  return { columns, rows, truncated, docs: ds, missing: missing.some((r) => r.some(Boolean)) ? missing : undefined };
}

/** The value under one cell, for the inspector and Copy value: mongosh across lines */
export function cellValue(set: ResultSet, row: number, col: number): string | null | undefined {
  const d = set.docs?.[row];
  const k = set.columns[col]?.name;
  if (!isObj(d) || k === undefined) return undefined;
  if (!(k in d)) return undefined;
  const v = d[k];
  const t = typeOf(v);
  if (t === "null") return null;
  if (t === "string") return v as string;
  return shellPretty(v);
}

/** Dotted paths of the documents given, nested objects and arrays of objects opened up, for Fields */
export function fieldsOf(docs: unknown[]): { path: string; types: string; count: number }[] {
  const rows = new Map<string, { types: Set<string>; docs: Set<number> }>();
  const walk = (v: unknown, path: string, i: number) => {
    const t = typeOf(v);
    const r = rows.get(path) ?? { types: new Set(), docs: new Set() };
    r.types.add(t === "array" && (v as unknown[]).some((x) => typeOf(x) === "object") ? "array of object" : t);
    r.docs.add(i);
    rows.set(path, r);
    if (t === "object") for (const [k, x] of Object.entries(v as Obj)) walk(x, `${path}.${k}`, i);
    if (t === "array") for (const x of v as unknown[]) if (typeOf(x) === "object") for (const [k, y] of Object.entries(x as Obj)) walk(y, `${path}.${k}`, i);
  };
  docs.forEach((d, i) => {
    if (isObj(d)) for (const [k, v] of Object.entries(d)) walk(v, k, i);
  });
  return [...rows].map(([path, r]) => ({ path, types: [...r.types].join(", "), count: r.docs.size }));
}

// ---------- copy and export ----------

export const MONGO_FORMATS = ["mongosh", "Extended JSON", "CSV", "Markdown table"] as const;
export type MongoFormat = (typeof MONGO_FORMATS)[number];
export const MONGO_EXT: Record<MongoFormat, string> = { mongosh: "js", "Extended JSON": "json", CSV: "csv", "Markdown table": "md" };

/** mongosh's array of documents, or relaxed Extended JSON; CSV and Markdown come from the grid's rows */
export function renderDocs(format: "mongosh" | "Extended JSON", docs: unknown[]): string {
  if (format === "mongosh") return (docs.length ? `[\n${docs.map((d) => "  " + shellPretty(d, "  ")).join(",\n")}\n]` : "[]") + "\n";
  return JSON.stringify(docs.map(relaxed), null, 2) + "\n";
}

// ---------- colouring ----------

export type Tok = { c: "k" | "s" | "n" | "b" | "f" | "p" | ""; t: string };

/** mongosh text cut into coloured pieces: keys, strings, numbers, true/false/null, ObjectId() and the like */
export function shellTokens(s: string): Tok[] {
  const out: Tok[] = [];
  const re = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")(\s*:)?|\b(ObjectId|ISODate|Decimal128|Long|Timestamp|UUID|Binary\.createFromBase64|MinKey|MaxKey)\b|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)(\s*:)|([{}[\](),])/g;
  let at = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > at) out.push({ c: "", t: s.slice(at, m.index) });
    at = m.index! + m[0].length;
    if (m[1]) out.push({ c: m[2] ? "k" : "s", t: m[1] }, ...(m[2] ? [{ c: "p" as const, t: m[2] }] : []));
    else if (m[3]) out.push({ c: "f", t: m[3] });
    else if (m[4]) out.push({ c: "b", t: m[4] });
    else if (m[5]) out.push({ c: "n", t: m[5] });
    else if (m[6]) out.push({ c: "k", t: m[6] }, { c: "p", t: m[7] });
    else out.push({ c: "p", t: m[8] });
  }
  if (at < s.length) out.push({ c: "", t: s.slice(at) });
  return out;
}
