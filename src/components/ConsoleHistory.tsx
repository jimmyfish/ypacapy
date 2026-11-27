import "./ConsoleHistory.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCurrent, useStore } from "../store";
import { useConsoleLog, type ConsoleEntry } from "../lib/consoleLog";
import { runs } from "../lib/sql";
import { duration } from "../lib/time";
import { errText } from "../lib/api";
import { EmptyState } from "./EmptyState";
import { ChevronUp, CircleAlert, Copy, Radio, Search, Shredder, SquareCode, SquareTerminal, ico, icoC } from "./Icon";

const NONE: ConsoleEntry[] = [];
/** the log's height: what the last drag left (kept on this Mac), 160 px until then */
const H_KEY = "ypacapy.console.height";
const OPEN_KEY = "ypacapy.console.open";
const H_DEFAULT = 160;
const H_MIN = 120;

const kept = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const keep = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private storage off: it just isn't remembered */
  }
};

const p2 = (n: number) => String(n).padStart(2, "0");
const clock = (at: number, ms = true) => {
  const d = new Date(at);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}${ms ? `.${String(d.getMilliseconds()).padStart(3, "0")}` : ""}`;
};

/** SQL in the scheme's colours; MongoDB and Redis as sent */
function Stmt({ text, sql }: { text: string; sql: boolean }) {
  if (!sql) return <>{text}</>;
  return (
    <>
      {runs(text).map(([c, t], i) =>
        c ? (
          <span key={i} className={c}>
            {t}
          </span>
        ) : (
          t
        ),
      )}
    </>
  );
}

/**
 * Console history: a bar at the foot of the work area, under every tab, for the connection in front. Closed it is
 * one line (the count and the last statement); ⌘J or the chevron opens the log: newest at the bottom, like a
 * terminal, a row opens to its whole statement. Kept in memory until ypacapy quits.
 */
export function ConsoleHistory() {
  const { conn } = useCurrent();
  const entries = useConsoleLog((s) => (conn ? s.byConn[conn.id] : undefined)) ?? NONE;
  const [open, setOpen] = useState(() => kept(OPEN_KEY) === "1");
  const [height, setHeight] = useState(() => Math.max(H_MIN, Number(kept(H_KEY)) || H_DEFAULT));
  const [who, setWho] = useState<"all" | "you" | "app">("all");
  const [pings, setPings] = useState(false);
  const [errs, setErrs] = useState(false);
  const [q, setQ] = useState("");
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  const list = useRef<HTMLOListElement>(null);
  const stick = useRef(true);
  const sql = !!conn && conn.engine !== "mongo" && conn.engine !== "redis";

  const toggle = (v = !open) => {
    setOpen(v);
    keep(OPEN_KEY, v ? "1" : "0");
  };
  // ⌘J opens and closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.key.toLowerCase() !== "j" || e.shiftKey || e.altKey || useStore.getState().modal) return;
      e.preventDefault();
      setOpen((v) => {
        keep(OPEN_KEY, v ? "0" : "1");
        return !v;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (who === "all" || e.who === who) &&
        (pings || e.flag !== "ping") &&
        (!errs || e.flag === "err") &&
        (!needle || e.text.toLowerCase().includes(needle) || e.what.toLowerCase().includes(needle) || (e.error ?? "").toLowerCase().includes(needle)),
    );
  }, [entries, who, pings, errs, q]);
  const count = useMemo(() => entries.reduce((n, e) => n + (e.flag === "ping" ? 0 : 1), 0), [entries]);
  const last = useMemo(() => [...entries].reverse().find((e) => e.flag !== "ping"), [entries]);

  // the newest stays in view while the log sits at its bottom; scrolled up to read, it stays put
  useLayoutEffect(() => {
    const l = list.current;
    if (open && l && stick.current) l.scrollTop = l.scrollHeight;
  }, [open, shown, height]);

  // drag the top edge: between H_MIN and most of the work area; the height is kept for next time
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    e.preventDefault();
    const grip = e.currentTarget;
    grip.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const h0 = height;
    const max = Math.max(H_MIN, (grip.closest(".work")?.getBoundingClientRect().height ?? 600) - 200);
    let h = h0;
    document.body.classList.add("row-resizing");
    const move = (ev: PointerEvent) => {
      h = Math.round(Math.max(H_MIN, Math.min(max, h0 + y0 - ev.clientY)));
      setHeight(h);
    };
    const up = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      document.body.classList.remove("row-resizing");
      keep(H_KEY, String(h));
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
  };

  if (!conn) return null;
  const st = useStore.getState();
  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(
      () => st.showToast("Copied the statement"),
      (err) => st.showToast(errText(err)),
    );
  const flip = (k: number) =>
    setOpened((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <section className="ch" aria-label="Console history" data-open={open}>
      <div className="ch-grip" role="separator" aria-orientation="horizontal" aria-label="Resize console history" onPointerDown={startResize} />
      <header className="ch-bar">
        <button type="button" className="ch-toggle" aria-expanded={open} title="Console history  ⌘J" onClick={() => toggle()}>
          <SquareTerminal {...icoC("ch-ico")} />
          <span className="ch-title">Console history</span>
          <span className="ch-n">{count}</span>
        </button>
        {!open && last && (
          <span className="ch-peek" aria-hidden="true">
            <span className="ch-time">{clock(last.at, false)}</span>
            <span className="ch-who" data-who={last.who}>
              {last.who}
            </span>
            <code className="ch-sql">
              <Stmt text={last.text.replace(/\s*\n\s*/g, " ")} sql={sql} />
            </code>
            <span className="ch-res" data-flag={last.flag}>
              {last.result}
            </span>
          </span>
        )}
        {open && (
          <div className="ch-tools">
            <span className="ch-conn">
              on <strong>{conn.name}</strong>
            </span>
            <div className="seg ch-seg" role="group" aria-label="Show">
              <button type="button" aria-pressed={who === "all"} onClick={() => setWho("all")}>
                All
              </button>
              <button type="button" aria-pressed={who === "you"} title="Statements you typed in a console" onClick={() => setWho("you")}>
                You
              </button>
              <button type="button" aria-pressed={who === "app"} title="Statements ypacapy wrote: table reads, saves, the schema tree, columns, autocomplete" onClick={() => setWho("app")}>
                ypacapy
              </button>
            </div>
            <button type="button" className="ch-chip" aria-pressed={pings} title="Heartbeat pings" onClick={() => setPings(!pings)}>
              <Radio {...ico} />
              Pings
            </button>
            <button type="button" className="ch-chip ch-chip--err" aria-pressed={errs} onClick={() => setErrs(!errs)}>
              <CircleAlert {...ico} />
              Errors
            </button>
            <div className="search ch-search">
              <Search {...ico} />
              <input className="field" placeholder="Filter" aria-label="Filter console history" autoComplete="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button type="button" className="icon-btn" aria-label="Clear console history" title="Clear. It's only kept until ypacapy quits." disabled={!entries.length} onClick={() => useConsoleLog.getState().clear(conn.id)}>
              <Shredder {...ico} />
            </button>
          </div>
        )}
        <button type="button" className="icon-btn ch-chev" aria-label={open ? "Close console history" : "Open console history"} title="⌘J" onClick={() => toggle()}>
          <ChevronUp {...ico} />
        </button>
      </header>
      {open && (
        <div className="ch-body" style={{ height }}>
          {!entries.length ? (
            <div className="ch-none">
              <EmptyState size="sm" icon={SquareTerminal} title={`Nothing sent to ${conn.name} yet`} line="Every statement ypacapy sends shows here: yours and its own. Kept until ypacapy quits." />
            </div>
          ) : !shown.length ? (
            <div className="ch-none">
              <p className="muted">Nothing matches this filter.</p>
            </div>
          ) : (
            <ol
              className="ch-list"
              ref={list}
              onScroll={(e) => {
                const l = e.currentTarget;
                stick.current = l.scrollHeight - l.scrollTop - l.clientHeight < 24;
              }}
            >
              {shown.map((e) => {
                const isOpen = opened.has(e.seq);
                return (
                  <li key={e.seq} className="ch-row" data-who={e.who} data-flag={e.flag}>
                    <button type="button" className="ch-line" aria-expanded={isOpen} onClick={() => flip(e.seq)}>
                      <span className="ch-time">{clock(e.at)}</span>
                      <span className="ch-who" title={e.who === "you" ? "You typed it" : "ypacapy wrote it"}>
                        {e.who}
                      </span>
                      <span className="ch-what">{e.what}</span>
                      <code className="ch-sql">
                        <Stmt text={e.text.replace(/\s*\n\s*/g, " ")} sql={sql} />
                      </code>
                      <span className="ch-tag-slot">{e.flag === "write" && <span className="ch-tag">write</span>}</span>
                      <span className="ch-res">{e.result}</span>
                      <span className="ch-ms">{duration(Math.round(e.ms))}</span>
                    </button>
                    {isOpen && (
                      <div className="ch-x">
                        <pre className="ch-full">
                          <Stmt text={e.text} sql={sql} />
                        </pre>
                        {e.error && (
                          <p className="ch-err">
                            <CircleAlert {...ico} />
                            <span>{e.error}</span>
                          </p>
                        )}
                        <div className="ch-x-acts">
                          <button type="button" className="btn btn--quiet" onClick={() => void copy(e.text)}>
                            <Copy {...ico} />
                            Copy
                          </button>
                          <button type="button" className="btn btn--quiet" onClick={() => st.newQueryTab(e.text.trimEnd() + "\n")}>
                            <SquareCode {...ico} />
                            Open in a console
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
