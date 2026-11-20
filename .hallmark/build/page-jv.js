  // The JSON view (Compass-style cards), on the MongoDB console and the collection tab.
  // Folding works everywhere. Editing is only on a collection tab (.jv-list[data-edit]): it builds one updateOne or
  // deleteOne on the document's _id, shows that exact command in the write guard's ask, and applies it when confirmed.
  {
    const COLL = "orders";
    const fold = (caret, open) => {
      const kids = caret.closest(".jv-node").querySelector(":scope > .jv-kids");
      // the kids stay in the page; .open slides them in (styles: .jv-kids)
      caret.setAttribute("aria-expanded", String(open)); kids.classList.toggle("open", open);
    };
    const syncFoldBtn = (doc) => {
      const b = $('[data-jv="fold"]', doc); if (!b) return;
      const all = $$(".jv-caret", doc), open = all.length && all.every((c) => c.getAttribute("aria-expanded") === "true");
      $("use", b).setAttribute("href", `#i-${open ? "chevrons-down-up" : "chevrons-up-down"}`);
      b.title = b.ariaLabel = open ? "Collapse all" : "Expand all";
    };
    const docOf = (el) => el.closest(".jv-doc");

    // ---- editing (collection tab only) ----
    const level = () => $("#guard-btn")?.dataset.level || "none";
    const keyOf = (node) => $(":scope > .jv-row .jv-k", node);
    const pathOf = (node, orig = true) => {
      const parts = [];
      for (let n = node; n && n.classList.contains("jv-node"); n = n.parentElement.closest(".jv-node")) {
        const k = keyOf(n); parts.unshift(orig ? (k.dataset.orig ?? k.textContent) : k.textContent);
      }
      return parts.map((p) => (/^[A-Za-z_$][\w$]*$/.test(p) || /^\d+$/.test(p) ? p : `'${p}'`)).join(".");
    };
    const quote = (p) => (p.includes(".") || p.includes("'") ? `'${p.replace(/'/g, "")}'` : p);
    const valText = (row) => $(".jv-v", row).textContent.trim();
    const changes = (doc) => ({
      set: $$(".jv-row.jv-chg, .jv-row.jv-new", doc).filter((r) => !r.closest(".jv-del")).map((r) => [pathOf(r.closest(".jv-node"), !r.classList.contains("jv-new")), r]),
      unset: $$(".jv-node.jv-del", doc).filter((n) => !n.parentElement.closest(".jv-del")).map((n) => pathOf(n)),
      rename: $$(".jv-k.jv-renamed", doc).filter((k) => !k.closest(".jv-del")).map((k) => [pathOf(k.closest(".jv-node")), k.textContent]),
    });
    function recount(doc) {
      const c = changes(doc), n = c.set.length + c.unset.length + c.rename.length;
      if (doc.dataset.mode === "edit") {
        $(".jv-msg", doc).textContent = n ? `${n} change${n > 1 ? "s" : ""}, not sent yet` : "Nothing changed yet";
        $('[data-jv="update"]', doc).disabled = !n;
      }
    }
    const markRow = (row) => {
      const eds = $$(".jv-ed", row), sel = $(".jv-type", row);
      const changed = eds.some((e) => e.textContent !== e.dataset.orig) || (sel && sel.value !== sel.dataset.orig);
      row.classList.toggle("jv-chg", !row.classList.contains("jv-new") && changed);
      const k = $(".jv-k", row);
      if (k.dataset.orig !== undefined) k.classList.toggle("jv-renamed", k.textContent !== k.dataset.orig);
    };
    function enter(doc, focus) {
      if (doc.dataset.mode) return;
      $$(".jv-doc[data-mode]").forEach(cancel);
      doc.dataset.snap = $(".jv-body", doc).innerHTML;
      doc.dataset.mode = "edit";
      $$(".jv-row:not(.jv-ro) .jv-ed", doc).forEach((e) => { e.dataset.orig = e.textContent; e.contentEditable = "plaintext-only"; e.spellcheck = false; });
      $$(".jv-row:not(.jv-ro) .jv-k:not(.jv-idx)", doc).forEach((k) => { k.dataset.orig = k.textContent; k.contentEditable = "plaintext-only"; k.spellcheck = false; });
      $$(".jv-type", doc).forEach((s) => { s.dataset.orig = s.value; });
      recount(doc);
      (focus || $(".jv-row:not(.jv-ro) .jv-ed", doc))?.focus();
    }
    function cancel(doc) {
      if (doc.dataset.mode === "new") { doc.remove(); return; }
      if (doc.dataset.snap) $(".jv-body", doc).innerHTML = doc.dataset.snap;
      delete doc.dataset.snap; delete doc.dataset.mode;
      $$("[contenteditable]", doc).forEach((e) => e.removeAttribute("contenteditable"));
      syncFoldBtn(doc);
    }
    function commit(doc) {
      $$(".jv-node.jv-del", doc).forEach((n) => n.remove());
      $$(".jv-chg, .jv-new", doc).forEach((r) => r.classList.remove("jv-chg", "jv-new"));
      $$(".jv-renamed", doc).forEach((k) => k.classList.remove("jv-renamed"));
      $$("[contenteditable]", doc).forEach((e) => e.removeAttribute("contenteditable"));
      delete doc.dataset.snap; delete doc.dataset.mode;
      doc.classList.remove("jv-saved"); void doc.offsetWidth; doc.classList.add("jv-saved");
    }
    const idOf = (doc) => `{ _id: ObjectId('${doc.dataset.id}') }`;
    function command(doc) {
      if (doc.dataset.mode === "del") return ["deleteOne", `db.${COLL}.deleteOne(\n  ${idOf(doc)}\n)`];
      if (doc.dataset.mode === "new") return ["insertOne", `db.${COLL}.insertOne(${serialize(doc, true)})`];
      const c = changes(doc), ops = [];
      if (c.set.length) ops.push(`$set: { ${c.set.map(([p, r]) => `${quote(p)}: ${valText(r)}`).join(", ")} }`);
      if (c.unset.length) ops.push(`$unset: { ${c.unset.map((p) => `${quote(p)}: ''`).join(", ")} }`);
      if (c.rename.length) ops.push(`$rename: { ${c.rename.map(([a, b]) => `${quote(a)}: '${b}'`).join(", ")} }`);
      return ["updateOne", `db.${COLL}.updateOne(\n  ${idOf(doc)},\n  { ${ops.join(",\n    ")} }\n)`];
    }
    // a card back to mongosh text: top-level fields one per line, nested ones inline; a new card leaves _id out
    const valOf = (node, pad = "  ") => {
      const row = $(":scope > .jv-row", node), kids = $(":scope > .jv-kids", node);
      if (!kids) return valText(row);
      const arr = row.dataset.t === "array", inner = pad + "  ";
      const parts = $$(":scope > .jv-kids-in > .jv-node", kids).map((n) => (arr ? valOf(n, inner) : `${quote(keyOf(n).textContent)}: ${valOf(n, inner)}`));
      const [o, c] = arr ? ["[", "]"] : ["{", "}"], one = `${o} ${parts.join(", ")} ${c}`;
      // short and flat stays on one line, as mongosh prints it; anything else opens up
      return one.length <= 44 && !parts.some((x) => x.includes("\n")) ? one : `${o}\n${inner}${parts.join(`,\n${inner}`)}\n${pad}${c}`;
    };
    const serialize = (doc, noId) => {
      const nodes = $$(":scope > .jv-body > .jv-node", doc).filter((n) => !(noId && keyOf(n).textContent === "_id"));
      return `{\n  ${nodes.map((n) => `${quote(keyOf(n).textContent)}: ${valOf(n)}`).join(",\n  ")}\n}`;
    };
    function dup(src) {
      $$(".jv-doc[data-mode]").forEach(cancel);
      const doc = src.cloneNode(true);
      delete doc.dataset.id; doc.classList.remove("jv-saved");
      doc.dataset.mode = "new"; doc.ariaLabel = "New document, a copy";
      const idRow = $$(".jv-row", doc).find((r) => $(".jv-k", r).textContent === "_id");
      if (idRow) { $(".jv-v", idRow).innerHTML = '<span class="jv-newid">new ObjectId, made on insert</span>'; $(".jv-lock", idRow).lastChild.textContent = "set by the server"; }
      $$(".jv-row:not(.jv-ro) .jv-ed, .jv-row:not(.jv-ro) .jv-k:not(.jv-idx)", doc).forEach((e) => { e.contentEditable = "plaintext-only"; e.spellcheck = false; });
      $(".jv-msg", doc).textContent = "Copy, not inserted yet";
      src.after(doc);
      doc.scrollIntoView({ block: "nearest" });
      $(".jv-row:not(.jv-ro) .jv-ed", doc)?.focus();
      return doc;
    }
    const newOid = () => Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    let pending = null;
    function send(doc) {
      const [kind, cmd] = command(doc);
      if (level() === "none") return apply(doc);
      pending = doc;
      const dlg = $(level() === "strict" ? "#guard-pass-dlg" : "#guard-confirm-dlg");
      $("[data-kinds]", dlg).innerHTML = `<code class="stmt">${kind}</code>`;
      $("[data-cmd]", dlg).textContent = cmd;
      $(".help", dlg).textContent = { deleteOne: `It deletes 1 document from ${COLL} on events_prod:`, insertOne: `It adds 1 document to ${COLL} on events_prod:` }[kind] || `It changes 1 document in ${COLL} on events_prod:`;
      // an insert deletes and overwrites nothing, so no "cannot be undone" and no shredder
      dlg.dataset.final = String(kind !== "insertOne");
      // nothing is lost by an insert, so its button is the plain primary one, not the red one
      const go = $("button[type=submit]", dlg); go.classList.toggle("btn--danger", kind !== "insertOne"); go.classList.toggle("btn--primary", kind === "insertOne");
      $$("[data-run-label]", dlg).forEach((l) => { l.textContent = { deleteOne: "Delete", insertOne: "Insert" }[kind] || "Update"; });
      dlg.hidden = false; $("input, button[type=submit]", dlg).focus();
    }
    function apply(doc) {
      if (doc.dataset.mode === "del") {
        doc.classList.add("jv-gone");
        setTimeout(() => {
          doc.remove();
          window.ypPager?.();
        }, 220);
        return;
      }
      if (doc.dataset.mode === "new") {
        const id = newOid(); doc.dataset.id = id; doc.ariaLabel = "Document";
        const idRow = $$(".jv-row", doc).find((r) => $(".jv-k", r).textContent === "_id");
        if (idRow) { $(".jv-v", idRow).innerHTML = `<span class="q-f">ObjectId</span><span class="j-p">(</span><span class="j-str">'<span class="jv-ed">${id}</span>'</span><span class="j-p">)</span>`; $(".jv-lock", idRow).lastChild.textContent = "_id is fixed"; }
        doc.dataset.copy = serialize(doc).replace(/^\{/, `{\n  _id: ObjectId('${id}'),`);
        commit(doc);
        window.ypPager?.();
        return;
      }
      commit(doc);
    }
    $$("#guard-confirm-dlg form, #guard-pass-dlg form").forEach((f) => f.addEventListener("submit", (e) => {
      if (!pending) return;
      e.preventDefault(); e.stopImmediatePropagation();
      f.closest(".backdrop").hidden = true; const d = pending; pending = null; apply(d);
    }, true));
    $$("[data-guard-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".backdrop").hidden = true; pending = null; }));

    const typeMenu = (label) => {
      const sel = $(".jv-list[data-edit] .jv-type").cloneNode(true);
      [...sel.options].forEach((o) => o.toggleAttribute("selected", o.text === label));
      return sel.outerHTML;
    };
    // Add document: an empty new card at the top of the page, a first field ready to name; Insert sends insertOne
    window.jvAdd = () => {
      const list = $(".jv-list[data-edit]"), src = list && $(".jv-doc", list);
      if (!src) return;
      $$(".jv-doc[data-mode]").forEach(cancel);
      const doc = src.cloneNode(true);
      delete doc.dataset.id; doc.classList.remove("jv-saved");
      doc.dataset.mode = "new"; doc.ariaLabel = "New document";
      $(".jv-body", doc).innerHTML = "";
      $(".jv-msg", doc).textContent = "New document, not inserted yet";
      doc.dataset.blank = "";
      list.prepend(doc); list.scrollTop = 0;
      addField(doc);
      return doc;
    };
    // Example from fields: the paths and types the Fields tab lists (from the documents on this page; nothing is read),
    // as a document with an empty value of each field's type. An array of objects gets one object; _id is left to the
    // server. Each field's first type seen wins (null only when it is all there was).
    const EMPTY = { string: "", int32: "0", double: "0", decimal128: "0", bool: "false", date: () => new Date().toISOString().replace(/\.\d+Z$/, ".000Z"), objectId: () => newOid() };
    const LABEL = { string: "String", int32: "Int32", double: "Double", decimal128: "Decimal128", bool: "Boolean", date: "Date", objectId: "ObjectId", null: "Null", object: "Object", array: "Array" };
    function example(doc) {
      const list = doc.closest(".jv-list"), fields = JSON.parse(list.dataset.fields || "[]");
      // paths into a tree: a.b under a; under an array of objects, its fields go in its one item
      const root = { kids: new Map() };
      for (const [path, types] of fields) {
        if (path === "_id") continue;
        const parts = path.split("."), t = types.split(", ").find((x) => x !== "null") || "null";
        let at = root;
        parts.forEach((p, i) => {
          if (!at.kids.has(p)) at.kids.set(p, { kids: new Map() });
          at = at.kids.get(p);
          if (i === parts.length - 1) at.type = t;
          // the array's item: its fields hang off a "0" object
          if (i < parts.length - 1 && at.type === "array of object") { if (!at.kids.has("0")) at.kids.set("0", { type: "object", kids: new Map() }); at = at.kids.get("0"); }
        });
      }
      const rmTpl = $(".jv-list[data-edit] .jv-rm");
      const tools = (t) => `<span class="jv-tools">${typeMenu(LABEL[t])}<button type="button" class="icon-btn jv-undo" hidden></button><button type="button" class="icon-btn jv-rm" title="Remove this field" aria-label="Remove field">${rmTpl.innerHTML}</button></span>`;
      const ed = (x, cls = "") => `<span class="jv-ed${cls}" contenteditable="plaintext-only" spellcheck="false">${x}</span>`;
      const fn = (name, x) => `<span class="q-f">${name}</span><span class="j-p">(</span><span class="j-str">'${ed(x)}'</span><span class="j-p">)</span>`;
      const leaf = (t) => {
        const v = typeof EMPTY[t] === "function" ? EMPTY[t]() : EMPTY[t];
        if (t === "string") return `<span class="j-str">'${ed("")}'</span>`;
        if (t === "objectId") return fn("ObjectId", v);
        if (t === "date") return fn("ISODate", v);
        if (t === "decimal128") return fn("Decimal128", v);
        if (t === "int32" || t === "double") return ed(v, " j-num");
        if (t === "bool") return ed(v, " j-bool");
        return '<span class="j-null jv-ed">null</span>';
      };
      const node = (key, n, depth, idx) => {
        const t = n.type === "array of object" ? "array" : n.type || "object";
        const kids = [...n.kids].map(([k, c]) => node(k, c, depth + 1, t === "array"));
        const folds = kids.length > 0;
        const val = folds ? `<span class="jv-kind">${t === "array" ? `Array (${kids.length})` : "Object"}</span>` : t === "array" ? '<span class="j-p">[]</span>' : t === "object" ? '<span class="j-p">{}</span>' : leaf(t);
        const keyHtml = idx ? `<span class="jv-k jv-idx">${key}</span>` : `<span class="jv-k" contenteditable="plaintext-only" spellcheck="false">${key}</span>`;
        return `<div class="jv-node"><div class="jv-row" style="--d:${depth}" data-t="${t}">${folds ? `<button type="button" class="jv-caret" aria-expanded="true" aria-label="Hide ${key}">${$(".jv-caret", list)?.innerHTML ?? ""}</button>` : '<span class="jv-caret-sp"></span>'}${keyHtml}<span class="j-p">:</span><span class="jv-v">${val}</span>${tools(t)}</div>${folds ? `<div class="jv-kids open"><div class="jv-kids-in">${kids.join("")}</div></div>` : ""}</div>`;
      };
      $(".jv-body", doc).innerHTML = [...root.kids].map(([k, n]) => node(k, n, 0, false)).join("");
      delete doc.dataset.blank;
      $(".jv-msg", doc).textContent = `Example from the ${fields.length} fields on this page, not inserted yet`;
      $(".jv-row .jv-ed", doc)?.focus();
    }
    function addField(doc) {
      const body = $(".jv-body", doc), n = $$(".jv-new", doc).length;
      // the type menu and remove button are copied from any card (a new one may have no fields yet)
      const rmTpl = $(".jv-rm", doc) || $(".jv-list[data-edit] .jv-rm");
      const tmp = document.createElement("div");
      tmp.innerHTML = `<div class="jv-node"><div class="jv-row jv-new" style="--d:0" data-t="string"><span class="jv-caret-sp"></span><span class="jv-k" contenteditable="plaintext-only" spellcheck="false">field${n ? n + 1 : ""}</span><span class="j-p">:</span><span class="jv-v"><span class="j-str">'<span class="jv-ed" contenteditable="plaintext-only" spellcheck="false" data-orig=""></span>'</span></span><span class="jv-tools">${typeMenu("String")}<button type="button" class="icon-btn jv-undo" hidden></button><button type="button" class="icon-btn jv-rm" title="Remove this field" aria-label="Remove field">${rmTpl.innerHTML}</button></span></div></div>`;
      const node = tmp.firstElementChild; body.append(node);
      const k = $(".jv-k", node); k.focus(); getSelection().selectAllChildren(k);
      recount(doc);
    }

    $$(".jv-list").forEach((list) => {
      const editable = list.hasAttribute("data-edit");
      list.addEventListener("click", (e) => {
        const doc = docOf(e.target); if (!doc) return;
        // a click anywhere on a foldable line folds it, unless it lands on something editable or a control,
        // or ends a text selection
        const line = e.target.closest(".jv-row");
        const onControl = e.target.closest("[contenteditable], select, button:not(.jv-caret), .jv-tools");
        const caret = e.target.closest(".jv-caret") || (line && !onControl && !String(getSelection()).length ? $(":scope > .jv-caret", line) : null);
        if (caret) { fold(caret, caret.getAttribute("aria-expanded") !== "true"); syncFoldBtn(doc); return; }
        const act = e.target.closest("[data-jv]")?.dataset.jv;
        if (act === "fold") { const open = $('[data-jv="fold"] use', doc).getAttribute("href").endsWith("up-down"); $$(".jv-caret", doc).forEach((c) => fold(c, open)); syncFoldBtn(doc); }
        if (act === "copy") {
          navigator.clipboard?.writeText(doc.dataset.copy).catch(() => {});
          const b = e.target.closest("[data-jv]"), u = $("use", b); u.setAttribute("href", "#i-check"); b.title = "Copied";
          setTimeout(() => { u.setAttribute("href", "#i-copy"); b.title = "Copy document"; }, 1200);
        }
        if (!editable) return;
        if (act === "edit") enter(doc);
        if (act === "dup") dup(doc);
        if (act === "example") example(doc);
        if (act === "del") { $$(".jv-doc[data-mode]").forEach(cancel); doc.dataset.mode = "del"; $(".jv-msg", doc).textContent = "Delete this document?"; $('[data-jv="delete"]', doc).focus(); }
        if (act === "cancel") cancel(doc);
        if (act === "update" || act === "delete" || act === "insert") send(doc);
        if (e.target.closest(".jv-add")) addField(doc);
        const rm = e.target.closest(".jv-rm");
        if (rm) {
          const node = rm.closest(".jv-node");
          if (rm.closest(".jv-new") || doc.dataset.mode === "new") node.remove(); else node.classList.add("jv-del");
          recount(doc);
        }
        const undo = e.target.closest(".jv-undo");
        if (undo) {
          const node = undo.closest(".jv-node"), row = $(":scope > .jv-row", node);
          node.classList.remove("jv-del");
          $$(".jv-ed", row).forEach((x) => { x.textContent = x.dataset.orig; });
          const k = $(".jv-k", row); if (k.dataset.orig !== undefined) k.textContent = k.dataset.orig;
          const s = $(".jv-type", row); if (s) s.value = s.dataset.orig;
          markRow(row); recount(doc);
        }
      });
      if (!editable) return;
      // double-click a value to edit its document there
      list.addEventListener("dblclick", (e) => {
        const ed = e.target.closest(".jv-row:not(.jv-ro) .jv-ed, .jv-row:not(.jv-ro) .jv-k:not(.jv-idx)"), doc = docOf(e.target);
        if (ed && doc && !doc.dataset.mode) enter(doc, ed);
      });
      list.addEventListener("input", (e) => { const row = e.target.closest(".jv-row"); if (row && docOf(row).dataset.mode !== "new") { markRow(row); recount(docOf(row)); } });
      list.addEventListener("change", (e) => { const row = e.target.closest(".jv-row"); if (row && e.target.matches(".jv-type")) { markRow(row); recount(docOf(row)); } });
      // Enter ends a value (values are one line); ⌘↵ sends the change; Esc drops it
      list.addEventListener("keydown", (e) => {
        const doc = docOf(e.target); if (!doc?.dataset.mode) return;
        if (e.key === "Enter" && e.metaKey) { e.preventDefault(); e.stopPropagation(); if (doc.dataset.mode !== "edit" || !$('[data-jv="update"]', doc).disabled) send(doc); return; }
        if (e.key === "Enter" && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); }
        if (e.key === "Escape") { e.preventDefault(); cancel(doc); $('[data-jv="edit"]', doc)?.focus(); }
      });
    });

    // preview states
    window.jvShow = (k) => {
      $$("#guard-confirm-dlg, #guard-pass-dlg").forEach((d) => { d.hidden = true; }); pending = null;
      $$(".jv-doc[data-mode]").forEach(cancel);
      $$(".jv-caret").forEach((c) => fold(c, false)); $$(".jv-doc").forEach(syncFoldBtn);
      const doc = $(".jv-list[data-edit] .jv-doc:nth-child(3)") || $(".jv-list[data-edit] .jv-doc");
      if (!doc) return;
      if (k === "open") { $$(".jv-list[data-edit] .jv-doc:nth-child(-n+3) .jv-caret").forEach((c) => fold(c, true)); $$(".jv-doc").forEach(syncFoldBtn); }
      if (["edit", "guard-update", "guard-update-pass"].includes(k)) {
        $$(".jv-caret", doc).slice(0, 1).forEach((c) => fold(c, true));
        enter(doc);
        const status = $$(".jv-row", doc).find((r) => $(".jv-k", r).textContent === "status");
        $(".jv-ed", status).textContent = "shipped"; markRow(status);
        const meta = $$(".jv-node", doc).find((n) => keyOf(n).textContent === "meta"); meta?.classList.add("jv-del");
        recount(doc);
        doc.scrollIntoView({ block: "nearest" });
        if (k !== "edit") { if (k === "guard-update-pass") $('[data-guard="strict"]')?.click(); send(doc); }
      }
      if (k === "duplicate" || k === "guard-insert") {
        const copy = dup(doc);
        const status = $$(".jv-row", copy).find((r) => $(".jv-k", r).textContent === "status");
        $(".jv-ed", status).textContent = "paid";
        if (k === "guard-insert") send(copy);
      }
      if (k === "guard-delete" || k === "guard-delete-pass") {
        if (k === "guard-delete-pass") $('[data-guard="strict"]')?.click();
        doc.dataset.mode = "del"; $(".jv-msg", doc).textContent = "Delete this document?"; doc.scrollIntoView({ block: "nearest" });
        send(doc);
      }
      if (k === "add") window.jvAdd();
      if (k === "add-example") example(window.jvAdd());
      if (k === "delete") { doc.dataset.mode = "del"; $(".jv-msg", doc).textContent = "Delete this document?"; doc.scrollIntoView({ block: "nearest" }); }
    };
  }
