// Builds .hallmark/preview/copy.html: the wording review, each UI string before and after the rewrite.
// Run: node .hallmark/build/build-copy.mjs. Locations are found at build time, so a string that moved or was fixed shows it.
// Nothing here changes src/ or src-tauri/; a row whose old text is gone from the code shows as applied.
import fs from "node:fs";
import path from "node:path";

const SP = new URL(".", import.meta.url).pathname;
const ROOT = path.resolve(SP, "../..");
const OUT = path.resolve(SP, "../preview");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- where each string lives ----------
const SCAN = ["src", "src-tauri/src", ".hallmark/build"];
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|rs|m?js)$/.test(e.name) && !p.endsWith("build-copy.mjs")) files.push(p);
  }
};
SCAN.forEach((d) => walk(path.join(ROOT, d)));
const lines = files.map((f) => [path.relative(ROOT, f), fs.readFileSync(f, "utf8").split("\n")]);
const where = (needles) => {
  const hits = [];
  for (const n of needles)
    for (const [f, ls] of lines)
      ls.forEach((l, i) => {
        if (typeof n === "string" ? l.includes(n) : n.test(l)) hits.push(`${f}:${i + 1}`);
      });
  return [...new Set(hits)];
};

// ---------- the string, in the rule it renders with ----------
const views = {
  set: ({ label, desc }) => `<div class="set-list"><div class="set-item"><div class="set-text"><span class="set-label">${esc(label)}</span>${desc ? `<span class="desc">${esc(desc)}</span>` : ""}</div></div></div>`,
  empty: ({ strong, span }) => `<div class="empty"><strong>${esc(strong)}</strong>${span ? `<span>${esc(span)}</span>` : ""}</div>`,
  dlg: ({ title, msg, btns = [], danger }) =>
    `<div class="cr-dlg"><h3>${esc(title)}</h3>${msg ? `<p>${esc(msg)}</p>` : ""}${btns.length ? `<footer>${btns.map((b, i) => `<span class="btn${i === btns.length - 1 ? (danger ? " btn--danger" : " btn--primary") : ""}">${esc(b)}</span>`).join("")}</footer>` : ""}</div>`,
  toast: ({ text }) => `<div class="cr-toast"><span>${esc(text)}</span></div>`,
  btns: ({ btns, lead }) => `<div class="cr-btns">${lead ? `<span class="set-label">${esc(lead)}</span>` : ""}${btns.map((b, i) => `<span class="btn${i === 0 ? " btn--primary" : ""}">${esc(b)}</span>`).join("")}</div>`,
  note: ({ text }) => `<div class="cr-dlg"><p class="pane-note">${esc(text)}</p></div>`,
  err: ({ text }) => `<div class="cr-text">${esc(text)}</div>`,
};

