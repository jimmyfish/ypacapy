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
const ICONS = ["plug-zap", "database", "list-tree", "history", "bookmark", "house", "server", "hard-drive", "x", "plus", "settings", "search", "refresh-cw",
  "ellipsis", "chevron-down", "chevron-right", "chevron-left", "folder", "eye", "square-function", "table-2", "square-code", "panel-left-close",
  "columns-2", "play", "circle-check", "copy", "download", "circle-alert", "key-round", "key", "link", "folder-open", "type", "terminal",
  "lock", "lock-open", "type", "hash", "calendar-clock", "toggle-left", "braces", "arrow-up-down", "arrow-up", "arrow-down", "minus", "columns-3", "shield-check", "shield", "shield-off", "fingerprint", "check", "wand-sparkles", "file-plus", "pencil", "folder-input", "folder-minus", "folder-plus",
  "circle-arrow-down", "loader-circle", "triangle-alert", "external-link", "github", "circle-dot", "copy"];
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
const CONNS = [["shop_prod", "server", 6, "postgres"], ["analytics.sqlite", "hard-drive", 2, "sqlite"], ["legacy_cms", "server", 3, "mysql"]];
const tile = (icon, n, sm = true) => `<span class="proj-tile${sm ? " proj-tile--sm" : ""}" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)">${ic(icon)}</span>`;
const strip = (current, chip = "") => `
  <!-- title strip: the native macOS traffic lights sit in the empty 84px on the left (not drawn here) -->
  <!-- a connection tab carries its colour (--fg/--bg) on the tab itself; the tile inside inherits it, so tab, ring and
       tile are always one colour. The tile shows the engine glyph, as on the Home cards. -->
  <div class="app-strip" data-tauri-drag-region>
    <nav class="ptabs" aria-label="Connections">
      <button type="button" class="ptab" data-href="./home.html"${current === "home" ? ' aria-current="page"' : ""}>${ic("house")}Home</button>
      <span class="ptab-sep" aria-hidden="true"></span>
${CONNS.slice(0, 2).map(([name, , n, engine]) => `      <div class="ptab ptab--project" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)"${current === name ? ' aria-current="page"' : ""}>
        <button type="button" class="ptab-main" data-href="./index.html"><span class="proj-tile proj-tile--sm">${engIco(engine, 13)}</span>${name}</button>
        <button type="button" class="icon-btn ptab-close" aria-label="Close ${name}">${ic("x")}</button>
      </div>`).join("\n")}
    </nav>
    <div class="strip-end">${chip}
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
        <div class="empty" id="tree-empty" hidden><strong>Nothing matches <span id="tree-empty-q"></span></strong><span>Searches table, view and function names in the schemas loaded so far.</span><button type="button" class="link" id="tree-clear">Clear the filter</button></div>
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
const tabsbar = (active, local) => `
      <div class="tabsbar">
        <button type="button" class="icon-btn side-toggle" aria-label="Hide sidebar" title="Hide sidebar  ⌘\\">${ic("panel-left-close")}</button>
        <div class="tabs">
