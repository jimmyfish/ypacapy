  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);

  // Theme: Auto/Light/Dark plus a colour scheme per appearance. The bar's Light/Dark stands in for the Mac's appearance.
  const { SCHEMES, BUILTIN, DEFAULT_SCHEME, FAMILIES, findScheme, isDark, schemeTokens, schemeSwatch } = window.YpaThemes;
  const DEF = { mode: "auto", light: DEFAULT_SCHEME.light, dark: DEFAULT_SCHEME.dark, os: "light", density: "" };
  const st = Object.fromEntries(Object.entries(DEF).map(([k, v]) => [k, q.get(k) ?? v]));
  // Fonts: the values Settings writes (voidHTTP's four, plus the table face and size)
  const FONT = { "--font-ui": "fui", "--font-table": "ftable", "--font-mono": "fmono", "--font-size-ui": "sui", "--font-size-table": "stable", "--font-size-code": "scode" };
  const fonts = {};

  // every link between screens carries the theme, density and fonts, so a pick survives the jump
  function writeUrl() {
    const u = new URL(location);
    for (const k of Object.keys(DEF)) st[k] !== DEF[k] ? u.searchParams.set(k, st[k]) : u.searchParams.delete(k);
    for (const [prop, k] of Object.entries(FONT)) fonts[prop] ? u.searchParams.set(k, fonts[prop]) : u.searchParams.delete(k);
    history.replaceState(null, "", u);
    const carry = new URLSearchParams(u.search); carry.delete("show");
    $$(".pv-screens a, [data-href], [data-close]").forEach((a) => {
      const attr = a.tagName === "A" ? "href" : a.dataset.href ? "data-href" : "data-close";
      const base = a.dataset.base || (a.dataset.base = a.getAttribute(attr));
      const t = new URL(base, location.href); carry.forEach((v, k) => t.searchParams.set(k, v));
      a.setAttribute(attr, t.href);
    });
  }

  const opts = `<optgroup label="ypacapy">${Object.entries(BUILTIN).map(([id, b]) => `<option value="${id}">${b.name}</option>`).join("")}</optgroup>` +
    FAMILIES.map((f) => `<optgroup label="${f}">${SCHEMES.filter((x) => x.family === f).map((x) => `<option value="${x.id}">${x.name}</option>`).join("")}</optgroup>`).join("");
  $$("select[data-scheme]").forEach((sel) => { sel.innerHTML = opts; sel.addEventListener("change", () => { st[sel.dataset.scheme] = sel.value; apply(); }); });

  let set = [];
  function apply() {
    const id = st[st.mode === "auto" ? st.os : st.mode];
    set.forEach((k) => root.style.removeProperty(k)); set = [];
    const sc = findScheme(id);
    root.dataset.theme = sc ? (isDark(sc) ? "dark" : "light") : BUILTIN[id]?.dark ? "dark" : "light";
    if (sc) Object.entries(schemeTokens(sc)).forEach(([k, v]) => { root.style.setProperty(k, v); set.push(k); });
    if (st.density) root.dataset.density = st.density; else delete root.dataset.density;
    // rows: both slots under Auto, one under Light or Dark
    const auto = st.mode === "auto";
    $$("[data-scheme-row]").forEach((row) => {
      const slot = row.dataset.schemeRow;
      row.hidden = !auto && slot !== st.mode;
      if (row.hidden) return;
      $("[data-scheme-label]", row).textContent = auto ? (slot === "light" ? "Light theme" : "Dark theme") : "Color scheme";
      $("select", row).value = st[slot];
      const [bg, ...dots] = schemeSwatch(st[slot]);
      const d = $(".scheme-dots", row); d.style.background = bg; d.innerHTML = dots.map((c) => `<i style="background:${c}"></i>`).join("");
    });
    $$("[data-set-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setTheme === st.mode)));
    $$("[data-os-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.osSet === st.os)));
    $$("[data-density-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.densitySet === st.density)));
    const compact = $("#set-compact"); if (compact) compact.checked = st.density === "compact";
    writeUrl();
  }
  $$("[data-set-theme]").forEach((b) => b.addEventListener("click", () => { st.mode = b.dataset.setTheme; apply(); }));
  $$("[data-os-set]").forEach((b) => b.addEventListener("click", () => { st.os = b.dataset.osSet; apply(); }));
  $$("[data-density-set]").forEach((b) => b.addEventListener("click", () => { st.density = b.dataset.densitySet; apply(); }));
  $("#set-compact")?.addEventListener("change", (e) => { st.density = e.target.checked ? "compact" : ""; apply(); });

  // a font named in Settings gets its kind of fallback; the bar's selects carry whole stacks
  const FALLBACK = { "--font-ui": "ui-sans-serif, system-ui, sans-serif", "--font-table": "ui-monospace, monospace", "--font-mono": "ui-monospace, monospace" };
  function setFont(prop, v) {
    fonts[prop] = v;
    if (v) root.style.setProperty(prop, v); else root.style.removeProperty(prop);
    $$(`select[data-font="${prop}"], select[data-size="${prop}"]`).forEach((s) => { s.value = [...s.options].some((o) => o.value === v) ? v : ""; });
    writeUrl();
  }
  for (const [prop, k] of Object.entries(FONT)) if (q.get(k)) setFont(prop, q.get(k));
  $$("select[data-font], select[data-size]").forEach((sel) => sel.addEventListener("change", () => setFont(sel.dataset.font || sel.dataset.size, sel.value)));
  $$("input[data-font-name]").forEach((inp) => inp.addEventListener("input", () => {
    const prop = inp.dataset.fontName, v = inp.value.trim();
    setFont(prop, v ? `"${v}", ${FALLBACK[prop]}` : "");
  }));
  $("#set-reset")?.addEventListener("click", () => {
    Object.assign(st, { mode: DEF.mode, light: DEF.light, dark: DEF.dark, density: "" });
    Object.keys(FONT).forEach((p) => setFont(p, ""));
    $$("input[data-font-name]").forEach((i) => { i.value = ""; });
    $(".res-actions .menu button").forEach((b) => b.addEventListener("click", () => { const m = b.closest(".menu"); m.hidden = true; $(`[data-menu="${m.id}"]`).setAttribute("aria-expanded", "false"); }));
  apply();
  });

  // Screens and states
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-href]"); if (t && !t.disabled) { location.href = t.dataset.href; return; }
    const b = e.target.closest("[data-close]"); if (b && e.target === b) location.href = b.dataset.close;
  });
  document.addEventListener("keydown", (e) => {
    const b = $("[data-close]"); if (e.key === "Escape" && b && !$(".menu:not([hidden])")) location.href = b.dataset.close;
    if (e.metaKey && e.key === ",") { e.preventDefault(); location.href = $(".strip-settings").dataset.href; }
  });
  const shows = $$("[data-show]");
  window.pvShow = () => {};
  function show(k) {
    shows.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.show === k)));
    window.pvShow(k);
    const u = new URL(location); u.searchParams.set("show", k); history.replaceState(null, "", u);
  }
  shows.forEach((b) => b.addEventListener("click", () => show(b.dataset.show)));
  // preview-only: the shop_prod colour picker in the bar recolours its title-strip tab and rides in the URL as ?tabc=
  function tabColor(n) {
    const tab = $(".ptab--project");
    if (tab) { tab.style.setProperty("--fg", `var(--proj-${n}-fg)`); tab.style.setProperty("--bg", `var(--proj-${n}-bg)`); }
  }
  $$("select[data-tabc]").forEach((sel) => {
    const n = q.get("tabc"); if (n) { sel.value = n; tabColor(n); }
    sel.addEventListener("change", () => {
      tabColor(sel.value);
      const u = new URL(location); sel.value === "6" ? u.searchParams.delete("tabc") : u.searchParams.set("tabc", sel.value);
      history.replaceState(null, "", u); writeUrl();
    });
  });
  function pvStart() { if (!shows.length) return; const k = q.get("show"); show(shows.some((b) => b.dataset.show === k) ? k : shows[0].dataset.show); }

  // ---------- the app itself (shipped behaviour) ----------
  // Rail: Schema, History and Saved queries swap the sidebar; the tabs bar toggle hides it
  {
    const panel = $(".panel");
    $$(".rail-item[data-rail]").forEach((r) => r.addEventListener("click", () => {
      $$(".rail-item[data-rail]").forEach((x) => x.toggleAttribute("aria-current", x === r) || x.removeAttribute("aria-current"));
      r.setAttribute("aria-current", "page");
      $$("[data-side]").forEach((s) => { s.hidden = s.dataset.side !== r.dataset.rail; });
      panel?.classList.remove("no-side");
    }));
    const tgl = $(".side-toggle");
    tgl?.addEventListener("click", () => {
      const off = panel.classList.toggle("no-side");
      tgl.setAttribute("aria-label", off ? "Show sidebar" : "Hide sidebar");
      tgl.title = off ? "Show sidebar  ⌘\\" : "Hide sidebar  ⌘\\";
    });
  }
  // Schema tree: groups open and close; the filter narrows by name and says when nothing matches
  {
    const rows = $$('#tree .row[data-path]');
    const shown = (row) => { const parts = row.dataset.path.split("/"); for (let i = 1; i < parts.length; i++) { const g = rows.find((r) => r.dataset.path === parts.slice(0, i).join("/")); if (g && $(".row-main", g).getAttribute("aria-expanded") === "false") return false; } return true; };
    const layout = (filter = "") => {
      let any = false;
      rows.forEach((r) => {
        const leaf = !$(".row-main", r).hasAttribute("aria-expanded");
        const hit = !filter || !leaf || $(".name", r).textContent.toLowerCase().includes(filter);
        r.hidden = filter ? !(leaf && hit) && !(!leaf && rows.some((x) => x.dataset.path.startsWith(r.dataset.path + "/") && !$(".row-main", x).hasAttribute("aria-expanded") && $(".name", x).textContent.toLowerCase().includes(filter))) : !shown(r);
        if (leaf && !r.hidden) any = true;
      });
      const empty = $("#tree-empty"); if (empty) { empty.hidden = !filter || any; $("#tree-empty-q").textContent = `"${filter}"`; }
    };
    $$("#tree [data-group]").forEach((g) => g.addEventListener("click", () => {
      const open = g.getAttribute("aria-expanded") !== "true";
      g.setAttribute("aria-expanded", String(open));
      $("use", g).setAttribute("href", open ? "#i-chevron-down" : "#i-chevron-right");
      layout($("#tree-filter").value.trim().toLowerCase());
    }));
    const f = $("#tree-filter");
    f?.addEventListener("input", () => layout(f.value.trim().toLowerCase()));
    $("#tree-clear")?.addEventListener("click", () => { f.value = ""; layout(); f.focus(); });
  }
  function fillCols(m) {
    const wrap = $(".grid-wrap[tabindex]").find((w) => w.offsetParent !== null); if (!wrap) return;
    const heads = $("thead th", wrap).filter((h) => !h.classList.contains("rownum"));
    m.innerHTML = `<p class="menu-note">${heads.length} columns</p>` + heads.map((h, i) => `<button type="button" role="menuitem" data-col="${i + 1}"><span>${$(".col-name", h).textContent}</span><span class="col-t">${$(".col-type", h).textContent}</span></button>`).join("");
    $("[data-col]", m).forEach((b) => b.addEventListener("click", () => {
      const cell = $(`tbody tr td:nth-child(${+b.dataset.col + 1})`, wrap);
      heads[+b.dataset.col - 1].scrollIntoView({ block: "nearest", inline: "center" });
      if (cell) cell.click();
      m.hidden = true; $(`[data-menu="${m.id}"]`).setAttribute("aria-expanded", "false"); wrap.focus();
    }));
  }
  // Security level pickers in dialogs: the menu sets the hidden select; the select's value and disabled options draw the button and menu
  $$("[data-level-pick]").forEach((wrap) => {
    const sel = $("select", wrap), btn = $(".level-btn", wrap), menu = $(".menu", wrap);
    const draw = () => {
      const v = sel.value, item = $(`[data-pick="${v}"]`, menu);
      $(".env-name", btn).textContent = $(".gm-text > span", item).textContent;
      $(".guard-ico use", btn).setAttribute("href", `#i-${item.dataset.icon}`);
      btn.dataset.level = v;
      btn.setAttribute("aria-label", `Security level: ${$(".env-name", btn).textContent}`);
      $$("[data-pick]", menu).forEach((b) => {
        const opt = $(`option[value="${b.dataset.pick}"]`, sel), small = $("small", b);
        b.setAttribute("aria-checked", String(b.dataset.pick === v));
        b.disabled = opt.disabled;
        small.textContent = opt.disabled && b.dataset.pick === "strict" ? "Set a passphrase in Settings first" : small.dataset.desc;
      });
    };
    sel.addEventListener("change", draw);
    $$("[data-pick]", menu).forEach((b) => b.addEventListener("click", () => {
      menu.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus();
      if (sel.value === b.dataset.pick) return;
      sel.value = b.dataset.pick; sel.dispatchEvent(new Event("change"));
    }));
    draw();
  });
  // Menus: the row "…" menu and Run's menu; Escape or a click elsewhere closes them
  {
    const rowMenu = $("#row-menu");
    const closeAll = () => {
      $$(".menu:not([hidden])").forEach((m) => { m.hidden = true; });
      $$(".row.menu-open").forEach((r) => r.classList.remove("menu-open"));
      $$('[aria-haspopup="menu"][aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
    };
    $$(".row-more").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = b.closest(".row"), open = !row.classList.contains("menu-open");
      closeAll(); if (!open || !rowMenu) return;
      // a row can name its own menu (a schema's); table rows share #row-menu
      const m = row.dataset.rowMenu ? $(`#${row.dataset.rowMenu}`) : rowMenu;
      row.append(m); m.hidden = false; row.classList.add("menu-open"); b.setAttribute("aria-expanded", "true");
      m.querySelector("button").focus();
    }));
    $$("[data-menu]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const m = $(`#${b.dataset.menu}`), open = m.hidden;
      if (open && m.hasAttribute("data-cols")) fillCols(m);
      closeAll(); if (!open) return;
      m.hidden = false; b.setAttribute("aria-expanded", "true"); m.querySelector("button").focus();
    }));
    // Right-click on a tree row opens the same menu as its "…"
    $$(".row").forEach((row) => row.addEventListener("contextmenu", (e) => {
      const b = $(".row-more", row); if (!b) return;
      e.preventDefault(); closeAll(); b.click();
    }));
    document.addEventListener("mousedown", (e) => { if (!e.target.closest(".menu, .row-more, [data-menu]")) closeAll(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
  }
  // Right-click on a result cell: copy its value, or its row in the Copy button's formats. Opens at the pointer.
  const cellMenu = document.createElement("div");
  cellMenu.className = "menu ctx-menu"; cellMenu.id = "cell-menu"; cellMenu.hidden = true;
  cellMenu.setAttribute("role", "menu"); cellMenu.setAttribute("aria-label", "Cell");
  cellMenu.innerHTML = `<button type="button" role="menuitem" data-ctx="value">Copy value<kbd>⌘C</kbd></button><hr><p class="menu-note">Copy row as</p>${["Plain text", "JSON", "Markdown table", "CSV"].map((f) => `<button type="button" role="menuitem">${f}</button>`).join("")}`;
  document.body.append(cellMenu);
  $$("button", cellMenu).forEach((b) => b.addEventListener("click", () => { cellMenu.hidden = true; }));
  const openCellMenu = (x, y, isNull) => {
    $$(".menu:not([hidden])").forEach((m) => { m.hidden = true; });
    $('[data-ctx="value"]', cellMenu).disabled = isNull;
    cellMenu.hidden = false;
    const r = cellMenu.getBoundingClientRect();
    cellMenu.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
    cellMenu.style.top = `${y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y}px`;
    $("button:not(:disabled)", cellMenu).focus();
  };
  // Grid: a cell is the unit. Click or arrow to a cell; the inspector under the grid shows its column, type, row and full value.
  // A head sorts the rows already on screen (no new query); the row numbers keep the order the database returned.
  $$(".grid-wrap[tabindex]").forEach((wrap) => {
    const ins = wrap.parentElement.querySelector(".inspector");
    const heads = () => $$("thead th", wrap);
    let cur = null;
    const pick = (td, scroll = true) => {
      if (!td || td.classList.contains("rownum")) return;
      $$("td.cell-sel", wrap).forEach((x) => x.classList.remove("cell-sel"));
      $$('tbody tr[aria-selected="true"]', wrap).forEach((r) => r.removeAttribute("aria-selected"));
      td.classList.add("cell-sel"); td.parentElement.setAttribute("aria-selected", "true"); cur = td;
      if (ins) {
        const th = heads()[td.cellIndex];
        $(".ins-col", ins).textContent = $(".col-name", th).textContent;
        $(".ins-type", ins).textContent = $(".col-type", th).textContent;
        $(".ins-row", ins).textContent = `row ${td.parentElement.sectionRowIndex + 1}`;
        // MongoDB: a missing field is not null; the document has no such field
        const v = $(".ins-value", ins), isNull = td.classList.contains("null"), isMissing = td.classList.contains("missing");
        v.textContent = isMissing ? "missing, this document has no such field" : isNull ? "null, no value" : td.dataset.full ?? td.textContent;
        v.classList.toggle("is-null", isNull || isMissing);
      }
      if (scroll) td.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    wrap.addEventListener("click", (e) => {
      const td = e.target.closest("tbody td"); if (!td) return;
      pick(td.classList.contains("rownum") ? td.nextElementSibling : td);
    });
    wrap.addEventListener("contextmenu", (e) => {
      let td = e.target.closest("tbody td"); if (!td) return;
      e.preventDefault();
      if (td.classList.contains("rownum")) td = td.nextElementSibling;
      pick(td, false);
      openCellMenu(e.clientX, e.clientY, td.classList.contains("null") || td.classList.contains("missing"));
    });
    wrap.addEventListener("keydown", (e) => {
      const d = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (!d || !cur) return;
      e.preventDefault();
      const rows = $$("tbody tr", wrap), row = rows[Math.max(0, Math.min(rows.length - 1, rows.indexOf(cur.parentElement) + d[0]))];
      pick(row.cells[Math.max(1, Math.min(row.cells.length - 1, cur.cellIndex + d[1]))]);
    });
    ins && $(".ins-copy", ins).addEventListener("click", () => { navigator.clipboard?.writeText($(".ins-value", ins).textContent).catch(() => {}); });
    $$("thead .th-btn", wrap).forEach((b) => b.addEventListener("click", () => {
      const th = b.closest("th"), i = th.cellIndex, dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
      heads().forEach((h) => { if (h.hasAttribute("aria-sort")) { h.setAttribute("aria-sort", "none"); const u = $(".sort-ico use", h); if (u) u.setAttribute("href", "#i-arrow-up-down"); } });
      th.setAttribute("aria-sort", dir); $(".sort-ico use", th).setAttribute("href", dir === "ascending" ? "#i-arrow-up" : "#i-arrow-down");
      const key = (tr) => {
        const td = tr.cells[i]; if (td.classList.contains("null") || td.classList.contains("missing")) return null;
        const v = td.dataset.full ?? td.textContent, n = Number(v.replace(/,/g, ""));
        return th.classList.contains("num") && !Number.isNaN(n) ? n : v;
      };
      const tb = $("tbody", wrap);
      $$("tr", tb).sort((x, y) => { const p = key(x), q = key(y); if (p === null) return 1; if (q === null) return -1; const r = p < q ? -1 : p > q ? 1 : 0; return dir === "ascending" ? r : -r; }).forEach((r) => tb.append(r));
    }));
    const start = $('tbody tr[aria-selected="true"] td:not(.rownum)', wrap); if (start) pick(start, false);
  });
  // The divider between query and results, by pointer and arrow keys
  {
    const d = $(".divider"), top = $("#req-pane");
    if (d && top) {
      let ratio = 1;
      const setR = (r) => { ratio = Math.max(0.3, Math.min(3, r)); top.style.flexGrow = String(ratio); };
      d.addEventListener("pointerdown", (e) => {
        d.setPointerCapture(e.pointerId);
        const body = d.parentElement.getBoundingClientRect();
        const move = (ev) => { const y = ev.clientY - body.top; setR((y / (body.height - y)) * 1.1); };
        const up = () => { d.removeEventListener("pointermove", move); d.removeEventListener("pointerup", up); };
        d.addEventListener("pointermove", move); d.addEventListener("pointerup", up);
      });
      d.addEventListener("keydown", (e) => { if (e.key === "ArrowUp") setR(ratio * 0.9); if (e.key === "ArrowDown") setR(ratio * 1.1); });
    }
  }

  apply();
  // many tabs: the row scrolls sideways with no scrollbar; the edge with tabs past it fades, and a mouse wheel scrolls the row
  $$(".tabs").forEach((el) => {
    const edges = () => { el.dataset.fadeStart = String(el.scrollLeft > 1); el.dataset.fadeEnd = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1); };
    new ResizeObserver(edges).observe(el);
    el.addEventListener("scroll", edges, { passive: true });
    el.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY; }, { passive: true });
    edges();
  });
  // Tabs: right-click for Pin tab / Unpin tab, Close tab, and Close other tabs / to the right / to the left (never a
  // pinned tab; greyed out when there's none to close; in the app one ask covers the tabs with unsaved work). A pinned tab joins the pinned ones at the left, keeps its
  // width, and shows a pin where its close button was (click the pin to unpin). It stays open: Close and ⌘W skip it.
  // In the app a pinned tab is kept with its connection, across a restart and a reconnect. A tab marked
  // data-unpinnable (a diagram) has no Pin tab: once saved, Show diagram reopens it as saved.
  {
    const tabsEl = $(".tabs");
    if (tabsEl) {
      const icon = (n) => `<svg aria-hidden="true" class="ico"><use href="#i-${n}"/></svg>`;
      const menu = document.createElement("div");
      menu.className = "menu ctx-menu"; menu.id = "tab-menu"; menu.hidden = true;
      menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Tab");
      menu.innerHTML = `<button type="button" role="menuitem" data-tm="pin"></button><hr><button type="button" role="menuitem" data-tm="close">${icon("x")}Close tab<kbd>⌘W</kbd></button><button type="button" role="menuitem" data-tm="others">${icon("copy-x")}Close other tabs</button><button type="button" role="menuitem" data-tm="right">${icon("arrow-right-to-line")}Close tabs to the right</button><button type="button" role="menuitem" data-tm="left">${icon("arrow-left-to-line")}Close tabs to the left</button><p class="menu-note" data-tm-note hidden>Unpin the tab to close it</p><p class="menu-note tm-wrap" data-tm-unpin hidden>Diagrams are not pinned. Once saved, Show diagram reopens this one as saved.</p>`;
      document.body.append(menu);
      let cur = null;
      // the tabs each bulk close takes: shown, unpinned, not the tab itself
      const bulk = (t) => {
        const all = $$(".tab", tabsEl).filter((x) => !x.hidden);
        const i = all.indexOf(t);
        const ids = (list) => list.filter((x) => x !== t && !x.hasAttribute("data-pinned"));
        return { others: ids(all), right: ids(all.slice(i + 1)), left: ids(all.slice(0, i)) };
      };
      const pinned = () => $$(".tab[data-pinned]", tabsEl);
      const setPinned = (t, on) => {
        t.toggleAttribute("data-pinned", on);
        const last = pinned().filter((x) => x !== t).pop();
        last ? last.after(t) : tabsEl.prepend(t);
        t.scrollIntoView({ block: "nearest", inline: "nearest" });
      };
      $$(".tab .pin", tabsEl).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); setPinned(b.closest(".tab"), false); }));
      $$(".tab", tabsEl).forEach((t) => t.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        $$(".menu:not([hidden])").forEach((m) => { m.hidden = true; });
        cur = t;
        const on = t.hasAttribute("data-pinned"), fixed = t.hasAttribute("data-unpinnable");
        $('[data-tm="pin"]', menu).hidden = fixed; $("hr", menu).hidden = fixed; $("[data-tm-unpin]", menu).hidden = !fixed;
        $('[data-tm="pin"]', menu).innerHTML = on ? `${icon("pin-off")}Unpin tab` : `${icon("pin")}Pin tab`;
        $('[data-tm="close"]', menu).disabled = on;
        $("[data-tm-note]", menu).hidden = !on;
        for (const [k, list] of Object.entries(bulk(t))) $(`[data-tm="${k}"]`, menu).disabled = !list.length;
        menu.hidden = false;
        const r = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(e.clientX, innerWidth - r.width - 8))}px`;
        menu.style.top = `${e.clientY + r.height > innerHeight - 8 ? Math.max(8, e.clientY - r.height) : e.clientY}px`;
        $("button:not([hidden])", menu).focus();
      }));
      $('[data-tm="pin"]', menu).addEventListener("click", () => { menu.hidden = true; if (cur) setPinned(cur, !cur.hasAttribute("data-pinned")); });
      $('[data-tm="close"]', menu).addEventListener("click", () => { menu.hidden = true; if (cur && !cur.hasAttribute("data-pinned")) cur.hidden = true; });
      for (const k of ["others", "right", "left"]) $(`[data-tm="${k}"]`, menu).addEventListener("click", () => { menu.hidden = true; if (cur) bulk(cur)[k].forEach((x) => (x.hidden = true)); });
    }
  }
  // Security level of the open connection: None, Low or Strict; lowering from Strict asks for the passphrase first (in the app)
  {
    const btn = $("#guard-btn");
    if (btn) {
      const LABEL = { none: "None", low: "Low", strict: "Strict" };
      const setLevel = (lvl) => {
        $$("[data-guard]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.guard === lvl)));
        btn.dataset.level = lvl;
        $("#guard-name").textContent = LABEL[lvl];
        $(".guard-ico use", btn).setAttribute("href", `#i-${$(`[data-guard="${lvl}"]`).dataset.icon}`);
        btn.setAttribute("aria-label", `Security level for shop_prod: ${LABEL[lvl]}`);
      };
      $$("[data-guard]").forEach((b) => b.addEventListener("click", () => { setLevel(b.dataset.guard); $("#guard-menu").hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); }));
      setLevel("low");
    }
  }

  // Modal exit, preview flavour of src/lib/modalExit.ts: pages close a dialog by setting `hidden`, so a hidden
  // .backdrop gets an inert copy beside it that plays .closing and removes itself.
  new MutationObserver((records) => {
    for (const r of records) {
      const d = r.target;
      if (r.oldValue !== null || !d.hidden || !d.classList.contains("backdrop") || d.classList.contains("closing")) continue;
      const g = d.cloneNode(true);
      g.removeAttribute("id"); g.hidden = false; g.inert = true; g.classList.add("closing");
      d.after(g);
      const rm = () => g.remove();
      g.addEventListener("animationend", (e) => e.target === g && rm());
      setTimeout(rm, 600);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true, subtree: true });
