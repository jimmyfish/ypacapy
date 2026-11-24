import "./Ask.css";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useStore, type AskAlt, type AskEffect, type AskIcon, type AskSubject, type AskTone, type Modal } from "../store";
import type { Approval, Warning } from "../types";
import { Caps, Err, PassField } from "./AuthDialog";
import { ConnTile } from "./ConnTile";
import {
  Bookmark,
  CircleAlert,
  CirclePlus,
  Database,
  Fingerprint,
  Folder,
  FolderInput,
  FolderPlus,
  HardDrive,
  HistoryIcon,
  Key,
  Lock,
  LockOpen,
  Network,
  Pencil,
  Play,
  Save,
  Search,
  Settings2,
  Shield,
  Shredder,
  SquareCode,
  Table2,
  Timer,
  TriangleAlert,
  Undo2,
  Unplug,
  X,
  ico,
} from "./Icon";

/**
 * The asks (confirm, prompt, Save query, the write guard), in the passphrase asks' shape (AuthDialog): a tinted badge
 * (red: something goes for good, amber: something is lost or risky, blue: nothing is lost), the title and why, then
 * what it acts on in a card, go/stay rows, the shredder line, 40px wells, a second way on under an "or", and Cancel
 * and the action in equal filled halves. The action says what it does, never OK.
 */

const ICONS: Record<AskIcon, LucideIcon> = {
  bookmark: Bookmark,
  "circle-alert": CircleAlert,
  database: Database,
  folder: Folder,
  "folder-input": FolderInput,
  "folder-plus": FolderPlus,
  "hard-drive": HardDrive,
  history: HistoryIcon,
  key: Key,
  network: Network,
  pencil: Pencil,
  save: Save,
  search: Search,
  shredder: Shredder,
  "square-code": SquareCode,
  "table-2": Table2,
  "undo-2": Undo2,
  unplug: Unplug,
  x: X,
};
const Ico = ({ name }: { name?: AskIcon }) => {
  if (!name) return null;
  const I = ICONS[name];
  return <I {...ico} />;
};

const CANT_UNDO = "It can't be undone.";