${TABS.map(([id, icon, label, href]) => `          <div class="tab" data-tab="${id}"${id === active ? ' aria-current="page"' : ""}><button type="button" class="tab-main"${local.includes(id) ? "" : ` data-href="${href}"`}>${ic(icon)}<span class="name">${label}</span>${id === "q2" ? '<span class="dirty" role="img" aria-label="Unsaved changes"></span>' : ""}</button><button type="button" class="icon-btn close" aria-label="Close ${label}">${ic("x")}</button></div>`).join("\n")}
          <button type="button" class="icon-btn tab-add" aria-label="New query tab">${ic("plus")}</button>
        </div>
        <div class="menu-anchor env-group guard">
          <button type="button" class="env-picker" id="guard-btn" data-menu="guard-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Security level for shop_prod: Low" title="Security level for shop_prod">${ic("shield", "guard-ico")}<span class="env-name" id="guard-name">Low</span>${ic("chevron-down")}</button>
          <div class="menu guard-menu" id="guard-menu" role="menu" aria-label="Security level for shop_prod" hidden>
            <p class="menu-note">Security level for shop_prod</p>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="none" data-icon="shield-off">${ic("shield-off")}<span class="gm-text"><span>None</span><small>Every statement runs</small></span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="true" data-guard="low" data-icon="shield">${ic("shield")}<span class="gm-text"><span>Low</span><small>Confirm the picked statements</small></span>${ic("check", "tick")}</button>
            <button type="button" role="menuitemradio" aria-checked="false" data-guard="strict" data-icon="lock">${ic("lock")}<span class="gm-text"><span>Strict</span><small>Passphrase for the picked statements</small></span>${ic("check", "tick")}</button>
            <p class="menu-note">Pick the statements in the connection's Options</p>
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

const app = ({ current, side = "", work, overlay = "", chip = "" }) => `
<div class="app">${strip(current, chip)}${rail}
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
const SCREENS = [["home", "Home"], ["index", "Query"], ["table", "Table"], ["settings", "Settings"], ["connect", "New connection"], ["updates", "Updates"], ["about", "About"]];
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
const ENGINE_NAME = { postgres: "PostgreSQL", mysql: "MySQL", sqlite: "SQLite" };
const ld = (l, d) => `light-dark(${l}, ${d})`;
const ENGINE_GLYPH = {
  postgres: `<path d="M4.2 3C5.4 1.9 7.6 1.5 9.6 1.9C12.4 2.5 14 4.5 13.7 7.4C13.5 9.2 12.6 10.4 11.3 10.7L11.5 13.2C11.5 14 10.7 14.5 10 14L9.1 13.3V11C7.8 11.1 6.6 10.8 5.7 10.1C5.4 11.2 4.8 12.2 3.8 12.5C3 12.7 2.4 11.9 2.8 11.2C3.4 10.1 3.3 8.8 2.9 7.6C2.4 5.9 2.8 4.2 4.2 3Z" style="fill:${ld("#336791", "#4c82b5")};stroke:${ld("#ffffff", "#e6eef5")}" stroke-width="0.8" stroke-linejoin="round"/><path d="M9.6 4.5C10.8 5.3 11.3 6.8 10.8 8.4" style="stroke:${ld("#ffffff", "#e6eef5")}" stroke-width="0.8" stroke-linecap="round"/><circle cx="7.6" cy="5.4" r="0.8" style="fill:${ld("#ffffff", "#e6eef5")}"/>`,
  mysql: `<path d="M1.5 12C3.1 8.3 6.3 5.7 10.2 5.2C11 4.1 12.1 3.3 13.6 3.1C13.2 4 13.1 4.9 13.4 5.7C14.2 6.6 14.6 7.9 14.4 9.3C13.8 8.5 12.8 8 11.7 8C8.7 8 5.4 9.6 1.5 12Z" style="fill:${ld("#00758f", "#2a9bb5")}"/><path d="M11.8 9.7C12.4 10.9 12.3 12.4 11.5 13.7C11.3 12.5 10.6 11.6 9.7 11.1" style="stroke:${ld("#f29111", "#f5a742")}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  sqlite: `<path d="M2 3.5C2 2.67 2.67 2 3.5 2H10.2L7.6 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" style="fill:${ld("#0f80cc", "#3d8fd1")}"/><path d="M14.2 1.4C11.3 2.4 9.3 5.4 8.6 9.3L8 14H8.9L9.5 9.7C12.6 8.6 14.5 5.4 14.2 1.4Z" style="fill:${ld("#0b4f82", "#9ccbf0")}"/><path d="M13.4 2.9C11.7 4.6 10.4 6.9 9.5 9.6" style="stroke:${ld("#bfe0f7", "#1e3a52")}" stroke-width="0.7" stroke-linecap="round"/>`,
};
const engIco = (engine, size = 14) => `<svg class="engine-ico" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">${ENGINE_GLYPH[engine]}</svg>`;

