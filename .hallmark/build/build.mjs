// Builds the Hallmark preview in ../preview: app.css (voidHTTP rules in app.css.base + ypacapy.css) and five pages.
// Run: node .hallmark/build/build.mjs
// ypacapy Hallmark preview, on voidHTTP's components and tokens. Writes .hallmark/preview/*.html and app.css.
import fs from "node:fs";
// esbuild (Vite's own) bundles src/lib/diagram.ts and diagramExport.ts, types stripped, for the diagram page
import { buildSync } from "esbuild";
const SP = new URL(".", import.meta.url).pathname;
const OUT = new URL("../preview", import.meta.url).pathname;
// icon nodes are read as text from ypacapy's own lucide-react (the version in package.json, as the app)
const LUCIDE = process.env.LUCIDE_ICONS || new URL("../../node_modules/lucide-react/dist/esm/icons", import.meta.url).pathname;
const LUCIDE_VERSION = JSON.parse(fs.readFileSync(new URL("../../node_modules/lucide-react/package.json", import.meta.url), "utf8")).version;

fs.writeFileSync(`${OUT}/app.css`, fs.readFileSync(`${SP}app.css.base`, "utf8") + fs.readFileSync(`${SP}ypacapy.css`, "utf8"));

// ---------- icons: Lucide nodes, read as text from lucide-react's icon files ----------
const ICONS = ["plug-zap", "database", "list-tree", "history", "bookmark", "house", "server", "hard-drive", "x", "plus", "settings-2", "search", "refresh-cw",
  "ellipsis", "ellipsis-vertical", "shredder", "chevron-down", "chevron-right", "chevron-left", "folder", "eye", "square-function", "table-2", "square-code", "panel-left-close",
  "columns-2", "play", "circle-check", "copy", "download", "circle-alert", "key-round", "key", "link", "folder-open", "type", "terminal",
  "lock", "lock-open", "type", "hash", "calendar-clock", "toggle-left", "braces", "arrow-up-down", "arrow-up", "arrow-down", "minus", "columns-3", "shield-check", "shield", "shield-off", "fingerprint", "check", "wand-sparkles", "file-plus", "pencil", "folder-input", "folder-minus", "folder-plus", "pin", "pin-off",
  "circle-arrow-down", "loader-circle", "triangle-alert", "external-link", "github", "circle-dot", "copy", "leaf", "brackets", "id-card", "info", "table-properties", "file-check", "timer",
  "network", "zoom-in", "zoom-out", "maximize", "undo-2", "locate", "list-checks", "eye-off", "save", "image", "file-code", "file-down", "arrow-right", "chevrons-up-down", "chevrons-down-up", "circle-plus", "copy-plus", "sliders-horizontal", "rotate-ccw", "funnel"];
// Lucide 1.x renamed fingerprint; the old name is what the pages use
const RENAMED = { fingerprint: "fingerprint-pattern" };
// Lucide 1.x has no brand icons: GitHub's mark as lucide-react 0.460.0 drew it (ISC), the same as src/components/Icon.tsx
const CUSTOM = {
  github: `<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>`,
};
function symbol(name) {
  if (CUSTOM[name]) return `  <symbol id="i-${name}" viewBox="0 0 24 24">${CUSTOM[name]}</symbol>`;
  let src = fs.readFileSync(`${LUCIDE}/${RENAMED[name] ?? name}.mjs`, "utf8");
  // an old name kept as an alias re-exports the renamed icon's file (history → rotate-ccw-clock)
  for (let m; (m = src.match(/export \{ default \} from '\.\/([\w-]+)\.mjs'/)); ) src = fs.readFileSync(`${LUCIDE}/${m[1]}.mjs`, "utf8");
  // lucide-react 1.x: const __iconData = { name, size, node: [[tag, attrs], …], aliases }
  const start = src.indexOf("node: [");
  const body = src.slice(start, src.indexOf("aliases:", start) > 0 ? src.indexOf("aliases:", start) : src.indexOf("};", start));
  const els = [...body.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]/g)].map(([, tag, attrs]) =>
    `<${tag} ${[...attrs.matchAll(/(\w+):\s*"([^"]*)"/g)].filter(([, k]) => k !== "key").map(([, k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
  if (start < 0 || !els) throw new Error(`no nodes for ${name}`);
  return `  <symbol id="i-${name}" viewBox="0 0 24 24">${els}</symbol>`;
}
const SPRITE = `<!-- icons: Lucide v${LUCIDE_VERSION} (ISC), inlined from lucide-react's icon nodes -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
${ICONS.map(symbol).join("\n")}
</svg>`;
const ic = (n, cls = "") => `<svg aria-hidden="true" class="ico${cls ? " " + cls : ""}"><use href="#i-${n}"/></svg>`;

// ---------- sample data ----------
const money = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tr = (i, cells, sel) => `<tr${sel ? ' aria-selected="true"' : ""}><td class="rownum">${i}</td>${cells.join("")}</tr>`;
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// cells read by their type: the value is what the result set carries; nothing else is fetched
const NULLC = (cls = "") => `<td class="null${cls}"><span class="null-pill">null</span></td>`;
const jsonHtml = (o) => "{ " + Object.entries(o).map(([k, v]) => `<span class="jk">"${esc(k)}"</span>: ${v === null ? '<span class="jn">null</span>' : typeof v === "string" ? `<span class="js">"${esc(v)}"</span>` : `<span class="jn">${v}</span>`}`).join(", ") + " }";
const c = {
  text: (v) => (v === null ? NULLC() : `<td>${esc(v)}</td>`),
  num: (v, frac) => (v === null ? NULLC(" num") : `<td class="num">${frac ? money(v) : v.toLocaleString("en-US")}</td>`),
  id: (v) => `<td class="num">${v}</td>`,
  ts: (v) => {
    if (v === null) return NULLC();
    const [d, t] = v.split(" ");
    return `<td class="ts" data-full="${v}"><span class="d">${d}</span> <span class="t">${t.slice(0, 8)}</span><span class="tz">${t.slice(8)}</span></td>`;
  },
  bool: (v) => (v === null ? NULLC() : `<td class="bool" data-full="${v}">${ic(v ? "check" : "minus", v ? "yes" : "no")}<span class="visually-hidden">${v}</span></td>`),
  json: (o) => (o === null ? NULLC() : `<td class="json" data-full="${esc(JSON.stringify(o))}">${jsonHtml(o)}</td>`),
};
// BSON types (MongoDB) read the same way: numbers, dates, booleans; objectId gets an id card (the key glyph is the primary-key mark), object braces, array brackets
const TYPE_ICON = (t) => (/^objectId/.test(t) ? "id-card" : /^object/.test(t) ? "braces" : /^array/.test(t) ? "brackets" : /^(int|numeric|float|real|double|decimal|serial|bigint|smallint)/.test(t) ? "hash" : /timestamp|^date|^time/.test(t) ? "calendar-clock" : /^bool/.test(t) ? "toggle-left" : /^json/.test(t) ? "braces" : "type");
// a column head: type glyph, name, a key mark when the catalog says so (table views only), the sort control; the type under it
const th = (name, type, o = {}) => `<th scope="col"${o.num ? ' class="num"' : ""} aria-sort="none"><button type="button" class="th-btn" title="Sort the rows on screen">${ic(TYPE_ICON(type), "t-ico")}<span class="col-name">${name}</span>${o.key ? `<span class="col-key" title="${o.key}">${ic(o.key === "Primary key" ? "key-round" : "link", "k-ico")}</span>` : ""}${ic("arrow-up-down", "sort-ico")}</button><span class="col-type">${type}</span></th>`;
const ROWHEAD = `<th class="rownum" scope="col"><span class="visually-hidden">Row</span></th>`;
const Q1_DATA = [["a.lindqvist@example.net", true, 4, 1284.5, "2026-11-14 18:02:11+07"], ["r.okonkwo@example.com", false, 3, 979.0, "2026-11-12 09:15:40+07"], ["mei.tanaka@example.org", true, 3, 642.75, "2026-11-16 08:41:07+07"], ["p.haddad@example.net", false, 2, 588.4, "2026-11-03 21:30:52+07"],
  ["s.ferreira@example.com", null, 2, 431.0, "2026-11-09 13:04:18+07"], ["k.nowak@example.org", false, 2, 219.99, "2026-10-29 10:12:00+07"], ["d.mensah@example.net", true, 1, 189.0, "2026-11-15 16:47:33+07"], ["l.bianchi@example.com", false, 1, 154.2, "2026-10-21 07:58:09+07"],
  ["t.nguyen@example.org", false, 1, 120.0, "2026-11-01 19:22:45+07"], ["h.adeyemi@example.net", false, 1, 96.5, "2026-11-10 11:36:27+07"], ["j.moreau@example.com", null, 1, 74.0, "2026-10-25 14:09:51+07"], ["n.kapoor@example.org", false, 1, 59.9, "2026-11-07 08:03:14+07"],
  ["e.vasquez@example.net", false, 1, 42.0, "2026-10-19 22:44:06+07"], ["o.petrov@example.com", true, 1, 18.75, "2026-11-13 12:30:00+07"]];
const Q1 = Q1_DATA.map((r, i) => tr(i + 1, [c.text(r[0]), c.bool(r[1]), c.num(r[2]), c.num(r[3], true), c.ts(r[4])], i === 2)).join("\n");
const p2 = (n) => String(n).padStart(2, "0");
const ST = ["paid", "shipped", "refunded", "shipped", "paid", "shipped", "shipped", "refunded", "paid", "shipped"];
const META = [{ channel: "web" }, { channel: "app", coupon: "FALL10" }, null, { channel: "web", gift: true }, { channel: "pos", store: "Jakarta Selatan" }];
// rows come back in table order (no order by): ids rise down the page
const ORDERS = Array.from({ length: 20 }, (_, r) => {
  const i = 19 - r;
  const st = ST[i % 10], day = 14 - Math.floor(i / 3), h = (9 + i * 7) % 24, m = (41 + i * 13) % 60, sec = (7 + i * 29) % 60;
  const total = [4820, 129.9, 642.75, 88, 1499, 35.5, 210, 979, 64.2, 312.4][i % 10] + (i > 9 ? 12.5 : 0);
  return tr(r + 1, [c.id(10482 - i), c.id(3000 + ((i * 397) % 3200)), c.text(st), c.num(total, true), c.text(i % 4 === 3 ? "SGD" : "USD"),
    c.ts(`2026-11-${p2(day)} ${p2(h)}:${p2(m)}:${p2(sec)}+07`), c.ts(st === "shipped" ? `2026-11-${p2(Math.min(day + 1, 16))} ${p2((h + 5) % 24)}:${p2((m + 17) % 60)}:00+07` : null), c.json(META[i % 5])], r === 0);
}).join("\n");
const Q2 = [[10482, 4820], [10478, 1499], [10474, 64.2], [10473, 129.9], [10469, 1511.5], [10464, 76.7]].map((r, i) => tr(i + 1, [c.id(r[0]), c.num(r[1], true)])).join("\n");
// Query 3: select * from customers, 21 columns, to show a wide result
const CUST_COLS = [["id", "int8"], ["email", "text"], ["full_name", "text"], ["phone", "text"], ["is_vip", "bool"], ["country", "char(2)"], ["city", "text"], ["postal_code", "text"], ["address_line1", "text"], ["address_line2", "text"], ["marketing_opt_in", "bool"], ["signup_source", "text"], ["referred_by", "int8"], ["lifetime_value", "numeric(12,2)"], ["orders_count", "int4"], ["last_order_at", "timestamptz"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"], ["deleted_at", "timestamptz"], ["preferences", "jsonb"], ["notes", "text"]];
const PEOPLE = [["a.lindqvist@example.net", "Astrid Lindqvist", "+46 70 412 8890", "SE", "Göteborg", "411 05"], ["r.okonkwo@example.com", "Rotimi Okonkwo", "+234 803 555 0142", "NG", "Lagos", "101233"], ["mei.tanaka@example.org", "Mei Tanaka", "+81 90 2231 7754", "JP", "Osaka", "530-0001"], ["p.haddad@example.net", "Pierre Haddad", "+961 3 118 204", "LB", "Beirut", "1107"], ["s.ferreira@example.com", "Sofia Ferreira", "+351 912 004 771", "PT", "Porto", "4000-322"], ["k.nowak@example.org", "Kasia Nowak", "+48 601 220 914", "PL", "Kraków", "31-008"], ["d.mensah@example.net", "Daniel Mensah", "+233 24 771 0093", "GH", "Accra", "GA-183"], ["l.bianchi@example.com", "Luca Bianchi", "+39 333 810 2245", "IT", "Torino", "10121"], ["t.nguyen@example.org", "Thao Nguyen", "+84 90 318 4471", "VN", "Hà Nội", "100000"], ["h.adeyemi@example.net", "Halima Adeyemi", "+234 805 661 3320", "NG", "Abuja", "900211"], ["j.moreau@example.com", "Julien Moreau", "+33 6 12 48 90 31", "FR", "Lyon", "69002"], ["n.kapoor@example.org", "Neha Kapoor", "+91 98201 44718", "IN", "Mumbai", "400001"]];
const CUSTOMERS = PEOPLE.map(([email, name, phone, cc, city, zip], i) => tr(i + 1, [c.id(3100 + i * 7), c.text(email), c.text(name), c.text(phone), c.bool(i % 4 === 0), c.text(cc), c.text(city), c.text(zip),
  c.text(`${12 + i * 9} ${["Harbour", "Station", "Market", "Garden"][i % 4]} Street`), c.text(i % 3 === 0 ? `Floor ${2 + i}` : null), c.bool(i % 3 !== 1), c.text(["web", "app", "referral", "pos"][i % 4]),
  i % 4 === 2 ? c.id(3100 + (i - 1) * 7) : NULLC(" num"), c.num(1800 - i * 117.35, true), c.num(24 - i), c.ts(`2026-11-${p2(16 - (i % 12))} ${p2(8 + i)}:${p2((i * 13) % 60)}:00+07`),
  c.ts(`2025-0${1 + (i % 9)}-${p2(3 + i)} 10:00:00+07`), c.ts(`2026-11-${p2(15 - (i % 10))} 09:${p2(i * 4)}:00+07`), i === 7 ? c.ts("2026-10-30 18:00:00+07") : c.ts(null),
  c.json(i % 2 ? { lang: "en", newsletter: true } : { lang: ["sv", "yo", "ja", "ar"][i % 4], newsletter: false }), c.text(i % 5 === 0 ? "Prefers email over phone; ships to the office on weekdays" : null)], i === 0)).join("\n");
// Query 4: one column of long, multi-line text
const TICKETS = [
  [812, "open", "Refund not received", "Hi, I returned order 10474 on 2 November and the courier confirmed delivery to your warehouse.\nIt has been two weeks and the refund still shows as pending in my account.\nCould you check whether the parcel was scanned in? Tracking number JX204-55-187.\nThanks, Mei"],
  [811, "waiting", "Change delivery address", "Please send order 10479 to my office instead: 12 Harbour Street, Floor 4, Göteborg 411 05.\nI will not be home this week."],
  [809, "closed", "Coupon FALL10 rejected", "The FALL10 code says it has expired, but the email I got yesterday says it is valid until 30 November.\nScreenshot attached. Order total was 129.90 before the code."],
  [806, "open", "Wrong size", "Ordered a medium, received a large. The label on the box says medium.\nHappy to exchange rather than refund if the medium is still in stock.\nI can drop it at the Jakarta Selatan store if that is faster.\nOrder 10466."],
  [803, "closed", "Invoice name", "Can the invoice show the company name, Mensah Trading Ltd, instead of my own name?"],
  [801, "open", "Duplicate charge", "My card was charged twice for order 10470: 312.40 at 09:14 and again at 09:16.\nThe second charge has not reversed after three days.\nBank reference 88341-A."],
  [798, "waiting", "Gift wrap missing", "The order was marked as a gift but arrived without wrap or the note."],
  [795, "closed", "Account email", "Please move my account from n.kapoor@example.org to my new address; I no longer use the old one."],
];
const longCell = (v) => { const lines = v.split("\n"); const more = lines.length - 1; return `<td class="long" data-full="${esc(v)}"><span class="first">${esc(lines[0])}</span>${more ? `<span class="more">+${more} line${more > 1 ? "s" : ""}</span>` : ""}</td>`; };
const TICKET_ROWS = TICKETS.map(([id, st, subj, body], i) => tr(i + 1, [c.id(id), c.text(st), c.text(subj), longCell(body)], i === 0)).join("\n");
const inspector = (col, type, row, value) => `
            <div class="inspector" aria-live="polite">
              <div class="ins-where"><span class="ins-col">${col}</span><span class="ins-type">${type}</span><span class="ins-row">row ${row}</span></div>
              <div class="ins-value">${value}</div>
              <button type="button" class="icon-btn ins-copy" title="Copy value" aria-label="Copy value">${ic("copy")}</button>
            </div>`;

// ---------- shell: title strip, rail, panel ----------
// where a connection opens: MongoDB on a collection, Redis on its console, SQL engines on the query tab
const openHref = (engine) => `./${{ mongo: "collection", redis: "redis" }[engine] || "index"}.html`;
const CONNS = [["shop_prod", "server", 6, "postgres"], ["analytics.sqlite", "hard-drive", 2, "sqlite"], ["legacy_cms", "server", 3, "mysql"]];
const tile = (icon, n, sm = true) => `<span class="proj-tile${sm ? " proj-tile--sm" : ""}" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)">${ic(icon)}</span>`;
const strip = (current, chip = "", conns = CONNS.slice(0, 2)) => `
  <!-- title strip: the native macOS traffic lights sit in the empty 84px on the left (not drawn here) -->
  <!-- a connection tab carries its colour (--fg/--bg) on the tab itself; the tile inside inherits it, so tab, ring and
       tile are always one colour. The tile shows the engine glyph, as on the Home cards. -->
  <div class="app-strip" data-tauri-drag-region>
    <nav class="ptabs" aria-label="Connections">
      <button type="button" class="ptab" data-href="./home.html"${current === "home" ? ' aria-current="page"' : ""}>${ic("house")}Home</button>
      <span class="ptab-sep" aria-hidden="true"></span>
${conns.map(([name, , n, engine]) => `      <div class="ptab ptab--project" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)"${current === name ? ' aria-current="page"' : ""}>
        <button type="button" class="ptab-main" data-href="${openHref(engine)}"><span class="proj-tile proj-tile--sm">${engIco(engine, 13)}</span>${name}</button>
        <button type="button" class="icon-btn ptab-close" aria-label="Close ${name}">${ic("x")}</button>
      </div>`).join("\n")}
    </nav>
    <div class="strip-end">${chip}
      <button type="button" class="icon-btn strip-settings" title="Settings  ⌘," aria-label="Settings" data-href="./settings.html${current === "home" ? "?show=home" : ""}">${ic("settings-2")}</button>
    </div>
  </div>`;
const rail = `
  <nav class="rail" aria-label="Sections">
    <div class="rail-mark" aria-hidden="true">${ic("database")}</div>
    <button type="button" class="rail-item" data-rail="schema" aria-label="Schema" title="Schema" aria-current="page">${ic("list-tree", "ico-lg")}</button>
    <button type="button" class="rail-item" data-rail="history" aria-label="History" title="History">${ic("history", "ico-lg")}</button>
    <button type="button" class="rail-item" data-rail="saved" aria-label="Saved queries" title="Saved queries">${ic("bookmark", "ico-lg")}</button>
  </nav>`;

const more = (name) => `<button type="button" class="icon-btn row-more" aria-label="More actions for ${name}" aria-haspopup="menu" title="More actions">${ic("ellipsis")}</button>`;
const group = (key, label, count, indent, open, folder = true) => `        <div class="row${indent ? "" : " collection"}"${indent ? ` style="--indent:${indent}px"` : ""} data-path="${key}"><button type="button" class="row-main" data-group="${key}" aria-expanded="${open}">${ic(open ? "chevron-down" : "chevron-right", "caret")}${folder ? ic("folder", "folder") : ""}<span class="name">${label}</span><span class="count">(${count})</span></button>${more(label)}</div>`;
const item = (key, icon, name, est, current, href) => `        <div class="row" style="--indent:40px" data-path="${key}"${current ? ' aria-current="page"' : ""}><button type="button" class="row-main"${href ? ` data-href="${href}"` : ""}>${ic(icon, "kind")}<span class="name">${name}</span>${est ? `<span class="count est" title="Estimate from table statistics">~${est}</span>` : ""}</button>${more(name)}</div>`;
const TABLES = [["orders", "12k"], ["order_items", "41k"], ["customers", "3.2k"], ["products", "640"], ["refunds", "318"], ["shipments", "11k"], ["warehouses", "4"], ["schema_migrations", "57"]];
// a schema's own "…" menu (data-row-menu): Refresh schema, Copy name, Show diagram
const schemaRow = (...a) => group(...a).replace('<div class="row collection"', '<div class="row collection" data-row-menu="schema-menu"');
const schemaSide = (current) => `
    <aside class="sidebar" data-side="schema">
      <div class="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide"></div>
      <div class="side-head"><h2>Schema</h2></div>
      <div class="side-tools">
        <div class="search">${ic("search")}<input class="field" id="tree-filter" placeholder="Filter tables" aria-label="Filter tables, views and functions" autocomplete="off" spellcheck="false"></div>
        <button type="button" class="icon-btn icon-btn--outline" title="Refresh schema" aria-label="Refresh schema">${ic("refresh-cw")}</button>
      </div>
      <div class="tree" id="tree">
${schemaRow("public", "public", 13, 0, true, false)}
${group("public/tables", "Tables", 8, 16, true)}
${TABLES.map(([n, e]) => item(`public/tables/${n}`, "table-2", n, e, current === n, n === "orders" ? "./table.html" : "")).join("\n")}
${group("public/views", "Views", 2, 16, true)}
${item("public/views/daily_revenue", "eye", "daily_revenue")}
${item("public/views/open_orders", "eye", "open_orders")}
${group("public/functions", "Functions", 3, 16, false)}
${["order_total", "touch_updated_at", "refund_window"].map((n) => item(`public/functions/${n}`, "square-function", n).replace('class="row"', 'class="row" hidden')).join("\n")}
${schemaRow("audit", "audit", 2, 0, false, false)}
        <div class="empty" id="tree-empty" hidden><strong>Nothing matches <span id="tree-empty-q"></span></strong><span>Searches table, view and function names in the schemas loaded so far.</span><button type="button" class="link" id="tree-clear">Clear the filter</button></div>
        <div class="menu row-menu" id="row-menu" role="menu" aria-label="Table actions" hidden>
          <button type="button" role="menuitem">${ic("table-2")}Open rows</button>
          <button type="button" role="menuitem">${ic("square-code")}New query on this table</button>
          <button type="button" role="menuitem" data-erd-open="table" data-href="./diagram.html?show=table">${ic("network")}Show diagram</button>
          <button type="button" role="menuitem">${ic("copy")}Copy name</button>
          <hr>
          <button type="button" role="menuitem" class="danger">Truncate</button>
          <button type="button" role="menuitem" class="danger">Drop</button>
        </div>
        <div class="menu row-menu" id="schema-menu" role="menu" aria-label="Schema actions" hidden>
          <button type="button" role="menuitem">${ic("refresh-cw")}Refresh schema</button>
          <button type="button" role="menuitem">${ic("copy")}Copy name</button>
          <button type="button" role="menuitem" data-erd-open="schema" data-href="./diagram.html">${ic("network")}Show diagram</button>
        </div>
      </div>
    </aside>`;
// History belongs to the open connection: only shop_prod's runs show here, and removing a connection removes them.
// The engine label is gone (every row is shop_prod). A row run on another database than the one picked in the query
// line names that database before the SQL; opening a row opens it on shop_prod, on that database.
const hrow = (sql, time, status, cls, db = "") => `        <div class="row"><button type="button" class="row-main" title="shop_prod / ${db || "shop"}&#10;${esc(sql)}">${db ? `<span class="hdb">${db}</span>` : ""}<span class="name hq">${esc(sql)}</span><span class="htime">${time}</span><span class="hstatus ${cls}">${status}</span></button></div>`;
const historySide = `
    <aside class="sidebar" data-side="history" hidden>
      <div class="side-head"><h2>History</h2><button type="button" class="btn btn--quiet" id="hist-clear">Clear</button></div>
      <div class="side-tools"><div class="search">${ic("search")}<input class="field" placeholder="Search shop_prod history" aria-label="Search shop_prod history" autocomplete="off" spellcheck="false"></div></div>
      <div class="tree" id="hist-list">
        <div class="day">Today</div>
${hrow("select c.email, count(*) as refunds from customers c join refunds r on r.customer_id = c.id group by c.email", "09:41", "14", "rows")}
${hrow("select id, totl from orders", "09:38", "error", "fail")}
${hrow("select * from orders where status = 'open'", "09:30", "20", "rows")}
${hrow("select count(*) from orders where created_at > now() - interval '1 day'", "08:55", "1", "rows", "shop_staging")}
        <div class="day">Yesterday</div>
${hrow("update shipments set carrier = 'dhl' where id in (4410, 4411, 4415)", "17:12", "3", "rows")}
${hrow("select pid, state, query from pg_stat_activity", "16:40", "8", "rows")}
      </div>
      <div class="tree" id="hist-none" hidden>
        <div class="empty"><strong>No queries on shop_prod yet</strong><span>Each query you run is kept here, on this Mac.</span></div>
      </div>
    </aside>`;
const histClearDlg = `
<div class="backdrop" id="hist-clear-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="hc-title">
    <h2 id="hc-title">Clear shop_prod history?</h2>
    <form>
      <p class="help">Every query run on shop_prod is removed from ypacapy.db. Other connections' history and saved queries are not touched.</p>
      <footer>
        <button type="button" class="btn" data-hc-close>Cancel</button>
        <button type="submit" class="btn btn--danger">Clear</button>
      </footer>
    </form>
  </div>
</div>`;
const savedSide = `
    <aside class="sidebar" data-side="saved" hidden>
      <div class="side-head"><h2>Saved queries</h2></div>
      <div class="side-tools"><div class="search">${ic("search")}<input class="field" placeholder="Search saved queries" aria-label="Search saved queries" autocomplete="off" spellcheck="false"></div>
        <button type="button" class="icon-btn icon-btn--filled" title="New folder" aria-label="New folder">${ic("plus")}</button></div>
      <div class="tree">
        <div class="row collection"><button type="button" class="row-main" aria-expanded="true">${ic("chevron-down", "caret")}<span class="name">Reports</span><span class="count">(2)</span></button>${more("Reports")}</div>
        <div class="row" style="--indent:24px" aria-current="page"><button type="button" class="row-main">${ic("square-code", "kind")}<span class="name">Refunds by customer</span></button>${more("Refunds by customer")}</div>
        <div class="row" style="--indent:24px"><button type="button" class="row-main">${ic("square-code", "kind")}<span class="name">Daily revenue</span></button>${more("Daily revenue")}</div>
        <div class="row collection"><button type="button" class="row-main" aria-expanded="true">${ic("chevron-down", "caret")}<span class="name">Ops</span><span class="count">(2)</span></button>${more("Ops")}</div>
        <div class="row" style="--indent:24px"><button type="button" class="row-main">${ic("square-code", "kind")}<span class="name">Stuck shipments</span></button>${more("Stuck shipments")}</div>
        <div class="row" style="--indent:24px"><button type="button" class="row-main">${ic("square-code", "kind")}<span class="name">Long-running queries</span></button>${more("Long-running queries")}</div>
      </div>
    </aside>`;

