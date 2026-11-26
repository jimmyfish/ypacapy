// Task manager: Query 1 is running under it all, so the result pane shows Running and Run spins.
// The timers tick for real. Stop asks the server (drawn as a wait), then the run leaves the list.
{
  $$(".response .state").forEach((s) => { s.hidden = s.dataset.when !== "loading"; });
  const run = $("#run"); run?.setAttribute("aria-busy", ""); if (run) run.disabled = true;
  const meta = $("#r-meta"); if (meta) meta.innerHTML = '<span class="dim">Running</span>';
  $("#q-pager")?.setAttribute("hidden", "");
}
const anchor = $("[data-tm-anchor]"), chip = $("[data-tm-chip]"), pop = $(".tm-pop"), dlg = $("#tm-dlg");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const t0 = Date.now();
const rowsOf = (id) => $$(`[data-run="${id}"]`);
const tick = () => {
  const d = Math.floor((Date.now() - t0) / 1000);
  $$("[data-run]").forEach((r) => { const el = $(".tm-time", r); if (!r.hasAttribute("data-stopping") && !r.hasAttribute("data-gone")) el.textContent = mmss(+el.dataset.since + d); });
  const live = $$(".tm-run:not([data-stopped])");
  $("[data-tm-oldest]").textContent = mmss(Math.max(0, ...live.map((r) => +$(".tm-time", r).dataset.since)) + d);
};
setInterval(tick, 1000);

const setPop = (open) => { pop.hidden = !open; chip.setAttribute("aria-expanded", String(open)); };
const openDlg = () => { setPop(false); dlg.hidden = false; };
chip.addEventListener("click", () => setPop(pop.hidden));
$("[data-tm-open]").addEventListener("click", openDlg);
$("[data-tm-idle]").addEventListener("click", openDlg);
$("[data-tm-close]").addEventListener("click", () => { dlg.hidden = true; });
dlg.addEventListener("mousedown", (e) => { if (e.target === dlg) dlg.hidden = true; });
window.addEventListener("mousedown", (e) => { if (!anchor.contains(e.target) && !e.target.closest(".pv-bar")) setPop(false); });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (!dlg.hidden) dlg.hidden = true; else setPop(false); }
  // ⌥⌘A: the popover while something runs, the Task manager when nothing does
  if (e.altKey && e.metaKey && e.code === "KeyA") {
    e.preventDefault();
    if (!dlg.hidden) dlg.hidden = true; else if (anchor.hasAttribute("data-busy")) setPop(pop.hidden); else openDlg();
  }
}, true);
const count = () => {
  const live = $$(".tm-run:not([data-stopped])"), n = live.length;
  $("[data-tm-count]").textContent = `${n} running`;
  $("[data-tm-title]").textContent = n === 1 ? "1 query running" : `${n} queries running`;
  const conns = new Set(live.map((r) => $(".tm-where strong", r).textContent)).size;
  $("[data-tm-sub]").textContent = conns === 1 ? "On 1 connection, from this Mac" : `On ${conns} connections, from this Mac`;
  $("[data-tm-done]").hidden = n > 0;
  $(".tm-runs").hidden = n === 0;
  $("[data-tm-stopall]").disabled = n === 0;
  $(".tm .tm-foot").hidden = n === 0;
  $("[data-tm-n]").textContent = n || "";
  $("[data-tm-none]").hidden = n > 0;
  $(".tm .tm-table-wrap").hidden = n === 0;
  // the last one gone: the popover says so for a moment, then the chip turns back into the Activity button
  if (n === 0) setTimeout(() => { if (!$$(".tm-run:not([data-stopped])").length) { setPop(false); anchor.removeAttribute("data-busy"); } }, 1200);
};
const stop = (id, hold) => {
  const [row, tr] = [$(`.tm-run[data-run="${id}"]`), $(`.tm tr[data-run="${id}"]`)];
  if (!row || row.hasAttribute("data-stopping")) return;
  row.setAttribute("data-stopping", ""); $("[data-stopping]", row).hidden = false;
  if (tr) { tr.setAttribute("data-gone", ""); $(".tm-time", tr).textContent = "stopping…"; }
  if (hold) return;
  setTimeout(() => {
    row.setAttribute("data-stopped", "");
    setTimeout(() => { row.hidden = true; if (tr) tr.hidden = true; count(); }, 220);
  }, 1300);
};
$$(".tm-stop").forEach((b) => b.addEventListener("click", () => stop(b.closest("[data-run]").dataset.run)));
$$(".tm-row-stop").forEach((b) => b.addEventListener("click", () => stop(b.closest("[data-run]").dataset.run)));
const stopAll = () => $$(".tm-run:not([data-stopping])").forEach((r) => stop(r.dataset.run));
$("[data-tm-stopall]").addEventListener("click", stopAll);
$("[data-tm-stopall2]").addEventListener("click", stopAll);

// the bar's states; the update chip's steps come from page-updates.js (its step())
const upd = window.pvShow;
window.pvShow = (k) => {
  $$("[data-run]").forEach((r) => { r.hidden = false; r.removeAttribute("data-stopping"); r.removeAttribute("data-stopped"); r.removeAttribute("data-gone"); });
  $$(".tm-run [data-stopping]").forEach((n) => { n.hidden = true; });
  setPop(false); dlg.hidden = true; anchor.setAttribute("data-busy", "");
  upd("none");
  if (k === "idle") anchor.removeAttribute("data-busy");
  if (k === "pop" || k === "pop-stopping" || k === "pop-one" || k === "upd-pop") setPop(true);
  if (k === "pop-stopping" || k === "tm-stopping") stop("r2", true);
  if (k === "pop-one") ["r2", "r3"].forEach((id) => rowsOf(id).forEach((r) => { r.hidden = true; if (r.matches(".tm-run")) r.setAttribute("data-stopped", ""); }));
  if (k === "tm" || k === "tm-stopping") dlg.hidden = false;
  if (k === "tm-none") { $$(".tm-run").forEach((r) => { r.hidden = true; r.setAttribute("data-stopped", ""); }); anchor.removeAttribute("data-busy"); dlg.hidden = false; }
  if (k.startsWith("upd")) {
    // step() opens the popover for every step past "available"; keep it closed unless the state asks for it
    const st = { upd: "available", "upd-pop": "available", "upd-open": "available-open", "upd-dl": "downloading", "upd-ready": "ready", "upd-idle": "available" }[k];
    upd(st);
    if (k !== "upd-open") { $$("[data-upd] .upd-pop").forEach((p) => { p.hidden = true; }); $$(".upd-chip").forEach((c) => c.setAttribute("aria-expanded", "false")); }
    if (k === "upd-idle") anchor.removeAttribute("data-busy");
  }
  count();
  tick();
};
