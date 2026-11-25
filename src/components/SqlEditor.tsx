import "./SqlEditor.css";
import { Fragment, forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { highlightSql } from "../lib/sql";
import { kindOf, type Kind } from "../lib/cells";
import { completeContext, suggest, type Ctx, type Item, type Source } from "../lib/complete";
import { Braces, CalendarClock, Eye, Folder, Hash, KeyRound, Table2, ToggleLeft, Type, ico, icoC } from "./Icon";

/** Above this the colouring is skipped: plain text, still line-numbered. Autocomplete stops here too. */
const HIGHLIGHT_LIMIT = 200 * 1024;

/** where autocomplete reads names from, and how it asks for a table's columns */
export type Completer = Source & { load(schema: string, table: string): void };

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
  tools?: ReactNode;
  empty?: ReactNode;
  /** table and column names as you type; leave out for no autocomplete */
  complete?: Completer;
  /** the colouring; SQL when left out (MongoDB passes highlightMongo) */
  highlight?: (src: string, cur?: number) => string;
}

const TYPE_ICON: Record<Kind, typeof Hash> = { num: Hash, ts: CalendarClock, bool: ToggleLeft, json: Braces, bytes: Type, text: Type, oid: Type, doc: Braces, arr: Braces };

function ItemIcon({ it }: { it: Item }) {
  if (it.kind === "table") return <Table2 {...ico} />;
  if (it.kind === "view") return <Eye {...ico} />;
  if (it.kind === "schema") return <Folder {...ico} />;
  if (it.primary) return <KeyRound {...icoC("pk")} />;
  const I = TYPE_ICON[kindOf(it.meta)];
  return <I {...ico} />;
}

/** the typed part of a name in bold */
function Marked({ name, word }: { name: string; word: string }) {
  const i = word ? name.toLowerCase().indexOf(word) : -1;
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <b>{name.slice(i, i + word.length)}</b>
      {name.slice(i + word.length)}
    </>
  );
}

/**
 * voidHTTP's CodeArea for SQL: a coloured, line-numbered <pre> under a transparent <textarea> in one grid cell,
 * so caret, selection, typing and undo stay native. The caret's line is marked.
 */
