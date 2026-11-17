  // Updates: one chip anchor per step; the chip opens and closes its popover, Escape and a click outside close it
  const anchors = $$("[data-upd]");
  const setOpen = (a, open) => {
    const pop = $(".upd-pop", a); if (!pop) return;
    pop.hidden = !open;
    $(".upd-chip", a).setAttribute("aria-expanded", String(open));
  };
  const step = (k) => {
    const st = k.replace(/-open$/, "");
    anchors.forEach((a) => { a.hidden = a.dataset.upd !== st; setOpen(a, false); });
    const a = anchors.find((x) => x.dataset.upd === st);
    if (a && (k.endsWith("-open") || st !== "available")) setOpen(a, true);
  };
  anchors.forEach((a) => {
    $(".upd-chip", a).addEventListener("click", () => setOpen(a, $(".upd-chip", a).getAttribute("aria-expanded") !== "true"));
    $$("[data-upd-close]", a).forEach((b) => b.addEventListener("click", () => setOpen(a, false)));
    $$("[data-upd-go]", a).forEach((b) => b.addEventListener("click", () => step(b.dataset.updGo)));
  });
  window.addEventListener("mousedown", (e) => anchors.forEach((a) => { if (!a.contains(e.target)) setOpen(a, false); }));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") anchors.forEach((a) => setOpen(a, false)); }, true);
  window.pvShow = step;
