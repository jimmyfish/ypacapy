// Builds the Hallmark preview in ../preview: app.css (voidHTTP rules in app.css.base + ypacapy.css) and five pages.
// Run: node .hallmark/build/build.mjs
// ypacapy Hallmark preview, on voidHTTP's components and tokens. Writes .hallmark/preview/*.html and app.css.
import fs from "node:fs";
const SP = new URL(".", import.meta.url).pathname;
const OUT = new URL("../preview", import.meta.url).pathname;
// icon nodes are read as text from voidHTTP's lucide-react 0.460.0; point LUCIDE elsewhere if that checkout moves
const LUCIDE = process.env.LUCIDE_ICONS || `${process.env.HOME}/Playgrounds/rea/voidHTTP/node_modules/lucide-react/dist/esm/icons`;

fs.writeFileSync(`${OUT}/app.css`, fs.readFileSync(`${SP}app.css.base`, "utf8") + fs.readFileSync(`${SP}ypacapy.css`, "utf8"));

// ---------- icons: Lucide v0.460.0 nodes, read as text from voidHTTP's lucide-react ----------
const ICONS = ["database", "list-tree", "history", "bookmark", "house", "server", "hard-drive", "x", "plus", "settings", "search", "refresh-cw",
  "ellipsis", "chevron-down", "chevron-right", "chevron-left", "folder", "eye", "square-function", "table-2", "square-code", "panel-left-close",
  "columns-2", "play", "circle-check", "copy", "download", "circle-alert", "key-round", "key", "link", "folder-open", "type", "terminal",
  "lock", "lock-open", "type", "hash", "calendar-clock", "toggle-left", "braces", "arrow-up-down", "arrow-up", "arrow-down", "minus", "columns-3", "shield-check", "shield", "shield-off", "fingerprint", "check", "wand-sparkles", "file-plus"];
