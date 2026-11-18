  // Collection: documents under the query bar, as Table or JSON; the fields seen on this page; indexes. Run re-reads the page: find(filter).sort(sort).limit(20). The filter is read here first, so a typo
  // never reaches the server.
  const run = $("#run"), where = $("#where"), sort = $("#sort"), proj = $("#proj");
  const DEFAULT = where.value;
  // the boxes grow with their text: one line to eight, then they scroll
  const grow = (t) => { t.rows = Math.min(8, Math.max(1, t.value.split("\n").length)); };
  const boxes = [where, proj, sort];
  boxes.forEach((t) => { t.addEventListener("input", () => grow(t)); grow(t); });
  let view = "docs", state = "full", as = "table";
  function render() {
    $$(".subtab[data-view]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.view === view)));
    $$(".response .state").forEach((s) => { s.hidden = view !== "docs" || s.dataset.when !== state; });
    $$("[data-view-of]").forEach((s) => { if (!s.classList.contains("state")) s.hidden = s.dataset.viewOf !== view; });
    $$(".as-pane").forEach((p) => { p.hidden = p.dataset.as !== as; });
    $$(".seg [data-as]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.as === as)));
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy || view !== "docs";
    state === "bad" ? where.setAttribute("aria-invalid", "true") : where.removeAttribute("aria-invalid");
    $("#t-n").textContent = state === "empty" ? "0" : "~48k";
    $("#t-ms").textContent = busy ? "reading" : "7 ms";
  }
  $$(".subtab[data-view]").forEach((s) => s.addEventListener("click", () => { view = s.dataset.view; if (state === "loading") state = "full"; render(); }));
  $$(".seg [data-as]").forEach((b) => b.addEventListener("click", () => { as = b.dataset.as; render(); }));
  // a stand-in for the app's parser: brackets must pair, and two values need a comma between them
  const valid = (v) => { let d = 0; for (const ch of v.replace(/"(?:[^"\\]|\\.)*"/g, '""')) { d += "{[".includes(ch) ? 1 : "}]".includes(ch) ? -1 : 0; if (d < 0) return false; } return d === 0 && !/"\s+"/.test(v); };
  function reload() {
    if (state === "loading") return;
    view = "docs";
    if (!valid(where.value) || (sort.value && !valid(sort.value)) || (proj.value && !valid(proj.value))) { state = "bad"; render(); return; }
    state = "loading"; render();
    setTimeout(() => { state = /"lost"/.test(where.value) ? "empty" : "full"; render(); }, 500);
  }
  run.addEventListener("click", reload);
  // Enter in a box is a new line; ⌘↵ runs (below). The one-line Skip and Limit run on Enter.
  [$("#skip"), $("#limit")].forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter") reload(); }));
  $("#mq-reset").addEventListener("click", () => { where.value = "{}"; proj.value = sort.value = $("#skip").value = ""; $("#limit").value = "20"; boxes.forEach(grow); reload(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); reload(); } });
  $("#t-clear").addEventListener("click", () => { where.value = DEFAULT; reload(); where.focus(); });

  window.pvShow = (k) => {
    view = ["fields", "indexes"].includes(k) ? k : "docs";
    as = k === "json" ? "json" : "table";
    where.value = k === "no-match" ? '{ status: "lost" }' : k === "bad-filter" ? '{ status: { $in: ["paid" "shipped"] } }'
      : k === "multiline" ? '{\n  _id: { $gte: ObjectId("6553a1f2c9e77b0012ab0f1e") },\n  status: { $in: ["paid", "shipped", "refunded"] },\n  "customer.email": { $regex: "@example\\.(net|org)$" }\n}' : DEFAULT;
    sort.value = k === "multiline" ? "{\n  created_at: -1,\n  _id: 1\n}" : "";
    proj.value = k === "multiline" ? "{ items: 0, meta: 0 }" : "";
    boxes.forEach(grow);
    window.mInfo(k);
    state = { "no-match": "empty", loading: "loading", "bad-filter": "bad" }[k] || "full";
    render();
  };
