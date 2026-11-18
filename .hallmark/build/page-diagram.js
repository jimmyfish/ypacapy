  // ER diagram tab, read-only (port of opengrip's DiagramView). Model, layout and line geometry come from
  // src/lib/diagram.ts (inlined above as window.Erd); this script only draws and handles the pointer.
  // Every diagram opened from a menu starts with the table picker; only the ticked tables are read and drawn.
  // Tables reopens the picker. Drag a table to move it (Reset layout undoes it), drag the background or scroll to
  // pan, ⌘ + scroll or pinch to zoom. Selecting a table marks the columns its keys link and the cardinality at both ends.
  // Diagram tabs can't be pinned. Save (⌘S) keeps a diagram's picked tables, the place of every box, zoom and column
  // detail: in the app with the connection's workspace (~/.config/ypacapy), here in `saved`. Nothing is kept on its
  // own: no listener writes on change or drag. Show diagram reopens a saved diagram as saved, with no picker (Tables
  // changes the picks); a diagram never saved opens the picker again. Tables ticked after the save are laid out to the right of the saved ones;
  // a saved table altered since keeps its place and takes its new size, overlapping its neighbours if it must.
  {
    const E = window.Erd, BASE = window.ERD_DATA, LINKS = window.ERD_LINKS;
    // the catalog as read now; preview states alter a copy to show a table changed since the save
    let DATA = structuredClone(BASE);
    const host = $("#erd-host"), world = $("#erd-world"), menu = $("#erd-menu"), detailSel = $("#erd-detail");
    const dlg = $("#erd-pick-dlg"), list = $("#ep-list"), filter = $("#ep-filter");
    const ALL = $$("input[type=checkbox]", list).map((c) => c.value);
    const DETAILS = { "All columns": "all", "Key columns": "keys", "Table names": "none" };
    const MIN_ZOOM = 0.1, MAX_ZOOM = 3, FIT_PAD = 24, MARK_GAP = 5, ARROW_GAP = 12, GRID = 16;
    const clampZoom = (k) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
    const escH = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const icon = (n, cls = "") => `<svg aria-hidden="true" class="ico${cls ? " " + cls : ""}"><use href="#i-${n}"/></svg>`;
    const colIcon = (c) => (c.primaryKey ? "key-round" : c.foreignKey ? "link" : TYPE_ICON(c.type));
    const markAt = (end, gap) => ({ x: end.x + end.out * gap, y: end.y - 5, anchor: end.out > 0 ? "start" : "end" });

    // title: what the tab was opened from (the schema, or a table's Show diagram); tables: the picked ones
    let ref = { schema: "public", tables: [] }, title = "public", detail = "all", selected = null, view = { x: 0, y: 0, k: 1 }, moves = new Map();
    let model, layout, tables;
    /** per diagram (its title), written by Save only: { schema, tables, positions, view, detail, at } */
    const saved = new Map();
    let restoreView = null, restoring = null;
    /** Reset layout pressed: draw every table afresh, ignoring the saved places, until the next Save */
    let auto = false;
    const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    /** A never-saved diagram as first drawn from the picker: what "Not saved" compares against until the first Save */
    let baseline = null;
    /** Changed by hand: picks, places or column detail differ from the last Save, or from the first drawing when
     *  never saved. Zoom and pan alone don't count. "Not saved", the tab's dot and Close's ask follow this. */
    function changed() {
      const base = saved.get(title) ?? baseline;
      if (!base || !ref.tables.length) return false;
      return !sameSet(ref.tables, base.tables) || moves.size > 0 || auto || detail !== base.detail;
    }
    /** Save is offered for any change, and for a diagram never saved at all */
    const canSave = () => ref.tables.length > 0 && (!saved.has(title) || changed());
    const two = (n) => String(n).padStart(2, "0");
    function savedAt(d) {
      const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
      const today = new Date().toDateString() === d.toDateString();
      return today ? `Last saved at ${time}` : `Last saved ${d.getDate()} ${d.toLocaleString("en", { month: "short" })} at ${time}`;
    }
    /** The toolbar's right end: nothing when never saved and untouched, Not saved after a change, else Last saved at */
    function showDirty() {
      const ready = !$('[data-erd="ready"]').hidden;
      const c = ready && changed(), sv = saved.get(title);
      const btn = $("#erd-save");
      btn.disabled = !ready || !canSave(); $("span", btn).textContent = ready && !canSave() && sv ? "Saved" : "Save";
      $('.tab[data-tab="erd"] .dirty').hidden = !c;
      const st = $("#erd-status");
      st.textContent = !ready ? "" : c ? "Not saved" : sv ? savedAt(sv.at) : "";
      st.classList.toggle("unsaved", c);
      st.title = !c && sv ? sv.at.toLocaleString("en", { dateStyle: "full", timeStyle: "short" }) : "";
    }
    function save() {
      if (!layout || !canSave()) return;
      saved.set(title, { schema: ref.schema, tables: [...ref.tables], positions: E.positionsOf(layout), view: { ...view }, detail, at: new Date() });
      moves = new Map(); auto = false;
      draw();
    }
    // boxes carry their index in model.tables: table keys hold a NUL, which HTML turns into U+FFFD
    const keyOf = (el) => { const i = el?.closest("[data-table]")?.dataset.table; return i === undefined ? null : model.tables[+i].key; };

    // the canvas tools work on a drawn diagram only; Tables stays on to pick again
    const TOOLS = ["#erd-refresh", "#erd-out", "#erd-in", "#erd-actual", "#erd-fit", "#erd-reset", "#erd-detail", "#erd-export"];
    const canReset = () => moves.size > 0 || (!auto && !!saved.get(title)?.positions.size);
    function state(k) {
      $$(".erd-state").forEach((s) => { s.hidden = s.dataset.erd !== k; });
      TOOLS.forEach((id) => { $(id).disabled = k !== "ready" || (id === "#erd-reset" && !canReset()); });
      showDirty();
    }
    function draw() {
      const places = auto ? new Map() : saved.get(title)?.positions ?? new Map();
      layout = E.withMoves(E.layoutWithSaved(model, detail, places), moves);
      const linked = E.linkedColumns(model.edges, selected);
      const edges = model.edges.map((e) => {
        const g = E.edgeGeometry(e, layout, tables, detail);
        if (!g) return "";
        const from = tables.get(e.from), to = tables.get(e.to);
        const card = E.cardinality(e, from);
        const on = selected !== null && (e.from === selected || e.to === selected);
        const a = markAt(g.start, MARK_GAP), b = markAt(g.end, ARROW_GAP);
        return `<g class="erd-edge${on ? " on" : ""}"><title>${escH(e.name)}&#10;${escH(E.edgeLabel(e, from, to, card))}</title>` +
          `<path class="erd-hit" d="${g.path}"/><path class="erd-line" d="${g.path}"/><path class="erd-arrow" d="${g.arrow}"/>` +
          `<text class="erd-label" x="${g.mid.x}" y="${g.mid.y - 5}">${escH(e.columns.join(", "))}</text>` +
          (on ? `<text class="erd-mark" x="${a.x}" y="${a.y}" text-anchor="${a.anchor}">${card.from}</text><text class="erd-mark" x="${b.x}" y="${b.y}" text-anchor="${b.anchor}">${card.to}</text>` : "") +
          `</g>`;
      }).join("");
      const boxes = model.tables.map((t, i) => {
        const b = layout.boxes.get(t.key);
        const outside = t.schema !== ref.schema;
        const rows = E.visibleColumns(t, detail).map((c) => `<div class="erd-row${linked.get(t.key)?.has(c.name) ? " linked" : ""}">${icon(colIcon(c), c.primaryKey ? "pk" : c.foreignKey ? "fk" : "")}<span class="erd-name">${escH(c.name)}</span><span class="erd-type">${escH(c.type)}</span></div>`).join("");
        return `<div class="erd-table${selected === t.key ? " selected" : ""}${outside ? " outside" : ""}" data-table="${i}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px" title="${escH(`${t.schema}.${t.name}`)}${outside ? " (linked from another schema)" : ""}">` +
          `<div class="erd-head">${icon("table-2")}<span class="erd-name">${escH(t.label)}</span></div>${rows ? `<div class="erd-rows">${rows}</div>` : ""}</div>`;
      }).join("");
      world.style.width = `${layout.width}px`; world.style.height = `${layout.height}px`;
      world.innerHTML = `<svg class="erd-edges" width="${layout.width}" height="${layout.height}" aria-hidden="true">${edges}</svg>${boxes}`;
      place();
      $("#erd-reset").disabled = !canReset();
      showDirty();
    }
    function place() {
      world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
      host.style.backgroundSize = `${GRID * view.k}px ${GRID * view.k}px`;
      host.style.backgroundPosition = `${view.x}px ${view.y}px`;
      $("#erd-actual").textContent = `${Math.round(view.k * 100)}%`;
    }
    function fit() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height || !layout?.width) return;
      const k = clampZoom(Math.min(1, (width - FIT_PAD) / layout.width, (height - FIT_PAD) / layout.height));
      view = { k, x: (width - layout.width * k) / 2, y: Math.max(FIT_PAD / 2, (height - layout.height * k) / 2) };
      place();
    }
    function zoomBy(f, at) {
      const r = host.getBoundingClientRect();
      const px = at?.x ?? r.width / 2, py = at?.y ?? r.height / 2;
      const k = clampZoom(view.k * f);
      view = { k, x: px - ((px - view.x) * k) / view.k, y: py - ((py - view.y) * k) / view.k };
      place();
    }
    function heading() {
      $("#erd-title").textContent = title;
      $('.tab[data-tab="erd"] .name').textContent = title;
      host.setAttribute("aria-label", `Diagram of ${title}`);
      $("#erd-pick-n").textContent = ref.tables.length ? `${ref.tables.length} of ${ALL.length}` : "";
    }
    /** Draws the picked tables: saved ones where they were saved, the rest laid out beside them. */
    function apply(picked, { refit = true } = {}) {
      ref = { schema: ref.schema, tables: picked };
      if (selected && !picked.some((n) => E.tableKey(ref.schema, n) === selected)) selected = null;
      heading();
      if (!picked.length) { state("none"); return; }
      state("ready");
      model = E.diagramModel(DATA, ref);
      tables = new Map(model.tables.map((t) => [t.key, t]));
      if (!saved.has(title) && !baseline) baseline = { tables: [...picked], detail };
      draw();
      if (restoreView) { view = restoreView; restoreView = null; place(); } else if (refit) fit();
    }
    /** Show diagram from a menu: the tab comes back (it may have been closed). Saved: drawn as saved. Never saved: the picker. */
    function openDiagram(name, schema, preset) {
      const tab = $('.tab[data-tab="erd"]');
      tab.hidden = false; $$(".tab[aria-current]").forEach((t) => t.removeAttribute("aria-current")); tab.setAttribute("aria-current", "page");
      restoring = saved.get(name) ?? null;
      title = name; ref = { schema, tables: [] }; selected = null;
      moves = new Map(); auto = false; baseline = null;
      detail = restoring?.detail ?? "all";
      detailSel.value = Object.keys(DETAILS).find((l) => DETAILS[l] === detail);
      heading(); state("none");
      if (restoring) { restoreView = restoring.view; restoring = null; apply(saved.get(name).tables); return; }
      openPicker(preset, true);
    }

    // ---------- the picker ----------
    const boxesOf = () => $$("input[type=checkbox]", list);
    const shown = () => boxesOf().filter((c) => !c.closest(".ep-row").hidden);
    let firstOpen = false;
    function count() {
      const n = boxesOf().filter((c) => c.checked).length;
      $("#ep-n").textContent = `${n} of ${ALL.length} ticked`;
      $("#ep-show").textContent = n ? `Show diagram (${n})` : "Show diagram";
      $("#ep-show").disabled = !n;
      $("#ep-linked").disabled = !n;
      const q = filter.value.trim();
      $("#ep-all").textContent = q ? "Select shown" : "Select all";
      $("#ep-none").textContent = q ? "Unselect shown" : "Unselect all";
    }
    function runFilter() {
      const q = filter.value.trim().toLowerCase();
      boxesOf().forEach((c) => { c.closest(".ep-row").hidden = !!q && !c.value.toLowerCase().includes(q); });
      $("#ep-empty").hidden = shown().length > 0; $("#ep-empty-q").textContent = filter.value.trim();
      count();
    }
    /** Opens the picker ticked with `ticked`; `first`: nothing drawn yet, so Cancel leaves the tab empty. */
    function openPicker(ticked, first = false, q = "") {
      firstOpen = first;
      boxesOf().forEach((c) => { c.checked = ticked.includes(c.value); });
      $("#ep-schema").textContent = ref.schema;
      filter.value = q; runFilter();
      dlg.hidden = false;
      (q ? filter : boxesOf()[0]).focus();
    }
    function closePicker() {
      dlg.hidden = true;
      if (firstOpen && restoring) { restoreView = restoring.view; restoring = null; apply(saved.get(title).tables); return; }
      if (firstOpen && !ref.tables.length) state("none");
    }
    list.addEventListener("change", count);
    filter.addEventListener("input", runFilter);
    filter.addEventListener("keydown", (e) => { if (e.key === "Escape" && filter.value) { e.stopPropagation(); filter.value = ""; runFilter(); } });
    $("#ep-all").addEventListener("click", () => { shown().forEach((c) => { c.checked = true; }); count(); });
    $("#ep-none").addEventListener("click", () => { shown().forEach((c) => { c.checked = false; }); count(); });
    // the app reads schema_links once per picker, then ticks the neighbours
    $("#ep-linked").addEventListener("click", () => {
      const b = $("#ep-linked"); b.setAttribute("aria-busy", "true"); b.disabled = true;
      setTimeout(() => {
        const on = E.withLinked(ALL, boxesOf().filter((c) => c.checked).map((c) => c.value), LINKS);
        boxesOf().forEach((c) => { c.checked = on.includes(c.value); });
        b.removeAttribute("aria-busy"); count();
      }, 350);
    });
    $("[data-ep-close]", dlg).addEventListener("click", closePicker);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closePicker(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !dlg.hidden) closePicker(); });
    $("form", dlg).addEventListener("submit", (e) => {
      e.preventDefault();
      const picked = ALL.filter((n) => boxesOf().find((c) => c.value === n).checked);
      if (!picked.length) return;
      dlg.hidden = true;
      if (restoring) { restoreView = restoring.view; restoring = null; }
      // the app reads the catalog of the newly ticked tables only; the preview shows a short read
      state("loading");
      setTimeout(() => apply(picked), 400);
    });
    $("#erd-pick-btn").addEventListener("click", () => openPicker(ref.tables));
    $("#erd-pick-empty").addEventListener("click", () => openPicker(ref.tables, true));

    // ---------- the canvas ----------
    host.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { const r = host.getBoundingClientRect(); zoomBy(Math.exp(-e.deltaY * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top }); }
      else { view = { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY }; place(); }
    }, { passive: false });
    let drag = null;
    host.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      menu.hidden = true;
      const key = keyOf(e.target);
      const box = key === null ? undefined : layout.boxes.get(key);
      drag = box ? { x: e.clientX, y: e.clientY, moved: false, ox: box.x, oy: box.y, table: key } : { x: e.clientX, y: e.clientY, moved: false, ox: view.x, oy: view.y, table: null };
    });
    host.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!drag.moved) { host.setPointerCapture(e.pointerId); drag.moved = true; host.classList.add("dragging"); if (drag.table !== null) selected = drag.table; }
      if (drag.table === null) { view = { ...view, x: drag.ox + dx, y: drag.oy + dy }; place(); }
      else { moves = new Map(moves).set(drag.table, { x: drag.ox + dx / view.k, y: drag.oy + dy / view.k }); draw(); }
    });
    const endDrag = (e) => {
      const d = drag; drag = null; host.classList.remove("dragging");
      if (!d || d.moved || e.type === "pointercancel") return;
      selected = d.table; draw();
    };
    host.addEventListener("pointerup", endDrag);
    host.addEventListener("pointercancel", endDrag);
    host.addEventListener("dblclick", (e) => { if (tables.get(keyOf(e.target))?.name === "orders") location.href = "./table.html"; });
    host.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
      else if (e.key === "0") zoomBy(1 / view.k);
      else if (e.key === "Escape") { selected = null; menu.hidden = true; draw(); }
      else return;
      e.preventDefault();
    });

    // a table's menu: right-click on its box
    let menuFor = null;
    function openMenu(key, x, y) {
      menuFor = tables.get(key); selected = key; draw();
      const outside = menuFor.schema !== ref.schema;
      $('[data-erd-act="hide"]', menu).disabled = outside;
      $('[data-erd-act="hide"]', menu).title = outside ? "Shown because a picked table links to it; hide that table instead" : "";
      menu.hidden = false;
      const r = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
      menu.style.top = `${y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y}px`;
      $("button:not(:disabled)", menu).focus();
    }
    host.addEventListener("contextmenu", (e) => {
      const key = keyOf(e.target);
      if (key === null) return;
      e.preventDefault(); openMenu(key, e.clientX, e.clientY);
    });
    /** A table's Show diagram (box menu or tree): in the app a new tab named after it, its picker ticked with it and its links. */
    function tableDiagram(name) { openDiagram(name, ref.schema, E.withLinked(ALL, [name], LINKS)); }
    $$("[data-erd-act]", menu).forEach((b) => b.addEventListener("click", () => {
      menu.hidden = true;
      const t = menuFor; if (!t) return;
      const act = b.dataset.erdAct;
      if (act === "rows" && t.name === "orders") location.href = "./table.html";
      if (act === "query") location.href = "./index.html";
      if (act === "focus") tableDiagram(t.name);
      if (act === "hide") apply(ref.tables.filter((n) => n !== t.name), { refit: false });
      if (act === "reveal") {
        const row = $(`#tree .row[data-path$="/${CSS.escape(t.name)}"]`);
        $$("#tree .row[aria-current]").forEach((r) => r.removeAttribute("aria-current"));
        row?.setAttribute("aria-current", "page"); row?.scrollIntoView({ block: "nearest" });
      }
    }));
    document.addEventListener("mousedown", (e) => { if (!e.target.closest("#erd-menu")) menu.hidden = true; });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.hidden = true; });

    // Show diagram from the tree, on this page: switch the tab in place instead of reloading
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-erd-open]"); if (!b) return;
      e.stopPropagation(); e.preventDefault();
      const row = b.closest(".row");
      b.closest(".menu").hidden = true; row?.classList.remove("menu-open");
      const name = row ? $(".name", row).textContent : "public";
      if (b.dataset.erdOpen === "table") { tableDiagram(name); return; }
      openDiagram(name, name, []);
    }, true);

    $("#erd-in").addEventListener("click", () => zoomBy(1.25));
    $("#erd-out").addEventListener("click", () => zoomBy(0.8));
    $("#erd-actual").addEventListener("click", () => zoomBy(1 / view.k));
    $("#erd-fit").addEventListener("click", fit);
    $("#erd-reset").addEventListener("click", () => { moves = new Map(); auto = true; draw(); fit(); });
    $("#erd-save").addEventListener("click", save);
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && !$('[data-erd="ready"]').hidden) { e.preventDefault(); save(); }
    });
    detailSel.addEventListener("change", () => { detail = DETAILS[detailSel.value]; draw(); });
    $("#erd-refresh").addEventListener("click", () => { state("loading"); setTimeout(() => apply(ref.tables, { refit: false }), 500); });
    new ResizeObserver(() => { if (!drag && layout) place(); }).observe(host);

    // ---------- export ----------
    // In the app each file goes through the save dialog (@tauri-apps/plugin-dialog) and is written on this Mac;
    // the preview downloads it. No export contacts dbdiagram.io, diagrams.net or anything else.
    const toast = $("#erd-toast");
    let toastTimer;
    function say(text) { toast.textContent = text; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3200); }
    function download(blob, name) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    /** The theme's colours as the canvas paints them (a token may hold light-dark() or a scheme's value) */
    function palette() {
      const probe = document.createElement("span"); document.body.append(probe);
      const css = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
      const p = { background: css("--color-paper-3"), box: css("--color-paper"), head: css("--color-paper-2"), border: css("--color-field-edge"), ink: css("--color-ink"), muted: css("--color-muted"), line: css("--color-muted"), pk: css("--color-warn"), fk: css("--color-link") };
      probe.remove(); return p;
    }
    const exportMenu = $("#erd-export-menu");
    const closeMenu = () => { exportMenu.hidden = true; $("#erd-export").setAttribute("aria-expanded", "false"); };
    // image: PNG asks fill or transparent; JPG has no transparency, so nothing to ask
    const imgDlg = $("#erd-img-dlg");
    let fmt = "png";
    function setFmt(f) {
      fmt = f;
      $$("[data-fmt]", imgDlg).forEach((b) => { const on = b.dataset.fmt === f; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-checked", String(on)); });
      $("#ei-bg").hidden = f !== "png";
      $("#ei-go").lastChild.textContent = `Export ${f.toUpperCase()}`;
    }
    function openImage(f = "png") {
      closeMenu(); setFmt(f);
      const n = model.tables.length;
      $("#ei-what").textContent = `The whole diagram as drawn: ${n} ${n === 1 ? "table" : "tables"}, ${{ all: "all columns", keys: "key columns", none: "table names only" }[detail]}. Twice its size for sharp text.`;
      imgDlg.hidden = false; $(`[data-fmt="${f}"]`, imgDlg).focus();
    }
    $$("[data-fmt]", imgDlg).forEach((b) => b.addEventListener("click", () => setFmt(b.dataset.fmt)));
    $("[data-ei-close]", imgDlg).addEventListener("click", () => { imgDlg.hidden = true; });
    $("form", imgDlg).addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = palette();
      const fill = fmt === "jpg" || $('input[name="ei-bg"]:checked', imgDlg).value === "fill" ? p.background : null;
      const svg = E.diagramSvg(model, layout, detail, p, !!fill);
      const blob = await E.svgToImage(svg, layout.width, layout.height, fmt, fill);
      imgDlg.hidden = true;
      download(blob, `${title}.${fmt}`);
      say(`Saved ${title}.${fmt}`);
    });
    // Mermaid and DBML: the code, to copy or save
    const codeDlg = $("#erd-code-dlg");
    const CODE = {
      mermaid: { title: "Mermaid code", ext: "mmd", type: "text/plain", help: "Paste it where Mermaid renders: a Markdown file on GitHub or GitLab, Notion, or the Mermaid live editor. It lists every column of the tables drawn.", text: () => E.toMermaid(model) },
      dbml: { title: "DBML for dbdiagram.io", ext: "dbml", type: "text/plain", help: "Paste it into the editor at dbdiagram.io (ypacapy doesn't open or send anything there). It lists every column of the tables drawn, their keys and references.", text: () => E.toDbml(model, ref.schema) },
    };
    let code = null;
    function openCode(k) {
      closeMenu(); code = CODE[k];
      $("#ec-title").textContent = code.title; $("#ec-help").textContent = code.help;
      $("#ec-code").textContent = code.text();
      codeDlg.hidden = false; $("#ec-copy").focus();
    }
    $("[data-ec-close]", codeDlg).addEventListener("click", () => { codeDlg.hidden = true; });
    $("form", codeDlg).addEventListener("submit", (e) => {
      e.preventDefault();
      navigator.clipboard?.writeText($("#ec-code").textContent).catch(() => {});
      say(`Copied the ${code.title.replace(" for dbdiagram.io", "")}`);
    });
    $("#ec-save").addEventListener("click", () => { download(new Blob([$("#ec-code").textContent], { type: code.type }), `${title}.${code.ext}`); say(`Saved ${title}.${code.ext}`); });
    // diagrams.net: straight to a file, boxes where they are on screen
    function saveDrawio() {
      closeMenu();
      download(new Blob([E.toDrawio(model, layout, detail, title)], { type: "application/xml" }), `${title}.drawio`);
      say(`Saved ${title}.drawio. Open it in diagrams.net with File › Open from › Device.`);
    }
    $$("[data-ex]", exportMenu).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.ex;
      if (k === "image") openImage(); else if (k === "drawio") saveDrawio(); else openCode(k);
    }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { imgDlg.hidden = true; codeDlg.hidden = true; } });
    [imgDlg, codeDlg].forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.hidden = true; }));

    // ---------- closing ----------
    // Closing the tab (its x, or Close tab in its menu) with "Not saved" asks first, like a query tab with unsaved
    // text; untouched, or saved, it just closes. A never-saved diagram that was only drawn opens the picker next time.
    const closeDlg = $("#erd-close-dlg"), erdTab = $('.tab[data-tab="erd"]');
    let ctxTab = null;
    $$(".tab").forEach((t) => t.addEventListener("contextmenu", () => { ctxTab = t; }, true));
    function closeTab() { closeDlg.hidden = true; erdTab.hidden = true; }
    function askClose() {
      if (!changed()) { closeTab(); return; }
      $("#ecl-title").textContent = `Close ${title}?`;
      $("#ecl-msg").textContent = saved.has(title) ? "Its changes since the last save are lost. Show diagram brings back the saved one." : "Its tables and layout are not saved anywhere.";
      closeDlg.hidden = false; $("[data-ecl-cancel]", closeDlg).focus();
    }
    document.addEventListener("click", (e) => {
      const x = e.target.closest('.tab[data-tab="erd"] .close');
      const item = e.target.closest('[data-tm="close"]');
      if (!x && !(item && ctxTab === erdTab)) return;
      e.stopPropagation(); e.preventDefault();
      if (item) item.closest(".menu").hidden = true;
      askClose();
    }, true);
    $("[data-ecl-cancel]", closeDlg).addEventListener("click", () => { closeDlg.hidden = true; });
    $("[data-ecl-save]", closeDlg).addEventListener("click", () => { save(); closeTab(); });
    $("form", closeDlg).addEventListener("submit", (e) => { e.preventDefault(); closeTab(); });
    closeDlg.addEventListener("click", (e) => { if (e.target === closeDlg) closeDlg.hidden = true; });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDlg.hidden = true; });

    $('.tab[data-tab="erd"] .tab-main').insertAdjacentHTML("beforeend", '<span class="dirty" role="img" aria-label="Unsaved layout" hidden></span>');
    const FEW = ["orders", "customers", "refunds"];
    const moveTo = (name, x, y) => { moves = new Map(moves).set(E.tableKey("public", name), { x, y }); draw(); };
    const boxOf = (name) => layout.boxes.get(E.tableKey("public", name));
    window.pvShow = (k) => {
      menu.hidden = true; dlg.hidden = true; imgDlg.hidden = true; codeDlg.hidden = true; toast.hidden = true; closeMenu();
      $$(".row-menu").forEach((m) => { m.hidden = true; }); $$(".row.menu-open").forEach((r) => r.classList.remove("menu-open"));
      saved.clear(); restoring = null; restoreView = null; auto = false; baseline = null; DATA = structuredClone(BASE); closeDlg.hidden = true; erdTab.hidden = false;
      title = "public"; ref = { schema: "public", tables: [] }; moves = new Map(); selected = null;
      detail = k === "keys" ? "keys" : k === "names" ? "none" : "all";
      detailSel.value = Object.keys(DETAILS).find((l) => DETAILS[l] === detail);
      if (k === "picker" || k === "none") { heading(); state("none"); if (k === "picker") openPicker([], true); return; }
      if (k === "picker-filtered") { heading(); state("none"); openPicker(["orders", "order_items"], true, "ord"); return; }
      if (k === "picker-table") { tableDiagram("orders"); return; }
      if (k === "reopened") {
        // worked on earlier (three tables, refunds moved, zoomed in) and saved, then the tab was closed; Show diagram
        // again draws it as saved, no picker
        apply(FEW);
        moveTo("refunds", boxOf("refunds").x, boxOf("refunds").y + 180); zoomBy(1.2); save();
        $('.tab[data-tab="erd"]').hidden = true;
        openDiagram("public", "public", []);
        return;
      }
      if (k.startsWith("export-")) {
        apply(ALL);
        if (k === "export-menu") { $("#erd-export").click(); return; }
        if (k === "export-png" || k === "export-jpg") { openImage(k.slice(7)); return; }
        if (k === "export-drawio") { say(`Saved ${title}.drawio. Open it in diagrams.net with File › Open from › Device.`); return; }
        openCode(k.slice(7));
        return;
      }
      if (k === "close-ask") { apply(FEW); moveTo("refunds", boxOf("refunds").x + 40, boxOf("refunds").y + 160); askClose(); return; }
      if (k === "tab-menu") {
        apply(ALL);
        const t = $('.tab[data-tab="erd"]'), r = t.getBoundingClientRect();
        t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: r.left + 30, clientY: r.bottom - 6 }));
        return;
      }
      if (k === "loading") { apply(ALL); state("loading"); return; }
      if (k === "error") { title = "audit"; ref.schema = "audit"; heading(); state("error"); return; }
      if (k === "unsaved") { apply(FEW); moveTo("refunds", boxOf("refunds").x + 40, boxOf("refunds").y + 160); return; }
      if (k === "saved-new") {
        // saved with three tables (refunds moved under orders); products, order_items and shipments ticked afterwards
        apply(FEW); moveTo("refunds", boxOf("orders").x, boxOf("orders").y + boxOf("orders").h + 40); save();
        apply([...FEW, "products", "order_items", "shipments"]);
        return;
      }
      if (k === "saved-altered") {
        // saved as above; since then orders gained five columns and customers lost phone (the catalog read again)
        apply(FEW); moveTo("refunds", boxOf("orders").x, boxOf("orders").y + boxOf("orders").h + 40); save();
        const orders = DATA.tables.find((t) => t.name === "orders"), customers = DATA.tables.find((t) => t.name === "customers");
        orders.columns.push(...["discount numeric(12,2)", "coupon text", "channel text", "paid_at timestamptz", "note text"].map((c) => { const [name, type] = c.split(" "); return { name, type, nullable: true, primary: false }; }));
        customers.columns = customers.columns.filter((c) => c.name !== "phone");
        apply(FEW, { refit: false });
        return;
      }
      apply(k === "few" ? FEW : ALL);
      if (k === "selected") { selected = E.tableKey("public", "orders"); draw(); }
      if (k === "moved") {
        const key = E.tableKey("public", "warehouses"), b = layout.boxes.get(key);
        moves = new Map([[key, { x: b.x + 40, y: b.y + 260 }]]); selected = key; draw();
      }
      if (k === "menu") {
        const el = $(`[data-table="${model.tables.findIndex((t) => t.name === "orders")}"]`, world), r = el.getBoundingClientRect();
        openMenu(E.tableKey("public", "orders"), r.left + 40, r.top + 30);
      }
      if (k === "tree-menu") $('#tree .row[data-path="public"] .row-more').click();
    };
  }
