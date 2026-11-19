/**
 * Editing one MongoDB document in the JSON view: the document as a tree of editable fields (a draft), and the one
 * mongosh command that writes it back. An edit sends only what changed, as updateOne on the document's _id
 * ($set, $unset); a delete is deleteOne on _id; a duplicate is insertOne without _id (the server makes one). The
 * command runs through the console's runner, so the write guard asks as it does for any write. Values the
 * console cannot write back (binary data that is not a UUID, the deprecated types) are locked.
 */
import { shellInline, typeOf, type BsonType } from "./bson";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** the types a field can be set to, in the order the type menu lists them */
export const EDIT_TYPES = ["string", "int32", "int64", "double", "decimal128", "bool", "date", "objectId", "null", "object", "array"] as const;
export type EditType = (typeof EDIT_TYPES)[number];
export const TYPE_LABEL: Record<BsonType, string> = {
  objectId: "ObjectId",
  date: "Date",
  int32: "Int32",
  int64: "Int64",
  double: "Double",
  decimal128: "Decimal128",
  string: "String",
  bool: "Boolean",
  null: "Null",
  object: "Object",
  array: "Array",
  binData: "Binary",
  regex: "Regex",
  timestamp: "Timestamp",
  minKey: "MinKey",
  maxKey: "MaxKey",
  other: "Other",
};

export interface Field {
  id: string;
  key: string;
  type: BsonType;
  /** a scalar's text as typed: the string itself, digits, hex, an ISO date; unused for objects and arrays */
  text: string;
  kids?: Field[];
  /** shown as mongosh prints it and never edited: a type the console cannot write back */
  locked?: string;
  /** as read; missing on a field added here */
  orig?: { key: string; type: BsonType; text: string; value: unknown };
  removed?: boolean;
}

let n = 0;
const fid = () => `f${++n}`;

/** a $date's ISO text, "" when a JS Date cannot hold it */
function isoOf(v: Obj): string {
  const d = v.$date;
  const ms = isObj(d) ? Number(d.$numberLong) : typeof d === "string" ? Date.parse(d) : Number(d);
  const t = new Date(ms);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
const numOf = (v: unknown) => (typeof v === "number" ? String(v) : String((v as Obj).$numberInt ?? (v as Obj).$numberLong ?? (v as Obj).$numberDouble ?? (v as Obj).$numberDecimal));

/** a value as a field of the draft */
export function toField(key: string, v: unknown): Field {
  const type = typeOf(v);
  let text = "";
  let kids: Field[] | undefined;
  let locked: string | undefined;
  switch (type) {
    case "string":
      text = v as string;
      break;
    case "int32":
    case "int64":
    case "double":
    case "decimal128":
      text = numOf(v);
      break;
    case "bool":
      text = String(v);
      break;
    case "objectId":
      text = String((v as Obj).$oid);
      break;
    case "date":
      text = isoOf(v as Obj);
      if (!text) locked = shellInline(v);
      break;
    case "object":
      kids = Object.entries(v as Obj).map(([k, x]) => toField(k, x));
      break;
    case "array":
      kids = (v as unknown[]).map((x, i) => toField(String(i), x));
      break;
    case "null":
      break;
    default:
      // binary, regex, timestamp, MinKey/MaxKey and the rest: kept as they are unless removed
      locked = shellInline(v);
  }
  return { id: fid(), key, type, text, kids, locked, orig: { key, type, text, value: v } };
}

/** the document as a draft: its top-level fields */
export const toDraft = (doc: unknown): Field[] => (isObj(doc) ? Object.entries(doc).map(([k, v]) => toField(k, v)) : []);

/** a locked value the console can still write back when it is copied (a UUID, a regex, a timestamp) */
const copyable = (f: Field) => f.locked === undefined || f.type === "regex" || f.type === "timestamp" || f.type === "minKey" || f.type === "maxKey" || (f.type === "binData" && /^UUID\(/.test(f.locked));
/** why a draft cannot be written whole (a duplicate), or null */
export function uncopyable(fields: Field[]): string | null {
  for (const f of fields) {
    if (f.removed) continue;
    if (!copyable(f)) return `${f.key} holds ${TYPE_LABEL[f.type] === "Binary" ? "binary data" : `a ${TYPE_LABEL[f.type]} value`} ypacapy can't write yet`;
    const inner = f.kids && uncopyable(f.kids);
    if (inner) return inner;
  }
  return null;
}

const q = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
const keyText = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k));