// Home
// A connection card. Its actions (Move to group, Edit, Remove) show on hover; Move to group opens a menu of the groups.
const GROUPS = ["Production", "Staging"];
const card = ([name, icon, n, engine], [head, tail], when, o = {}) => `
          <div class="project-card conn-card"${o.id ? ` data-card="${o.id}"` : ""} data-q="${esc(`${name} ${head}${tail} ${{ postgres: "postgresql pg", mysql: "mysql", sqlite: "sqlite" }[engine]} ${o.group || ""}`.toLowerCase())}">
            <button type="button" class="project-open" aria-label="Open ${name}, ${head}${tail}" data-href="./index.html"></button>
            <span class="proj-tile" style="--fg: var(--proj-${n}-fg); --bg: var(--proj-${n}-bg)">${engIco(engine, 22)}</span>
            <span class="conn-id"><span class="proj-name">${name}</span><span class="proj-cols"><span class="sr-only">${ENGINE_NAME[engine]}</span><span class="addr"><span class="addr-head">${head}</span><span class="addr-tail">${tail}</span></span></span></span>
            <span class="proj-when">${when}</span>${o.id ? `
            <span class="card-actions">
              <span class="menu-anchor">
                <button type="button" class="icon-btn" title="Move to group" aria-label="Move ${name} to a group" aria-haspopup="menu" aria-expanded="false" data-menu="move-${o.id}">${ic("folder-input")}</button>
                <div class="menu move-menu" id="move-${o.id}" role="menu" aria-label="Move ${name} to" hidden>
                  <p class="menu-note">Move ${name} to</p>
${(o.groups || GROUPS).map((g) => `                  <button type="button" role="menuitemradio" aria-checked="${g === o.group}">${ic("folder")}<span class="menu-name">${g}</span>${ic("check", "tick")}</button>`).join("\n")}
                  <hr>
                  <button type="button" role="menuitem" data-new-group>${ic("folder-plus")}New group…</button>${o.group ? `
                  <button type="button" role="menuitem">${ic("folder-minus")}Remove from group</button>` : ""}
                </div>
              </span>
              <button type="button" class="icon-btn" title="Edit connection" aria-label="Edit ${name}" data-href="./connect.html">${ic("pencil")}</button>
              <button type="button" class="icon-btn" title="Remove connection" aria-label="Remove ${name}">${ic("x")}</button>
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
  cms: card(CONNS[2], ["10.0.4.12", ":3306 / cms"], "Opened yesterday at 16:40", { id: "cms", group: "Production" }),
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
  barHtml: bar("home", [["grouped", "Groups"], ["folded", "Group folded"], ["group-menu", "Group menu"], ["move-menu", "Move to group"], ["rename", "Renaming a group"], ["new-group", "New group"], ["no-groups", "No groups yet"], ["many", "40 connections"], ["search", "Search"], ["search-empty", "Search, no match"], ["dragging", "Dragging a card"], ["remove", "Remove connection"]]),
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
      <div class="conn-groups" data-when="grouped">${groupSection("prod", "Production", [C.shop, C.cms], { open: 1 })}${groupSection("staging", "Staging", [C.staging])}
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
<div class="backdrop" id="remove-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rm-title">
    <h2 id="rm-title">Remove shop_prod?</h2>
    <form>
      <p class="help">ypacapy removes the connection, its keychain password and its query history from this Mac. Saved queries stay. The database is not touched.</p>
      <footer>
        <button type="button" class="btn" data-rm-close>Cancel</button>
        <button type="submit" class="btn btn--danger">Remove</button>
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

