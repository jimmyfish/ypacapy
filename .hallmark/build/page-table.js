  // Table: rows under a where filter, its columns, its indexes and keys; Run re-reads the rows with the filter
  const run = $("#run"), spin = $("#run .spinner"), where = $("#where");
  const DEFAULT_WHERE = "status in ('paid', 'shipped', 'refunded')";
  let view = "rows", state = "full";
  function render() {
    $$(".subtab[data-view]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.view === view)));
    $$(".response .state").forEach((s) => { s.hidden = view !== "rows" || s.dataset.when !== state; });
    $$("[data-view-of]").forEach((s) => { if (!s.classList.contains("state")) s.hidden = s.dataset.viewOf !== view; });
    run.disabled = view !== "rows";
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); spin.hidden = !busy;
    $("#t-n").textContent = state === "empty" ? "0" : "~12k";
    $("#t-ms").textContent = busy ? "reading" : "6 ms";
  }
  $$(".subtab[data-view]").forEach((s) => s.addEventListener("click", () => { view = s.dataset.view; if (state === "loading") state = "full"; render(); }));
  function reload() {
    if (state === "loading") return;
    view = "rows"; state = "loading"; render();
    setTimeout(() => { state = /'lost'/.test(where.value) ? "empty" : "full"; render(); }, 500);
  }
  run.addEventListener("click", reload);
  where.addEventListener("keydown", (e) => { if (e.key === "Enter") reload(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); reload(); } });
  $("#t-clear").addEventListener("click", () => { where.value = DEFAULT_WHERE; reload(); where.focus(); });

  window.pvShow = (k) => {
    view = ["columns", "indexes"].includes(k) ? k : "rows";
    where.value = k === "no-match" ? "status = 'lost'" : DEFAULT_WHERE;
    state = { "no-match": "empty", loading: "loading" }[k] || "full";
    render();
  };
