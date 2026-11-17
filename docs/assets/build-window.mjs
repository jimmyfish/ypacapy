// Draws docs/assets/ypacapy-window.svg for the README: three ypacapy windows stacked with dummy data.
// Back: a connection's query tab. Middle: a table tab. Front: Home.
// Close to the app, not pixel-exact. Icons come from lucide-react (ISC) in node_modules.
//
//   node docs/assets/build-window.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

// ypacapy Light and ypacapy Dark (src/tokens.css)
const LIGHT = {
  canvas: "#f0f4fa",
  paper: "#ffffff",
  paper2: "#f0f4fa",
  paper3: "#f7f8fa",
  ink: "#0e2949",
  ink2: "#283f5d",
  muted: "#4e6891",
  placeholder: "#7b879a",
  rule: "#e6ebf3",
  edge: "#dce3ed",
  accent: "#2e67e5",
  accentSoft: "#eef3fe",
  ok: "#01804a",
  gutter: "#9aa8bd",
  zebra: "#fafbfd",
  // SQL (src/tokens.css --sql-*)
  kw: "#7c3aed",
  str: "#01804c",
  num: "#b45300",
  fn: "#0b6d9e",
  comment: "#4e6891",
  curLine: "#f6f8fc",
  idleLight: "#d5d9e0",
  onAccent: "#dbe6ff",
};
const DARK = {
  canvas: "#0e1218",
  paper: "#161b25",
  paper2: "#1f2633",
  paper3: "#1b212c",
  ink: "#e3e8f2",
  ink2: "#c3cbd9",
  muted: "#8a9bb8",
  placeholder: "#8a96a8",
  rule: "#262e3c",
  edge: "#2e3747",
  accent: "#2e67e5",
  accentSoft: "#1d2b4a",
  ok: "#01bf71",
  gutter: "#5d6b85",
  zebra: "#191f2a",
  kw: "#b392f0",
  str: "#01bf71",
  num: "#ffab70",
  fn: "#38b6f0",
  comment: "#8a9bb8",
  curLine: "#1b2230",
  idleLight: "#3a4252",
  onAccent: "#dbe6ff",
};
let C = LIGHT;
// connection tiles (src/tokens.css --proj-N-fg / --proj-N-bg)
const PLIGHT = {
  river: ["#256d9e", "#e7f3fb"],
  emerald: ["#1c7a44", "#e6f9ee"],
  carrot: ["#a65b18", "#fcf0e4"],
  amethyst: ["#8f52a7", "#f3ebf6"],
  turquoise: ["#117864", "#e4f7f3"],
  alizarin: ["#b93d30", "#fceae8"],
  asphalt: ["#34495e", "#e7e9ec"],
};
const PDARK = {
  river: ["#44a0de", "#1b3246"],
  emerald: ["#2ecc71", "#1a3b33"],
  carrot: ["#e67e22", "#3b2d24"],
  amethyst: ["#b381c8", "#2e263f"],
  turquoise: ["#1abc9c", "#17383a"],
  alizarin: ["#eb695b", "#3c2429"],
  asphalt: ["#7d8b98", "#1b232f"],
};
let P = PLIGHT;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const iconCache = new Map();
/** One lucide icon as a <g>, read from lucide-react's ESM file. */
function icon(name, x, y, { size = 16, color = C.muted, width = 1.75 } = {}) {
  if (!iconCache.has(name)) {
    const src = readFileSync(join(root, "node_modules/lucide-react/dist/esm/icons", `${name}.js`), "utf8");
    const body = src.slice(src.indexOf("createLucideIcon(") + "createLucideIcon(".length, src.lastIndexOf(");"));
    const nodes = new Function(`return [${body}]`)()[1];
    const els = nodes
      .map(([tag, attrs]) => {
        const a = Object.entries(attrs)
          .filter(([k]) => k !== "key")
          .map(([k, v]) => `${k}="${esc(v)}"`)
          .join(" ");
        return `<${tag} ${a}/>`;
      })
      .join("");
    iconCache.set(name, els);
  }
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${iconCache.get(name)}</g>`;
}

const text = (x, y, s, { size = 14, color = C.ink, weight, mono, anchor, ls, italic } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}"${weight ? ` font-weight="${weight}"` : ""}${mono ? ` font-family="${MONO}"` : ""}${italic ? ` font-style="italic"` : ""}${anchor ? ` text-anchor="${anchor}"` : ""}${ls ? ` letter-spacing="${ls}"` : ""} fill="${color}">${esc(s)}</text>`;

const rect = (x, y, w, h, { r = 0, fill = "none", stroke, sw = 1, dash } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"${r ? ` rx="${r}"` : ""} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

const line = (x1, y1, x2, y2, color = C.rule) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}"/>`;

/** rough text width for the UI font */
const tw = (s, size = 14) => s.length * size * 0.54;

const W = 1400;
const H = 860;
const PX = 48; // panel left, right of the rail
const PY = 44; // panel top, under the title strip
const SW = 262; // sidebar width
let MX = PX + SW; // main area left; PX when the sidebar is hidden
const RX = W - 8 - 16; // right edge of the main area's content

let out = [];
const push = (...s) => out.push(...s);

// ---------- pieces every window has ----------

/** The title strip. `current`: "home" or a connection name. `active`: false greys the traffic lights (a window behind). */
function titleStrip(current, active) {
  const lights = active ? ["#ff5f57", "#febc2e", "#28c840"] : [C.idleLight, C.idleLight, C.idleLight];
  push(lights.map((f, i) => `<circle cx="${25 + i * 26}" cy="22" r="7" fill="${f}"/>`).join(""));
  const home = current === "home";
  if (home) push(rect(98, 6, 92, 32, { r: 8, fill: C.paper }));
  push(icon("house", 110, 14, { color: home ? C.ink : C.muted }), text(135, 27, "Home", { color: home ? C.ink : C.muted, weight: home ? 600 : 400 }));
  push(line(200, 12, 200, 32, C.edge));
  let x = 210;
  for (const [name, [fg, bg], engine] of [
    ["shop-prod", P.alizarin, "PG"],
    ["analytics", P.emerald, "MY"],
  ]) {
    const cur = current === name;
    const w = 44 + tw(name) + 30;
    if (cur) push(rect(x, 6, w, 32, { r: 8, fill: bg, stroke: fg, sw: 1.25 }));
    push(rect(x + 10, 13, 18, 18, { r: 5, fill: cur ? C.paper : bg }));
    push(text(x + 19, 26, engine, { size: 9.5, weight: 700, color: fg, anchor: "middle" }));
    push(text(x + 36, 27, name, { weight: cur ? 600 : 400, color: cur ? fg : C.muted }));
    push(icon("x", x + w - 24, 14, { color: cur ? fg : C.muted }));
    x += w + 6;
  }
  push(icon("settings", 1366, 13, { size: 17 }));
}

function rail() {
  push(`<circle cx="24" cy="64" r="9" fill="none" stroke="${C.accent}" stroke-width="2.4"/><circle cx="24" cy="64" r="3.4" fill="${C.ok}"/>`);
  push(rect(7, 92, 34, 34, { r: 8, fill: C.accentSoft }), icon("list-tree", 13, 98, { size: 22, color: C.accent }));
  push(icon("history", 13, 142, { size: 22 }));
  push(icon("bookmark", 13, 186, { size: 22 }));
}

/** The schema sidebar, with `selected` table highlighted. */
function sidebar(selected) {
  push(text(PX + 19, 76, "Schema", { size: 17, weight: 600 }));
  push(icon("refresh-cw", PX + SW - 34, 63));
  push(rect(PX + 16, 88, SW - 32, 30, { r: 8, fill: C.paper3, stroke: C.edge }));
  push(icon("database", PX + 25, 95, { size: 15 }), text(PX + 48, 108, "shop", { size: 13.5 }));
  push(text(PX + 90, 108, "›", { size: 13.5, color: C.placeholder }), text(PX + 102, 108, "public", { size: 13.5 }));
  push(icon("chevron-down", PX + SW - 40, 95, { size: 15 }));
  push(rect(PX + 16, 126, SW - 32, 30, { r: 8, fill: C.paper, stroke: C.edge }));
  push(icon("search", PX + 25, 133, { size: 15 }), text(PX + 48, 146, "Filter tables", { size: 13.5, color: C.placeholder }));

  let y = 182;
  const head = (label, count) => {
    push(icon("chevron-down", PX + 18, y - 12, { size: 14 }));
    push(text(PX + 38, y, label, { size: 12, weight: 700, color: C.muted, ls: ".04em" }));
    push(text(PX + 38 + tw(label, 12) + 14, y, String(count), { size: 12, color: C.placeholder }));
    y += 30;
  };
  const row = (name, est, ic = "table-2") => {
    const sel = name === selected;
    if (sel) push(rect(PX + 8, y - 20, SW - 16, 30, { r: 7, fill: C.paper2 }));
    push(icon(ic, PX + 38, y - 13, { size: 15, color: sel ? C.ink : C.muted }));
    push(text(PX + 62, y, name, { weight: sel ? 600 : 400 }));
    if (est) push(text(PX + SW - 20, y, est, { size: 12, color: C.placeholder, anchor: "end" }));
    y += 30;
  };
  head("TABLES", 7);
  row("customers", "~48k");
  row("order_items", "~3.1M");
  row("orders", "~1.2M");
  row("payments", "~1.1M");
  row("products", "~2.4k");
  row("shipments", "~990k");
  row("warehouses", "12");
  y += 6;
  head("VIEWS", 2);
  row("daily_revenue", "", "eye");
  row("low_stock", "", "eye");
  y += 6;
  head("FUNCTIONS", 1);
  row("refresh_stats()", "", "square-function");
}

/** The tabs bar of a connection; `active` is the index of the current tab. */
function tabsBar(active) {
  const TB = PY + 42;
  push(line(MX, TB, W - 8, TB));
  push(icon(MX === PX ? "panel-left-open" : "panel-left-close", MX + 12, PY + 13));
  const tabs = [
    { name: "Revenue by city", ic: "square-code", w: 196, dirty: true },
    { name: "orders", ic: "table-2", w: 124 },
  ];
  let x = MX + 40;
  tabs.forEach((t, i) => {
    const cur = i === active;
    if (cur) {
      push(`<path d="M${x} ${TB} v-26 a8 8 0 0 1 8 -8 h${t.w - 16} a8 8 0 0 1 8 8 v26" fill="${C.paper}" stroke="${C.rule}"/>`);
      push(rect(x + 1, TB - 1, t.w - 2, 2, { fill: C.paper }));
    }
    push(icon(t.ic, x + 12, PY + 15, { color: cur ? C.ink : C.muted }));
    push(text(x + 36, PY + 28, t.name, { weight: cur ? 600 : 400, color: cur ? C.ink : C.muted }));
    if (t.dirty) push(`<circle cx="${x + t.w - 36}" cy="${PY + 23}" r="3" fill="${C.accent}"/>`);
    push(icon("x", x + t.w - 24, PY + 15));
    x += t.w + 8;
  });
  push(line(x - 2, PY + 14, x - 2, PY + 32, C.edge));
  push(icon("plus", x + 8, PY + 15));
  // the connection's security level
  const [fg, bg] = P.alizarin;
  const gx = W - 8 - 120;
  push(rect(gx, PY + 7, 106, 28, { r: 14, fill: bg }));
  push(icon("shield-alert", gx + 10, PY + 13, { size: 16, color: fg }), text(gx + 32, PY + 26, "Strict", { size: 13.5, weight: 600, color: fg }));
  push(icon("chevron-down", gx + 82, PY + 14, { size: 14, color: fg }));
  return TB;
}

/** Column header and rows of a result grid. */
function grid(GX, GY, GW, cols, rows, { sel, rowH = 30 } = {}) {
  push(rect(GX, GY, GW, 32, { fill: C.paper3 }));
  push(line(GX, GY + 32, GX + GW, GY + 32, C.edge));
  push(text(GX + 22, GY + 21, "#", { size: 12, color: C.placeholder, anchor: "middle" }));
  const bottom = GY + 32 + rows.length * rowH;
  let x = GX + 44;
  for (const c of cols) {
    push(line(x, GY, x, bottom, C.rule));
    push(icon(c.ic, x + 10, GY + 9, { size: 14 }));
    push(text(x + 30, GY + 21, c.name, { size: 13, weight: 600, color: C.ink2 }));
    x += c.w;
  }
  if (x < GX + GW) push(line(x, GY, x, bottom, C.rule));
  rows.forEach((r, i) => {
    const y = GY + 32 + i * rowH;
    if (i % 2) push(rect(GX, y, GW, rowH, { fill: C.zebra }));
    push(text(GX + 22, y + 20, String(i + 1), { size: 12, color: C.placeholder, anchor: "middle" }));
    let x = GX + 44;
    r.forEach((v, j) => {
      const c = cols[j];
      if (sel && sel[0] === i && sel[1] === j) push(rect(x + 1, y + 1, c.w - 2, rowH - 2, { r: 3, fill: C.accentSoft, stroke: C.accent, sw: 1.5 }));
      if (c.kind === "bool") {
        const on = v === "true";
        push(rect(x + 12, y + 8, 26, 14, { r: 7, fill: on ? C.ok : C.edge }), `<circle cx="${x + (on ? 31 : 19)}" cy="${y + 15}" r="5" fill="#fff"/>`);
      } else if (v === null) {
        push(text(x + 12, y + 20, "NULL", { size: 12, mono: true, color: C.placeholder, italic: true }));
      } else {
        const color = c.kind === "status" ? { shipped: C.ok, paid: C.fn, pending: C.num, refunded: "#b93d30" }[v] ?? C.ink : C.ink;
        push(text(c.num ? x + c.w - 12 : x + 12, y + 20, v, { size: 13.5, mono: c.num || c.kind === "ts", color, anchor: c.num ? "end" : undefined }));
      }
      x += c.w;
    });
    push(line(GX, y + rowH, GX + GW, y + rowH, C.rule));
  });
}

// ---------- the three views ----------

/** The panel of a connection window, with or without the schema sidebar (⌘\\ hides it in the app). */
function shell(side) {
  MX = side ? PX + SW : PX;
  push(rect(PX, PY, W - PX - 8, H - PY - 8, { r: 10, fill: C.paper }));
  if (side) push(line(MX, PY, MX, H - 8)), sidebar("orders");
}

function queryView({ side = true } = {}) {
  titleStrip("shop-prod", false);
  rail();
  shell(side);
  const TB = tabsBar(0);

  const QY = TB + 12;
  push(rect(MX + 16, QY, 210, 32, { r: 8, fill: C.paper3, stroke: C.edge }));
  push(icon("database", MX + 26, QY + 8, { size: 15 }), text(MX + 48, QY + 21, "shop", { size: 13.5 }));
  push(text(MX + 90, QY + 21, "›", { size: 13.5, color: C.placeholder }), text(MX + 102, QY + 21, "public", { size: 13.5 }));
  push(icon("chevron-down", MX + 200, QY + 9, { size: 14 }));
  push(rect(RX - 116, QY, 116, 32, { r: 8, fill: C.accent }));
  push(icon("play", RX - 104, QY + 9, { size: 14, color: "#fff", width: 2 }), text(RX - 84, QY + 21, "Run", { size: 13.5, weight: 600, color: "#fff" }));
  push(text(RX - 14, QY + 21, "⌘↵", { size: 12, color: C.onAccent, anchor: "end" }));
  push(rect(RX - 206, QY, 80, 32, { r: 8, fill: C.paper, stroke: C.edge }), text(RX - 166, QY + 21, "Format", { size: 13.5, color: C.ink2, anchor: "middle" }));
  push(rect(RX - 282, QY, 66, 32, { r: 8, fill: C.paper, stroke: C.edge }), text(RX - 249, QY + 21, "Save", { size: 13.5, color: C.ink2, anchor: "middle" }));

  const sql = [
    "-- revenue per city, last 30 days",
    "select c.city,",
    "       count(*)                    as orders,",
    "       sum(o.total_cents) / 100.0  as revenue",
    "from orders o",
    "join customers c on c.id = o.customer_id",
    "where o.created_at > now() - interval '30 days'",
    "group by c.city",
    "order by revenue desc;",
  ];
  const KW = new Set("select from join on where group by order desc as interval and limit".split(" "));
  const FN = new Set(["count", "sum", "now"]);
  const highlight = (src) =>
    src.trimStart().startsWith("--")
      ? `<tspan fill="${C.comment}" font-style="italic">${esc(src)}</tspan>`
      : src
          .split(/('[^']*'|\b\w+\b|\s+|.)/)
          .filter(Boolean)
          .map((t) => `<tspan fill="${t.startsWith("'") ? C.str : KW.has(t) ? C.kw : FN.has(t) ? C.fn : /^\d/.test(t) ? C.num : C.ink}">${esc(t)}</tspan>`)
          .join("");
  const EY = QY + 52;
  const LH = 22;
  sql.forEach((l, i) => {
    const y = EY + i * LH + 14;
    if (i === 6) push(rect(MX + 1, y - 16, W - 9 - MX - 1, LH, { fill: C.curLine }));
    push(text(MX + 40, y, String(i + 1), { size: 12.5, mono: true, color: C.gutter, anchor: "end" }));
    push(`<text x="${MX + 58}" y="${y}" font-size="13.5" font-family="${MONO}" xml:space="preserve">${highlight(l)}</text>`);
  });
  push(`<rect x="${MX + 58 + sql[6].length * 8.25 + 3}" y="${EY + 6 * LH}" width="2" height="18" fill="${C.accent}"/>`);

  const RY = EY + sql.length * LH + 34;
  push(line(MX, RY, W - 8, RY));
  push(icon("circle-check", MX + 18, RY + 14, { size: 16, color: C.ok }));
  push(text(MX + 42, RY + 27, "9 rows", { size: 13.5, weight: 600 }));
  push(text(MX + 96, RY + 27, "· 38 ms · limit 100 added · PostgreSQL 16.4", { size: 13.5, color: C.muted }));
  push(rect(RX - 96, RY + 10, 96, 28, { r: 8, fill: C.paper, stroke: C.edge }));
  push(icon("download", RX - 84, RY + 16, { size: 15 }), text(RX - 62, RY + 29, "Export", { size: 13, color: C.ink2 }));
  grid(
    MX + 16,
    RY + 50,
    RX - MX - 16,
    [
      { name: "city", ic: "type", w: 300 },
      { name: "orders", ic: "hash", w: 220, num: true },
      { name: "revenue", ic: "hash", w: 260, num: true },
    ],
    [
      ["Jakarta", "18,402", "2,941,880.50"],
      ["Surabaya", "9,877", "1,402,113.00"],
      ["Bandung", "8,215", "1,198,467.25"],
      ["Medan", "5,064", "702,330.75"],
      ["Yogyakarta", "4,731", "655,902.00"],
      ["Semarang", "4,118", "571,240.40"],
      ["Denpasar", "3,560", "540,019.90"],
      ["Makassar", "2,947", "389,775.00"],
      ["Malang", "2,688", "351,604.60"],
    ],
    { sel: [2, 2] },
  );
}

function tableView({ side = true } = {}) {
  titleStrip("shop-prod", false);
  rail();
  shell(side);
  const TB = tabsBar(1);

  // table line: name, WHERE filter, Rows / Columns / Indexes
  const QY = TB + 12;
  push(icon("table-2", MX + 18, QY + 8, { size: 16, color: C.ink }));
  push(text(MX + 42, QY + 21, "public.", { size: 14, color: C.muted }), text(MX + 42 + tw("public.", 14), QY + 21, "orders", { size: 14, weight: 600 }));
  const fx = MX + 140;
  const fw = RX - 250 - fx;
  push(rect(fx, QY, fw, 32, { r: 8, fill: C.paper3, stroke: C.edge }));
  push(text(fx + 12, QY + 21, "WHERE", { size: 12, weight: 700, color: C.kw, mono: true }));
  push(
    `<text x="${fx + 68}" y="${QY + 21}" font-size="13.5" font-family="${MONO}" xml:space="preserve"><tspan fill="${C.ink}">status = </tspan><tspan fill="${C.str}">'shipped'</tspan><tspan fill="${C.ink}"> and total_cents &gt; </tspan><tspan fill="${C.num}">50000</tspan></text>`,
  );
  // segmented Rows / Columns / Indexes
  const sx = RX - 236;
  push(rect(sx, QY, 236, 32, { r: 8, fill: C.paper2 }));
  push(rect(sx + 3, QY + 3, 70, 26, { r: 6, fill: C.paper, stroke: C.edge }));
  push(text(sx + 38, QY + 21, "Rows", { size: 13, weight: 600, anchor: "middle" }));
  push(text(sx + 115, QY + 21, "Columns", { size: 13, color: C.muted, anchor: "middle" }));
  push(text(sx + 194, QY + 21, "Indexes", { size: 13, color: C.muted, anchor: "middle" }));

  const MY = QY + 46;
  push(line(MX, MY, W - 8, MY));
  push(text(MX + 18, MY + 26, "Rows 1–100", { size: 13.5, weight: 600 }));
  push(text(MX + 104, MY + 26, "· about 1.2M in the table (planner estimate) · 12 ms", { size: 13.5, color: C.muted }));
  push(icon("chevron-left", RX - 56, MY + 12, { size: 18 }), icon("chevron-right", RX - 22, MY + 12, { size: 18, color: C.ink }));

  const ids = [48213, 48210, 48207, 48199, 48196, 48188, 48185, 48181, 48176, 48172, 48169, 48163, 48160, 48154, 48151, 48147, 48143];
  const statuses = ["shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped", "shipped"];
  const cents = [128500, 74900, 219000, 56250, 90100, 312400, 61800, 150000, 88850, 52300, 99900, 176400, 64000, 245500, 70250, 133300, 58900];
  const cust = [9182, 4410, 12077, 301, 7765, 15020, 2214, 9182, 6643, 11890, 507, 13348, 8021, 4410, 10566, 3175, 14402];
  const cities = ["Jakarta", "Bandung", "Surabaya", "Jakarta", "Medan", "Denpasar", "Malang", "Jakarta", "Semarang", "Bandung", "Makassar", "Yogyakarta", "Jakarta", "Bandung", "Surabaya", "Medan", "Jakarta"];
  const notes = [null, "leave at the gate", null, null, "fragile", null, null, "call first", null, null, null, "gift wrap", null, null, null, null, "no plastic"];
  const rows = ids.map((id, i) => [
    String(id),
    String(cust[i]),
    statuses[i],
    cents[i].toLocaleString("en-US"),
    cities[i],
    `2026-11-17 ${String(16 - Math.floor(i / 3)).padStart(2, "0")}:${String((59 - i * 7 + 420) % 60).padStart(2, "0")}`,
    i % 4 === 1 ? "false" : "true",
    notes[i],
  ]);
  grid(
    MX + 16,
    MY + 44,
    RX - MX - 16,
    [
      { name: "id", ic: "key-round", w: 90, num: true },
      { name: "customer_id", ic: "hash", w: 130, num: true },
      { name: "status", ic: "type", w: 110, kind: "status" },
      { name: "total_cents", ic: "hash", w: 128, num: true },
      { name: "city", ic: "type", w: 120 },
      { name: "created_at", ic: "calendar-clock", w: 170, kind: "ts" },
      { name: "gift", ic: "toggle-left", w: 80, kind: "bool" },
      { name: "note", ic: "type", w: 134 },
    ],
    rows,
    { sel: [3, 3], rowH: 30 },
  );
}

function homeView() {
  titleStrip("home", true);
  push(rect(8, PY, W - 16, H - PY - 8, { r: 10, fill: C.paper }));
  const L = 96;
  const R = W - 96;
  push(text(L, 112, "Connections", { size: 30, weight: 700 }));
  push(text(L, 142, "Everything stays on this Mac, in ~/.config/ypacapy.", { size: 15, color: C.muted }));
  // search + New connection
  push(rect(R - 176, 96, 176, 38, { r: 9, fill: C.accent }));
  push(icon("plus", R - 160, 107, { color: "#fff", width: 2 }), text(R - 136, 120, "New connection", { size: 14, weight: 600, color: "#fff" }));
  push(rect(R - 456, 96, 268, 38, { r: 9, fill: C.paper3, stroke: C.edge }));
  push(icon("search", R - 444, 107), text(R - 420, 120, "Search connections", { color: C.placeholder }));
  push(rect(R - 228, 105, 30, 20, { r: 5, fill: C.paper, stroke: C.edge }), text(R - 213, 119, "⌘F", { size: 11.5, color: C.muted, anchor: "middle" }));

  const gap = 20;
  const cw = (R - L - gap * 2) / 3;
  const ch = 132;
  let y = 196;
  const group = (name, conns, open) => {
    push(icon("chevron-down", L, y - 13, { size: 16 }));
    push(text(L + 24, y, name, { size: 17, weight: 650 }));
    push(text(L + 24 + tw(name, 17) + 14, y, String(conns.length), { size: 14, color: C.placeholder }));
    if (open) {
      const ox = L + 24 + tw(name, 17) + 40;
      push(`<circle cx="${ox}" cy="${y - 5}" r="4" fill="${C.ok}"/>`, text(ox + 10, y, `${open} open`, { size: 13.5, color: C.ok, weight: 600 }));
    }
    push(rect(R - 98, y - 21, 98, 30, { r: 8, fill: C.paper, stroke: C.edge }));
    push(icon("plug-zap", R - 86, y - 14, { size: 15 }), text(R - 64, y - 1, "Open all", { size: 13, color: C.ink2 }));
    y += 22;
    conns.forEach((c, i) => {
      const x = L + i * (cw + gap);
      if (c.new) {
        push(rect(x, y, cw, ch, { r: 12, fill: C.paper, stroke: C.edge, sw: 1.5, dash: "6 5" }));
        push(icon("plus", x + cw / 2 - 64, y + ch / 2 - 9, { size: 18 }), text(x + cw / 2 - 40, y + ch / 2 + 5, "New connection", { size: 14.5, color: C.muted }));
        return;
      }
      const [fg, bg] = c.color;
      push(rect(x, y, cw, ch, { r: 12, fill: C.paper, stroke: c.live ? fg : C.edge, sw: c.live ? 1.5 : 1 }));
      push(rect(x + 18, y + 18, 34, 34, { r: 9, fill: bg }), text(x + 35, y + 40, c.engine, { size: 12, weight: 700, color: fg, anchor: "middle" }));
      if (c.live) push(`<circle cx="${x + 50}" cy="${y + 20}" r="5" fill="${C.ok}" stroke="#fff" stroke-width="2"/>`);
      push(text(x + 18, y + 82, c.name, { size: 16.5, weight: 600 }));
      push(text(x + 18, y + 104, c.addr, { size: 13.5, color: C.muted, mono: true }));
      push(text(x + 18, y + 122, c.when, { size: 12.5, color: C.placeholder }));
      push(icon("folder-input", x + cw - 82, y + 20, { size: 15 }), icon("pencil", x + cw - 56, y + 20, { size: 15 }), icon("x", x + cw - 30, y + 20, { size: 15 }));
    });
    y += ch + 46;
  };
  group(
    "Production",
    [
      { name: "shop-prod", engine: "PG", color: P.alizarin, addr: "db.shop.internal:5432/shop", when: "Opened just now", live: true },
      { name: "analytics", engine: "MY", color: P.emerald, addr: "olap-1.internal:3306/stats", when: "Opened 4 min ago", live: true },
      { name: "billing-replica", engine: "PG", color: P.river, addr: "replica-2.internal:5432/billing", when: "Opened yesterday" },
    ],
    2,
  );
  group("Staging", [
    { name: "shop-staging", engine: "PG", color: P.carrot, addr: "stg.shop.internal:5432/shop", when: "Opened 2 days ago" },
    { name: "cms", engine: "MY", color: P.amethyst, addr: "cms-db.stg:3306/cms", when: "Opened last week" },
    { name: "auth-staging", engine: "PG", color: P.asphalt, addr: "auth.stg:5432/auth", when: "Not opened yet" },
  ]);
  group("Local", [
    { name: "scratch.db", engine: "SQ", color: P.turquoise, addr: "~/Desktop/scratch.db", when: "Opened 1 hour ago" },
    { new: true },
  ]);
}

// ---------- the stack ----------

/** One window: run a view into its own group, clip it, shadow it, place and scale it. */
function windowAt(view, x, y, scale, dark = false, opts = {}) {
  C = dark ? DARK : LIGHT;
  P = dark ? PDARK : PLIGHT;
  out = [];
  view(opts);
  return `<g transform="translate(${x} ${y}) scale(${scale})">
<rect width="${W}" height="${H}" rx="12" fill="${C.canvas}" filter="url(#shadow)"/>
<g clip-path="url(#win)">
<rect width="${W}" height="${H}" rx="12" fill="${C.canvas}"/>
${out.join("\n")}
</g>
<rect width="${W}" height="${H}" rx="12" fill="none" stroke="${dark ? "#fff" : "#000"}" stroke-opacity="${dark ? ".1" : ".08"}"/>
</g>`;
}

// A tight diagonal cascade, light, dark, light, so each window's edge reads against the one behind it.
// The two windows behind have the sidebar hidden, so their visible strips show SQL and rows, not the tree.
const S = 0.8;
const stack = [
  windowAt(queryView, 50, 40, S, false, { side: false }),
  windowAt(tableView, 240, 200, S, true, { side: false }),
  windowAt(homeView, 430, 360, S),
].join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1090" width="1600" height="1090" font-family="ui-sans-serif, system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif">
<!-- Drawn view of three stacked ypacapy windows with dummy data. Icons: Lucide (ISC). Regenerate with node docs/assets/build-window.mjs, not by hand. -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1600" y2="1090" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#48d1b4"/><stop offset=".55" stop-color="#16a085"/><stop offset="1" stop-color="#0b4f42"/></linearGradient>
  <radialGradient id="spring" cx="1430" cy="150" r="380" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#06302a" flood-opacity=".5"/></filter>
  <clipPath id="win"><rect width="${W}" height="${H}" rx="12"/></clipPath>
</defs>
<rect width="1600" height="1090" fill="url(#bg)"/>
<rect width="1600" height="1090" fill="url(#spring)"/>
<g fill="none" stroke="#fff">${[110, 190, 280, 380].map((r, i) => `<ellipse cx="1430" cy="150" rx="${r}" ry="${r * 0.62}" stroke-opacity="${[0.22, 0.15, 0.1, 0.06][i]}" stroke-width="2"/>`).join("")}${[90, 160].map((r, i) => `<ellipse cx="150" cy="990" rx="${r}" ry="${r * 0.62}" stroke-opacity="${[0.14, 0.08][i]}" stroke-width="2"/>`).join("")}</g>
<g fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"><path d="M1400 70c-10-14 10-22 0-36"/><path d="M1430 76c-10-14 10-22 0-36"/><path d="M1460 70c-10-14 10-22 0-36"/></g>
${stack}
</svg>
`;

writeFileSync(join(here, "ypacapy-window.svg"), svg);
console.log(`wrote docs/assets/ypacapy-window.svg (${(svg.length / 1024).toFixed(1)} KB)`);