// The write guard's ask, before a write runs. Ask to confirm: Run or Cancel. Passphrase protection (the
// statement is in the connection's What to protect, a passphrase is set): the passphrase or Touch ID, whatever the guard.
const guardDialogs = `
<div class="backdrop" id="guard-confirm-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Run this on shop_prod?">
    <h2>Run this on shop_prod?</h2>
    <form>
      <p class="help">It changes data or structure on shop_prod:</p>
      <div class="guard-kinds"><code class="stmt">DELETE</code></div>
      <footer>
        <button type="button" class="btn" data-guard-close>Cancel</button>
        <button type="submit" class="btn btn--danger">Run</button>
      </footer>
    </form>
  </div>
</div>
<div class="backdrop" id="guard-pass-dlg" hidden>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Enter the passphrase to run this">
    <h2>Enter the passphrase to run this</h2>
    <form>
      <p class="help">It changes data or structure on shop_prod:</p>
      <div class="guard-kinds"><code class="stmt">DELETE</code></div>
      <label>Passphrase<input class="field" type="password" id="guard-pass-in" autocomplete="current-password"></label>
      <p class="help err" role="alert" id="guard-pass-err" hidden>That passphrase is not right.</p>
      <footer>
        <button type="button" class="btn" id="guard-touch" hidden>${ic("fingerprint")}Use Touch ID</button>
        <button type="button" class="btn" data-guard-close>Cancel</button>
        <button type="submit" class="btn btn--danger">Run</button>
      </footer>
    </form>
  </div>
</div>`;

