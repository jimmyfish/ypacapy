/** How a value reads, from its column type (the result set's own metadata). */
import type { ColMeta } from "../types";

/** oid, doc and arr: MongoDB objectId, object and array (lib/bson.ts draws them) */
export type Kind = "num" | "bool" | "ts" | "json" | "bytes" | "text" | "oid" | "doc" | "arr";

export function kindOf(type: string): Kind {
  const t = type.toLowerCase();
  // MongoDB's BSON names, before the SQL ones: objectId is not an object, int32 is a number
  if (/^objectid/.test(t)) return "oid";
  if (/^object/.test(t)) return "doc";
  if (/^array/.test(t)) return "arr";
  if (/^(int32|int64|decimal128)/.test(t)) return "num";
  if (/^bool/.test(t)) return "bool";
  if (/^(int|integer|smallint|bigint|tinyint|mediumint|serial|bigserial|smallserial|numeric|decimal|real|float|double|money|oid|year)/.test(t)) return "num";
  if (/^(timestamp|datetime|date|time)/.test(t)) return "ts";
  if (/^json/.test(t)) return "json";
  if (/^(bytea|blob|binary|varbinary|longblob|mediumblob|tinyblob)/.test(t)) return "bytes";
  return "text";
}

/** PostgreSQL t/f, MySQL 1/0, SQLite 1/0 */
export function boolOf(v: string): boolean | null {
  const s = v.toLowerCase();
  if (s === "t" || s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "f" || s === "false" || s === "0" || s === "no" || s === "off") return false;
  return null;
}

/** date, time and zone of a timestamp as the database printed it */
export function tsParts(v: string): { d: string; t: string; tz: string } | null {
  const m = /^(\d{4,}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(.*))?$/.exec(v);
  if (m) return { d: m[1], t: m[2] ?? "", tz: m[3] ?? "" };
  const t = /^(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(.*)$/.exec(v);
  return t ? { d: "", t: t[1], tz: t[2] } : null;
}

/** "~12k", "~3.2k", "~640" */
export function estimate(n: number | null | undefined): string {
  if (n === null || n === undefined || n < 0) return "";
  const f = (x: number, u: string) => `~${x >= 10 ? Math.round(x) : Math.round(x * 10) / 10}${u}`;
  if (n < 1000) return `~${n}`;
  if (n < 1e6) return f(n / 1e3, "k");
  if (n < 1e9) return f(n / 1e6, "M");
  return f(n / 1e9, "B");
}

// ---------- copy and export ----------

export const FORMATS = ["Plain text", "JSON", "Markdown table", "CSV"] as const;
export type Format = (typeof FORMATS)[number];
export const FORMAT_EXT: Record<Format, string> = { "Plain text": "txt", JSON: "json", "Markdown table": "md", CSV: "csv" };

type Rows = (string | null)[][];

function jsonValue(v: string | null, kind: Kind): unknown {
  if (v === null) return null;
  if (kind === "bool") return boolOf(v) ?? v;
  if (kind === "num") {
    const n = Number(v);
    // only when the number survives the trip exactly
    return Number.isFinite(n) && String(n) === v ? n : v;
  }
  if (kind === "json") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

const csvCell = (v: string | null) => (v === null ? "" : /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const mdCell = (v: string | null) => (v === null ? "null" : v.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>"));
const tabCell = (v: string | null) => (v === null ? "NULL" : v.replace(/\t/g, " ").replace(/\r?\n/g, "\\n"));

export function render(format: Format, cols: ColMeta[], rows: Rows): string {
  switch (format) {
    case "Plain text":
      return [cols.map((c) => c.name).join("\t"), ...rows.map((r) => r.map(tabCell).join("\t"))].join("\n") + "\n";
    case "CSV":
      return [cols.map((c) => csvCell(c.name)).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n") + "\r\n";
    case "Markdown table":
      return (
        [`| ${cols.map((c) => mdCell(c.name)).join(" | ")} |`, `| ${cols.map((c) => (kindOf(c.type) === "num" ? "---:" : "---")).join(" | ")} |`, ...rows.map((r) => `| ${r.map(mdCell).join(" | ")} |`)].join("\n") +
        "\n"
      );
    case "JSON": {
      const kinds = cols.map((c) => kindOf(c.type));
      return JSON.stringify(rows.map((r) => Object.fromEntries(cols.map((c, i) => [c.name, jsonValue(r[i], kinds[i])]))), null, 2) + "\n";
    }
  }
}
