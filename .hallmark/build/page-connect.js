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
    const lite = f("c-engine").value === "sqlite";
    showFor("sqlite", lite); showFor("server", !lite); showFor("fields", !lite && !urlOnly);
    f("c-url-h").textContent = urlOnly ? "Paste the whole URL. The password goes in the field above it." : "Editing the URL fills in the settings above.";
  }
  function setEngine(v) {
    f("c-engine").value = v;
    if (v !== "sqlite") f("c-port").value = v === "mysql" ? "3306" : "5432";
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
  function toUrl() {
    const e = f("c-engine").value;
    if (e === "sqlite") { f("c-url").value = "sqlite:" + (f("c-file").value || ""); return; }
    const u = f("c-user").value, h = f("c-host").value, p = f("c-port").value, d = f("c-db").value;
    f("c-url").value = `${SCHEME[e]}://${u ? u + "@" : ""}${h}${p ? ":" + p : ""}${d ? "/" + d : ""}`;
  }
  function fromUrl() {
    const v = f("c-url").value.trim();
    if (/^sqlite:/.test(v)) { if (f("c-engine").value !== "sqlite") setEngine("sqlite"); f("c-file").value = v.slice(7); return; }
    const m = v.match(/^(postgres(?:ql)?|mysql):\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d+))?(?:\/([^?]*))?/);
    if (!m) return;
    const eng = m[1] === "mysql" ? "mysql" : "postgres";
    if (f("c-engine").value !== eng) { f("c-engine").value = eng; layout(); }
    f("c-user").value = m[2] || ""; f("c-host").value = m[4] || ""; f("c-port").value = m[5] || ""; f("c-db").value = m[6] || "";
    if (m[3]) { f("c-pass").value = decodeURIComponent(m[3]); toUrl(); }
  }
  ["c-host", "c-port", "c-user", "c-db", "c-file"].forEach((id) => f(id).addEventListener("input", toUrl));
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
    test.removeAttribute("aria-busy"); test.disabled = false; line.className = "test-line"; line.hidden = !kind && !text; line.title = "";
    if (kind === "testing") { test.setAttribute("aria-busy", "true"); test.disabled = true; line.innerHTML = '<span class="spinner"></span>Connecting to localhost:5432'; }
    else if (kind === "ok") { line.classList.add("ok"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-check"/></svg>Connected to PostgreSQL 16.4 in 14&nbsp;ms'; }
    else if (kind === "fail") { line.classList.add("fail"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-alert"/></svg>password authentication failed for user "ops"'; line.title = line.textContent; }
    else { line.textContent = text || ""; line.title = line.textContent; }
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) { selectTab("general"); name.focus(); return; }
    setLine("testing");
    setTimeout(() => setLine("", `Not sent: the preview has no backend; the app calls ${e.submitter.value === "save" ? "save_connection" : "test_connection"} here`), 600);
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
    if (typeof renderLevel === "function") renderLevel();
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
    $("span", t).textContent = unlocked ? "Lock" : "Change";
  };
  f("protect-toggle").addEventListener("click", () => {
    if (unlocked) { unlocked = false; renderLock(); return; }
    openSub("unlock");
    $("[data-touch-hint]").hidden = !f("c-touch").checked;
  });

  const renderLevel = () => {
    const lvl = f("c-level").value;
    $("[data-level-desc]").textContent = LEVEL_DESC[lvl];
    $$("[data-when-strict]").forEach((r) => { r.hidden = lvl !== "strict"; });
    $("[data-when-guarded]").hidden = lvl === "none";
    // Strict locks the list behind the passphrase; Low leaves it open
    if (lvl !== "strict") unlocked = false;
    $$("#protect .switch").forEach((sw) => { sw.disabled = lvl === "strict" && !unlocked; });
  };
  f("c-level").addEventListener("change", renderLevel);

  window.pvShow = (k) => {
    setType(k === "url-only" ? "url" : "default");
    setEngine(["mysql", "sqlite"].includes(k) ? k : "postgres");
    selectTab({ options: "options", "options-low": "options", "options-strict": "options", "options-nopass": "options", ssl: "ssl", advanced: "advanced" }[k] || "general");
    f("c-level").value = k === "options-low" ? "low" : k === "options-strict" ? "strict" : "none";
    closeSub();
    passSet = k !== "options-nopass"; unlocked = false; renderPass(); renderLock();
    name.value = k === "name-missing" ? "" : k === "sqlite" ? "analytics" : "shop_prod";
    if (k === "name-missing") validate(); else { name.removeAttribute("aria-invalid"); help.classList.remove("err"); help.textContent = ""; }
    f("c-file").value = k === "sqlite" ? "~/data/analytics.sqlite" : "";
    f("c-pass").value = ["testing", "test-ok", "test-failed", "url-only"].includes(k) ? "correct-horse" : "";
    toUrl();
    if (k === "url-only") f("c-url").value = "postgresql://ops@loophealth-staging.cwxkeicsyqw8.ap-southeast-3.rds.amazonaws.com:5432/postgres?sslmode=require";
    setLine({ testing: "testing", "test-ok": "ok", "test-failed": "fail" }[k] || "");
  };
