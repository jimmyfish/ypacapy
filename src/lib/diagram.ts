/**
 * Read-only ER diagram of the tables picked from a schema: the tables with their columns and the
 * foreign keys between them, laid out in layers so a referenced table sits left of the tables that reference it.
 * Pure: no DOM, no Tauri; the diagram tab draws it, and the Hallmark preview inlines this file as is.
 *
 * Ported from opengrip's src/features/database/diagram.ts (Apache-2.0). Changes: the model reads ypacapy's
 * schema_diagram (SchemaDiagram) in place of opengrip's completion model; a diagram shows the tables picked in
 * a picker, not a whole schema or one table's neighbourhood; each table carries its unique keys, so cardinality
 * needs no second lookup.
 */
import type { ErdTable, SchemaDiagram } from "../types";

/** What a diagram tab shows: the tables of `schema` picked in its table picker. */
export interface DiagramRef {
  schema: string;
  tables: readonly string[];
}

export interface DiagramColumn {
  name: string;
  type: string;
  primaryKey: boolean;
  foreignKey: boolean;
  nullable: boolean;
}

export interface DiagramTable {
  key: string;
  schema: string;
  name: string;
  /** `schema.name` for a table outside the diagram's schema. */
  label: string;
  kind: ErdTable["kind"];
  columns: DiagramColumn[];
  /** unique keys other than the primary key: with it, they tell a one-to-one key from a many-to-one */
  uniques: string[][];
}

/** A foreign key from `from` (the referencing table) to `to`. */
export interface DiagramEdge {
  /** the constraint's name */
  name: string;
  from: string;
  to: string;
  columns: string[];
  refColumns: string[];
}

export interface DiagramModel {
  tables: DiagramTable[];
  edges: DiagramEdge[];
}

/** Columns a table box lists: all, only primary and foreign key columns, or none. */
export type DiagramDetail = "all" | "keys" | "none";

export const tableKey = (schema: string, name: string) => `${schema}\u0000${name}`;

/**
 * The tables and foreign keys of a diagram: the picked tables of `ref.schema`, plus the tables of other
 * schemas a foreign key links to a picked one (they can't be picked, and are few).
 */
export function diagramModel(d: SchemaDiagram, ref: DiagramRef): DiagramModel {
  const fkColumns = new Map<string, Set<string>>();
  for (const k of d.keys) {
    const key = tableKey(k.schema, k.table);
    const set = fkColumns.get(key) ?? new Set<string>();
    k.columns.forEach((col) => set.add(col));
    fkColumns.set(key, set);
  }
  const byKey = new Map(d.tables.map((t) => [tableKey(t.schema, t.name), t]));
  const picked = new Set(ref.tables);
  const core = (schema: string, name: string) => schema === ref.schema && picked.has(name);
  const included = new Set(d.tables.filter((t) => core(t.schema, t.name)).map((t) => tableKey(t.schema, t.name)));
  for (const k of d.keys) {
    const from = tableKey(k.schema, k.table);
    const to = tableKey(k.refSchema, k.refTable);
    if (core(k.schema, k.table) && k.refSchema !== ref.schema && byKey.has(to)) included.add(to);
    if (core(k.refSchema, k.refTable) && k.schema !== ref.schema && byKey.has(from)) included.add(from);
  }
  const tables: DiagramTable[] = [];
  for (const key of included) {
    const t = byKey.get(key)!;
    const fks = fkColumns.get(key);
    tables.push({
      key,
      schema: t.schema,
      name: t.name,
      label: t.schema === ref.schema ? t.name : `${t.schema}.${t.name}`,
      kind: t.kind,
      columns: t.columns.map((col) => ({ name: col.name, type: col.type, primaryKey: col.primary, foreignKey: fks?.has(col.name) ?? false, nullable: col.nullable })),
      uniques: t.uniques,
    });
  }
  tables.sort((a, b) => a.label.localeCompare(b.label));
  const edges = d.keys
    .map((k) => ({ name: k.name, from: tableKey(k.schema, k.table), to: tableKey(k.refSchema, k.refTable), columns: k.columns, refColumns: k.refColumns }))
    .filter((e) => included.has(e.from) && included.has(e.to));
  return { tables, edges };
}

