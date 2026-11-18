/**
 * Exports of an ER diagram: an image (PNG or JPG), Mermaid erDiagram code, DBML for dbdiagram.io, and a
 * diagrams.net (.drawio) file. Everything here turns what the diagram tab shows into text or pixels on this Mac;
 * none of it contacts the sites the formats belong to. The person pastes or opens the result there themselves.
 *
 * Image and .drawio follow the screen: the tables drawn, where they are, with the columns shown. Mermaid and DBML
 * describe the tables drawn with all their columns, as schema code does.
 */
import {
  BODY_PAD,
  HEADER_H,
  ROW_H,
  cardinality,
  edgeGeometry,
  visibleColumns,
  type DiagramDetail,
  type DiagramLayout,
  type DiagramModel,
  type DiagramTable,
} from "./diagram";

const xml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- image -------------------------------------------------------------------------

/** The colours of the theme on screen, read from its tokens when the image is made. */
export interface DiagramPalette {
  background: string;
  box: string;
  head: string;
  border: string;
  ink: string;
  muted: string;
  line: string;
  pk: string;
  fk: string;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * The diagram as a standalone SVG, the same boxes and lines as the screen; `background: false` leaves it
 * transparent. Keys are marked PK and FK in place of the screen's icons.
 */
export function diagramSvg(model: DiagramModel, layout: DiagramLayout, detail: DiagramDetail, p: DiagramPalette, background: boolean): string {
  const tables = new Map(model.tables.map((t) => [t.key, t]));
  const halo = background ? p.background : p.box;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">`);
  out.push(`<style>text{font-family:${MONO};font-size:12px}.l{font-size:11px;fill:${p.muted};paint-order:stroke;stroke:${halo};stroke-width:3px;stroke-linejoin:round;text-anchor:middle}</style>`);
  if (background) out.push(`<rect width="100%" height="100%" fill="${p.background}"/>`);
  for (const e of model.edges) {
    const g = edgeGeometry(e, layout, tables, detail);
    if (!g) continue;
    out.push(`<path d="${g.path}" fill="none" stroke="${p.line}" stroke-width="1.25"/><path d="${g.arrow}" fill="${p.line}"/>`);
    out.push(`<text class="l" x="${g.mid.x}" y="${g.mid.y - 5}">${xml(e.columns.join(", "))}</text>`);
  }
  model.tables.forEach((t, i) => {
    const b = layout.boxes.get(t.key);
    if (!b) return;
    const { x, y, w, h } = b;
    const r = 6;
    const cols = visibleColumns(t, detail);
    out.push(`<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath><g clip-path="url(#c${i})">`);
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.box}"/><rect x="${x}" y="${y}" width="${w}" height="${HEADER_H}" fill="${p.head}"/>`);
    if (cols.length) out.push(`<line x1="${x}" y1="${y + HEADER_H - 0.5}" x2="${x + w}" y2="${y + HEADER_H - 0.5}" stroke="${p.border}"/>`);
    out.push(`<text x="${x + 10}" y="${y + 17}" fill="${p.ink}" font-weight="600">${xml(t.label)}</text>`);
    cols.forEach((c, j) => {
      const cy = y + HEADER_H + BODY_PAD + j * ROW_H + 14;
      const mark = c.primaryKey ? ["PK", p.pk] : c.foreignKey ? ["FK", p.fk] : null;
      if (mark) out.push(`<text x="${x + 10}" y="${cy - 1}" fill="${mark[1]}" font-size="9" font-weight="700">${mark[0]}</text>`);
      out.push(`<text x="${x + 30}" y="${cy}" fill="${p.ink}">${xml(c.name)}</text><text x="${x + w - 10}" y="${cy}" fill="${p.muted}" text-anchor="end">${xml(c.type)}</text>`);
    });
    out.push(`</g><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="${p.border}"/>`);
  });
  out.push(`</svg>`);
  return out.join("");
}

/**
 * Pixels of an SVG from `diagramSvg`, at `scale` (2 for Retina sharpness). JPG has no transparency, so it is
 * always drawn on `fill`; PNG takes `fill` or, with null, stays transparent. Browser only (canvas).
 */
