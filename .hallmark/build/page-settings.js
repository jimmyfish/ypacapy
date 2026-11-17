  // Settings: the left list picks the pane
  const go = (k) => {
    $$("[data-section]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.section === k)));
    $$("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== k; });
  };
  $$("[data-section]").forEach((b) => b.addEventListener("click", () => go(b.dataset.section)));
  window.pvShow = go;
  // Heartbeat: off by default; its interval row exists only while it is on
  const beat = $("#set-beat");
  beat.addEventListener("change", () => { $("[data-when-beat]").hidden = !beat.checked; });
  // Security: passphrase set or not; set, change and disable each open their own dialog; change and disable need the current one
  let passSet = false;
  const renderPass = () => {
    const strictOpt = $('#sec-level option[value="strict"]');
    strictOpt.disabled = !passSet;
    strictOpt.textContent = passSet ? "Strict" : "Strict (set a passphrase below)";
    if (!passSet && $("#sec-level").value === "strict") $("#sec-level").value = "low";
    $("#sec-level").dispatchEvent(new Event("change"));
    $$("[data-pass]").forEach((c) => { c.hidden = c.dataset.pass !== (passSet ? "set" : "none"); });
    $("[data-pass-desc]").textContent = passSet ? "Set, in the macOS keychain" : "Not set. With one, the statements you pick ask for it before they run";
    $$("[data-needs-pass]").forEach((r) => { r.hidden = !passSet; });
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
  // the preview checks only that fields are filled and match; in the app the current passphrase is checked against the keychain
  $$("[data-sub-form]").forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = $$("input", form), err = $("[data-sub-err]", form);
    const empty = inputs.find((i) => !i.value);
    inputs.forEach((i) => i.setAttribute("aria-invalid", String(!i.value)));
    if (empty) { err.textContent = "Fill in every field."; empty.focus(); return; }
    const pair = inputs.slice(-2);
    if (form.dataset.subForm !== "disable" && pair[0].value !== pair[1].value) { pair[1].setAttribute("aria-invalid", "true"); err.textContent = "The two passphrases differ."; pair[1].focus(); return; }
    passSet = form.dataset.subForm !== "disable"; renderPass(); closeSub();
  }));
  renderPass();
  // Updates: one status row per updater state; a dev build has the launch check off and locked
  const updState = (st) => {
    $$("[data-upd-st]").forEach((r) => { r.hidden = r.dataset.updSt !== st; });
    const dev = st === "dev", auto = $("#set-auto-update");
    auto.disabled = dev; auto.checked = !dev;
    $("[data-upd-auto]").setAttribute("aria-disabled", String(dev));
    $("[data-auto-desc]").textContent = dev ? "Off in dev builds, so an update never replaces this build" : "Look for a new version when ypacapy opens";
  };
  updState("current");
  window.pvShow = (k) => {
    closeSub();
    $("#sec-level").value = "none";
    if (["appearance", "queries", "data"].includes(k)) { go(k); return; }
    if (k === "updates" || k.startsWith("upd-")) { go("updates"); updState(k === "updates" ? "current" : k.slice(4)); return; }
    go("security");
    passSet = k !== "security" && k !== "pass-new"; renderPass();
    if (k === "pass-new") openSub("new"); else if (k === "pass-change") openSub("change"); else if (k === "pass-disable") openSub("disable"); else if (k === "pass-reset") openSub("reset");
  };