/** The picker's Add linked tables: `picked` and every table one foreign key away from one of them, in `all`'s order. */
export function withLinked(all: readonly string[], picked: readonly string[], links: readonly (readonly [string, string])[]): string[] {
  const on = new Set(picked);
  const add = new Set(picked);
  for (const [a, b] of links) {
    if (on.has(a)) add.add(b);
    if (on.has(b)) add.add(a);
  }
  return all.filter((t) => add.has(t));
}

export function visibleColumns(t: DiagramTable, detail: DiagramDetail): DiagramColumn[] {
  if (detail === "none") return [];
  if (detail === "keys") return t.columns.filter((c) => c.primaryKey || c.foreignKey);
  return t.columns;
}

// ---- geometry ------------------------------------------------------------------

/** Box metrics; the view renders boxes in a 12px monospace font to match `CHAR_W`. */
export const HEADER_H = 26;
export const ROW_H = 20;
export const BODY_PAD = 4;
const CHAR_W = 7.3;
const ICON_W = 22;
const SIDE_PAD = 10;
const TYPE_GAP = 18;
const MIN_W = 120;
const MAX_W = 440;

const LAYER_GAP = 100;
const SUBCOLUMN_GAP = 48;
const ROW_GAP = 28;
const MAX_COLUMN_H = 1400;
const MARGIN = 24;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boxSize(t: DiagramTable, detail: DiagramDetail): { w: number; h: number } {
  const cols = visibleColumns(t, detail);
  const header = ICON_W + t.label.length * CHAR_W;
  const rows = cols.map((c) => ICON_W + c.name.length * CHAR_W + TYPE_GAP + c.type.length * CHAR_W);
  const w = Math.ceil(Math.min(MAX_W, Math.max(MIN_W, header + 2 * SIDE_PAD, ...rows.map((r) => r + 2 * SIDE_PAD))));
  return { w, h: HEADER_H + (cols.length ? cols.length * ROW_H + 2 * BODY_PAD : 0) };
}

export interface DiagramLayout {
  boxes: Map<string, Box>;
  width: number;
  height: number;
}

/**
 * Places the tables: those linked by foreign keys in columns, each table one
 * column right of the right-most table it references (cycles are cut where the
 * walk meets them), ordered to keep linked tables level; unlinked tables in
 * rows below. A column taller than `MAX_COLUMN_H` wraps into sub-columns.
 */