export async function svgToImage(svg: string, width: number, height: number, type: "png" | "jpg", fill: string | null, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d")!;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type === "jpg" ? "image/jpeg" : "image/png", 0.92));
    if (!blob) throw new Error("The image could not be made");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- Mermaid -------------------------------------------------------------------------

/** Mermaid takes letters, digits, `_` and `-` in names; anything else becomes `_` and the real name goes in an alias. */
const mmId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "_").replace(/^([^A-Za-z_])/, "_$1");
/** Attribute types allow letters, digits, `_`, `-`, `()` and `[]`: `numeric(12,2)` keeps `numeric`, the rest goes in the comment. */
const mmType = (t: string) => {
  const s = t.replace(/\s+/g, "_");
  return /^[A-Za-z][A-Za-z0-9_\-()[\]]*$/.test(s) ? s : mmId(s.replace(/\(.*$/, "")) || "type";
};

/** Mermaid `erDiagram` code: entities with their columns (PK, FK, UK), and one relationship per foreign key. */
export function toMermaid(model: DiagramModel): string {
  const ids = new Map<string, string>();
  const used = new Set<string>();
  for (const t of model.tables) {
    let id = mmId(t.label);
    while (used.has(id)) id += "_";
    used.add(id);
    ids.set(t.key, id);
  }
  const lines = ["erDiagram"];
  for (const t of model.tables) {
    const id = ids.get(t.key)!;
    const unique = new Set(t.uniques.filter((u) => u.length === 1).map((u) => u[0]));
    lines.push(`  ${id}${id === t.label ? "" : `["${t.label.replace(/"/g, "'")}"]`} {`);
    for (const c of t.columns) {
      const keys = [c.primaryKey && "PK", c.foreignKey && "FK", unique.has(c.name) && "UK"].filter(Boolean).join(", ");
      const type = mmType(c.type);
      const name = mmId(c.name);
      const notes = [type !== c.type.replace(/\s+/g, "_") && c.type, name !== c.name && `column ${c.name}`].filter(Boolean).join("; ");
      lines.push(`    ${type} ${name}${keys ? ` ${keys}` : ""}${notes ? ` "${String(notes).replace(/"/g, "'")}"` : ""}`);
    }
    lines.push("  }");
  }
  const byKey = new Map(model.tables.map((t) => [t.key, t]));
  for (const e of model.edges) {
    const from = byKey.get(e.from)!;
    const card = cardinality(e, from);
    // the marks stand next to the entity they count: rows of `from` per referenced row, rows referenced per `from` row
    const left = card.from === "*" ? "}o" : "|o";
    const right = card.to === "1" ? "||" : "o|";
    // identifying (solid) when the key is part of the referencing table's primary key
    const pk = new Set(from.columns.filter((c) => c.primaryKey).map((c) => c.name));
    const line = e.columns.some((c) => pk.has(c)) ? "--" : "..";
    lines.push(`  ${ids.get(e.from)} ${left}${line}${right} ${ids.get(e.to)} : "${e.columns.join(", ").replace(/"/g, "'")}"`);
  }
  return lines.join("\n") + "\n";
}

// ---- DBML (dbdiagram.io) -------------------------------------------------------------------

const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/**
 * DBML for dbdiagram.io: a Table per table (schema-qualified when outside the diagram's schema), keys as
 * column settings or indexes, one Ref per foreign key (`>` many-to-one, `-` one-to-one).
 */
