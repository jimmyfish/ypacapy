import { forwardRef, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { highlightSql } from "../lib/sql";

/** Above this the colouring is skipped: plain text, still line-numbered. */
const HIGHLIGHT_LIMIT = 200 * 1024;

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
  tools?: ReactNode;
  empty?: ReactNode;
}

/**
 * voidHTTP's CodeArea for SQL: a coloured, line-numbered <pre> under a transparent <textarea> in one grid cell,
 * so caret, selection, typing and undo stay native. The caret's line is marked.
 */
export const SqlEditor = forwardRef<HTMLTextAreaElement, Props>(function SqlEditor({ value, onChange, label, tools, empty }, ref) {
  const [line, setLine] = useState(0);
  const plain = value.length > HIGHLIGHT_LIMIT;
  const html = useMemo(() => (plain ? "" : highlightSql(value, line)), [value, line, plain]);

  const track = (el: HTMLTextAreaElement) => {
    const n = el.value.slice(0, el.selectionStart).split("\n").length - 1;
    if (n !== line) setLine(n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
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
      if (!document.execCommand("insertText", false, next)) onChange(value.slice(0, from) + next + value.slice(to));
      requestAnimationFrame(() => el.setSelectionRange(from, from + next.length));
      return;
    }
    if (e.key !== "Tab" || e.metaKey || e.altKey) return;
    e.preventDefault();
    // insertText keeps the change on the native undo stack (⌘Z)
    if (!document.execCommand("insertText", false, "  ")) {
      const { selectionStart: s, selectionEnd: end } = el;
      onChange(value.slice(0, s) + "  " + value.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="editor">
      {tools && <div className="editor-bar">{tools}</div>}
      {empty && !value && <div className="editor-empty">{empty}</div>}
      <div className="code-edit">
        <div className="code-edit-grid">
          {plain ? (
            <pre className="code" aria-hidden="true">
              {value.split("\n").map((l, i) => (
                <span className="l" key={i}>
                  {l}
                </span>
              ))}
            </pre>
          ) : (
            <pre className="code" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          )}
          <textarea
            ref={ref}
            className="code-input"
            aria-label={label}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              track(e.target);
            }}
            onSelect={(e) => track(e.currentTarget)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
});