export function layoutDiagram(model: DiagramModel, detail: DiagramDetail): DiagramLayout {
  const size = new Map(model.tables.map((t) => [t.key, boxSize(t, detail)]));
  const parents = new Map<string, Set<string>>();
  const children = new Map<string, Set<string>>();
  for (const e of model.edges) {
    if (e.from === e.to) continue;
    if (!parents.has(e.from)) parents.set(e.from, new Set());
    if (!children.has(e.to)) children.set(e.to, new Set());
    parents.get(e.from)!.add(e.to);
    children.get(e.to)!.add(e.from);
  }
  const linked = model.tables.filter((t) => parents.has(t.key) || children.has(t.key)).map((t) => t.key);
  const isolated = model.tables.filter((t) => !parents.has(t.key) && !children.has(t.key)).map((t) => t.key);

  // Layers: longest path to a table that references nothing.
  const layer = new Map<string, number>();
  const visiting = new Set<string>();
  const layerOf = (k: string): number => {
    const known = layer.get(k);
    if (known !== undefined) return known;
    visiting.add(k);
    let l = 0;
    for (const p of parents.get(k) ?? []) if (!visiting.has(p)) l = Math.max(l, layerOf(p) + 1);
    visiting.delete(k);
    layer.set(k, l);
    return l;
  };
  linked.forEach(layerOf);
  // Pull a referenced table right, next to the nearest table referencing it, so its
  // lines don't cross a column (and run behind its boxes). Right-most first, so moves cascade.
  for (const k of [...linked].sort((a, b) => layer.get(b)! - layer.get(a)!)) {
    const below = [...(children.get(k) ?? [])].map((c) => layer.get(c)!).filter((l) => l > layer.get(k)!);
    if (below.length && below.length === children.get(k)!.size) layer.set(k, Math.min(...below) - 1);
  }
  // Renumber without gaps should a column have emptied.
  const used = [...new Set(layer.values())].sort((a, b) => a - b);
  for (const [k, l] of layer) layer.set(k, used.indexOf(l));
  const layers: string[][] = [];
  for (const k of linked) (layers[layer.get(k)!] ??= []).push(k);

  // Order within layers by the mean position of linked tables in the neighbouring layer.
  const pos = new Map<string, number>();
  const index = () => layers.forEach((l) => l.forEach((k, i) => pos.set(k, i)));
  index();
  const neighbours = (k: string) => [...(parents.get(k) ?? []), ...(children.get(k) ?? [])];
  const sweep = (l: number, adjacent: number) => {
    const row = layers[l];
    if (!row) return;
    const centre = (k: string) => {
      const ns = neighbours(k).filter((n) => layer.get(n) === adjacent);
      return ns.length ? ns.reduce((s, n) => s + pos.get(n)!, 0) / ns.length : pos.get(k)!;
    };
    const keyed = row.map((k) => [k, centre(k)] as const);
    keyed.sort((a, b) => a[1] - b[1]);
    layers[l] = keyed.map(([k]) => k);
    layers[l]!.forEach((k, i) => pos.set(k, i));
  };
  for (let pass = 0; pass < 4; pass++) {
    for (let l = 1; l < layers.length; l++) sweep(l, l - 1);
    for (let l = layers.length - 2; l >= 0; l--) sweep(l, l + 1);
  }

  // Split tall layers into sub-columns, then place the columns left to right.
  const columns: { keys: string[]; gapBefore: number }[] = [];
  for (const row of layers) {
    let current: string[] = [];
    let h = 0;
    let firstOfLayer = true;
    const flush = () => {
      const gapBefore = !columns.length ? 0 : firstOfLayer ? LAYER_GAP : SUBCOLUMN_GAP;
      columns.push({ keys: current, gapBefore });
      firstOfLayer = false;
      current = [];
      h = 0;
    };
    for (const k of row) {
      const bh = size.get(k)!.h;
      if (current.length && h + bh > MAX_COLUMN_H) flush();
      current.push(k);
      h += bh + ROW_GAP;
    }
    if (current.length) flush();
  }
  const heights = columns.map((c) => c.keys.reduce((s, k) => s + size.get(k)!.h, 0) + (c.keys.length - 1) * ROW_GAP);
  const tallest = Math.max(0, ...heights);
  const boxes = new Map<string, Box>();
  let x = MARGIN;
  columns.forEach((c, i) => {
    x += c.gapBefore;
    const w = Math.max(...c.keys.map((k) => size.get(k)!.w));
    let y = MARGIN + (tallest - heights[i]!) / 2;
    for (const k of c.keys) {
      const s = size.get(k)!;
      boxes.set(k, { x, y, ...s });
      y += s.h + ROW_GAP;
    }
    x += w;
  });
  let width = columns.length ? x + MARGIN : 0;
  let height = columns.length ? MARGIN + tallest + MARGIN : 0;

  // Unlinked tables: rows below, wrapped at the linked block's width (or a sane minimum).
  if (isolated.length) {
    const wrap = Math.max(width - MARGIN, 1200);
    let rx = MARGIN;
    let ry = height ? height + ROW_GAP : MARGIN;
    let rowH = 0;
    for (const k of isolated) {
      const s = size.get(k)!;
      if (rx > MARGIN && rx + s.w > wrap) {
        rx = MARGIN;
        ry += rowH + ROW_GAP;
        rowH = 0;
      }
      boxes.set(k, { x: rx, y: ry, ...s });
      rx += s.w + SUBCOLUMN_GAP;
      rowH = Math.max(rowH, s.h);
      width = Math.max(width, rx - SUBCOLUMN_GAP + MARGIN);
    }
    height = ry + rowH + MARGIN;
  }
  return { boxes, width, height };
}

/** Vertical centre of `column`'s row in a box, or of the header when the column isn't listed. */
function anchorY(box: Box, t: DiagramTable, column: string | undefined, detail: DiagramDetail): number {
  const i = column === undefined ? -1 : visibleColumns(t, detail).findIndex((c) => c.name === column);
  return i < 0 ? box.y + HEADER_H / 2 : box.y + HEADER_H + BODY_PAD + i * ROW_H + ROW_H / 2;
}