const TABS = [["orders", "table-2", "orders", "./table.html"], ["q1", "square-code", "Query 1", "./index.html"], ["q2", "square-code", "Query 2", "./index.html?show=sql-error"], ["q3", "square-code", "Query 3", "./index.html?show=wide"], ["q4", "square-code", "Query 4", "./index.html?show=long"], ["q5", "square-code", "Query 5", "./index.html?show=ac-columns"]];
// pinned tabs sit first and are kept with the connection (across a restart and a reconnect); orders starts pinned
const PINNED = ["orders"];
const tabsbar = (active, local, { tabs = TABS, pinned = PINNED, conn = "shop_prod" } = {}) => `
      <div class="tabsbar">
        <button type="button" class="icon-btn side-toggle" aria-label="Hide sidebar" title="Hide sidebar  ⌘\\">${ic("panel-left-close")}</button>
        <div class="tabs">
${tabs.map(([id, icon, label, href]) => `          <div class="tab" data-tab="${id}"${id === active ? ' aria-current="page"' : ""}${pinned.includes(id) ? " data-pinned" : ""}><button type="button" class="tab-main"${local.includes(id) ? "" : ` data-href="${href}"`}>${ic(icon)}<span class="name">${label}</span>${id === "q2" ? '<span class="dirty" role="img" aria-label="Unsaved changes"></span>' : ""}</button><button type="button" class="icon-btn close" aria-label="Close ${label}">${ic("x")}</button><button type="button" class="icon-btn pin" aria-label="Unpin ${label}" title="Pinned to ${conn}. Click to unpin.">${ic("pin")}</button></div>`).join("\n")}
          <button type="button" class="icon-btn tab-add" aria-label="New query tab">${ic("plus")}</button>
        </div>
        <div class="menu-anchor env-group guard">
          <button type="button" class="env-picker" id="guard-btn" data-menu="guard-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Security level for ${conn}: Low" title="Security level for ${conn}">${ic("shield", "guard-ico")}<span class="env-name" id="guard-name">Low</span>${ic("chevron-down")}</button>
          <div class="menu guard-menu" id="guard-menu" role="menu" aria-label="Security level for ${conn}" hidden>
            <p class="menu-note">Security level for ${conn}</p>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="none" data-icon="shield-off">${ic("shield-off")}<span class="gm-text"><span>None</span><small>Every statement runs</small></span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="true" data-guard="low" data-icon="shield">${ic("shield")}<span class="gm-text"><span>Low</span><small>Confirm the picked statements</small></span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="strict" data-icon="lock">${ic("lock")}<span class="gm-text"><span>Strict</span><small>Passphrase for the picked statements</small></span>${ic("check", "tick")}</button>
          </div>
        </div>
      </div>`;
const FORMATS = ["Plain text", "JSON", "Markdown table", "CSV"];
const resActions = (id) => `<div class="res-actions"><div class="menu-anchor"><button type="button" class="icon-btn" title="Columns" aria-label="Go to a column" aria-haspopup="menu" aria-expanded="false" data-menu="${id}-cols">${ic("columns-3")}</button><div class="menu cols-menu" id="${id}-cols" role="menu" aria-label="Go to a column" data-cols hidden></div></div>${[["copy", "Copy", "copy"], ["export", "Export", "download"]].map(([k, label, icon]) => `<div class="menu-anchor"><button type="button" class="icon-btn" title="${label}" aria-label="${label} rows" aria-haspopup="menu" aria-expanded="false" data-menu="${id}-${k}">${ic(icon)}</button><div class="menu" id="${id}-${k}" role="menu" aria-label="${label} as" hidden><p class="menu-note">${label} as</p>${FORMATS.map((x) => `<button type="button" role="menuitem">${x}</button>`).join("")}</div></div>`).join("")}</div>`;
// Run: one button, play icon, its shortcut inside (⌘↵ runs the selection or the statement at the cursor); Run all is ⇧⌘↵
const runGroup = `
          <button type="button" class="btn btn--primary btn--run" id="run" title="Run  ⌘↵">${ic("play", "run-ico")}${ic("loader-circle", "run-spin")}<span class="btn-label">Run</span><span class="run-kbd" aria-hidden="true">⌘↵</span></button>`;

const app = ({ current, side = "", work, overlay = "", chip = "", conns }) => `
<div class="app">${strip(current, chip, conns)}${rail}
  <div class="panel">${side}
    <main class="work">${work}
    </main>
  </div>
</div>${overlay}`;

