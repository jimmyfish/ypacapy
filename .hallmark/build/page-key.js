  // Key tab: the head (type, length, TTL, encoding) over one page of the value. The app reads TYPE, the O(1) length and
  // TTL when the tab opens, then the page: HSCAN, GET, LRANGE 0 19, SSCAN, ZRANGE 0 19 REV WITHSCORES or XREVRANGE COUNT 20.
  // Refresh and Enter in the pattern read it again; nothing runs on a timer.
  // Editing: a hash's values in the grid, a string in a text box, the expiry from the head, Delete key. Every write
  // goes through the write guard; Save writes the changes at once.
  const K = window.RKEYS, refresh = $("#rk-refresh"), match = $("#rk-match");
  // the command that reads the whole key, for Open as a query
  const READ = { hash: "hgetall", string: "", list: "", set: "", zset: "results", stream: "" };
  const LONG = "keycloak:admintoken:956094608cdf70355f7bf11b25e7f5c76ab73be8100df140b81690d17d537f6c";
  let key = "hash", state = "full", strAs = "json", edit = false, long = false;
  // one line; a long key keeps its end in view (the part that tells keys apart) and the middle gives way
  const setName = (name) => {
    const n = $("#rk-name"); n.title = name;
    const cut = name.length > 32;
    $(".rk-head", n).textContent = cut ? name.slice(0, -14) : name; $(".rk-tail", n).textContent = cut ? name.slice(-14) : "";
  };
  function render() {
    const k = K[key], name = long ? LONG : k.key;
    setName(name); $("#rk-type").innerHTML = k.badge;
    $("#rk-len").textContent = long ? "809 bytes" : k.len; $("#rk-enc").textContent = k.enc;
    const ttl = $("#rk-ttl"), t = long ? "Expires in 29 days" : k.ttl;
    $("span", ttl).textContent = t || "No expiry"; ttl.classList.toggle("has-ttl", !!t);
    $("#rk-what").textContent = k.what;
    // a string has one value; its size is in the head
    $("#rk-n").textContent = key === "string" ? "" : k.len.split(" ")[0]; $("#rk-n").hidden = key === "string";
    $$("[data-rk-name]").forEach((x) => { x.textContent = name; });
    const tabName = $('.tab[data-tab="key"] .name'); if (tabName) tabName.textContent = name;
    $("#rk-console").dataset.href = `./redis.html${READ[key] ? `?show=${READ[key]}` : ""}`;
    // a pattern only for the types Redis can scan with MATCH: hash fields and set members
    const canMatch = (key === "hash" || key === "set") && !edit;
    $("#rk-match-row").hidden = $("#rk-match-h").hidden = !canMatch;
    $("#rk-match-h").textContent = `A pattern for ${key === "set" ? "SSCAN" : "HSCAN"}: * any text, ? one character. Enter reads again.`;
    const pane = edit ? `${key}-edit` : key;
    $$(".response .state").forEach((s) => { s.hidden = s.dataset.when !== state || (s.dataset.keyState && s.dataset.keyState !== pane); });
    // HSCAN MATCH keeps the fields whose name fits the pattern
    const glob = match.value && match.value !== "*" ? new RegExp("^" + match.value.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null;
    const rows = $$('[data-key-state="hash"] tbody tr');
    rows.forEach((r) => { r.hidden = !!glob && !glob.test(r.cells[1].textContent); });
    const shown = rows.filter((r) => !r.hidden).length;
    $('[data-key-state="hash"] .grid-foot > span').textContent = glob ? `${shown} of 12 match ${match.value}` : "1 to 12 of 12";
    $$('[data-key-state="string"] .as-pane').forEach((p) => { p.hidden = p.dataset.as !== strAs; });
    $$('[data-key-state="string"] .seg [data-as]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.as === strAs)));
    const busy = state === "loading";
    refresh.disabled = busy || edit; $("#rk-ms").textContent = busy ? "reading" : "2 ms";
    // the tree marks the open key, and opens its folder
    $$("#tree .row[data-key]").forEach((r) => { r.toggleAttribute("aria-current", r.dataset.key === k.key); if (r.dataset.key === k.key) r.setAttribute("aria-current", "page"); });
    const folder = $(`#tree [data-path="db0/${k.key.split(":")[0]}"] [data-group]`);
    if (folder && folder.getAttribute("aria-expanded") === "false") folder.click();
  }
  $$('[data-key-state="string"] .seg [data-as]').forEach((b) => b.addEventListener("click", () => { strAs = b.dataset.as; render(); }));
  function reload() {
    if (state === "loading") return;
    state = "loading"; render();
    setTimeout(() => { state = key === "hash" && /^addr/.test(match.value) ? "empty" : "full"; $("#rk-empty-q").textContent = match.value; render(); }, 500);
  }
  refresh.addEventListener("click", reload);
  match.addEventListener("keydown", (e) => { if (e.key === "Enter") reload(); });
  $("#rk-clear").addEventListener("click", () => { match.value = ""; reload(); match.focus(); });
  $("#rk-close").addEventListener("click", () => { location.href = "./redis.html"; });
  // Info: the same dialog as the tree's "…" menu, for this key
  const fillInfo = () => {
    const k = K[key], dl = $('#info-dlg [data-info-state="ready"] dl');
    dl.innerHTML = `<dt>Type</dt><dd>${k.type}</dd><dt>Encoding</dt><dd>${k.enc}</dd><dt>Length</dt><dd>${k.len}</dd><dt>Expires</dt><dd>${k.ttl ? k.ttl.replace(/^Expires /, "") : "Never"}</dd>`;
    $("#info-name").textContent = k.key; $$("#info-dlg [data-info-name]").forEach((x) => { x.textContent = k.key; });
  };
  $("[data-info-open]").addEventListener("click", () => { $("[data-info]").click(); fillInfo(); });

  // ---- editing ----
  // the write guard's ask, as the console's: what will run, and whether it cannot be undone
  const ask = (ops, help, final, label = "Save") => {
    const dlg = $("#guard-confirm-dlg");
    $("[data-kinds]", dlg).innerHTML = ops.map((o) => `<code class="stmt">${o}</code>`).join(" ");
    $(".help", dlg).textContent = help;
    dlg.dataset.final = String(final);
    $("[data-run-label]", dlg).textContent = label;
    dlg.hidden = false; $("button[type=submit]", dlg).focus();
  };
  $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; }));
  $$("#guard-confirm-dlg form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); f.closest(".backdrop").hidden = true; edit = false; reload(); }));
  $$("[data-edit]").forEach((b) => b.addEventListener("click", () => { edit = true; render(); }));
  $$("[data-revert]").forEach((b) => b.addEventListener("click", () => { edit = false; render(); }));
  // a double-click on a value starts editing it
  $('[data-key-state="hash"] .grid-wrap').addEventListener("dblclick", () => { edit = true; render(); });
  $("#hash-save").addEventListener("click", () => ask(["HSET", "HDEL"], "It changes user:3107 on cache_prod, in one MULTI:", true));
  $("#str-save").addEventListener("click", () => ask(["SET"], "It replaces the value of session:7f3a91c2 on cache_prod, keeping its expiry:", true));
  $("#rk-del").addEventListener("click", () => ask(["DEL"], `It removes ${$("#rk-name").title} from cache_prod:`, true, "Delete"));
  // the expiry popover
  const pop = $("#ttl-pop"), ttlBtn = $("#rk-ttl");
  const cmd = () => {
    const none = $("#ttl-none").checked, secs = (Number($("#ttl-n").value) || 0) * Number($("#ttl-u").value);
    $("#ttl-n").disabled = $("#ttl-u").disabled = none;
    $("#ttl-cmd").textContent = none ? `PERSIST ${$("#rk-name").title}` : `EXPIRE ${$("#rk-name").title} ${secs}`;
    $("#ttl-set").textContent = none ? "Remove expiry" : "Set expiry";
  };
  const openPop = (on) => { pop.hidden = !on; ttlBtn.setAttribute("aria-expanded", String(on)); if (on) { const t = $("span", ttlBtn).textContent; $("#ttl-none").checked = t === "No expiry"; $("#ttl-on").checked = t !== "No expiry"; cmd(); } };
  ttlBtn.addEventListener("click", () => openPop(pop.hidden));
  $("#ttl-cancel").addEventListener("click", () => openPop(false));
  ["#ttl-none", "#ttl-on", "#ttl-n", "#ttl-u"].forEach((s) => $(s).addEventListener("input", cmd));
  $("#ttl-set").addEventListener("click", () => { openPop(false); const p = $("#ttl-none").checked; ask([p ? "PERSIST" : "EXPIRE"], `It changes when ${$("#rk-name").title} expires, on cache_prod:`, false, p ? "Remove expiry" : "Set expiry"); });

  window.pvShow = (k) => {
    long = k === "long-key";
    key = K[k] ? k : { "edit-string": "string", "save-string": "string", ttl: "string", "ttl-set": "string", "long-key": "string" }[k] || "hash";
    edit = /^(edit|save)-/.test(k);
    match.value = k === "match" ? "*_at" : k === "no-match" ? "addr*" : "";
    strAs = "json";
    state = { loading: "loading", "no-match": "empty", gone: "gone" }[k] || "full";
    $("#rk-empty-q").textContent = match.value;
    $("#guard-confirm-dlg").hidden = true; $("#guard-pass-dlg").hidden = true;
    render();
    openPop(k === "ttl" || k === "ttl-set");
    if (k === "ttl-set") $("#ttl-set").click();
    if (k === "save-hash") $("#hash-save").click();
    if (k === "save-string") $("#str-save").click();
    if (k === "delete-key") $("#rk-del").click();
    window.mInfo(k);
    if (k.startsWith("info")) fillInfo();
  };
