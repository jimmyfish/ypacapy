import "./DocCards.css";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useStore } from "../store";
import { fieldsOf, shellInline, shellPretty, typeOf } from "../lib/bson";
import {
  EDIT_TYPES,
  TYPE_LABEL,
  asNew,
  changeCount,
  deleteCommand,
  firstInvalid,
  insertCommand,
  invalid,
  newField,
  retype,
  toDraft,
  touched,
  uncopyable,
  updateCommand,
  updateOf,
  type Field,
} from "../lib/docEdit";
import { ShellText } from "./ResultGrid";
import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, CirclePlus, Copy, CopyPlus, Lock, Pencil, Shredder, Undo2, WandSparkles, ico } from "./Icon";

/**
 * MongoDB's JSON view, as Compass shows it: a card per document, a line per field. Objects and arrays fold
 * (closed at first; a click anywhere on the line opens one); a closed one says what it is and how big, with a
 * faint peek inside. With `edit` (a collection tab) a card is edited in place, duplicated, or deleted: the change
 * is one updateOne / insertOne / deleteOne on the document's _id, run through the write guard (lib/docEdit.ts).
 */
export interface DocEdit {
  tabId: string;
  collection: string;
  /** the projection hides fields: a duplicate copies only what is on screen */
  projected: boolean;
}

/** at: the document's index; -1 is a new document added at the top. note: what a new card says it is */
type Mode = { kind: "edit" | "del" | "new"; at: number; draft: Field[]; err?: string; busy?: boolean; focus?: string; note?: string; blank?: boolean };

const isContainer = (f: Field) => f.type === "object" || f.type === "array";
const hex24 = () => Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
/** an empty value of each type, as the editor holds it (Example from fields) */
const EMPTY: Partial<Record<Field["type"], () => string>> = {
  string: () => "",
  int32: () => "0",
  int64: () => "0",
  double: () => "0",
  decimal128: () => "0",
  bool: () => "false",
  date: () => new Date().toISOString(),
  objectId: hex24,
};
const live = (fs: Field[] | undefined) => (fs ?? []).filter((k) => !k.removed);

/** a closed object: Object and its field names; a closed array: Array (n) and its first values */
function Peek({ f }: { f: Field }) {
  const kids = live(f.kids);
  const peek =
    f.type === "array"
      ? kids.map((k) => (isContainer(k) ? (k.type === "array" ? `[…]` : `{ ${live(k.kids).map((x) => x.key).join(", ")} }`) : scalarText(k))).join(", ")
      : kids.map((k) => k.key).join(", ");
  return (
    <>
      <span className="jv-kind">{f.type === "array" ? `Array (${kids.length})` : "Object"}</span>
      {peek && <span className="jv-peek">{peek}</span>}
    </>
  );
}

/** a scalar in mongosh's words, from the draft (what is shown when not editing) */
function scalarText(f: Field): string {
  if (f.locked !== undefined) return f.locked;
  if (f.orig && f.orig.type === f.type && f.orig.text === f.text && typeOf(f.orig.value) === f.type) return shellInline(f.orig.value);
  switch (f.type) {
    case "string":
      return `'${f.text}'`;
    case "int64":
      return `Long('${f.text}')`;
    case "decimal128":
      return `Decimal128('${f.text}')`;
    case "objectId":
      return `ObjectId('${f.text}')`;
    case "date":
      return `ISODate('${f.text}')`;
    case "null":
      return "null";
    default:
      return f.text;
  }
}

/** an editable value: the type's wrapper around a box as wide as its text */
const WRAP: Partial<Record<Field["type"], [string, string]>> = { string: ["'", "'"], int64: ["Long('", "')"], decimal128: ["Decimal128('", "')"], objectId: ["ObjectId('", "')"], date: ["ISODate('", "')"] };

/**
 * addKey: set (non-zero) to open an empty new document at the top; onAdded says it was taken. onDrafting: whether a
 * new document is open, so the page can keep this list up for it even when the page has no documents.
 */