export const SqlEditor = forwardRef<HTMLTextAreaElement, Props>(function SqlEditor({ value, onChange, label, tools, empty, complete, highlight = highlightSql }, ref) {
  const [line, setLine] = useState(0);
  const plain = value.length > HIGHLIGHT_LIMIT;
  const html = useMemo(() => (plain ? "" : highlight(value, line)), [value, line, plain, highlight]);
  const input = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => input.current!, []);

  // ---- the caret ----
  // WebKit draws a textarea's caret from the bottom of the line above on every line but the first, so with this
  // editor's line height it floats up into the gap. The native caret is hidden and this one is drawn instead, at
  // the same offset in the coloured layer (which holds the same text), the same height on every line.
  const pre = useRef<HTMLPreElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<{ x: number; y: number; h: number; n: number } | null>(null);
  const caretN = useRef(0);
  const placeCaret = () => {
    const el = input.current;
    const p = pre.current;
    const g = grid.current;
    if (!el || !p || !g || document.activeElement !== el || el.selectionStart !== el.selectionEnd) return setCaret(null);
    const before = el.value.slice(0, el.selectionStart);
    const row = before.split("\n").length - 1;
    let col = before.length - before.lastIndexOf("\n") - 1;
    const line = p.querySelectorAll<HTMLElement>(".l")[row];
    if (!line) return setCaret(null);
    const gr = g.getBoundingClientRect();
    const lr = line.getBoundingClientRect();
    const cs = getComputedStyle(line);
    const lh = parseFloat(cs.lineHeight) || lr.height;
    const h = Math.round(parseFloat(cs.fontSize) * 1.3);
    // the text node and offset the column falls in; at a line's start (or an empty line) the text's left edge
    let x = lr.left + parseFloat(cs.paddingLeft);
    const walk = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode() as Text | null; t; t = walk.nextNode() as Text | null) {
      if (col <= t.length) {
        const r = document.createRange();
        r.setStart(t, col);
        r.setEnd(t, col);
        const rect = r.getClientRects()[0] ?? r.getBoundingClientRect();
        if (rect && (rect.left || rect.top)) x = rect.left;
        break;
      }
      col -= t.length;
    }
    caretN.current++;
    setCaret({ x: x - gr.left, y: lr.top - gr.top + (lh - h) / 2, h, n: caretN.current });
  };
  // a move restarts the blink; the coloured layer is drawn before this runs
  useLayoutEffect(() => {
    if (document.activeElement === input.current) placeCaret();
  }, [value, html]);
  useEffect(() => {
    const on = () => document.activeElement === input.current && placeCaret();
    document.addEventListener("selectionchange", on);
    return () => document.removeEventListener("selectionchange", on);
  });

  // ---- autocomplete ----
  const [ac, setAc] = useState<{ ctx: Ctx; sel: number } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const quiet = useRef(false);
  const listId = useId();
  const sug = useMemo(() => (ac && complete ? suggest(ac.ctx, complete) : null), [ac, complete]);
  const shown = !!ac && !!sug && (sug.items.length > 0 || sug.waiting.length > 0 || !!sug.notLoaded);
  const sel = sug && ac ? Math.min(ac.sel, Math.max(0, sug.items.length - 1)) : 0;

  // the first time a statement names a table, its columns are read; the store keeps them until Refresh
  useEffect(() => {
    if (complete && sug) for (const m of sug.missing) complete.load(m.schema, m.table);
  }, [sug, complete]);

  /** after a keystroke: what fits at the caret, and whether the list should be up */
  const update = (el: HTMLTextAreaElement, force: boolean, typed: string) => {
    if (!complete || el.value.length > HIGHLIGHT_LIMIT || el.selectionStart !== el.selectionEnd) return setAc(null);
    const ctx = completeContext(el.value, el.selectionStart, complete);
    if (!ctx) return setAc(null);
    const go =
      force ||
      (/^[\w$]$/.test(typed) && !!ctx.word) ||
      (typed === "." && ctx.qual !== null) ||
      (/^\s$/.test(typed) && ctx.afterKw && !ctx.word) ||
      (!!ac && (!!ctx.word || ctx.qual !== null || ctx.afterKw));
    if (!go) return setAc(null);
    setAc((prev) => ({ ctx, sel: prev && prev.ctx.wordStart === ctx.wordStart && prev.ctx.word === ctx.word ? prev.sel : 0 }));
  };

  // insertText keeps the pick on the native undo stack, so ⌘Z takes it back
  const accept = (i: number) => {
    const el = input.current;
    const it = sug?.items[i];
    if (!el || !it || !ac) return;
    const s = ac.ctx.wordStart;
    const e = el.selectionStart;
    el.focus();
    el.setSelectionRange(s, e);
    quiet.current = true;
    const ok = document.execCommand("insertText", false, it.insert);
    quiet.current = false;
    if (!ok) {
      onChange(el.value.slice(0, s) + it.insert + el.value.slice(e));
      requestAnimationFrame(() => el.setSelectionRange(s + it.insert.length, s + it.insert.length));
    }
    setAc(null);
    // picked a schema: list its tables
    if (it.kind === "schema") requestAnimationFrame(() => update(el, true, ""));
  };

  // under the start of the word, names lined up with what is typed; above the line when there is no room below
  const place = () => {
    const el = input.current;
    const m = menu.current;
    if (!el || !m || !ac) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const probe = document.createElement("span");
    probe.textContent = "0".repeat(40);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize}`;
    document.body.append(probe);
    const cw = probe.getBoundingClientRect().width / 40;
    probe.remove();
    const lh = parseFloat(cs.lineHeight);
    const upto = el.value.slice(0, ac.ctx.wordStart);
    const row = upto.split("\n").length - 1;
    const col = upto.slice(upto.lastIndexOf("\n") + 1).replace(/\t/g, "  ").length;
    const name = m.querySelector(".ac-name");
    const shift = name ? name.getBoundingClientRect().left - m.getBoundingClientRect().left : 12;
    const lineTop = r.top + parseFloat(cs.paddingTop) + row * lh;
    let y = lineTop + lh + 2;
    if (y + m.offsetHeight > innerHeight - 8 && lineTop - m.offsetHeight - 2 > 8) y = lineTop - m.offsetHeight - 2;
    const x = Math.max(8, Math.min(r.left + parseFloat(cs.paddingLeft) + col * cw - shift, innerWidth - m.offsetWidth - 8));
    m.style.left = `${x}px`;
    m.style.top = `${y}px`;
  };
  useLayoutEffect(() => {
    if (shown) place();
  });
  useEffect(() => {
    if (shown) menu.current?.querySelector(`[aria-selected="true"]`)?.scrollIntoView({ block: "nearest" });
  }, [shown, sel]);
  useEffect(() => {
    if (!ac) return;
    const close = () => setAc(null);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [ac]);
  // a new tab, a new connection: the list goes
  useEffect(() => setAc(null), [complete === undefined]);

  const track = (el: HTMLTextAreaElement) => {
    const n = el.value.slice(0, el.selectionStart).split("\n").length - 1;
    if (n !== line) setLine(n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    // Ctrl+Space asks for names wherever the caret is
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      update(el, true, "");
      return;
    }
    if (ac) {
      const n = shown && sug ? sug.items.length : 0;
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n) {
        e.preventDefault();
        setAc({ ...ac, sel: (sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n });
        return;
      }
      if (n && ((e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) || (e.key === "Tab" && !e.shiftKey && !e.metaKey && !e.altKey))) {
        // the name is already typed in full: Enter goes on to a new line, Tab only closes the list
        if (sug!.items[sel].name.toLowerCase() === ac.ctx.word.toLowerCase()) {
          setAc(null);
          if (e.key === "Tab") e.preventDefault();
          return;
        }
        e.preventDefault();
        accept(sel);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setAc(null);
        return;
      }
      if (e.metaKey || /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown)$/.test(e.key)) setAc(null);
    }
    // ⌘/ toggles -- on the selected lines
    if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.code === "Slash")) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = el;
      const from = value.lastIndexOf("\n", s - 1) + 1;
      const toNl = value.indexOf("\n", end > s && value[end - 1] === "\n" ? end - 1 : end);
      const to = toNl < 0 ? value.length : toNl;
      const lines = value.slice(from, to).split("\n");
      const allOn = lines.every((l) => !l.trim() || /^\s*--/.test(l));
      const next = lines.map((l) => (allOn ? l.replace(/^(\s*)-- ?/, "$1") : l.trim() ? l.replace(/^(\s*)/, "$1-- ") : l)).join("\n");
      el.setSelectionRange(from, to);
      quiet.current = true;
      if (!document.execCommand("insertText", false, next)) onChange(value.slice(0, from) + next + value.slice(to));
      quiet.current = false;
      requestAnimationFrame(() => el.setSelectionRange(from, from + next.length));
      return;
    }
    if (e.key !== "Tab" || e.metaKey || e.altKey) return;
    e.preventDefault();
    // insertText keeps the change on the native undo stack (⌘Z)
    quiet.current = true;
    const ok = document.execCommand("insertText", false, "  ");
    quiet.current = false;
    if (!ok) {
      const { selectionStart: s, selectionEnd: end } = el;
      onChange(value.slice(0, s) + "  " + value.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="editor">
      {tools && <div className="editor-bar">{tools}</div>}
      {empty && !value && <div className="editor-empty">{empty}</div>}
      <div className="code-edit" onScroll={() => shown && place()}>
        <div className="code-edit-grid" ref={grid}>
          {plain ? (
            <pre className="code" aria-hidden="true" ref={pre}>
              {value.split("\n").map((l, i) => (
                <span className="l" key={i}>
                  {l}
                </span>
              ))}
            </pre>
          ) : (
            <pre className="code" aria-hidden="true" ref={pre} dangerouslySetInnerHTML={{ __html: html }} />
          )}
          <textarea
            ref={input}
            className="code-input"
            aria-label={label}
            aria-autocomplete={complete ? "list" : undefined}
            aria-controls={shown ? listId : undefined}
            aria-activedescendant={shown && sug?.items.length ? `${listId}-${sel}` : undefined}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              track(e.target);
              if (quiet.current) return;
              const ne = e.nativeEvent as InputEvent;
              update(e.target, false, ne.inputType === "insertText" ? (ne.data ?? "").slice(-1) : ne.inputType === "insertLineBreak" ? "\n" : "");
            }}
            onSelect={(e) => track(e.currentTarget)}
            onKeyDown={onKeyDown}
            onMouseDown={() => setAc(null)}
            onFocus={placeCaret}
            onBlur={() => (setAc(null), setCaret(null))}
          />
          {caret && <span className="code-caret" key={caret.n} aria-hidden="true" style={{ left: caret.x, top: caret.y, height: caret.h }} />}
        </div>
      </div>
      {shown &&
        sug &&
        createPortal(
          <div className="menu ac-menu" id={listId} role="listbox" aria-label="Suggestions" ref={menu} onMouseDown={(e) => e.preventDefault()}>
            <p className="menu-note ac-head">
              <span>
                {sug.head.label}{" "}
                {sug.head.parts.map((p, i) => (
                  <Fragment key={`${p.alias}|${p.name}`}>
                    {i > 0 && ", "}
                    <b>{p.name}</b>
                    {p.alias && ` ${p.alias}`}
                  </Fragment>
                ))}
              </span>
              {sug.total > sug.items.length && (
                <span className="ac-count">
                  {sug.items.length} of {sug.total}
                </span>
              )}
            </p>
            <div className="ac-list">
              {sug.items.map((it, i) => (
                <button key={it.key} type="button" role="option" id={`${listId}-${i}`} className="ac-item" tabIndex={-1} aria-selected={i === sel} onClick={() => accept(i)}>
                  <ItemIcon it={it} />
                  <span className="ac-name">
                    <Marked name={it.name} word={sug.word} />
                  </span>
                  {it.src && <span className="ac-src">{it.src}</span>}
                  <span className="ac-meta">{it.meta}</span>
                </button>
              ))}
              {sug.waiting.map((t) => (
                <div className="ac-wait" role="status" key={t}>
                  <span className="spinner" aria-hidden="true" />
                  Reading the columns of {t}
                </div>
              ))}
              {sug.notLoaded && (
                <p className="menu-note ac-note">
                  <b>{sug.notLoaded}</b> isn't loaded yet. Open it in the sidebar and its tables come up here.
                </p>
              )}
            </div>
            {sug.items.length > 0 && (
              <div className="ac-foot">
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> choose
                </span>
                <span>
                  <kbd>↵</kbd> or <kbd>Tab</kbd> insert
                </span>
                <span>
                  <kbd>esc</kbd> close
                </span>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
});