/** why a field's text is not a value of its type, or null */
export function invalid(f: Field): string | null {
  if (f.removed || f.locked !== undefined) return null;
  const t = f.text.trim();
  switch (f.type) {
    case "int32":
      return /^-?\d+$/.test(t) && Math.abs(Number(t)) <= 2147483647 ? null : "A whole number up to 2,147,483,647";
    case "int64":
      return /^-?\d+$/.test(t) && t.replace("-", "").length <= 19 ? null : "A whole number";
    case "double":
      return t !== "" && Number.isFinite(Number(t)) ? null : "A number";
    case "decimal128":
      return /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t) ? null : "A decimal number";
    case "bool":
      return t === "true" || t === "false" ? null : "true or false";
    case "objectId":
      return /^[0-9a-fA-F]{24}$/.test(t) ? null : "24 hex digits";
    case "date":
      return /^\d{4}-\d{2}-\d{2}/.test(t) && !Number.isNaN(Date.parse(t)) ? null : "A date, such as 2026-11-19 or 2026-11-19T10:00:00Z";
    default:
      return null;
  }
}

/** the first problem anywhere in the draft: [field id, message] */
export function firstInvalid(fields: Field[]): [string, string] | null {
  for (const f of fields) {
    if (f.removed) continue;
    const m = invalid(f);
    if (m) return [f.id, m];
    if (!f.key.trim() && f.orig?.key !== "") return [f.id, "A field needs a name"];
    const inner = f.kids && firstInvalid(f.kids);
    if (inner) return inner;
  }
  return null;
}

/** a field's value in mongosh's words, for the command */
export function literal(f: Field): string {
  if (f.locked !== undefined) return f.locked;
  const t = f.text.trim();
  switch (f.type) {
    case "string":
      return q(f.text);
    case "int32":
      return t;
    case "int64":
      return `Long('${t}')`;
    case "double":
      return `Double('${t}')`;
    case "decimal128":
      return `Decimal128('${t}')`;
    case "bool":
      return t;
    case "objectId":
      return `ObjectId('${t}')`;
    case "date":
      return `ISODate('${t}')`;
    case "null":
      return "null";
    case "array": {
      const kids = (f.kids ?? []).filter((k) => !k.removed);
      return kids.length ? `[ ${kids.map(literal).join(", ")} ]` : "[]";
    }
    case "object": {
      const kids = (f.kids ?? []).filter((k) => !k.removed);
      return kids.length ? `{ ${kids.map((k) => `${keyText(k.key)}: ${literal(k)}`).join(", ")} }` : "{}";
    }
    default:
      return f.locked ?? "null";
  }
}

/** changed in place: its type or text (a scalar), not counting its children */
const own = (f: Field) => !f.orig || f.orig.type !== f.type || (f.kids === undefined && f.orig.text !== f.text);
/** anything changed at or under this field */
export function touched(f: Field): boolean {
  if (!f.orig || f.removed || f.orig.key !== f.key || own(f)) return true;
  if (!f.kids) return false;
  const before = Array.isArray(f.orig.value) ? f.orig.value.length : isObj(f.orig.value) ? Object.keys(f.orig.value).length : 0;
  return f.kids.length !== before || f.kids.some(touched);
}
export const changeCount = (fields: Field[]): number => fields.reduce((n, f) => n + (!f.orig || f.removed || f.orig.key !== f.key || own(f) ? 1 : f.kids ? changeCount(f.kids) : 0), 0);

/** a path segment MongoDB can address with dots */
const plainSeg = (k: string) => k !== "" && !k.includes(".") && !k.startsWith("$");

