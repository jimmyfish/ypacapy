  // Redis console: Query 1 to 5 are tabs on this page; user:3107 opens the key tab.
  // Replies show as Table (one row per element, or per pair for WITHSCORES and HGETALL) or Raw (as redis-cli prints them);
  // the pick is kept across tabs.
  const run = $("#run");
  let tab = "q1", state = "full", sub = "results", as = "table", q3Fixed = false, q5Scan = false;
  const NAMES = { q1: ["Weekly top ten", "Saved queries / Growth"], q2: ["Query 2", "Not saved"], q3: ["Query 3", "Not saved"], q4: ["Stale carts", "Saved queries / Ops"], q5: ["Query 5", "Not saved"] };
  const MS = { q1: "2 ms", q2: "1 ms", q3: "1 ms", q4: "1 ms", q5: "3 ms" };
  const NOTE = { q5: () => (q5Scan ? "SCAN, cursor 917504" : "KEYS, 1.9 s") };
  const restState = (t) => (t === "q3" && !q3Fixed ? "error" : t === "q4" || t === "q5" ? "idle" : "full");
  const count = (t) => $$(`.state[data-for="${t}"][data-as="table"] tbody tr`).length;
  function render() {
    $$(".tab[data-tab]").forEach((t) => t.toggleAttribute("aria-current", t.dataset.tab === tab) && t.setAttribute("aria-current", "page"));
    ["q1", "q2", "q3", "q4", "q5"].forEach((q) => { $(`#code-${q}`).hidden = tab !== q; });
    $("#q-name").textContent = NAMES[tab][0]; $("#q-path").textContent = NAMES[tab][1];
    { const saved = tab === "q1" || tab === "q4", sv = $("#save"); sv.disabled = saved; sv.dataset.saved = String(saved); $(".save-label", sv).textContent = saved ? "Saved" : "Save"; sv.title = saved ? "No changes since the last save" : "Save  ⌘S"; }
    $$(".subtab[data-sub]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.sub === sub)));
    $$(".response .state").forEach((s) => {
      const w = s.dataset.when;
      s.hidden = sub === "messages" ? w !== "messages" : !(w === state && (!s.dataset.for || s.dataset.for === tab) && (!s.dataset.as || s.dataset.as === as));
    });
    $$(".seg [data-as]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.as === as)));
    $(".res-tools").hidden = sub === "messages" || state !== "full";
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy;
    const meta = { full: ["ok", "OK", MS[tab], NOTE[tab]?.()], written: ["ok", "OK", MS[tab]], empty: ["ok", "(nil)", "1 ms"], error: ["fail", "WRONGTYPE", "1 ms"], lost: ["fail", "Connection lost", "0.2 s"], loading: ["dim", "Running", ""], idle: ["dim", "Not run", ""] }[state];
    $("#r-meta").innerHTML = `<span class="${meta[0]}">${meta[1]}</span>${meta[2] ? `<span class="dim">${meta[2]}</span>` : ""}${meta[3] ? `<span class="dim">${meta[3]}</span>` : ""}`;
    $("#r-n").textContent = state === "full" ? String(count(tab)) : "";
    $("#r-n").hidden = !$("#r-n").textContent;
  }
  $$(".tab[data-tab] .tab-main:not([data-href])").forEach((b) => b.addEventListener("click", () => { tab = b.closest(".tab").dataset.tab; state = restState(tab); render(); }));
  $$(".subtab[data-sub]").forEach((s) => s.addEventListener("click", () => { sub = s.dataset.sub; render(); }));
  $$(".seg [data-as]").forEach((b) => b.addEventListener("click", () => { as = b.dataset.as; render(); }));

  // Write guard: DEL (Query 4) writes; KEYS (Query 5) is a read that holds the server, so it is on the list too and the
  // ask offers SCAN instead. At Low Run asks to confirm, at Strict for the passphrase. Everything else runs.
  const level = () => $("#guard-btn").dataset.level;
  const setLevel = (lvl) => $(`[data-guard="${lvl}"]`).click();
  const KINDS = { q4: ["DEL", "It removes keys on cache_prod:", false], q5: ["KEYS", "It reads all 1,204,331 keys in db0, and cache_prod answers no one else until it is done:", true] };
  function ask(t) {
    const dlg = $(level() === "strict" ? "#guard-pass-dlg" : "#guard-confirm-dlg");
    $("[data-kinds]", dlg).innerHTML = `<code class="stmt">${KINDS[t][0]}</code>`;
    $(".help", dlg).textContent = KINDS[t][1];
    $("[data-use-scan]", dlg).hidden = !KINDS[t][2];
    $("[data-run-label]", dlg).textContent = KINDS[t][2] ? "Run KEYS" : "Run";
    // DEL cannot be undone; KEYS is a read, so it does not say so
    dlg.dataset.final = String(!KINDS[t][2]);
    dlg.hidden = false; $("input, button[type=submit]", dlg).focus();
  }
  let timer;
  function runQuery(confirmed = false) {
    if (state === "loading") return;
    if (KINDS[tab] && !(tab === "q5" && q5Scan) && !confirmed && level() !== "none") { ask(tab); return; }
    sub = "results"; state = "loading"; render();
    timer = setTimeout(() => {
      state = tab === "q3" && !q3Fixed ? "error" : tab === "q4" ? "written" : "full";
      render();
    }, 700);
  }
  run.addEventListener("click", () => runQuery());
  $("#cancel").addEventListener("click", () => { clearTimeout(timer); state = restState(tab); render(); });
  $("#reconnect").addEventListener("click", () => runQuery());
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); runQuery(); } });
  // Query 3: take the hint, read the hash with HGETALL, run again
  const swap = (id, fixed) => { const el = $(`#code-${id}`); el.innerHTML = fixed ? el.dataset.fixed : el.dataset.orig; };
  $("#q3-fix").addEventListener("click", () => { swap("q3", true); q3Fixed = true; runQuery(); });
  // Query 5: Use SCAN instead rewrites KEYS to the first SCAN step, which needs no ask
  $$("[data-use-scan]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; swap("q5", true); q5Scan = true; runQuery(); }));
  $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; }));
  $$("#guard-confirm-dlg form, #guard-pass-dlg form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.closest(".backdrop").hidden = true; runQuery(true); }));

  window.pvShow = (k) => {
    clearTimeout(timer); sub = k === "messages" ? "messages" : "results";
    $(`.rail-item[data-rail="${k === "history" ? "history" : "schema"}"]`).click();
    $$("#guard-confirm-dlg, #guard-pass-dlg").forEach((d) => { d.hidden = true; });
    setLevel(k === "guard-pass" ? "strict" : "low");
    q3Fixed = false; swap("q3", false); q5Scan = false; swap("q5", false);
    tab = { hgetall: "q2", raw: "q2", error: "q3", "guard-confirm": "q4", "guard-pass": "q4", written: "q4", keys: "q5", "guard-keys": "q5" }[k] || "q1";
    as = k === "raw" ? "raw" : "table";
    state = { running: "loading", nil: "empty", lost: "lost", written: "written" }[k] || restState(tab);
    render();
    if (["guard-confirm", "guard-pass", "guard-keys"].includes(k)) ask(tab);
    $("#tree-filter").value = k === "tree-empty" ? "order:*" : ""; window.rTtlOnly(k === "expiring");
    const at = (el, dx, dy) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + dx, clientY: r.top + dy })); };
    window.mInfo(k);
    if (k === "row-menu") setTimeout(() => { const row = $$(".row").find((r) => r.dataset.key === "user:3107"); if (row) at(row, 60, 10); });
  };
