  // Query: Query 1 and Query 2 are tabs on this page; orders opens the table screen
  const run = $("#run"), spin = $("#run .spinner");
  let tab = "q1", state = "full", sub = "results";
  const NAMES = { q1: ["Refunds by customer", "Saved queries / Reports"], q2: ["Query 2", "Not saved"], q3: ["Query 3", "Not saved"], q4: ["Query 4", "Not saved"] };
  function render() {
    $$(".tab[data-tab]").forEach((t) => t.toggleAttribute("aria-current", t.dataset.tab === tab) && t.setAttribute("aria-current", "page"));
    ["q1", "q2", "q3", "q4"].forEach((q) => { $(`#code-${q}`).hidden = tab !== q; });
    $("#q-name").textContent = NAMES[tab][0]; $("#q-path").textContent = NAMES[tab][1];
    $("#save-state").hidden = tab === "q2";
    $$(".subtab[data-sub]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.sub === sub)));
    $$(".response .state").forEach((s) => {
      const w = s.dataset.when;
      s.hidden = sub === "messages" ? w !== "messages" : !(w === state && (!s.dataset.for || s.dataset.for === tab));
    });
    $(".res-tools").hidden = sub === "messages" || state !== "full";
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); spin.hidden = !busy;
    const meta = { full: ["ok", "OK", { q1: "38\u00a0ms", q2: "4\u00a0ms", q3: "9\u00a0ms", q4: "3\u00a0ms" }[tab]], empty: ["ok", "OK", "21 ms"], error: ["fail", "Error", "2 ms"], lost: ["fail", "Disconnected", "30.0 s"], loading: ["dim", "Running", ""] }[state];
    $("#r-meta").innerHTML = `<span class="${meta[0]}">${meta[1]}</span>${meta[2] ? `<span class="dim">${meta[2]}</span>` : ""}<span class="dim">limit 500</span>`;
    $("#r-n").textContent = state === "full" ? ({ q1: "14", q2: "6", q3: "12", q4: "8" }[tab]) : state === "empty" ? "0" : "";
    $("#r-n").hidden = !$("#r-n").textContent;
  }
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
    sub = "results"; state = "loading"; render();
    timer = setTimeout(() => { state = tab === "q2" && $("#q2-col").textContent === "totl" ? "error" : "full"; render(); }, 700);
  }
  run.addEventListener("click", runQuery);
  $("#cancel").addEventListener("click", () => { clearTimeout(timer); state = "full"; render(); });
  $("#reconnect").addEventListener("click", runQuery);
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); runQuery(); } });
  // Query 2: take the hint, rewrite the column, run again
  $("#q2-fix").addEventListener("click", () => { const c = $("#q2-col"); c.textContent = "total"; c.classList.remove("q-err"); runQuery(); });

  $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; }));
  $$("#guard-confirm-dlg form, #guard-pass-dlg form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.closest(".backdrop").hidden = true; }));
  // History: Clear asks first and empties only this connection's list
  const hcDlg = $("#hist-clear-dlg");
  function histEmpty(none) { $("#hist-list").hidden = none; $("#hist-none").hidden = !none; $("#hist-clear").disabled = none; }
  $("#hist-clear").addEventListener("click", () => { hcDlg.hidden = false; });
  $$("[data-hc-close]").forEach((b) => b.addEventListener("click", () => { hcDlg.hidden = true; }));
  $("#hist-clear-dlg form").addEventListener("submit", (e) => { e.preventDefault(); hcDlg.hidden = true; histEmpty(true); });
  window.pvShow = (k) => {
    clearTimeout(timer); sub = "results";
    const hist = k.startsWith("history");
    $(`.rail-item[data-rail="${hist ? "history" : "schema"}"]`).click();
    histEmpty(k === "history-none");
    hcDlg.hidden = k !== "history-clear";
    tab = { "sql-error": "q2", wide: "q3", long: "q4" }[k] || "q1";
    if (k === "sql-error") { const c = $("#q2-col"); c.textContent = "totl"; c.classList.add("q-err"); }
    // the guard's two asks
    const dlg = { "guard-confirm": "guard-confirm-dlg", "guard-pass": "guard-pass-dlg", "guard-pass-touch": "guard-pass-dlg", "guard-pass-wrong": "guard-pass-dlg" }[k];
    // Use Touch ID only when Settings > Security > Open with Touch ID is on
    $("#guard-touch").hidden = k !== "guard-pass-touch";
    $$("#guard-confirm-dlg, #guard-pass-dlg").forEach((d) => { d.hidden = d.id !== dlg; });
    const pin = $("#guard-pass-in"), wrong = k === "guard-pass-wrong";
    pin.value = wrong ? "hunter2" : ""; wrong ? pin.setAttribute("aria-invalid", "true") : pin.removeAttribute("aria-invalid");
    $("#guard-pass-err").hidden = !wrong;
    state = { history: "full", "history-clear": "full", "history-none": "full", "level-menu": "full", "guard-confirm": "full", "guard-pass": "full", "guard-pass-touch": "full", "guard-pass-wrong": "full", "cell-menu": "full", "row-menu": "full", results: "full", running: "loading", empty: "empty", "sql-error": "error", lost: "lost", wide: "full", long: "full" }[k];
    render();
    // the two right-click menus, opened as a right-click would
    const at = (el, dx, dy) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + dx, clientY: r.top + dy })); };
    if (k === "level-menu") setTimeout(() => $("#guard-btn").click());
    if (k === "cell-menu") setTimeout(() => { const td = $$("#res-q1 tbody tr")[2]?.cells[2] ?? $$(".grid-wrap[tabindex] tbody td:not(.rownum)").find((x) => x.offsetParent)?.closest("tr")?.cells[2]; if (td) at(td, 24, 12); });
    if (k === "row-menu") setTimeout(() => { const row = $$(".row").find((r) => $(".row-more", r) && r.offsetParent && /order_items/.test(r.textContent)); if (row) at(row, 60, 10); });
  };
