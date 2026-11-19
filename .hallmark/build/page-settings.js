  // Settings: the left list picks the pane
  const go = (k) => {
    $$("[data-section]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.section === k)));
    $$("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== k; });
  };
  $$("[data-section]").forEach((b) => b.addEventListener("click", () => go(b.dataset.section)));
  window.pvShow = go;
  // Connection group: only when Settings opens from a connection tab; from Home only Global shows, without its heading
  const fromConn = (on) => { $$("[data-conn-group]").forEach((el) => { el.hidden = !on; }); };
  // Connection > Security: None asks about nothing, so What to ask about hides; the warnings stay
  const cnLevel = $("#cn-level");
  // Strict is locked: picking None or Low asks for the passphrase (Lower), Change opens the list (Unlock)
  let cnSaved = cnLevel.value, cnUnlocked = false;
  const renderCn = () => {
    const strict = cnLevel.value === "strict";
    $("[data-pane=\"conn-security\"] .set-item .desc").textContent = { none: "Every statement runs", low: "Low asks to confirm before a write", strict: strict && !cnUnlocked ? "Locked. Lowering asks for the passphrase" : "Strict asks for the passphrase before a write" }[cnLevel.value];
    $("[data-cn-guarded]").hidden = cnLevel.value === "none";
    $("#cn-protect-toggle").hidden = !strict;
    $$("[data-cn-guarded] .switch").forEach((s) => { s.disabled = strict && !cnUnlocked; });
    const t = $("#cn-protect-toggle");
    $("use", t).setAttribute("href", cnUnlocked ? "#i-lock-open" : "#i-lock");
    $("span", t).textContent = cnUnlocked ? "Lock" : "Unlock";
  };
  const openAuth = (k, { to = "none", touch = false, wrong = false } = {}) => {
    $$("[data-auth]").forEach((d) => { d.hidden = d.dataset.auth !== k; });
    const d = $(`[data-auth="${k}"]`);
    $$("[data-auth-to]", d).forEach((el) => { el.hidden = el.dataset.authTo !== to; });
    $("[data-auth-touch]", d).hidden = !touch;
    const input = $("input", d);
    input.type = "password";
    $("[data-auth-eye] use", d).setAttribute("href", "#i-eye");
    $("[data-auth-caps]", d).hidden = true;
    input.value = wrong ? "hunter2" : "";
    wrong ? input.setAttribute("aria-invalid", "true") : input.removeAttribute("aria-invalid");
    $("[data-auth-err]", d).hidden = !wrong;
    d.dataset.to = to;
    input.focus();
  };
  const closeAuth = () => $$("[data-auth]").forEach((d) => { d.hidden = true; });
  // the app is checking: the action keeps its label, its icon turns into a loader, then the work finishes
  const busyThen = (btn, done) => {
    const svg = btn.querySelector("svg"), use = svg && $("use", svg), was = use?.getAttribute("href");
    btn.disabled = true; btn.setAttribute("aria-busy", "true");
    if (use) { use.setAttribute("href", "#i-loader-circle"); svg.classList.add("spin"); }
    setTimeout(() => { btn.disabled = false; btn.removeAttribute("aria-busy"); if (use) { use.setAttribute("href", was); svg.classList.remove("spin"); } done(); }, 700);
  };
  // show or hide what was typed; Caps Lock says so while typing
  $$("[data-auth-eye]").forEach((b) => b.addEventListener("click", () => {
    const input = b.previousElementSibling, show = input.type === "password";
    input.type = show ? "text" : "password";
    b.setAttribute("aria-pressed", String(show)); b.setAttribute("aria-label", show ? "Hide passphrase" : "Show passphrase");
    $("use", b).setAttribute("href", show ? "#i-eye-off" : "#i-eye");
    input.focus();
  }));
  $$(".auth-input input").forEach((input) => ["keydown", "keyup"].forEach((ev) => input.addEventListener(ev, (e) => {
    $("[data-auth-caps]", input.closest("form")).hidden = !e.getModifierState?.("CapsLock");
    if (ev === "keydown" && e.key.length === 1) { input.removeAttribute("aria-invalid"); $("[data-auth-err]", input.closest("form")).hidden = true; }
  })));
  $$("[data-auth-cancel]").forEach((b) => b.addEventListener("click", () => { closeAuth(); cnLevel.value = cnSaved; renderCn(); }));
  $$(".auth-backdrop").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) { closeAuth(); cnLevel.value = cnSaved; renderCn(); } }));
  $$("[data-auth-form]").forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = form.closest("[data-auth]"), input = $("input", form);
    // the preview takes any passphrase but "hunter2"
    if (!input.value || input.value === "hunter2") {
      input.setAttribute("aria-invalid", "true"); $("[data-auth-err]", d).hidden = false;
      d.querySelector(".dialog").classList.remove("auth-shake"); void d.offsetWidth; d.querySelector(".dialog").classList.add("auth-shake");
      input.focus(); return;
    }
    busyThen($('[type="submit"]', form), () => {
      closeAuth();
      if (form.dataset.authForm === "lower") { cnLevel.value = d.dataset.to; cnSaved = cnLevel.value; cnUnlocked = false; }
      else cnUnlocked = true;
      renderCn();
    });
  }));
  cnLevel.addEventListener("change", () => {
    if (cnSaved === "strict" && cnLevel.value !== "strict") { const to = cnLevel.value; cnLevel.value = "strict"; openAuth("lower", { to }); return; }
    cnSaved = cnLevel.value; renderCn();
  });
  $("#cn-protect-toggle").addEventListener("click", () => { if (cnUnlocked) { cnUnlocked = false; renderCn(); } else openAuth("unlock"); });
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
    $("[data-pass-desc]").textContent = passSet ? "Set, in the macOS login keychain" : "Not set. With one, the statements you pick ask for it before they run";
    $$("[data-needs-pass]").forEach((r) => { r.hidden = !passSet; });
  };
  const openSub = (k) => {
    $$("[data-sub]").forEach((d) => { d.hidden = d.dataset.sub !== k; });
    const d = $(`[data-sub="${k}"]`); if (!d) return;
    $("form", d).reset(); $("[data-sub-err]", d).textContent = "";
    $("[data-auth-err]", d)?.setAttribute("hidden", ""); $("[data-auth-caps]", d)?.setAttribute("hidden", "");
    $$("[data-auth-eye]", d).forEach((b) => { b.previousElementSibling.type = "password"; $("use", b).setAttribute("href", "#i-eye"); });
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
    // the asks in the passphrase shape show the reason under the field, and shake
    const fail = (msg) => {
      err.textContent = msg; err.closest("[data-auth-err]")?.removeAttribute("hidden");
      const dlg = form.closest(".dialog.auth"); if (dlg) { dlg.classList.remove("auth-shake"); void dlg.offsetWidth; dlg.classList.add("auth-shake"); }
    };
    const empty = inputs.find((i) => !i.value);
    inputs.forEach((i) => i.setAttribute("aria-invalid", String(!i.value)));
    if (empty) { fail(form.dataset.subForm === "disable" ? "Enter the passphrase." : "Fill in every field."); empty.focus(); return; }
    // the preview takes any passphrase but "hunter2"
    if (form.dataset.subForm === "disable" && inputs[0].value === "hunter2") { inputs[0].setAttribute("aria-invalid", "true"); fail("That passphrase is not right."); inputs[0].select(); return; }
    const pair = inputs.slice(-2);
    if (form.dataset.subForm !== "disable" && pair[0].value !== pair[1].value) { pair[1].setAttribute("aria-invalid", "true"); fail("The two passphrases differ."); pair[1].focus(); return; }
    busyThen($('[type="submit"]', form), () => { passSet = form.dataset.subForm !== "disable"; renderPass(); closeSub(); });
  }));
  // a new passphrase typed twice: say whether the two match, once the second has text
  $$("[data-auth-pair]").forEach((form) => {
    const ins = $$("input", form), a = ins[ins.length - 2], b = ins[ins.length - 1], m = $("[data-auth-match]", form);
    const check = () => {
      m.hidden = !b.value;
      const ok = a.value === b.value;
      m.className = "auth-match " + (ok ? "auth-match--ok" : "auth-match--bad");
      m.innerHTML = `<svg aria-hidden="true" class="ico"><use href="#i-${ok ? "circle-check" : "circle-alert"}"/></svg>${ok ? "They match" : "They differ"}`;
    };
    [a, b].forEach((i) => i.addEventListener("input", check));
    form.addEventListener("reset", () => { m.hidden = true; });
  });
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
    fromConn(k !== "home");
    if (k === "home") { go("appearance"); return; }
    closeAuth(); cnUnlocked = false;
    if (k === "conn-security" || k === "conn-strict") { go("conn-security"); cnLevel.value = cnSaved = k === "conn-strict" ? "strict" : "low"; renderCn(); return; }
    if (["lower-ask", "lower-low", "lower-wrong", "unlock-ask"].includes(k)) {
      go("conn-security"); cnLevel.value = cnSaved = "strict"; renderCn();
      if (k === "unlock-ask") openAuth("unlock", { touch: true });
      else openAuth("lower", { to: k === "lower-low" ? "low" : "none", touch: k === "lower-low", wrong: k === "lower-wrong" });
      return;
    }
    if (k === "conn-queries") { go(k); return; }
    if (k === "updates" || k.startsWith("upd-")) { go("updates"); updState(k === "updates" ? "current" : k.slice(4)); return; }
    go("security");
    passSet = k !== "security" && k !== "pass-new"; renderPass();
    if (k === "pass-new" || k === "pass-new-differ") { openSub("new"); if (k === "pass-new-differ") { $("#p-new").value = "capybara"; $("#p-new2").value = "capybra"; $("#p-new2").dispatchEvent(new Event("input")); } } else if (k === "pass-change") openSub("change"); else if (k === "pass-disable" || k === "pass-disable-wrong") { openSub("disable"); if (k === "pass-disable-wrong") { const i = $("#p-cur2"); i.value = "hunter2"; $("[data-sub-form=\"disable\"]").requestSubmit(); } } else if (k === "pass-reset") openSub("reset");
  };
