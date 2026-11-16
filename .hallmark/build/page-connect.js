  // New connection: the engine swaps the fields; the name is required; Test and Save call Tauri commands in the app
  const form = $("#connect-form"), line = $("#test-line"), test = $("#c-test"), name = $("#c-name"), help = $("#c-name-h");
  const HELP = "";
  function setEngine(v) {
    $("#c-engine").value = v;
    const lite = v === "sqlite";
    $('[data-for="sqlite"]').hidden = !lite; $('[data-for="server"]').hidden = lite;
    if (!lite) $("#c-port").value = v === "mysql" ? "3306" : "5432";
  }
  $("#c-engine").addEventListener("change", (e) => setEngine(e.target.value));
  function validate() {
    const bad = !name.value.trim();
    name.setAttribute("aria-invalid", String(bad));
    help.classList.toggle("err", bad);
    help.textContent = bad ? "Give the connection a name so you can find it again" : HELP;
    return !bad;
  }
  name.addEventListener("blur", () => { if (name.dataset.touched) validate(); });
  name.addEventListener("input", () => { name.dataset.touched = "1"; if (name.getAttribute("aria-invalid") === "true") validate(); });
  function setLine(kind, text) {
    test.removeAttribute("aria-busy"); test.disabled = false; line.className = "test-line"; line.hidden = !kind && !text;
    if (kind === "testing") { test.setAttribute("aria-busy", "true"); test.disabled = true; line.innerHTML = '<span class="spinner"></span>Connecting to localhost:5432'; }
    else if (kind === "ok") { line.classList.add("ok"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-check"/></svg>Connected to PostgreSQL 16.4 in 14&nbsp;ms'; }
    else if (kind === "fail") { line.classList.add("fail"); line.innerHTML = '<svg aria-hidden="true" class="ico"><use href="#i-circle-alert"/></svg>password authentication failed for user "ops"'; }
    else line.textContent = text || "";
  }
  // No backend in the preview: Test and Save validate, then say that nothing was sent
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) { name.focus(); return; }
    setLine("testing");
    setTimeout(() => setLine("", `Not sent: the preview has no backend; the app calls ${e.submitter.value === "save" ? "save_connection" : "test_connection"} here`), 600);
  });

  window.pvShow = (k) => {
    setEngine(["mysql", "sqlite"].includes(k) ? k : "postgres");
    name.value = k === "name-missing" ? "" : k === "sqlite" ? "analytics" : "shop_prod";
    if (k === "name-missing") validate(); else { name.removeAttribute("aria-invalid"); help.classList.remove("err"); help.textContent = HELP; }
    $("#c-file").value = k === "sqlite" ? "~/data/analytics.sqlite" : "";
    $("#c-pass").value = ["testing", "test-ok", "test-failed"].includes(k) ? "correct-horse" : "";
    setLine({ testing: "testing", "test-ok": "ok", "test-failed": "fail" }[k] || "");
  };