// Query
pages["index.html"] = page({
  title: "ypacapy preview",
  desc: "Design preview of ypacapy, a local-only database explorer for macOS: the query console and its result grid.",
  barHtml: bar("index", [["results", "Results"], ["running", "Running"], ["empty", "No rows"], ["sql-error", "SQL error"], ["lost", "Connection lost"], ["wide", "Many columns"], ["long", "Long text"], ["cell-menu", "Cell menu"], ["row-menu", "Sidebar menu"], ["level-menu", "Security level menu"], ["guard-confirm", "Low: confirm"], ["guard-pass", "Strict: passphrase"], ["guard-pass-touch", "Strict with Touch ID"], ["guard-pass-wrong", "Strict: wrong passphrase"], ["history", "History"], ["history-clear", "Clear history"], ["history-none", "History, none yet"], ["ac-tables", "Complete: tables"], ["ac-columns", "Complete: columns"], ["ac-mixed", "Complete: two tables"], ["ac-loading", "Complete: reading columns"], ["ac-schema", "Complete: schema not loaded"]], true),
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
  subDialog("new", "Set passphrase", passField("p-new", "Passphrase", "new-password") + passField("p-new2", "Type it again", "new-password") + '<p class="help">It cannot be shown again. If you forget it, reset it with Touch ID or your login password.</p>', "Set passphrase") +
  subDialog("change", "Change passphrase", passField("p-cur", "Current passphrase", "current-password") + passField("p-chg", "New passphrase", "new-password") + passField("p-chg2", "Type it again", "new-password"), "Change passphrase") +
  subDialog("disable", "Disable passphrase", passField("p-cur2", "Current passphrase", "current-password") + '<p class="help">This turns off passphrase protection on every connection, and Open with Touch ID. Write guards stay as they are.</p>', "Disable passphrase", true) +
  subDialog("reset", "Reset passphrase", passField("p-rst", "New passphrase", "new-password") + passField("p-rst2", "Type it again", "new-password") + '<p class="help">The old passphrase cannot be shown, only replaced. macOS asks for Touch ID or your login password first. Connections keep their protection.</p>', "Reset passphrase");
const securityPane = () => `
      <div class="set-pane" data-pane="security" hidden>
        <h3>Security</h3>
        <p class="pane-note">The passphrase is one for the whole app. Each connection keeps its own security level (None, Low or Strict) and the statements it asks about, set in its Options or the tabs bar.</p>
        <div class="set-list">${setItem("Default security level for new connections", "Existing connections keep their own", levelPick("sec-level", "none"), "sec-level-btn")}
        </div>
        <div class="set-list">
              <div class="set-item set-item--pass">
                <div class="set-text"><span class="set-label">Passphrase</span><span class="desc" data-pass-desc>Not set</span><button type="button" class="pass-forgot" data-pass="set" data-open-sub="reset" hidden>Forgot passphrase?</button></div>
                <div class="set-ctl" data-pass="none"><button type="button" class="btn" data-open-sub="new">Set passphrase</button></div>
                <div class="set-ctl" data-pass="set" hidden><button type="button" class="btn" data-open-sub="change">Change passphrase</button><button type="button" class="btn btn--danger" data-open-sub="disable">Disable passphrase</button></div>
              </div>
        </div>
      </div>`;
const sw = (id, on) => `<input id="${id}" class="switch" type="checkbox" role="switch"${on ? " checked" : ""}>`;
const schemeRow = (slot) => `
              <div class="set-item" data-scheme-row="${slot}">
                <div class="set-text"><label for="set-scheme-${slot}" data-scheme-label></label></div>
                <div class="set-ctl"><span class="scheme-dots" aria-hidden="true"></span><span class="select-wrap"><select id="set-scheme-${slot}" class="field set-scheme" data-scheme="${slot}"></select>${ic("chevron-down", "select-chev")}</span></div>
              </div>`;
// Settings > Updates (voidHTTP's UpdatesPane): the running version and what the updater knows, the launch check, release notes.
// Each status row is one state of the same row; the preview bar picks which one shows.
const REL = "https://github.com/jimmyfish/ypacapy/releases";
const relLink = (label) => `<button type="button" class="upd-link" title="${REL}">${label}${ic("external-link")}</button>`;
const updRow = (st, desc, ctl) => `
              <div class="set-item" data-upd-st="${st}" hidden>
                <div class="set-text"><span class="set-label">ypacapy 0.0.1</span><span class="desc">${desc}</span></div>
                <div class="set-ctl">${ctl}</div>
              </div>`;
const updatesPane = () => `
      <div class="set-pane" data-pane="updates" hidden>
        <h3>Updates</h3>
        <div class="set-list">${updRow("current", `<span class="set-status ok">${ic("circle-check")}Up to date · checked just now</span>`, '<button type="button" class="btn">Check for updates</button>')}${updRow("available", `<span class="set-status new">${ic("circle-arrow-down")}0.0.2 is available</span>`, '<button type="button" class="btn btn--primary" data-href="./updates.html?show=downloading">Install update</button>')}${updRow("error", `<span class="set-status bad" title="error sending request for url (https://github.com/jimmyfish/ypacapy/releases/latest/download/latest.json)">${ic("triangle-alert")}Couldn't check for updates</span>`, '<button type="button" class="btn">Check for updates</button>')}${updRow("dev", "v0.0.1-4-g1a19d06+ on branch v0.0.1 · updates are off in dev builds", relLink("Get the release"))}
              <div class="set-item" data-upd-auto>
                <div class="set-text"><label for="set-auto-update">Check automatically</label><span class="desc" data-auto-desc>Look for a new version when ypacapy opens</span></div>
                <div class="set-ctl">${sw("set-auto-update", true)}</div>
              </div>${setItem("Release notes", "What changed in each version", relLink("Open on GitHub"))}
        </div>
      </div>`;
pages["settings.html"] = page({
  title: "ypacapy preview, settings",
  desc: "Design preview of ypacapy Settings: theme and color scheme per appearance, compact mode, three fonts, query defaults and where data lives.",
  barHtml: bar("settings", [["appearance", "Appearance"], ["queries", "Queries"], ["security", "Security"], ["pass-set", "Passphrase set"], ["pass-new", "Set passphrase"], ["pass-change", "Change passphrase"], ["pass-disable", "Disable passphrase"], ["pass-reset", "Forgot passphrase"], ["data", "Data on this Mac"], ["updates", "Updates"], ["upd-available", "Update available"], ["upd-error", "Check failed"], ["upd-dev", "Dev build"]]),
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
        <li><button type="button" data-section="updates">${ic("circle-arrow-down")}Updates</button></li>
      </ul>
      <div class="set-pane" data-pane="appearance">
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
  </div>${passDialogs()}
</div>` }),
  script: js("page-settings.js"),
});