export function DocCards({ docs, label, edit, addKey, onAdded, onDrafting }: { docs: unknown[]; label: string; edit?: DocEdit; addKey?: number; onAdded?: () => void; onDrafting?: (on: boolean) => void }) {
  const st = useStore.getState();
  const drafts = useMemo(() => docs.map(toDraft), [docs]);
  // open objects and arrays, by document and field path; a new page closes them all
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<Mode | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    setOpen((o) => (Object.keys(o).length ? {} : o));
    setMode(null);
  }, [docs]);
  // Add document (the toolbar's +): after the reset above, so a fresh mount keeps it
  useEffect(() => {
    if (!addKey || !edit) return;
    const f = newField("field");
    setMode({ kind: "new", at: -1, draft: [f], focus: f.id, blank: true, note: "New document, not inserted yet" });
    onAdded?.();
  }, [addKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const drafting = mode?.kind === "new";
  useEffect(() => onDrafting?.(drafting), [drafting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening slides (styles: .jv-kids). Nested fields mount on first open and stay; one never opened is not drawn,
  // so a long array costs nothing until it is. A first open mounts closed, then opens on the next frame, so it
  // slides too.
  const fold = (keys: string[], value: boolean) => {
    setOpen((o) => ({ ...o, ...Object.fromEntries(keys.map((k) => [k, value && !(k in o) ? false : value])) }));
    if (value) requestAnimationFrame(() => requestAnimationFrame(() => setOpen((o) => ({ ...o, ...Object.fromEntries(keys.map((k) => [k, true])) }))));
  };

  const put = (fn: (fs: Field[]) => Field[]) => setMode((m) => (m ? { ...m, draft: fn(m.draft), err: undefined } : m));
  const change = (id: string, fn: (f: Field) => Field | null) =>
    put(function walk(fs: Field[]): Field[] {
      return fs.flatMap((f) => {
        if (f.id === id) {
          const n = fn(f);
          return n ? [n] : [];
        }
        return f.kids ? [{ ...f, kids: walk(f.kids) }] : [f];
      });
    });
  const origOf = (fs: Field[], id: string): Field | undefined => {
    for (const f of fs) {
      if (f.id === id) return f;
      const k = f.kids && origOf(f.kids, id);
      if (k) return k;
    }
  };

  const start = (kind: Mode["kind"], at: number, focus?: string) => {
    const d = drafts[at];
    setMode({ kind, at, focus, draft: kind === "new" ? asNew(d) : d.map((f) => ({ ...f })) });
  };
  const doc = (i: number) => docs[i] as Record<string, unknown>;
  const idOf = (i: number) => doc(i)?._id;

  async function send() {
    if (!mode || !edit || mode.busy) return;
    const id = idOf(mode.at);
    const [cmd, what] =
      mode.kind === "del"
        ? [deleteCommand(edit.collection, id), { help: `It deletes 1 document from ${edit.collection}:`, label: "Delete" }]
        : mode.kind === "new"
          ? [insertCommand(edit.collection, mode.draft), { help: `It adds 1 document to ${edit.collection}:`, label: "Insert", safe: true }]
          : [updateCommand(edit.collection, id, mode.draft), { help: `It changes 1 document in ${edit.collection}:`, label: "Update" }];
    setMode((m) => m && { ...m, busy: true, err: undefined });
    const err = await st.writeDoc(edit.tabId, cmd, what);
    // null: written, and the page is read again (which closes the card); undefined: the ask was cancelled
    setMode((m) => m && { ...m, busy: false, err: err ?? undefined });
  }

  const onKey = (e: KeyboardEvent) => {
    if (!mode) return;
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (canSend) void send();
    } else if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMode(null);
    }
  };

  const bad = mode && mode.kind !== "del" ? firstInvalid(mode.draft) : null;
  const n = mode?.kind === "edit" ? changeCount(mode.draft) : 0;
  const blocked = mode?.kind === "new" ? uncopyable(mode.draft) : mode?.kind === "edit" ? uncopyable(updateOf(mode.draft).whole) : null;
  const canSend = !!mode && !mode.busy && !bad && !blocked && (mode.kind !== "edit" || n > 0);

  // one line of a field, and its children when open
  // plain functions, not components: a component made inside this one would remount on every keystroke
  function line(f: Field, depth: number, path: string, at: number, editing: boolean, inArray: boolean, fresh: boolean): ReactNode {
    const key = `${at}:${path}`;
    const kids = live(f.kids);
    const folds = isContainer(f) && (kids.length > 0 || editing);
    const isOpen = folds && !!open[key];
    const fixedId = depth === 0 && f.key === "_id";
    const canEdit = editing && !fixedId && f.locked === undefined && !f.removed;
    const err = editing ? invalid(f) : null;
    const toggle = () => folds && fold([key], !open[key]);
    const changed = editing && !fresh && !!f.orig && !f.removed && (f.orig.key !== f.key || f.orig.type !== f.type || (!f.kids && f.orig.text !== f.text));
    const orig = mode ? origOf(drafts[mode.at] ?? [], f.id) : undefined;

    let value: ReactNode;
    if (fixedId && mode?.kind === "new" && editing) value = <span className="jv-newid">new ObjectId, made on insert</span>;
    else if (isContainer(f)) value = kids.length ? <Peek f={f} /> : <span className="jp">{f.type === "array" ? "[]" : "{}"}</span>;
    else if (canEdit && f.type !== "null") {
      const [pre, post] = WRAP[f.type] ?? ["", ""];
      value = (
        <>
          {pre && <span className={f.type === "string" ? "js" : "jf"}>{pre}</span>}
          <input
            className={`jv-in ${f.type === "string" ? "js" : f.type === "bool" ? "jn" : /^(int|double|decimal)/.test(f.type) ? "jnum" : "js"}`}
            style={{ width: `${Math.max(2, f.text.length + 1)}ch` }}
            value={f.text}
            spellCheck={false}
            autoFocus={mode?.focus === f.id}
            aria-label={`${f.key}, ${TYPE_LABEL[f.type]}`}
            aria-invalid={err ? true : undefined}
            title={err ?? undefined}
            onChange={(e) => change(f.id, (x) => ({ ...x, text: e.target.value }))}
          />
          {post && <span className={f.type === "string" ? "js" : "jf"}>{post}</span>}
        </>
      );
    } else value = <ShellText s={scalarText(f)} />;

    return (
      <div key={f.id} className={`jv-node${f.removed ? " jv-del" : ""}`}>
        <div
          className={`jv-row${changed ? " jv-chg" : ""}${editing && !f.orig && !fresh ? " jv-new" : ""}${folds ? " jv-folds" : ""}`}
          style={{ ["--d" as string]: depth }}
          onClick={(e) => {
            // a click anywhere on a foldable line folds it, but not on a control or after selecting text
            if ((e.target as HTMLElement).closest("input, select, button:not(.jv-caret)") || String(getSelection())) return;
            toggle();
          }}
          onDoubleClick={(e) => {
            if (!edit || mode || fixedId || f.locked !== undefined || isContainer(f) || f.type === "null") return;
            e.preventDefault();
            start("edit", at, f.id);
          }}
        >
          {folds ? (
            // its click (mouse, Enter or Space) reaches the line, which folds; a handler here too would fold twice
            <button type="button" className="jv-caret" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} ${f.key}`}>
              <ChevronRight {...ico} />
            </button>
          ) : (
            <span className="jv-caret-sp" />
          )}
          {canEdit && !inArray ? (
            <input
              className="jv-in jv-k"
              style={{ width: `${Math.max(2, f.key.length + 1)}ch` }}
              value={f.key}
              spellCheck={false}
              aria-label="Field name"
              onChange={(e) => change(f.id, (x) => ({ ...x, key: e.target.value }))}
            />
          ) : (
            <span className={`jv-k${inArray ? " jv-idx" : ""}`}>{f.key}</span>
          )}
          <span className="jp">:</span>
          <span className="jv-v">{value}</span>
          {editing && (
            <span className="jv-tools">
              {fixedId ? (
                <span className="jv-lock">
                  <Lock {...ico} />
                  {mode?.kind === "new" ? "set by the server" : "_id is fixed"}
                </span>
              ) : f.locked !== undefined ? (
                <>
                  <span className="jv-lock" title="ypacapy keeps this value as it is">
                    <Lock {...ico} />
                    {TYPE_LABEL[f.type]}
                  </span>
                  {removeUndo(f, orig, fresh)}
                </>
              ) : (
                <>
                  {isContainer(f) && !f.removed && (
                    <button
                      type="button"
                      className="icon-btn"
                      title={f.type === "array" ? "Add an item" : "Add a field inside"}
                      aria-label={f.type === "array" ? `Add an item to ${f.key}` : `Add a field to ${f.key}`}
                      onClick={() => {
                        const add = newField(f.type === "array" ? String(kids.length) : "field");
                        change(f.id, (x) => ({ ...x, kids: [...(x.kids ?? []), add] }));
                        fold([key], true);
                        setMode((m) => m && { ...m, focus: add.id });
                      }}
                    >
                      <CirclePlus {...ico} />
                    </button>
                  )}
                  <select
                    className="jv-type"
                    aria-label={`Type of ${f.key}`}
                    value={f.type}
                    disabled={f.removed}
                    onChange={(e) => change(f.id, (x) => retype(x, e.target.value as Field["type"]))}
                  >
                    {EDIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  {removeUndo(f, orig, fresh)}
                </>
              )}
            </span>
          )}
        </div>
        {folds && key in open && (
          <div className={`jv-kids${isOpen ? " open" : ""}`}>
            <div className="jv-kids-in">{(f.kids ?? []).map((k) => line(k, depth + 1, `${path}.${k.orig?.key ?? k.id}`, at, editing, f.type === "array", fresh))}</div>
          </div>
        )}
      </div>
    );
  }

  // remove (shredder) and its undo; a field added here just goes
  function removeUndo(f: Field, orig: Field | undefined, fresh: boolean): ReactNode {
    const undoable = !fresh && f.orig && (f.removed || touched(f));
    return (
      <>
        {!fresh && (
          <button
            type="button"
            className="icon-btn jv-undo"
            title="Undo this change"
            aria-label={`Undo the change to ${f.orig?.key ?? f.key}`}
            style={{ visibility: undoable ? "visible" : "hidden" }}
            onClick={() => orig && change(f.id, () => orig)}
          >
            <Undo2 {...ico} />
          </button>
        )}
        {!f.removed && (
          <button type="button" className="icon-btn jv-rm" title="Remove this field" aria-label={`Remove ${f.key}`} onClick={() => change(f.id, (x) => (x.orig && !fresh ? { ...x, removed: true } : null))}>
            <Shredder {...ico} />
          </button>
        )}
      </>
    );
  }

  // Example from fields: the paths and types the Fields tab lists (from the documents on this page; nothing is
  // read), as a document with an empty value of each field's type. An array of objects gets one object; _id is
  // left to the server. A field's first type seen wins, null only when it is all there was.
  function example() {
    const fields = fieldsOf(docs);
    type Node = { type?: string; kids: Map<string, Node> };
    const root: Node = { kids: new Map() };
    for (const { path, types } of fields) {
      if (path === "_id") continue;
      const t = types.split(", ").find((x) => x !== "null") ?? "null";
      let at = root;
      path.split(".").forEach((p, i, parts) => {
        if (!at.kids.has(p)) at.kids.set(p, { kids: new Map() });
        at = at.kids.get(p)!;
        if (i === parts.length - 1) at.type = t;
        else if (at.type === "array of object") {
          if (!at.kids.has("0")) at.kids.set("0", { type: "object", kids: new Map() });
          at = at.kids.get("0")!;
        }
      });
    }
    const make = (key: string, n: Node): Field => {
      const raw = n.type === "array of object" ? "array" : (n.type ?? "object");
      // a type the editor cannot write (binary, regex…) starts as null
      const type = ((EDIT_TYPES as readonly string[]).includes(raw) ? raw : "null") as Field["type"];
      const f = { ...newField(key), type, text: EMPTY[type]?.() ?? "" };
      if (type === "object" || type === "array") f.kids = [...n.kids].map(([k, c]) => make(k, c));
      return f;
    };
    const draft = [...root.kids].map(([k, n]) => make(k, n));
    setMode((m) => m && { ...m, draft, blank: false, focus: undefined, note: `Example from the ${fields.length} fields on this page, not inserted yet` });
    fold(containers(draft, "", -1), true);
  }

  const containers = (fs: Field[], base: string, at: number): string[] =>
    fs.flatMap((f) => {
      const p = `${base}.${f.orig?.key ?? f.id}`;
      return isContainer(f) && live(f.kids).length ? [`${at}:${p}`, ...containers(f.kids ?? [], p, at)] : [];
    });

  function card(at: number, fresh: boolean): ReactNode {
    const mine = mode && mode.at === at && (mode.kind === "new") === fresh ? mode : null;
    const editing = !!mine && mine.kind !== "del";
    const fields = mine ? mine.draft : drafts[at];
    const all = containers(fields, "", at);
    const allOpen = all.length > 0 && all.every((k) => open[k]);
    const hasId = idOf(at) !== undefined;
    const noId = "The projection leaves _id out, so this document can't be picked out to change";
    return (
      <article key={fresh ? `new${at}` : `doc${at}`} className="jv-doc" data-mode={mine?.kind} aria-label={fresh ? "New document, a copy" : `Document ${at + 1}`} onKeyDown={onKey}>
        {!mine && (
          <div className="jv-acts" role="toolbar" aria-label={`Document ${at + 1}`}>
            <button
              type="button"
              className="icon-btn"
              title={allOpen ? "Collapse all" : "Expand all"}
              aria-label={allOpen ? "Collapse all" : "Expand all"}
              disabled={!all.length}
              onClick={() => fold(all, !allOpen)}
            >
              {allOpen ? <ChevronsDownUp {...ico} /> : <ChevronsUpDown {...ico} />}
            </button>
            {edit && (
              <>
                <button type="button" className="icon-btn" title={hasId ? "Edit document" : noId} aria-label="Edit document" disabled={!hasId || !!mode} onClick={() => start("edit", at)}>
                  <Pencil {...ico} />
                </button>
                <button type="button" className="icon-btn" title="Duplicate document" aria-label="Duplicate document" disabled={!!mode} onClick={() => start("new", at)}>
                  <CopyPlus {...ico} />
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-btn"
              title={copied === at ? "Copied" : "Copy document"}
              aria-label="Copy document"
              onClick={() =>
                void navigator.clipboard?.writeText(shellPretty(docs[at])).then(() => {
                  setCopied(at);
                  setTimeout(() => setCopied((c) => (c === at ? null : c)), 1200);
                })
              }
            >
              {copied === at ? <Check {...ico} /> : <Copy {...ico} />}
            </button>
            {edit && (
              <button type="button" className="icon-btn jv-danger" title={hasId ? "Delete document" : noId} aria-label="Delete document" disabled={!hasId || !!mode} onClick={() => setMode({ kind: "del", at, draft: drafts[at] })}>
                <Shredder {...ico} />
              </button>
            )}
          </div>
        )}
        <div className="jv-body">
          {fields.map((f) => line(f, 0, `.${f.orig?.key ?? f.id}`, at, editing, false, fresh))}
        </div>
        {editing && (
          <button
            type="button"
            className="btn btn--quiet jv-add"
            onClick={() => {
              const add = newField(`field${mine!.draft.filter((f) => !f.orig).length + 1}`);
              setMode((m) => m && { ...m, draft: [...m.draft, add], focus: add.id });
            }}
          >
            <CirclePlus {...ico} />
            Add field
          </button>
        )}
        {mine && (
          <div className="jv-foot">
            <span className={`jv-msg${mine.err || bad || blocked ? " err" : ""}`} role="status">
              {mine.err ??
                (bad ? bad[1] : blocked) ??
                (mine.kind === "del"
                  ? "Delete this document?"
                  : mine.kind === "new"
                    ? (mine.note ??
                      (edit?.projected ? "Copy, not inserted yet. Only the fields on screen are copied: the projection hides some" : "Copy, not inserted yet"))
                    : n
                      ? `${n} change${n > 1 ? "s" : ""}, not sent yet`
                      : "Nothing changed yet")}
            </span>
            {mine.kind === "new" && mine.blank && (
              <button type="button" className="btn btn--quiet jv-example" title="Fill in the fields this page shows (its Fields tab), each with an empty value of its type. Nothing is read." onClick={example}>
                <WandSparkles {...ico} />
                Example from fields
              </button>
            )}
            <button type="button" className="btn" disabled={mine.busy} onClick={() => setMode(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${mine.kind === "del" ? "btn--danger" : "btn--primary"}`}
              disabled={!canSend}
              aria-busy={mine.busy || undefined}
              title={`${mine.kind === "del" ? "Delete" : mine.kind === "new" ? "Insert" : "Update"}  ⌘↵`}
              onClick={() => void send()}
            >
              {mine.busy && <span className="spinner" />}
              {mine.kind === "del" && <Shredder {...ico} />}
              {mine.kind === "del" ? "Delete" : mine.kind === "new" ? "Insert" : "Update"}
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="jv-list" tabIndex={0} aria-label={label}>
      {mode?.kind === "new" && mode.at === -1 && card(-1, true)}
      {docs.flatMap((_, i) => [card(i, false), mode?.kind === "new" && mode.at === i ? card(i, true) : null])}
    </div>
  );
}
