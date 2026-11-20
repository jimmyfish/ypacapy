  // Query: Query 1 and Query 2 are tabs on this page; orders opens the table screen
  const run = $("#run");
  let tab = "q1", state = "full", sub = "results";
  // Paging: only a run ypacapy added the row limit to (Query 3, select * from customers, has no limit of its own;
  // the others carry theirs). The preview's row limit is 20, as on the table tab. Next runs the query again with
  // limit 20 offset 20; it turns off only after a page comes back empty. Nothing is counted: the bar says Page 3, never of how many.
  const LIMIT = 20;
  const PAGED = { q3: { pages: { 0: 20, 20: 12 }, hint: "No order by, so rows can shift between pages" } };
  const off = { q3: 0 };
  const NAMES = { q1: ["Refunds by customer", "Saved queries / Reports"], q2: ["Query 2", "Not saved"], q3: ["Query 3", "Not saved"], q4: ["Query 4", "Not saved"], q5: ["Query 5", "Not saved"] };
  function render() {
    $$(".tab[data-tab]").forEach((t) => t.toggleAttribute("aria-current", t.dataset.tab === tab) && t.setAttribute("aria-current", "page"));
    ["q1", "q2", "q3", "q4", "q5"].forEach((q) => { $(`#code-${q}`).hidden = tab !== q; });
    $("#q-name").textContent = NAMES[tab][0]; $("#q-path").textContent = NAMES[tab][1];
    { const saved = tab !== "q2" && tab !== "q5", sv = $("#save"); sv.disabled = saved; sv.dataset.saved = String(saved); $(".save-label", sv).textContent = saved ? "Saved" : "Save"; sv.title = saved ? "No changes since the last save" : "Save  ⌘S"; }
    if (tab !== "q5") window.acClose?.();
    $$(".subtab[data-sub]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.sub === sub)));
    $$(".response .state").forEach((s) => {
      const w = s.dataset.when;
      s.hidden = sub === "messages" ? w !== "messages" : !(w === state && (!s.dataset.for || s.dataset.for === tab) && (!s.dataset.page || Number(s.dataset.page) === (off[tab] ?? 0)));
    });
    $(".res-tools").hidden = sub === "messages" || (state !== "full" && state !== "nomore") || tab === "q5";
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy;
    const meta = tab === "q5" && state === "full" ? ["dim", "Not run", ""] : { full: ["ok", "OK", { q1: "38\u00a0ms", q2: "4\u00a0ms", q3: "9\u00a0ms", q4: "3\u00a0ms" }[tab]], empty: ["ok", "OK", "21 ms"], error: ["fail", "Error", "2 ms"], nomore: ["ok", "OK", "7\u00a0ms"], lost: ["fail", "Disconnected", "30.0 s"], loading: ["dim", "Running", ""] }[state];
    $("#r-meta").innerHTML = `<span class="${meta[0]}">${meta[1]}</span>${meta[2] ? `<span class="dim">${meta[2]}</span>` : ""}${PAGED[tab] && state !== "loading" ? `<span class="dim">limit ${LIMIT}</span>` : ""}`;
    const p = PAGED[tab], rows = p && state === "full" ? p.pages[off[tab]] ?? 0 : 0;
    $("#r-n").textContent = state === "full" ? (p ? String(rows) : { q1: "14", q2: "6", q4: "8", q5: "" }[tab]) : state === "empty" || state === "nomore" ? "0" : "";
    $("#r-n").hidden = !$("#r-n").textContent;
    // the pager: under the results of a paged run, on its pages and on "No more rows"
    const pg = $("#q-pager");
    pg.hidden = !p || sub !== "results" || !(state === "full" || state === "nomore");
    if (!pg.hidden) {
      const o = off[tab];
      // the page number only: nothing is counted, so there is no "of N"
      $("#q-range").textContent = `Page ${o / LIMIT + 1}`;
            $("#q-hint").textContent = p.hint; $("#q-hint").hidden = !p.hint;
      $("#q-prev").disabled = o === 0;
      // no count, no guess from a short page: Next stays on until a page comes back empty
      $("#q-next").disabled = rows === 0;
    }
  }
  // a page is the same query run again with an offset; past the last row it says so
  function page(o) {
    if (state === "loading") return;
    off[tab] = Math.max(0, o);
    state = "loading"; render();
    timer = setTimeout(() => { state = PAGED[tab].pages[off[tab]] ? "full" : "nomore"; render(); }, 500);
  }
  $("#q-prev").addEventListener("click", () => page(off[tab] - LIMIT));
  $("#q-next").addEventListener("click", () => page(off[tab] + LIMIT));
  $$(".tab[data-tab] .tab-main:not([data-href])").forEach((b) => b.addEventListener("click", () => {
    tab = b.closest(".tab").dataset.tab;
    state = tab === "q2" && $("#q2-col").textContent === "totl" ? "error" : "full";
    render();
  }));
  $$(".subtab[data-sub]").forEach((s) => s.addEventListener("click", () => { sub = s.dataset.sub; render(); }));
  // Run: the results show the spinner, then the result. The preview has no backend, so it replays the sample.
  let timer;
  function runQuery() {
    if (state === "loading") return;
    if (PAGED[tab]) off[tab] = 0;
    sub = "results"; state = "loading"; render();
    // a run opens a fresh connection if the pool lost its own: when it gets through, the badge and the bar clear
    timer = setTimeout(() => { state = tab === "q2" && $("#q2-col").textContent === "totl" ? "error" : "full"; if (hbState() && hbState() !== "live") hb("live", false); render(); }, 700);
  }
  run.addEventListener("click", runQuery);
  $("#cancel").addEventListener("click", () => { clearTimeout(timer); state = PAGED[tab] && !PAGED[tab].pages[off[tab]] ? "nomore" : "full"; render(); });
  $("#reconnect").addEventListener("click", () => { if (hbState() === "down") hb("live", false); runQuery(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); runQuery(); } });
  // Query 2: take the hint, rewrite the column, run again
  $("#q2-fix").addEventListener("click", () => { const c = $("#q2-col"); c.textContent = "total"; c.classList.remove("q-err"); runQuery(); });

  $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; }));
  $$("#guard-confirm-dlg form, #guard-pass-dlg form, #guard-warn-dlg form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.closest(".backdrop").hidden = true; }));
  // History: Clear asks first and empties only this connection's list
  const hcDlg = $("#hist-clear-dlg");
  function histEmpty(none) { $("#hist-list").hidden = none; $("#hist-none").hidden = !none; $("#hist-clear").disabled = none; }
  $("#hist-clear").addEventListener("click", () => { hcDlg.hidden = false; });
  $$("[data-hc-close]").forEach((b) => b.addEventListener("click", () => { hcDlg.hidden = true; }));
  $("#hist-clear-dlg form").addEventListener("submit", (e) => { e.preventDefault(); hcDlg.hidden = true; histEmpty(true); });
  // Connection status at the foot of the sidebar (heartbeat on only), and the idle-drop bar.
  // connecting: first open; connected: the last ping answered; down: no answer (a lost run says so too);
  // retry: reconnecting. Off (the plain "Connection lost" state): no status line at all.
  const CS = {
    connecting: ["Connecting", "Opening a connection to localhost:5432"],
    live: ["Connected", "Heartbeat: select 1 answered 8 s ago"],
    down: ["Disconnected", "Heartbeat: no answer from localhost:5432"],
    retry: ["Reconnecting", "Reconnecting to localhost:5432"],
  };
  const CS_KEY = { connecting: "connecting", live: "connected", down: "disconnected", retry: "reconnecting" };
  // the same mark on a connection's tab in the title strip, front or not
  function tabCs(name, st) {
    const m = $(`.cs-tab[data-cs-conn="${name}"]`);
    if (!m) return;
    m.dataset.cs = CS_KEY[st]; m.title = CS[st][0]; m.setAttribute("aria-label", `${name}: ${CS[st][0]}`);
  }
  function hb(st, bar) {
    $$(".conn-status").forEach((el) => {
      el.dataset.cs = CS_KEY[st]; el.title = CS[st][1];
      $(".cs-label", el).textContent = CS[st][0];
    });
    tabCs("shop_prod", st);
    $("#hb-bar").hidden = !bar;
    $$("#hb-bar [data-hb-say]").forEach((x) => { x.hidden = x.dataset.hbSay !== st; });
    $("#hb-reconnect").disabled = st === "retry";
    $(".hb-note").hidden = st !== "down" || bar;
  }
  const hbState = () => ({ connected: "live", disconnected: "down", reconnecting: "retry", connecting: "connecting" })[$(".conn-status")?.dataset.cs];
  let hbTimer;
  $("#hb-reconnect").addEventListener("click", () => { hb("retry", true); hbTimer = setTimeout(() => hb("live", false), 900); });
  window.pvShow = (k) => {
    clearTimeout(timer); clearTimeout(hbTimer); sub = "results";
    hb({ "hb-run": "down", "hb-idle": "down", "hb-retry": "retry", "hb-connecting": "connecting" }[k] ?? "live", k === "hb-idle" || k === "hb-retry");
    // "Connection lost" is the heartbeat-off case: no status line at all
    $$(".conn-status").forEach((el) => { el.hidden = k === "lost"; });
    const front = $('.cs-tab[data-cs-conn="shop_prod"]'); if (front) front.hidden = k === "lost";
    // legacy_cms, open behind shop_prod: its tab is the only place its drop shows
    tabCs("legacy_cms", k === "hb-bg" ? "down" : "live");
    const hist = k.startsWith("history");
    $(`.rail-item[data-rail="${hist ? "history" : "schema"}"]`).click();
    histEmpty(k === "history-none");
    hcDlg.hidden = k !== "history-clear";
    tab = k.startsWith("ac-") ? "q5" : { "sql-error": "q2", wide: "q3", long: "q4", paged: "q3", "paged-last": "q3", "paged-none": "q3" }[k] || "q1";
    off.q3 = { "paged-last": 20, "paged-none": 40 }[k] ?? 0;
    if (k === "sql-error") { const c = $("#q2-col"); c.textContent = "totl"; c.classList.add("q-err"); }
    // the guard's two asks
    const dlg = { "guard-confirm": "guard-confirm-dlg", "guard-pass": "guard-pass-dlg", "guard-pass-touch": "guard-pass-dlg", "guard-pass-wrong": "guard-pass-dlg", "warn-limit": "guard-warn-dlg", "warn-update": "guard-warn-dlg", "warn-update-strict": "guard-pass-dlg" }[k];
    // the connection's warnings: they ask at any security level; at Strict the passphrase ask carries them
    $$("#guard-warn-dlg [data-warn]").forEach((w) => { w.hidden = w.dataset.warn !== (k === "warn-update" ? "update" : "limit"); });
    const strictWarn = k === "warn-update-strict";
    $("#guard-pass-warn").hidden = !strictWarn;
    $("#guard-pass-kind").textContent = strictWarn ? "UPDATE" : "DELETE";
    // Use Touch ID only when Settings > Security > Allow Touch ID is on
    $("#guard-touch").hidden = k !== "guard-pass-touch";
    $$("#guard-confirm-dlg, #guard-pass-dlg, #guard-warn-dlg").forEach((d) => { d.hidden = d.id !== dlg; });
    const pin = $("#guard-pass-in"), wrong = k === "guard-pass-wrong";
    pin.value = wrong ? "hunter2" : ""; wrong ? pin.setAttribute("aria-invalid", "true") : pin.removeAttribute("aria-invalid");
    $("#guard-pass-err").hidden = !wrong;
    state = { history: "full", "history-clear": "full", "history-none": "full", "level-menu": "full", "guard-confirm": "full", "guard-pass": "full", "guard-pass-touch": "full", "guard-pass-wrong": "full", "warn-limit": "full", "warn-update": "full", "warn-update-strict": "full", "cell-menu": "full", "row-menu": "full", results: "full", running: "loading", empty: "empty", "sql-error": "error", lost: "lost", "hb-run": "lost", "hb-live": "full", "hb-idle": "full", "hb-retry": "full", wide: "full", long: "full", "paged-none": "nomore" }[k] ?? "full";
    render();
    if (k.startsWith("ac-")) window.acShow(k);
    // the two right-click menus, opened as a right-click would
    const at = (el, dx, dy) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + dx, clientY: r.top + dy })); };
    if (k === "level-menu") setTimeout(() => $("#guard-btn").click());
    if (k === "tab-menu") setTimeout(() => { const t = $('.tab[data-tab="q1"]'); if (t) at(t, 40, 14); });
    if (k === "cell-menu") setTimeout(() => { const td = $$("#res-q1 tbody tr")[2]?.cells[2] ?? $$(".grid-wrap[tabindex] tbody td:not(.rownum)").find((x) => x.offsetParent)?.closest("tr")?.cells[2]; if (td) at(td, 24, 12); });
    if (k === "row-menu") setTimeout(() => { const row = $$(".row").find((r) => $(".row-more", r) && r.offsetParent && /order_items/.test(r.textContent)); if (row) at(row, 60, 10); });
  };