/**
 * The update for an edited draft: $set for what changed or was added, $unset for what was removed. Inside an
 * array anything but a value change sets the whole array (an $unset there leaves a null). A renamed field is
 * unset under its old name and set under its new one.
 */
export function updateOf(fields: Field[]): { set: [string, string][]; unset: string[]; whole: Field[] } {
  const set: [string, string][] = [];
  const unset: string[] = [];
  // the fields written whole, to check they hold nothing the console cannot write
  const whole: Field[] = [];
  const put = (path: string, f: Field) => (set.push([path, literal(f)]), whole.push(f));
  const walk = (fs: Field[], base: string, inArray: boolean) => {
    for (const f of fs) {
      const key = inArray ? f.orig?.key ?? f.key : f.key;
      const path = base ? `${base}.${key}` : key;
      const oldPath = f.orig ? (base ? `${base}.${f.orig.key}` : f.orig.key) : path;
      if (!f.orig) {
        if (!f.removed) put(path, f);
        continue;
      }
      if (f.removed) {
        unset.push(oldPath);
        continue;
      }
      if (f.orig.key !== f.key) {
        unset.push(oldPath);
        put(path, f);
        continue;
      }
      if (!touched(f)) continue;
      // a value MongoDB cannot reach by dots, a new type, or a change of shape inside an array: set it whole
      const shape = f.type === "array" && (f.kids ?? []).some((k) => !k.orig || k.removed);
      if (own(f) || !f.kids || shape || !plainSeg(key)) put(path, f);
      else walk(f.kids, path, f.type === "array");
    }
  };
  walk(fields, "", false);
  return { set, unset, whole };
}

const pathText = (p: string) => (/^[A-Za-z_$][\w$]*$/.test(p) ? p : q(p));
const coll = (name: string) => (/^[A-Za-z_][\w]*$/.test(name) ? `db.${name}` : `db.getCollection(${q(name)})`);
/** the filter that picks one document: its _id as read */
export const idFilter = (id: unknown) => `{ _id: ${shellInline(id)} }`;

export function updateCommand(collection: string, id: unknown, fields: Field[]): string {
  const { set, unset } = updateOf(fields);
  const ops: string[] = [];
  if (set.length) ops.push(`$set: { ${set.map(([p, v]) => `${pathText(p)}: ${v}`).join(", ")} }`);
  if (unset.length) ops.push(`$unset: { ${unset.map((p) => `${pathText(p)}: ''`).join(", ")} }`);
  return `${coll(collection)}.updateOne(\n  ${idFilter(id)},\n  { ${ops.join(",\n    ")} }\n)`;
}

export const deleteCommand = (collection: string, id: unknown) => `${coll(collection)}.deleteOne(\n  ${idFilter(id)}\n)`;

/** a duplicate: the draft without _id, top-level fields one to a line */
export function insertCommand(collection: string, fields: Field[]): string {
  const kept = fields.filter((f) => !f.removed && f.key !== "_id");
  return `${coll(collection)}.insertOne({\n${kept.map((f) => `  ${keyText(f.key)}: ${literal(f)}`).join(",\n")}\n})`;
}

/** a copy of a draft as a new document: nothing in it was read, so everything in it is new */
export function asNew(fields: Field[]): Field[] {
  return fields.filter((f) => !f.removed && f.key !== "_id").map(function fresh(f): Field {
    return { ...f, id: fid(), orig: undefined, kids: f.kids?.filter((k) => !k.removed).map(fresh) };
  });
}

/** a field after its type was changed: the text kept when it still reads, objects and arrays start empty */
export function retype(f: Field, type: BsonType): Field {
  if (type === f.type) return f;
  const next: Field = { ...f, type, kids: undefined };
  if (type === "object" || type === "array") next.kids = [];
  else if (type === "null") next.text = "";
  else if (type === "bool") next.text = /^(true|false)$/.test(f.text) ? f.text : "true";
  else if (type === "date") next.text = /^\d{4}-/.test(f.text) ? f.text : new Date().toISOString();
  else if (f.kids) next.text = "";
  return next;
}

export const newField = (key: string): Field => ({ id: fid(), key, type: "string", text: "" });
