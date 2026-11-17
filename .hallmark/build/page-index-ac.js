  // Query 5: autocomplete in the SQL editor.
  // Table names come from the schema tree the sidebar already loaded, so they cost no query. Columns and their
  // types are one catalog read per table, made the first time a statement needs that table, then kept until
  // Refresh. A keystroke only scans the statement around the caret and filters short lists in memory.
  {
    const AC = JSON.parse($("#ac-data").textContent);
    const ta = $("#q5-input"), hl = $("#q5-code"), menu = $("#ac-menu"), scroller = $("#code-q5");

    // the app's highlighter (src/lib/sql.ts), so the live editor paints like the others
    const KEYWORDS = new Set((
      "select from where and or not in is null as on join left right inner outer full cross natural using group by order having limit offset fetch first next rows only " +
      "union all intersect except distinct case when then else end insert into values update set delete returning create table view index unique primary key foreign " +
      "references drop alter add column constraint default check truncate grant revoke to with recursive asc desc nulls last exists between like ilike similar " +
      "interval true false begin commit rollback transaction explain analyze replace if cascade restrict materialized schema database lateral over partition window " +
      "filter within conflict do nothing escape collate show use describe pragma vacuum for of share nowait skip locked temporary temp sequence trigger function procedure"
    ).split(" "));
    const TYPES = new Set((
      "int integer smallint bigint tinyint mediumint int2 int4 int8 serial bigserial numeric decimal real float float4 float8 double precision money text varchar char " +
      "character varying bpchar uuid json jsonb bool boolean date time timestamp timestamptz timetz bytea blob inet cidr macaddr xml datetime year enum bit"
    ).split(" "));
    const TOKEN = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\$([A-Za-z_]\w*)?\$[\s\S]*?(?:\$\4\$|$))|("(?:[^"]|"")*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_][\w$]*)/g;
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Table names (q-tb): the name after FROM, JOIN, UPDATE, INTO, TABLE, TRUNCATE, REFERENCES, each name in a
    // FROM list (a, b), and every part of schema.table. FROM counts only where this paren level holds a
    // SELECT/DELETE, so EXTRACT(x FROM ts) and IS DISTINCT FROM y stay plain. After FROM/JOIN a name followed
    // by "(" is a function (generate_series); after INTO/TABLE it is the table with its column list.
    const TABLE_AFTER = new Set(["from", "join", "update", "into", "table", "truncate", "references"]);
    const KEEP_WANT = new Set(["only", "lateral", "if", "not", "exists"]);
    const KEEP_LIST = new Set(["as", "only", "lateral", "join", "left", "right", "inner", "outer", "full", "cross", "natural"]);
    function runs(src) {
      const out = []; let last = 0;
      let depth = 0, sel = [false], list = -1, want = "", tableEnd = -1, prevKw = "";
      const gap = (text) => {
        for (const ch of text) {
          if (ch === "(") { depth++; sel[depth] = false; want = ""; }
          else if (ch === ")") { if (depth > 0) depth--; if (list > depth) list = -1; want = ""; }
          else if (ch === "," && list === depth) want = "from";
          else if (ch === ";") { depth = 0; sel = [false]; list = -1; want = ""; }
        }
      };
      TOKEN.lastIndex = 0;
      for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
        if (m.index > last) { out.push(["", src.slice(last, m.index)]); gap(src.slice(last, m.index)); }
        const qualified = tableEnd >= 0 && src.slice(tableEnd, m.index) === ".";
        tableEnd = -1;
        let cls = "";
        if (m[1]) cls = "q-c";
        else if (m[2] || m[3] || m[6]) { cls = m[6] ? "q-n" : "q-s"; want = ""; prevKw = ""; }
        else {
          const w = (m[7] || "").toLowerCase();
          const call = /^\s*\(/.test(src.slice(m.index + m[0].length));
          if (m[7] && KEYWORDS.has(w)) {
            cls = "q-k";
            if (w === "select" || w === "delete") sel[depth] = true;
            if (TABLE_AFTER.has(w) && !(w === "from" && (!sel[depth] || prevKw === "distinct"))) {
              want = w;
              if (w === "from") list = depth;
            } else if (!KEEP_WANT.has(w)) want = "";
            if (list === depth && !KEEP_LIST.has(w) && w !== "from") list = -1;
            prevKw = w;
          } else {
            const fn = call && (want === "from" || want === "join" || !want) && !qualified;
            cls = (want || qualified) && !fn ? "q-tb" : !m[7] ? "" : TYPES.has(w) ? "q-t" : call ? "q-f" : "";
            if (cls === "q-tb") tableEnd = m.index + m[0].length;
            want = ""; prevKw = "";
          }
        }
        out.push([cls, m[0]]);
        last = m.index + m[0].length;
      }
      if (last < src.length) out.push(["", src.slice(last)]);
      return out;
    }
    function paint() {
      const cur = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
      const lines = [""];
      for (const [cls, text] of runs(ta.value)) text.split("\n").forEach((part, k) => {
        if (k > 0) lines.push("");
        if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
      });
      hl.innerHTML = lines.map((h, i) => { const m = /^ +/.exec(h); return `<span class="l${i === cur ? " cur" : ""}">${m ? `<span class="ind">${m[0]}</span>${h.slice(m[0].length)}` : h}</span>`; }).join("");
    }

    // ---- where the caret is: which statement, which word, and what fits there ----
    const PIECE = /"(?:[^"]|"")*"|`[^`]*`|[A-Za-z_][\w$]*|\d[\w.]*|\S/g;
    function tokens(src) {
      const out = []; let pos = 0;
      for (const [cls, t] of runs(src)) {
        if (cls !== "q-c" && cls !== "q-s") {
          PIECE.lastIndex = 0;
          for (let m = PIECE.exec(t); m; m = PIECE.exec(t)) out.push({ t: m[0], lo: m[0].toLowerCase(), pos: pos + m.index, end: pos + m.index + m[0].length });
        }
        pos += t.length;
      }
      return out;
    }
    const unq = (t) => (t[0] === '"' ? t.slice(1, -1).replace(/""/g, '"') : t[0] === "`" ? t.slice(1, -1) : t.toLowerCase());
    const ident = (k) => !!k && (k.t[0] === '"' || k.t[0] === "`" || (/^[A-Za-z_]/.test(k.t) && !KEYWORDS.has(k.lo)));
    const TABLE_KW = new Set(["from", "join", "update", "into", "table"]);
    const CLAUSE = new Set(["select", "from", "join", "where", "on", "by", "having", "set", "update", "into", "table", "returning", "using", "limit", "offset", "values", "and", "or", "when", "then", "else"]);
    const NO_COLUMNS = new Set(["limit", "offset", "values", "into", "table", "update", "from", "join"]);

    function context() {
      const text = ta.value, at = ta.selectionStart;
      if (ta.selectionEnd !== at) return null;
      // the statement around the caret; nothing inside a string or a comment
      let pos = 0, start = 0, end = text.length;
      for (const [cls, t] of runs(text)) {
        const next = pos + t.length;
        if (!cls) {
          for (let i = t.indexOf(";"); i >= 0; i = t.indexOf(";", i + 1)) { const p = pos + i; if (p < at) start = p + 1; else if (end === text.length) end = p; }
        } else if ((cls === "q-c" || cls === "q-s") && pos < at && at <= next) {
          const closed = at === next && (cls === "q-s" ? t.length > 1 && t.endsWith(t[0]) : t.startsWith("/*") && t.length > 3 && t.endsWith("*/"));
          if (!closed) return null;
        }
        pos = next;
      }
      const stmt = text.slice(start, end), rel = at - start, before = stmt.slice(0, rel);
      if (/[\w$]/.test(stmt[rel] || "")) return null; // caret inside a word: leave it alone
      const m = /(?:([A-Za-z_][\w$]*|"(?:[^"]|"")+")\.)?([A-Za-z_][\w$]*)?$/.exec(before);
      const word = m[2] || "", qual = m[1] ? unq(m[1]) : null;
      const from = rel - m[0].length;
      if (from > 0 && /[\w$."]/.test(before[from - 1])) return null; // 12abc, a.b.c
      const toks = tokens(stmt);
      const prior = toks.filter((k) => k.end <= from);
      const prev = prior[prior.length - 1];

      // the tables this statement names, with their aliases: from a x, b y / join c z / update d / into e
      const refs = [];
      for (let i = 0; i < toks.length; i++) {
        if (!TABLE_KW.has(toks[i].lo)) continue;
        let j = i + 1;
        for (;;) {
          const a = toks[j]; if (!ident(a)) break;
          let schema = AC.schema, table = unq(a.t), last = a;
          if (toks[j + 1]?.t === "." && ident(toks[j + 2])) { schema = table; table = unq(toks[j + 2].t); last = toks[j + 2]; j += 3; } else j += 1;
          if (last.end === rel || toks[j]?.t === ".") break; // still being typed
          let alias = null;
          if (toks[j]?.lo === "as") j++;
          if (ident(toks[j]) && toks[j].end !== rel) { alias = unq(toks[j].t); j++; }
          refs.push({ schema, table, alias });
          if (toks[i].lo === "from" && toks[j]?.t === ",") { j++; continue; }
          break;
        }
      }
      let clause = null;
      for (let i = prior.length - 1; i >= 0; i--) if (CLAUSE.has(prior[i].lo)) { clause = prior[i].lo; break; }

      const base = { word, qual, wordStart: at - word.length, afterKw: !!prev && TABLE_KW.has(prev.lo) && !qual };
      if (qual) {
        const r = refs.find((x) => x.alias === qual) || refs.find((x) => x.table === qual);
        if (r) return { ...base, mode: "columns", tables: [r] };
        if (AC.schemas[qual]) return { ...base, mode: "tables", schema: qual };
        if (AC.schemas[AC.schema].tables.some(([n]) => n === qual)) return { ...base, mode: "columns", tables: [{ schema: AC.schema, table: qual, alias: null }] };
        return null;
      }
      if (!prev) return null;
      if (TABLE_KW.has(prev.lo) || (prev.t === "," && clause === "from")) return { ...base, mode: "tables", schema: AC.schema };
      if (prev.lo === "as" || (TABLE_KW.has(clause) && ident(prev))) return null; // naming an alias
      if (!clause || NO_COLUMNS.has(clause)) return null;
      return { ...base, mode: "columns", tables: refs };
    }

    // ---- columns: read once per table, kept until Refresh ----
    const cache = {};
    let frozen = null; // the "reading columns" preset holds its read until the next key
    function fetchCols(key) {
      setTimeout(() => { cache[key] = { state: "loaded", cols: AC.columns[key.split(".")[1]] || [] }; if (!menu.hidden) update(false); }, 450);
    }
    function cols(t) {
      const s = AC.schemas[t.schema];
      if (!s?.loaded || !s.tables.some(([n]) => n === t.table)) return null;
      const key = `${t.schema}.${t.table}`;
      if (!cache[key]) { cache[key] = { state: "loading" }; if (frozen !== key) fetchCols(key); }
      return cache[key];
    }
    $('[aria-label="Refresh schema"]')?.addEventListener("click", () => { for (const k in cache) delete cache[k]; });

    // ---- the list ----
    const ico = (n, cls = "") => `<svg aria-hidden="true" class="ico${cls ? " " + cls : ""}"><use href="#i-${n}"/></svg>`;
    const typeIcon = (t) => (/^(int|numeric|float|real|double|decimal|serial|bigint|smallint)/.test(t) ? "hash" : /timestamp|^date|^time/.test(t) ? "calendar-clock" : /^bool/.test(t) ? "toggle-left" : /^json/.test(t) ? "braces" : "type");
    const quote = (n) => (/^[a-z_][a-z0-9_$]*$/.test(n) && !KEYWORDS.has(n) ? n : `"${n.replace(/"/g, '""')}"`);
    const mark = (name, w) => {
      const i = w ? name.toLowerCase().indexOf(w) : -1;
      return i < 0 ? esc(name) : `${esc(name.slice(0, i))}<b>${esc(name.slice(i, i + w.length))}</b>${esc(name.slice(i + w.length))}`;
    };
    function build(ctx) {
      const w = ctx.word.toLowerCase(), all = [], waiting = [];
      let head, note = "";
      if (ctx.mode === "tables") {
        const s = AC.schemas[ctx.schema];
        head = `Tables in <b>${esc(ctx.schema)}</b>`;
        if (!s.loaded) note = `<b>${esc(ctx.schema)}</b> isn't loaded yet. Open it in the sidebar and its tables come up here.`;
        else for (const [name, kind, est] of s.tables) all.push({ name, icon: kind === "view" ? "eye" : "table-2", meta: kind === "view" ? "view" : est ? `~${est} rows` : "", insert: quote(name) });
        if (!ctx.qual) for (const name of Object.keys(AC.schemas)) if (name !== ctx.schema) all.push({ name, icon: "folder", meta: "schema", insert: quote(name) + ".", schema: true });
      } else {
        const seen = new Set(), ts = ctx.tables.filter((t) => { const k = `${t.alias}|${t.schema}.${t.table}`; return !seen.has(k) && seen.add(k); });
        const known = ts.filter((t) => cols(t));
        if (!known.length) return null;
        head = `Columns of ${known.map((t) => `<b>${esc(t.table)}</b>${t.alias ? " " + esc(t.alias) : ""}`).join(", ")}`;
        for (const t of known) {
          const c = cols(t);
          if (c.state === "loading") { waiting.push(t.table); continue; }
          for (const [name, type, pk] of c.cols) all.push({ name, icon: pk ? "key-round" : typeIcon(type), pk, meta: type, src: known.length > 1 ? t.alias || t.table : "", insert: quote(name) });
        }
      }
      // names that start with the word first, then names that contain it
      const pre = [], mid = [];
      for (const it of all) { const n = it.name.toLowerCase(); if (!w || n.startsWith(w)) pre.push(it); else if (n.includes(w)) mid.push(it); }
      const total = pre.length + mid.length;
      return { head, note, waiting, total, items: pre.concat(mid).slice(0, 50), w };
    }

    let cur = null, quiet = false;
    function close() {
      menu.hidden = true; cur = null;
      ta.removeAttribute("aria-activedescendant");
    }
    window.acClose = close;
    function update(force, typed = "") {
      if (scroller.hidden) return close();
      const ctx = context();
      if (!ctx) return close();
      const open = !menu.hidden;
      const wordKey = /^[\w$]$/.test(typed);
      const go = force ||
        (wordKey && ctx.word) ||
        (typed === "." && ctx.qual) ||
        (/^\s$/.test(typed) && ctx.afterKw && !ctx.word) ||
        (open && (ctx.word || ctx.qual || ctx.afterKw));
      if (!go) return close();
      const r = build(ctx);
      if (!r || (!r.items.length && !r.waiting.length && !r.note)) return close();
      const sel = cur && cur.ctx.wordStart === ctx.wordStart && cur.r.w === r.w ? Math.min(cur.sel, r.items.length - 1) : 0;
      cur = { ctx, r, sel: Math.max(0, sel) };
      menu.innerHTML =
        `<p class="menu-note ac-head"><span>${r.head}</span>${r.total > r.items.length ? `<span class="ac-count">${r.items.length} of ${r.total}</span>` : ""}</p>` +
        `<div class="ac-list">` +
        r.items.map((it, i) => `<button type="button" role="option" class="ac-item" id="ac-opt-${i}" data-i="${i}" tabindex="-1" aria-selected="${i === cur.sel}">${ico(it.icon, it.pk ? "pk" : "")}<span class="ac-name">${mark(it.name, r.w)}</span>${it.src ? `<span class="ac-src">${esc(it.src)}</span>` : ""}<span class="ac-meta">${esc(it.meta)}</span></button>`).join("") +
        r.waiting.map((t) => `<div class="ac-wait" role="status"><span class="spinner" aria-hidden="true"></span>Reading the columns of ${esc(t)}</div>`).join("") +
        (r.note ? `<p class="menu-note ac-note">${r.note}</p>` : "") +
        `</div>` +
        (r.items.length ? `<div class="ac-foot"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>↵</kbd> or <kbd>Tab</kbd> insert</span><span><kbd>esc</kbd> close</span></div>` : "");
      if (r.items.length) ta.setAttribute("aria-activedescendant", `ac-opt-${cur.sel}`); else ta.removeAttribute("aria-activedescendant");
      place();
    }

    // under the start of the word, names lined up with what is typed; above it when there is no room below
    function place() {
      if (!cur) return;
      const cs = getComputedStyle(ta), r = ta.getBoundingClientRect();
      const probe = document.createElement("span");
      probe.textContent = "0".repeat(40);
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize}`;
      document.body.append(probe);
      const cw = probe.getBoundingClientRect().width / 40; probe.remove();
      const lh = parseFloat(cs.lineHeight);
      const upto = ta.value.slice(0, cur.ctx.wordStart), line = upto.split("\n").length - 1;
      const col = upto.slice(upto.lastIndexOf("\n") + 1).replace(/\t/g, "  ").length;
      menu.style.left = "0px"; menu.style.top = "0px"; menu.hidden = false;
      const name = $(".ac-name", menu);
      const shift = name ? name.getBoundingClientRect().left - menu.getBoundingClientRect().left : 12;
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      const lineTop = r.top + parseFloat(cs.paddingTop) + line * lh;
      let y = lineTop + lh + 2;
      if (y + mh > innerHeight - 8 && lineTop - mh - 2 > 8) y = lineTop - mh - 2;
      const x = Math.max(8, Math.min(r.left + parseFloat(cs.paddingLeft) + col * cw - shift, innerWidth - mw - 8));
      menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    }
    function move(d) {
      const n = cur.r.items.length;
      cur.sel = (cur.sel + d + n) % n;
      $$(".ac-item", menu).forEach((b, i) => b.setAttribute("aria-selected", String(i === cur.sel)));
      $(`#ac-opt-${cur.sel}`).scrollIntoView({ block: "nearest" });
      ta.setAttribute("aria-activedescendant", `ac-opt-${cur.sel}`);
    }
    // insertText keeps the pick on the native undo stack, so ⌘Z takes it back
    function accept(i) {
      const it = cur?.r.items[i]; if (!it) return;
      const s = cur.ctx.wordStart, e = ta.selectionStart;
      ta.focus(); ta.setSelectionRange(s, e);
      quiet = true;
      if (!document.execCommand("insertText", false, it.insert)) ta.setRangeText(it.insert, s, e, "end");
      quiet = false;
      paint(); close();
      if (it.schema) update(true); // picked a schema: list its tables
    }

    ta.addEventListener("input", (e) => {
      paint();
      if (quiet) return;
      update(false, e.inputType === "insertText" ? (e.data || "").slice(-1) : e.inputType === "insertLineBreak" ? "\n" : "");
    });
    ta.addEventListener("keydown", (e) => {
      if (frozen) { const k = frozen; frozen = null; if (cache[k]?.state === "loading") fetchCols(k); }
      if (e.ctrlKey && e.code === "Space") { e.preventDefault(); update(true); return; }
      if (!cur || menu.hidden) {
        if (e.key === "Tab" && !e.metaKey && !e.altKey && !e.ctrlKey) {
          e.preventDefault(); quiet = true;
          if (!document.execCommand("insertText", false, "  ")) ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end");
          quiet = false; paint();
        }
        return;
      }
      const n = cur.r.items.length;
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n) { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
      else if (n && ((e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) || (e.key === "Tab" && !e.shiftKey))) {
        // the name is already typed in full: Enter goes on to a new line, Tab only closes the list
        if (cur.r.items[cur.sel].name.toLowerCase() === cur.ctx.word.toLowerCase()) { if (e.key === "Tab") e.preventDefault(); close(); }
        else { e.preventDefault(); accept(cur.sel); }
      }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "Tab") { e.preventDefault(); close(); }
      else if (e.metaKey || /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown)$/.test(e.key)) close();
    });
    ta.addEventListener("keyup", (e) => { if (/^Arrow|^Home$|^End$/.test(e.key)) paint(); });
    ta.addEventListener("mousedown", close);
    ta.addEventListener("mouseup", paint);
    ta.addEventListener("blur", close);
    scroller.addEventListener("scroll", () => { if (!menu.hidden) place(); });
    addEventListener("resize", close);
    menu.addEventListener("mousedown", (e) => e.preventDefault()); // keep the caret in the editor
    menu.addEventListener("click", (e) => { const b = e.target.closest(".ac-item"); if (b) accept(Number(b.dataset.i)); });

    // ---- the preview bar's states; | marks the caret ----
    const START = "select o.id, o.total, c.email\nfrom orders o\njoin customers c on c.id = o.customer_id\nwhere o.|";
    const PRESETS = {
      "ac-tables": "select *\nfrom ord|",
      "ac-columns": START,
      "ac-mixed": "select o.id, c.email, cre|\nfrom orders o\njoin customers c on c.id = o.customer_id",
      "ac-loading": "select c.|\nfrom customers c",
      "ac-schema": "select *\nfrom audit.|",
    };
    function load(text) {
      const at = text.indexOf("|");
      ta.value = text.replace("|", "");
      ta.focus(); ta.setSelectionRange(at, at);
      paint();
    }
    window.acShow = (k) => {
      for (const key in cache) delete cache[key];
      frozen = k === "ac-loading" ? "public.customers" : null;
      if (!frozen) for (const t of ["orders", "customers"]) cache[`public.${t}`] = { state: "loaded", cols: AC.columns[t] };
      load(PRESETS[k] || START);
      requestAnimationFrame(() => update(true));
    };
    ta.value = START.replace("|", "");
    paint();
  }
