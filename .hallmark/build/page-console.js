// Console history: the bar at the foot of the work area. Closed it is one line (the count and the last statement);
// ⌘J or the chevron opens the log. Newest at the bottom, like a terminal; a row opens to its whole statement.
const ch = $("#ch"), body = $("#ch-body"), tools = $("#ch-tools"), peek = $("#ch-peek");
const lists = { pg: $("#ch-pg"), mongo: $("#ch-mongo"), redis: $("#ch-redis") };
const filt = { who: "all", pings: false, errs: false, q: "" };
let engine = "pg", cleared = false;
const list = () => lists[engine];

function chOpen(open) {
  ch.dataset.open = String(open);
  body.hidden = !open; tools.hidden = !open; peek.hidden = open;
  $("#ch-toggle").setAttribute("aria-expanded", String(open));
  $("#ch-chev").setAttribute("aria-label", open ? "Close console history" : "Open console history");
  if (open) list().scrollTop = list().scrollHeight;
}
function chApply() {
  Object.entries(lists).forEach(([k, l]) => { l.hidden = k !== engine || cleared; });
  let shown = 0, total = 0;
  $$(".ch-row", list()).forEach((r) => {
    const ping = r.dataset.flag === "ping";
    if (!ping) total++;
    const ok = (filt.who === "all" || r.dataset.who === filt.who) && (filt.pings || !ping) && (!filt.errs || r.dataset.flag === "err")
      && (!filt.q || r.textContent.toLowerCase().includes(filt.q.toLowerCase()));
    r.hidden = !ok; if (ok) shown++;
  });
  $("#ch-n").textContent = cleared ? "0" : String(total);
  $("#ch-none").hidden = !cleared;
  $("#ch-nomatch").hidden = cleared || shown > 0;
  $$("[data-ch-who]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.chWho === filt.who)));
  $("#ch-pings").setAttribute("aria-pressed", String(filt.pings));
  $("#ch-errs").setAttribute("aria-pressed", String(filt.errs));
  $("#ch-q").value = filt.q;
  peek.style.visibility = cleared ? "hidden" : "";
}

$("#ch-toggle").addEventListener("click", () => chOpen(ch.dataset.open !== "true"));
$("#ch-chev").addEventListener("click", () => chOpen(ch.dataset.open !== "true"));
window.addEventListener("keydown", (e) => { if (e.metaKey && e.code === "KeyJ") { e.preventDefault(); chOpen(ch.dataset.open !== "true"); } });
$$("[data-ch-who]").forEach((b) => b.addEventListener("click", () => { filt.who = b.dataset.chWho; chApply(); }));
$("#ch-pings").addEventListener("click", () => { filt.pings = !filt.pings; chApply(); });
$("#ch-errs").addEventListener("click", () => { filt.errs = !filt.errs; chApply(); });
$("#ch-q").addEventListener("input", (e) => { filt.q = e.target.value; chApply(); });
$("#ch-clear").addEventListener("click", () => { cleared = true; chApply(); });
body.addEventListener("click", (e) => {
  const line = e.target.closest(".ch-line"); if (!line) return;
  const x = document.getElementById(line.getAttribute("aria-controls"));
  const open = line.getAttribute("aria-expanded") !== "true";
  line.setAttribute("aria-expanded", String(open)); x.hidden = !open;
});
// drag the top edge: between 120 px and most of the work area
{
  const grip = $(".ch-grip");
  grip.addEventListener("pointerdown", (e) => {
    if (ch.dataset.open !== "true") return;
    grip.setPointerCapture(e.pointerId);
    const y0 = e.clientY, h0 = body.getBoundingClientRect().height, max = $(".work").getBoundingClientRect().height - 160;
    const move = (ev) => { body.style.height = `${Math.max(120, Math.min(max, h0 + y0 - ev.clientY))}px`; };
    const up = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); };
    grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
  });
}

const CONN = { pg: ["shop_prod", "Nothing sent to shop_prod yet"], mongo: ["shop_docs", ""], redis: ["cache", ""] };
window.pvShow = (k) => {
  Object.assign(filt, { who: "all", pings: false, errs: false, q: "" });
  cleared = k === "none";
  engine = k === "mongo" ? "mongo" : k === "redis" ? "redis" : "pg";
  $("#ch-conn strong").textContent = CONN[engine][0];
  if (k === "you" || k === "app") filt.who = k;
  if (k === "pings") filt.pings = true;
  if (k === "filter") filt.q = "orders";
  if (k === "nomatch") filt.q = "invoices";
  body.style.height = k === "tall" ? "420px" : "";
  $$(".ch-line").forEach((l) => { l.setAttribute("aria-expanded", "false"); document.getElementById(l.getAttribute("aria-controls")).hidden = true; });
  chApply();
  chOpen(k !== "closed");
  if (k === "expand") {
    const err = $('.ch-row[data-flag="err"] .ch-line', list());
    err.click(); err.scrollIntoView({ block: "center" });
  }
};