const sel = (label, opts) => `<span class="ctx-select"><select aria-label="${label}">${opts.map((o) => `<option>${o}</option>`).join("")}</select>${ic("chevron-down")}</span>`;
// Query 5's autocomplete: the tables are what the schema tree already loaded; the columns stand in for the
// one catalog read per table that the app makes the first time a statement needs that table
const AC_COLS = {
  orders: [["id", "int8", 1], ["customer_id", "int8"], ["status", "text"], ["total", "numeric(12,2)"], ["currency", "char(3)"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"], ["shipped_at", "timestamptz"], ["meta", "jsonb"]],
  order_items: [["id", "int8", 1], ["order_id", "int8"], ["product_id", "int8"], ["qty", "int4"], ["unit_price", "numeric(10,2)"]],
  customers: CUST_COLS.map(([n, t]) => (n === "id" ? [n, t, 1] : [n, t])),
  products: [["id", "int8", 1], ["sku", "text"], ["name", "text"], ["price", "numeric(10,2)"], ["active", "bool"], ["created_at", "timestamptz"]],
  refunds: [["id", "int8", 1], ["order_id", "int8"], ["amount", "numeric(12,2)"], ["reason", "text"], ["created_at", "timestamptz"]],
  shipments: [["id", "int8", 1], ["order_id", "int8"], ["carrier", "text"], ["tracking_no", "text"], ["shipped_at", "timestamptz"], ["delivered_at", "timestamptz"]],
  warehouses: [["id", "int4", 1], ["code", "text"], ["city", "text"]],
  schema_migrations: [["version", "text", 1], ["applied_at", "timestamptz"]],
  daily_revenue: [["day", "date"], ["orders", "int8"], ["revenue", "numeric"]],
  open_orders: [["id", "int8"], ["customer_id", "int8"], ["total", "numeric(12,2)"], ["created_at", "timestamptz"]],
};
const AC_DATA = {
  schema: "public",
  schemas: { public: { loaded: true, tables: [...TABLES.map(([n, e]) => [n, "table", e]), ["daily_revenue", "view"], ["open_orders", "view"]] }, audit: { loaded: false, tables: [] } },
  columns: AC_COLS,
};
const acOverlay = `
<div class="menu ac-menu" id="ac-menu" role="listbox" aria-label="Suggestions" hidden></div>
<script type="application/json" id="ac-data">${JSON.stringify(AC_DATA).replace(/</g, "\\u003c")}</script>`;
const queryWork = `${tabsbar("q1", ["q1", "q2", "q3", "q4", "q5"])}
      <div class="work-body">
        <div class="req-pane" id="req-pane">
          <div class="request-line">
            <div class="url-field"><div class="ctx"><span class="e e-postgres">PG</span><strong>shop_prod</strong><span class="sep">/</span>${sel("Database", ["shop", "shop_staging"])}<span class="sep">/</span>${sel("Schema", ["public", "audit"])}</div></div>
            <button type="button" class="btn btn--save" id="save" title="Save  ⌘S">${ic("circle-check", "save-ico")}<span class="save-label">Save</span></button>${runGroup}
          </div>
          <div class="req-title"><button type="button" class="name" id="q-name">Refunds by customer</button><span class="path" id="q-path">Saved queries / Reports</span></div>
          <div class="section">
            <div class="editor">
              <div class="editor-bar"><button type="button" class="btn btn--quiet">${ic("wand-sparkles")}Format</button></div>
<pre class="code" id="code-q1" tabindex="0" aria-label="SQL editor, Query 1"><span class="l"><span class="q-c">-- Refunds in the last 30 days, by customer</span></span><span class="l"><span class="q-k">select</span> c.email, c.is_vip,</span><span class="l"><span class="ind">       </span><span class="q-f">count</span>(*) <span class="q-k">as</span> refunds,</span><span class="l"><span class="ind">       </span><span class="q-f">sum</span>(o.total) <span class="q-k">as</span> refunded,</span><span class="l"><span class="ind">       </span><span class="q-f">max</span>(o.created_at) <span class="q-k">as</span> last_refund</span><span class="l"><span class="q-k">from</span> <span class="q-tb">orders</span> o</span><span class="l"><span class="q-k">join</span> <span class="q-tb">customers</span> c <span class="q-k">on</span> c.id = o.customer_id</span><span class="l"><span class="q-k">where</span> o.status = <span class="q-s">'refunded'</span></span><span class="l"><span class="ind">  </span><span class="q-k">and</span> o.created_at &gt; <span class="q-f">now</span>() - <span class="q-k">interval</span> <span class="q-s">'30 days'</span></span><span class="l cur"><span class="q-k">group by</span> c.email, c.is_vip <span class="q-k">order by</span> refunded <span class="q-k">desc</span></span><span class="l"><span class="q-k">limit</span> <span class="q-n">500</span>;</span></pre>
<pre class="code" id="code-q2" tabindex="0" aria-label="SQL editor, Query 2" hidden><span class="l cur"><span class="q-k">select</span> id, <span class="q-err" id="q2-col">totl</span> <span class="q-k">from</span> <span class="q-tb">orders</span> <span class="q-k">where</span> status = <span class="q-s">'paid'</span> <span class="q-k">limit</span> <span class="q-n">500</span>;</span></pre>
<pre class="code" id="code-q3" tabindex="0" aria-label="SQL editor, Query 3" hidden><span class="l cur"><span class="q-k">select</span> * <span class="q-k">from</span> <span class="q-tb">customers</span> <span class="q-k">limit</span> <span class="q-n">50</span>;</span></pre>
<pre class="code" id="code-q4" tabindex="0" aria-label="SQL editor, Query 4" hidden><span class="l"><span class="q-k">select</span> id, status, subject, body</span><span class="l"><span class="q-k">from</span> <span class="q-tb">support_tickets</span></span><span class="l cur"><span class="q-k">limit</span> <span class="q-n">50</span>;</span></pre>
<div class="code-edit" id="code-q5" hidden><div class="code-edit-grid"><pre class="code" id="q5-code" aria-hidden="true"></pre><textarea class="code-input" id="q5-input" aria-label="SQL editor, Query 5" spellcheck="false" autocorrect="off" autocapitalize="off" wrap="off" aria-autocomplete="list" aria-controls="ac-menu"></textarea></div></div>
            </div>
          </div>
        </div>
        <div class="divider" role="separator" aria-orientation="horizontal" aria-label="Resize panes" tabindex="0"></div>
        <section class="response" aria-label="Results">
          <nav class="subtabs" aria-label="Results">
            <button type="button" class="subtab" data-sub="results" aria-pressed="true">Results<span class="n" id="r-n">14</span></button>
            <button type="button" class="subtab" data-sub="messages" aria-pressed="false">Messages</button>
            <span class="push meta" id="r-meta"><span class="ok">OK</span><span class="dim">38&nbsp;ms</span><span class="dim">limit 500</span></span>
          </nav>
          <div class="res-tools">${resActions("q")}</div>
          <div class="state" data-when="full" data-for="q1">
            <div class="grid-wrap" tabindex="0" aria-label="Results of Query 1">
              <table class="grid"><thead><tr>${ROWHEAD}${th("email", "text")}${th("is_vip", "bool")}${th("refunds", "int8", { num: 1 })}${th("refunded", "numeric", { num: 1 })}${th("last_refund", "timestamptz")}</tr></thead><tbody>
${Q1}
              </tbody></table>
            </div>${inspector("email", "text", 3, "mei.tanaka@example.org")}
          </div>
          <div class="state" data-when="full" data-for="q2" hidden>
            <div class="grid-wrap" tabindex="0" aria-label="Results of Query 2">
              <table class="grid"><thead><tr>${ROWHEAD}${th("id", "int8", { num: 1 })}${th("total", "numeric(12,2)", { num: 1 })}</tr></thead><tbody>
${Q2}
              </tbody></table>
            </div>${inspector("id", "int8", 1, "10482")}
          </div>
          <div class="state" data-when="full" data-for="q3" hidden>
            <div class="grid-wrap" tabindex="0" aria-label="Results of Query 3">
              <table class="grid pin"><thead><tr>${ROWHEAD}${CUST_COLS.map(([n, t]) => th(n, t, { num: /^(int|numeric)/.test(t) })).join("")}</tr></thead><tbody>
${CUSTOMERS}
              </tbody></table>
            </div>${inspector("id", "int8", 1, "3100")}
          </div>
          <div class="state" data-when="full" data-for="q4" hidden>
            <div class="grid-wrap" tabindex="0" aria-label="Results of Query 4">
              <table class="grid"><thead><tr>${ROWHEAD}${th("id", "int8", { num: 1 })}${th("status", "text")}${th("subject", "text")}${th("body", "text")}</tr></thead><tbody>
${TICKET_ROWS}
              </tbody></table>
            </div>${inspector("id", "int8", 1, "812")}
          </div>
          <div class="state" data-when="full" data-for="q5" hidden><div class="empty"><strong>Not run yet</strong><span>Type in the editor: table and column names come up as you go. Ctrl+Space asks for them.</span></div></div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Running on shop_prod</strong><span>Started 0.4&nbsp;s ago</span><button type="button" class="btn" id="cancel">Cancel</button></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>The query returned no rows</strong></div></div>
          <div class="state" data-when="error" hidden><div class="error-box">
            <strong>Column totl does not exist</strong>
            <span class="hint-line">PostgreSQL stopped at line 1 and suggests the column you may have meant.</span>
<pre class="db-says"><span class="bad">ERROR:  column "totl" does not exist</span>
LINE 1: select id, totl from orders where status = 'paid' limit 500;
                   ^
HINT:  Perhaps you meant to reference the column "orders.total".</pre>
            <div class="actions"><button type="button" class="btn" id="q2-fix">Use orders.total and run</button></div>
          </div></div>
          <div class="state" data-when="lost" hidden><div class="error-box">
            <strong>Lost the connection to shop_prod</strong>
            <span class="msg">server closed the connection unexpectedly</span>
            <span class="hint-line">localhost:5432 stopped answering while the query ran. Nothing was changed.</span>
            <div class="actions"><button type="button" class="btn" id="reconnect">Reconnect</button></div>
          </div></div>
          <div class="state" data-when="messages" hidden><pre class="code messages" aria-label="Messages"><span class="l">14 rows in 38 ms, from shop_prod (PostgreSQL 16.4)</span><span class="l">NOTICE: none</span></pre></div>
        </section>
      </div>`;

// ---------- preview bar ----------
const SCREENS = [["home", "Home"], ["index", "Query"], ["table", "Table"], ["diagram", "Diagram"], ["mongo", "MongoDB"], ["collection", "Collection"], ["redis", "Redis"], ["key", "Key"], ["settings", "Settings"], ["connect", "New connection"], ["updates", "Updates"], ["about", "About"]];
const UI_FONTS = `<option value="">System</option><option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option><option value="Avenir Next, Avenir, sans-serif">Avenir</option><option value="Georgia, serif">Georgia</option>`;
const MONO_FONTS = `<option value="">System mono</option><option value="Menlo, monospace">Menlo</option><option value="'Courier New', monospace">Courier</option><option value="Monaco, monospace">Monaco</option>`;
// preview-only: recolour the first connection tab (shop_prod) to try each connection colour on the title strip
const TAB_COLORS = [["5", "Turquoise"], ["2", "Emerald"], ["7", "Sunflower"], ["3", "Carrot"], ["6", "Alizarin (red)"], ["1", "River"], ["8", "Asphalt"], ["4", "Amethyst"]]
  .map(([v, l]) => `<option value="${v}"${v === "6" ? " selected" : ""}>${l}</option>`).join("");
const bar = (cur, states = [], fonts = false) => `
<header class="pv-bar">
  <strong>ypacapy preview · ${cur === "index" ? "query" : cur}</strong>
  <nav class="pv-screens" aria-label="Screens">
${SCREENS.map(([f, l]) => `    <a class="btn btn--quiet" href="./${f}.html" style="min-height:var(--control)"${f === cur ? ' aria-current="page"' : ""}>${l}</a>`).join("\n")}
  </nav>${states.length ? `
  <div class="pv-states" role="group" aria-label="States">
${states.map(([k, l], i) => `    <button type="button" data-show="${k}" aria-pressed="${i === 0}">${l}</button>`).join("\n")}
  </div>` : ""}
  <div class="pv-fonts">
    <label>shop_prod colour <select data-tabc>${TAB_COLORS}</select></label>${fonts ? `
    <label>UI font <select data-font="--font-ui">${UI_FONTS}</select></label>
    <label>Table font <select data-font="--font-table">${MONO_FONTS}</select></label>
    <label>Editor font <select data-font="--font-mono">${MONO_FONTS}</select></label>
    <label>Size <select data-size="--font-size-ui"><option value="">14</option><option value="13px">13</option><option value="15px">15</option><option value="16px">16</option></select></label>` : ""}
  </div>
  <div class="pv-theme" role="group" aria-label="Density" style="margin-left:0">
    <button type="button" data-density-set="" aria-pressed="true">Default</button>
    <button type="button" data-density-set="compact" aria-pressed="false">Compact</button>
  </div>
  <div class="pv-theme" role="group" aria-label="Mac appearance" style="margin-left:0">
    <button type="button" data-os-set="light" aria-pressed="true">Light</button>
    <button type="button" data-os-set="dark" aria-pressed="false">Dark</button>
  </div>
</header>`;

const COMMON = fs.readFileSync(`${SP}common.js`, "utf8");
const page = ({ title, desc, barHtml, body, script = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="stylesheet" href="./app.css">
<link rel="stylesheet" href="./preview.css">
<script src="./themes.js"></script>
</head>
<body>
${SPRITE}
${barHtml}
<div class="pv-stage">${body}
</div>
<script>
${COMMON}
${script.trim()}
pvStart();
</script>
</body>
</html>
`;
const js = (f) => fs.readFileSync(`${SP}${f}`, "utf8");
const pages = {};

// Engine glyphs, the same as src/components/EngineIcon.tsx (adopted from opengrip): a PostgreSQL elephant, a MySQL
// dolphin, an SQLite feather, 16x16 in their brand colours. Each fill is a light-dark() pair, so it follows color-scheme.
const ENGINE_NAME = { postgres: "PostgreSQL", mysql: "MySQL", sqlite: "SQLite", mongo: "MongoDB", redis: "Redis" };
const ld = (l, d) => `light-dark(${l}, ${d})`;
const ENGINE_GLYPH = {
  postgres: `<path d="M4.2 3C5.4 1.9 7.6 1.5 9.6 1.9C12.4 2.5 14 4.5 13.7 7.4C13.5 9.2 12.6 10.4 11.3 10.7L11.5 13.2C11.5 14 10.7 14.5 10 14L9.1 13.3V11C7.8 11.1 6.6 10.8 5.7 10.1C5.4 11.2 4.8 12.2 3.8 12.5C3 12.7 2.4 11.9 2.8 11.2C3.4 10.1 3.3 8.8 2.9 7.6C2.4 5.9 2.8 4.2 4.2 3Z" style="fill:${ld("#336791", "#4c82b5")};stroke:${ld("#ffffff", "#e6eef5")}" stroke-width="0.8" stroke-linejoin="round"/><path d="M9.6 4.5C10.8 5.3 11.3 6.8 10.8 8.4" style="stroke:${ld("#ffffff", "#e6eef5")}" stroke-width="0.8" stroke-linecap="round"/><circle cx="7.6" cy="5.4" r="0.8" style="fill:${ld("#ffffff", "#e6eef5")}"/>`,
  mysql: `<path d="M1.5 12C3.1 8.3 6.3 5.7 10.2 5.2C11 4.1 12.1 3.3 13.6 3.1C13.2 4 13.1 4.9 13.4 5.7C14.2 6.6 14.6 7.9 14.4 9.3C13.8 8.5 12.8 8 11.7 8C8.7 8 5.4 9.6 1.5 12Z" style="fill:${ld("#00758f", "#2a9bb5")}"/><path d="M11.8 9.7C12.4 10.9 12.3 12.4 11.5 13.7C11.3 12.5 10.6 11.6 9.7 11.1" style="stroke:${ld("#f29111", "#f5a742")}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  sqlite: `<path d="M2 3.5C2 2.67 2.67 2 3.5 2H10.2L7.6 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" style="fill:${ld("#0f80cc", "#3d8fd1")}"/><path d="M14.2 1.4C11.3 2.4 9.3 5.4 8.6 9.3L8 14H8.9L9.5 9.7C12.6 8.6 14.5 5.4 14.2 1.4Z" style="fill:${ld("#0b4f82", "#9ccbf0")}"/><path d="M13.4 2.9C11.7 4.6 10.4 6.9 9.5 9.6" style="stroke:${ld("#bfe0f7", "#1e3a52")}" stroke-width="0.7" stroke-linecap="round"/>`,
  // Redis: three stacked layers in Redis red; ypacapy's own drawing, not the Redis logo
  redis: `<path d="M8 1.8L14.2 4.4L8 7L1.8 4.4Z" style="fill:${ld("#d82c20", "#ff5a4e")}"/><path d="M1.8 7.4L8 10L14.2 7.4V8.8L8 11.4L1.8 8.8Z" style="fill:${ld("#a41e11", "#e8443a")}"/><path d="M1.8 10.6L8 13.2L14.2 10.6V12L8 14.6L1.8 12Z" style="fill:${ld("#a41e11", "#e8443a")}"/>`,
  mongo: `<path d="M8 1.2C8 1.2 3.9 4.7 3.9 9C3.9 11.5 5.6 13.3 7.5 13.8L7.7 15.2H8.3L8.5 13.8C10.4 13.3 12.1 11.5 12.1 9C12.1 4.7 8 1.2 8 1.2Z" style="fill:${ld("#00684a", "#00a35c")}"/><path d="M8 3.4V13.6" style="stroke:${ld("#c1f2d6", "#0b3b2a")}" stroke-width="0.8" stroke-linecap="round"/>`,
};
const engIco = (engine, size = 14) => `<svg class="engine-ico" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">${ENGINE_GLYPH[engine]}</svg>`;

// Home
// A connection card. Its "…" shows on hover and holds every action: Edit, Duplicate, Move to group, Remove.
const GROUPS = ["Production", "Staging"];
const card = ([name, icon, n, engine], [head, tail], when, o = {}) => `
          <div class="project-card conn-card"${o.id ? ` data-card="${o.id}"` : ""} data-q="${esc(`${name} ${head}${tail} ${{ postgres: "postgresql pg", mysql: "mysql", sqlite: "sqlite", mongo: "mongodb mongo", redis: "redis cache" }[engine]} ${o.group || ""}`.toLowerCase())}">
            <button type="button" class="project-open" aria-label="Open ${name}, ${head}${tail}" data-href="${openHref(engine)}"></button>
            <span class="proj-tile" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)">${engIco(engine, 22)}</span>
            <span class="conn-id"><span class="proj-name">${name}</span><span class="proj-cols"><span class="sr-only">${ENGINE_NAME[engine]}</span><span class="addr"><span class="addr-head">${head}</span><span class="addr-tail">${tail}</span></span></span></span>
            <span class="proj-when">${when}</span>${o.id ? `
            <span class="card-actions">
              <span class="menu-anchor">
                <button type="button" class="icon-btn" title="More actions" aria-label="More actions for ${name}" aria-haspopup="menu" aria-expanded="false" data-menu="cm-${o.id}">${ic("ellipsis-vertical")}</button>
                <div class="menu card-menu" id="cm-${o.id}" role="menu" aria-label="Actions for ${name}" hidden>
                  <button type="button" role="menuitem" data-href="./connect.html">${ic("settings-2")}<span class="menu-name">Edit connection</span></button>
                  <button type="button" role="menuitem" data-duplicate>${ic("copy")}<span class="menu-name">Duplicate</span></button>
                  <hr>
                  <p class="menu-note">Move to group</p>
${(o.groups || GROUPS).map((g) => `                  <button type="button" role="menuitemradio" aria-checked="${g === o.group}">${ic("folder")}<span class="menu-name">${g}</span>${ic("check", "tick")}</button>`).join("\n")}
                  <button type="button" role="menuitem" data-new-group>${ic("folder-plus")}<span class="menu-name">New group…</span></button>${o.group ? `
                  <button type="button" role="menuitem">${ic("folder-minus")}<span class="menu-name">Remove from group</span></button>` : ""}
                  <hr>
                  <button type="button" role="menuitem" class="danger" data-remove="${name}">${ic("shredder")}<span class="menu-name">Remove connection</span></button>
                </div>
              </span>
            </span>` : ""}
          </div>`;
const newCard = (group) => `
          <button type="button" class="project-card project-card--new conn-card" data-href="./connect.html${group ? `?group=${encodeURIComponent(group)}` : ""}">${ic("plus")}New connection</button>`;
// A group: a folding head (name, how many, how many open) with Open all and a "…" menu, over its cards
const groupSection = (id, name, cards, { open = 0 } = {}) => `
      <section class="conn-group" data-group-id="${id}">
        <div class="group-head">
          <button type="button" class="group-toggle" aria-expanded="true" aria-controls="g-${id}">${ic("chevron-down", "g-caret")}<h2 data-group-name>${name}</h2><span class="group-count">${cards.length}</span></button>
          <input class="field group-rename" aria-label="Group name" value="${name}" spellcheck="false" hidden>
          ${open ? `<span class="group-live"><span class="dot" aria-hidden="true"></span>${open} open</span>` : ""}
          <span class="drop-note">Drop to move into ${name}</span>
          <span class="group-actions">
            <button type="button" class="btn" title="Open every connection in ${name}">${ic("plug-zap")}Open all</button>
            <span class="menu-anchor">
              <button type="button" class="icon-btn" title="More actions" aria-label="More actions for ${name}" aria-haspopup="menu" aria-expanded="false" data-menu="gm-${id}">${ic("ellipsis")}</button>
              <div class="menu" id="gm-${id}" role="menu" aria-label="Actions for ${name}" hidden>
                <button type="button" role="menuitem" data-href="./connect.html?group=${encodeURIComponent(name)}">${ic("plus")}New connection here</button>
                <button type="button" role="menuitem" data-rename>${ic("pencil")}Rename group</button>${open ? `
                <button type="button" role="menuitem">${ic("x")}Close ${open} open</button>` : ""}
                <hr>
                <button type="button" role="menuitem">${ic("folder-minus")}Ungroup</button>
                <p class="menu-note">Ungroup keeps the connections. They move to Ungrouped.</p>
              </div>
            </span>
          </span>
        </div>
        <div class="projects" id="g-${id}">${cards.join("")}${newCard(name)}
        </div>
      </section>`;
const C = {
  shop: card(CONNS[0], ["localhost", ":5432 / shop"], "Opened today at 09:41", { id: "shop", group: "Production" }),
  // what Duplicate makes: same address, group and colour, "copy" on the name, never opened
  shopCopy: card(["shop_prod copy", "server", 6, "postgres"], ["localhost", ":5432 / shop"], "Not opened yet", { id: "shopcopy", group: "Production" }),
  cms: card(CONNS[2], ["10.0.4.12", ":3306 / cms"], "Opened yesterday at 16:40", { id: "cms", group: "Production" }),
  events: card(["events_prod", "server", 2, "mongo"], ["events-prod.x1y2z.mongodb.net", " / events"], "Opened today at 09:58", { id: "events", group: "Production" }),
  cache: card(["cache_prod", "server", 3, "redis"], ["cache-prod.k3j9qa.ng.0001.apse3.cache.amazonaws.com", ":6379 / db0"], "Opened today at 10:02", { id: "cache", group: "Production" }),
  staging: card(["loophealth-staging", "server", 4, "postgres"], ["loophealth-staging-3may.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com", ":5432 / postgres"], "Opened today at 09:12", { id: "staging", group: "Staging" }),
  analytics: card(CONNS[1], ["~/data/", "analytics.sqlite"], "Opened today at 08:30", { id: "analytics" }),
  backup: card(["production.sqlite", "hard-drive", 2, "sqlite"], ["~/Shelter/data/rabbit/backup/", "production.sqlite"], "Opened today at 08:55", { id: "backup" }),
};
// 40 connections: six groups (Archive folded) and nine strays, for how Home reads at scale
const RDS = (h) => `${h}.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com`;
const MANY = [
  ["Production", 1, [
    ["shop_prod", "postgres", 1, RDS("shop-prod"), ":5432 / shop", "Opened today at 09:41"],
    ["orders_prod", "postgres", 1, RDS("orders-prod"), ":5432 / orders", "Opened today at 09:20"],
    ["inventory_prod", "postgres", 5, RDS("inventory-prod"), ":5432 / inventory", "Opened yesterday at 17:02"],
    ["legacy_cms", "mysql", 3, "10.0.4.12", ":3306 / cms", "Opened yesterday at 16:40"],
    ["events_prod", "mongo", 2, "events-prod.x1y2z.mongodb.net", " / events", "Opened today at 09:58"],
    ["cache_prod", "redis", 3, "cache-prod.k3j9qa.ng.0001.apse3.cache.amazonaws.com", ":6379 / db0", "Opened today at 10:02"],
    ["auth_prod", "postgres", 7, RDS("auth-prod"), ":5432 / auth", "Opened 3 days ago"],
    ["search_prod", "mysql", 6, "10.0.4.31", ":3306 / search", "Opened 4 days ago"],
    ["notifications_prod", "postgres", 8, RDS("notifications-prod"), ":5432 / notify", "Opened last week"],
    ["reporting_replica", "postgres", 4, RDS("reporting-replica-1"), ":5432 / reporting", "Opened last week"],
  ]],
  ["Staging", 0, [
    ["loophealth-staging", "postgres", 4, RDS("loophealth-staging-3may"), ":5432 / postgres", "Opened today at 09:12"],
    ["shop_staging", "postgres", 1, RDS("shop-staging"), ":5432 / shop", "Opened yesterday at 11:15"],
    ["orders_staging", "postgres", 1, RDS("orders-staging"), ":5432 / orders", "Opened 2 days ago"],
    ["cms_staging", "mysql", 3, "10.1.4.12", ":3306 / cms", "Opened 5 days ago"],
    ["auth_staging", "postgres", 7, RDS("auth-staging"), ":5432 / auth", "Opened last week"],
    ["search_staging", "mysql", 6, "10.1.4.31", ":3306 / search", "Not opened yet"],
    ["sessions_staging", "redis", 3, "sessions-staging.k3j9qa.ng.0001.apse3.cache.amazonaws.com", ":6379 / db2", "Opened 2 days ago"],
  ]],
  ["Analytics", 0, [
    ["warehouse", "postgres", 8, RDS("warehouse"), ":5432 / dwh", "Opened today at 08:12"],
    ["events_2026.sqlite", "sqlite", 2, "~/data/events/", "events_2026.sqlite", "Opened today at 07:58"],
    ["clickstream", "mysql", 6, "10.2.0.8", ":3306 / clicks", "Opened 2 days ago"],
    ["cohorts.sqlite", "sqlite", 2, "~/data/analytics/", "cohorts.sqlite", "Opened 3 days ago"],
    ["metabase_app", "postgres", 5, "10.2.0.15", ":5432 / metabase", "Opened 2 weeks ago"],
  ]],
  ["Payments", 0, [
    ["ledger_prod", "postgres", 7, RDS("ledger-prod"), ":5432 / ledger", "Opened yesterday at 15:30"],
    ["payouts_prod", "postgres", 7, RDS("payouts-prod"), ":5432 / payouts", "Opened 3 days ago"],
    ["ledger_staging", "postgres", 1, RDS("ledger-staging"), ":5432 / ledger", "Opened last week"],
    ["recon.sqlite", "sqlite", 2, "~/Finance/recon/", "recon.sqlite", "Opened 2 weeks ago"],
  ]],
  ["Local dev", 0, [
    ["shop_dev", "postgres", 1, "localhost", ":5432 / shop_dev", "Opened today at 10:02"],
    ["orders_dev", "postgres", 1, "localhost", ":5432 / orders_dev", "Opened yesterday at 18:44"],
    ["cms_dev", "mysql", 3, "localhost", ":3306 / cms", "Opened 2 days ago"],
    ["events_dev", "mongo", 2, "localhost", ":27017 / events", "Opened 3 days ago"],
    ["redis_dev", "redis", 3, "localhost", ":6379 / db0", "Opened 3 days ago"],
    ["fixtures.sqlite", "sqlite", 2, "~/code/shop/test/", "fixtures.sqlite", "Opened 4 days ago"],
    ["docker_pg16", "postgres", 4, "127.0.0.1", ":55432 / postgres", "Opened last week"],
  ]],
  ["Archive", 0, [
    ["shop_prod_2024", "postgres", 4, RDS("shop-prod-2024-snapshot"), ":5432 / shop", "Opened 3 months ago"],
    ["cms_old", "mysql", 3, "10.0.9.2", ":3306 / cms_old", "Opened 5 months ago"],
    ["migration_2025.sqlite", "sqlite", 2, "~/Archive/", "migration_2025.sqlite", "Not opened yet"],
  ]],
];
const STRAYS = [
  ["analytics.sqlite", "sqlite", 2, "~/data/", "analytics.sqlite", "Opened today at 08:30"],
  ["production.sqlite", "sqlite", 2, "~/Shelter/data/rabbit/backup/", "production.sqlite", "Opened today at 08:55"],
  ["scratch", "postgres", 5, "localhost", ":5432 / scratch", "Opened yesterday at 22:10"],
  ["vendor_demo", "mysql", 6, "demo.vendor-db.example.com", ":3306 / demo", "Opened 2 days ago"],
  ["Chinook.sqlite", "sqlite", 2, "~/Downloads/", "Chinook.sqlite", "Opened 3 days ago"],
  ["interview_task", "postgres", 8, "localhost", ":5432 / interview", "Opened last week"],
  ["supabase_side_project", "postgres", 4, "db.xyzabc.supabase.co", ":5432 / postgres", "Opened last week"],
  ["wp_blog", "mysql", 3, "127.0.0.1", ":3306 / wordpress", "Opened 3 weeks ago"],
  ["Northwind.sqlite", "sqlite", 2, "~/Downloads/", "Northwind.sqlite", "Not opened yet"],
];
const MANY_GROUPS = MANY.map(([g]) => g);
const manyCard = ([name, engine, n, head, tail, when], group, i) =>
  card([name, engine === "sqlite" ? "hard-drive" : "server", n, engine], [head, tail], when, { id: `m${i}`, group, groups: MANY_GROUPS });
let mi = 0;
const manyHtml = `
      <div class="conn-groups" data-when="many" hidden>${MANY.map(([g, open, list]) => groupSection(`m-${g.toLowerCase().replace(/\W+/g, "-")}`, g, list.map((c) => manyCard(c, g, mi++)), { open })).join("")}
      <section class="conn-group" data-group-id="m-none">
        <div class="group-head"><h2>Ungrouped</h2><span class="group-count">${STRAYS.length}</span><span class="drop-note">Drop to remove from its group</span></div>
        <div class="projects">${STRAYS.map((c) => manyCard(c, undefined, mi++)).join("")}${newCard("")}
        </div>
      </section>
      <div class="group-drop-new" aria-hidden="true">${ic("folder-plus")}Drop here to make a new group</div>
      </div>`;
pages["home.html"] = page({
  title: "ypacapy preview, home",
  desc: "Design preview of ypacapy's Home: every connection on this Mac, gathered into groups you can open, fold, rename and ungroup.",
  barHtml: bar("home", [["grouped", "Groups"], ["folded", "Group folded"], ["group-menu", "Group menu"], ["card-menu", "Card menu"], ["duplicated", "Duplicated"], ["rename", "Renaming a group"], ["new-group", "New group"], ["no-groups", "No groups yet"], ["many", "40 connections"], ["search", "Search"], ["search-empty", "Search, no match"], ["dragging", "Dragging a card"], ["remove", "Remove connection"]]),
  body: `
<div class="app">${strip("home")}
  <div class="home">
    <div class="home-inner">
      <div class="home-head">
        <div><h1>Connections</h1><p class="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p></div>
        <div class="home-actions">
          <div class="search home-search">${ic("search")}<input class="field" id="home-q" type="search" placeholder="Search connections" aria-label="Search connections by name, host, user, database, file, engine or group" aria-describedby="home-q-h" autocomplete="off" spellcheck="false"><button type="button" class="icon-btn search-clear" id="home-q-clear" aria-label="Clear search" title="Clear search  Esc" hidden>${ic("x")}</button><kbd aria-hidden="true">⌘F</kbd></div>
          <button type="button" class="btn btn--primary" data-href="./connect.html">${ic("plus")}New connection</button>
        </div>
      </div>
      <p class="sr-only" id="home-q-h">Enter opens the first match. Escape clears the search.</p>
      <div class="empty home-empty" id="home-empty" hidden><strong>No connection matches <span id="home-empty-q"></span></strong><span>Searches names, hosts, users, databases, files, engines and groups.</span><button type="button" class="link" id="home-clear">Clear the search</button></div>
      <div class="conn-groups" data-when="grouped">${groupSection("prod", "Production", [C.shop, C.shopCopy, C.events, C.cache, C.cms], { open: 2 })}${groupSection("staging", "Staging", [C.staging])}
      <section class="conn-group" data-group-id="none">
        <div class="group-head"><h2>Ungrouped</h2><span class="group-count">2</span><span class="drop-note">Drop to remove from its group</span></div>
        <div class="projects">${C.analytics}${C.backup}${newCard("")}
        </div>
      </section>
      <div class="group-drop-new" aria-hidden="true">${ic("folder-plus")}Drop here to make a new group</div>
      </div>
${manyHtml}
      <section data-when="flat" hidden>
        <h2>On this Mac</h2>
        <div class="projects">${card(CONNS[0], ["localhost", ":5432 / shop"], "Opened today at 09:41", { id: "f-shop" })}${card(["loophealth-staging", "server", 4, "postgres"], ["loophealth-staging-3may.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com", ":5432 / postgres"], "Opened today at 09:12", { id: "f-staging" })}${card(["production.sqlite", "hard-drive", 2, "sqlite"], ["~/Shelter/data/rabbit/backup/", "production.sqlite"], "Opened today at 08:55", { id: "f-backup" })}${card(CONNS[2], ["10.0.4.12", ":3306 / cms"], "Opened yesterday at 16:40", { id: "f-cms" })}${newCard("")}
        </div>
        <p class="muted group-hint">${ic("folder-input")}To make a group, drag a card or use its Move to group button. You can also fill in Group when you add a connection.</p>
      </section>
    </div>
  </div>
</div>
<div class="toast" role="status" id="home-toast" hidden>Duplicated as shop_prod copy</div>
<div class="backdrop" id="remove-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rm-title">
    <h2 id="rm-title">Remove shop_prod?</h2>
    <form>
      <p class="help">ypacapy removes the connection, its keychain password and its query history from this Mac. Saved queries stay. The database is not touched.</p>
      <p class="guard-final">${ic("shredder")}<span>It cannot be undone. To use the connection again, add it again with its password.</span></p>
      <footer>
        <button type="button" class="btn" data-rm-close>Cancel</button>
        <button type="submit" class="btn btn--danger">${ic("shredder", "final-ico")}Remove</button>
      </footer>
    </form>
  </div>
</div>
<div class="backdrop" id="new-group-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ng-title">
    <h2 id="ng-title">New group</h2>
    <form>
      <label>Name<input class="field" id="ng-name" autocomplete="off" spellcheck="false" placeholder="Production"></label>
      <p class="help"><span id="ng-who">shop_prod</span> moves into it.</p>
      <footer>
        <button type="button" class="btn" data-ng-close>Cancel</button>
        <button type="submit" class="btn btn--primary">Create</button>
      </footer>
    </form>
  </div>
</div>`,
  script: js("page-home.js"),
});

// The write guard's ask, before a write runs. A statement that deletes or overwrites (DELETE, DROP, TRUNCATE, deleteMany,
// $merge, DEL, FLUSHDB…) also says it cannot be undone, and Run carries the shredder; a dialog with data-final="false" hides both.
// The write guard's ask, before a write runs. Ask to confirm: Run or Cancel. Passphrase protection (the
// statement is in the connection's What to protect, a passphrase is set): the passphrase or Touch ID, whatever the guard.
const guardDialogs = `
<div class="backdrop" id="guard-confirm-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Run this on shop_prod?">
    <h2>Run this on shop_prod?</h2>
    <form>
      <p class="help">It changes data or structure on shop_prod:</p>
      <div class="guard-kinds"><code class="stmt">DELETE</code></div>
      <p class="guard-final" data-final>${ic("shredder")}<span>It cannot be undone. ypacapy keeps no copy of what it deletes or overwrites.</span></p>
      <footer>
        <button type="button" class="btn" data-guard-close>Cancel</button>
        <button type="submit" class="btn btn--danger">${ic("shredder", "final-ico")}<span data-run-label>Run</span></button>
      </footer>
    </form>
  </div>
</div>
<div class="backdrop" id="guard-warn-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Run this on shop_prod?">
    <h2>Run this on shop_prod?</h2>
    <form>
      <div data-warn="limit">
        <p class="guard-warn">${ic("triangle-alert")}<span>It can return up to <strong>5,000</strong> rows, more than 100.</span></p>
      </div>
      <div data-warn="update" hidden>
        <p class="guard-warn">${ic("triangle-alert")}<span>This <code class="stmt">UPDATE</code> has no <code class="stmt">WHERE</code>, so it changes every row of its table.</span></p>
        <p class="guard-final">${ic("shredder")}<span>It cannot be undone. ypacapy keeps no copy of what it overwrites.</span></p>
      </div>
      <p class="help guard-warn-off">Turn this warning off in Settings › Connection › Security.</p>
      <footer>
        <button type="button" class="btn" data-guard-close>Cancel</button>
        <button type="submit" class="btn btn--danger"><span data-warn="update" hidden>${ic("shredder")}</span>Run</button>
      </footer>
    </form>
  </div>
</div>
<div class="backdrop" id="guard-pass-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Enter the passphrase to run this">
    <h2>Enter the passphrase to run this</h2>
    <form>
      <p class="help">It changes data or structure on shop_prod:</p>
      <div class="guard-kinds"><code class="stmt" id="guard-pass-kind">DELETE</code></div>
      <p class="guard-warn" id="guard-pass-warn" hidden>${ic("triangle-alert")}<span>This <code class="stmt">UPDATE</code> has no <code class="stmt">WHERE</code>, so it changes every row of its table.</span></p>
      <p class="guard-final" data-final>${ic("shredder")}<span>It cannot be undone. ypacapy keeps no copy of what it deletes or overwrites.</span></p>
      <label>Passphrase<input class="field" type="password" id="guard-pass-in" autocomplete="current-password"></label>
      <p class="help err" role="alert" id="guard-pass-err" hidden>That passphrase is not right.</p>
      <footer>
        <button type="button" class="btn" id="guard-touch" hidden>${ic("fingerprint")}Use Touch ID</button>
        <button type="button" class="btn" data-guard-close>Cancel</button>
        <button type="submit" class="btn btn--danger">${ic("shredder", "final-ico")}<span data-run-label>Run</span></button>
      </footer>
    </form>
  </div>
</div>`;

// Query
pages["index.html"] = page({
  title: "ypacapy preview",
  desc: "Design preview of ypacapy, a local-only database explorer for macOS: the query console and its result grid.",
  barHtml: bar("index", [["results", "Results"], ["running", "Running"], ["empty", "No rows"], ["sql-error", "SQL error"], ["lost", "Connection lost"], ["wide", "Many columns"], ["long", "Long text"], ["cell-menu", "Cell menu"], ["row-menu", "Sidebar menu"], ["level-menu", "Security level menu"], ["tab-menu", "Tab menu"], ["guard-confirm", "Low: confirm"], ["guard-pass", "Strict: passphrase"], ["guard-pass-touch", "Strict with Touch ID"], ["guard-pass-wrong", "Strict: wrong passphrase"], ["warn-limit", "Warning: more than 100 rows"], ["warn-update", "Warning: UPDATE without WHERE"], ["warn-update-strict", "Strict + UPDATE without WHERE"], ["history", "History"], ["history-clear", "Clear history"], ["history-none", "History, none yet"], ["ac-tables", "Complete: tables"], ["ac-columns", "Complete: columns"], ["ac-mixed", "Complete: two tables"], ["ac-loading", "Complete: reading columns"], ["ac-schema", "Complete: schema not loaded"]], true),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork, overlay: guardDialogs + histClearDlg + acOverlay }),
  script: js("page-index.js") + js("page-index-ac.js"),
});

// Table
const structure = `
          <div class="structure" data-view-of="columns" hidden>
            <h3>Columns</h3>
            <div class="grid-wrap"><table class="grid"><thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Nullable</th><th scope="col">Default</th><th scope="col">Key</th></tr></thead><tbody>
              <tr><td>id</td><td>int8</td><td>no</td><td>nextval('orders_id_seq'::regclass)</td><td><span class="key">${ic("key")}Primary</span></td></tr>
              <tr><td>customer_id</td><td>int8</td><td>no</td><td class="null">none</td><td><span class="key">${ic("link")}customers.id</span></td></tr>
              <tr><td>status</td><td>text</td><td>no</td><td>'pending'::text</td><td></td></tr>
              <tr><td>total</td><td>numeric(12,2)</td><td>no</td><td class="null">none</td><td></td></tr>
              <tr><td>currency</td><td>char(3)</td><td>no</td><td>'USD'::bpchar</td><td></td></tr>
              <tr><td>created_at</td><td>timestamptz</td><td>no</td><td>now()</td><td></td></tr>
              <tr><td>shipped_at</td><td>timestamptz</td><td>yes</td><td class="null">none</td><td></td></tr>
            </tbody></table></div>
          </div>
          <div class="structure" data-view-of="indexes" hidden>
            <h3>Indexes</h3>
            <div class="grid-wrap"><table class="grid"><thead><tr><th scope="col">Name</th><th scope="col">Columns</th><th scope="col">Method</th><th scope="col">Unique</th></tr></thead><tbody>
              <tr><td>orders_pkey</td><td>id</td><td>btree</td><td>yes</td></tr>
              <tr><td>orders_customer_id_idx</td><td>customer_id</td><td>btree</td><td>no</td></tr>
              <tr><td>orders_status_created_at_idx</td><td>status, created_at desc</td><td>btree</td><td>no</td></tr>
            </tbody></table></div>
            <h3>Foreign keys</h3>
            <div class="grid-wrap"><table class="grid"><thead><tr><th scope="col">Name</th><th scope="col">Column</th><th scope="col">References</th><th scope="col">On delete</th></tr></thead><tbody>
              <tr><td>orders_customer_id_fkey</td><td>customer_id</td><td>customers.id</td><td>restrict</td></tr>
            </tbody></table></div>
          </div>`;
pages["table.html"] = page({
  title: "ypacapy preview, table",
  desc: "Design preview of a table in ypacapy: its rows under a where filter, its columns, and its indexes and keys.",
  barHtml: bar("table", [["rows", "Rows"], ["columns", "Columns"], ["indexes", "Indexes"], ["no-match", "Filter matches nothing"], ["loading", "Loading"]]),
  body: app({ current: "shop_prod", side: schemaSide("orders") + historySide + savedSide, work: `${tabsbar("orders", ["orders"])}
      <div class="work-body">
        <div class="request-line">
          <div class="url-field"><span class="where-k">where</span><input class="where-in" id="where" aria-label="Where clause for orders" value="status in ('paid', 'shipped', 'refunded')" spellcheck="false" autocomplete="off"></div>${runGroup}
        </div>
        <div class="req-title"><span class="name name--static">orders</span><span class="path">shop_prod / shop / public</span></div>
        <section class="response" aria-label="orders">
          <nav class="subtabs" aria-label="Table">
            <button type="button" class="subtab" data-view="rows" aria-pressed="true">Rows<span class="n" id="t-n" title="Estimate from table statistics">~12k</span></button>
            <button type="button" class="subtab" data-view="columns" aria-pressed="false">Columns<span class="n">7</span></button>
            <button type="button" class="subtab" data-view="indexes" aria-pressed="false">Indexes<span class="n">3</span></button>
            <span class="push meta"><span class="dim" id="t-ms">6&nbsp;ms</span></span>
          </nav>
          <div class="state" data-when="full" data-view-of="rows">
            <div class="res-tools"><span class="muted">Rows 1 to 20</span>${resActions("t")}</div>
            <div class="grid-wrap" tabindex="0" aria-label="Rows of orders">
              <table class="grid"><thead><tr>${ROWHEAD}${th("id", "int8", { num: 1, key: "Primary key" })}${th("customer_id", "int8", { num: 1, key: "References customers.id" })}${th("status", "text")}${th("total", "numeric(12,2)", { num: 1 })}${th("currency", "char(3)")}${th("created_at", "timestamptz")}${th("shipped_at", "timestamptz")}${th("meta", "jsonb")}</tr></thead><tbody>
${ORDERS}
              </tbody></table>
            </div>${inspector("id", "int8", 1, "10463")}
            <div class="grid-foot"><span>1 to 20</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page">${ic("chevron-right")}</button></div>
          </div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Reading orders</strong><span>shop_prod, public.orders</span></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>No row of orders matches this filter</strong><span>No order has the status lost. Status holds paid, shipped, refunded or pending.</span><button type="button" class="link" id="t-clear">Clear the filter</button></div></div>${structure}
        </section>
      </div>` }),
  script: js("page-table.js"),
});

// Diagram: the ER diagram tab, ported from opengrip's DiagramView. Layout and exports are ypacapy's own
// src/lib/diagram.ts and diagramExport.ts, bundled by esbuild and inlined as is, so the preview draws and exports
// what the app will.
const ERD_LIB = buildSync({
  stdin: { contents: 'export * from "./diagram"; export * from "./diagramExport";', resolveDir: new URL("../../src/lib", import.meta.url).pathname, loader: "ts" },
  bundle: true, format: "iife", globalName: "Erd", write: false,
}).outputFiles[0].text;
// schema_diagram's answer for shop_prod / shop / public: what the catalog holds, no row read
const ecol = (spec) => spec.split(", ").map((c) => { const [name, type, flags = ""] = c.trim().split(" "); return { name, type, nullable: flags.includes("?"), primary: flags.includes("!") }; });
const etab = (schema, name, cols, kind = "table", uniques = []) => ({ schema, name, kind, columns: ecol(cols), uniques });
const ekey = (table, cols, refTable, refCols, schema = "public", refSchema = "public") => ({ name: `${table}_${cols.join("_")}_fkey`, schema, table, columns: cols, refSchema, refTable, refColumns: refCols });
const ERD = {
  tables: [
    etab("public", "customers", "id int8 !, email text, full_name text, phone text ?, is_vip bool, country char(2), created_at timestamptz", "table", [["email"]]),
    etab("public", "orders", "id int8 !, customer_id int8, status text, total numeric(12,2), currency char(3), created_at timestamptz, shipped_at timestamptz ?, meta jsonb ?"),
    etab("public", "order_items", "order_id int8 !, line int4 !, product_id int8, qty int4, unit_price numeric(12,2)"),
    etab("public", "products", "id int8 !, sku text, name text, price numeric(12,2), warehouse_id int8 ?", "table", [["sku"]]),
    etab("public", "refunds", "id int8 !, order_id int8, customer_id int8, amount numeric(12,2), reason text ?, created_at timestamptz"),
    etab("public", "shipments", "id int8 !, order_id int8, warehouse_id int8, carrier text, tracking text ?, shipped_at timestamptz ?", "table", [["order_id"]]),
    etab("public", "warehouses", "id int8 !, code text, city text"),
    etab("public", "schema_migrations", "version text !, applied_at timestamptz"),
    etab("audit", "order_events", "id int8 !, order_id int8, kind text, at timestamptz"),
  ],
  keys: [
    ekey("orders", ["customer_id"], "customers", ["id"]),
    ekey("order_items", ["order_id"], "orders", ["id"]),
    ekey("order_items", ["product_id"], "products", ["id"]),
    ekey("products", ["warehouse_id"], "warehouses", ["id"]),
    ekey("refunds", ["order_id"], "orders", ["id"]),
    ekey("refunds", ["customer_id"], "customers", ["id"]),
    ekey("shipments", ["order_id"], "orders", ["id"]),
    ekey("shipments", ["warehouse_id"], "warehouses", ["id"]),
    ekey("order_events", ["order_id"], "orders", ["id"], "audit"),
  ],
};
// schema_links' answer for public: [referencing, referenced] pairs, read when the picker's Add linked tables is pressed
const ERD_LINKS = [...new Set(ERD.keys.filter((k) => k.schema === "public" && k.refSchema === "public").map((k) => `${k.table}\t${k.refTable}`))].map((p) => p.split("\t"));
const ERD_TABS = [TABS[0], TABS[1], ["erd", "network", "public", ""]];
// Export: the image dialog (PNG: fill or transparent background; JPG: nothing to choose), the code dialog for Mermaid
// and DBML (Copy, Save as file), and a toast after a file is saved. Nothing is sent anywhere: the person pastes or opens it.
const erdExport = `
<div class="backdrop" id="erd-img-dlg" hidden>
  <div class="dialog erd-img" role="dialog" aria-modal="true" aria-labelledby="ei-title">
    <h2 id="ei-title">Export image</h2>
    <form>
      <p class="help" id="ei-what">The whole diagram as drawn, at twice its size for sharp text.</p>
      <div class="seg ei-format" role="radiogroup" aria-label="Format">
        <button type="button" role="radio" data-fmt="png" aria-pressed="true" aria-checked="true">PNG</button>
        <button type="button" role="radio" data-fmt="jpg" aria-pressed="false" aria-checked="false">JPG</button>
      </div>
      <fieldset class="ei-bg" id="ei-bg">
        <legend>Background</legend>
        <label class="check"><input type="radio" name="ei-bg" value="fill" checked>Fill with the diagram's background</label>
        <label class="check"><input type="radio" name="ei-bg" value="none">Transparent</label>
      </fieldset>
      <footer>
        <button type="button" class="btn" data-ei-close>Cancel</button>
        <button type="submit" class="btn btn--primary" id="ei-go">${ic("download")}Export</button>
      </footer>
    </form>
  </div>
</div>
<div class="backdrop" id="erd-code-dlg" hidden>
  <div class="dialog wide erd-code" role="dialog" aria-modal="true" aria-labelledby="ec-title">
    <h2 id="ec-title">Mermaid code</h2>
    <form>
      <p class="help" id="ec-help"></p>
      <pre class="erd-code-pre" id="ec-code" tabindex="0" aria-label="Code"></pre>
      <footer>
        <button type="button" class="btn" id="ec-save">${ic("download")}Save as file…</button>
        <span class="grow"></span>
        <button type="button" class="btn" data-ec-close>Close</button>
        <button type="submit" class="btn btn--primary" id="ec-copy">${ic("copy")}Copy</button>
      </footer>
    </form>
  </div>
</div>
<div class="toast" role="status" id="erd-toast" hidden></div>
<div class="backdrop" id="erd-close-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ecl-title">
    <h2 id="ecl-title">Close public?</h2>
    <form>
      <p class="help" id="ecl-msg"></p>
      <footer>
        <button type="button" class="btn" data-ecl-cancel>Cancel</button>
        <button type="button" class="btn" data-ecl-save>${ic("save")}Save and close</button>
        <button type="submit" class="btn btn--primary">Close</button>
      </footer>
    </form>
  </div>
</div>`;
// the picker lists the schema's tables as the tree already has them (load_schema): no extra read to open it
const pickRow = ([n, est]) => `
          <label class="check ep-row"><input type="checkbox" value="${n}"><span class="ep-name">${n}</span><span class="ep-est" title="Estimate from table statistics">~${est}</span></label>`;
const erdPicker = `
<div class="backdrop" id="erd-pick-dlg" hidden>
  <div class="dialog erd-pick" role="dialog" aria-modal="true" aria-labelledby="ep-title">
    <h2 id="ep-title">Tables to draw</h2>
    <form>
      <p class="help">Tables of <strong id="ep-schema">public</strong> on shop_prod. Only the tables you pick are read from the catalog and drawn.</p>
      <div class="search">${ic("search")}<input class="field" id="ep-filter" type="search" placeholder="Filter tables" aria-label="Filter tables" autocomplete="off" spellcheck="false"></div>
      <div class="ep-tools">
        <button type="button" class="btn btn--quiet" id="ep-all">Pick all</button>
        <button type="button" class="btn btn--quiet" id="ep-none">Clear all</button>
        <button type="button" class="btn btn--quiet" id="ep-linked" title="Pick every table one foreign key away from a picked one (reads the schema's foreign keys)">${ic("link")}${ic("loader-circle", "ep-spin")}<span>Add linked tables</span></button>
      </div>
      <div class="ep-list" id="ep-list" role="group" aria-label="Tables of public">${TABLES.map(pickRow).join("")}
        <p class="ep-empty" id="ep-empty" hidden>No table matches <span id="ep-empty-q"></span></p>
      </div>
      <footer>
        <span class="ep-n" id="ep-n" aria-live="polite"></span>
        <button type="button" class="btn" data-ep-close>Cancel</button>
        <button type="submit" class="btn btn--primary" id="ep-show">Show diagram</button>
      </footer>
    </form>
  </div>
</div>`;
const erdTool = (icon, label, id, kbd = "") => `<button type="button" class="icon-btn" id="${id}" aria-label="${label}" title="${label}${kbd ? `  ${kbd}` : ""}">${ic(icon)}</button>`;
pages["diagram.html"] = page({
  title: "ypacapy preview, diagram",
  desc: "Design preview of ypacapy's ER diagram: a schema's tables, columns and foreign keys, read from the catalog only.",
  barHtml: bar("diagram", [["picker", "Picker, first open"], ["picker-filtered", "Picker, filtered"], ["picker-table", "Picker from orders"], ["unsaved", "Unsaved changes"], ["saved-new", "Saved, then 3 ticked"], ["saved-altered", "Saved, then orders altered"], ["reopened", "Reopened after Save"], ["drawn", "All picked"], ["few", "Three picked"], ["selected", "Table selected"], ["keys", "Key columns"], ["names", "Table names"], ["moved", "Moved by hand"], ["menu", "Table menu"], ["tree-menu", "Schema menu"], ["tab-menu", "Tab menu"], ["close-ask", "Close, not saved"], ["export-menu", "Export menu"], ["export-png", "Export PNG"], ["export-jpg", "Export JPG"], ["export-mermaid", "Mermaid code"], ["export-dbml", "DBML code"], ["export-drawio", "Saved .drawio"], ["none", "Picker cancelled"], ["loading", "Loading"], ["error", "Catalog error"]]),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: `${tabsbar("erd", ["erd"], { tabs: ERD_TABS }).replace('data-tab="erd"', 'data-tab="erd" data-unpinnable')}
      <div class="work-body erd-body">
        <div class="req-title"><span class="name name--static" id="erd-title">public</span><span class="path" id="erd-path">shop_prod / shop / public</span></div>
        <div class="erd-tools" role="toolbar" aria-label="Diagram">
          <button type="button" class="btn btn--quiet erd-pick-btn" id="erd-pick-btn" title="Choose the tables to draw">${ic("list-checks")}Tables<span class="n" id="erd-pick-n"></span></button>
          <div class="menu-anchor">
            <button type="button" class="btn btn--quiet erd-export" id="erd-export" data-menu="erd-export-menu" aria-haspopup="menu" aria-expanded="false" title="Export the diagram">${ic("download")}Export</button>
            <div class="menu" id="erd-export-menu" role="menu" aria-label="Export as" hidden>
              <p class="menu-note">Export as</p>
              <button type="button" role="menuitem" data-ex="image">${ic("image")}Image (PNG or JPG)…</button>
              <button type="button" role="menuitem" data-ex="mermaid">${ic("file-code")}Mermaid code…</button>
              <button type="button" role="menuitem" data-ex="dbml">${ic("file-code")}DBML for dbdiagram.io…</button>
              <button type="button" role="menuitem" data-ex="drawio">${ic("file-down")}diagrams.net file (.drawio)…</button>
            </div>
          </div>
          <button type="button" class="btn btn--quiet erd-save" id="erd-save" title="Save the tables and layout with shop_prod  ⌘S" disabled>${ic("save")}<span>Save</span></button>
          ${erdTool("refresh-cw", "Refresh from the catalog", "erd-refresh")}
          <span class="sep" aria-hidden="true"></span>
          ${erdTool("zoom-out", "Zoom out", "erd-out", "−")}
          ${erdTool("zoom-in", "Zoom in", "erd-in", "+")}
          <button type="button" class="btn btn--quiet erd-zoom" id="erd-actual" title="Actual size  0" aria-label="Zoom 100%, actual size">100%</button>
          ${erdTool("maximize", "Fit the diagram", "erd-fit")}
          ${erdTool("undo-2", "Arrange every table again. Save to keep the new layout.", "erd-reset")}
          <span class="sep" aria-hidden="true"></span>
          ${sel("Columns shown", ["All columns", "Key columns", "Table names"]).replace("<select ", '<select id="erd-detail" ')}
          <span class="push erd-status" id="erd-status" aria-live="polite"></span>
        </div>
        <div class="erd-state" data-erd="ready">
          <div class="erd-host" id="erd-host" tabindex="0" role="img" aria-label="Diagram of public"><div class="erd-world" id="erd-world"></div></div>
          <p class="erd-foot">Drag a table to move it. Drag the background or scroll to pan, ⌘ scroll or pinch to zoom. Double-click a table to open its rows. Save keeps the picked tables and this layout with shop_prod; Show diagram brings them back, after a restart too. Tables ticked after a save are placed to the right of the saved ones.</p>
        </div>
        <div class="erd-state" data-erd="loading" hidden><div class="empty"><span class="spinner"></span><strong>Reading the catalog of public</strong><span>Tables, columns and foreign keys. No row is read.</span></div></div>
        <div class="erd-state" data-erd="none" hidden><div class="empty"><strong>No tables picked</strong><span>Pick the tables of public to draw. Only those are read from the catalog.</span><button type="button" class="btn btn--primary" id="erd-pick-empty">${ic("list-checks")}Pick tables</button></div></div>
        <div class="erd-state" data-erd="error" hidden><div class="empty"><strong>Could not read the catalog of audit</strong><span class="erd-err">permission denied for schema audit</span><span>Ask for USAGE on the schema, then refresh.</span></div></div>
      </div>
      <div class="menu ctx-menu" id="erd-menu" role="menu" aria-label="Table" hidden>
        <button type="button" role="menuitem" data-erd-act="rows">${ic("table-2")}Open rows</button>
        <button type="button" role="menuitem" data-erd-act="query">${ic("square-code")}New query on this table</button>
        <hr>
        <button type="button" role="menuitem" data-erd-act="focus">${ic("network")}Show diagram of this table</button>
        <button type="button" role="menuitem" data-erd-act="reveal">${ic("locate")}Select in Schema tree</button>
        <button type="button" role="menuitem" data-erd-act="hide">${ic("eye-off")}Hide from diagram</button>
      </div>`, overlay: erdPicker + erdExport }),
  script: `${ERD_LIB}\nwindow.ERD_DATA = ${JSON.stringify(ERD)};\nwindow.ERD_LINKS = ${JSON.stringify(ERD_LINKS)};\nconst TYPE_ICON = ${TYPE_ICON.toString()};\n` + js("page-diagram.js"),
});