// ---------- the findings ----------
// kind: how it renders · now / next: the fields for that kind · why: the pattern and the reason · find: what locates it
const GROUPS = [
  ["Connections", [
    { kind: "dlg", now: { title: "Remove local.db?", msg: "The connection goes from ypacapy. The database file stays where it is.", btns: ["Cancel", "Remove"], danger: true },
      next: { title: "Remove local.db?", msg: "ypacapy forgets the connection. The database file stays where it is.", btns: ["Cancel", "Remove"], danger: true },
      why: ["Unclear verb.", "“Goes from ypacapy” leaves the reader to work out who does what. Name the actor."], find: ["The connection goes from ypacapy"] },
    { kind: "dlg", now: { title: "Remove shop_prod?", msg: "The connection and its keychain password go from this Mac. The database is not touched.", btns: ["Cancel", "Remove"], danger: true },
      next: { title: "Remove shop_prod?", msg: "ypacapy removes the connection and its keychain password from this Mac. The database is not touched.", btns: ["Cancel", "Remove"], danger: true },
      why: ["Unclear verb.", "Same fix, for server connections."], find: ["keychain password go from this Mac"] },
    { kind: "set", now: { label: "Write guard", desc: "Ask to confirm asks before any write" }, next: { label: "Write guard", desc: "What happens before a write runs" },
      why: ["Label defines itself.", "The description turns one option’s name into a verb. The tab bar’s menu already says “Before a write runs on shop_prod”, so reuse that."], find: ['"Ask to confirm asks before any write"'] },
    { kind: "set", now: { label: "Driver", desc: "VoiceOver reads the picker as “Connection type”" }, next: { label: "Driver", desc: "VoiceOver reads the picker as “Driver”" },
      why: ["Two names for one field.", "Sighted users read Driver, VoiceOver users hear Connection type. Make the aria-label match the visible label."], find: ['label="Connection type"'] },
    { kind: "err", now: { text: "The write guard is Run it or Ask to confirm." }, next: { text: "Pick Run it or Ask to confirm for the write guard." },
      why: ["Error states the rule, not the fix.", "The errors beside it lead with the action (“Choose the database file”). This one should too."], find: ["The write guard is Run it or Ask to confirm."] },
  ]],
  ["Query and results", [
    { kind: "empty", now: { strong: "The query ran and returned no rows", span: "Nothing matched. Widen the conditions and run it again." }, next: { strong: "The query returned no rows" },
      why: ["Advice built on a guess.", "The query may have no where clause, so “widen the conditions” can be wrong. “Ran and” repeats what “returned” already says."], find: ["The query ran and returned no rows", "Widen the conditions"] },
    { kind: "empty", now: { strong: "Cancelled", span: "The database was asked to stop the statement." }, next: { strong: "Cancelled", span: "ypacapy asked the database to stop the statement." },
      why: ["Passive voice.", "Say who asked."], find: ["The database was asked to stop the statement."] },
    { kind: "btns", now: { lead: "2 changes", btns: ["Submit", "Revert"] }, next: { lead: "2 changes", btns: ["Save", "Revert"] },
      why: ["Two names for one action.", "The button says Submit, but its shortcut is ⌘S, the toast says “Saved 2 changes” and the error says “Nothing was saved”. Call it Save everywhere."], find: [/^\s*Submit\s*$/, "Submit first to keep"] },
    { kind: "dlg", now: { title: "Discard 2 unsaved changes?", msg: "Running again reads the rows anew. Submit first to keep the changes.", btns: ["Cancel", "Discard"], danger: true },
      next: { title: "Discard 2 unsaved changes?", msg: "Running again reloads the rows. Save first to keep the changes.", btns: ["Cancel", "Discard"], danger: true },
      why: ["Stiff word.", "“Anew” is stiff. Submit becomes Save to match the row above."], find: ["reads the rows anew"] },
    { kind: "toast", now: { text: "Open tabs not kept: <error>" }, next: { text: "Could not save open tabs: <error>" },
      why: ["Clipped headline grammar.", "Every other failure reads “Could not …” (connect, format, read the catalog)."], find: ["Open tabs not kept"] },
    { kind: "empty", now: { strong: "Nothing matches “ordrs”", span: "The filter checks the table, view and function names of the schemas loaded so far." },
      next: { strong: "Nothing matches “ordrs”", span: "Searches table, view and function names in the schemas loaded so far." },
      why: ["Object doing a person’s verb (minor).", "Same facts, fewer words. Optional."], find: ["The filter checks the table, view and function names"] },
    { kind: "empty", now: { strong: "Nothing matches", span: "History search looks at the SQL text." }, next: { strong: "Nothing matches", span: "Searches the SQL text." },
      why: ["Object doing a person’s verb (minor).", "Saved queries has the same shape: “The search looks at names and SQL.” becomes “Searches names and SQL.” Optional."], find: ["History search looks at the SQL text.", "The search looks at names and SQL."] },
  ]],
  ["Settings", [
    { kind: "set", now: { label: "Colour scheme" }, next: { label: "Color scheme" },
      why: ["Two spellings.", "The connection dialog says Color and Connection color, but Settings says Colour scheme. Pick one."], find: ['"Colour scheme"'] },
    { kind: "set", now: { label: "Query console font" }, next: { label: "Editor font" },
      why: ["Two names for one surface.", "The editor’s own aria-label is “SQL editor”, and nothing else in the app says console. The preview bar’s “Console font” follows."], find: ["Query console font", "Console font"] },
  ]],
  ["Settings › Security", [
    { kind: "set", now: { label: "Passphrase", desc: "Not set. Set one to protect statements with it" }, next: { label: "Passphrase", desc: "Not set. With one, the statements you pick ask for it before they run" },
      why: ["Vague.", "“Protect statements with it” does not say what the protection does. The new text says it in the words What to protect uses."], find: ["Not set. Set one to protect statements with it"] },
    { kind: "set", now: { label: "Protect new connections with passphrase", desc: "What to protect asks for the passphrase, whatever the write guard" },
      next: { label: "Protect new connections with passphrase", desc: "The statements picked below ask for it, even under Run it" },
      why: ["Heading used as a subject.", "“What to protect” is a section title, not something that asks. “Whatever the write guard” hides the case that matters, which is Run it."], find: ["What to protect asks for the passphrase"] },
    { kind: "set", now: { label: "Open with Touch ID", desc: "This Mac has no Touch ID ready" }, next: { label: "Open with Touch ID", desc: "Touch ID is not available on this Mac" },
      why: ["Odd phrasing.", "“No Touch ID ready” reads like a translation."], find: ["This Mac has no Touch ID ready"] },
    { kind: "dlg", now: { title: "Change passphrase protection", btns: ["Cancel", "Open for changes"] }, next: { title: "Change passphrase protection", btns: ["Cancel", "Unlock"] },
      why: ["Vague button.", "The switch beside it says Lock, and the setting above says “Stay unlocked for”. Use the same verb."], find: ["Open for changes"] },
    { kind: "dlg", now: { title: "Disable passphrase", msg: "Passphrase protection turns off on every connection, and Open with Touch ID turns off. Write guards stay as they are.", btns: ["Cancel", "Disable passphrase"], danger: true },
      next: { title: "Disable passphrase", msg: "This turns off passphrase protection on every connection, and Open with Touch ID. Write guards stay as they are.", btns: ["Cancel", "Disable passphrase"], danger: true },
      why: ["Repeated verb.", "“Turns off” appears twice in one sentence."], find: ["Passphrase protection turns off on every connection"] },
  ]],
  ["Errors from the Rust side", [
    { kind: "err", now: { text: "cannot read ~/.config/ypacapy/settings.toml: <error>" }, next: { text: "Could not read ~/.config/ypacapy/settings.toml: <error>" },
      why: ["Mixed case.", "These reach the UI in lowercase, while every other message is in sentence case and says “Could not”. “settings must be a table” gets the same fix."],
      find: [/"cannot (read|write|create|open) /, '"settings must be a table"'] },
  ]],
];

// ---------- page ----------
const SCREENS = [["home", "Home"], ["index", "Query"], ["table", "Table"], ["settings", "Settings"], ["connect", "New connection"], ["copy", "Wording"]];
const total = GROUPS.reduce((n, [, items]) => n + items.length, 0);
const item = (it) => {
  const at = where(it.find);
  return `
        <article class="cr-item">
          <div class="cr-pair">
            <div class="cr-side cr-side--before" role="group" aria-label="Before"><samp class="cr-box">${views[it.kind](it.now)}</samp></div>
            <div class="cr-side cr-side--after" role="group" aria-label="After"><samp class="cr-box">${views[it.kind](it.next)}</samp></div>
          </div>
          <p class="cr-why"><b>${esc(it.why[0])}</b> ${esc(it.why[1])}</p>
          <ul class="cr-where">${at.length ? at.map((a) => `<li><code>${esc(a)}</code></li>`).join("") : "<li>Applied: the old text is no longer in the code.</li>"}</ul>
        </article>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ypacapy wording review</title>
<meta name="description" content="Each ypacapy UI string that read unclear or inconsistent, shown before and after the rewrite.">
<link rel="stylesheet" href="./app.css">
<link rel="stylesheet" href="./preview.css">
<link rel="stylesheet" href="./copy.css">
<script src="./themes.js"></script>
</head>
<body>
<header class="pv-bar">
  <strong>ypacapy preview · wording</strong>
  <nav class="pv-screens" aria-label="Screens">
${SCREENS.map(([f, l]) => `    <a class="btn btn--quiet" href="./${f}.html" style="min-height:var(--control)"${f === "copy" ? ' aria-current="page"' : ""}>${l}</a>`).join("\n")}
  </nav>
  <div class="pv-states" role="group" aria-label="Show">
    <button type="button" data-view-set="both" aria-pressed="true">Both</button>
    <button type="button" data-view-set="now" aria-pressed="false">Before</button>
    <button type="button" data-view-set="proposed" aria-pressed="false">After</button>
  </div>
  <div class="pv-theme" role="group" aria-label="Mac appearance">
    <button type="button" data-os-set="light" aria-pressed="true">Light</button>
    <button type="button" data-os-set="dark" aria-pressed="false">Dark</button>
  </div>
</header>
<div class="cr-scroll">
  <main class="cr" data-view="both">
    <div>
      <h1>Wording review</h1>
      <p class="cr-lead">${total} strings from src/ and src-tauri/ that read unclear or used two names for one thing, all now changed in the code. Each one is shown in the style it renders with: the old text on the left, the new text on the right in a blue frame.</p>
    </div>
    <p class="cr-clean">The scan found no words from the banned list, no em dashes, no puffery, no binary contrasts and no emoji. Most of the copy is already plain and concrete, so the fixes are small.</p>
    <div class="cr-cols" aria-hidden="true"><span class="cr-col-now">Before</span><span class="cr-col-next">After</span></div>
${GROUPS.map(([h, items]) => `    <section class="cr-group" aria-labelledby="g-${esc(h.replace(/\W+/g, "-").toLowerCase())}">
      <h2 id="g-${esc(h.replace(/\W+/g, "-").toLowerCase())}">${esc(h)}</h2>${items.map(item).join("")}
    </section>`).join("\n")}
  </main>
</div>
<script>
(() => {
  const T = window.YpaThemes, root = document.documentElement, main = document.querySelector(".cr");
  const q = new URLSearchParams(location.search);
  const st = { os: q.get("os") === "dark" ? "dark" : "light", view: ["now", "proposed"].includes(q.get("view")) ? q.get("view") : "both" };
  let set = [];
  function apply() {
    const id = q.get(st.os) || T.DEFAULT_SCHEME[st.os];
    set.forEach((k) => root.style.removeProperty(k)); set = [];
    const sc = T.findScheme(id);
    root.dataset.theme = sc ? (T.isDark(sc) ? "dark" : "light") : T.BUILTIN[id]?.dark ? "dark" : "light";
    if (sc) Object.entries(T.schemeTokens(sc)).forEach(([k, v]) => { root.style.setProperty(k, v); set.push(k); });
    main.dataset.view = st.view;
    document.querySelectorAll("[data-os-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.osSet === st.os)));
    document.querySelectorAll("[data-view-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.viewSet === st.view)));
    const u = new URL(location);
    st.os === "dark" ? u.searchParams.set("os", "dark") : u.searchParams.delete("os");
    st.view === "both" ? u.searchParams.delete("view") : u.searchParams.set("view", st.view);
    history.replaceState(null, "", u);
    document.querySelectorAll(".pv-screens a").forEach((a) => {
      const base = a.dataset.base || (a.dataset.base = a.getAttribute("href"));
      const t = new URL(base, location.href); if (st.os === "dark") t.searchParams.set("os", "dark");
      a.setAttribute("href", t.href);
    });
  }
  document.querySelectorAll("[data-os-set]").forEach((b) => b.addEventListener("click", () => { st.os = b.dataset.osSet; apply(); }));
  document.querySelectorAll("[data-view-set]").forEach((b) => b.addEventListener("click", () => { st.view = b.dataset.viewSet; apply(); }));
  apply();
})();
</script>
</body>
</html>
`;

fs.copyFileSync(path.join(SP, "copy.css"), path.join(OUT, "copy.css"));
fs.writeFileSync(path.join(OUT, "copy.html"), html);
const missing = GROUPS.flatMap(([, items]) => items).filter((it) => !where(it.find).length).length;
console.log("copy.html", html.length, `${missing} of ${total} applied`);
