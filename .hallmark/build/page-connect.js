  // New connection: tabs, engine swaps the fields, URL and fields fill each other, the name is required.
  // Test and Save call Tauri commands in the app; the preview has no backend.
  const form = $("#connect-form"), line = $("#test-line"), test = $("#c-test"), name = $("#c-name"), help = $("#c-name-h");
  const f = (id) => $("#" + id);
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(k) {
    for (const t of tabs) {
      const on = t.id === "t-" + k;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      f(t.getAttribute("aria-controls")).hidden = !on;
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.id.slice(2)));
    t.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n.id.slice(2)); n.focus();
    });
  });

  let urlOnly = false;
  const showFor = (sel, on) => document.querySelectorAll(`[data-for="${sel}"]`).forEach((el) => (el.hidden = !on));
  function layout() {
    const e = f("c-engine").value, lite = e === "sqlite", mongo = e === "mongo", redis = e === "redis";
    showFor("sqlite", lite); showFor("server", !lite); showFor("fields", !lite && !urlOnly);
    showFor("sql-server", !lite && !mongo && !redis); showFor("sql", !mongo && !redis); showFor("mongo", mongo); showFor("mongo-fields", mongo && !urlOnly);
    showFor("redis", redis); showFor("no-redis", !redis); showFor("redis-fields", redis && !urlOnly);
    f("c-db").placeholder = redis ? "0" : "";
    // MongoDB: an SRV name has no port; the SSL tab is TLS
    const srv = mongo && f("c-srv").checked;
    [f("c-port"), $('label[for="c-port"]')].forEach((el) => { el.hidden = srv; });
    // no port: Host takes the whole row, so User stays on its own line
    f("c-host").classList.toggle("cx-full", srv);
    f("t-ssl").textContent = mongo || redis ? "TLS" : "SSL";
    f("c-url-h").textContent = urlOnly ? "Paste the whole URL. The password goes in the field above it." : "Editing the URL fills in the settings above.";
  }
  function setEngine(v) {
    f("c-engine").value = v;
    if (v !== "sqlite") f("c-port").value = { mysql: "3306", mongo: "27017", redis: "6379" }[v] || "5432";
    f("c-engine").closest(".cx-driver").querySelector("use").setAttribute("href", v === "sqlite" ? "#i-hard-drive" : "#i-server");
    layout(); toUrl();
  }
  function setType(t) {
    urlOnly = t === "url";
    document.querySelectorAll("[data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === t)));
    layout();
  }
  document.querySelectorAll("[data-type]").forEach((b) => b.addEventListener("click", () => setType(b.dataset.type)));
  f("c-engine").addEventListener("change", (e) => setEngine(e.target.value));
  f("c-color").addEventListener("change", (e) => f("c-color").closest(".cx-color").style.setProperty("--fg", `var(--proj-${e.target.value}-fg)`));

  // fields to URL, and URL back to fields; a password typed into the URL moves to the keychain field
  const SCHEME = { postgres: "postgresql", mysql: "mysql" };
  // MongoDB: mongodb:// or mongodb+srv://; auth database, replica set and read preference ride in the query string
  function mongoUrl() {
    const srv = f("c-srv").checked, u = f("c-user").value, h = f("c-host").value, p = f("c-port").value, d = f("c-db").value;
    const qs = [["authSource", f("c-authdb").value], ["replicaSet", f("c-rs").value], ["readPreference", f("c-readpref").value === "primary" ? "" : f("c-readpref").value]].filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
    return `mongodb${srv ? "+srv" : ""}://${u ? u + "@" : ""}${h}${p && !srv && !h.includes(",") ? ":" + p : ""}/${d}${qs ? "?" + qs : ""}`;
  }
  // Redis: redis:// or rediss:// (TLS on); the database is the number after the slash
  const redisUrl = () => {
    const u = f("c-user").value, h = f("c-host").value, p = f("c-port").value, d = f("c-db").value;
    return `redis${f("c-rtls").value === "off" ? "" : "s"}://${u ? u + "@" : ""}${h}${p ? ":" + p : ""}${d ? "/" + d : ""}`;
  };
  function toUrl() {
    const e = f("c-engine").value;
    if (e === "redis") { f("c-url").value = redisUrl(); return; }
    if (e === "sqlite") { f("c-url").value = "sqlite:" + (f("c-file").value || ""); return; }
    if (e === "mongo") { f("c-url").value = mongoUrl(); return; }
    const u = f("c-user").value, h = f("c-host").value, p = f("c-port").value, d = f("c-db").value;
    f("c-url").value = `${SCHEME[e]}://${u ? u + "@" : ""}${h}${p ? ":" + p : ""}${d ? "/" + d : ""}`;
  }
  function fromUrl() {
    const v = f("c-url").value.trim();
    if (/^sqlite:/.test(v)) { if (f("c-engine").value !== "sqlite") setEngine("sqlite"); f("c-file").value = v.slice(7); return; }
    // a seed list (h1:27017,h2:27017) stays whole in Host
    const mg = v.match(/^mongodb(\+srv)?:\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^/?]*)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (mg) {
      if (f("c-engine").value !== "mongo") { f("c-engine").value = "mongo"; }
      f("c-srv").checked = !!mg[1];
      const hosts = mg[4] || "", one = !hosts.includes(",") && hosts.match(/^(.*?)(?::(\d+))?$/);
      f("c-host").value = one ? one[1] : hosts; f("c-port").value = one && one[2] ? one[2] : mg[1] ? "" : "27017";
      f("c-user").value = mg[2] || ""; f("c-db").value = mg[5] || "";
      const qs = new URLSearchParams(mg[6] || "");
      f("c-authdb").value = qs.get("authSource") || ""; f("c-rs").value = qs.get("replicaSet") || ""; f("c-readpref").value = qs.get("readPreference") || "primary";
      layout();
      if (mg[3]) { f("c-pass").value = decodeURIComponent(mg[3]); toUrl(); }
      return;
    }
    const rd = v.match(/^redis(s)?:\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d+))?(?:\/(\d*))?/);
    if (rd) {
      if (f("c-engine").value !== "redis") { f("c-engine").value = "redis"; layout(); }
      f("c-rtls").value = rd[1] ? (f("c-rtls").value === "off" ? "on" : f("c-rtls").value) : "off";
      f("c-user").value = rd[2] || ""; f("c-host").value = rd[4] || ""; f("c-port").value = rd[5] || "6379"; f("c-db").value = rd[6] || "0";
      if (rd[3]) { f("c-pass").value = decodeURIComponent(rd[3]); toUrl(); }
      return;
    }
    const m = v.match(/^(postgres(?:ql)?|mysql):\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d+))?(?:\/([^?]*))?/);
    if (!m) return;
    const eng = m[1] === "mysql" ? "mysql" : "postgres";
    if (f("c-engine").value !== eng) { f("c-engine").value = eng; layout(); }
    f("c-user").value = m[2] || ""; f("c-host").value = m[4] || ""; f("c-port").value = m[5] || ""; f("c-db").value = m[6] || "";
    if (m[3]) { f("c-pass").value = decodeURIComponent(m[3]); toUrl(); }
  }
  ["c-host", "c-port", "c-user", "c-db", "c-file", "c-authdb", "c-rs"].forEach((id) => f(id).addEventListener("input", toUrl));
  ["c-srv", "c-readpref", "c-rtls"].forEach((id) => f(id).addEventListener("change", () => { layout(); toUrl(); }));
  f("c-url").addEventListener("input", fromUrl);
  f("c-url").addEventListener("change", fromUrl);

  function validate() {
    const bad = !name.value.trim();
    name.setAttribute("aria-invalid", String(bad));
    help.classList.toggle("err", bad);
    help.textContent = bad ? "Give the connection a name so you can find it again" : "";
    return !bad;
  }
  name.addEventListener("blur", () => { if (name.dataset.touched) validate(); });
  name.addEventListener("input", () => { name.dataset.touched = "1"; if (name.getAttribute("aria-invalid") === "true") validate(); });
  function setLine(kind, text) {
    // while a test runs, its button is Stop test: a host that never answers can be given up on before the timeout
    test.removeAttribute("aria-busy"); test.disabled = false; line.className = "test-line"; line.hidden = !kind && !text; line.title = "";
    test.textContent = kind === "testing" ? "Stop test" : "Test connection";
    test.toggleAttribute("data-stop", kind === "testing");
    const mongo = f("c-engine").value === "mongo", redis = f("c-engine").value === "redis";
    if (kind === "stopped") { line.textContent = "Stopped the test. Nothing was saved."; return; }
    if (kind === "testing") { test.setAttribute("aria-busy", "true"); line.innerHTML = `<span class="spinner"></span>Connecting to ${mongo ? f("c-host").value : redis ? `${f("c-host").value}:${f("c-port").value}` : "localhost:5432"}`; }
    else if (kind === "ok") { line.classList.add("ok"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-check"/></svg>' + (mongo ? "Connected to MongoDB 7.0.14, replica set atlas-x1y2z-shard-0 (3 hosts), in 112&nbsp;ms" : redis ? "Connected to Redis 7.1.0, a primary with 1 replica, in 9&nbsp;ms. db0 holds 1,204,331 keys" : "Connected to PostgreSQL 16.4 in 14&nbsp;ms"); }
    else if (kind === "fail") { line.classList.add("fail"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-alert"/></svg>' + (mongo ? "AuthenticationFailed: user ops was not found in auth database admin, or the password is wrong" : redis ? "WRONGPASS invalid username-password pair or user is disabled." : 'password authentication failed for user "ops"'); line.title = line.textContent; }
    else { line.textContent = text || ""; line.title = line.textContent; }
  }
  let testTimer;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Stop test: the app drops the attempt (cancel_query on the test's id); nothing was saved
    if (e.submitter === test && test.hasAttribute("data-stop")) { clearTimeout(testTimer); setLine("stopped"); test.focus(); return; }
    if (!validate()) { selectTab("general"); name.focus(); return; }
    setLine("testing");
    // a slow host here, so Stop test can be tried
    testTimer = setTimeout(() => setLine("", `Not sent: the preview has no backend; the app calls ${e.submitter.value === "save" ? "save_connection" : "test_connection"} here`), e.submitter === test ? 6000 : 600);
  });

  // Security level: None, Low (confirm) or Strict (passphrase). Strict needs a passphrase, set in Settings › Security;
  // Touch ID and Stay unlocked for belong to Strict; the statements list to Low and Strict
  let passSet = true;
  const LEVEL_DESC = { none: "Every statement runs", low: "Confirm the statements below", strict: "Passphrase for the statements below" };
  const renderPass = () => {
    const sel = f("c-level"), strictOpt = $('option[value="strict"]', sel);
    strictOpt.disabled = !passSet;
    strictOpt.textContent = passSet ? "Strict" : "Strict (needs a passphrase, in Settings)";
    if (!passSet && sel.value === "strict") sel.value = "low";
    sel.dispatchEvent(new Event("change"));
  };
  const openSub = (k) => {
    $$("[data-sub]").forEach((d) => { d.hidden = d.dataset.sub !== k; });
    const d = $(`[data-sub="${k}"]`); if (!d) return;
    $("form", d).reset(); $("[data-sub-err]", d).textContent = "";
    $$("input", d).forEach((i) => i.removeAttribute("aria-invalid"));
    $("input", d).focus();
  };
  const closeSub = () => $$("[data-sub]").forEach((d) => { d.hidden = true; });
  $$("[data-open-sub]").forEach((b) => b.addEventListener("click", () => openSub(b.dataset.openSub)));
  $$("[data-sub-cancel]").forEach((b) => b.addEventListener("click", closeSub));
  $$(".sub-backdrop").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) closeSub(); }));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("[data-sub]:not([hidden])")) { e.stopPropagation(); closeSub(); } }, true);
  $$("[data-sub-form]").forEach((sf) => sf.addEventListener("submit", (e) => {
    e.preventDefault(); e.stopPropagation();
    const inputs = $$("input", sf), err = $("[data-sub-err]", sf);
    const empty = inputs.find((i) => !i.value);
    inputs.forEach((i) => i.setAttribute("aria-invalid", String(!i.value)));
    if (empty) { err.textContent = "Fill in every field."; empty.focus(); return; }
    const pair = inputs.slice(-2);
    if (sf.dataset.subForm === "unlock") { unlocked = true; renderLock(); closeSub(); return; }
    if (sf.dataset.subForm !== "disable" && pair[0].value !== pair[1].value) { pair[1].setAttribute("aria-invalid", "true"); err.textContent = "The two passphrases differ."; pair[1].focus(); return; }
    passSet = sf.dataset.subForm !== "disable"; renderPass(); closeSub();
  }));
  // What to protect: locked until the passphrase opens it, as in Settings
  let unlocked = false;
  const renderLock = () => {
    if (!passSet) unlocked = false;
    $$("#protect .switch").forEach((sw) => { sw.disabled = f("c-level").value === "strict" && !unlocked; });
    const t = f("protect-toggle");
    $("use", t).setAttribute("href", unlocked ? "#i-lock-open" : "#i-lock");
    $("span", t).textContent = unlocked ? "Lock" : "Unlock";
  };
  f("protect-toggle").addEventListener("click", () => {
    if (unlocked) { unlocked = false; renderLock(); return; }
    openSub("unlock");
    $("[data-touch-hint]").hidden = !f("c-touch").checked;
  });

  const renderLevel = () => {
    const lvl = f("c-level").value;
    $("[data-level-desc]").textContent = LEVEL_DESC[lvl].replace("statements", f("c-engine").value === "redis" ? "commands" : "statements");
    $$("[data-when-strict]").forEach((r) => { r.hidden = lvl !== "strict"; });
    $("[data-when-guarded]").hidden = lvl === "none";
    // Strict locks the list behind the passphrase; Low leaves it open
    if (lvl !== "strict") unlocked = false;
    $$("#protect .switch").forEach((sw) => { sw.disabled = lvl === "strict" && !unlocked; });
  };
  f("c-level").addEventListener("change", renderLevel);

  // Group: a menu of the groups on Home. No group first, New group… last; New group turns the field into a name field.
  // The hidden input keeps the value for the form; a new name lives in the list only until the connection is saved.
  const gWrap = $(".group-pick"), gIn = f("c-group"), gBtn = f("c-group-btn"), gNew = f("c-group-new"), gMenu = f("c-group-menu"), gHelp = f("c-group-h");
  let groups = gWrap.dataset.groups.split(",").filter(Boolean);
  const icoUse = (name, cls) => `<svg class="ico${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const closeGroup = () => { gMenu.hidden = true; gBtn.setAttribute("aria-expanded", "false"); };
  const pickGroup = (g) => { gIn.value = g; gIn.dispatchEvent(new Event("change")); };
  const drawGroup = () => {
    const v = gIn.value, all = v && !groups.includes(v) ? [...groups, v].sort((a, b) => a.localeCompare(b)) : groups;
    $(".env-name", gBtn).textContent = v || "No group";
    $(".grp-ico use", gBtn).setAttribute("href", `#i-${v ? "folder" : "folder-minus"}`);
    gBtn.toggleAttribute("data-none", !v);
    gMenu.innerHTML = [["", "No group", "folder-minus"], ...all.map((g) => [g, g, "folder"])]
      .map(([g, label, icon]) => `<button type="button" role="menuitemradio" aria-checked="${g === v}" data-g="${g.replace(/"/g, "&quot;")}">${icoUse(icon)}<span class="menu-name">${label}</span>${icoUse("check", "tick")}</button>`)
      .join("") + `<hr><button type="button" role="menuitem" data-new-group>${icoUse("folder-plus")}New group…</button>`;
    $$("[data-g]", gMenu).forEach((b) => b.addEventListener("click", () => { closeGroup(); pickGroup(b.dataset.g); gBtn.focus(); }));
    $("[data-new-group]", gMenu).addEventListener("click", () => { closeGroup(); naming(true); });
  };
  const naming = (on) => {
    gBtn.hidden = on; gNew.hidden = !on; gHelp.hidden = !on;
    if (on) { gNew.value = ""; gNew.focus(); } else gBtn.focus();
  };
  const keepNew = () => {
    const g = gNew.value.trim();
    if (g) pickGroup(g);
    naming(false);
  };
  gNew.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); keepNew(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); naming(false); }
  });
  gNew.addEventListener("blur", () => { if (!gNew.hidden) keepNew(); });
  gIn.addEventListener("change", drawGroup);
  drawGroup();

  window.pvShow = (k) => {
    const mongo = k.startsWith("mongo"), redis = k.startsWith("redis");
    setType(k === "url-only" || k === "mongo-url" || k === "redis-url" ? "url" : "default");
    // MongoDB states: an Atlas SRV host, or a plain host and port
    f("c-srv").checked = mongo && k !== "mongo-host";
    f("c-host").value = redis ? "cache-prod.k3j9qa.ng.0001.apse3.cache.amazonaws.com" : !mongo ? "localhost" : k === "mongo-host" ? "localhost" : "events-prod.x1y2z.mongodb.net";
    f("c-db").value = mongo ? "events" : redis ? "0" : "shop"; f("c-user").value = "ops"; f("c-rtls").value = "on";
    f("c-authdb").value = mongo ? "admin" : ""; f("c-rs").value = ""; f("c-readpref").value = k === "mongo-advanced" ? "secondaryPreferred" : "primary";
    setEngine(["mysql", "sqlite"].includes(k) ? k : mongo ? "mongo" : redis ? "redis" : "postgres");
    selectTab({ options: "options", "level-menu": "options", "options-low": "options", "options-strict": "options", "options-nopass": "options", ssl: "ssl", advanced: "advanced", "mongo-options": "options", "mongo-tls": "ssl", "mongo-advanced": "advanced", "redis-options": "options", "redis-tls": "ssl", "redis-advanced": "advanced" }[k] || "general");
    f("c-level").value = k === "options-low" || k === "mongo-options" || k === "redis-options" ? "low" : k === "options-strict" ? "strict" : "none";
    closeSub();
    passSet = k !== "options-nopass"; unlocked = false; renderPass(); renderLock();
    name.value = k === "name-missing" ? "" : k === "sqlite" ? "analytics" : mongo ? (k === "mongo-host" ? "events_dev" : "events_prod") : redis ? "cache_prod" : "shop_prod";
    if (k === "name-missing") validate(); else { name.removeAttribute("aria-invalid"); help.classList.remove("err"); help.textContent = ""; }
    f("c-file").value = k === "sqlite" ? "~/data/analytics.sqlite" : "";
    f("c-pass").value = ["testing", "test-ok", "test-failed", "url-only", "mongo-url", "mongo-test-ok", "mongo-test-failed", "redis-url", "redis-test-ok", "redis-test-failed"].includes(k) ? "correct-horse" : "";
    toUrl();
    if (k === "url-only") f("c-url").value = "postgresql://ops@loophealth-staging.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com:5432/postgres?sslmode=require";
    if (k === "redis-url") { f("c-url").value = "rediss://ops@cache-prod.k3j9qa.ng.0001.apse3.cache.amazonaws.com:6379/0"; fromUrl(); }
    if (k === "mongo-url") { f("c-url").value = "mongodb+srv://ops@events-prod.x1y2z.mongodb.net/events?authSource=admin&readPreference=secondaryPreferred"; fromUrl(); }
    clearTimeout(testTimer);
    setLine({ testing: "testing", "test-stopped": "stopped", "test-ok": "ok", "test-failed": "fail", "mongo-test-ok": "ok", "mongo-test-failed": "fail", "redis-test-ok": "ok", "redis-test-failed": "fail" }[k] || "");
    // New connection here (a group's menu or its New connection card): Group starts with that group
    f("c-group").value = k === "group-menu" ? "Production" : q.get("group") || "";
    naming(false); drawGroup();
    if (k === "group-menu") { gMenu.hidden = false; gBtn.setAttribute("aria-expanded", "true"); }
    if (k === "group-new") { naming(true); gNew.value = "Analytics"; }
    // the level picker, open
    const lm = f("c-level-menu"); lm.hidden = k !== "level-menu"; f("c-level-btn").setAttribute("aria-expanded", String(k === "level-menu"));
  };
