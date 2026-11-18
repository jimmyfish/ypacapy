/**
 * The diagram tab's bookkeeping, pure: which saved diagram a tab is, whether it differs from its save, its layout,
 * and merging catalog reads. Shared by the store (Save, Close) and DiagramPane (drawing).
 */
import type { DiagramPoint, DiagramTab, SavedDiagram, SchemaDiagram } from "../types";
import { diagramModel, layoutWithSaved, withMoves, type DiagramLayout, type DiagramModel } from "./diagram";

/** One saved diagram per database, schema and origin (the schema's, or a table's) */
export const diagramKey = (t: Pick<DiagramTab, "database" | "schema" | "origin">) => `${t.database}\u0001${t.schema}\u0001${t.origin ?? ""}`;

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Changed by hand since the last Save, or since the first drawing when never saved: picks, dragged boxes, Reset
 * layout or column detail. Zoom and pan alone don't count. "Not saved", the tab's dot and Close's ask follow it.
 */
export function diagramChanged(tab: DiagramTab, saved: SavedDiagram | undefined): boolean {
  const base = saved ?? tab.baseline;
  if (!base || !tab.tables.length) return false;
  return !sameSet(tab.tables, base.tables) || Object.keys(tab.moves).length > 0 || !!tab.auto || tab.detail !== base.detail;
}

/** Save is offered after a change, and for a drawn diagram never saved at all */
export const diagramCanSave = (tab: DiagramTab, saved: SavedDiagram | undefined) => tab.tables.length > 0 && (!saved || diagramChanged(tab, saved));

export function diagramModelOf(tab: DiagramTab): DiagramModel | null {
  return tab.data && tab.tables.length ? diagramModel(tab.data, { schema: tab.schema, tables: tab.tables }) : null;
}

const toMap = (r: Record<string, DiagramPoint> | undefined) => new Map(Object.entries(r ?? {}));

/** Saved boxes where they were saved (unless Reset layout), the rest beside them, then the boxes dragged since */
export function diagramLayoutOf(tab: Pick<DiagramTab, "detail" | "moves" | "auto">, model: DiagramModel, saved: SavedDiagram | undefined, live?: ReadonlyMap<string, DiagramPoint>): DiagramLayout {
  const base = layoutWithSaved(model, tab.detail, tab.auto ? new Map() : toMap(saved?.positions));
  const moves = toMap(tab.moves);
  for (const [k, p] of live ?? []) moves.set(k, p);
  return withMoves(base, moves);
}

/** A read of more tables added to an earlier one: tables and keys once each, the newer read winning */
export function mergeDiagram(a: SchemaDiagram | undefined, b: SchemaDiagram): SchemaDiagram {
  if (!a) return b;
  const tk = (t: { schema: string; name: string }) => `${t.schema}\u0000${t.name}`;
  const kk = (k: { schema: string; table: string; name: string }) => `${k.schema}\u0000${k.table}\u0000${k.name}`;
  const tables = new Map(a.tables.map((t) => [tk(t), t]));
  for (const t of b.tables) tables.set(tk(t), t);
  const keys = new Map(a.keys.map((k) => [kk(k), k]));
  for (const k of b.keys) keys.set(kk(k), k);
  return { tables: [...tables.values()], keys: [...keys.values()] };
}

/**
 * Zoom and pan of each mounted diagram, live: the pane moves them without a render, so Save (⌘S, Save and close)
 * reads them here rather than from the tab, which is only brought up to date when the pane goes away.
 */
export const diagramViews = new Map<string, { current: DiagramTab["view"] | null }>();

const two = (n: number) => String(n).padStart(2, "0");

/** "Last saved at 14:32", or "Last saved 17 Nov at 14:32" on another day */
export function savedAtLabel(at: number, now = new Date()): string {
  const d = new Date(at);
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return d.toDateString() === now.toDateString() ? `Last saved at ${time}` : `Last saved ${d.getDate()} ${d.toLocaleString("en", { month: "short" })} at ${time}`;
}
