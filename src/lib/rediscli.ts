/**
 * The Redis console's text: colouring for the editor and which command ⌘↵ runs. Splitting and running are Rust's
 * (redis_cli.rs); nothing here decides what a command does. One command per line; # starts a comment line.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** options that shape a reply, coloured apart from keys and values */
const OPTS = /^(WITHSCORES|WITHVALUES|REV|MATCH|COUNT|TYPE|LIMIT|BYSCORE|BYLEX|EX|PX|EXAT|PXAT|NX|XX|GT|LT|KEEPTTL|GET|STORE|NOVALUES|MAXLEN|MINID|STREAMS|BLOCK|SAMPLES)$/i;

function line(src: string): string {
  if (/^\s*#/.test(src)) return `<span class="q-c">${esc(src)}</span>`;
  let n = 0;
  return (src.match(/"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|\S+|\s+/g) ?? [])
    .map((t) => {
      if (/^\s+$/.test(t)) return t;
      const i = n++;
      const cls = i === 0 ? "q-k" : /^["']/.test(t) ? "q-s" : OPTS.test(t) ? "q-f" : /^[-+]?(\d+(\.\d+)?|inf)$/i.test(t) ? "q-n" : i === 1 ? "q-tb" : "";
      return cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
    })
    .join("");
}

/** One `.l` block per line, as highlightSql gives them: the command, its key, options, numbers, quoted strings */
export function highlightRedis(src: string, cur?: number): string {
  return src
    .split("\n")
    .map((l, i) => `<span class="l${i === cur ? " cur" : ""}">${line(l)}</span>`)
    .join("");
}

/** The command ⌘↵ runs: the line the cursor is on, or the nearest command line above it */
export function redisCommandAt(src: string, cursor: number): string {
  const lines = src.split("\n");
  let at = 0;
  let row = 0;
  for (; row < lines.length - 1 && at + lines[row].length < cursor; row++) at += lines[row].length + 1;
  const isCmd = (i: number) => !!lines[i]?.trim() && !/^\s*#/.test(lines[i]);
  while (row > 0 && !isCmd(row)) row--;
  return isCmd(row) ? lines[row].trim() : "";
}
