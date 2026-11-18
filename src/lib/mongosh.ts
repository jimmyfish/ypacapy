/**
 * The console's mongosh text: colouring for the editor, and which statement ⌘↵ runs. Parsing and running are
 * Rust's (mongo_shell.rs); nothing here decides what a statement does.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** comments, strings, $operators, db.<collection>.<method>(, .method(, the typed constructors, numbers */
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\$[A-Za-z]+)|\b(db)(\.)([\w$]+)(?=\s*\.)|\.([\w$]+)(?=\s*\()|\b(ObjectId|ObjectID|ISODate|Date|NumberDecimal|Decimal128|NumberLong|NumberInt|Long|Timestamp|UUID|MinKey|MaxKey)\b|\b(true|false|null|new)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g;

function runs(src: string): [string, string][] {
  const out: [string, string][] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
    if (m.index > last) out.push(["", src.slice(last, m.index)]);
    if (m[1]) out.push(["q-c", m[1]]);
    else if (m[2]) out.push(["q-s", m[2]]);
    else if (m[3]) out.push(["q-k", m[3]]);
    else if (m[4]) out.push(["q-t", m[4]], ["", m[5]], ["q-tb", m[6]]);
    else if (m[7]) out.push(["", "."], ["q-f", m[7]]);
    else if (m[8]) out.push(["q-f", m[8]]);
    else if (m[9]) out.push(["q-k", m[9]]);
    else out.push(["q-n", m[10]]);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(["", src.slice(last)]);
  return out;
}

/** One `.l` block per line, as highlightSql gives them, so the editor draws mongosh the same way */
export function highlightMongo(src: string, cur?: number): string {
  const lines: string[] = [""];
  for (const [cls, text] of runs(src)) {
    text.split("\n").forEach((part, k) => {
      if (k > 0) lines.push("");
      if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
    });
  }
  return lines
    .map((html, i) => {
      const m = /^ +/.exec(html);
      const lead = m ? `<span class="ind">${m[0]}</span>` : "";
      return `<span class="l${i === cur ? " cur" : ""}">${lead}${m ? html.slice(m[0].length) : html}</span>`;
    })
    .join("");
}

/**
 * The statement ⌘↵ runs: the lines around the cursor up to a blank line on each side, or a line that starts
 * a new `db.` statement. Comments stay with it (Rust skips them). Empty when the cursor is on blank lines only.
 */
export function mongoStatementAt(src: string, cursor: number): string {
  const lines = src.split("\n");
  let at = 0;
  let row = 0;
  for (; row < lines.length - 1 && at + lines[row].length < cursor; row++) at += lines[row].length + 1;
  const blank = (i: number) => !lines[i]?.trim();
  const starts = (i: number) => /^\s*db\b/.test(lines[i] ?? "");
  // on a blank line right under a statement: that statement
  if (blank(row) && row > 0 && !blank(row - 1)) row--;
  if (blank(row)) return "";
  let a = row;
  while (a > 0 && !blank(a - 1) && !starts(a)) a--;
  let b = row;
  while (b < lines.length - 1 && !blank(b + 1) && !starts(b + 1)) b++;
  return lines.slice(a, b + 1).join("\n").trim();
}