function symbol(name) {
  const src = fs.readFileSync(`${LUCIDE}/${name}.js`, "utf8");
  const start = src.indexOf("[", src.indexOf("createLucideIcon("));
  const body = src.slice(start, src.indexOf("]);", start) + 1);
  const els = [...body.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]/g)].map(([, tag, attrs]) =>
    `<${tag} ${[...attrs.matchAll(/(\w+):\s*"([^"]*)"/g)].filter(([, k]) => k !== "key").map(([, k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
  if (!els) throw new Error(`no nodes for ${name}`);
  return `  <symbol id="i-${name}" viewBox="0 0 24 24">${els}</symbol>`;
}
const SPRITE = `<!-- icons: Lucide v0.460.0 (ISC), inlined from lucide-react's icon nodes -->
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
const TYPE_ICON = (t) => (/^(int|numeric|float|real|double|decimal|serial|bigint|smallint)/.test(t) ? "hash" : /timestamp|^date|^time/.test(t) ? "calendar-clock" : /^bool/.test(t) ? "toggle-left" : /^json/.test(t) ? "braces" : "type");
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
const CONNS = [["shop_prod", "server", 1, "postgres"], ["analytics.sqlite", "hard-drive", 2, "sqlite"], ["legacy_cms", "server", 3, "mysql"]];
const tile = (icon, n, sm = true) => `<span class="proj-tile${sm ? " proj-tile--sm" : ""}" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)">${ic(icon)}</span>`;
const strip = (current) => `
  <!-- title strip: the native macOS traffic lights sit in the empty 84px on the left (not drawn here) -->
  <div class="app-strip" data-tauri-drag-region>
    <nav class="ptabs" aria-label="Connections">
      <button type="button" class="ptab" data-href="./home.html"${current === "home" ? ' aria-current="page"' : ""}>${ic("house")}Home</button>
      <span class="ptab-sep" aria-hidden="true"></span>
${CONNS.slice(0, 2).map(([name, icon, n]) => `      <div class="ptab ptab--project"${current === name ? ' aria-current="page"' : ""}>
        <button type="button" class="ptab-main" data-href="./index.html">${tile(icon, n)}${name}</button>
        <button type="button" class="icon-btn ptab-close" aria-label="Close ${name}">${ic("x")}</button>
      </div>`).join("\n")}
    </nav>
    <div class="strip-end">
      <button type="button" class="icon-btn strip-settings" title="Settings  ⌘," aria-label="Settings" data-href="./settings.html">${ic("settings")}</button>
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
const schemaSide = (current) => `
    <aside class="sidebar" data-side="schema">
      <div class="side-resize" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" title="Drag to resize, drag past the edge to hide"></div>
      <div class="side-head"><h2>Schema</h2></div>
      <div class="side-tools">
        <div class="search">${ic("search")}<input class="field" id="tree-filter" placeholder="Filter tables" aria-label="Filter tables, views and functions" autocomplete="off" spellcheck="false"></div>
        <button type="button" class="icon-btn icon-btn--outline" title="Refresh schema" aria-label="Refresh schema">${ic("refresh-cw")}</button>
        <button type="button" class="icon-btn icon-btn--filled" title="New query" aria-label="New query">${ic("plus")}</button>
      </div>
      <div class="tree" id="tree">
${group("public", "public", 13, 0, true, false)}
${group("public/tables", "Tables", 8, 16, true)}
${TABLES.map(([n, e]) => item(`public/tables/${n}`, "table-2", n, e, current === n, n === "orders" ? "./table.html" : "")).join("\n")}
${group("public/views", "Views", 2, 16, true)}
${item("public/views/daily_revenue", "eye", "daily_revenue")}
${item("public/views/open_orders", "eye", "open_orders")}
${group("public/functions", "Functions", 3, 16, false)}
${["order_total", "touch_updated_at", "refund_window"].map((n) => item(`public/functions/${n}`, "square-function", n).replace('class="row"', 'class="row" hidden')).join("\n")}
${group("audit", "audit", 2, 0, false, false)}
        <div class="empty" id="tree-empty" hidden><strong>Nothing matches <span id="tree-empty-q"></span></strong><span>The filter checks table, view and function names.</span><button type="button" class="link" id="tree-clear">Clear the filter</button></div>
        <div class="menu row-menu" id="row-menu" role="menu" aria-label="Table actions" hidden>
          <button type="button" role="menuitem">${ic("table-2")}Open rows</button>
          <button type="button" role="menuitem">${ic("square-code")}New query on this table</button>
          <button type="button" role="menuitem">${ic("copy")}Copy name</button>
          <hr>
          <button type="button" role="menuitem" class="danger">Truncate</button>
          <button type="button" role="menuitem" class="danger">Drop</button>
        </div>
      </div>
    </aside>`;
const hrow = (engine, label, sql, time, status, cls) => `        <div class="row"><button type="button" class="row-main"><span class="e e-${engine}">${label}</span><span class="name hq">${sql}</span><span class="htime">${time}</span><span class="hstatus ${cls}">${status}</span></button></div>`;
const historySide = `
    <aside class="sidebar" data-side="history" hidden>
      <div class="side-head"><h2>History</h2><button type="button" class="btn btn--quiet">Clear</button></div>
      <div class="side-tools"><div class="search">${ic("search")}<input class="field" placeholder="Search history" aria-label="Search history" autocomplete="off" spellcheck="false"></div></div>
      <div class="tree">
        <div class="day">Today</div>
${hrow("postgres", "PG", "select c.email, count(*) as refunds", "09:41", "14", "rows")}
${hrow("postgres", "PG", "select id, totl from orders", "09:38", "error", "fail")}
${hrow("postgres", "PG", "select * from orders where status", "09:30", "20", "rows")}
${hrow("sqlite", "SQLITE", "select day, sum(views) from page_views", "08:55", "31", "rows")}
        <div class="day">Yesterday</div>
${hrow("postgres", "PG", "update shipments set carrier = 'dhl'", "17:12", "3", "rows")}
${hrow("mysql", "MYSQL", "show processlist", "16:40", "8", "rows")}
      </div>
    </aside>`;
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

const TABS = [["orders", "table-2", "orders", "./table.html"], ["q1", "square-code", "Query 1", "./index.html"], ["q2", "square-code", "Query 2", "./index.html?show=sql-error"], ["q3", "square-code", "Query 3", "./index.html?show=wide"], ["q4", "square-code", "Query 4", "./index.html?show=long"]];
const tabsbar = (active, local) => `
      <div class="tabsbar">
        <button type="button" class="icon-btn side-toggle" aria-label="Hide sidebar" title="Hide sidebar  ⌘\\">${ic("panel-left-close")}</button>
        <div class="tabs">
${TABS.map(([id, icon, label, href]) => `          <div class="tab" data-tab="${id}"${id === active ? ' aria-current="page"' : ""}><button type="button" class="tab-main"${local.includes(id) ? "" : ` data-href="${href}"`}>${ic(icon)}<span class="name">${label}</span>${id === "q2" ? '<span class="dirty" role="img" aria-label="Unsaved changes"></span>' : ""}</button><button type="button" class="icon-btn close" aria-label="Close ${label}">${ic("x")}</button></div>`).join("\n")}
          <button type="button" class="icon-btn tab-add" aria-label="New query tab">${ic("plus")}</button>
        </div>
        <div class="menu-anchor env-group guard">
          <button type="button" class="env-picker" id="guard-btn" data-menu="guard-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Write guard for shop_prod: Ask to confirm" title="Write guard for shop_prod">${ic("shield", "guard-ico")}<span class="env-name" id="guard-name">Ask to confirm</span>${ic("chevron-down")}</button>
          <div class="menu guard-menu" id="guard-menu" role="menu" aria-label="Write guard for shop_prod" hidden>
            <p class="menu-note">Before a write runs on shop_prod</p>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="run" data-icon="shield-off">${ic("shield-off")}<span>Run it</span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="true" data-guard="confirm" data-icon="shield">${ic("shield")}<span>Ask to confirm</span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="verify" data-icon="fingerprint">${ic("fingerprint")}<span>Ask for passphrase</span>${ic("check", "tick")}</button>
            <p class="menu-note" id="guard-lower" hidden>Lowering it asks for the passphrase first</p>
          </div>
        </div>
      </div>`;
const FORMATS = ["Plain text", "JSON", "Markdown table", "CSV"];
const resActions = (id) => `<div class="res-actions"><div class="menu-anchor"><button type="button" class="icon-btn" title="Columns" aria-label="Go to a column" aria-haspopup="menu" aria-expanded="false" data-menu="${id}-cols">${ic("columns-3")}</button><div class="menu cols-menu" id="${id}-cols" role="menu" aria-label="Go to a column" data-cols hidden></div></div>${[["copy", "Copy", "copy"], ["export", "Export", "download"]].map(([k, label, icon]) => `<div class="menu-anchor"><button type="button" class="icon-btn" title="${label}" aria-label="${label} rows" aria-haspopup="menu" aria-expanded="false" data-menu="${id}-${k}">${ic(icon)}</button><div class="menu" id="${id}-${k}" role="menu" aria-label="${label} as" hidden><p class="menu-note">${label} as</p>${FORMATS.map((x) => `<button type="button" role="menuitem">${x}</button>`).join("")}</div></div>`).join("")}</div>`;
const runGroup = `
          <div class="joined" id="run-group">
            <button type="button" class="btn btn--primary" id="run"><span class="spinner" hidden></span>Run</button>
            <button type="button" class="btn btn--primary joined-tail" aria-label="More run options" aria-haspopup="menu" aria-expanded="false" data-menu="run-menu">${ic("chevron-down")}</button>
            <div class="menu" id="run-menu" role="menu" aria-label="Run" hidden>
              <button type="button" role="menuitem">Run all<kbd>⌘↵</kbd></button>
              <button type="button" role="menuitem">Run selection<kbd>⇧⌘↵</kbd></button>
              <button type="button" role="menuitem">Explain</button>
            </div>
          </div>`;

const app = ({ current, side = "", work, overlay = "" }) => `
<div class="app">${strip(current)}${rail}
  <div class="panel">${side}
    <main class="work">${work}
    </main>
  </div>
</div>${overlay}`;

const sel = (label, opts) => `<span class="ctx-select"><select aria-label="${label}">${opts.map((o) => `<option>${o}</option>`).join("")}</select>${ic("chevron-down")}</span>`;
const queryWork = `${tabsbar("q1", ["q1", "q2", "q3", "q4"])}
      <div class="work-body">
        <div class="req-pane" id="req-pane">
          <div class="request-line">
            <div class="url-field"><div class="ctx"><span class="e e-postgres">PG</span><strong>shop_prod</strong><span class="sep">/</span>${sel("Database", ["shop", "shop_staging"])}<span class="sep">/</span>${sel("Schema", ["public", "audit"])}</div></div>${runGroup}
            <div class="joined">
              <button type="button" class="btn">Save</button>
              <span class="btn joined-tail save-state ok" id="save-state" role="img" aria-label="Saved" title="Saved">${ic("circle-check")}</span>
            </div>
          </div>
          <div class="req-title"><button type="button" class="name" id="q-name">Refunds by customer</button><span class="path" id="q-path">Saved queries / Reports</span></div>
          <div class="section">
            <div class="editor">
              <div class="editor-bar"><button type="button" class="btn btn--quiet">${ic("wand-sparkles")}Format</button></div>
<pre class="code" id="code-q1" tabindex="0" aria-label="SQL editor, Query 1"><span class="l"><span class="q-c">-- Refunds in the last 30 days, by customer</span></span><span class="l"><span class="q-k">select</span> c.email, c.is_vip,</span><span class="l"><span class="ind">       </span><span class="q-f">count</span>(*) <span class="q-k">as</span> refunds,</span><span class="l"><span class="ind">       </span><span class="q-f">sum</span>(o.total) <span class="q-k">as</span> refunded,</span><span class="l"><span class="ind">       </span><span class="q-f">max</span>(o.created_at) <span class="q-k">as</span> last_refund</span><span class="l"><span class="q-k">from</span> orders o</span><span class="l"><span class="q-k">join</span> customers c <span class="q-k">on</span> c.id = o.customer_id</span><span class="l"><span class="q-k">where</span> o.status = <span class="q-s">'refunded'</span></span><span class="l"><span class="ind">  </span><span class="q-k">and</span> o.created_at &gt; <span class="q-f">now</span>() - <span class="q-k">interval</span> <span class="q-s">'30 days'</span></span><span class="l cur"><span class="q-k">group by</span> c.email, c.is_vip <span class="q-k">order by</span> refunded <span class="q-k">desc</span></span><span class="l"><span class="q-k">limit</span> <span class="q-n">500</span>;</span></pre>
<pre class="code" id="code-q2" tabindex="0" aria-label="SQL editor, Query 2" hidden><span class="l cur"><span class="q-k">select</span> id, <span class="q-err" id="q2-col">totl</span> <span class="q-k">from</span> orders <span class="q-k">where</span> status = <span class="q-s">'paid'</span> <span class="q-k">limit</span> <span class="q-n">500</span>;</span></pre>
<pre class="code" id="code-q3" tabindex="0" aria-label="SQL editor, Query 3" hidden><span class="l cur"><span class="q-k">select</span> * <span class="q-k">from</span> customers <span class="q-k">limit</span> <span class="q-n">50</span>;</span></pre>
<pre class="code" id="code-q4" tabindex="0" aria-label="SQL editor, Query 4" hidden><span class="l"><span class="q-k">select</span> id, status, subject, body</span><span class="l"><span class="q-k">from</span> support_tickets</span><span class="l cur"><span class="q-k">limit</span> <span class="q-n">50</span>;</span></pre>
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
          <div class="state" data-when="loading" hidden><div class="empty"><span class="spinner"></span><strong>Running on shop_prod</strong><span>Started 0.4&nbsp;s ago</span><button type="button" class="btn" id="cancel">Cancel</button></div></div>
          <div class="state" data-when="empty" hidden><div class="empty"><strong>The query ran and returned no rows</strong><span>No customer had a refund in the last 30 days. Widen the interval on line 9 and run it again.</span></div></div>
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
const SCREENS = [["home", "Home"], ["index", "Query"], ["table", "Table"], ["settings", "Settings"], ["connect", "New connection"]];
const UI_FONTS = `<option value="">System</option><option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option><option value="Avenir Next, Avenir, sans-serif">Avenir</option><option value="Georgia, serif">Georgia</option>`;
const MONO_FONTS = `<option value="">System mono</option><option value="Menlo, monospace">Menlo</option><option value="'Courier New', monospace">Courier</option><option value="Monaco, monospace">Monaco</option>`;
const bar = (cur, states = [], fonts = false) => `
<header class="pv-bar">
  <strong>ypacapy preview · ${cur === "index" ? "query" : cur}</strong>
  <nav class="pv-screens" aria-label="Screens">
${SCREENS.map(([f, l]) => `    <a class="btn btn--quiet" href="./${f}.html" style="min-height:var(--control)"${f === cur ? ' aria-current="page"' : ""}>${l}</a>`).join("\n")}
  </nav>${states.length ? `
  <div class="pv-states" role="group" aria-label="States">
${states.map(([k, l], i) => `    <button type="button" data-show="${k}" aria-pressed="${i === 0}">${l}</button>`).join("\n")}
  </div>` : ""}${fonts ? `
  <div class="pv-fonts">
    <label>UI font <select data-font="--font-ui">${UI_FONTS}</select></label>
    <label>Table font <select data-font="--font-table">${MONO_FONTS}</select></label>
    <label>Console font <select data-font="--font-mono">${MONO_FONTS}</select></label>
    <label>Size <select data-size="--font-size-ui"><option value="">14</option><option value="13px">13</option><option value="15px">15</option><option value="16px">16</option></select></label>
  </div>` : ""}
  <div class="pv-theme" role="group" aria-label="Density" style="margin-left:${fonts ? 0 : "auto"}">
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

// Home
const card = ([name, icon, n, engine], [head, tail], when) => `
          <div class="project-card conn-card">
            <button type="button" class="project-open" aria-label="Open ${name}, ${head}${tail}" title="${head}${tail}" data-href="./index.html"></button>
            ${tile(icon, n, false)}
            <span class="conn-id"><span class="proj-name">${name}</span><span class="proj-cols"><span class="e e-${engine}">${{ postgres: "PG", sqlite: "SQLITE", mysql: "MYSQL" }[engine]}</span><span class="addr"><span class="addr-head">${head}</span><span class="addr-tail">${tail}</span></span></span></span>
            <span class="proj-when">${when}</span>
          </div>`;
pages["home.html"] = page({
  title: "ypacapy preview, home",
  desc: "Design preview of ypacapy's Home: every connection on this Mac, and how to reach each one.",
  barHtml: bar("home"),
  body: `
<div class="app">${strip("home")}
  <div class="home">
    <div class="home-inner">
      <div class="home-head">
        <div><h1>Connections</h1><p class="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p></div>
        <div class="home-actions"><button type="button" class="btn">${ic("folder-open")}Open SQLite file</button><button type="button" class="btn btn--primary" data-href="./connect.html">${ic("plus")}New connection</button></div>
      </div>
      <section>
        <h2>On this Mac</h2>
        <div class="projects">${card(CONNS[0], ["localhost", ":5432 / shop"], "Opened today at 09:41")}${card(["loophealth-staging", "server", 4, "postgres"], ["loophealth-staging-3may.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com", ":5432 / postgres"], "Opened today at 09:12")}${card(["production.sqlite", "hard-drive", 2, "sqlite"], ["~/Shelter/data/rabbit/backup/", "production.sqlite"], "Opened today at 08:55")}${card(CONNS[2], ["10.0.4.12", ":3306 / cms"], "Opened yesterday at 16:40")}
          <button type="button" class="project-card project-card--new conn-card" data-href="./connect.html">${ic("plus")}New connection</button>
        </div>
      </section>    </div>
  </div>
</div>`,
});

// Query
pages["index.html"] = page({
  title: "ypacapy preview",
  desc: "Design preview of ypacapy, a local-only database explorer for macOS: the query console and its result grid.",
  barHtml: bar("index", [["results", "Results"], ["running", "Running"], ["empty", "No rows"], ["sql-error", "SQL error"], ["lost", "Connection lost"], ["wide", "Many columns"], ["long", "Long text"]], true),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork }),
  script: js("page-index.js"),
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
const LEVELS = [["run", "Run it"], ["confirm", "Ask to confirm"], ["verify", "Ask for passphrase"]];
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
  subDialog("unlock", "Change what to protect", passField("p-unlock", "Passphrase", "current-password") + '<p class="help" data-touch-hint hidden>Or use Touch ID.</p>', "Open for changes") +
  subDialog("new", "Set passphrase", passField("p-new", "Passphrase", "new-password") + passField("p-new2", "Type it again", "new-password") + '<p class="help">It cannot be recovered.</p>', "Set passphrase") +
  subDialog("change", "Change passphrase", passField("p-cur", "Current passphrase", "current-password") + passField("p-chg", "New passphrase", "new-password") + passField("p-chg2", "Type it again", "new-password"), "Change passphrase") +
  subDialog("disable", "Disable passphrase", passField("p-cur2", "Current passphrase", "current-password") + '<p class="help">Connections set to Ask for passphrase fall back to Ask to confirm, and Open with Touch ID turns off.</p>', "Disable passphrase", true);
const securityPane = () => `
      <div class="set-pane" data-pane="security" hidden>
        <h3>Security</h3>
        <p class="pane-note">Each connection sets its own write guard in the tabs bar.</p>
        <div class="set-list">
              <div class="set-item">
                <div class="set-text"><span class="set-label">Passphrase</span><span class="desc" data-pass-desc>Not set</span></div>
                <div class="set-ctl" data-pass="none"><button type="button" class="btn" data-open-sub="new">Set passphrase</button></div>
                <div class="set-ctl" data-pass="set" hidden><button type="button" class="btn" data-open-sub="change">Change passphrase</button><button type="button" class="btn btn--danger" data-open-sub="disable">Disable passphrase</button></div>
              </div>${setItem("Open with Touch ID", "", '<input id="sec-touch" class="switch" type="checkbox" role="switch">', "sec-touch").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-needs-pass hidden")}${setItem("Stay unlocked for", "", choice("sec-window", [["0", "Ask every time"], ["60", "1 minute"], ["300", "5 minutes"], ["900", "15 minutes"]], "0"), "sec-window").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-needs-pass hidden")}
        </div>
        <div class="protect-head" data-needs-pass hidden>
          <h3>What to protect</h3>
          <button type="button" class="btn btn--quiet" id="protect-toggle">${ic("lock")}<span>Change</span></button>
        </div>
        <div class="set-list stmts" id="protect" data-needs-pass hidden>${STMTS.map(([k, tag], i) => setItem(`<code class="stmt">${k}</code>${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", `<input id="prot-${i}" class="switch" type="checkbox" role="switch" checked disabled>`, `prot-${i}`)).join("")}
        </div>
      </div>`;
const sw = (id, on) => `<input id="${id}" class="switch" type="checkbox" role="switch"${on ? " checked" : ""}>`;
const schemeRow = (slot) => `
              <div class="set-item" data-scheme-row="${slot}">
                <div class="set-text"><label for="set-scheme-${slot}" data-scheme-label></label></div>
                <div class="set-ctl"><span class="scheme-dots" aria-hidden="true"></span><span class="select-wrap"><select id="set-scheme-${slot}" class="field set-scheme" data-scheme="${slot}"></select>${ic("chevron-down", "select-chev")}</span></div>
              </div>`;
pages["settings.html"] = page({
  title: "ypacapy preview, settings",
  desc: "Design preview of ypacapy Settings: theme and colour scheme per appearance, compact mode, three fonts, query defaults and where data lives.",
  barHtml: bar("settings", [["appearance", "Appearance"], ["queries", "Queries"], ["security", "Security"], ["pass-set", "Passphrase set"], ["pass-new", "Set passphrase"], ["pass-change", "Change passphrase"], ["pass-disable", "Disable passphrase"], ["protect-unlock", "Enter passphrase"], ["protect-open", "Protect open"], ["data", "Data on this Mac"]]),
  body: app({ current: "shop_prod", side: schemaSide("") + historySide + savedSide, work: queryWork, overlay: `
<div class="backdrop" data-close="./index.html">
  <div class="dialog wide" role="dialog" aria-modal="true" aria-label="Settings">
    <h2>Settings</h2>
    <div class="vars settings">
      <ul>
        <li><button type="button" data-section="appearance" aria-current="true">${ic("type")}Appearance</button></li>
        <li><button type="button" data-section="queries">${ic("terminal")}Queries</button></li>
        <li><button type="button" data-section="security">${ic("shield-check")}Security</button></li>
        <li><button type="button" data-section="data">${ic("lock")}Data on this Mac</button></li>
      </ul>
      <div class="set-pane" data-pane="appearance">
        <h3>Appearance</h3>
        <div class="set-list">${setItem("Theme", "", `<div class="seg seg--lg" role="group" aria-label="Theme"><button type="button" data-set-theme="auto" aria-pressed="true">Auto</button><button type="button" data-set-theme="light" aria-pressed="false">Light</button><button type="button" data-set-theme="dark" aria-pressed="false">Dark</button></div>`)}${schemeRow("light")}${schemeRow("dark")}${setItem("Compact mode", "", sw("set-compact", false), "set-compact")}${fontRow("set-ui-font", "Interface font", "", "System default", "--font-ui", "--font-size-ui", [12, 13, 14, 15, 16], 14)}${fontRow("set-table-font", "Table font", "", "System monospace", "--font-table", "--font-size-table", [11, 12, 13, 14, 15, 16], 13)}${fontRow("set-console-font", "Query console font", "", "System monospace", "--font-mono", "--font-size-code", [11, 12, 13, 14, 15, 16, 18], 13)}
          <div class="set-sample" aria-label="Sample">
            <span class="set-sample-ui">Refunds by customer <span class="muted">Saved queries / Reports</span></span>
            <code><span class="q-k">select</span> c.email, <span class="q-f">count</span>(*) <span class="q-k">from</span> orders</code>
            <code style="font-family: var(--font-table); font-size: var(--text-table)">10482   4,820.00   2026-11-14 09:41:07+07</code>
          </div>
        </div>
        <button type="button" class="link set-reset" id="set-reset">Reset to defaults</button>
      </div>
      <div class="set-pane" data-pane="queries" hidden>
        <h3>Queries</h3>
        <div class="set-list">${setItem("Row limit", "Added to a select that has no limit of its own", unit("set-limit", "500", "rows"), "set-limit")}${setItem("Statement timeout", "", unit("set-timeout", "30", "s"), "set-timeout")}${setItem("Open new connections read-only", "", sw("set-ro", false), "set-ro")}${setItem("Keep query history", "", sw("set-hist", true), "set-hist")}${setItem("Connection heartbeat", "Sends select 1 on every open connection, for servers that drop idle ones", sw("set-beat", false), "set-beat")}${setItem("Every", "Below the server idle timeout", unit("set-beat-every", "30", "s"), "set-beat-every").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-beat hidden")}
        </div>
      </div>
${securityPane()}
      <div class="set-pane" data-pane="data" hidden>
        <h3>Data on this Mac</h3>
        <div class="set-list">${setItem("Settings", "", '<span class="set-path">~/.config/ypacapy/settings.toml</span>')}${setItem("Connections", "No passwords", '<span class="set-path">~/.config/ypacapy/connections.toml</span>')}${setItem("History and saved queries", "", '<span class="set-path">~/.config/ypacapy/ypacapy.db</span>')}${setItem("Passwords", "Never synced to iCloud", "macOS login keychain")}${setItem("Network", "", "Only the databases you add")}
        </div>
        <button type="button" class="btn">${ic("folder-open")}Show in Finder</button>
      </div>
    </div>
  </div>${passDialogs()}
</div>` }),
  script: js("page-settings.js"),
});

// New connection: voidHTTP's .dialog with its labels
pages["connect.html"] = page({
  title: "ypacapy preview, new connection",
  desc: "Design preview of adding a PostgreSQL, MySQL or SQLite connection in ypacapy, with its password kept in the macOS keychain.",
  barHtml: bar("connect", [["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["sqlite", "SQLite"], ["name-missing", "Name missing"], ["testing", "Testing"], ["test-ok", "Test passed"], ["test-failed", "Test failed"]]),
  body: `
<div class="app">${strip("home")}
  <div class="home"><div class="home-inner"><div class="home-head"><div><h1>Connections</h1><p class="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p></div></div></div></div>
</div>
<div class="backdrop" data-close="./home.html">
  <div class="dialog" role="dialog" aria-modal="true" aria-label="New connection" style="width: 520px">
    <h2>New connection</h2>
    <form id="connect-form" data-endpoint="" novalidate>
      <label>Engine<span class="select-wrap"><select class="field" id="c-engine" name="engine"><option value="postgres" selected>PostgreSQL</option><option value="mysql">MySQL</option><option value="sqlite">SQLite</option></select>${ic("chevron-down", "select-chev")}</span></label>
      <label>Name<input class="field" id="c-name" name="name" required aria-required="true" aria-describedby="c-name-h" autocomplete="off" spellcheck="false"><span class="help" id="c-name-h"></span></label>
      <div data-for="sqlite" hidden>
        <label for="c-file">Database file</label>
        <div class="with-btn"><input class="field mono" id="c-file" name="file" placeholder="~/data/analytics.sqlite" autocomplete="off" spellcheck="false" aria-describedby="c-file-h"><button type="button" class="btn">${ic("folder-open")}Choose</button></div>
        <span class="help" id="c-file-h">Opened in place, never copied</span>
      </div>
      <div data-for="server">
        <div class="pair"><label>Host<input class="field mono" name="host" value="localhost" autocomplete="off" spellcheck="false"></label><label>Port<input class="field mono" id="c-port" name="port" value="5432" inputmode="numeric" autocomplete="off"></label></div>
        <div class="pair pair--even"><label>Database<input class="field mono" name="database" value="shop" autocomplete="off" spellcheck="false"></label><label>User<input class="field mono" name="user" value="ops" autocomplete="username" spellcheck="false"></label></div>
        <label>Password<input class="field" id="c-pass" name="password" type="password" autocomplete="current-password" aria-describedby="c-pass-h"><span class="help" id="c-pass-h">${ic("key-round")}Kept in the macOS login keychain on this Mac only</span></label>
      </div>
      <p class="test-line" role="status" id="test-line" hidden></p>
      <footer>
        <button type="submit" class="btn" value="test" id="c-test">Test</button>
        <button type="button" class="btn" data-href="./home.html">Cancel</button>
        <button type="submit" class="btn btn--primary" value="save">Save</button>
      </footer>
    </form>
  </div>
</div>`,
  script: js("page-connect.js"),
});

for (const old of ["table.css", "settings.css", "connect.css"]) fs.rmSync(`${OUT}/${old}`, { force: true });
for (const [f, html] of Object.entries(pages)) { fs.writeFileSync(`${OUT}/${f}`, html); console.log(f, html.length); }