// New connection: a data-source dialog. Name and colour on top, then tabs; right-aligned labels, fields to the right
const csel = (id, opts, cur, extra = "") => `<span class="select-wrap"${extra}><select class="field" id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === cur ? " selected" : ""}>${t}</option>`).join("")}</select>${ic("chevron-down", "select-chev")}</span>`;
const lab = (id, t) => `<label for="${id}">${t}</label>`;
const COLORS = [["5", "Turquoise"], ["2", "Emerald"], ["7", "Sunflower"], ["3", "Carrot"], ["6", "Alizarin"], ["1", "River"], ["8", "Asphalt"], ["4", "Amethyst"]];
pages["connect.html"] = page({
  title: "ypacapy preview, new connection",
  desc: "Design preview of adding a PostgreSQL, MySQL or SQLite connection in ypacapy, with its password kept in the macOS keychain.",
  barHtml: bar("connect", [["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["sqlite", "SQLite"], ["url-only", "URL only"], ["options", "Options tab"], ["options-low", "Low"], ["options-strict", "Strict"], ["options-nopass", "No passphrase set"], ["level-menu", "Security level menu"], ["group-menu", "Group menu"], ["group-new", "New group"], ["ssl", "SSL tab"], ["advanced", "Advanced tab"], ["name-missing", "Name missing"], ["testing", "Testing"], ["test-ok", "Test passed"], ["test-failed", "Test failed"]]),
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
          ${lab("c-engine", "Driver")}<span class="cx-full cx-driver">${ic("server", "drv-ico")}${csel("c-engine", [["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["sqlite", "SQLite"]], "postgres")}</span>
          <span class="cx-label" id="c-type-l" data-for="server">Connection type</span><span class="cx-full" data-for="server"><span class="seg seg--lg" role="group" aria-labelledby="c-type-l"><button type="button" aria-pressed="true" data-type="default">Default</button><button type="button" aria-pressed="false" data-type="url">URL only</button></span></span>
          <span data-for="fields" class="cx-sub">${lab("c-host", "Host")}<input class="field mono" id="c-host" name="host" value="localhost" autocomplete="off" spellcheck="false">${lab("c-port", "Port")}<input class="field mono cx-port" id="c-port" name="port" value="5432" inputmode="numeric" autocomplete="off">
          ${lab("c-user", "User")}<input class="field mono cx-full" id="c-user" name="user" value="ops" autocomplete="username" spellcheck="false"></span>
          <span data-for="server" class="cx-sub">${lab("c-pass", "Password")}<input class="field cx-full" id="c-pass" name="password" type="password" autocomplete="current-password" aria-describedby="c-pass-h"></span>
          <span data-for="fields" class="cx-sub">${lab("c-db", "Database")}<input class="field mono cx-full" id="c-db" name="database" value="shop" autocomplete="off" spellcheck="false"></span>
          <span data-for="sqlite" class="cx-sub" hidden>${lab("c-file", "File")}<span class="with-btn cx-full"><input class="field mono" id="c-file" name="file" placeholder="~/data/analytics.sqlite" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span></span>
          ${lab("c-url", "URL")}<input class="field mono cx-full" id="c-url" name="url" autocomplete="off" spellcheck="false" aria-describedby="c-url-h">
          <span class="help cx-full cx-under" id="c-url-h">Editing the URL fills in the settings above.</span>
          <span class="help cx-full cx-under" id="c-pass-h" data-for="server">${ic("key-round")}Passwords stay in the macOS login keychain on this Mac</span>
        </div>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-options" aria-labelledby="t-options" hidden>
        <h3 class="cx-h">Security</h3>
        <div class="set-list">${setItem("Security level", LEVEL_DESC.none, levelPick("c-level", "none"), "c-level-btn").replace('<span class="desc">', '<span class="desc" data-level-desc>')}${setItem("Open with Touch ID", "", '<input id="c-touch" class="switch" type="checkbox" role="switch">', "c-touch").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-strict hidden")}${setItem("Stay unlocked for", "After the passphrase, for this connection only", choice("c-window", [["0", "Ask every time"], ["60", "1 minute"], ["300", "5 minutes"], ["900", "15 minutes"]], "0"), "c-window").replace("class=\"set-item\"", "class=\"set-item set-item--sub\" data-when-strict hidden")}
        </div>
        <div data-when-guarded hidden>
        <div class="protect-head cx-protect-head">
          <h3 class="cx-h">Statements to ask about <span class="cx-h-note">For this connection</span></h3>
          <button type="button" class="btn btn--quiet" id="protect-toggle" data-when-strict hidden>${ic("lock")}<span>Change</span></button>
        </div>
        <div class="set-list stmts" id="protect">${STMTS.map(([k, tag], i) => setItem(`<code class="stmt">${k}</code>${tag ? ` <span class="tag">${tag}</span>` : ""}`, "", `<input id="prot-${i}" class="switch" type="checkbox" role="switch" checked>`, `prot-${i}`)).join("")}
        </div>
        </div>
        <h3 class="cx-h">Queries <span class="cx-h-note">Empty uses the value in Settings</span></h3>
        <div class="set-list">${setItem("Row limit", "Added to a select that has no limit of its own", '<span class="unit-field"><input id="c-limit" class="field" inputmode="numeric" placeholder="100"><span class="unit">rows</span></span>', "c-limit")}${setItem("Statement timeout", "0 lets a statement run as long as it takes", '<span class="unit-field"><input id="c-timeout" class="field" inputmode="numeric" placeholder="30"><span class="unit">s</span></span>', "c-timeout")}${setItem("Connection heartbeat", "Keeps idle sessions open with select 1", choice("c-beat", [["app", "Use Settings (off)"], ["on", "On"], ["off", "Off"]], "app"), "c-beat")}
        </div>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-ssl" aria-labelledby="t-ssl" hidden>
        <div class="cx-grid" data-for="server">
          ${lab("c-sslmode", "Mode")}<span class="cx-full">${csel("c-sslmode", [["disable", "Disable"], ["prefer", "Prefer"], ["require", "Require"], ["verify-ca", "Verify CA"], ["verify-full", "Verify full"]], "prefer")}</span>
          <span class="help cx-full cx-under">Verify CA and Verify full check the server's certificate.</span>
          ${lab("c-ca", "CA file")}<span class="with-btn cx-full"><input class="field mono" id="c-ca" placeholder="~/certs/ca.pem" autocomplete="off" spellcheck="false"><button type="button" class="btn">${ic("folder-open")}Choose</button></span>
        </div>
        <p class="cx-none" data-for="sqlite" hidden>SQLite opens a file on this Mac. There is no network to secure.</p>
      </div>

      <div class="cx-panel" role="tabpanel" id="p-advanced" aria-labelledby="t-advanced" hidden>
        <div class="cx-grid">
          <span data-for="server" class="cx-sub">${lab("c-app", "Application name")}<input class="field mono cx-full" id="c-app" value="ypacapy" autocomplete="off" spellcheck="false">
          ${lab("c-ctimeout", "Connect timeout")}<span class="unit-field cx-full"><input class="field" id="c-ctimeout" inputmode="numeric" placeholder="15"><span class="unit">s</span></span></span>
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
  updAnchor("downloading", "", `${ic("loader-circle", "upd-spin")}Updating 42%`, `
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
  aboutCard("checking", qline(SQL_CHECK, qwait("running")), updRowA('Looking for a new version…<span class="sub">github.com/jimmyfish/ypacapy</span>', checkAgain(true))),
  aboutCard("current", qline(SQL_CHECK, qst("redir", "0 rows")), updRowA('You\'re on the latest version.<span class="sub">Checked just now</span>', checkAgain())),
  aboutCard("available", qline(SQL_CHECK, qst("", "1 row")), updRowA('<strong>ypacapy 0.0.2 is out</strong><span class="sub">You have 0.0.1 · released 20 Nov 2026</span>') + `
              <div class="about-notes"><ul class="upd-notes">${ABOUT_NOTES.slice(0, 3).map((l) => `<li>${l}</li>`).join("")}</ul><ul class="upd-notes" data-more hidden>${ABOUT_NOTES.slice(3).map((l) => `<li>${l}</li>`).join("")}</ul><button type="button" class="upd-link about-notes-more" aria-expanded="false" data-more-btn>Show all ${ABOUT_NOTES.length} changes${ic("chevron-down")}</button></div>` +
    updRowA("", `<button type="button" class="upd-link" title="${REL}/tag/v0.0.2">Release notes${ic("external-link")}</button><button type="button" class="btn btn--primary" data-about-go="downloading">${ic("circle-arrow-down")}Install update</button>`).replace('<p class="about-upd-text"></p>', "")),
  aboutCard("downloading", qline(SQL_INSTALL, qst("busy", "42%"), 42), updRowA('Downloading 0.0.2 · 42%<span class="sub">4.1 of 9.8 MB · you can keep working</span>')),
  aboutCard("installing", qline(SQL_INSTALL, qwait("verifying"), 100), updRowA('Installing 0.0.2…<span class="sub">Downloaded and verified</span>')),
  aboutCard("ready", qline(SQL_INSTALL, qst("busy", "awaiting commit")), updRowA('<strong>0.0.2 is installed</strong><span class="sub">Restart ypacapy to commit it.</span>', `<button type="button" class="btn btn--primary">${ic("refresh-cw")}Restart now</button>`)),
  aboutCard("failed", qline(SQL_INSTALL, qst("fail", "rolled back")), `
              <p class="upd-err">the signature of the downloaded update does not match the public key</p>` +
    updRowA('ypacapy 0.0.1 is unchanged.', `<button type="button" class="upd-link" title="${REL}/latest">Download from GitHub${ic("external-link")}</button><button type="button" class="btn" data-about-go="downloading">Try again</button>`)),
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
      <h2 class="about-name" id="about-name" title="Reads the same both ways">ypa<span>capy</span></h2>
      <p class="about-tag">A calm database explorer. Everything stays on this Mac.</p>
      <div class="about-verline"><span class="build-tag" data-about-dev hidden>dev</span><button type="button" class="about-ver" title="Copy version"><span data-ver>v0.0.1</span>${ic("copy")}</button></div>
    </header>
    <div class="about-body">${ABOUT_CARDS}
      <nav class="about-links" aria-label="Links">
        <button type="button" class="btn btn--quiet" title="https://github.com/jimmyfish/ypacapy">${ic("github")}GitHub</button>
        <button type="button" class="btn btn--quiet" title="https://github.com/jimmyfish/ypacapy/issues/new">${ic("circle-dot")}Report an issue</button>
      </nav>
      <p class="about-foot">ypacapy, capy in a mirror. Reads the same both ways.</p>
    </div>
  </div>
</div>` }),
  script: js("page-about.js"),
});

for (const old of ["table.css", "settings.css", "connect.css"]) fs.rmSync(`${OUT}/${old}`, { force: true });
for (const [f, html] of Object.entries(pages)) { fs.writeFileSync(`${OUT}/${f}`, html); console.log(f, html.length); }
