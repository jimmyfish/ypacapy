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
  let renderPass = () => {
    $$("[data-pass]").forEach((c) => { c.hidden = c.dataset.pass !== (passSet ? "set" : "none"); });
    $("[data-pass-desc]").textContent = passSet ? "Set, in the macOS keychain" : "Not set";
    $$("[data-needs-pass]").forEach((r) => { r.hidden = !passSet; });
    if (!passSet) $("#sec-touch").checked = false;
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
    if (form.dataset.subForm === "unlock") { unlocked = true; renderLock(); closeSub(); return; }
    if (form.dataset.subForm !== "disable" && pair[0].value !== pair[1].value) { pair[1].setAttribute("aria-invalid", "true"); err.textContent = "The two passphrases differ."; pair[1].focus(); return; }
    passSet = form.dataset.subForm !== "disable"; renderPass(); closeSub();
  }));
  // What to protect: locked by default; unlocking takes the passphrase once and lasts until Settings closes or Lock
  let unlocked = false;
  const renderLock = () => {
    $$("#protect .switch").forEach((sw) => { sw.disabled = !unlocked; });
    const t = $("#protect-toggle");
    $("use", t).setAttribute("href", unlocked ? "#i-lock-open" : "#i-lock");
    $("span", t).textContent = unlocked ? "Lock" : "Change";
  };
  $("#protect-toggle").addEventListener("click", () => {
    if (unlocked) { unlocked = false; renderLock(); return; }
    openSub("unlock");
    $("[data-touch-hint]").hidden = !$("#sec-touch").checked;
  });
  const _renderPass = renderPass;
  renderPass = () => { _renderPass(); if (!passSet) unlocked = false; renderLock(); };
  renderPass();
  window.pvShow = (k) => {
    closeSub();
    if (["appearance", "queries", "data"].includes(k)) { go(k); return; }
    go("security");
    passSet = k !== "security" && k !== "pass-new"; unlocked = k === "protect-open"; renderPass();
    if (k === "protect-unlock") { openSub("unlock"); $("[data-touch-hint]").hidden = !$("#sec-touch").checked; }
    if (k === "pass-new") openSub("new"); else if (k === "pass-change") openSub("change"); else if (k === "pass-disable") openSub("disable");
  };