// Settings: voidHTTP's one dialog, its .vars.settings layout
const fontRow = (id, label, desc, ph, prop, sizeProp, sizes, def) => `
              <div class="set-item">
                <div class="set-text"><label for="${id}">${label}</label>${desc ? `<span class="desc">${desc}</span>` : ""}</div>
                <div class="set-ctl">
                  <input id="${id}" class="field set-font" list="${id}-list" placeholder="${ph}" spellcheck="false" data-font-name="${prop}">
                  <datalist id="${id}-list">${(ph.includes("mono") ? ["SF Mono", "Menlo", "Monaco", "Courier New", "JetBrains Mono"] : ["SF Pro", "Helvetica Neue", "Avenir Next", "Inter", "Georgia"]).map((f) => `<option value="${f}"></option>`).join("")}</datalist>
                  <span class="select-wrap"><select class="field set-size" aria-label="${label} size" data-size="${sizeProp}">${sizes.map((n) => `<option value="${n === def ? "" : n + "px"}">${n}</option>`).join("")}</select>${ic("chevron-down", "select-chev")}</span>
                </div>
              </div>`;
const setItem = (label, desc, ctl, forId) => `
              <div class="set-item">
                <div class="set-text">${forId ? `<label for="${forId}">${label}</label>` : `<span class="set-label">${label}</span>`}${desc ? `<span class="desc">${desc}</span>` : ""}</div>
                <div class="set-ctl">${ctl}</div>
              </div>`;
const unit = (id, v, u) => `<span class="unit-field"><input id="${id}" class="field" inputmode="numeric" value="${v}"><span class="unit">${u}</span></span>`;
const choice = (id, opts, value) => `<span class="select-wrap"><select id="${id}" class="field set-choice">${opts.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>${ic("chevron-down", "select-chev")}</span>`;
const LEVELS = [["none", "None"], ["low", "Low"], ["strict", "Strict"]];
// The security level as a menu in the tab bar's guard style: icon, name, what it does, a tick on the picked one.
// The hidden select keeps the value and fires change, so the page scripts read it as before.
const LEVEL_PICK = [["none", "None", "Every statement runs", "shield-off"], ["low", "Low", "Confirm the picked statements", "shield"], ["strict", "Strict", "Passphrase for the picked statements", "lock"]];
const levelPick = (id, value) => `<div class="menu-anchor level-pick" data-level-pick="${id}">
                  <select id="${id}" hidden aria-hidden="true" tabindex="-1">${LEVEL_PICK.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>
                  <button type="button" class="field set-choice level-btn" id="${id}-btn" data-menu="${id}-menu" aria-haspopup="menu" aria-expanded="false">${ic("shield-off", "guard-ico")}<span class="env-name">None</span>${ic("chevron-down", "select-chev")}</button>
                  <div class="menu guard-menu" id="${id}-menu" role="menu" aria-label="Security level" hidden>
                    ${LEVEL_PICK.map(([v, l, d, icon]) => `<button type="button" role="menuitemradio" aria-checked="false" data-pick="${v}" data-icon="${icon}">${ic(icon)}<span class="gm-text"><span>${l}</span><small data-desc="${d}">${d}</small></span>${ic("check", "tick")}</button>`).join("")}
                  </div>
                </div>`;
// What each security level does with the statements ticked under it
const LEVEL_DESC = { none: "Every statement runs", low: "Confirm the statements below", strict: "Passphrase for the statements below" };
// MongoDB has no statements: the guard asks about write methods, grouped by what they do. An aggregate that ends in
// $out or $merge writes too, so it is on the list; a plain aggregate is a read.
const MONGO_OPS = [[["insertOne", "insertMany"]], [["updateOne", "updateMany", "replaceOne"]], [["deleteOne", "deleteMany"]], [["findOneAndUpdate", "findOneAndReplace", "findOneAndDelete"]], [["bulkWrite"]],
  [["$out", "$merge"], "In aggregate"], [["drop", "dropDatabase", "dropIndex"]], [["createCollection", "createIndex"]], [["renameCollection", "collMod"]], [["createUser", "grantRolesToUser", "revokeRolesFromUser"]]];
// Redis has commands: the guard asks about the ones that write, grouped by the type they write to, plus KEYS, a read
// that walks every key and holds the server while it does. A script can write, so EVAL and friends are on the list too.
const REDIS_OPS = [[["SET", "MSET", "APPEND", "INCR", "DECR"], "Strings"], [["HSET", "HDEL", "HINCRBY"], "Hashes"], [["LPUSH", "RPUSH", "LPOP", "RPOP", "LREM", "LTRIM"], "Lists"],
  [["SADD", "SREM", "SMOVE"], "Sets"], [["ZADD", "ZREM", "ZINCRBY", "ZREMRANGEBYSCORE"], "Sorted sets"], [["XADD", "XDEL", "XTRIM"], "Streams"], [["DEL", "UNLINK", "RENAME"]], [["EXPIRE", "PERSIST"]],
  [["FLUSHDB", "FLUSHALL"]], [["EVAL", "EVALSHA", "FCALL"], "Scripts can write"], [["CONFIG SET", "SCRIPT FLUSH", "SHUTDOWN"]], [["KEYS"], "A read that blocks the server"]];
const STMTS = [["INSERT"], ["UPDATE"], ["DELETE"], ["REPLACE", "MySQL"], ["ALTER"], ["DROP"], ["TRUNCATE"], ["CREATE"], ["GRANT"], ["REVOKE"]];
const passField = (id, label, auto) => `<label>${label}<input class="field" id="${id}" type="password" autocomplete="${auto}" required aria-required="true"></label>`;
const subDialog = (key, title, body, primary, danger) => `
  <div class="backdrop sub-backdrop" data-sub="${key}" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-label="${title}">
      <h2>${title}</h2>
      <form data-sub-form="${key}" novalidate>${body}
        <p class="help err" data-sub-err role="alert"></p>
        <footer><button type="button" class="btn" data-sub-cancel>Cancel</button><button type="submit" class="btn ${danger ? "btn--danger" : "btn--primary"}">${primary}</button></footer>
      </form>
    </div>
  </div>`;
const passDialogs = () =>
  subDialog("unlock", "Change passphrase protection", passField("p-unlock", "Passphrase", "current-password") + '<p class="help" data-touch-hint hidden>Or use Touch ID.</p>', "Unlock") +
  authSub("new") +
  authSub("change") +
  authSub("disable") +
  authSub("reset");
// The passphrase asks of a Strict connection, in one shape: a badge, what is about to change, the passphrase, Touch ID.
// Lower: the level it leaves and the level it goes to, and what that means for writes. Unlock: what opens, and that
// it locks again when the window closes. The button says the action (Lower to None, Unlock), never just OK.
const authLevel = (cls, icon, name, desc) => `<span class="auth-level ${cls}">${ic(icon)}<span class="auth-level-text"><strong>${name}</strong><small>${desc}</small></span></span>`;
const authPass = (id) => `
      <label class="auth-field" for="${id}">Passphrase
        <span class="auth-input">${ic("key-round")}<input class="field" id="${id}" type="password" autocomplete="current-password" placeholder="The app passphrase" spellcheck="false"><button type="button" class="auth-eye" aria-label="Show passphrase" aria-pressed="false" data-auth-eye>${ic("eye")}</button></span>
      </label>
      <p class="auth-caps" data-auth-caps hidden>${ic("arrow-up")}Caps Lock is on</p>
      <p class="auth-err" role="alert" data-auth-err hidden>${ic("circle-alert")}<span>That passphrase is not right.</span></p>
      <div class="auth-touch" data-auth-touch hidden>
        <div class="auth-or" aria-hidden="true"><span>or</span></div>
        <button type="button" class="btn auth-btn auth-touch-btn">${ic("fingerprint")}Use Touch ID</button>
      </div>`;
const authDialogs = () => `
<div class="backdrop auth-backdrop" data-auth="lower" hidden>
  <div class="dialog auth" role="dialog" aria-modal="true" aria-labelledby="auth-lower-t" aria-describedby="auth-lower-d">
    <div class="auth-head">
      <span class="auth-badge auth-badge--warn">${ic("lock-open")}</span>
      <div class="auth-head-text">
        <h2 id="auth-lower-t">Lower shop_prod from Strict?</h2>
        <p id="auth-lower-d">Enter the passphrase to change its security level.</p>
      </div>
    </div>
    <div class="auth-shift">
      ${authLevel("auth-level--from", "lock", "Strict", "Passphrase for the picked statements")}
      <span class="auth-arrow" aria-label="to">${ic("arrow-right")}</span>
      <span data-auth-to="none">${authLevel("auth-level--to", "shield-off", "None", "Every statement runs")}</span>
      <span data-auth-to="low" hidden>${authLevel("auth-level--to", "shield", "Low", "Confirm the picked statements")}</span>
    </div>
    <p class="auth-note"><span data-auth-to="none">Writes on shop_prod will run without asking.</span><span data-auth-to="low" hidden>Writes on shop_prod will ask to confirm, without the passphrase.</span></p>
    <form data-auth-form="lower">${authPass("auth-lower-pass")}
      <footer class="auth-actions"><button type="button" class="btn auth-btn" data-auth-cancel>Abort</button><button type="submit" class="btn auth-btn auth-btn--danger">${ic("lock-open")}<span data-auth-to="none">Lower to None</span><span data-auth-to="low" hidden>Lower to Low</span></button></footer>
    </form>
  </div>
</div>
<div class="backdrop auth-backdrop" data-auth="unlock" hidden>
  <div class="dialog auth" role="dialog" aria-modal="true" aria-labelledby="auth-unlock-t" aria-describedby="auth-unlock-d">
    <div class="auth-head">
      <span class="auth-badge">${ic("lock")}</span>
      <div class="auth-head-text">
        <h2 id="auth-unlock-t">Unlock shop_prod's Strict settings</h2>
        <p id="auth-unlock-d">Enter the passphrase to change what Strict asks about.</p>
      </div>
    </div>
    <ul class="auth-scope">
      <li>${ic("list-checks")}<span>Statements to ask about</span></li>
      <li>${ic("fingerprint")}<span>Allow Touch ID</span></li>
      <li>${ic("timer")}<span>Stay unlocked for</span></li>
    </ul>
    <p class="auth-note">${ic("lock")}It locks again when you close Settings or the connection dialog.</p>
    <form data-auth-form="unlock">${authPass("auth-unlock-pass")}
      <footer class="auth-actions"><button type="button" class="btn auth-btn" data-auth-cancel>Abort</button><button type="submit" class="btn auth-btn auth-btn--primary">${ic("lock-open")}Unlock</button></footer>
    </form>
  </div>
</div>`;
// The app passphrase's own dialogs (Set, Change, Reset, Disable) in the passphrase asks' shape: a badge, what it does,
// each field with its key and show/hide, Caps Lock, "They match" under a new pair, Abort and the action in equal halves.
const AUTH_SUB = {
  new: { title: "Set passphrase", sub: "One passphrase for the whole app. Strict connections ask for it.", badge: "", icon: "key-round", primary: "Set passphrase",
    fields: [["p-new", "Passphrase", "new-password"], ["p-new2", "Type it again", "new-password"]],
    note: ["info", "It cannot be shown again. If you forget it, reset it with Touch ID or your login password."] },
  change: { title: "Change passphrase", sub: "Enter the current one, then the new one twice.", badge: "", icon: "key-round", primary: "Change passphrase",
    fields: [["p-cur", "Current passphrase", "current-password"], ["p-chg", "New passphrase", "new-password"], ["p-chg2", "Type it again", "new-password"]],
    note: ["shield-check", "Connections keep their protection; the new passphrase opens them."] },
  reset: { title: "Reset passphrase", sub: "The old passphrase can only be replaced.", badge: "warn", icon: "key-round", primary: "Reset passphrase",
    fields: [["p-rst", "New passphrase", "new-password"], ["p-rst2", "Type it again", "new-password"]],
    note: ["fingerprint", "macOS asks for Touch ID or your login password first. Connections keep their protection."] },
  disable: { title: "Disable passphrase", sub: "Enter the current passphrase to turn it off for the whole app.", badge: "danger", icon: "shield-off", primary: "Disable passphrase", danger: true,
    fields: [["p-cur2", "Current passphrase", "current-password"]],
    effects: [["off", "lock-open", "Strict connections", "ask to confirm, as Low does"], ["off", "fingerprint", "Allow Touch ID", "turns off on every connection"], ["keep", "shield-check", "Security levels and warnings", "stay as they are"]],
    note: ["key-round", "You can set a new one any time, here in Security."] },
};
const authSub = (key) => {
  const d = AUTH_SUB[key], pair = d.fields.length > 1 && key !== "disable";
  return `
  <div class="backdrop sub-backdrop" data-sub="${key}" hidden>
    <div class="dialog auth" role="dialog" aria-modal="true" aria-labelledby="auth-${key}-t" aria-describedby="auth-${key}-d">
      <div class="auth-head">
        <span class="auth-badge${d.badge ? " auth-badge--" + d.badge : ""}">${ic(d.icon)}</span>
        <div class="auth-head-text"><h2 id="auth-${key}-t">${d.title}</h2><p id="auth-${key}-d">${d.sub}</p></div>
      </div>${d.effects ? `
      <ul class="auth-scope auth-effects">${d.effects.map(([k, icon, strong, rest]) => `<li class="auth-effect--${k}">${ic(icon)}<span><strong>${strong}</strong> ${rest}</span></li>`).join("")}</ul>` : ""}
      <p class="auth-note">${ic(d.note[0])}<span>${d.note[1]}</span></p>
      <form data-sub-form="${key}"${pair ? " data-auth-pair" : ""} novalidate>${d.fields.map(([id, label, auto]) => `
        <label class="auth-field" for="${id}">${label}
          <span class="auth-input">${ic("key-round")}<input class="field" id="${id}" type="password" autocomplete="${auto}" required aria-required="true" spellcheck="false"><button type="button" class="auth-eye" aria-label="Show passphrase" aria-pressed="false" data-auth-eye>${ic("eye")}</button></span>
        </label>`).join("")}${pair ? `
        <p class="auth-match" data-auth-match hidden></p>` : ""}
        <p class="auth-caps" data-auth-caps hidden>${ic("arrow-up")}Caps Lock is on</p>
        <p class="auth-err" role="alert" data-auth-err>${ic("circle-alert")}<span data-sub-err></span></p>
        <footer class="auth-actions"><button type="button" class="btn auth-btn" data-sub-cancel>Abort</button><button type="submit" class="btn auth-btn ${d.danger ? "auth-btn--danger" : "auth-btn--primary"}">${ic(d.icon)}${d.primary}</button></footer>
      </form>
    </div>
  </div>`;
};
const securityPane = () => `
      <div class="set-pane" data-pane="security" hidden>
        <h3>Security</h3>
        <p class="pane-note">The passphrase is one for the whole app. Each connection keeps its own security level (None, Low or Strict) and the statements it asks about, set in its Options or the tabs bar. The warnings here hold for every SQL connection that does not set its own.</p>
        <div class="set-list">${setItem("Default security level for new connections", "Existing connections keep their own", levelPick("sec-level", "none"), "sec-level-btn")}
        </div>
        <div class="set-list">
              <div class="set-item set-item--pass">
                <div class="set-text"><span class="set-label">Passphrase</span><span class="desc" data-pass-desc>Not set</span><button type="button" class="pass-forgot" data-pass="set" data-open-sub="reset" hidden>Forgot passphrase?</button></div>
                <div class="set-ctl" data-pass="none"><button type="button" class="btn" data-open-sub="new">Set passphrase</button></div>
                <div class="set-ctl" data-pass="set" hidden><button type="button" class="btn" data-open-sub="change">Change passphrase</button><button type="button" class="btn btn--danger" data-open-sub="disable">Disable passphrase</button></div>
              </div>
        </div>
        ${warnRows("sec")}
      </div>`;
const sw = (id, on) => `<input id="${id}" class="switch" type="checkbox" role="switch"${on ? " checked" : ""}>`;
const schemeRow = (slot) => `
              <div class="set-item" data-scheme-row="${slot}">
                <div class="set-text"><label for="set-scheme-${slot}" data-scheme-label></label></div>
                <div class="set-ctl"><span class="scheme-dots" aria-hidden="true"></span><span class="select-wrap"><select id="set-scheme-${slot}" class="field set-scheme" data-scheme="${slot}"></select>${ic("chevron-down", "select-chev")}</span></div>
              </div>`;
// Settings > Updates (voidHTTP's UpdatesPane), drawn as an onsen: the capy soaking in the middle as in About, the version
// under it, the updater's state as a pill, one line of detail, the action below. Then the launch check and release notes.
// Each hero is one updater state; the preview bar picks which one shows.
const REL = "https://github.com/jimmyfish/ypacapy/releases";
const relLink = (label) => `<button type="button" class="upd-link" title="${REL}">${label}${ic("external-link")}</button>`;
const U_ERR = "error sending request for url (https://github.com/jimmyfish/ypacapy/releases/latest/download/latest.json)";
const checkBtn = (dis) => `<button type="button" class="btn"${dis ? " disabled" : ""}>${ic("refresh-cw")}Check again</button>`;
const UPD = [
  { st: "current", pill: ["ok", "circle-check", "Up to date"], sub: "Nothing newer out there. Checked just now.", ctl: checkBtn() },
  { st: "idle", pill: ["", "", "Not checked yet"], sub: "Hit the button to take a look.", ctl: checkBtn() },
  { st: "checking", pill: ["busy", "loader-circle", "Checking"], sub: "Asking GitHub what's new…", ctl: checkBtn(true) },
  { st: "available", pill: ["new", "circle-arrow-down", "0.0.2 is out"], sub: "Released 20 Nov 2026. Grab it whenever.",
    ctl: `<button type="button" class="btn btn--primary" data-href="./updates.html?show=downloading">${ic("circle-arrow-down")}Install update</button>` },
  { st: "downloading", pill: ["busy", "loader-circle", "Downloading 0.0.2 · 42%"], sub: "4.1 of 9.8 MB · go on, keep working", prog: 42 },
  { st: "installing", pill: ["busy", "loader-circle", "Installing 0.0.2"], sub: "Downloaded, signature checks out", prog: 100 },
  { st: "ready", pill: ["ok", "circle-check", "0.0.2 is in"], sub: "Restart ypacapy to commit it.", ctl: `<button type="button" class="btn btn--primary">${ic("refresh-cw")}Restart now</button>` },
  { st: "error", pill: ["bad", "triangle-alert", "Couldn't check for updates"], sub: U_ERR, ctl: checkBtn() },
  { st: "dev", pill: ["dev", "", "dev build"], sub: "Branch v0.0.1 · updates are off here", ctl: relLink("Get the release"), ver: "v0.0.1-4-g1a19d06+" },
];
const updHero = (u) => `
          <div class="upd-hero" data-upd-st="${u.st}" aria-live="polite" hidden>
            <div class="about-onsen ping upd-onsen" aria-hidden="true"><span class="steam"><b></b><b></b><b></b></span><i></i><i></i><i></i><img src="../../public/app-icon.png" alt=""></div>
            <div class="upd-hero-name">ypa<span>capy</span> <code>${u.ver ?? "0.0.1"}</code></div>
            <span class="upd-pill ${u.pill[0]}">${u.pill[1] ? ic(u.pill[1], u.pill[1] === "loader-circle" ? "upd-spin" : "") : ""}${u.pill[2]}</span>
            <p class="upd-hero-sub" title="${u.sub}">${u.sub}</p>${u.prog !== undefined ? `<i class="upd-hero-prog" style="--p:${u.prog}%"></i>` : ""}${u.ctl ? `
            <div class="upd-hero-ctl">${u.ctl}</div>` : ""}
          </div>`;
const updatesPane = () => `
      <div class="set-pane" data-pane="updates" hidden>
        <h3>Updates</h3>${UPD.map(updHero).join("")}
        <div class="set-list">
              <div class="set-item" data-upd-auto>
                <div class="set-text"><label for="set-auto-update">Check automatically</label><span class="desc" data-auto-desc>Peek for a new version every time ypacapy opens</span></div>
                <div class="set-ctl">${sw("set-auto-update", true)}</div>
              </div>${setItem("Release notes", "What's new, version by version", relLink("Open on GitHub"))}
        </div>
      </div>`;
// Settings, opened from a connection tab: that connection's own settings come first, in their own group above the
// app-wide ones. Opened from Home there is no connection, so only Global shows (and without its heading).
// Connection > Security: its level, What to ask about, and the warnings (SQL only; they ask whatever the level).
// Connection > Queries: the values that follow Global > Queries while empty. Edits save as they are made.
// Warnings: Global sets them for every connection (switches, on by default); a connection follows Global unless it
// picks On or Off. `follow` names what it follows ("Global" in Settings, "Settings" in the Connect dialog).
const warnCtl = (id, follow) => (follow ? choice(id, [["app", `Use ${follow} (on)`], ["on", "On"], ["off", "Off"]], "app") : sw(id, true));
const warnRows = (p, follow, h = "h4", attrs = "") => `<${h} class="cx-h"${attrs}>Warnings <span class="cx-h-note">${follow ? "Ask even when the security level is None" : "For every connection that does not set its own"}</span></${h}>
        <div class="set-list"${attrs}>${setItem("More than 100 rows", "A select whose LIMIT, or the row limit ypacapy adds, is above 100", warnCtl(p + "-warn-limit", follow), p + "-warn-limit")}${setItem('<code class="stmt">UPDATE</code> without <code class="stmt">WHERE</code>', "Changes every row of its table, even a table of one row", warnCtl(p + "-warn-update", follow), p + "-warn-update")}
        </div>`;