export function toDbml(model: DiagramModel, schema: string): string {
  const name = (t: DiagramTable) => (t.schema === schema ? q(t.name) : `${q(t.schema)}.${q(t.name)}`);
  const out: string[] = [];
  for (const t of model.tables) {
    const pk = t.columns.filter((c) => c.primaryKey);
    const single = new Set(t.uniques.filter((u) => u.length === 1).map((u) => u[0]));
    out.push(`Table ${name(t)} {`);
    for (const c of t.columns) {
      const settings = [pk.length === 1 && c.primaryKey && "pk", single.has(c.name) && "unique", !c.nullable && !c.primaryKey && "not null"].filter(Boolean);
      out.push(`  ${q(c.name)} ${q(c.type)}${settings.length ? ` [${settings.join(", ")}]` : ""}`);
    }
    const composite = t.uniques.filter((u) => u.length > 1);
    if (pk.length > 1 || composite.length) {
      out.push("", "  indexes {");
      if (pk.length > 1) out.push(`    (${pk.map((c) => q(c.name)).join(", ")}) [pk]`);
      for (const u of composite) out.push(`    (${u.map(q).join(", ")}) [unique]`);
      out.push("  }");
    }
    out.push("}", "");
  }
  const byKey = new Map(model.tables.map((t) => [t.key, t]));
  for (const e of model.edges) {
    const from = byKey.get(e.from)!;
    const to = byKey.get(e.to)!;
    const cols = (cs: string[]) => (cs.length === 1 ? q(cs[0]!) : `(${cs.map(q).join(", ")})`);
    const op = cardinality(e, from).kind === "1:1" ? "-" : ">";
    out.push(`Ref ${q(e.name)}: ${name(from)}.${cols(e.columns)} ${op} ${name(to)}.${cols(e.refColumns)}`);
  }
  return out.join("\n").trimEnd() + "\n";
}

// ---- diagrams.net (.drawio) --------------------------------------------------------------------

/**
 * A diagrams.net file, uncompressed: each table a stacked swimlane at its place on screen with one text row
 * per shown column, each foreign key an entity-relation edge from the referencing column to the referenced one,
 * with crow's-foot ends for its cardinality. Open it with File › Open from › Device.
 */
export function toDrawio(model: DiagramModel, layout: DiagramLayout, detail: DiagramDetail, title: string): string {
  const font = "fontFamily=Courier New;fontSize=12;";
  const cells: string[] = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  const rowId = new Map<string, string>();
  model.tables.forEach((t, i) => {
    const b = layout.boxes.get(t.key);
    if (!b) return;
    const id = `t${i}`;
    rowId.set(t.key, id);
    cells.push(
      `<mxCell id="${id}" value="${xml(t.label)}" style="swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=${HEADER_H};horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;rounded=1;arcSize=4;${font}" vertex="1" parent="1"><mxGeometry x="${Math.round(b.x)}" y="${Math.round(b.y)}" width="${b.w}" height="${b.h}" as="geometry"/></mxCell>`,
    );
    visibleColumns(t, detail).forEach((c, j) => {
      const cid = `${id}c${j}`;
      rowId.set(`${t.key}\u0001${c.name}`, cid);
      const keys = [c.primaryKey && "PK", c.foreignKey && "FK"].filter(Boolean).join(" ");
      cells.push(
        `<mxCell id="${cid}" value="${xml(`${c.name}: ${c.type}${keys ? `  ${keys}` : ""}`)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=6;spacingRight=6;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;${c.primaryKey ? "fontStyle=1;" : ""}${font}" vertex="1" parent="${id}"><mxGeometry y="${HEADER_H + j * ROW_H}" width="${b.w}" height="${ROW_H}" as="geometry"/></mxCell>`,
      );
    });
  });
  const byKey = new Map(model.tables.map((t) => [t.key, t]));
  model.edges.forEach((e, i) => {
    const card = cardinality(e, byKey.get(e.from)!);
    const source = rowId.get(`${e.from}\u0001${e.columns[0]}`) ?? rowId.get(e.from);
    const target = rowId.get(`${e.to}\u0001${e.refColumns[0]}`) ?? rowId.get(e.to);
    if (!source || !target) return;
    const start = card.from === "*" ? "ERzeroToMany" : "ERzeroToOne";
    const end = card.to === "1" ? "ERmandOne" : "ERzeroToOne";
    cells.push(
      `<mxCell id="e${i}" value="${xml(e.columns.join(", "))}" style="edgeStyle=entityRelationEdgeStyle;startArrow=${start};endArrow=${end};startFill=0;endFill=0;fontSize=11;${font.replace("fontSize=12;", "")}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  });
  return `<mxfile host="ypacapy"><diagram id="erd" name="${xml(title)}"><mxGraphModel grid="1" gridSize="10" page="0"><root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>\n`;
}
