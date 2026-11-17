  // Home: connection groups fold, rename in place, and take a new group from a card's Move to group menu
  const toggle = (sec, open) => {
    const b = $(".group-toggle", sec); if (!b) return;
    b.setAttribute("aria-expanded", String(open));
    $("use", b).setAttribute("href", open ? "#i-chevron-down" : "#i-chevron-right");
    $(".projects", sec).hidden = !open;
  };
  $$(".group-toggle").forEach((b) => b.addEventListener("click", () => toggle(b.closest(".conn-group"), b.getAttribute("aria-expanded") !== "true")));
  // Rename group: the name turns into a field; Enter or leaving it keeps the name, Escape puts the old one back
  const rename = (sec, on) => {
    const t = $(".group-toggle", sec), f = $(".group-rename", sec);
    t.hidden = on; f.hidden = !on;
    if (on) { f.value = $("[data-group-name]", sec).textContent; f.focus(); f.select(); }
  };
  const keep = (sec, f) => { if (f.value.trim()) $("[data-group-name]", sec).textContent = f.value.trim(); rename(sec, false); };
  $$(".group-rename").forEach((f) => {
    const sec = f.closest(".conn-group");
    f.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); keep(sec, f); }
      if (e.key === "Escape") { e.stopPropagation(); rename(sec, false); }
    });
    f.addEventListener("blur", () => { if (!f.hidden) keep(sec, f); });
  });
  $$("[data-rename]").forEach((b) => b.addEventListener("click", () => { b.closest(".menu").hidden = true; rename(b.closest(".conn-group"), true); }));
  // New group…: a small dialog for the name
  const dlg = $("#new-group-dlg");
  const newGroup = (on) => { dlg.hidden = !on; if (on) { $("#ng-name").value = ""; $("#ng-name").focus(); } };
  $$("[data-new-group]").forEach((b) => b.addEventListener("click", () => { b.closest(".menu").hidden = true; newGroup(true); }));
  $$("[data-ng-close]").forEach((b) => b.addEventListener("click", () => newGroup(false)));
  $("form", dlg).addEventListener("submit", (e) => { e.preventDefault(); newGroup(false); });
  dlg.addEventListener("mousedown", (e) => { if (e.target === dlg) newGroup(false); });
  // a card with its menu open keeps its actions showing
  const syncCards = () => setTimeout(() => $$(".conn-card").forEach((c) => c.classList.toggle("menu-open", !!$(".menu:not([hidden])", c))));
  ["click", "mousedown", "keydown"].forEach((t) => document.addEventListener(t, syncCards));

  // Search: matches name, host, database or file, engine, and group (a group's name shows all of it).
  // It works on whichever list is showing; clearing it puts every fold back as it was.
  const qIn = $("#home-q");
  const visibleRoots = () => $$("[data-when]").filter((r) => !r.hidden);
  const search = () => {
    const v = qIn.value.trim().toLowerCase();
    let any = false;
    visibleRoots().forEach((root) => {
      const secs = root.matches(".conn-groups") ? $$(".conn-group", root) : [root];
      secs.forEach((sec) => {
        const cards = $$(".conn-card[data-q]", sec);
        const name = $("[data-group-name]", sec)?.textContent.toLowerCase() ?? "";
        const groupHit = !!v && !!name && name.includes(v);
        let n = 0;
        cards.forEach((c) => { const hit = !v || groupHit || c.dataset.q.includes(v); c.hidden = !hit; if (hit) n++; });
        $$(".project-card--new", sec).forEach((c) => { c.hidden = !!v; });
        sec.hidden = !!v && !n;
        const count = $(".group-count", sec); if (count) count.textContent = v ? `${n} of ${cards.length}` : String(cards.length);
        const t = $(".group-toggle", sec);
        const open = !t || t.getAttribute("aria-expanded") === "true";
        $(".projects", sec).hidden = v ? false : !open;
        // the caret shows what is on screen: a folded group opened by the search points down
        if (t) $("use", t).setAttribute("href", v || open ? "#i-chevron-down" : "#i-chevron-right");
        if (n) any = true;
      });
    });
    $("#home-empty").hidden = !v || any;
    $("#home-q-clear").hidden = !qIn.value;
    $("#home-empty-q").textContent = `"${qIn.value.trim()}"`;
  };
  qIn.addEventListener("input", search);
  qIn.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); if (qIn.value) { qIn.value = ""; search(); } else qIn.blur(); }
    if (e.key === "Enter") { const first = visibleRoots().flatMap((r) => $$(".conn-card[data-q]:not([hidden])", r))[0]; if (first) location.href = "./index.html"; }
  });
  const clearSearch = () => { qIn.value = ""; search(); qIn.focus(); };
  $("#home-clear").addEventListener("click", clearSearch);
  $("#home-q-clear").addEventListener("click", clearSearch);
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key.toLowerCase() === "f") { e.preventDefault(); qIn.focus(); qIn.select(); } });

  // Drag a card onto a group (or Ungrouped, or the "new group" zone) to move it. Pointer-driven, as voidHTTP's tree:
  // it starts after 5px, so a click still opens the card, and the click that ends a drag is swallowed.
  let ghost = null;
  const recount = () => {
    $$(".conn-group").forEach((sec) => {
      const n = $$(".conn-card[data-q]", sec).length, c = $(".group-count", sec);
      // a group exists only through its connections: the last one out takes the group with it
      if (!n && sec.querySelector(".group-toggle")) return sec.remove();
      if (c) c.textContent = String(n);
    });
    if (qIn.value.trim()) search();
  };
  const setTarget = (t) => $$(".drop-target").forEach((x) => x !== t && x.classList.remove("drop-target")) || t?.classList.add("drop-target");
  const startDrag = (card) => {
    card.classList.add("dragging");
    document.body.classList.add("cards-dragging");
    ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = $(".proj-tile", card).outerHTML.replace("proj-tile", "proj-tile proj-tile--sm") + `<span>${$(".proj-name", card).textContent}</span>`;
    document.body.append(ghost);
  };
  const placeGhost = (x, y) => { if (ghost) ghost.style.transform = `translate(${x + 14}px, ${y + 10}px) rotate(-1.5deg)`; };
  const endDrag = () => {
    $$(".conn-card.dragging").forEach((c) => c.classList.remove("dragging"));
    document.body.classList.remove("cards-dragging");
    setTarget(null);
    ghost?.remove(); ghost = null;
  };
  const dropOn = (t, card) => {
    if (t.matches(".group-drop-new")) { $("#ng-who").textContent = $(".proj-name", card).textContent; return newGroup(true); }
    const list = $(".projects", t);
    list.insertBefore(card, $(".project-card--new", list));
    recount();
  };
  $$(".conn-card[data-q]").forEach((card) => card.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest(".card-actions")) return;
    const x0 = e.clientX, y0 = e.clientY, home = $(".home");
    let active = false, target = null;
    const move = (ev) => {
      if (!active) {
        if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 5) return;
        active = true; startDrag(card);
      }
      placeGhost(ev.clientX, ev.clientY);
      // near the top or bottom edge the list scrolls, so a far group can be reached
      const r = home.getBoundingClientRect();
      if (ev.clientY < r.top + 40) home.scrollTop -= 14; else if (ev.clientY > r.bottom - 40) home.scrollTop += 14;
      const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".conn-group, .group-drop-new") ?? null;
      // its own group is not a target
      target = t && t !== card.closest(".conn-group") ? t : null;
      setTarget(target);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (!active) return;
      const swallow = (ev) => (ev.stopPropagation(), ev.preventDefault());
      window.addEventListener("click", swallow, true);
      setTimeout(() => window.removeEventListener("click", swallow, true), 0);
      // Escape may have ended it already: then nothing moves
      const live = !!ghost;
      endDrag();
      if (live && target) dropOn(target, card);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }));
  // Escape drops nothing
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ghost) { endDrag(); } });

  const openMenu = (id) => $(`[data-menu="${id}"]`).click();
  window.pvShow = (k) => {
    endDrag();
    $$(".menu").forEach((m) => { m.hidden = true; });
    $$('[aria-haspopup="menu"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
    $$(".conn-group").forEach((sec) => { toggle(sec, true); if ($(".group-rename", sec)) rename(sec, false); });
    newGroup(false);
    const many = ["many", "search", "search-empty"].includes(k);
    $("[data-when=grouped]").hidden = k === "no-groups" || many;
    $("[data-when=many]").hidden = !many;
    $("[data-when=flat]").hidden = k !== "no-groups";
    if (many) toggle($('[data-group-id="m-archive"]'), false);
    // "prod" finds production hosts, *_prod names and the 2024 snapshot inside folded Archive
    qIn.value = k === "search" ? "prod" : k === "search-empty" ? "oracle" : "";
    search();
    if (k === "folded") toggle($('[data-group-id="staging"]'), false);
    if (k === "group-menu") openMenu("gm-prod");
    if (k === "move-menu") openMenu("move-shop");
    if (k === "rename") rename($('[data-group-id="staging"]'), true);
    if (k === "new-group") { $("#ng-who").textContent = "shop_prod"; newGroup(true); }
    // mid-drag: shop_prod held over Staging
    if (k === "dragging") {
      startDrag($('[data-card="shop"]'));
      const st = $('[data-group-id="staging"]');
      setTarget(st);
      const r = $(".projects", st).getBoundingClientRect();
      placeGhost(r.left + r.width * 0.55, r.top + 40);
    }
    syncCards();
  };