const connSecurityPane = () => `
      <div class="set-pane" data-pane="conn-security">
        <h3>Security <span class="cx-h-note">shop_prod only</span></h3>
        <div class="set-list">${setItem("Security level", "Low asks to confirm before a write", choice("cn-level", [["none", "None"], ["low", "Low"], ["strict", "Strict"]], "low"), "cn-level")}
        </div>
        <div data-cn-guarded>
        <div class="protect-head cx-protect-head">
          <h4 class="cx-h">Statements to ask about</h4>
          <button type="button" class="btn btn--quiet" id="cn-protect-toggle" data-cn-strict hidden>${ic("lock")}<span>Unlock</span></button>
        </div>
        <div class="set-list stmts">${STMTS.map(([k, tag], i) => setItem(`<code class="stmt">${k}</code>${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", sw(`cn-prot-${i}`, true), `cn-prot-${i}`)).join("")}
        </div>
        </div>
        ${warnRows("cn", "Global")}
      </div>`;
const connQueriesPane = () => `
      <div class="set-pane" data-pane="conn-queries" hidden>
        <h3>Queries <span class="cx-h-note">shop_prod only · empty uses Global</span></h3>
        <div class="set-list">${setItem("Row limit", "Added to a select that has no limit of its own", '<span class="unit-field"><input id="cn-limit" class="field" inputmode="numeric" placeholder="100"><span class="unit">rows</span></span>', "cn-limit")}${setItem("Statement timeout", "0 lets a statement run as long as it takes", '<span class="unit-field"><input id="cn-timeout" class="field" inputmode="numeric" placeholder="30"><span class="unit">s</span></span>', "cn-timeout")}${setItem("Keep query history", "", choice("cn-hist", [["app", "Use Global (on)"], ["on", "On"], ["off", "Off"]], "app"), "cn-hist")}${setItem("Connection heartbeat", "Keeps idle connections open with select 1", choice("cn-beat", [["app", "Use Global (off)"], ["on", "On"], ["off", "Off"]], "app"), "cn-beat")}
        </div>
      </div>`;
pages["settings.html"] = page({
  title: "ypacapy preview, settings",
  desc: "Design preview of ypacapy Settings: theme and color scheme per appearance, compact mode, three fonts, query defaults and where data lives.",
  barHtml: bar("settings", [["conn-security", "Connection: Security"], ["conn-strict", "Connection: Strict"], ["lower-ask", "Lower from Strict"], ["lower-low", "Lower to Low, Touch ID"], ["lower-wrong", "Lower, wrong passphrase"], ["unlock-ask", "Unlock protection"], ["conn-queries", "Connection: Queries"], ["home", "Opened from Home"], ["appearance", "Appearance"], ["queries", "Queries"], ["security", "Security"], ["pass-set", "Passphrase set"], ["pass-new", "Set passphrase"], ["pass-new-differ", "Set, they differ"], ["pass-change", "Change passphrase"], ["pass-disable", "Disable passphrase"], ["pass-disable-wrong", "Disable, wrong passphrase"], ["pass-reset", "Forgot passphrase"], ["data", "Data on this Mac"], ["updates", "Updates"], ["upd-idle", "Not checked yet"], ["upd-checking", "Checking"], ["upd-available", "Update available"], ["upd-downloading", "Downloading"], ["upd-installing", "Installing"], ["upd-ready", "Ready to restart"], ["upd-error", "Check failed"], ["upd-dev", "Dev build"]]),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork, overlay: `
<div class="backdrop" data-close="./index.html">
  <div class="dialog wide" role="dialog" aria-modal="true" aria-label="Settings">
    <h2>Settings</h2>
    <div class="vars settings">
      <ul>
        <li class="group" data-conn-group><span>Connection</span><span class="cx-h-note">shop_prod</span></li>
        <li data-conn-group><button type="button" data-section="conn-security" aria-current="true">${ic("shield-check")}Security</button></li>
        <li data-conn-group><button type="button" data-section="conn-queries">${ic("terminal")}Queries</button></li>
        <li class="group" data-conn-group>Global</li>
        <li><button type="button" data-section="appearance">${ic("type")}Appearance</button></li>
        <li><button type="button" data-section="queries">${ic("terminal")}Queries</button></li>
        <li><button type="button" data-section="security">${ic("shield-check")}Security</button></li>
        <li><button type="button" data-section="data">${ic("lock")}Data on this Mac</button></li>
        <li><button type="button" data-section="updates">${ic("circle-arrow-down")}Updates</button></li>
      </ul>
${connSecurityPane()}
${connQueriesPane()}
      <div class="set-pane" data-pane="appearance" hidden>
        <h3>Appearance</h3>
        <div class="set-list">${setItem("Theme", "", `<div class="seg seg--lg" role="group" aria-label="Theme"><button type="button" data-set-theme="auto" aria-pressed="true">Auto</button><button type="button" data-set-theme="light" aria-pressed="false">Light</button><button type="button" data-set-theme="dark" aria-pressed="false">Dark</button></div>`)}${schemeRow("light")}${schemeRow("dark")}${setItem("Compact mode", "", sw("set-compact", false), "set-compact")}${fontRow("set-ui-font", "Interface font", "", "System default", "--font-ui", "--font-size-ui", [12, 13, 14, 15, 16], 14)}${fontRow("set-table-font", "Table font", "", "System monospace", "--font-table", "--font-size-table", [11, 12, 13, 14, 15, 16], 13)}${fontRow("set-console-font", "Editor font", "", "System monospace", "--font-mono", "--font-size-code", [11, 12, 13, 14, 15, 16, 18], 13)}
          <div class="set-sample" aria-label="Sample">
            <span class="set-sample-ui">Refunds by customer <span class="muted">Saved queries / Reports</span></span>
            <code><span class="q-k">select</span> c.email, <span class="q-f">count</span>(*) <span class="q-k">from</span> <span class="q-tb">orders</span></code>
            <code style="font-family: var(--font-table); font-size: var(--text-table)">10482   4,820.00   2026-11-14 09:41:07+07</code>
          </div>
        </div>
        <button type="button" class="link set-reset" id="set-reset">Reset to defaults</button>
      </div>
      <div class="set-pane" data-pane="queries" hidden>
        <h3>Queries</h3>
        <div class="set-list">${setItem("Row limit", "Added to a select that has no limit of its own", unit("set-limit", "100", "rows"), "set-limit")}${setItem("Statement timeout", "", unit("set-timeout", "30", "s"), "set-timeout")}${setItem("Keep query history", "", sw("set-hist", true), "set-hist")}${setItem("Connection heartbeat", "Sends select 1 on every open connection, for servers that drop idle ones", sw("set-beat", false), "set-beat")}${setItem("Every", "Below the server idle timeout", unit("set-beat-every", "30", "s"), "set-beat-every").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-beat hidden")}
        </div>
      </div>
${securityPane()}
      <div class="set-pane" data-pane="data" hidden>
        <h3>Data on this Mac</h3>
        <div class="set-list">${setItem("Settings", "", '<span class="set-path">~/.config/ypacapy/settings.toml</span>')}${setItem("Connections", "No passwords", '<span class="set-path">~/.config/ypacapy/connections.toml</span>')}${setItem("History and saved queries", "", '<span class="set-path">~/.config/ypacapy/ypacapy.db</span>')}${setItem("Passwords", "Never synced to iCloud", "macOS login keychain")}${setItem("Network", "", "The databases you add, and GitHub for updates")}
        </div>
        <button type="button" class="btn">${ic("folder-open")}Show in Finder</button>
      </div>
${updatesPane()}
    </div>
  </div>${passDialogs()}${authDialogs()}
</div>` }),
  script: js("page-settings.js"),
});

// New connection: a data-source dialog. Name and colour on top, then tabs; right-aligned labels, fields to the right
const csel = (id, opts, cur, extra = "") => `<span class="select-wrap"${extra}><select class="field" id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === cur ? " selected" : ""}>${t}</option>`).join("")}</select>${ic("chevron-down", "select-chev")}</span>`;
const lab = (id, t) => `<label for="${id}">${t}</label>`;
const COLORS = [["5", "Turquoise"], ["2", "Emerald"], ["7", "Sunflower"], ["3", "Carrot"], ["6", "Alizarin"], ["1", "River"], ["8", "Asphalt"], ["4", "Amethyst"]];
pages["connect.html"] = page({
  title: "ypacapy preview, new connection",
  desc: "Design preview of adding a PostgreSQL, MySQL, SQLite, MongoDB or Redis connection in ypacapy, with its password kept in the macOS login keychain.",
  barHtml: bar("connect", [["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["sqlite", "SQLite"], ["mongo", "MongoDB (SRV)"], ["mongo-host", "MongoDB host and port"], ["mongo-url", "MongoDB URL only"], ["mongo-options", "MongoDB Options"], ["mongo-tls", "MongoDB TLS"], ["mongo-advanced", "MongoDB Advanced"], ["mongo-test-ok", "MongoDB test passed"], ["mongo-test-failed", "MongoDB test failed"], ["redis", "Redis"], ["redis-url", "Redis URL only"], ["redis-options", "Redis Options"], ["redis-tls", "Redis TLS"], ["redis-advanced", "Redis Advanced"], ["redis-test-ok", "Redis test passed"], ["redis-test-failed", "Redis test failed"], ["url-only", "URL only"], ["options", "Options tab"], ["options-low", "Low"], ["options-strict", "Strict"], ["options-nopass", "No passphrase set"], ["level-menu", "Security level menu"], ["group-menu", "Group menu"], ["group-new", "New group"], ["ssl", "SSL tab"], ["advanced", "Advanced tab"], ["name-missing", "Name missing"], ["testing", "Testing"], ["test-stopped", "Test stopped"], ["test-ok", "Test passed"], ["test-failed", "Test failed"]]),
  body: `
<div class="app">${strip("home")}
  <div class="home"><div class="home-inner"><div class="home-head"><div><h1>Connections</h1><p class="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p></div></div></div></div>
</div>
<div class="backdrop" data-close="./home.html">
  <div class="dialog cx" role="dialog" aria-modal="true" aria-labelledby="cx-title">
    <h2 id="cx-title">New connection</h2>
    <form id="connect-form" data-endpoint="" novalidate>
      <div class="cx-grid cx-head">
        ${lab("c-name", "Name")}<input class="field" id="c-name" name="name" required aria-required="true" aria-describedby="c-name-h" autocomplete="off" spellcheck="false">
        ${lab("c-color", "Color")}<span class="cx-color" style="--fg: var(--proj-1-fg)">${csel("c-color", COLORS, "1")}</span>
        <span class="help cx-full" id="c-name-h"></span>
        ${lab("c-group-btn", "Group")}<div class="menu-anchor cx-group group-pick" data-groups="Production,Staging">
          <input type="hidden" id="c-group" name="group" value="">
          <button type="button" class="field group-btn" id="c-group-btn" data-menu="c-group-menu" aria-haspopup="menu" aria-expanded="false">${ic("folder-minus", "grp-ico")}<span class="env-name">No group</span>${ic("chevron-down", "select-chev")}</button>
          <input class="field group-new" id="c-group-new" placeholder="New group name" aria-label="New group name" aria-describedby="c-group-h" autocomplete="off" spellcheck="false" hidden>
          <div class="menu group-menu" id="c-group-menu" role="menu" aria-label="Group" hidden></div>
        </div>
        <span class="help cx-full group-help" id="c-group-h" hidden>Enter keeps the name. Escape goes back.</span>
      </div>
      <div class="subtabs cx-tabs" role="tablist" aria-label="Connection settings">
        ${[["general", "General"], ["options", "Options"], ["ssl", "SSL"], ["advanced", "Advanced"]].map(([k, t], i) => `<button type="button" class="subtab" role="tab" id="t-${k}" aria-controls="p-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t}</button>`).join("")}
      </div>

      <div class="cx-panel" role="tabpanel" id="p-general" aria-labelledby="t-general">
        <div class="cx-grid">
          ${lab("c-engine", "Engine")}<span class="cx-full cx-driver">${ic("server", "drv-ico")}${csel("c-engine", [["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["sqlite", "SQLite"], ["mongo", "MongoDB"], ["redis", "Redis"]], "postgres")}</span>
          <span class="cx-label" id="c-type-l" data-for="server">Connection type</span><span class="cx-full" data-for="server"><span class="seg seg--lg" role="group" aria-labelledby="c-type-l"><button type="button" aria-pressed="true" data-type="default">Default</button><button type="button" aria-pressed="false" data-type="url">URL only</button></span></span>
          <span data-for="fields" class="cx-sub">${lab("c-host", "Host")}<input class="field mono" id="c-host" name="host" value="localhost" autocomplete="off" spellcheck="false">${lab("c-port", "Port")}<input class="field mono cx-port" id="c-port" name="port" value="5432" inputmode="numeric" autocomplete="off">
          ${lab("c-user", "User")}<input class="field mono cx-full" id="c-user" name="user" value="ops" autocomplete="username" spellcheck="false"></span>
          <span data-for="server" class="cx-sub">${lab("c-pass", "Password")}<input class="field cx-full" id="c-pass" name="password" type="password" autocomplete="current-password" aria-describedby="c-pass-h"></span>
          <span data-for="fields" class="cx-sub">${lab("c-db", "Database")}<input class="field mono cx-full" id="c-db" name="database" value="shop" autocomplete="off" spellcheck="false"></span>
          <span data-for="redis-fields" class="cx-sub" hidden><span class="help cx-full cx-under">A number, 0 to 15. Empty uses 0. ypacapy shows this database only.</span></span>
          <span data-for="mongo-fields" class="cx-sub" hidden>${lab("c-authdb", "Auth database")}<input class="field mono cx-full" id="c-authdb" name="authSource" placeholder="admin" autocomplete="off" spellcheck="false" aria-describedby="c-authdb-h">
          <span class="help cx-full cx-under" id="c-authdb-h">The database the user is defined in. Empty uses admin.</span>
          <span class="cx-label">SRV record</span><label class="check cx-full"><input id="c-srv" type="checkbox">Host is a DNS seed list name (mongodb+srv), so there is no port</label></span>
          <span data-for="sqlite" class="cx-sub" hidden>${lab("c-file", "File")}<span class="with-btn cx-full"><input class="field mono" id="c-file" name="file" placeholder="~/data/analytics.sqlite" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span></span>
          ${lab("c-url", "URL")}<input class="field mono cx-full" id="c-url" name="url" autocomplete="off" spellcheck="false" aria-describedby="c-url-h">
          <span class="help cx-full cx-under" id="c-url-h">Editing the URL fills in the settings above.</span>
          <span class="help cx-full cx-under" id="c-pass-h" data-for="server">${ic("key-round")}Passwords stay in the macOS login keychain on this Mac</span>
        </div>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-options" aria-labelledby="t-options" hidden>
        <h3 class="cx-h">Security</h3>
        <div class="set-list">${setItem("Security level", LEVEL_DESC.none, levelPick("c-level", "none"), "c-level-btn").replace('<span class="desc">', '<span class="desc" data-level-desc>')}${setItem("Allow Touch ID", "", '<input id="c-touch" class="switch" type="checkbox" role="switch">', "c-touch").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-strict hidden")}${setItem("Stay unlocked for", "After the passphrase, for this connection only", choice("c-window", [["0", "Ask every time"], ["60", "1 minute"], ["300", "5 minutes"], ["900", "15 minutes"]], "0"), "c-window").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-strict hidden")}
        </div>
        <div data-when-guarded hidden>
        <div class="protect-head cx-protect-head">
          <h3 class="cx-h"><span data-for="sql">Statements to ask about</span><span data-for="mongo" hidden>Writes to ask about</span><span data-for="redis" hidden>Commands to ask about</span> <span class="cx-h-note">For this connection</span></h3>
          <button type="button" class="btn btn--quiet" id="protect-toggle" data-when-strict hidden>${ic("lock")}<span>Unlock</span></button>
        </div>
        <div class="set-list stmts" id="protect">${STMTS.map(([k, tag], i) => setItem(`<code class="stmt">${k}</code>${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", `<input id="prot-${i}" class="switch" type="checkbox" role="switch" checked>`, `prot-${i}`).replace('class="set-item"', 'class="set-item" data-for="sql"')).join("")}${MONGO_OPS.map(([ks, tag], i) => setItem(`${ks.map((k) => `<code class="stmt">${k}</code>`).join(" ")}${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", `<input id="prot-m${i}" class="switch" type="checkbox" role="switch" checked>`, `prot-m${i}`).replace('class="set-item"', 'class="set-item" data-for="mongo" hidden')).join("")}${REDIS_OPS.map(([ks, tag], i) => setItem(`${ks.map((k) => `<code class="stmt">${k}</code>`).join(" ")}${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", `<input id="prot-r${i}" class="switch" type="checkbox" role="switch" checked>`, `prot-r${i}`).replace('class="set-item"', 'class="set-item" data-for="redis" hidden')).join("")}
        </div>
        </div>
        ${warnRows("c", "Settings", "h3", ' data-for="sql"')}
        <h3 class="cx-h">Queries <span class="cx-h-note">Empty uses Global</span></h3>
        <div class="set-list">${setItem('<span data-for="no-redis">Row limit</span><span data-for="redis" hidden>Page size</span>', '<span data-for="sql">Added to a select that has no limit of its own</span><span data-for="mongo" hidden>Added to a find or aggregate that has no limit of its own</span><span data-for="redis" hidden>How many fields, items or members a key tab reads at a time</span>', '<span class="unit-field"><input id="c-limit" class="field" inputmode="numeric" placeholder="100"><span class="unit">rows</span></span>', "c-limit")}${setItem('<span data-for="no-redis">Statement timeout</span><span data-for="redis" hidden>Command timeout</span>', '<span data-for="no-redis">0 lets a statement run as long as it takes</span><span data-for="redis" hidden>ypacapy stops waiting; Redis has no way to stop a command it started</span>', '<span class="unit-field"><input id="c-timeout" class="field" inputmode="numeric" placeholder="30"><span class="unit">s</span></span>', "c-timeout")}${setItem("Connection heartbeat", '<span data-for="sql">Keeps idle connections open with select 1</span><span data-for="mongo" hidden>Keeps idle connections open with a ping command</span><span data-for="redis" hidden>Keeps idle connections open with PING</span>', choice("c-beat", [["app", "Use Global (off)"], ["on", "On"], ["off", "Off"]], "app"), "c-beat")}${setItem("Keep query history", "Off keeps this connection's runs out of History, e.g. for production", choice("c-hist", [["app", "Use Global (on)"], ["on", "On"], ["off", "Off"]], "app"), "c-hist")}
        </div>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-ssl" aria-labelledby="t-ssl" hidden>
        <div class="cx-grid" data-for="sql-server">
          ${lab("c-sslmode", "Mode")}<span class="cx-full">${csel("c-sslmode", [["disable", "Disable"], ["prefer", "Prefer"], ["require", "Require"], ["verify-ca", "Verify CA"], ["verify-full", "Verify full"]], "prefer")}</span>
          <span class="help cx-full cx-under">Verify CA and Verify full check the server's certificate.</span>
          ${lab("c-ca", "CA file")}<span class="with-btn cx-full"><input class="field mono" id="c-ca" placeholder="~/certs/ca.pem" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
        </div>
        <div class="cx-grid" data-for="mongo" hidden>
          ${lab("c-tls", "TLS")}<span class="cx-full">${csel("c-tls", [["off", "Off"], ["on", "On"], ["insecure", "On, without checking the certificate"]], "on")}</span>
          <span class="help cx-full cx-under">An SRV record turns TLS on. Atlas requires it.</span>
          ${lab("c-tlsca", "CA file")}<span class="with-btn cx-full"><input class="field mono" id="c-tlsca" placeholder="~/certs/ca.pem" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
          ${lab("c-tlscert", "Client certificate")}<span class="with-btn cx-full"><input class="field mono" id="c-tlscert" placeholder="~/certs/client.pem" autocomplete="off" spellcheck="false" aria-describedby="c-tlscert-h"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
          <span class="help cx-full cx-under" id="c-tlscert-h">For X.509 sign-in: one file with the certificate and its key. Leave the password empty.</span>
        </div>
        <div class="cx-grid" data-for="redis" hidden>
          ${lab("c-rtls", "TLS")}<span class="cx-full">${csel("c-rtls", [["off", "Off"], ["on", "On"], ["insecure", "On, without checking the certificate"]], "on")}</span>
          <span class="help cx-full cx-under">On uses rediss://. ElastiCache with encryption in transit requires it.</span>
          ${lab("c-rtlsca", "CA file")}<span class="with-btn cx-full"><input class="field mono" id="c-rtlsca" placeholder="~/certs/ca.pem" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
          ${lab("c-rtlscert", "Client certificate")}<span class="with-btn cx-full"><input class="field mono" id="c-rtlscert" placeholder="~/certs/client.pem" autocomplete="off" spellcheck="false" aria-describedby="c-rtlscert-h"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
          <span class="help cx-full cx-under" id="c-rtlscert-h">A file with the certificate and its key. Needed only when the server asks for one.</span>
        </div>
        <p class="cx-none" data-for="sqlite" hidden>SQLite opens a file on this Mac. There is no network to secure.</p>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-advanced" aria-labelledby="t-advanced" hidden>
        <div class="cx-grid">
          <span data-for="server" class="cx-sub">${lab("c-app", "Application name")}<input class="field mono cx-full" id="c-app" value="ypacapy" autocomplete="off" spellcheck="false">
          ${lab("c-ctimeout", "Connect timeout")}<span class="unit-field cx-full"><input class="field" id="c-ctimeout" inputmode="numeric" placeholder="15"><span class="unit">s</span></span></span>
          <span data-for="mongo" class="cx-sub" hidden>${lab("c-rs", "Replica set")}<input class="field mono cx-full" id="c-rs" placeholder="Read from the server" autocomplete="off" spellcheck="false">
          ${lab("c-readpref", "Read from")}<span class="cx-full">${csel("c-readpref", [["primary", "Primary"], ["primaryPreferred", "Primary, or a secondary if it is down"], ["secondary", "Secondary"], ["secondaryPreferred", "Secondary, or the primary if none is up"], ["nearest", "Nearest"]], "primary")}</span>
          <span class="help cx-full cx-under">A secondary keeps your reads off the primary. Writes always go to the primary.</span>
          <span class="cx-label">Direct connection</span><label class="check cx-full"><input id="c-direct" type="checkbox">Talk to this host only, not the rest of its replica set</label>
          ${lab("c-hb", "Server check")}<span class="unit-field cx-full"><input class="field" id="c-hb" inputmode="numeric" placeholder="60" aria-describedby="c-hb-h"><span class="unit">s</span></span>
          <span class="help cx-full cx-under" id="c-hb-h">While connected, the driver sends hello to each host at this interval to find the primary. It cannot be turned off.</span></span>
          <span data-for="redis" class="cx-sub" hidden>${lab("c-sep", "Key separator")}<input class="field mono cx-full" id="c-sep" value=":" autocomplete="off" spellcheck="false" aria-describedby="c-sep-h">
          <span class="help cx-full cx-under" id="c-sep-h">The tree groups keys into folders on it: user:3107 goes in user. Empty shows every key flat.</span>
          ${lab("c-scan", "Keys per scan")}<span class="unit-field cx-full"><input class="field" id="c-scan" inputmode="numeric" placeholder="1000" aria-describedby="c-scan-h"><span class="unit">keys</span></span>
          <span class="help cx-full cx-under" id="c-scan-h">The tree reads keys with SCAN, about this many per call, and only when you ask for more. It never sends KEYS.</span></span>
        </div>
        <p class="cx-none" data-for="sqlite" hidden>Nothing to set for an SQLite file.</p>
      </div>

      <p class="test-line" role="status" id="test-line" hidden></p>
      <footer class="cx-foot">
        <button type="submit" class="btn" value="test" id="c-test">Test connection</button>
        <button type="button" class="btn" data-href="./home.html">Cancel</button>
        <button type="submit" class="btn" value="save">Save</button>
        <button type="submit" class="btn btn--primary" value="connect">${ic("plug-zap")}Save &amp; Connect</button>
      </footer>
    </form>
  </div>
</div>${passDialogs()}`,
  script: js("page-connect.js"),
});

// In-app updates, ported from voidHTTP's UpdateChip: a chip in the title strip beside the gear, shown only while there is
// an update to act on (available, downloading, ready, failed install), with a popover under it for each step.
// The preview renders one anchor per step; the bar picks which one shows, and the chip toggles its popover.
const UPD_NOTES = ["Connection groups on Home", "Coloured connection tabs", "Fix: History no longer jumps after a run"];
const updAnchor = (st, chipCls, chipBody, pop) => `
      <div class="upd-anchor" data-upd="${st}" hidden>
        <button type="button" class="upd-chip${chipCls}" aria-haspopup="dialog" aria-expanded="false">${chipBody}</button>${pop ? `
        <div class="upd-pop" role="dialog" hidden>${pop}
        </div>` : ""}
      </div>`;
const updActions = (left, right) => `
          <div class="upd-actions">${left}${right}</div>`;
const UPD_CHIP = [
  updAnchor("available", "", `${ic("circle-arrow-down")}Update 0.0.2`, `
          <div class="upd-head"><p class="upd-title">ypacapy 0.0.2 is available</p><span class="upd-sub">You have 0.0.1 · released 20 Nov 2026</span></div>
          <ul class="upd-notes">${UPD_NOTES.map((l) => `<li>${l}</li>`).join("")}</ul>${updActions('<button type="button" class="btn btn--quiet" data-upd-close>Later</button>', '<button type="button" class="btn btn--primary" data-upd-go="downloading">Install update</button>')}`),
  updAnchor("downloading", "", `${ic("loader-circle", "upd-spin")}Downloading 42%`, `
          <div class="upd-head"><p class="upd-title">Downloading 0.0.2</p><span class="upd-sub">You can keep working while it downloads.</span></div>
          <div class="upd-bar" role="progressbar" aria-label="Download progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="42"><i style="width:42%"></i></div>
          <div class="upd-row"><span>4.1 of 9.8 MB</span><span>42%</span></div>`),
  updAnchor("installing", "", `${ic("loader-circle", "upd-spin")}Installing`, `
          <div class="upd-head"><p class="upd-title">Installing 0.0.2</p><span class="upd-sub">You can keep working while it installs.</span></div>
          <div class="upd-bar" role="progressbar" aria-label="Download progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i style="width:100%"></i></div>`),
  updAnchor("ready", " upd-chip--ready", `${ic("refresh-cw")}Restart to update`, `
          <div class="upd-head"><p class="upd-title">${ic("circle-check", "ok")}0.0.2 is installed</p><span class="upd-sub">Restart ypacapy to start using it.</span></div>${updActions('<button type="button" class="btn btn--quiet" data-upd-close>Later</button>', '<button type="button" class="btn btn--primary">Restart now</button>')}`),
  updAnchor("failed", " upd-chip--error", `${ic("triangle-alert")}Update failed`, `
          <div class="upd-head"><p class="upd-title">${ic("triangle-alert", "bad")}Couldn't install 0.0.2</p><span class="upd-sub">ypacapy 0.0.1 is unchanged.</span></div>
          <p class="upd-err">the signature of the downloaded update does not match the public key</p>${updActions(`<button type="button" class="upd-link" title="${REL}/latest">Download from GitHub${ic("external-link")}</button>`, '<button type="button" class="btn" data-upd-go="downloading">Try again</button>')}`),
].join("");
pages["updates.html"] = page({
  title: "ypacapy preview, updates",
  desc: "Design preview of ypacapy's in-app updates: the title-strip chip and its popover for each step, from voidHTTP.",
  barHtml: bar("updates", [["available-open", "Available"], ["available", "Available, closed"], ["downloading", "Downloading"], ["installing", "Installing"], ["ready", "Ready to restart"], ["failed", "Install failed"], ["none", "Up to date (no chip)"]]),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork, chip: UPD_CHIP }),
  script: js("page-updates.js"),
});

// About ypacapy, ported from voidHTTP's AboutModal (replaces the native macOS About panel, opened from the app menu).
// voidHTTP draws its update card as a request; ypacapy draws it as a query, since that is what ypacapy shows all day.
// Brand touches: the icon soaks in an onsen (water rings under it, steam above), "capy" picked out in the name, the palindrome in the foot.
const K = (t) => `<span class="q-k">${t}</span>`, TB = (t) => `<span class="q-tb">${t}</span>`, S = (t) => `<span class="q-s">'${t}'</span>`;
const SQL_CHECK = `${K("select")} * ${K("from")} ${TB("releases")} ${K("where")} version &gt; ${S("0.0.1")}`;
const SQL_INSTALL = `${K("insert into")} ${TB("app")} ${K("values")} (${S("0.0.2")})`;
const qline = (sql, status, prog) => `
            <div class="about-res-line"><code class="about-sql">${sql}</code>${status}${prog !== undefined ? `<i class="about-prog" style="--p:${prog}%"></i>` : ""}</div>`;
const qst = (cls, t) => `<span class="status${cls ? " " + cls : ""}">${t}</span>`;
const qwait = (t) => `<span class="status wait">${ic("loader-circle", "upd-spin")}${t}</span>`;
const updRowA = (text, ctl = "") => `
              <div class="about-upd-row"><p class="about-upd-text">${text}</p>${ctl}</div>`;
const checkAgain = (dis) => `<button type="button" class="btn"${dis ? " disabled" : ""}>${ic("refresh-cw")}Check again</button>`;
const ABOUT_NOTES = [...UPD_NOTES, "Settings &gt; Updates", "Fix: Row count estimate on views", "Fix: Touch ID prompt shown twice"];
const aboutCard = (st, line, body) => `
          <div class="about-res about-upd" data-about="${st}" aria-label="Updates" aria-live="polite" hidden>${line}
            <div class="about-upd-body">${body}
            </div>
          </div>`;
const ABOUT_CARDS = [
  aboutCard("checking", qline(SQL_CHECK, qwait("running")), updRowA('Asking GitHub what\'s new…<span class="sub">github.com/jimmyfish/ypacapy</span>', checkAgain(true))),
  aboutCard("current", qline(SQL_CHECK, qst("redir", "0 rows")), updRowA('You\'re on the latest. Back to soaking.<span class="sub">Checked just now</span>', checkAgain())),
  aboutCard("available", qline(SQL_CHECK, qst("", "1 row")), updRowA('<strong>ypacapy 0.0.2 is out</strong><span class="sub">You\'re on 0.0.1 · released 20 Nov 2026</span>') + `
              <div class="about-notes"><ul class="upd-notes">${ABOUT_NOTES.slice(0, 3).map((l) => `<li>${l}</li>`).join("")}</ul><ul class="upd-notes" data-more hidden>${ABOUT_NOTES.slice(3).map((l) => `<li>${l}</li>`).join("")}</ul><button type="button" class="upd-link about-notes-more" aria-expanded="false" data-more-btn>Show all ${ABOUT_NOTES.length} changes${ic("chevron-down")}</button></div>` +
    updRowA("", `<button type="button" class="upd-link" title="${REL}/tag/v0.0.2">Release notes${ic("external-link")}</button><button type="button" class="btn btn--primary" data-about-go="downloading">${ic("circle-arrow-down")}Install update</button>`).replace('<p class="about-upd-text"></p>', "")),
  aboutCard("downloading", qline(SQL_INSTALL, qst("busy", "42%"), 42), updRowA('Downloading 0.0.2 · 42%<span class="sub">4.1 of 9.8 MB · go on, keep working</span>')),
  aboutCard("installing", qline(SQL_INSTALL, qwait("verifying"), 100), updRowA('Installing 0.0.2…<span class="sub">Downloaded, signature checks out</span>')),
  aboutCard("ready", qline(SQL_INSTALL, qst("busy", "awaiting commit")), updRowA('<strong>0.0.2 is in</strong><span class="sub">Restart ypacapy to commit it.</span>', `<button type="button" class="btn btn--primary">${ic("refresh-cw")}Restart now</button>`)),
  aboutCard("failed", qline(SQL_INSTALL, qst("fail", "rolled back")), `
              <p class="upd-err">the signature of the downloaded update does not match the public key</p>` +
    updRowA('Nothing changed. You\'re still on 0.0.1.', `<button type="button" class="upd-link" title="${REL}/latest">Download from GitHub${ic("external-link")}</button><button type="button" class="btn" data-about-go="downloading">Try again</button>`)),
  // a dev build: where it comes from, as a one-row result, in place of the update card
  `
          <div class="about-res" data-about="dev" aria-label="Build" hidden>${qline(`${K("select")} * ${K("from")} ${TB("build")}`, qst("", "1 row"))}
            <dl><dt>channel</dt><dd>dev</dd><dt>version</dt><dd>v0.0.1-4-g1a19d06+<span class="muted"> · 4 commits after v0.0.1</span></dd><dt>branch</dt><dd>v0.0.1</dd><dt>commit</dt><dd>1a19d06<span class="muted"> + uncommitted changes</span></dd><dt>started</dt><dd>17 Nov 2026, 19:40</dd><dt>updates</dt><dd class="warn">off in dev builds</dd></dl>
          </div>`,
].join("");
pages["about.html"] = page({
  title: "ypacapy preview, about",
  desc: "Design preview of About ypacapy: the capybara icon in its onsen, the copyable version, and updates drawn as a query.",
  barHtml: bar("about", [["current", "Up to date"], ["checking", "Checking"], ["available", "Update available"], ["downloading", "Downloading"], ["installing", "Installing"], ["ready", "Ready to restart"], ["failed", "Install failed"], ["dev", "Dev build"]]),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork, overlay: `
<div class="backdrop" data-close="./index.html">
  <div class="about" role="dialog" aria-modal="true" aria-labelledby="about-name">
    <button type="button" class="icon-btn about-close" aria-label="Close" data-href="./index.html">${ic("x")}</button>
    <header class="about-hero">
      <div class="about-onsen ping" aria-hidden="true">
        <span class="steam"><b></b><b></b><b></b></span>
        <i></i><i></i><i></i>
        <img src="../../public/app-icon.png" alt="">
      </div>
      <h2 class="about-name" id="about-name" title="Try reading it backwards">ypa<span>capy</span></h2>
      <p class="about-tag">A hot spring for your databases.</p>
      <div class="about-verline"><span class="build-tag" data-about-dev hidden>dev</span><button type="button" class="about-ver" title="Copy version"><span data-ver>v0.0.1</span>${ic("copy")}</button></div>
    </header>
    <div class="about-body">${ABOUT_CARDS}
      <nav class="about-links" aria-label="Links">
        <button type="button" class="btn btn--quiet" title="https://github.com/jimmyfish/ypacapy">${ic("github")}GitHub</button>
        <button type="button" class="btn btn--quiet" title="https://github.com/jimmyfish/ypacapy/issues/new">${ic("circle-dot")}Report an issue</button>
      </nav>
      <p class="about-foot">ypacapy is a capy and its reflection in the onsen. Same both ways, calm both ways.</p>
    </div>
  </div>
</div>` }),
  script: js("page-about.js"),
});

// ---------- MongoDB: the query console and a collection tab ----------
// A MongoDB connection uses the same shell: title strip, rail, schema tree, tabs, editor over results. What changes:
// the tree is databases > collections and views; the editor takes mongosh syntax (db.<collection>.<method>(...));
// results are documents, shown as a table of their top-level fields or as the documents themselves (JSON).
// Nothing heavy runs on its own: counts are estimatedDocumentCount (collection metadata, no scan), a collection opens
// with find(filter).limit(20) and no sort, Fields come from the documents on screen (no $sample), Indexes and
// Validation are catalog reads (listIndexes, listCollections).
const MCONN = "events_prod";
const MCONNS = [CONNS[0], [MCONN, "server", 2, "mongo"]];
// BSON values in the sample: { $oid }, { $date }, { $dec } wrap their types; undefined is a missing field
const OID = (i) => ({ $oid: (0x6553a1f2 + i * 977).toString(16) + "c9e77b0012ab" + (0x0f1e + i * 37).toString(16).padStart(4, "0") });
const DATE = (s) => ({ $date: s });
const DEC = (n) => ({ $dec: n });
const bsonType = (v) => (v === null ? "null" : v?.$oid ? "objectId" : v?.$date ? "date" : v?.$dec !== undefined ? "decimal128" : Array.isArray(v) ? "array" : typeof v === "object" ? "object"
  : typeof v === "number" ? (Number.isInteger(v) ? "int32" : "double") : typeof v === "boolean" ? "bool" : "string");
const isoOf = (d) => d.replace(" ", "T").replace(/Z$/, ".000Z");
// mongosh's way of printing a value, coloured with the JSON tokens; inline (one line) for cells, pretty for the JSON view
const shellVal = (v, pad = "", pretty = false) => {
  if (v === null) return '<span class="j-null">null</span>';
  if (v.$oid) return `<span class="q-f">ObjectId</span><span class="j-p">(</span><span class="j-str">'${v.$oid}'</span><span class="j-p">)</span>`;
  if (v.$date) return `<span class="q-f">ISODate</span><span class="j-p">(</span><span class="j-str">'${isoOf(v.$date)}'</span><span class="j-p">)</span>`;
  if (v.$dec !== undefined) return `<span class="q-f">Decimal128</span><span class="j-p">(</span><span class="j-str">'${v.$dec}'</span><span class="j-p">)</span>`;
  if (typeof v === "string") return `<span class="j-str">'${esc(v)}'</span>`;
  if (typeof v === "number") return `<span class="j-num">${v}</span>`;
  if (typeof v === "boolean") return `<span class="j-bool">${v}</span>`;
  const inner = pad + "  ";
  if (Array.isArray(v)) {
    if (!v.length) return '<span class="j-p">[]</span>';
    return pretty && v.some((x) => x && typeof x === "object" && !x.$oid && !x.$date && x.$dec === undefined)
      ? `<span class="j-p">[</span>\n${v.map((x) => inner + shellVal(x, inner, true)).join('<span class="j-p">,</span>\n')}\n${pad}<span class="j-p">]</span>`
      : `<span class="j-p">[ </span>${v.map((x) => shellVal(x, pad)).join('<span class="j-p">, </span>')}<span class="j-p"> ]</span>`;
  }
  const ents = Object.entries(v).filter(([, x]) => x !== undefined);
  return pretty
    ? `<span class="j-p">{</span>\n${ents.map(([k, x]) => `${inner}<span class="j-key">${k}</span><span class="j-p">: </span>${shellVal(x, inner, true)}`).join('<span class="j-p">,</span>\n')}\n${pad}<span class="j-p">}</span>`
    : `<span class="j-p">{ </span>${ents.map(([k, x]) => `<span class="j-key">${k}</span><span class="j-p">: </span>${shellVal(x, pad)}`).join('<span class="j-p">, </span>')}<span class="j-p"> }</span>`;
};
const plain = (h) => h.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
// a cell by BSON type. A missing field is not null: the cell is hatched and the inspector says the field is absent.
const mcell = (v) => {
  if (v === undefined) return '<td class="missing"><span class="visually-hidden">missing</span></td>';
  const t = bsonType(v);
  if (t === "null") return NULLC();
  if (t === "objectId") return `<td class="oid" data-full="ObjectId('${v.$oid}')">${v.$oid}</td>`;
  if (t === "date") return c.ts(v.$date);
  if (t === "decimal128") return c.num(v.$dec, true);
  if (t === "int32" || t === "double") return c.num(v);
  if (t === "bool") return c.bool(v);
  if (t === "string") return c.text(v);
  const n = t === "array" ? `<span class="arr-n">${v.length}</span>` : "";
  return `<td class="json${t === "array" ? " arr" : ""}" data-full="${esc(plain(shellVal(v, "", true)))}">${n}${shellVal(v)}</td>`;
};
// columns: the top-level fields of the documents returned, in first-seen order. The type line says what was seen,
// and how many documents have the field when not all do. Nothing is read to find them.
const mcols = (docs) => {
  const keys = []; docs.forEach((d) => Object.keys(d).forEach((k) => { if (d[k] !== undefined && !keys.includes(k)) keys.push(k); }));
  return keys.map((k) => {
    const seen = docs.filter((d) => d[k] !== undefined), types = [...new Set(seen.map((d) => bsonType(d[k])).filter((t) => t !== "null"))];
    const nulls = seen.some((d) => d[k] === null);
    return { k, type: `${types.join(" · ") || "null"}${nulls && types.length ? " · null" : ""}${seen.length < docs.length ? ` · ${seen.length} of ${docs.length}` : ""}`, num: types.every((t) => /^(int32|double|decimal128)$/.test(t)) };
  });
};
const mgrid = (id, label, docs, sel = 0) => {
  const cols = mcols(docs);
  return `
            <div class="grid-wrap" tabindex="0" aria-label="${label}">
              <table class="grid"><thead><tr>${ROWHEAD}${cols.map((x) => th(x.k, x.type, { num: x.num, key: x.k === "_id" ? "Primary key" : "" })).join("")}</tr></thead><tbody>
${docs.map((d, i) => tr(i + 1, cols.map((x) => mcell(d[x.k])), i === sel)).join("\n")}
              </tbody></table>
            </div>${inspector(cols[0].k, cols[0].type, sel + 1, plain(shellVal(docs[sel][cols[0].k])))}`;
};
// the JSON view: each document as mongosh prints it, one after another
const mdocs = (label, docs) => `
            <pre class="code docs" tabindex="0" aria-label="${label}">${docs.map((d, i) => shellVal(d, "", true).split("\n").map((l, j) => `<span class="l${j === 0 && i ? " doc-start" : ""}">${l}</span>`).join("")).join("")}</pre>`;
// The JSON view, as Compass shows it: a card per document, a line per field. Objects and arrays fold (closed at first);
// a closed one says what it is and how big, with a faint peek at what is inside. On a collection tab a card is
// editable: the pencil or a double-click on a value opens it, values and names are edited in place, a field can be
// added or removed, and Update sends one updateOne on its _id with only what changed. Delete flags the card and sends
// deleteOne. Duplicate puts an editable copy under the card, without its _id (the server makes a new one), and Insert
// sends it as one insertOne. Both go through the write guard, as any write does. _id never changes. Query results are read-only.
const BTYPE = { objectId: "ObjectId", date: "Date", decimal128: "Decimal128", int32: "Int32", double: "Double", bool: "Boolean", string: "String", null: "Null", object: "Object", array: "Array" };
const jvLeaf = (v, t) => {
  const ed = (x, cls = "") => `<span class="jv-ed${cls}">${esc(x)}</span>`;
  const fn = (name, x) => `<span class="q-f">${name}</span><span class="j-p">(</span><span class="j-str">'${ed(x)}'</span><span class="j-p">)</span>`;
  if (t === "null") return '<span class="j-null jv-ed">null</span>';
  if (t === "objectId") return fn("ObjectId", v.$oid);
  if (t === "date") return fn("ISODate", isoOf(v.$date));
  if (t === "decimal128") return fn("Decimal128", String(v.$dec));
  if (t === "int32" || t === "double") return ed(v, " j-num");
  if (t === "bool") return ed(v, " j-bool");
  if (t === "string") return `<span class="j-str">'${ed(v)}'</span>`;
  return `<span class="j-p">${t === "array" ? "[]" : "{}"}</span>`;
};
// a closed object: Object, its field names; a closed array: Array (n), its first values
const jvPeek = (v, t) => t === "array"
  ? `<span class="jv-kind">Array (${v.length})</span><span class="jv-peek">${v.map((x) => (x && typeof x === "object" && !x.$oid && !x.$date && x.$dec === undefined ? `{ ${Object.keys(x).join(", ")} }` : plain(shellVal(x)))).map(esc).join(", ")}</span>`
  : `<span class="jv-kind">Object</span><span class="jv-peek">${esc(Object.keys(v).filter((k) => v[k] !== undefined).join(", "))}</span>`;
const jvTypes = (t) => `<select class="jv-type" aria-label="Type">${Object.values(BTYPE).map((x) => `<option${x === BTYPE[t] ? " selected" : ""}>${x}</option>`).join("")}</select>`;
const jvNode = (k, v, depth, idx, ro) => {
  const t = bsonType(v), fold = (t === "object" && Object.values(v).some((x) => x !== undefined)) || (t === "array" && v.length > 0);
  const kids = !fold ? "" : t === "array" ? v.map((x, i) => jvNode(i, x, depth + 1, true, ro)).join("") : Object.entries(v).filter(([, x]) => x !== undefined).map(([kk, x]) => jvNode(kk, x, depth + 1, false, ro)).join("");
  const lock = ro || k === "_id";
  const tools = ro ? "" : `<span class="jv-tools">${lock ? `<span class="jv-lock" title="_id can't change">${ic("lock")}_id is fixed</span>` : `${jvTypes(t)}<button type="button" class="icon-btn jv-undo" title="Undo this change" aria-label="Undo this change">${ic("undo-2")}</button><button type="button" class="icon-btn jv-rm" title="Remove this field" aria-label="Remove ${esc(k)}">${ic("shredder")}</button>`}</span>`;
  return `<div class="jv-node"><div class="jv-row${lock ? " jv-ro" : ""}" style="--d:${depth}" data-t="${t}">${fold ? `<button type="button" class="jv-caret" aria-expanded="false" aria-label="Show ${esc(k)}">${ic("chevron-right")}</button>` : '<span class="jv-caret-sp"></span>'}<span class="jv-k${idx ? " jv-idx" : ""}">${esc(k)}</span><span class="j-p">:</span><span class="jv-v">${fold ? jvPeek(v, t) : jvLeaf(v, t)}</span>${tools}</div>${fold ? `<div class="jv-kids"><div class="jv-kids-in">${kids}</div></div>` : ""}</div>`;
};
const jvDoc = (d, i, edit) => `
              <article class="jv-doc" aria-label="Document ${i + 1}" data-id="${d._id?.$oid ?? esc(d._id)}" data-copy="${esc(plain(shellVal(d, "", true)))}">
                <div class="jv-acts" role="toolbar" aria-label="Document ${i + 1}">
                  <button type="button" class="icon-btn" data-jv="fold" title="Expand all" aria-label="Expand all">${ic("chevrons-up-down")}</button>${edit ? `
                  <button type="button" class="icon-btn" data-jv="edit" title="Edit document" aria-label="Edit document">${ic("pencil")}</button>
                  <button type="button" class="icon-btn" data-jv="dup" title="Duplicate document" aria-label="Duplicate document">${ic("copy-plus")}</button>` : ""}
                  <button type="button" class="icon-btn" data-jv="copy" title="Copy document" aria-label="Copy document">${ic("copy")}</button>${edit ? `
                  <button type="button" class="icon-btn jv-danger" data-jv="del" title="Delete document" aria-label="Delete document">${ic("shredder")}</button>` : ""}
                </div>
                <div class="jv-body">${Object.entries(d).filter(([, v]) => v !== undefined).map(([k, v]) => jvNode(k, v, 0, false, !edit)).join("")}</div>${edit ? `
                <button type="button" class="btn btn--quiet jv-add">${ic("circle-plus")}Add field</button>
                <div class="jv-foot">
                  <span class="jv-msg" aria-live="polite"></span>
                  <button type="button" class="btn btn--quiet jv-example" data-jv="example" data-mode-only="new" title="Fill in the fields this page shows (its Fields tab), each with an empty value of its type. Nothing is read.">${ic("wand-sparkles")}Example from fields</button>
                  <button type="button" class="btn" data-jv="cancel">Cancel</button>
                  <button type="button" class="btn btn--primary" data-jv="update" data-mode-only="edit">Update</button>
                  <button type="button" class="btn btn--danger" data-jv="delete" data-mode-only="del">${ic("shredder")}Delete</button>
                  <button type="button" class="btn btn--primary" data-jv="insert" data-mode-only="new">Insert</button>
                </div>` : ""}
              </article>`;
const jdocs = (label, docs, edit = false) => `
            <div class="jv-list" tabindex="0" aria-label="${label}"${edit ? ` data-edit data-fields="${esc(JSON.stringify(MFIELDS))}"` : ""}>${docs.map((d, i) => jvDoc(d, i, edit)).join("")}
            </div>`;

// sample: orders, as a collection holds them. Old orders carry a legacy_id from the SQL days (an int, a few a string);
// shipped_at is missing until an order ships and null on a refund that was shipped first; meta is null or missing too.
const MDOCS = Array.from({ length: 20 }, (_, i) => {
  const st = ST[i % 10], [email, name] = PEOPLE[i % 12], day = 1 + Math.floor(i * 0.7), h = (2 + i * 7) % 24, m = (11 + i * 13) % 60;
  const total = [4820, 129.9, 642.75, 88, 1499, 35.5, 210, 979, 64.2, 312.4][i % 10];
  return {
    _id: OID(i),
    legacy_id: i >= 16 ? undefined : i % 7 === 3 ? `L-${10463 + i}` : 10463 + i,
    customer: { email, name },
    status: st,
    total: DEC(total),
    currency: i % 4 === 3 ? "SGD" : "USD",
    items: [{ sku: ["TEE-M-BLK", "MUG-12", "CAP-OS", "SOCK-3P"][i % 4], qty: 1 + (i % 3) }, ...(i % 3 === 0 ? [{ sku: "GIFT-WRAP", qty: 1 }] : [])],
    tags: i % 3 === 0 ? ["gift"] : i % 3 === 1 ? [] : ["fall10", "app"],
    created_at: DATE(`2026-11-${p2(day)} ${p2(h)}:${p2(m)}:${p2((7 + i * 29) % 60)}Z`),
    shipped_at: st === "shipped" ? DATE(`2026-11-${p2(Math.min(day + 1, 16))} ${p2((h + 5) % 24)}:${p2((m + 17) % 60)}:00Z`) : i === 7 ? null : undefined,
    meta: i % 5 === 2 ? null : i % 5 === 4 ? undefined : META[i % 5],
  };
});
// Query 2's find: paid or shipped, 100 or more, items left out by the projection
const Q2DOCS = MDOCS.filter((d) => /paid|shipped/.test(d.status) && d.total.$dec >= 100).map(({ items, ...d }) => d);
// Query 1's aggregate: one document per customer
const QADOCS = Q1_DATA.slice(0, 9).map(([email, , n, sum, ts]) => ({ _id: email, refunds: n, refunded: DEC(sum), last_refund: DATE(ts.replace(/\+07$/, "Z")) }));

// mongosh in the editor, coloured: comments, strings, $operators, db.<collection>.<method>(, numbers
const hlMongo = (line) => {
  const ind = line.match(/^ */)[0], body = line.slice(ind.length);
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\$[A-Za-z]+)|\b(db)\.(\w+)\.(\w+)(?=\()|\.(\w+)(?=\()|\b(ISODate|ObjectId|NumberDecimal|Decimal128)\b|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  let out = "", at = 0;
  for (const m of body.matchAll(re)) {
    out += esc(body.slice(at, m.index)); at = m.index + m[0].length;
    out += m[1] ? `<span class="q-c">${esc(m[1])}</span>` : m[2] ? `<span class="q-s">${esc(m[2])}</span>` : m[3] ? `<span class="q-k">${m[3]}</span>`
      : m[4] ? `<span class="q-t">db</span>.<span class="q-tb">${m[5]}</span>.<span class="q-f">${m[6]}</span>` : m[7] ? `.<span class="q-f">${m[7]}</span>`
      : m[8] ? `<span class="q-f">${m[8]}</span>` : m[9] ? `<span class="q-k">${m[9]}</span>` : `<span class="q-n">${m[10]}</span>`;
  }
  return (ind ? `<span class="ind">${ind}</span>` : "") + out + esc(body.slice(at));
};
const mq = (id, n, src, cur = -1, hidden = true) => {
  const lines = src.split("\n");
  return `<pre class="code" id="code-${id}" tabindex="0" aria-label="Query editor, Query ${n}"${hidden ? " hidden" : ""}>${lines.map((l, i) => `<span class="l${i === (cur < 0 ? lines.length - 1 : cur) ? " cur" : ""}">${hlMongo(l)}</span>`).join("")}</pre>`;
};
const MQ1 = `// Refunds in the last 30 days, by customer
db.orders.aggregate([
  { $match: { status: "refunded", created_at: { $gt: ISODate("2026-10-19") } } },
  { $group: {
      _id: "$customer.email",
      refunds: { $sum: 1 },
      refunded: { $sum: "$total" },
      last_refund: { $max: "$created_at" } } },
  { $sort: { refunded: -1 } }
])`;
const MQ2 = `db.orders.find(
  { status: { $in: ["paid", "shipped"] }, total: { $gte: 100 } },
  { items: 0 }
).limit(50)`;
const MQ3 = `db.orders.find({ status: { $inn: ["paid", "shipped"] } })`;
const MQ4 = `// Abandoned carts older than August
db.carts.deleteMany({ updated_at: { $lt: ISODate("2026-08-01") } })`;
const MQ5 = `// Rebuild daily revenue into its own collection
db.orders.aggregate([
  { $match: { status: { $in: ["paid", "shipped"] } } },
  { $group: { _id: { $dateTrunc: { date: "$created_at", unit: "day" } }, revenue: { $sum: "$total" } } },
  { $merge: { into: "daily_revenue", whenMatched: "replace" } }
])`;

// the tree: databases load on expand; events is open, analytics not loaded yet, the system databases folded away
const MCOLLS = [["orders", "48k"], ["customers", "3.2k"], ["carts", "910"], ["sessions", "1.2M"], ["audit_log", "6.4M"], ["products", "640"]];
const mongoSide = (current) => `
    <aside class="sidebar" data-side="schema">
      <div class="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide"></div>
      <div class="side-head"><h2>Databases</h2></div>
      <div class="side-tools">
        <div class="search">${ic("search")}<input class="field" id="tree-filter" placeholder="Filter collections" aria-label="Filter collections and views" autocomplete="off" spellcheck="false"></div>
        <button type="button" class="icon-btn icon-btn--outline" title="Refresh databases" aria-label="Refresh databases">${ic("refresh-cw")}</button>
      </div>
      <div class="tree" id="tree">
${group("events", "events", 7, 0, true, false)}
${group("events/collections", "Collections", MCOLLS.length, 16, true)}
${MCOLLS.map(([n, e]) => item(`events/collections/${n}`, "braces", n, e, current === n, n === "orders" ? "./collection.html" : "")).join("\n")}
${group("events/views", "Views", 1, 16, true)}
${item("events/views/paid_orders", "eye", "paid_orders")}
${group("analytics", "analytics", "…", 0, false, false)}
${group("system", "System databases", 3, 0, false)}
${["admin", "config", "local"].map((n) => item(`system/${n}`, "database", n).replace('class="row"', 'class="row" hidden').replace("--indent:40px", "--indent:24px")).join("\n")}
        <div class="empty" id="tree-empty" hidden><strong>Nothing matches <span id="tree-empty-q"></span></strong><span>Searches collection and view names in the databases loaded so far.</span><button type="button" class="link" id="tree-clear">Clear the filter</button></div>
        <div class="menu row-menu" id="row-menu" role="menu" aria-label="Collection actions" hidden>
          <button type="button" role="menuitem">${ic("braces")}Open documents</button>
          <button type="button" role="menuitem">${ic("square-code")}New query on this collection</button>
          <button type="button" role="menuitem">${ic("copy")}Copy name</button>
          <button type="button" role="menuitem" data-info>${ic("info")}Info</button>
          <hr>
          <button type="button" role="menuitem" class="danger">Drop collection</button>
        </div>
      </div>
    </aside>`.replace(/Estimate from table statistics/g, "Estimated from collection metadata");
const mhrow = (src, time, status, cls) => `        <div class="row"><button type="button" class="row-main" title="${MCONN} / events&#10;${esc(src)}"><span class="name hq">${esc(src)}</span><span class="htime">${time}</span><span class="hstatus ${cls}">${status}</span></button></div>`;
const mongoHistory = `
    <aside class="sidebar" data-side="history" hidden>
      <div class="side-head"><h2>History</h2><button type="button" class="btn btn--quiet" id="hist-clear">Clear</button></div>
      <div class="side-tools"><div class="search">${ic("search")}<input class="field" placeholder="Search ${MCONN} history" aria-label="Search ${MCONN} history" autocomplete="off" spellcheck="false"></div></div>
      <div class="tree" id="hist-list">
        <div class="day">Today</div>
${mhrow('db.orders.aggregate([{ $match: { status: "refunded" } }, { $group: { _id: "$customer.email" } }])', "09:58", "9", "rows")}
${mhrow('db.orders.find({ status: { $inn: ["paid", "shipped"] } })', "09:51", "error", "fail")}
${mhrow('db.orders.find({ "customer.email": "mei.tanaka@example.org" })', "09:40", "4", "rows")}
        <div class="day">Yesterday</div>
${mhrow('db.sessions.deleteMany({ expires_at: { $lt: ISODate("2026-11-01") } })', "17:20", "1,204", "rows")}
${mhrow("db.currentOp({ active: true })", "16:02", "1", "rows")}
      </div>
    </aside>`;

// Info, from a collection's "…" menu: one $collStats read (storage stats are metadata, nothing is scanned) when the
// dialog opens, and again on Refresh. Never read before that, never on a timer.
const INFO_IDX = [["_id_", "1.6 MB"], ["customer.email_1", "1.4 MB"], ["status_1_created_at_-1", "1.2 MB"], ["shipped_at_1", "412 KB"], ["legacy_id_1", "296 KB"]];
const infoRow = (k, v, note = "") => `<dt>${k}</dt><dd>${v}${note ? `<span class="info-note">${note}</span>` : ""}</dd>`;
const mInfoDlg = `
<div class="backdrop" id="info-dlg" hidden>
  <div class="dialog info-dlg" role="dialog" aria-modal="true" aria-labelledby="info-title">
    <h2 id="info-title"><span class="info-db">events.</span><span id="info-name">orders</span></h2>
    <div class="info-body" data-info-state="ready">
      <h3 class="cx-h">Documents</h3>
      <dl class="info-grid">${infoRow("Count", "~48,213", "Kept by the server, not counted")}${infoRow("Average size", "712 B")}${infoRow("Data size", "33.1 MB", "Uncompressed")}${infoRow("On disk", "12.4 MB", "Compressed, zstd")}</dl>
      <h3 class="cx-h">Indexes <span class="cx-h-note">${INFO_IDX.length}, 4.9 MB in all</span></h3>
      <dl class="info-grid info-idx">${INFO_IDX.map(([n, v]) => `<dt class="mono">${n}</dt><dd>${v}</dd>`).join("")}</dl>
      <h3 class="cx-h">Collection</h3>
      <dl class="info-grid">${infoRow("Type", "Standard")}${infoRow("Validator", "$jsonSchema", "moderate, warn")}</dl>
    </div>
    <div class="info-body" data-info-state="loading" hidden><div class="empty"><span class="spinner"></span><span>Reading stats for <span data-info-name>orders</span></span></div></div>
    <footer>
      <span class="help info-when">Read with $collStats at 10:02</span>
      <button type="button" class="btn" id="info-refresh">${ic("refresh-cw")}Refresh</button>
      <button type="button" class="btn btn--primary" data-info-close>Close</button>
    </footer>
  </div>
</div>`;
const MTABS = [["orders", "braces", "orders", "./collection.html"], ["q1", "square-code", "Query 1", "./mongo.html"], ["q2", "square-code", "Query 2", "./mongo.html?show=find"], ["q3", "square-code", "Query 3", "./mongo.html?show=error"], ["q4", "square-code", "Query 4", "./mongo.html?show=guard-confirm"], ["q5", "square-code", "Query 5", "./mongo.html?show=guard-merge"]];
const mtabs = (active, local) => tabsbar(active, local, { tabs: MTABS, pinned: ["orders"], conn: MCONN });
const MFORMATS = ["mongosh", "Extended JSON", "CSV", "Markdown table"];
// Table or JSON: the same documents, as a grid of top-level fields or as mongosh prints them
// JSON first and pressed: a MongoDB result is documents. The switch leads the toolbar, on the left.
const asSeg = `<span class="seg seg--lead" role="group" aria-label="Show documents as"><button type="button" aria-pressed="true" data-as="json">${ic("braces")}JSON</button><button type="button" aria-pressed="false" data-as="table">${ic("table-2")}Table</button></span>`;
const mresActions = (id) => resActions(id).replace(/<p class="menu-note">(Copy|Export) as<\/p>.*?<\/div>/g, (m, k) => `<p class="menu-note">${k} as</p>${MFORMATS.map((x) => `<button type="button" role="menuitem">${x}</button>`).join("")}</div>`);
const mguardDialogs = guardDialogs.replace(/shop_prod/g, MCONN).replace(/<div class="guard-kinds"><code class="stmt">DELETE<\/code><\/div>/g, '<div class="guard-kinds" data-kinds><code class="stmt">deleteMany</code></div>');
// the collection's guard: the kind, then the exact command ypacapy will send
// the passphrase ask names its kind by id; it gets the same slot, so Low and Strict show the same command
const cguardDialogs = mguardDialogs
  .replace('<div class="guard-kinds"><code class="stmt" id="guard-pass-kind">DELETE</code></div>', '<div class="guard-kinds" data-kinds><code class="stmt" id="guard-pass-kind">deleteOne</code></div>')
  .replace(/(<div class="guard-kinds" data-kinds>.*?<\/div>)/g, '$1<pre class="db-says guard-cmd" data-cmd></pre>');
const mongoWork = `${mtabs("q1", ["q1", "q2", "q3", "q4", "q5"])}
      <div class="work-body">
        <div class="req-pane" id="req-pane">
          <div class="request-line">
            <div class="url-field"><div class="ctx"><span class="e e-mongo">MDB</span><strong>${MCONN}</strong><span class="sep">/</span>${sel("Database", ["events", "analytics"])}</div></div>
            <button type="button" class="btn btn--save" id="save" title="Save  ⌘S">${ic("circle-check", "save-ico")}<span class="save-label">Save</span></button>${runGroup}
          </div>
          <div class="req-title"><button type="button" class="name" id="q-name">Refunds by customer</button><span class="path" id="q-path">Saved queries / Reports</span></div>
          <div class="section">
            <div class="editor">
              <div class="editor-bar"><button type="button" class="btn btn--quiet">${ic("wand-sparkles")}Format</button></div>
${mq("q1", 1, MQ1, -1, false)}
${mq("q2", 2, MQ2)}
${mq("q3", 3, MQ3, 0)}
${mq("q4", 4, MQ4)}
${mq("q5", 5, MQ5)}
            </div>
          </div>
        </div>
        <div class="divider" role="separator" aria-orientation="horizontal" aria-label="Resize panes" tabindex="0"></div>
        <section class="response" aria-label="Results">
          <nav class="subtabs" aria-label="Results">
            <button type="button" class="subtab" data-sub="results" aria-pressed="true">Results<span class="n" id="r-n">9</span></button>
            <button type="button" class="subtab" data-sub="messages" aria-pressed="false">Messages</button>
            <span class="push meta" id="r-meta"></span>
          </nav>
          <div class="res-tools">${asSeg}${mresActions("q")}</div>
          <div class="state" data-when="full" data-for="q1" data-as="table" hidden>${mgrid("q1", "Results of Query 1", QADOCS, 2)}
          </div>
          <div class="state" data-when="full" data-for="q1" data-as="json">${jdocs("Documents of Query 1", QADOCS)}
          </div>
          <div class="state" data-when="full" data-for="q2" data-as="table" hidden>${mgrid("q2", "Results of Query 2", Q2DOCS, 0)}
          </div>
          <div class="state" data-when="full" data-for="q2" data-as="json" hidden>${jdocs("Documents of Query 2", Q2DOCS)}
          </div>
          <div class="state" data-when="full" data-for="q3" data-as="table" hidden>${mgrid("q3", "Results of Query 3", MDOCS.filter((d) => /paid|shipped/.test(d.status)), 0)}
          </div>
          <div class="state" data-when="full" data-for="q3" data-as="json" hidden>${jdocs("Documents of Query 3", MDOCS.filter((d) => /paid|shipped/.test(d.status)))}
          </div>
          <div class="state" data-when="idle" data-for="q4" hidden><div class="empty"><strong>Not run yet</strong><span>deleteMany changes data on ${MCONN}, so Run asks first.</span></div></div>
          <div class="state" data-when="idle" data-for="q5" hidden><div class="empty"><strong>Not run yet</strong><span>It ends in $merge, so it writes to daily_revenue. Run asks first.</span></div></div>
          <div class="state" data-when="written" hidden><div class="empty write-res">${ic("circle-check", "ok-ico")}<strong id="w-title">Deleted 312 documents from carts</strong><pre class="db-says" id="w-raw">{ acknowledged: true, deletedCount: 312 }</pre></div></div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Running on ${MCONN}</strong><span>Started 0.4&nbsp;s ago</span><button type="button" class="btn" id="cancel">Cancel</button></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>The query returned no documents</strong></div></div>
          <div class="state" data-when="error" hidden><div class="error-box">
            <strong>MongoDB does not know the operator $inn</strong>
            <span class="hint-line">The server rejected the filter before reading anything. $in matches any value in a list.</span>
<pre class="db-says"><span class="bad">MongoServerError[BadValue]: unknown operator: $inn</span>
code: 2, codeName: 'BadValue'</pre>
            <div class="actions"><button type="button" class="btn" id="q3-fix">Use $in and run</button></div>
          </div></div>
          <div class="state" data-when="lost" hidden><div class="error-box">
            <strong>No primary answered for ${MCONN}</strong>
            <span class="msg">Server selection timed out after 30000 ms</span>
            <span class="hint-line">None of the 3 hosts in atlas-x1y2z-shard-0 answered as primary. The replica set may be electing one. Nothing was changed.</span>
            <div class="actions"><button type="button" class="btn" id="reconnect">Reconnect</button></div>
          </div></div>
          <div class="state" data-when="messages" hidden><pre class="code messages" aria-label="Messages"><span class="l">9 documents in 41 ms, from ${MCONN} (MongoDB 7.0.14, primary atlas-x1y2z-shard-00-01)</span><span class="l">The pipeline had no $limit, so ypacapy added { $limit: 500 } at its end.</span></pre></div>
        </section>
      </div>`;
pages["mongo.html"] = page({
  title: "ypacapy preview, MongoDB",
  desc: "Design preview of a MongoDB connection in ypacapy: mongosh queries, documents as a table or as JSON, and the write guard on MongoDB's write methods.",
  barHtml: bar("mongo", [["results", "Aggregate"], ["find", "Find, nested fields"], ["table", "Table view"], ["messages", "Messages"], ["running", "Running"], ["empty", "No documents"], ["error", "Server error"], ["lost", "No primary"], ["guard-confirm", "Low: deleteMany"], ["guard-merge", "Low: $merge"], ["guard-pass", "Strict: passphrase"], ["written", "Write result"], ["row-menu", "Sidebar menu"], ["info", "Info"], ["info-loading", "Info, reading"], ["history", "History"]]),
  body: app({ current: MCONN, conns: MCONNS, side: mongoSide("") + mongoHistory + savedSide, work: mongoWork, overlay: mguardDialogs + mInfoDlg }),
  script: js("page-mongo.js") + js("page-jv.js") + js("page-mongo-info.js"),
});

// Collection tab: documents under the query bar, the fields seen on this page, indexes. Sizes and the validator are in Info.
const MFIELDS = (() => {
  // dotted paths of the documents on this page, nested objects and arrays of objects opened up
  const rows = new Map(), walk = (v, path, docI) => {
    const t = bsonType(v), r = rows.get(path) || { types: new Set(), docs: new Set() };
    r.types.add(t === "array" && v.length && typeof v[0] === "object" ? "array of object" : t); r.docs.add(docI); rows.set(path, r);
    if (t === "object") Object.entries(v).forEach(([k, x]) => x !== undefined && walk(x, `${path}.${k}`, docI));
    if (t === "array") v.forEach((x) => { if (x && typeof x === "object" && !x.$oid) Object.entries(x).forEach(([k, y]) => walk(y, `${path}.${k}`, docI)); });
  };
  MDOCS.forEach((d, i) => Object.entries(d).forEach(([k, v]) => v !== undefined && walk(v, k, i)));
  return [...rows].map(([p, r]) => [p, [...r.types].join(", "), r.docs.size]);
})();
const IDX = { _id: "_id_", "customer.email": "customer.email_1", status: "status_1_created_at_-1", created_at: "status_1_created_at_-1", shipped_at: "shipped_at_1", legacy_id: "legacy_id_1" };
const fieldPath = (p) => p.split(".").map((s, i, a) => (i < a.length - 1 ? `<span class="fp-parent">${s}.</span>` : s)).join("");
const mstructure = `
          <div class="structure" data-view-of="fields" hidden>
            <h3>Fields</h3>
            <p class="fields-note">From the 20 documents on this page. ypacapy does not sample the collection, so a field only on other documents is not here.</p>
            <div class="grid-wrap"><table class="grid"><thead><tr><th scope="col">Field</th><th scope="col">Types seen</th><th scope="col">In documents</th><th scope="col">Index</th></tr></thead><tbody>
${MFIELDS.map(([p, t, n]) => `              <tr><td class="fpath">${fieldPath(p)}</td><td>${t}</td><td class="num">${n === 20 ? "all 20" : `${n} of 20`}</td><td>${IDX[p] ? `<span class="key">${ic(p === "_id" ? "key" : "link")}${IDX[p]}</span>` : ""}</td></tr>`).join("\n")}
            </tbody></table></div>
          </div>
          <div class="structure" data-view-of="indexes" hidden>
            <h3>Indexes</h3>
            <div class="grid-wrap"><table class="grid"><thead><tr><th scope="col">Name</th><th scope="col">Keys</th><th scope="col">Unique</th><th scope="col">Options</th></tr></thead><tbody>
              <tr><td>_id_</td><td class="mono">{ _id: 1 }</td><td>yes</td><td></td></tr>
              <tr><td>customer.email_1</td><td class="mono">{ "customer.email": 1 }</td><td>no</td><td></td></tr>
              <tr><td>status_1_created_at_-1</td><td class="mono">{ status: 1, created_at: -1 }</td><td>no</td><td></td></tr>
              <tr><td>shipped_at_1</td><td class="mono">{ shipped_at: 1 }</td><td>no</td><td class="mono">partial: { status: "shipped" }</td></tr>
              <tr><td>legacy_id_1</td><td class="mono">{ legacy_id: 1 }</td><td>yes</td><td class="mono">sparse</td></tr>
            </tbody></table></div>
          </div>`;
const DEFAULT_FILTER = '{ status: { $in: ["paid", "shipped", "refunded"] } }';
// Compass-style query bar, in ypacapy's controls. Only the filter shows at first; Options opens Project, Sort, Skip
// and Limit, and while it is closed a count says how many of them are set (Limit counts when it is not 20).
// The controls: a labelled text box per part of find(). Filter, Project and Sort are
// textareas: Enter adds a line, ⌘↵ runs, and the box grows with its text up to 8 lines, then scrolls.
const mqField = (id, label, ph, value, cls = "", extra = "") => `<label class="mq-field${cls ? " " + cls : ""}"><span class="mq-k">${label}</span><textarea class="mq-in" id="${id}" rows="1" placeholder="${esc(ph)}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"${extra}>${esc(value)}</textarea></label>`;
pages["collection.html"] = page({
  title: "ypacapy preview, collection",
  desc: "Design preview of a MongoDB collection in ypacapy: its documents under a query bar, the fields seen on the page, its indexes, and its Info.",
  barHtml: bar("collection", [["docs", "Documents"], ["counted", "Filter, counted"], ["no-filter", "No filter: estimate"], ["add", "Add a document"], ["add-example", "New document, example from fields"], ["open", "Nested fields open"], ["edit", "Editing a document"], ["guard-update", "Low: updateOne"], ["guard-update-pass", "Strict: updateOne"], ["duplicate", "Duplicate a document"], ["guard-insert", "Low: insertOne"], ["delete", "Delete a document"], ["guard-delete", "Low: deleteOne"], ["guard-delete-pass", "Strict: deleteOne"], ["table", "Table view"], ["multiline", "Multi-line filter and sort"], ["fields", "Fields"], ["indexes", "Indexes"], ["no-match", "Filter matches nothing"], ["bad-filter", "Filter not valid"], ["loading", "Loading"], ["info", "Info"], ["info-loading", "Info, reading"]]),
  body: app({ current: MCONN, conns: MCONNS, side: mongoSide("orders") + mongoHistory + savedSide, overlay: mInfoDlg + cguardDialogs, work: `${mtabs("orders", ["orders"])}
      <div class="work-body">
        <div class="mq-bar" role="group" aria-label="Query for orders">
          <div class="mq-row">
            ${mqField("where", "filter", "{ field: value }", DEFAULT_FILTER, "mq-filter", ' aria-describedby="where-err"').replace('<span class="mq-k">filter</span>', `<span class="mq-k" title="Filter">${ic("funnel", "mq-k-ico")}<span class="mq-k-t">filter</span></span>`)}
          </div>
          <div class="mq-actions"><button type="button" class="btn btn--quiet mq-more mq-ico-btn" id="mq-more" aria-expanded="false" aria-controls="mq-opts mq-paging" title="Project, sort, skip and limit" aria-label="Options">${ic("chevron-right", "mq-more-ico")}${ic("sliders-horizontal", "mq-narrow-ico")}<span class="btn-label">Options</span><span class="mq-set" id="mq-set" title="Options set" hidden></span></button><button type="button" class="btn btn--quiet mq-ico-btn" id="mq-reset" title="Back to the empty filter" aria-label="Reset">${ic("rotate-ccw", "mq-narrow-ico")}<span class="btn-label">Reset</span></button><button type="button" class="btn btn--quiet mq-ico-btn" data-href="./mongo.html?show=find" title="Open this query as db.orders.find(…) in a new query tab" aria-label="Open as a query">${ic("square-code")}<span class="btn-label">Open as a query</span></button>${runGroup}</div>
          <div class="mq-row mq-opts" id="mq-opts" hidden>
            ${mqField("proj", "project", "{ field: 0 }", "")}
            ${mqField("sort", "sort", "{ field: -1 }", "")}
          </div>
          <div class="mq-paging" id="mq-paging" hidden>
            <label class="mq-field mq-num"><span class="mq-k">skip</span><input class="mq-in" id="skip" inputmode="numeric" placeholder="0" spellcheck="false" autocomplete="off"></label>
            <label class="mq-field mq-num"><span class="mq-k">limit</span><input class="mq-in" id="limit" inputmode="numeric" value="20" spellcheck="false" autocomplete="off"></label>
          </div>
        </div>
        <div class="req-title"><span class="name name--static">orders</span><span class="path">${MCONN} / events</span></div>
        <section class="response" aria-label="orders">
          <nav class="subtabs" aria-label="Collection">
            <button type="button" class="subtab" data-view="docs" aria-pressed="true">Documents<span class="n" id="t-n" title="Estimated from collection metadata">~48k</span></button>
            <button type="button" class="subtab" data-view="fields" aria-pressed="false">Fields<span class="n" title="Seen on this page">${MFIELDS.length}</span></button>
            <button type="button" class="subtab" data-view="indexes" aria-pressed="false">Indexes<span class="n">5</span></button>
            <span class="push meta"><span class="dim" id="t-ms">7&nbsp;ms</span></span>
          </nav>
          <div class="state" data-when="full" data-view-of="docs">
            <div class="res-tools">${asSeg}<button type="button" class="btn btn--quiet res-add" id="t-add" title="Add a document" aria-label="Add a document">${ic("plus")}<span class="btn-label">Add document</span></button>${mresActions("t")}<div class="pager" role="group" aria-label="Pages"><span class="pager-n" id="t-pager" aria-live="polite"></span><button type="button" class="icon-btn" id="t-refresh" title="Read this page again  ⌘↵" aria-label="Refresh">${ic("refresh-cw")}</button><button type="button" class="icon-btn" aria-label="Previous page" title="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page" title="Next page">${ic("chevron-right")}</button></div></div>
            <div class="as-pane" data-as="json">${jdocs("Documents of orders", MDOCS, true)}</div>
            <div class="as-pane" data-as="table" hidden>${mgrid("t", "Documents of orders", MDOCS, 0)}</div>
          </div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Reading orders</strong><span>${MCONN}, events.orders</span></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>No document in orders matches this filter</strong><span>No order has the status lost. In the 20 documents read before, status holds paid, shipped or refunded.</span><button type="button" class="link" id="t-clear">Clear the filter</button></div></div>
          <div class="state" data-when="bad" hidden><div class="error-box" id="where-err">
            <strong>The filter is not valid</strong>
            <span class="hint-line">ypacapy reads it before sending, so nothing was sent to ${MCONN}.</span>
<pre class="db-says"><span class="bad">Expected , or ] after "paid" at line 1, column 30</span>
{ status: { $in: ["paid" "shipped"] } }
                             ^</pre>
          </div></div>${mstructure}
        </section>
      </div>` }),
  script: js("page-collection.js") + js("page-jv.js") + js("page-mongo-info.js"),
});

// ---------- Redis: the command console and a key tab ----------
// A Redis connection uses the same shell: title strip, rail, tree, tabs, editor over results. What changes: the tree is
// databases > keys, put into folders on the key separator (":"); the editor takes redis-cli commands, one per line;
// replies show as a table or as redis-cli prints them. The tree shows the connection's database only (0 unless
// the connection says otherwise), never the others. Nothing heavy runs on its own: its size comes from DBSIZE, the tree reads keys with SCAN (about 1,000 per call, more only on Scan more, never KEYS) and one
// pipelined TYPE for the keys it got; a key opens with its O(1) length (HLEN, LLEN, SCARD, ZCARD, XLEN, STRLEN) and
// one page of its value (HSCAN, LRANGE 0 19, SSCAN, ZRANGE 0 19 REV, XREVRANGE COUNT 20, GET).
const RCONN = "cache_prod";
const RCONNS = [CONNS[0], [RCONN, "server", 3, "redis"]];
// a key's type as a badge, coloured from the connection palette (River, Amethyst, Emerald, Carrot, Sunflower, Turquoise)
const RTYPE = { string: ["STR", 1], hash: ["HASH", 4], list: ["LIST", 2], set: ["SET", 3], zset: ["ZSET", 7], stream: ["STREAM", 5] };
const rtype = (t) => `<span class="rtype" style="--fg: var(--proj-${RTYPE[t][1]}-fg); --bg: var(--proj-${RTYPE[t][1]}-bg)" title="${t}">${RTYPE[t][0]}</span>`;
// a key with its folder part muted: user:3107 reads as user: + 3107
const rkey = (k) => { const i = k.lastIndexOf(":"); return i < 0 ? esc(k) : `<span class="fp-parent">${esc(k.slice(0, i + 1))}</span>${esc(k.slice(i + 1))}`; };

// the first SCAN of db0 returned these 26 keys; [key, type, the preview state that shows it]
const RFOLDERS = [
  ["cart", false, [["cart:9921", "hash"], ["cart:9930", "hash"], ["cart:9934", "hash"]]],
  ["events", false, [["events:orders", "stream", "stream"]]],
  ["leaderboard", true, [["leaderboard:daily", "zset"], ["leaderboard:weekly", "zset", "zset"]]],
  ["queue", false, [["queue:emails", "list", "list"], ["queue:webhooks", "list"]]],
  ["rate", false, [["rate:ip:10.0.4.12", "string"], ["rate:ip:10.0.9.31", "string"], ["rate:ip:172.16.2.40", "string"]]],
  ["session", true, [["session:7f3a91c2", "string", "string"], ["session:8b04de17", "string"], ["session:c1e6f09a", "string"]]],
  ["tags", false, [["tags:new", "set"], ["tags:sale", "set", "set"]]],
  ["user", true, [["user:3100", "hash"], ["user:3107", "hash", "hash"], ["user:3114", "hash"], ["user:3121", "hash"]]],
];
const RLOOSE = [["feature_flags", "hash"], ["maintenance", "string"]];
// TTLs the tree read in the same pipeline as TYPE, one O(1) TTL per key; as of the last scan, not counted down
const RTTL = { "leaderboard:daily": "14 h", "leaderboard:weekly": "3 days", "rate:ip:10.0.4.12": "48 s", "rate:ip:10.0.9.31": "12 s", "rate:ip:172.16.2.40": "55 s",
  "session:7f3a91c2": "23 min", "session:8b04de17": "41 min", "session:c1e6f09a": "1 h 52 min" };
const rttl = (key) => (RTTL[key] ? `<span class="rttl" title="Expires in ${RTTL[key]}, as of the last scan at 10:02"><span class="visually-hidden">Expires in ${RTTL[key]}</span>${ic("timer")}</span>` : "");
const RSCANNED = RFOLDERS.reduce((n, [, , ks]) => n + ks.length, RLOOSE.length);
// inside a folder a key shows the part after the folder's path; the full key is on hover
const ritem = (path, key, type, show, current, indent = 40, folder = "") => `        <div class="row" style="--indent:${indent}px" data-path="${path}" data-key="${esc(key)}"${RTTL[key] ? " data-ttl" : ""}${show ? ` data-state="${show}"` : ""}${current ? ' aria-current="page"' : ""}><button type="button" class="row-main"${show ? ` data-href="./key.html?show=${show}"` : ""} title="${esc(key)}">${rtype(type)}<span class="name">${esc(folder && key.startsWith(folder) ? key.slice(folder.length) : key)}</span>${rttl(key)}</button>${more(key)}</div>`;
const redisSide = (current) => `
    <aside class="sidebar" data-side="schema">
      <div class="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide"></div>
      <div class="side-head"><h2>Keys</h2></div>
      <div class="side-tools">
        <div class="search">${ic("search")}<input class="field" id="tree-filter" placeholder="Filter keys" aria-label="Filter keys" aria-describedby="tree-filter-h" autocomplete="off" spellcheck="false"></div>
        <button type="button" class="icon-btn icon-btn--outline ttl-only" id="ttl-only" aria-pressed="false" title="Show only keys that expire" aria-label="Expiring keys only">${ic("timer")}</button>
        <button type="button" class="icon-btn icon-btn--outline" title="Scan again from the start" aria-label="Scan keys again">${ic("refresh-cw")}</button>
      </div>
      <p class="sr-only" id="tree-filter-h">Narrows the keys read so far. Enter scans the database for keys that match.</p>
      <div class="tree" id="tree">
${group("db0", "db0", "1,204,331", 0, true, false)}
${RFOLDERS.map(([f, open, ks]) => `${group(`db0/${f}`, `${f}:`, ks.length, 16, open)}
${ks.map(([k, t, show]) => ritem(`db0/${f}/${k}`, k, t, show, current === k, 40, `${f}:`).replace(open ? /^$/ : 'class="row"', 'class="row" hidden')).join("\n")}`).join("\n")}
${RLOOSE.map(([k, t]) => ritem(`db0/${k}`, k, t, "", current === k, 24)).join("\n")}
        <div class="empty" id="tree-empty" hidden><strong>Nothing matches <span id="tree-empty-q"></span></strong><span>Searches the keys read so far. Press Enter to scan db0 for keys that match.</span><button type="button" class="link" id="tree-clear">Clear the filter</button></div>
        <div class="menu row-menu" id="row-menu" role="menu" aria-label="Key actions" hidden>
          <button type="button" role="menuitem">${ic("key")}Open key</button>
          <button type="button" role="menuitem">${ic("square-code")}New command on this key</button>
          <button type="button" role="menuitem">${ic("copy")}Copy name</button>
          <button type="button" role="menuitem" data-info>${ic("info")}Info</button>
          <hr>
          <button type="button" role="menuitem" class="danger">${ic("shredder")}Delete key</button>
        </div>
      </div>
      <!-- what the scan has read, pinned at the sidebar's foot whatever the tree's length -->
      <div class="side-foot"><div class="scan-more"><span id="scan-n" data-all="${RSCANNED} of 1,204,331 keys read" data-ttl="${Object.keys(RTTL).length} of the ${RSCANNED} keys read expire">${RSCANNED} of 1,204,331 keys read</span><button type="button" class="link" title="SCAN from where the last call stopped">Scan more</button></div></div>
    </aside>`;
const rhrow = (src, time, status, cls) => `        <div class="row"><button type="button" class="row-main" title="${RCONN} / db0&#10;${esc(src)}"><span class="name hq">${esc(src)}</span><span class="htime">${time}</span><span class="hstatus ${cls}">${status}</span></button></div>`;
const redisHistory = `
    <aside class="sidebar" data-side="history" hidden>
      <div class="side-head"><h2>History</h2><button type="button" class="btn btn--quiet" id="hist-clear">Clear</button></div>
      <div class="side-tools"><div class="search">${ic("search")}<input class="field" placeholder="Search ${RCONN} history" aria-label="Search ${RCONN} history" autocomplete="off" spellcheck="false"></div></div>
      <div class="tree" id="hist-list">
        <div class="day">Today</div>
${rhrow("ZRANGE leaderboard:weekly 0 9 REV WITHSCORES", "10:02", "20", "rows")}
${rhrow("LRANGE user:3107 0 -1", "09:58", "error", "fail")}
${rhrow("HGETALL user:3107", "09:57", "24", "rows")}
${rhrow("TTL session:7f3a91c2", "09:50", "1", "rows")}
        <div class="day">Yesterday</div>
${rhrow("DEL cart:9811 cart:9812", "17:20", "2", "rows")}
${rhrow("INFO memory", "16:02", "1", "rows")}
      </div>
    </aside>`;

// replies. RESP2 strings come back as strings, so a score or a count in a hash is text; the table says so.
const LB = [["mei.tanaka", 4820], ["a.lindqvist", 4415], ["r.okonkwo", 3980], ["k.nowak", 3622], ["s.ferreira", 3507], ["d.mensah", 3110], ["l.bianchi", 2984], ["t.nguyen", 2870], ["n.kapoor", 2641], ["j.moreau", 2533]];
const USER = [["email", "mei.tanaka@example.org"], ["full_name", "Mei Tanaka"], ["phone", "+81 90 2231 7754"], ["country", "JP"], ["city", "Osaka"], ["is_vip", "1"], ["lifetime_value", "4820.00"], ["orders_count", "17"],
  ["prefs", '{"lang":"ja","newsletter":true,"currency":"JPY"}'], ["last_order_id", "10482"], ["created_at", "2024-03-11T08:21:00Z"], ["last_seen_at", "2026-11-18T09:52:14Z"]];
const SESSIONS = ["session:7f3a91c2", "session:8b04de17", "session:c1e6f09a", "session:0d5b72e4", "session:e93a1f60", "session:41c08b9d", "session:b7720ae5", "session:5fe3d014", "session:9a61c7b2", "session:2c84f5ee", "session:f019d6a3", "session:6e2b90c1"];
// a string cell: JSON text is drawn as JSON (it is still a string to Redis)
const rcell = (v) => { if (/^[{[]/.test(v)) { try { const o = JSON.parse(v); return `<td class="json" data-full="${esc(JSON.stringify(o, null, 2))}">${jsonHtml(o)}</td>`; } catch {} } return c.text(v); };
const rgrid = (label, cols, rows, sel = 0) => `
            <div class="grid-wrap" tabindex="0" aria-label="${label}">
              <table class="grid"><thead><tr>${ROWHEAD}${cols.map(([n, t, num]) => th(n, t, { num })).join("")}</tr></thead><tbody>
${rows.map((r, i) => tr(i + 1, r, i === sel)).join("\n")}
              </tbody></table>
            </div>${inspector(cols[0][0], cols[0][1], sel + 1, plain(rows[sel][0]))}`;
// as redis-cli prints a reply: numbered lines, strings in quotes
const rawReply = (label, items) => {
  const w = String(items.length).length;
  return `
            <pre class="code docs raw" tabindex="0" aria-label="${label}">${items.map((x, i) => `<span class="l"><span class="idx">${String(i + 1).padStart(w)})</span> ${typeof x === "number" ? `<span class="j-num">(integer) ${x}</span>` : `<span class="j-str">"${esc(x)}"</span>`}</span>`).join("")}</pre>`;
};

// redis-cli in the editor, coloured: # comments, the command, its key, options, numbers, quoted strings
const ROPT = /^(WITHSCORES|REV|MATCH|COUNT|TYPE|LIMIT|BYSCORE|BYLEX|EX|PX|NX|XX|KEEPTTL|GET)$/i;
const hlRedis = (line) => {
  if (/^\s*#/.test(line)) return `<span class="q-c">${esc(line)}</span>`;
  let n = 0;
  return (line.match(/"(?:[^"\\]|\\.)*"|'[^']*'|\S+|\s+/g) || []).map((t) => {
    if (/^\s+$/.test(t)) return t;
    const i = n++;
    return i === 0 ? `<span class="q-k">${esc(t)}</span>` : /^["']/.test(t) ? `<span class="q-s">${esc(t)}</span>` : ROPT.test(t) ? `<span class="q-f">${esc(t)}</span>`
      : /^-?\d+(\.\d+)?$/.test(t) ? `<span class="q-n">${t}</span>` : `<span class="q-tb">${esc(t)}</span>`;
  }).join("");
};
const rqLines = (src, cur = -1) => { const lines = src.split("\n"); return lines.map((l, i) => `<span class="l${i === (cur < 0 ? lines.length - 1 : cur) ? " cur" : ""}">${hlRedis(l)}</span>`).join(""); };
const rq = (id, n, src, hidden = true, extra = "") => `<pre class="code" id="code-${id}" tabindex="0" aria-label="Command editor, Query ${n}"${hidden ? " hidden" : ""}${extra}>${rqLines(src)}</pre>`;
const RQ1 = `# This week's top ten\nZRANGE leaderboard:weekly 0 9 REV WITHSCORES`;
const RQ2 = `HGETALL user:3107`;
const RQ3 = `LRANGE user:3107 0 -1`;
const RQ4 = `# Carts nobody came back to\nDEL cart:9921 cart:9930 cart:9934`;
const RQ5 = `KEYS session:*`;

const RTABS = [["key", "key", "user:3107", "./key.html"], ["q1", "square-code", "Query 1", "./redis.html"], ["q2", "square-code", "Query 2", "./redis.html?show=hgetall"], ["q3", "square-code", "Query 3", "./redis.html?show=error"], ["q4", "square-code", "Query 4", "./redis.html?show=guard-confirm"], ["q5", "square-code", "Query 5", "./redis.html?show=keys"]];
const rtabs = (active, local) => tabsbar(active, local, { tabs: RTABS, pinned: ["key"], conn: RCONN }).replace(/Every statement runs/g, "Every command runs").replace(/the picked statements/g, "the picked commands");
const RFORMATS = ["redis-cli", "JSON", "CSV", "Markdown table"];
const rasSeg = `<span class="seg" role="group" aria-label="Show the reply as"><button type="button" aria-pressed="true" data-as="table">Table</button><button type="button" aria-pressed="false" data-as="raw">Raw</button></span>`;
const rresActions = (id) => resActions(id).replace(/<p class="menu-note">(Copy|Export) as<\/p>.*?<\/div>/g, (m, k) => `<p class="menu-note">${k} as</p>${RFORMATS.map((x) => `<button type="button" role="menuitem">${x}</button>`).join("")}</div>`);
// the guard's ask; for KEYS it offers SCAN, which reads the same keys in small steps and never holds the server
const rguardDialogs = guardDialogs.replace(/shop_prod/g, RCONN)
  .replace(/<div class="guard-kinds"><code class="stmt">DELETE<\/code><\/div>/g, '<div class="guard-kinds" data-kinds><code class="stmt">DEL</code></div>')
  .replace(/<button type="button" class="btn" data-guard-close>Cancel<\/button>/g, '<button type="button" class="btn" data-guard-close>Cancel</button><button type="button" class="btn" data-use-scan hidden>Use SCAN instead</button>');
const Q1ROWS = LB.map(([m, s]) => [c.text(m), c.num(s)]);
const Q1RAW = LB.flatMap(([m, s]) => [m, String(s)]);
const Q2ROWS = USER.map(([f, v]) => [c.text(f), rcell(v)]);
const Q2RAW = USER.flat();
const redisWork = `${rtabs("q1", ["q1", "q2", "q3", "q4", "q5"])}
      <div class="work-body">
        <div class="req-pane" id="req-pane">
          <div class="request-line">
            <div class="url-field"><div class="ctx"><span class="e e-redis">REDIS</span><strong>${RCONN}</strong><span class="sep">/</span><span class="ctx-db" title="The connection's database. Change it in Edit connection.">db0</span></div></div>
            <button type="button" class="btn btn--save" id="save" title="Save  ⌘S">${ic("circle-check", "save-ico")}<span class="save-label">Save</span></button>${runGroup}
          </div>
          <div class="req-title"><button type="button" class="name" id="q-name">Weekly top ten</button><span class="path" id="q-path">Saved queries / Growth</span></div>
          <div class="section">
            <div class="editor">
${rq("q1", 1, RQ1, false)}
${rq("q2", 2, RQ2)}
${rq("q3", 3, RQ3, true, ` data-fixed="${esc(rqLines("HGETALL user:3107"))}" data-orig="${esc(rqLines(RQ3))}"`)}
${rq("q4", 4, RQ4)}
${rq("q5", 5, RQ5, true, ` data-fixed="${esc(rqLines("SCAN 0 MATCH session:* COUNT 1000"))}" data-orig="${esc(rqLines(RQ5))}"`)}
            </div>
          </div>
        </div>
        <div class="divider" role="separator" aria-orientation="horizontal" aria-label="Resize panes" tabindex="0"></div>
        <section class="response" aria-label="Results">
          <nav class="subtabs" aria-label="Results">
            <button type="button" class="subtab" data-sub="results" aria-pressed="true">Results<span class="n" id="r-n">10</span></button>
            <button type="button" class="subtab" data-sub="messages" aria-pressed="false">Messages</button>
            <span class="push meta" id="r-meta"></span>
          </nav>
          <div class="res-tools">${rasSeg}${rresActions("q")}</div>
          <div class="state" data-when="full" data-for="q1" data-as="table" hidden>${rgrid("Reply to Query 1", [["member", "string"], ["score", "double", true]], Q1ROWS, 0)}
          </div>
          <div class="state" data-when="full" data-for="q1" data-as="raw" hidden>${rawReply("Reply to Query 1", Q1RAW)}
          </div>
          <div class="state" data-when="full" data-for="q2" data-as="table" hidden>${rgrid("Reply to Query 2", [["field", "string"], ["value", "string"]], Q2ROWS, 0)}
          </div>
          <div class="state" data-when="full" data-for="q2" data-as="raw" hidden>${rawReply("Reply to Query 2", Q2RAW)}
          </div>
          <div class="state" data-when="full" data-for="q3" data-as="table" hidden>${rgrid("Reply to Query 3", [["field", "string"], ["value", "string"]], Q2ROWS, 0)}
          </div>
          <div class="state" data-when="full" data-for="q3" data-as="raw" hidden>${rawReply("Reply to Query 3", Q2RAW)}
          </div>
          <div class="state" data-when="full" data-for="q5" data-as="table" hidden>${rgrid("Reply to Query 5", [["key", "string"]], SESSIONS.map((k) => [c.text(k)]), 0)}
          </div>
          <div class="state" data-when="full" data-for="q5" data-as="raw" hidden>${rawReply("Reply to Query 5", SESSIONS)}
          </div>
          <div class="state" data-when="idle" data-for="q4" hidden><div class="empty"><strong>Not run yet</strong><span>DEL removes keys on ${RCONN}, so Run asks first.</span></div></div>
          <div class="state" data-when="idle" data-for="q5" hidden><div class="empty"><strong>Not run yet</strong><span>KEYS reads all 1,204,331 keys in db0, and ${RCONN} answers no one else until it is done. Run asks first.</span></div></div>
          <div class="state" data-when="written" hidden><div class="empty write-res">${ic("circle-check", "ok-ico")}<strong id="w-title">Deleted 3 keys</strong><pre class="db-says" id="w-raw">(integer) 3</pre></div></div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Running on ${RCONN}</strong><span>Started 0.4&nbsp;s ago</span><button type="button" class="btn" id="cancel">Stop waiting</button><span class="muted">Redis cannot stop a command it started. ypacapy stops waiting and opens a new connection.</span></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>(nil)</strong><span>session:9a61c7b2 does not exist. It may have expired.</span></div></div>
          <div class="state" data-when="error" hidden><div class="error-box">
            <strong>user:3107 is a hash, and LRANGE reads lists</strong>
            <span class="hint-line">Redis checked the key's type and read nothing. HGETALL reads a whole hash.</span>
<pre class="db-says"><span class="bad">WRONGTYPE Operation against a key holding the wrong kind of value</span></pre>
            <div class="actions"><button type="button" class="btn" id="q3-fix">Use HGETALL and run</button></div>
          </div></div>
          <div class="state" data-when="lost" hidden><div class="error-box">
            <strong>${RCONN} closed the connection</strong>
            <span class="msg">Connection reset by peer (os error 54)</span>
            <span class="hint-line">ElastiCache may be moving the primary to the replica. A read is safe to send again; ypacapy does not resend a write on its own.</span>
            <div class="actions"><button type="button" class="btn" id="reconnect">Reconnect</button></div>
          </div></div>
          <div class="state" data-when="messages" hidden><pre class="code messages" aria-label="Messages"><span class="l">ZRANGE replied with 20 elements, 10 members and their scores, in 2 ms</span><span class="l">From ${RCONN}, db0 (Redis 7.1.0, primary cache-prod-0001-001)</span></pre></div>
        </section>
      </div>`;
// Info, from a key's "…" menu or the key tab: TYPE, OBJECT ENCODING, the O(1) length, TTL and a sampled MEMORY USAGE,
// read when the dialog opens and on Refresh. Never on a timer.
const rInfoDlg = `
<div class="backdrop" id="info-dlg" data-default="user:3107" hidden>
  <div class="dialog info-dlg" role="dialog" aria-modal="true" aria-labelledby="info-title">
    <h2 id="info-title"><span class="info-db">db0 · </span><span id="info-name">user:3107</span></h2>
    <div class="info-body" data-info-state="ready">
      <h3 class="cx-h">Key</h3>
      <dl class="info-grid">${infoRow("Type", "hash")}${infoRow("Encoding", "listpack", "Small hashes are packed")}${infoRow("Length", "12 fields")}${infoRow("Expires", "Never", "No TTL set")}</dl>
      <h3 class="cx-h">Memory</h3>
      <dl class="info-grid">${infoRow("Size", "~1.1 KB", "MEMORY USAGE, 5 samples")}${infoRow("Idle", "4 min", "Since the last read or write")}</dl>
    </div>
    <div class="info-body" data-info-state="loading" hidden><div class="empty"><span class="spinner"></span><span>Reading <span data-info-name>user:3107</span></span></div></div>
    <footer>
      <span class="help info-when">Read with TYPE, OBJECT and MEMORY USAGE at 10:02</span>
      <button type="button" class="btn" id="info-refresh">${ic("refresh-cw")}Refresh</button>
      <button type="button" class="btn btn--primary" data-info-close>Close</button>
    </footer>
  </div>
</div>`;
pages["redis.html"] = page({
  title: "ypacapy preview, Redis",
  desc: "Design preview of a Redis connection in ypacapy: redis-cli commands, replies as a table or as redis-cli prints them, keys read with SCAN, and the write guard on Redis commands.",
  barHtml: bar("redis", [["results", "Sorted set reply"], ["hgetall", "Hash reply"], ["raw", "Raw view"], ["messages", "Messages"], ["running", "Running"], ["nil", "(nil)"], ["error", "WRONGTYPE"], ["lost", "Connection lost"], ["guard-confirm", "Low: DEL"], ["guard-pass", "Strict: passphrase"], ["written", "Write result"], ["keys", "KEYS, not run"], ["guard-keys", "Low: KEYS"], ["row-menu", "Key menu"], ["info", "Info"], ["info-loading", "Info, reading"], ["tree-empty", "Filter, no match"], ["expiring", "Expiring only"], ["history", "History"]]),
  body: app({ current: RCONN, conns: RCONNS, side: redisSide("") + redisHistory + savedSide, work: redisWork, overlay: rguardDialogs + rInfoDlg }),
  script: js("page-redis-tree.js") + js("page-redis.js") + js("page-mongo-info.js"),
});

// Key tab: one key, read a page at a time. The head says its type, length and TTL; the body is its value, drawn for
// its type. Each type is a separate key in the preview; the bar picks one.
const LIST = Array.from({ length: 20 }, (_, i) => JSON.stringify({ job: ["receipt", "refund_notice", "welcome", "cart_reminder"][i % 4], to: PEOPLE[i % 12][0], order: 10482 - i * 3, attempt: 1 + (i % 7 === 3) }));
const SALE = ["TEE-M-BLK", "MUG-12", "CAP-OS", "SOCK-3P", "TEE-L-WHT", "HOOD-M-GRY", "BAG-TOTE", "TEE-S-BLK", "MUG-16", "PIN-SET", "TEE-XL-BLK", "SOCK-6P", "CAP-KIDS", "HOOD-L-BLK", "BOTTLE-500", "STICKER-PK", "TEE-M-NVY", "BEANIE", "SCARF-WOOL", "GLOVES-M"];
const ZSET = [...LB, ["h.adeyemi", 2490], ["p.haddad", 2312], ["sofia.f", 2280], ["k.ito", 2194], ["m.santos", 2101], ["o.berg", 1987], ["y.park", 1950], ["c.dubois", 1876], ["e.kowalski", 1810], ["f.rossi", 1777]];
const STREAM = Array.from({ length: 20 }, (_, i) => { const ms = 1763459534512 - i * 41117, st = ST[i % 10]; return [`${ms}-${i % 3}`, `order_id ${10482 - i} · status ${st} · total ${money([4820, 129.9, 642.75, 88, 1499][i % 5])}`]; });
const SESSION = { user_id: 3107, email: "mei.tanaka@example.org", roles: ["customer", "vip"], cart: { id: 9921, items: 3 }, csrf: "q4X9v2LkTzR8mW1c", ip: "203.0.113.77", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/605.1.15", created_at: "2026-11-18T09:31:02Z" };
const jsonPretty = (o) => JSON.stringify(o, null, 2).split("\n").map((l) => `<span class="l">${esc(l).replace(/^(\s*)"([^"]+)":/, '$1<span class="j-key">"$2"</span><span class="j-p">:</span>').replace(/: "([^"]*)"/, ': <span class="j-str">"$1"</span>').replace(/: (-?\d[\d.]*|true|false|null)(,?)$/, ': <span class="j-num">$1</span>$2')}</span>`).join("");
// [state, key, type, length line, TTL, encoding, what the value pane is called, its body]
const KEYS = {
  hash: ["user:3107", "hash", "12 fields", "", "listpack", "Fields", `
            <div class="res-tools"><span class="muted">Fields in HSCAN order. Double-click a value to change it.</span>${rresActions("k")}</div>
            <div class="as-pane">${rgrid("Fields of user:3107", [["field", "string"], ["value", "string"]], Q2ROWS, 0)}</div>
            <div class="grid-foot"><button type="button" class="btn btn--quiet grid-add" data-edit>${ic("plus")}Add field</button><span>1 to 12 of 12</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page" disabled>${ic("chevron-right")}</button></div>`],
  string: ["session:7f3a91c2", "string", "412 bytes", "Expires in 23 min", "embstr", "Value", `
            <div class="res-tools"><span class="muted">Valid JSON, 412 bytes</span><span class="seg" role="group" aria-label="Show the value as"><button type="button" aria-pressed="false" data-as="text">Text</button><button type="button" aria-pressed="true" data-as="json">JSON</button></span><button type="button" class="btn btn--quiet" data-edit title="Change the value  ↵">${ic("pencil")}Edit</button>${rresActions("k")}</div>
            <div class="as-pane" data-as="text" hidden><pre class="code docs str-val" tabindex="0" aria-label="Value of session:7f3a91c2"><span class="l">${esc(JSON.stringify(SESSION))}</span></pre></div>
            <div class="as-pane" data-as="json"><pre class="code docs" tabindex="0" aria-label="Value of session:7f3a91c2, as JSON">${jsonPretty(SESSION)}</pre></div>`],
  list: ["queue:emails", "list", "1,284 items", "", "quicklist", "Items", `
            <div class="res-tools"><span class="muted">Items 0 to 19, from the head</span>${rresActions("k")}</div>
            <div class="as-pane">${rgrid("Items of queue:emails", [["index", "int", true], ["value", "string"]], LIST.map((v, i) => [c.id(i), rcell(v)]), 0)}</div>
            <div class="grid-foot"><span>0 to 19 of 1,284</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page">${ic("chevron-right")}</button></div>`],
  set: ["tags:sale", "set", "86 members", "", "listpack", "Members", `
            <div class="res-tools"><span class="muted">Members in SSCAN order. A set has no order of its own.</span>${rresActions("k")}</div>
            <div class="as-pane">${rgrid("Members of tags:sale", [["member", "string"]], SALE.map((m) => [c.text(m)]), 0)}</div>
            <div class="grid-foot"><span>1 to 20 of 86</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page">${ic("chevron-right")}</button></div>`],
  zset: ["leaderboard:weekly", "zset", "12,408 members", "Expires in 3 days", "skiplist", "Members", `
            <div class="res-tools"><span class="seg" role="group" aria-label="Order"><button type="button" aria-pressed="true">Score high to low</button><button type="button" aria-pressed="false">Low to high</button></span>${rresActions("k")}</div>
            <div class="as-pane">${rgrid("Members of leaderboard:weekly", [["rank", "int", true], ["member", "string"], ["score", "double", true]], ZSET.map(([m, s], i) => [c.id(i + 1), c.text(m), c.num(s)]), 0)}</div>
            <div class="grid-foot"><span>1 to 20 of 12,408</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page">${ic("chevron-right")}</button></div>`],
  stream: ["events:orders", "stream", "2,113,940 entries", "", "stream", "Entries", `
            <div class="res-tools"><span class="muted">Newest first, read with XREVRANGE</span>${rresActions("k")}</div>
            <div class="as-pane">${rgrid("Entries of events:orders", [["id", "stream id"], ["fields", "field value …"]], STREAM.map(([id, f]) => [c.text(id), c.text(f)]), 0)}</div>
            <div class="grid-foot"><span>Newest 20 of 2,113,940</span><button type="button" class="icon-btn" aria-label="Newer" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Older">${ic("chevron-right")}</button></div>`],
};
const KTITLES = { hash: "Fields", string: "Value", list: "Items", set: "Members", zset: "Members", stream: "Entries" };
// The expiry: the TTL in the head is a button; its popover sets it with EXPIRE, or takes it off with PERSIST.
// Both go through the write guard (Expire in Commands to ask about). The time left is not counted down on screen.
const ttlPop = `<span class="menu-anchor rk-ttl-anchor"><button type="button" class="rk-ttl-btn" id="rk-ttl" aria-haspopup="dialog" aria-expanded="false" aria-controls="ttl-pop" title="Change the expiry">${ic("timer")}<span>No expiry</span>${ic("pencil", "rk-ttl-pen")}</button>
            <div class="upd-pop ttl-pop" id="ttl-pop" role="dialog" aria-label="Expiry" hidden>
              <p class="upd-title">Expiry of&nbsp;<code class="ttl-key" data-rk-name>user:3107</code></p>
              <label class="check"><input type="radio" name="ttl" value="none" id="ttl-none">No expiry</label>
              <div class="ttl-in"><label class="check"><input type="radio" name="ttl" value="in" id="ttl-on" checked>Expires in</label><input class="field" id="ttl-n" inputmode="numeric" value="30" aria-label="How long"><span class="select-wrap"><select class="field" id="ttl-u" aria-label="Unit"><option value="1">seconds</option><option value="60">minutes</option><option value="3600">hours</option><option value="86400" selected>days</option></select>${ic("chevron-down", "select-chev")}</span></div>
              <p class="upd-sub mono" id="ttl-cmd">EXPIRE user:3107 2592000</p>
              <div class="ttl-actions"><button type="button" class="btn" id="ttl-cancel">Cancel</button><button type="button" class="btn btn--primary" id="ttl-set">Set expiry</button></div>
            </div></span>`;
// Editing a hash: the grid's own editing, as on a table. Double-click (or ↵) a value to change it; ⌘⌫ marks a field
// to delete; Add field adds a row. Changed cells are green, a deleted field red and struck through, until Save
// writes them all at once (HSET, HDEL in one MULTI) or Revert drops them.
const editCell = (td) => td.replace(/^<td( class="([^"]*)")?/, (m, a, cls) => `<td class="${cls ? cls + " " : ""}cell-edit"`);
const HASH_EDIT_ROWS = USER.map(([f, v], i) => {
  const del = f === "phone", changed = f === "city";
  const cells = [c.text(f), changed ? editCell(c.text("Kyoto")) : rcell(v)];
  return tr(i + 1, cells, changed).replace("<tr", `<tr${del ? ' class="row-del"' : ""}`);
}).concat(`<tr class="row-edit row-new"><td class="rownum">+</td>${editCell(c.text("tier"))}${editCell(c.text("gold"))}</tr>`).join("\n");
const hashEdit = `
            <div class="res-tools"><span class="muted">Fields in HSCAN order</span><div class="edit-bar" role="group" aria-label="Unsaved changes"><span class="edit-n">3 changes</span><button type="button" class="btn btn--primary" id="hash-save" title="Write the changes at once  ⌘S">Save</button><button type="button" class="btn" data-revert title="Discard the changes">Discard</button></div>${rresActions("ke")}</div>
            <div class="as-pane"><div class="grid-wrap" tabindex="0" aria-label="Fields of user:3107, edited"><table class="grid"><thead><tr>${ROWHEAD}${th("field", "string")}${th("value", "string")}</tr></thead><tbody>
${HASH_EDIT_ROWS}
            </tbody></table></div>${inspector("value", "string", 5, "Kyoto")}</div>
            <div class="grid-foot"><button type="button" class="btn btn--quiet grid-add">${ic("plus")}Add field</button><span class="edit-what">city changed · phone deleted · tier added</span><span>1 to 12 of 12</span><button type="button" class="icon-btn" aria-label="Previous page" disabled>${ic("chevron-left")}</button><button type="button" class="icon-btn" aria-label="Next page" disabled>${ic("chevron-right")}</button></div>`;
// Editing a string: the value in a text box, JSON pretty when it was JSON. Save writes SET … KEEPTTL, so the
// expiry stays. Text that stopped being JSON is said, and can still be saved.
const SESSION_EDIT = JSON.stringify({ ...SESSION, roles: ["customer", "vip", "beta"] }, null, 2);
const stringEdit = `
            <div class="res-tools"><span class="muted str-check">Valid JSON, 421 bytes</span><div class="edit-bar" role="group" aria-label="Unsaved changes"><span class="edit-n">Changed</span><button type="button" class="btn btn--primary" id="str-save" title="Write it with SET  ⌘S">Save</button><button type="button" class="btn" data-revert title="Drop the change">Discard</button></div></div>
            <textarea class="str-edit" spellcheck="false" aria-label="Value of session:7f3a91c2">${esc(SESSION_EDIT)}</textarea>
            <p class="help str-note">Save writes it with SET … KEEPTTL, so its expiry stays. Format keeps JSON two spaces deep.</p>`;

pages["key.html"] = page({
  title: "ypacapy preview, key",
  desc: "Design preview of a Redis key in ypacapy: its type, length and TTL, and one page of its value drawn for its type.",
  barHtml: bar("key", [["hash", "Hash"], ["string", "String, JSON"], ["list", "List"], ["set", "Set"], ["zset", "Sorted set"], ["stream", "Stream"], ["match", "Field pattern"], ["no-match", "Pattern matches nothing"], ["gone", "Key gone"], ["loading", "Loading"], ["info", "Info"], ["info-loading", "Info, reading"], ["edit-hash", "Editing fields"], ["save-hash", "Save: Low asks"], ["edit-string", "Editing a string"], ["save-string", "Save string: Low asks"], ["ttl", "Change expiry"], ["ttl-set", "Set expiry: Low asks"], ["delete-key", "Delete key"], ["long-key", "Long key name"]]),
  body: app({ current: RCONN, conns: RCONNS, side: redisSide("user:3107") + redisHistory + savedSide, overlay: rInfoDlg + rguardDialogs, work: `${rtabs("key", ["key"])}
      <div class="work-body">
        <div class="rk-bar" role="group" aria-label="Key">
          <div class="rk-id"><span id="rk-type">${rtype("hash")}</span><h2 class="rk-name" id="rk-name" title="user:3107"><span class="rk-head">user:3107</span><span class="rk-tail"></span></h2><button type="button" class="icon-btn" title="Copy the key name" aria-label="Copy the key name">${ic("copy")}</button></div>
          <div class="mq-actions"><button type="button" class="btn btn--quiet" data-info-open title="Info" aria-label="Info">${ic("info")}<span class="btn-label">Info</span></button><button type="button" class="btn btn--quiet" id="rk-console" data-href="./redis.html?show=hgetall" title="Open a query tab with the command that reads this key" aria-label="Open as a query">${ic("square-code")}<span class="btn-label">Open as a query</span></button><button type="button" class="btn" id="rk-refresh" title="Read this page again  ⌘R" aria-label="Refresh">${ic("refresh-cw")}<span class="btn-label">Refresh</span></button><button type="button" class="icon-btn icon-btn--outline rk-del" id="rk-del" title="Delete key…" aria-label="Delete key">${ic("shredder")}</button></div>
          <div class="rk-meta"><span id="rk-len">12 fields</span>${ttlPop}<span id="rk-enc" title="OBJECT ENCODING">listpack</span><span class="rk-db">db0</span></div>
          <div class="mq-row" id="rk-match-row">
            <label class="mq-field"><span class="mq-k">match</span><input class="mq-in" id="rk-match" placeholder="*" spellcheck="false" autocomplete="off" aria-describedby="rk-match-h"></label>
          </div>
          <p class="help rk-match-h" id="rk-match-h">A pattern for HSCAN: * any text, ? one character. Enter reads again.</p>
        </div>
        <section class="response" aria-label="Value">
          <nav class="subtabs" aria-label="Key">
            <button type="button" class="subtab" aria-pressed="true"><span id="rk-what">Fields</span><span class="n" id="rk-n">12</span></button>
            <span class="push meta"><span class="dim" id="rk-ms">2&nbsp;ms</span></span>
          </nav>
${Object.entries(KEYS).map(([k, [, , , , , , body]]) => `          <div class="state" data-when="full" data-key-state="${k}"${k === "hash" ? "" : " hidden"}>${body}
          </div>`).join("\n")}
          <div class="state" data-when="full" data-key-state="hash-edit" hidden>${hashEdit}
          </div>
          <div class="state" data-when="full" data-key-state="string-edit" hidden>${stringEdit}
          </div>
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Reading <span data-rk-name>user:3107</span></strong><span>${RCONN}, db0</span></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>No field in user:3107 matches <span id="rk-empty-q">addr*</span></strong><span>HSCAN read all 12 fields. Their names start with email, full_name, phone, country, city and 7 more.</span><button type="button" class="link" id="rk-clear">Clear the pattern</button></div></div>
          <div class="state" data-when="gone" hidden><div class="error-box">
            <strong>user:3107 is gone</strong>
            <span class="hint-line">It expired or was deleted after the sidebar read it.</span>
<pre class="db-says"><span class="bad">TYPE user:3107 → none</span></pre>
            <div class="actions"><button type="button" class="btn" id="rk-close">Close this tab</button></div>
          </div></div>
        </section>
      </div>` }),
  script: `window.RKEYS = ${JSON.stringify(Object.fromEntries(Object.entries(KEYS).map(([k, [key, type, len, ttl, enc]]) => [k, { key, type, len, ttl, enc, what: KTITLES[k], badge: rtype(type) }])))};\n` + js("page-redis-tree.js") + js("page-key.js") + js("page-mongo-info.js"),
});

for (const old of ["table.css", "settings.css", "connect.css"]) fs.rmSync(`${OUT}/${old}`, { force: true });
for (const [f, html] of Object.entries(pages)) { fs.writeFileSync(`${OUT}/${f}`, html); console.log(f, html.length); }
