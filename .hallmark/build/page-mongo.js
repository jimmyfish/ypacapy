  // MongoDB console: Query 1 to 5 are tabs on this page; orders opens the collection screen.
  // Results show as JSON (the default: documents, as cards that fold) or Table (top-level fields); the pick is kept across tabs.
  const run = $("#run");
  let tab = "q1", state = "full", sub = "results", as = "json", q3Fixed = false;
  const NAMES = { q1: ["Refunds by customer", "Saved queries / Reports"], q2: ["Query 2", "Not saved"], q3: ["Query 3", "Not saved"], q4: ["Old carts", "Saved queries / Ops"], q5: ["Daily revenue", "Saved queries / Reports"] };
  const MS = { q1: "41 ms", q2: "12 ms", q3: "9 ms", q4: "86 ms", q5: "1.2 s" };
  // Paging: only a run ypacapy added the row limit to. Query 1's aggregate has no $limit (9 documents, then an empty page);
  // Query 3's find has no .limit() (20, then 8, then an empty page); Query 2 has .limit(50), so no pager. The preview's row limit
  // is 20; Next turns off only after a page comes back empty (nothing is counted). Next runs it again with .skip(20).limit(20), or { $skip }, { $limit } at the pipeline's end.
  const LIMIT = 20;
  const PAGED = { q1: { pages: { 0: 9 } }, q3: { pages: { 0: 20, 20: 8 }, hint: "No sort, so documents can shift between pages" } };
  const off = { q1: 0, q3: 0 };
  const restState = (t) => (t === "q3" && !q3Fixed ? "error" : t === "q4" || t === "q5" ? "idle" : "full");
  const count = (t) => $$(`.state[data-for="${t}"][data-as="table"] tbody tr`).length;
  function render() {
    $$(".tab[data-tab]").forEach((t) => t.toggleAttribute("aria-current", t.dataset.tab === tab) && t.setAttribute("aria-current", "page"));
    ["q1", "q2", "q3", "q4", "q5"].forEach((q) => { $(`#code-${q}`).hidden = tab !== q; });
    $("#q-name").textContent = NAMES[tab][0]; $("#q-path").textContent = NAMES[tab][1];
    { const saved = tab !== "q2" && tab !== "q3", sv = $("#save"); sv.disabled = saved; sv.dataset.saved = String(saved); $(".save-label", sv).textContent = saved ? "Saved" : "Save"; sv.title = saved ? "No changes since the last save" : "Save  ⌘S"; }
    $$(".subtab[data-sub]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.sub === sub)));
    $$(".response .state").forEach((s) => {
      const w = s.dataset.when;
      s.hidden = sub === "messages" ? w !== "messages" : !(w === state && (!s.dataset.for || s.dataset.for === tab) && (!s.dataset.as || s.dataset.as === as) && (!s.dataset.page || Number(s.dataset.page) === (off[tab] ?? 0)));
    });
    $$(".seg [data-as]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.as === as)));
    // "Go to a column" only means something in Table
    $$('.res-actions [data-menu$="-cols"]').forEach((b) => { b.closest(".menu-anchor").hidden = as !== "table"; });
    $(".res-tools").hidden = sub === "messages" || (state !== "full" && state !== "nomore");
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy;
    const meta = { full: ["ok", "OK", MS[tab], PAGED[tab] ? `limit ${LIMIT}` : ""], nomore: ["ok", "OK", "8 ms", `limit ${LIMIT}`], written: ["ok", "OK", MS[tab]], empty: ["ok", "OK", "21 ms"], error: ["fail", "Error", "3 ms"], lost: ["fail", "No primary", "30 s"], loading: ["dim", "Running", ""], idle: ["dim", "Not run", ""] }[state];
    $("#r-meta").innerHTML = `<span class="${meta[0]}">${meta[1]}</span>${meta[2] ? `<span class="dim">${meta[2]}</span>` : ""}${meta[3] ? `<span class="dim">${meta[3]}</span>` : ""}`;
    const p = PAGED[tab], rows = p && state === "full" ? p.pages[off[tab]] ?? 0 : 0;
    $("#r-n").textContent = state === "full" ? String(p ? rows : count(tab)) : state === "empty" || state === "nomore" ? "0" : "";
    $("#r-n").hidden = !$("#r-n").textContent;
    // the pager: under the results of a paged run, on its pages and on "No more documents"
    const pg = $("#q-pager");
    pg.hidden = !p || sub !== "results" || !(state === "full" || state === "nomore");
    $("#q-refresh").hidden = !p || !(state === "full" || state === "nomore");
    if (!pg.hidden) {
      const o = off[tab];
      // the rows on screen as a range; nothing is counted, so there is no "of N"
      $("#q-range").textContent = rows ? `${o + 1} – ${o + rows}` : "No more documents";
            $("#q-hint").textContent = $("#q-hint").title = p.hint ?? ""; $("#q-hint").hidden = !p.hint;
      $("#q-prev").disabled = o === 0;
      // no count, no guess from a short page: Next stays on until a page comes back empty
      $("#q-next").disabled = rows === 0;
    }
  }
  $$(".tab[data-tab] .tab-main:not([data-href])").forEach((b) => b.addEventListener("click", () => { tab = b.closest(".tab").dataset.tab; state = restState(tab); render(); }));
  $$(".subtab[data-sub]").forEach((s) => s.addEventListener("click", () => { sub = s.dataset.sub; render(); }));
  $$(".seg [data-as]").forEach((b) => b.addEventListener("click", () => { as = b.dataset.as; render(); }));

  // Write guard: deleteMany (Query 4) and an aggregate ending in $merge (Query 5) are writes; at Low Run asks to
  // confirm, at Strict for the passphrase. Everything else is a read and runs.
  const level = () => $("#guard-btn").dataset.level;
  const setLevel = (lvl) => $(`[data-guard="${lvl}"]`).click();
  // [what, why it asks, cannot be undone]: deleteMany deletes; $merge with whenMatched: "replace" overwrites
  const KINDS = { q4: ["deleteMany", "It changes data on events_prod:", true], q5: ["$merge", "It writes to daily_revenue on events_prod:", true] };
  function ask(t) {
    const dlg = $(level() === "strict" ? "#guard-pass-dlg" : "#guard-confirm-dlg");
    $("[data-kinds]", dlg).innerHTML = `<code class="stmt">${KINDS[t][0]}</code>`;
    $(".help", dlg).textContent = KINDS[t][1];
    dlg.dataset.final = String(KINDS[t][2]);
    dlg.hidden = false; $("input, button[type=submit]", dlg).focus();
  }
  let timer;
  function runQuery(confirmed = false) {
    if (state === "loading") return;
    if (KINDS[tab] && !confirmed && level() !== "none") { ask(tab); return; }
    if (PAGED[tab]) off[tab] = 0;
    sub = "results"; state = "loading"; render();
    timer = setTimeout(() => {
      state = tab === "q3" && !q3Fixed ? "error" : KINDS[tab] ? "written" : "full";
      if (tab === "q5") { $("#w-title").textContent = "Merged 31 documents into daily_revenue"; $("#w-raw").textContent = "31 inserted, 0 replaced"; }
      if (tab === "q4") { $("#w-title").textContent = "Deleted 312 documents from carts"; $("#w-raw").textContent = "{ acknowledged: true, deletedCount: 312 }"; }
      render();
    }, 700);
  }
  run.addEventListener("click", () => runQuery());
  // a page is the same query run again with a skip; past the last document it says so
  function page(o) {
    if (state === "loading") return;
    off[tab] = Math.max(0, o);
    state = "loading"; render();
    timer = setTimeout(() => { state = PAGED[tab].pages[off[tab]] ? "full" : "nomore"; render(); }, 500);
  }
  $("#q-prev").addEventListener("click", () => page(off[tab] - LIMIT));
  $("#q-next").addEventListener("click", () => page(off[tab] + LIMIT));
  $("#q-refresh").addEventListener("click", () => page(off[tab]));
  $("#cancel").addEventListener("click", () => { clearTimeout(timer); state = restState(tab); render(); });
  $("#reconnect").addEventListener("click", () => runQuery());
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); runQuery(); } });
  // Query 3: take the hint, rewrite the operator, run again
  const inn = $$("#code-q3 .q-k").find((x) => x.textContent === "$inn");
  $("#q3-fix").addEventListener("click", () => { inn.textContent = "$in"; q3Fixed = true; runQuery(); });
  $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; }));
  $$("#guard-confirm-dlg form, #guard-pass-dlg form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.closest(".backdrop").hidden = true; runQuery(true); }));

  window.pvShow = (k) => {
    clearTimeout(timer); sub = k === "messages" ? "messages" : "results";
    $(`.rail-item[data-rail="${k === "history" ? "history" : "schema"}"]`).click();
    $$("#guard-confirm-dlg, #guard-pass-dlg").forEach((d) => { d.hidden = true; });
    setLevel(k === "guard-pass" ? "strict" : "low");
    const paged = k.startsWith("paged");
    q3Fixed = paged; inn.textContent = paged ? "$in" : "$inn";
    off.q1 = 0; off.q3 = { "paged-last": 20, "paged-none": 40 }[k] ?? 0;
    tab = { paged: "q3", "paged-last": "q3", "paged-none": "q3", find: "q2", table: "q2", error: "q3", "guard-confirm": "q4", "guard-pass": "q4", written: "q4", "guard-merge": "q5" }[k] || "q1";
    as = k === "table" ? "table" : "json";
    state = { running: "loading", empty: "empty", lost: "lost", written: "written", "paged-none": "nomore" }[k] || restState(tab);
    if (k === "written") { $("#w-title").textContent = "Deleted 312 documents from carts"; $("#w-raw").textContent = "{ acknowledged: true, deletedCount: 312 }"; }
    render();
    if (["guard-confirm", "guard-pass", "guard-merge"].includes(k)) ask(tab);
    const at = (el, dx, dy) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + dx, clientY: r.top + dy })); };
    window.mInfo(k);
    if (k === "row-menu") setTimeout(() => { const row = $$(".row").find((r) => $(".row-more", r) && r.offsetParent && /carts/.test(r.textContent)); if (row) at(row, 60, 10); });
  };