const ARROW = 7;

/**
 * The line of a foreign key, from the referencing column to the referenced one,
 * and its arrowhead at the referenced end. Tables side by side are joined
 * facing edge to facing edge; tables in one column, and a table referencing
 * itself, by a loop on their right.
 */
export function edgeGeometry(
  e: DiagramEdge,
  layout: DiagramLayout,
  tables: ReadonlyMap<string, DiagramTable>,
  detail: DiagramDetail,
): EdgeGeometry | null {
  const a = layout.boxes.get(e.from);
  const b = layout.boxes.get(e.to);
  const ta = tables.get(e.from);
  const tb = tables.get(e.to);
  if (!a || !b || !ta || !tb) return null;
  const y1 = anchorY(a, ta, e.columns[0], detail);
  const y2 = anchorY(b, tb, e.refColumns[0], detail);
  let x1: number, x2: number, c1: number, c2: number, dir: 1 | -1, out1: 1 | -1;
  if (e.from !== e.to && b.x + b.w < a.x) {
    // Referenced table on the left.
    x1 = a.x;
    x2 = b.x + b.w + ARROW;
    const bend = Math.max(30, (x1 - x2) / 2);
    c1 = x1 - bend;
    c2 = x2 + bend;
    dir = -1;
    out1 = -1;
  } else if (e.from !== e.to && a.x + a.w < b.x) {
    x1 = a.x + a.w;
    x2 = b.x - ARROW;
    const bend = Math.max(30, (x2 - x1) / 2);
    c1 = x1 + bend;
    c2 = x2 - bend;
    dir = 1;
    out1 = 1;
  } else {
    x1 = a.x + a.w;
    x2 = b.x + b.w + ARROW;
    const out = Math.max(x1, x2) + 40 + Math.abs(y2 - y1) / 8;
    c1 = out;
    c2 = out;
    dir = -1;
    out1 = 1;
  }
  const tip = x2 + dir * ARROW;
  const path = `M${x1},${y1} C${c1},${y1} ${c2},${y2} ${x2},${y2}`;
  const arrow = `M${tip},${y2} L${x2},${y2 - ARROW / 2 - 1} L${x2},${y2 + ARROW / 2 + 1} Z`;
  // The curve's point at t = ½: where the foreign key's name goes.
  const mid = { x: (x1 + 3 * c1 + 3 * c2 + x2) / 8, y: (y1 + y2) / 2 };
  return { path, arrow, mid, start: { x: x1, y: y1, out: out1 }, end: { x: tip, y: y2, out: -dir as 1 | -1 } };
}

/** Where a line leaves a box, and which way (`out`: -1 left, 1 right) it heads away from it. */
export interface EdgeEnd {
  x: number;
  y: number;
  out: 1 | -1;
}

export interface EdgeGeometry {
  path: string;
  arrow: string;
  /** The referencing end. */
  start: EdgeEnd;
  /** The referenced end (the arrow's tip). */
  end: EdgeEnd;
  /** Middle of the line. */
  mid: { x: number; y: number };
}

// ---- relations of the selected table -----------------------------------------------

/**
 * How the ends of a foreign key relate: `from` is `1` when its columns hold a
 * primary key or unique key of the referencing table (one-to-one), else `*`;
 * `to` is `0..1` when every foreign key column is nullable (a row may reference none).
 */
export interface Cardinality {
  from: "1" | "*";
  to: "1" | "0..1";
  kind: "1:1" | "N:1";
}

export function cardinality(e: DiagramEdge, from: DiagramTable): Cardinality {
  const fk = new Set(e.columns);
  const pk = from.columns.filter((c) => c.primaryKey).map((c) => c.name);
  const one = [pk, ...from.uniques].some((k) => k.length > 0 && k.every((c) => fk.has(c)));
  const optional = e.columns.length > 0 && e.columns.every((c) => from.columns.find((x) => x.name === c)?.nullable);
  return { from: one ? "1" : "*", to: optional ? "0..1" : "1", kind: one ? "1:1" : "N:1" };
}