export function Shell({ title, sub, tone, badge, onClose, children }: { title: string; sub?: string; tone?: AskTone; badge: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog auth ask" role="dialog" aria-modal="true" aria-labelledby="ask-t" aria-describedby={sub ? "ask-d" : undefined}>
        <div className="auth-head">
          <span className={`auth-badge${tone ? ` auth-badge--${tone}` : ""}`}>{badge}</span>
          <div className="auth-head-text">
            <h2 id="ask-t">{title}</h2>
            {sub && <p id="ask-d">{sub}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Subject({ s }: { s: AskSubject }) {
  return (
    <div className="ask-subject">
      {s.conn ? (
        <ConnTile conn={s.conn} typed />
      ) : (
        <span className="ask-subject-ico">
          <Ico name={s.icon} />
        </span>
      )}
      <span className="ask-subject-text">
        <strong>{s.name}</strong>
        {s.meta && <small className={s.mono ? "mono" : undefined}>{s.meta}</small>}
      </span>
    </div>
  );
}

function Effects({ rows }: { rows: AskEffect[] }) {
  return (
    <ul className="auth-scope auth-effects">
      {rows.map(([k, icon, what, happens]) => (
        <li key={what} className={`auth-effect--${k}`}>
          <Ico name={icon} />
          <span>
            <strong>{what}</strong> {happens}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** the red line before an action that can't be undone */
export function FinalLine({ text }: { text: string }) {
  return (
    <p className="ask-final">
      <Shredder {...ico} />
      <span>{text}</span>
    </p>
  );
}

function Alt({ alt, onClose }: { alt: AskAlt; onClose: () => void }) {
  return (
    <>
      <div className="auth-or" aria-hidden="true">
        <span>or</span>
      </div>
      <button type="button" className="btn auth-btn ask-alt" onClick={() => (onClose(), alt.run())}>
        <Ico name={alt.icon} />
        {alt.label}
      </button>
    </>
  );
}

export function Actions({ onClose, danger, icon, label, autoFocus, disabled }: { onClose: () => void; danger?: boolean; icon: ReactNode; label: string; autoFocus?: boolean; disabled?: boolean }) {
  return (
    <footer className="auth-actions">
      <button type="button" className="btn auth-btn" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className={`btn auth-btn ${danger ? "auth-btn--danger" : "auth-btn--primary"}`} autoFocus={autoFocus} disabled={disabled}>
        {icon}
        {label}
      </button>
    </footer>
  );
}

/** a text field in the 40px well, with its icon */
function Well(p: { label: string; icon?: AskIcon; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; list?: string }) {
  return (
    <label className="auth-field">
      {p.label}
      <span className="auth-input ask-input">
        <Ico name={p.icon} />
        <input
          className="field"
          value={p.value}
          placeholder={p.placeholder}
          autoFocus={p.autoFocus}
          autoComplete="off"
          spellCheck={false}
          list={p.list}
          onFocus={(e) => p.autoFocus && e.target.select()}
          onChange={(e) => p.onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

// ---------- confirm ----------

export function ConfirmAsk({ m, onClose }: { m: Extract<Modal, { kind: "confirm" }>; onClose: () => void }) {
  const final = m.final === true ? CANT_UNDO : m.final || "";
  return (
    <Shell title={m.title} sub={m.message} tone={m.tone ?? (final ? "danger" : "warn")} badge={<Ico name={m.icon ?? (final ? "shredder" : "circle-alert")} />} onClose={onClose}>
      {m.subject && <Subject s={m.subject} />}
      {m.effects && <Effects rows={m.effects} />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
          m.onConfirm();
        }}
      >
        {final && <FinalLine text={final} />}
        {m.alt && <Alt alt={m.alt} onClose={onClose} />}
        <Actions onClose={onClose} danger icon={<Ico name={final ? "shredder" : m.actionIcon} />} label={m.confirmLabel ?? "Delete"} autoFocus />
      </form>
    </Shell>
  );
}

// ---------- prompt ----------

export function PromptAsk({ m, onClose }: { m: Extract<Modal, { kind: "prompt" }>; onClose: () => void }) {
  const [v, setV] = useState(m.initial);
  return (
    <Shell title={m.title} sub={m.message} badge={<Ico name={m.icon ?? "pencil"} />} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onClose();
          m.onSubmit(v.trim());
        }}
      >
        <Well label={m.label} icon={m.fieldIcon ?? "pencil"} value={v} onChange={setV} placeholder={m.placeholder} autoFocus />
        <Actions onClose={onClose} icon={<Ico name={m.actionIcon} />} label={m.confirmLabel ?? "OK"} disabled={!v.trim()} />
      </form>
    </Shell>
  );
}

// ---------- Save query ----------

export function SaveQueryAsk({ tabId, onClose }: { tabId: string; onClose: () => void }) {
  const saved = useStore((s) => s.saved);
  const tab = useStore((s) => Object.values(s.sessions).flatMap((x) => x.tabs).find((t) => t.id === tabId));
  const [name, setName] = useState(tab?.kind === "query" ? tab.title : "");
  const [folder, setFolder] = useState(tab?.kind === "query" ? (tab.savedFolder ?? "") : "");
  const folders = [...new Set(saved.map((s) => s.folder).filter(Boolean))].sort();
  return (
    <Shell title="Save query" sub="Capy keeps it in ypacapy.db, on this Mac." badge={<Save {...ico} />} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onClose();
          void useStore.getState().saveTab(tabId, name.trim(), folder.trim());
        }}
      >
        <Well label="Name" icon="square-code" value={name} onChange={setName} autoFocus />
        <Well label="Folder" icon="folder" value={folder} onChange={setFolder} placeholder="None" list="save-folders" />
        <datalist id="save-folders">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <Actions onClose={onClose} icon={<Save {...ico} />} label="Save" disabled={!name.trim()} />
      </form>
    </Shell>
  );
}

// ---------- the write guard ----------

/** guard::Warning in words. BIG_LIMIT in Rust is 100. */
function warnText(w: Warning): ReactNode {
  if (w.kind === "updateAll")
    return (
      <>
        This <code className="stmt">UPDATE</code> has no <code className="stmt">WHERE</code>, so it changes every row of its table.
      </>
    );
  if (w.limit === null) return "Nothing limits how many rows it returns, so more than 100 can come back.";
  return (
    <>
      It can return up to <strong>{w.limit.toLocaleString()}</strong> rows{w.added ? ", the row limit Capy tacks on" : ""}, more than 100.
    </>
  );
}

/**
 * Asked before a run that writes, when the connection's level or one of its warnings says to. The badge says what kind
 * of run it is; the statements (or commands) and, for a write Capy built, the exact command share one card; warnings
 * are amber rows. Strict adds the passphrase well and Touch ID, as Lower from Strict does.
 */
export function GuardAsk({ m, onClose }: { m: Extract<Modal, { kind: "guard" }>; onClose: () => void }) {
  const [pass, setPass] = useState("");
  const [caps, setCaps] = useState(false);
  const { ask, connName: conn, write } = m;
  const verify = ask.level === "strict";
  const approve = (a: Approval) => {
    onClose();
    m.onApprove(a);
  };
  // Redis KEYS is a read: the ask says why it asks, and offers SCAN
  const keysOnly = !!ask.ops?.length && ask.ops.every((o) => o === "KEYS");
  // the connection's warnings: they ask at any security level; alone, nothing the level asks about is in the run
  const warns = ask.warnings ?? [];
  const warnOnly = warns.length > 0 && !ask.kinds.length && !ask.unreadable;
  const readOnly = warnOnly && warns.every((w) => w.kind === "bigLimit");
  const sub = write
    ? write.help
    : ask.unreadable
      ? `Capy couldn't tell what this ${ask.ops ? "command" : "SQL"} does, so it asks first.`
      : keysOnly
        ? `It reads every key in the database, and ${conn} answers no one else until it's done.`
        : readOnly
          ? "It's a read, but it can bring back a lot of rows."
          : `It changes data or structure on ${conn}.`;
  const [tone, Badge]: [AskTone | undefined, LucideIcon] = verify
    ? [undefined, Lock]
    : ask.final
      ? ["danger", Shredder]
      : write?.safe
        ? [undefined, CirclePlus]
        : write
          ? ["warn", Pencil]
          : keysOnly
            ? ["warn", Timer]
            : warnOnly
              ? ["warn", TriangleAlert]
              : ask.unreadable
                ? ["warn", CircleAlert]
                : ["warn", Shield];
  const kinds = ask.ops?.length ? ask.ops : ask.kinds;
  const RunIcon = ask.final ? Shredder : verify ? LockOpen : Play;
  return (
    <Shell title={`Run this on ${conn}?`} sub={sub} tone={tone} badge={<Badge {...ico} />} onClose={onClose}>
      {kinds.length > 0 && (
        <div className="ask-what">
          <div className="ask-kinds">
            {kinds.map((k) => (
              <code key={k} className="ask-chip">
                {k}
              </code>
            ))}
          </div>
          {/* a write Capy built: the exact command it sends */}
          {write && <pre className="ask-cmd">{write.cmd}</pre>}
        </div>
      )}
      {warns.length > 0 && (
        <>
          <ul className="auth-scope ask-warns">
            {warns.map((w) => (
              <li key={w.kind}>
                <TriangleAlert {...ico} />
                <span>{warnText(w)}</span>
              </li>
            ))}
          </ul>
          <p className="ask-off">
            <Settings2 {...ico} />
            Turn {warns.length > 1 ? "these warnings" : "this warning"} off in Settings › Connection › Security.
          </p>
        </>
      )}
      {verify && (
        <p className="auth-note">
          <Lock {...ico} />
          <span>{conn} is Strict, so it needs the passphrase.</span>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (verify) {
            if (pass) approve({ kind: "passphrase", passphrase: pass });
          } else approve({ kind: "confirm" });
        }}
        noValidate
      >
        {ask.final && <FinalLine text={`${CANT_UNDO} Capy keeps no copy of what it shreds or overwrites. Gone is gone.`} />}
        {verify && (
          <>
            <PassField id="ask-pass" label="Passphrase" value={pass} onChange={setPass} autoComplete="current-password" autoFocus invalid={!!ask.error} placeholder="Capy's passphrase" onCaps={setCaps} />
            <Caps on={caps} />
            <Err text={ask.error ?? ""} />
            {ask.touchId && (
              <>
                <div className="auth-or" aria-hidden="true">
                  <span>or</span>
                </div>
                <button type="button" className="btn auth-btn auth-touch-btn" onClick={() => approve({ kind: "touchId" })}>
                  <Fingerprint {...ico} />
                  Use Touch ID
                </button>
              </>
            )}
          </>
        )}
        {!verify && ask.error && <Err text={ask.error} />}
        {m.alt && <Alt alt={m.alt} onClose={onClose} />}
        <Actions
          onClose={onClose}
          danger={!(write?.safe && !ask.final)}
          icon={<RunIcon {...ico} />}
          label={write ? write.label : keysOnly ? "Run KEYS" : "Run"}
          autoFocus={!verify}
        />
      </form>
    </Shell>
  );
}
