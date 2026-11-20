  // Collection: documents under the query bar, as JSON (the default: they are documents) or Table; the fields seen on this page; indexes. Run re-reads the page: find(filter).sort(sort).limit(20). The filter is read here first, so a typo
  // never reaches the server.
  const run = $("#run"), where = $("#where"), sort = $("#sort"), proj = $("#proj");
  const DEFAULT = where.value;
  // the boxes grow with their text: one line to eight, then they scroll
  const grow = (t) => { t.rows = Math.min(8, Math.max(1, t.value.split("\n").length)); };
  const boxes = [where, proj, sort];
  boxes.forEach((t) => { t.addEventListener("input", () => grow(t)); grow(t); });
  let view = "docs", state = "full", as = "json";
  // Options (Project, Sort, Skip, Limit) start folded; the count says how many are set while they are hidden
  const more = $("#mq-more"), optRows = [$("#mq-opts"), $("#mq-paging")];
  const setCount = () => [proj.value.trim(), sort.value.trim(), $("#skip").value.trim() && $("#skip").value.trim() !== "0", $("#limit").value.trim() !== "20"].filter(Boolean).length;
  function setOpts(open) {
    if (open !== undefined) { more.setAttribute("aria-expanded", String(open)); optRows.forEach((r) => { r.hidden = !open; }); if (open) boxes.forEach(grow); }
    const n = setCount(), badge = $("#mq-set");
    badge.textContent = n; badge.hidden = !n || more.getAttribute("aria-expanded") === "true";
    badge.title = `${n} option${n > 1 ? "s" : ""} set`;
  }
  more.addEventListener("click", () => { const open = more.getAttribute("aria-expanded") !== "true"; setOpts(open); if (open) proj.focus(); });
  [proj, sort, $("#skip"), $("#limit")].forEach((f) => f.addEventListener("input", () => setOpts()));
  // The toolbar's pager, as Compass has it: "1 – 20 of N". With no filter N is the estimate from collection metadata
  // (~, nothing is counted). With a filter N is unknown until asked: "count" runs one countDocuments(filter), and the
  // number holds until the filter changes.
  let counted = null, counting = false, countedFor = "";
  const noFilter = () => /^\s*(\{\s*\})?\s*$/.test(where.value);
  function pager() {
    const el = $("#t-pager"), n = $$(".jv-list[data-edit] .jv-doc:not([data-mode='new'])").length || 20;
    const range = `1 – ${n} of `;
    if (state === "empty") { el.textContent = "No documents"; return; }
    if (noFilter()) el.innerHTML = `${range}<span class="pager-est" title="Estimated from collection metadata, not counted">~48,213</span>`;
    else if (counting) el.innerHTML = `${range}<span class="spinner spinner--sm" aria-label="Counting"></span>`;
    else if (counted !== null && countedFor === where.value) el.textContent = range + counted.toLocaleString("en-US");
    else el.innerHTML = `${range}<button type="button" class="link pager-count" title="Count the documents this filter matches: one countDocuments on events_prod">count</button>`;
    $(".pager-count", el)?.addEventListener("click", () => {
      counting = true; pager();
      setTimeout(() => { counting = false; counted = /"lost"/.test(where.value) ? 0 : 31904; countedFor = where.value; pager(); }, 600);
    });
  }
  window.ypPager = pager;
  function render() {
    $$(".subtab[data-view]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.view === view)));
    $$(".response .state").forEach((s) => { s.hidden = view !== "docs" || s.dataset.when !== state; });
    $$("[data-view-of]").forEach((s) => { if (!s.classList.contains("state")) s.hidden = s.dataset.viewOf !== view; });
    $$(".as-pane").forEach((p) => { p.hidden = p.dataset.as !== as; });
    $$(".seg [data-as]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.as === as)));
    // "Go to a column" only means something in Table
    $$('.res-actions [data-menu$="-cols"]').forEach((b) => { b.closest(".menu-anchor").hidden = as !== "table"; });
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy || view !== "docs";
    state === "bad" ? where.setAttribute("aria-invalid", "true") : where.removeAttribute("aria-invalid");
    $("#t-n").textContent = state === "empty" ? "0" : "~48k";
    $("#t-ms").textContent = busy ? "reading" : "7 ms";
    pager();
    $("#t-refresh").disabled = busy;
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
  $("#t-refresh").addEventListener("click", reload);
  // rows per page: a pick sets this tab's Limit and reads the first page again (the preview replays the sample)
  $$("[data-row-pick]").forEach((x) => x.addEventListener("change", () => { $("[data-row-face]", x.parentElement).textContent = Number(x.value).toLocaleString("en-US"); reload(); }));
  $("#t-add").addEventListener("click", () => window.jvAdd());
  // Enter in a box is a new line; ⌘↵ runs (below). The one-line Skip and Limit run on Enter.
  [$("#skip"), $("#limit")].forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter") reload(); }));
  $("#mq-reset").addEventListener("click", () => { where.value = "{}"; proj.value = sort.value = $("#skip").value = ""; $("#limit").value = "20"; boxes.forEach(grow); setOpts(); reload(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); reload(); } });
  $("#t-clear").addEventListener("click", () => { where.value = DEFAULT; reload(); where.focus(); });

  window.pvShow = (k) => {
    view = ["fields", "indexes"].includes(k) ? k : "docs";
    as = k === "table" ? "table" : "json";
    if (!/-pass$/.test(k) && $("#guard-btn")?.dataset.level !== "low") $('[data-guard="low"]')?.click();
    where.value = k === "no-match" ? '{ status: "lost" }' : k === "bad-filter" ? '{ status: { $in: ["paid" "shipped"] } }'
      : k === "multiline" ? '{\n  _id: { $gte: ObjectId("6553a1f2c9e77b0012ab0f1e") },\n  status: { $in: ["paid", "shipped", "refunded"] },\n  "customer.email": { $regex: "@example\\.(net|org)$" }\n}' : DEFAULT;
    sort.value = k === "multiline" ? "{\n  created_at: -1,\n  _id: 1\n}" : "";
    proj.value = k === "multiline" ? "{ items: 0, meta: 0 }" : "";
    boxes.forEach(grow);
    // the multi-line state shows the options open; the rest start folded, as the app does
    setOpts(k === "multiline");
    window.mInfo(k);
    state = { "no-match": "empty", loading: "loading", "bad-filter": "bad" }[k] || "full";
    render();
    counting = false; counted = null;
    if (k === "no-filter") { where.value = "{}"; grow(where); }
    if (k === "counted") { counted = 31904; countedFor = where.value; }
    pager();
    window.jvShow(k);
  };
