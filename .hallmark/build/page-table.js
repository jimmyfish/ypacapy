  // Table: rows under a where filter, its columns, its indexes and keys; Run re-reads the rows with the filter
  const run = $("#run"), where = $("#where");
  const DEFAULT_WHERE = "status in ('paid', 'shipped', 'refunded')";
  let view = "rows", state = "full";
  function render() {
    $$(".subtab[data-view]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.view === view)));
    $$(".response .state").forEach((s) => { s.hidden = view !== "rows" || s.dataset.when !== state; });
    $$("[data-view-of]").forEach((s) => { if (!s.classList.contains("state")) s.hidden = s.dataset.viewOf !== view; });
    const busy = state === "loading";
    run.toggleAttribute("aria-busy", busy); run.disabled = busy || view !== "rows";
    $("#t-n").textContent = state === "empty" ? "0" : "~12k";
    $("#t-ms").textContent = busy ? "reading" : "6 ms";
  }
  $$(".subtab[data-view]").forEach((s) => s.addEventListener("click", () => { view = s.dataset.view; if (state === "loading") state = "full"; render(); }));
  function reload() {
    if (state === "loading") return;
    view = "rows"; state = "loading"; render();
    setTimeout(() => { state = /'lost'/.test(where.value) ? "empty" : "full"; render(); }, 500);
  }
  run.addEventListener("click", reload);
  // rows per page: a pick reads this tab's first page again (the preview replays the sample)
  $$("[data-row-pick]").forEach((s) => s.addEventListener("change", () => { $("[data-row-face]", s.parentElement).textContent = Number(s.value).toLocaleString("en-US"); reload(); }));
  where.addEventListener("keydown", (e) => { if (e.key === "Enter") reload(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "Enter") { e.preventDefault(); reload(); } });
  $("#t-clear").addEventListener("click", () => { where.value = DEFAULT_WHERE; reload(); where.focus(); });

  // ---------- Columns: edit in place, review the SQL, apply ----------
  // Every cell is a quiet field. A changed cell turns green; the shredder marks a column to drop (red, struck
  // through, undo brings it back); Add column adds a green row. Nothing reaches the server until Review SQL › Apply,
  // which runs the generated statements through the write guard (one transaction on PostgreSQL and SQLite; one
  // ALTER on MySQL). Then the catalog is read again. SQLite can't change an existing column's type, nullable or
  // default without rebuilding the table, so those cells are locked there.
  const ENGINES = {
    postgres: {
      conn: "shop_prod", path: "shop_prod / shop / public", table: "public.orders",
      types: ["int2", "int4", "int8", "numeric(12,2)", "real", "float8", "text", "varchar(255)", "char(3)", "bool", "date", "timestamp", "timestamptz", "uuid", "jsonb", "bytea"],
      cols: [
        { name: "id", type: "int8", nullable: false, def: "nextval('orders_id_seq'::regclass)", key: "pk" },
        { name: "customer_id", type: "int8", nullable: false, def: "", key: "fk", ref: "customers.id", fk: "orders_customer_id_fkey" },
        { name: "status", type: "text", nullable: false, def: "'pending'::text" },
        { name: "total", type: "numeric(12,2)", nullable: false, def: "" },
        { name: "currency", type: "char(3)", nullable: false, def: "'USD'::bpchar" },
        { name: "created_at", type: "timestamptz", nullable: false, def: "now()" },
        { name: "shipped_at", type: "timestamptz", nullable: true, def: "" },
        { name: "meta", type: "jsonb", nullable: true, def: "" },
      ],
    },
    mysql: {
      conn: "legacy_cms", path: "legacy_cms / cms", table: "orders",
      types: ["tinyint", "int", "bigint", "decimal(12,2)", "double", "varchar(255)", "char(3)", "text", "boolean", "date", "datetime", "timestamp", "json", "blob"],
      cols: [
        { name: "id", type: "bigint", nullable: false, def: "", key: "pk" },
        { name: "customer_id", type: "bigint", nullable: false, def: "", key: "fk", ref: "customers.id", fk: "orders_customer_id_fkey" },
        { name: "status", type: "varchar(16)", nullable: false, def: "'pending'" },
        { name: "total", type: "decimal(12,2)", nullable: false, def: "" },
        { name: "currency", type: "char(3)", nullable: false, def: "'USD'" },
        { name: "created_at", type: "datetime", nullable: false, def: "CURRENT_TIMESTAMP" },
        { name: "shipped_at", type: "datetime", nullable: true, def: "" },
        { name: "meta", type: "json", nullable: true, def: "" },
      ],
    },
    sqlite: {
      conn: "analytics.sqlite", path: "analytics.sqlite / main", table: "orders",
      types: ["INTEGER", "REAL", "NUMERIC", "TEXT", "BLOB"],
      cols: [
        { name: "id", type: "INTEGER", nullable: false, def: "", key: "pk" },
        { name: "customer_id", type: "INTEGER", nullable: false, def: "", key: "fk", ref: "customers.id" },
        { name: "status", type: "TEXT", nullable: false, def: "'pending'" },
        { name: "total", type: "NUMERIC", nullable: false, def: "" },
        { name: "currency", type: "TEXT", nullable: false, def: "'USD'" },
        { name: "created_at", type: "TEXT", nullable: false, def: "CURRENT_TIMESTAMP" },
        { name: "shipped_at", type: "TEXT", nullable: true, def: "" },
        { name: "meta", type: "TEXT", nullable: true, def: "" },
      ],
    },
  };
  const ICO = Object.fromEntries([...$("#col-ico").content.children].map((s) => [s.querySelector("use").getAttribute("href").slice(3), s]));
  const icon = (n) => ICO[n].cloneNode(true);
  const body = $("#col-body"), ed = $(".col-ed");
  let engine = "postgres", rows = [], strict = false, failNext = false;
  const E = () => ENGINES[engine];
  const FIELDS = ["name", "type", "nullable", "def"];

  function load(eng) {
    engine = eng; ed.dataset.engine = eng;
    rows = E().cols.map((c) => ({ orig: c, cur: { ...c }, drop: false }));
    $("#col-types").innerHTML = E().types.map((t) => `<option value="${t}">`).join("");
    $("#col-sqlite").hidden = eng !== "sqlite";
    $("#t-path").textContent = E().path;
    draw();
  }
  const isNew = (r) => !r.orig;
  const changed = (r, f) => !isNew(r) && !r.drop && r.cur[f] !== r.orig[f];
  const touched = (r) => isNew(r) || r.drop || FIELDS.some((f) => changed(r, f));
  // SQLite: an existing column only renames or drops
  const locked = (r, f) => engine === "sqlite" && !isNew(r) && f !== "name";
  // a key column SQLite won't drop; MySQL won't drop a column a foreign key still uses
  const noDrop = (r) => (engine === "sqlite" && r.orig?.key) ? "SQLite can't drop a key column. Rebuild the table in a console." :
    (engine === "mysql" && r.orig?.key === "fk") ? `MySQL won't drop it while ${r.orig.fk} uses it. Drop the key first.` : "";

  function problems() {
    const out = [], live = rows.filter((r) => !r.drop);
    for (const r of live) {
      const label = r.cur.name || "A new column";
      if (!r.cur.name.trim()) out.push([r, "name", "Every column needs a name"]);
      else if (live.filter((o) => o.cur.name === r.cur.name).length > 1) out.push([r, "name", `There are two columns named ${r.cur.name}`]);
      if (!r.cur.type.trim()) out.push([r, "type", `${label} needs a type`]);
      if (engine === "sqlite" && isNew(r) && !r.cur.nullable && !r.cur.def.trim()) out.push([r, "def", `SQLite needs a default for ${label}, since it's NOT NULL`]);
    }
    return out;
  }

  function cell(r, f, i) {
    const td = document.createElement("td");
    td.classList.toggle("cell-edit", changed(r, f) || (isNew(r) && f !== "nullable" && !!r.cur[f]));
    if (locked(r, f)) { td.classList.add("col-lock"); td.title = "SQLite can't change this without rebuilding the table"; }
    if (f === "nullable") {
      td.classList.add("col-null");
      const lab = document.createElement("label"); lab.className = "col-chk";
      const box = document.createElement("input"); box.type = "checkbox"; box.checked = r.cur.nullable; box.disabled = r.drop || locked(r, f);
      box.setAttribute("aria-label", `${r.cur.name || "New column"} can be null`);
      box.addEventListener("change", () => { r.cur.nullable = box.checked; draw(); });
      const txt = document.createElement("span"); txt.textContent = r.cur.nullable ? "yes" : "no";
      lab.append(box, txt); td.append(lab); return td;
    }
    const inp = document.createElement("input");
    inp.className = "col-in" + (f === "name" ? "" : " mono");
    inp.value = r.cur[f]; inp.disabled = r.drop || locked(r, f); inp.spellcheck = false; inp.autocomplete = "off";
    if (f === "type") inp.setAttribute("list", "col-types");
    if (f === "def") inp.placeholder = "none";
    if (f === "name" && isNew(r)) inp.placeholder = "new_column";
    inp.setAttribute("aria-label", `${{ name: "Name", type: "Type", def: "Default" }[f]} of ${r.orig?.name || "the new column"}`);
    inp.dataset.row = i; inp.dataset.f = f;
    inp.addEventListener("input", () => { r.cur[f] = inp.value; refresh(); });
    inp.addEventListener("change", () => draw(document.activeElement));
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !isNew(r)) { e.stopPropagation(); r.cur[f] = inp.value = r.orig[f]; draw(inp); }
      if (e.key === "Enter") inp.blur();
    });
    td.append(inp); return td;
  }

  function draw(focus) {
    const keep = focus && focus.dataset ? [focus.dataset.row, focus.dataset.f] : null;
    body.replaceChildren(...rows.map((r, i) => {
      const tr = document.createElement("tr");
      if (r.drop) tr.className = "row-del";
      else if (isNew(r)) tr.className = "row-edit row-new";
      FIELDS.forEach((f) => tr.append(cell(r, f, i)));
      const key = document.createElement("td");
      if (r.orig?.key) {
        const s = document.createElement("span"); s.className = "key";
        s.append(icon(r.orig.key === "pk" ? "key" : "link"), r.orig.key === "pk" ? "Primary" : r.orig.ref); key.append(s);
      }
      tr.append(key);
      const act = document.createElement("td"); act.className = "col-act";
      const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn";
      if (isNew(r)) { b.append(icon("x")); b.title = "Remove this new column"; b.onclick = () => { rows.splice(i, 1); draw(); }; }
      else if (r.drop) { b.append(icon("undo-2")); b.title = "Keep this column"; b.onclick = () => { r.drop = false; draw(); }; }
      else {
        b.append(icon("shredder")); b.classList.add("col-shred");
        const why = noDrop(r);
        if (why) { b.disabled = true; b.title = why; } else { b.title = "Drop this column"; b.onclick = () => { r.drop = true; r.cur = { ...r.orig }; draw(); }; }
      }
      b.setAttribute("aria-label", b.title); act.append(b); tr.append(act);
      return tr;
    }));
    if (keep) $(`.col-in[data-row="${keep[0]}"][data-f="${keep[1]}"]`)?.focus();
    refresh();
  }

  // classes and the bar, without rebuilding the rows (typing keeps its caret)
  function refresh() {
    const bad = problems();
    $$(".col-in", body).forEach((inp) => {
      const r = rows[inp.dataset.row], f = inp.dataset.f;
      const td = inp.parentElement;
      td.classList.toggle("cell-edit", changed(r, f) || (isNew(r) && !!r.cur[f]));
      const err = bad.find(([br, bf]) => br === r && bf === f);
      err ? (inp.setAttribute("aria-invalid", "true"), td.title = err[2]) : (inp.removeAttribute("aria-invalid"), td.classList.contains("col-lock") || (td.title = ""));
    });
    const n = rows.filter(touched).length;
    $("#col-bar").hidden = !n;
    $("#col-n").textContent = `${n} change${n === 1 ? "" : "s"}`;
    $("#col-review").disabled = !!bad.length;
    $("#col-count").textContent = rows.filter((r) => !r.drop).length;
    const what = rows.filter(touched).map((r) => isNew(r) ? `${r.cur.name || "new column"} added` : r.drop ? `${r.orig.name} dropped` :
      r.cur.name !== r.orig.name ? `${r.orig.name} renamed` : `${r.orig.name} changed`);
    $("#col-what").textContent = bad.length ? bad[0][2] : what.join(" · ");
    $("#col-what").classList.toggle("err", !!bad.length);
  }

  $("#col-add").addEventListener("click", () => {
    rows.push({ orig: null, cur: { name: "", type: "", nullable: true, def: "" }, drop: false });
    draw(); $(`.col-in[data-row="${rows.length - 1}"][data-f="name"]`).focus();
  });
  $("#col-discard").addEventListener("click", () => load(engine));

  // ---------- the SQL each engine runs ----------
  const RESERVED = new Set(["order", "user", "group", "select", "from", "where", "table", "default", "key", "desc", "limit"]);
  const qi = (n) => /^[a-z_][a-z0-9_]*$/.test(n) && !RESERVED.has(n) ? n : engine === "mysql" ? "`" + n.replace(/`/g, "``") + "`" : `"${n.replace(/"/g, '""')}"`;
  const colDef = (c) => `${qi(c.name)} ${c.type}${c.nullable ? (engine === "mysql" ? " NULL" : "") : " NOT NULL"}${c.def.trim() ? ` DEFAULT ${c.def.trim()}` : ""}`;
  function sql() {
    const t = E().table, live = rows.filter(touched), out = [];
    if (engine === "postgres") {
      live.filter((r) => !isNew(r) && !r.drop && r.cur.name !== r.orig.name).forEach((r) => out.push(`ALTER TABLE ${t} RENAME COLUMN ${qi(r.orig.name)} TO ${qi(r.cur.name)};`));
      const cl = [];
      for (const r of live) {
        if (r.drop) { cl.push(`DROP COLUMN ${qi(r.orig.name)}`); continue; }
        if (isNew(r)) { cl.push(`ADD COLUMN ${colDef(r.cur)}`); continue; }
        const n = qi(r.cur.name);
        if (changed(r, "type")) cl.push(`ALTER COLUMN ${n} TYPE ${r.cur.type}`);
        if (changed(r, "nullable")) cl.push(`ALTER COLUMN ${n} ${r.cur.nullable ? "DROP" : "SET"} NOT NULL`);
        if (changed(r, "def")) cl.push(r.cur.def.trim() ? `ALTER COLUMN ${n} SET DEFAULT ${r.cur.def.trim()}` : `ALTER COLUMN ${n} DROP DEFAULT`);
      }
      if (cl.length) out.push(`ALTER TABLE ${t}\n  ${cl.join(",\n  ")};`);
      return ["BEGIN;", ...out, "COMMIT;"].join("\n");
    }
    if (engine === "mysql") {
      // MODIFY / CHANGE restate the whole column: the app reads its charset, comment and auto_increment from the catalog and keeps them
      const cl = live.map((r) => r.drop ? `DROP COLUMN ${qi(r.orig.name)}` : isNew(r) ? `ADD COLUMN ${colDef(r.cur)}` :
        ["type", "nullable", "def"].some((f) => changed(r, f)) ? (r.cur.name !== r.orig.name ? `CHANGE COLUMN ${qi(r.orig.name)} ${colDef(r.cur)}` : `MODIFY COLUMN ${colDef(r.cur)}`) :
        `RENAME COLUMN ${qi(r.orig.name)} TO ${qi(r.cur.name)}`);
      return `ALTER TABLE ${t}\n  ${cl.join(",\n  ")};`;
    }
    for (const r of live) out.push(`ALTER TABLE ${t} ${r.drop ? `DROP COLUMN ${qi(r.orig.name)}` : isNew(r) ? `ADD COLUMN ${colDef(r.cur)}` : `RENAME COLUMN ${qi(r.orig.name)} TO ${qi(r.cur.name)}`};`);
    return ["BEGIN;", ...out, "COMMIT;"].join("\n");
  }
  function warns() {
    const w = [], live = rows.filter(touched), tn = "orders";
    for (const r of live) {
      if (r.drop && r.orig.key === "pk") w.push(`${r.orig.name} is the primary key. Dropping it drops the key too, and anything that references it stops working.`);
      if (r.drop && r.orig.key === "fk" && engine === "postgres") w.push(`${r.orig.name} is a foreign key. ${r.orig.fk} goes with it.`);
      if (!isNew(r) && !r.drop && changed(r, "type")) w.push(engine === "postgres" ? `${r.cur.name} changes type. Postgres rewrites ${tn} for that and locks it till it's done. Values that don't cast make it fail.` : `${r.cur.name} changes type. MySQL copies ${tn} for that and blocks writes till it's done.`);
      if (!isNew(r) && !r.drop && changed(r, "nullable") && !r.cur.nullable) w.push(`${r.cur.name} becomes NOT NULL. If any row holds null there, it fails.`);
      if (isNew(r) && !r.cur.nullable && !r.cur.def.trim() && engine === "postgres") w.push(`${r.cur.name} is NOT NULL with no default, so it fails if ${tn} has any rows.`);
    }
    return w;
  }

  // ---------- Review SQL ----------
  const dlg = $("#col-dlg");
  function review() {
    if ($("#col-review").disabled || $("#col-bar").hidden) return;
    const n = rows.filter(touched).length, dropped = rows.filter((r) => r.drop).map((r) => r.orig.name);
    $("#col-dlg-t").textContent = `Change orders on ${E().conn}?`;
    $("#col-dlg-sub").textContent = `${n} change${n === 1 ? "" : "s"} to ${E().table}. ` + (engine === "mysql" ? "One ALTER, so it all goes in or none of it does." : "They run in one transaction: all or nothing.");
    $("#col-sql").textContent = sql();
    const w = warns();
    $("#col-warns").hidden = !w.length;
    $("#col-warns").innerHTML = w.map((t) => `<li><svg aria-hidden="true" class="ico"><use href="#i-triangle-alert"/></svg><span></span></li>`).join("");
    $$("#col-warns li span").forEach((s, i) => (s.textContent = w[i]));
    $("#col-final").hidden = !dropped.length;
    $("#col-final span").textContent = `Dropping ${dropped.join(" and ")} deletes ${dropped.length > 1 ? "their values" : "its value"} in every row. It can't be undone.`;
    $("#col-strict").hidden = $("#col-pass").hidden = !strict;
    $("#col-strict span").textContent = `${E().conn} is Strict, so it needs the passphrase.`;
    const apply = $("#col-apply");
    apply.classList.toggle("auth-btn--danger", !!dropped.length); apply.classList.toggle("auth-btn--primary", !dropped.length);
    $(".col-apply-ico", apply).replaceChildren(icon(dropped.length ? "shredder" : strict ? "lock-open" : "play"));
    $("#col-apply-l").textContent = "Apply"; apply.removeAttribute("aria-busy"); apply.disabled = false;
    $("#col-err").hidden = true;
    dlg.hidden = false;
    (strict ? $("#col-pass input") : $("#col-cancel")).focus();
  }
  const close = () => { dlg.hidden = true; };
  $("#col-review").addEventListener("click", review);
  $("#col-cancel").addEventListener("click", close);
  dlg.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "s" && view === "columns") { e.preventDefault(); review(); } });
  let toastT;
  const toast = (t) => { const el = $("#col-toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2600); };
  $("#col-console").addEventListener("click", () => { close(); toast("The SQL is in Query 6. Your edits stay here till you discard them."); });
  $("#col-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const apply = $("#col-apply");
    apply.setAttribute("aria-busy", "true"); apply.disabled = true; $("#col-apply-l").textContent = "Applying"; $(".col-apply-ico", apply).replaceChildren(icon("loader-circle"));
    setTimeout(() => {
      if (failNext) {
        failNext = false;
        apply.removeAttribute("aria-busy"); apply.disabled = false; $("#col-apply-l").textContent = "Apply";
        $(".col-apply-ico", apply).replaceChildren(icon(rows.some((r) => r.drop) ? "shredder" : strict ? "lock-open" : "play"));
        $("#col-err span").textContent = engine === "mysql" ? "Invalid use of NULL value. Nothing changed." : `column "shipped_at" of relation "orders" contains null values. Nothing changed: the transaction was rolled back.`;
        $("#col-err").hidden = false; return;
      }
      const n = rows.filter(touched).length;
      close();
      // the catalog is read again: what's on screen is what the server has now
      E().cols = rows.filter((r) => !r.drop).map((r) => ({ ...(r.orig || {}), ...r.cur }));
      ed.classList.add("col-reading");
      setTimeout(() => { ed.classList.remove("col-reading"); load(engine); toast(`${n} change${n === 1 ? "" : "s"} applied to orders`); }, 450);
    }, 700);
  });

  load("postgres");
  const BASE = structuredClone(ENGINES);
  window.pvShow = (k) => {
    close(); strict = false; failNext = false;
    for (const e of Object.keys(ENGINES)) ENGINES[e].cols = structuredClone(BASE[e].cols);
    const col = k.startsWith("col-") || k === "columns";
    view = col ? "columns" : ["indexes"].includes(k) ? k : "rows";
    where.value = k === "no-match" ? "status = 'lost'" : DEFAULT_WHERE;
    state = { "no-match": "empty", loading: "loading" }[k] || "full";
    load(k === "col-mysql" ? "mysql" : k.startsWith("col-sqlite") ? "sqlite" : "postgres");
    const by = (n) => rows.find((r) => r.orig?.name === n);
    if (["col-edit", "col-review", "col-strict", "col-fail", "col-mysql"].includes(k)) {
      by("status").cur.name = "state";
      by("total").cur.type = engine === "mysql" ? "decimal(14,2)" : "numeric(14,2)";
      by("shipped_at").cur.nullable = k === "col-fail" ? false : true;
      by("currency").cur.def = engine === "mysql" ? "'EUR'" : "'EUR'::bpchar";
      by("meta").drop = true;
      rows.push({ orig: null, cur: { name: "notes", type: "text", nullable: true, def: "" }, drop: false });
    }
    if (k === "col-sqlite" || k === "col-sqlite-bad") {
      by("status").cur.name = "state";
      by("meta").drop = true;
      rows.push({ orig: null, cur: { name: "region", type: "TEXT", nullable: k !== "col-sqlite-bad", def: "" }, drop: false });
    }
    strict = k === "col-strict"; failNext = k === "col-fail";
    draw(); render();
    if (["col-review", "col-strict", "col-fail", "col-mysql"].includes(k)) review();
    if (k === "col-fail") $("#col-form").requestSubmit();
  };