/** `orders.user_id bigint → users.id bigint · N:1`; composite keys list their columns in parentheses. */
export function edgeLabel(e: DiagramEdge, from: DiagramTable, to: DiagramTable, c: Cardinality): string {
  const side = (t: DiagramTable, cols: string[]) => {
    const names = cols.length === 1 ? cols[0]! : `(${cols.join(", ")})`;
    const types = cols.map((n) => t.columns.find((x) => x.name === n)?.type ?? "?").join(", ");
    return `${t.label}.${names} ${types}`;
  };
  return `${side(from, e.columns)} → ${side(to, e.refColumns)} · ${c.kind}`;
}

/** The columns each table links through on the foreign keys of `selected`: referencing and referenced ones. */
export function linkedColumns(edges: readonly DiagramEdge[], selected: string | null): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (selected === null) return out;
  const add = (table: string, cols: string[]) => {
    const set = out.get(table) ?? new Set<string>();
    cols.forEach((c) => set.add(c));
    out.set(table, set);
  };
  for (const e of edges) {
    if (e.from !== selected && e.to !== selected) continue;
    add(e.from, e.columns);
    add(e.to, e.refColumns);
  }
  return out;
}

/**
 * The layout of a diagram that was saved: each table with a saved place stays there, sized for the columns it
 * has now (a table altered since may grow over its neighbours; that is accepted). Tables without one (ticked or
 * created after the save) are laid out among themselves and set to the right of the saved ones, so saving
 * never has them shuffle what the person arranged. With nothing saved this is `layoutDiagram`.
 */
export function layoutWithSaved(model: DiagramModel, detail: DiagramDetail, saved: ReadonlyMap<string, { x: number; y: number }>): DiagramLayout {
  const kept = model.tables.filter((t) => saved.has(t.key));
  if (!kept.length) return layoutDiagram(model, detail);
  const boxes = new Map<string, Box>();
  let right = 0;
  let top = Infinity;
  let width = 0;
  let height = 0;
  for (const t of kept) {
    const p = saved.get(t.key)!;
    const b = { x: Math.max(0, p.x), y: Math.max(0, p.y), ...boxSize(t, detail) };
    boxes.set(t.key, b);
    right = Math.max(right, b.x + b.w);
    top = Math.min(top, b.y);
    width = Math.max(width, b.x + b.w + MARGIN);
    height = Math.max(height, b.y + b.h + MARGIN);
  }
  const fresh = model.tables.filter((t) => !saved.has(t.key));
  if (fresh.length) {
    const keys = new Set(fresh.map((t) => t.key));
    const more = layoutDiagram({ tables: fresh, edges: model.edges.filter((e) => keys.has(e.from) && keys.has(e.to)) }, detail);
    // layoutDiagram starts at MARGIN: shift its block to a column gap right of the saved block, level with its top
    const dx = right + LAYER_GAP - MARGIN;
    const dy = top - MARGIN;
    for (const [k, b] of more.boxes) {
      const m = { ...b, x: b.x + dx, y: b.y + dy };
      boxes.set(k, m);
      width = Math.max(width, m.x + m.w + MARGIN);
      height = Math.max(height, m.y + m.h + MARGIN);
    }
  }
  return { boxes, width, height };
}

/** Where every table of `layout` is: what Save writes. */
export function positionsOf(layout: DiagramLayout): Map<string, { x: number; y: number }> {
  return new Map([...layout.boxes].map(([k, b]) => [k, { x: Math.round(b.x), y: Math.round(b.y) }]));
}

/** `layout` with the boxes the user dragged at their new places (never left of or above the origin). */
export function withMoves(layout: DiagramLayout, moves: ReadonlyMap<string, { x: number; y: number }>): DiagramLayout {
  if (!moves.size) return layout;
  const boxes = new Map(layout.boxes);
  let { width, height } = layout;
  for (const [k, p] of moves) {
    const b = boxes.get(k);
    if (!b) continue;
    const moved = { ...b, x: Math.max(0, p.x), y: Math.max(0, p.y) };
    boxes.set(k, moved);
    width = Math.max(width, moved.x + moved.w + MARGIN);
    height = Math.max(height, moved.y + moved.h + MARGIN);
  }
  return { boxes, width, height };
}
