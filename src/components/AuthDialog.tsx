import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { api, errText } from "../lib/api";
import { LEVELS, type Approval, type Engine, type SecurityLevel } from "../types";
import { LEVEL_ICON } from "./LevelPicker";
import {
  ArrowRight,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Info,
  KeyRound,
  ListChecks,
  LoaderCircle,
  Lock,
  LockOpen,
  ShieldCheck,
  ShieldOff,
  Timer,
  ico,
  icoC,
} from "./Icon";

/** A busy action button keeps its label and swaps its icon for a turning loader. */
const Spin = () => <LoaderCircle {...icoC("spin")} />;

/** Escape closes the topmost ask only, not the Settings or connection dialog under it. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
}

/** A short shake of the dialog on a miss, restarted each time. */
function useShake(): [RefObject<HTMLDivElement>, () => void] {
  const box = useRef<HTMLDivElement>(null);
  const shake = () => {
    const el = box.current;
    if (!el) return;
    el.classList.remove("auth-shake");
    void el.offsetWidth;
    el.classList.add("auth-shake");
  };
  return [box, shake];
}

/** A passphrase field: its key, show or hide, and Caps Lock reported to `onCaps`. */
function PassField(p: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
  invalid?: boolean;
  placeholder?: string;
  onCaps: (on: boolean) => void;
  inputRef?: RefObject<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  const own = useRef<HTMLInputElement>(null);
  const ref = p.inputRef ?? own;
  const keys = (e: React.KeyboardEvent) => p.onCaps(e.getModifierState("CapsLock"));
  return (
    <label className="auth-field" htmlFor={p.id}>
      {p.label}
      <span className="auth-input">
        <KeyRound {...ico} />
        <input
          ref={ref}
          className="field"
          id={p.id}
          type={show ? "text" : "password"}
          autoComplete={p.autoComplete}
          autoFocus={p.autoFocus}
          spellCheck={false}
          required
          aria-required="true"
          placeholder={p.placeholder}
          aria-invalid={p.invalid || undefined}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          onKeyDown={keys}
          onKeyUp={keys}
        />
        <button type="button" className="auth-eye" aria-label={show ? "Hide passphrase" : "Show passphrase"} aria-pressed={show} onClick={() => (setShow(!show), ref.current?.focus())}>
          {show ? <EyeOff {...ico} /> : <Eye {...ico} />}
        </button>
      </span>
    </label>
  );
}

function Caps({ on }: { on: boolean }) {
  return on ? (
    <p className="auth-caps">
      <ArrowUp {...ico} />
      Caps Lock is on
    </p>
  ) : null;
}

function Err({ text }: { text: string }) {
  return text ? (
    <p className="auth-err" role="alert">
      <CircleAlert {...ico} />
      <span>{text}</span>
    </p>
  ) : null;
}

function Head({ badge, icon, title, sub }: { badge?: "warn" | "danger"; icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="auth-head">
      <span className={`auth-badge${badge ? ` auth-badge--${badge}` : ""}`}>{icon}</span>
      <div className="auth-head-text">
        <h2 id="auth-t">{title}</h2>
        <p id="auth-d">{sub}</p>
      </div>
    </div>
  );
}

/**
 * The passphrase asks of a Strict connection, in one shape: a tinted badge, what is about to change, the passphrase
 * (show or hide, Caps Lock hint) and Touch ID under an "or" rule, then Abort and the action in equal halves.
 *
 * lower: leaving Strict for None or Low (the tabs bar's level picker, Settings, the connection dialog); with
 *   `defaults`, the default level for new connections (Settings › Security), where existing connections keep theirs.
 * unlock: opening What to ask about, Touch ID and the unlock window for changes (Change).
 *
 * `submit` does the work; a rejection keeps the dialog open with its reason (a wrong passphrase, Touch ID cancelled)
 * and a short shake. Success closes it.
 */
export function AuthDialog({
  kind,
  connName = "",
  engine,
  to = "none",
  defaults = false,
  touch,
  submit,
  onClose,
}: {
  kind: "lower" | "unlock";
  connName?: string;
  /** lower: the default level for new connections, not a connection */
  defaults?: boolean;
  engine?: Engine;
  /** lower: the level it goes to */
  to?: SecurityLevel;
  /** the connection allows Touch ID and this Mac has it */
  touch: boolean;
  submit: (a: Approval) => Promise<void>;
  onClose: () => void;
}) {
  const [pass, setPass] = useState("");
  const [caps, setCaps] = useState(false);
  const [err, setErr] = useState("");
  // the button that is working: the passphrase's (submit) or Touch ID's
  const [busy, setBusy] = useState<"pass" | "touch" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [box, shake] = useShake();
  useEscape(onClose);
  const lower = kind === "lower";
  // Redis has commands, MongoDB writes; the level names say statements
  const word = (s: string) => (engine === "redis" ? s.replace("statement", "command") : engine === "mongo" ? s.replace("statement", "write") : s);
  const level = (l: SecurityLevel) => LEVELS.find(([k]) => k === l)!;

  const run = async (a: Approval) => {
    if (busy) return;
    setBusy(a.kind === "touchId" ? "touch" : "pass");
    try {
      await submit(a);
      onClose();
    } catch (e) {
      setErr(errText(e));
      shake();
      input.current?.focus();
      input.current?.select();
    } finally {
      setBusy(null);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // React bubbles events through the portal to the connection dialog's form: stop here
    e.stopPropagation();
    if (!pass) {
      setErr("Enter the passphrase.");
      shake();
      return input.current?.focus();
    }
    void run({ kind: "passphrase", passphrase: pass });
  };

  const From = LEVEL_ICON.strict;
  const To = LEVEL_ICON[to];

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="dialog auth" role="dialog" aria-modal="true" aria-labelledby="auth-t" aria-describedby="auth-d">
        {lower ? (
          <Head
            badge="warn"
            icon={<LockOpen {...ico} />}
            title={defaults ? "Lower the default from Strict?" : `Lower ${connName} from Strict?`}
            sub={defaults ? "Enter the passphrase to change the level new connections start at." : "Enter the passphrase to change its security level."}
          />
        ) : (
          <Head icon={<Lock {...ico} />} title={`Unlock ${connName}'s Strict settings`} sub="Enter the passphrase to change what Strict asks about." />
        )}

        {lower ? (
          <>
            <div className="auth-shift">
              <span className="auth-level auth-level--from">
                <From {...ico} />
                <span className="auth-level-text">
                  <strong>Strict</strong>
                  <small>{word(level("strict")[2])}</small>
                </span>
              </span>
              <span className="auth-arrow" aria-label="to">
                <ArrowRight {...ico} />
              </span>
              <span className="auth-level auth-level--to">
                <To {...ico} />
                <span className="auth-level-text">
                  <strong>{level(to)[1]}</strong>
                  <small>{word(level(to)[2])}</small>
                </span>
              </span>
            </div>
            <p className="auth-note">
              {defaults
                ? `New connections will start at ${level(to)[1]}. Existing connections keep their own level.`
                : to === "low"
                  ? `Writes on ${connName} will ask to confirm, without the passphrase.`
                  : `Writes on ${connName} will run without asking.`}
            </p>
          </>
        ) : (
          <>
            <ul className="auth-scope">
              <li>
                <ListChecks {...ico} />
                <span>{engine === "redis" ? "Commands to ask about" : engine === "mongo" ? "Writes to ask about" : "Statements to ask about"}</span>
              </li>
              <li>
                <Fingerprint {...ico} />
                <span>Allow Touch ID</span>
              </li>
              <li>
                <Timer {...ico} />
                <span>Stay unlocked for</span>
              </li>
            </ul>
            <p className="auth-note">
              <Lock {...ico} />
              It locks again when you close Settings or the connection dialog.
            </p>
          </>
        )}

        <form onSubmit={onSubmit} noValidate>
          <PassField
            id="auth-pass"
            label="Passphrase"
            value={pass}
            onChange={(v) => (setPass(v), setErr(""))}
            autoComplete="current-password"
            autoFocus
            invalid={!!err}
            placeholder="The app passphrase"
            onCaps={setCaps}
            inputRef={input}
          />
          <Caps on={caps} />
          <Err text={err} />
          {touch && (
            <div className="auth-touch">
              <div className="auth-or" aria-hidden="true">
                <span>or</span>
              </div>
              <button type="button" className="btn auth-btn auth-touch-btn" disabled={!!busy} aria-busy={busy === "touch" || undefined} onClick={() => void run({ kind: "touchId" })}>
                {busy === "touch" ? <Spin /> : <Fingerprint {...ico} />}
                Use Touch ID
              </button>
            </div>
          )}
          <footer className="auth-actions">
            <button type="button" className="btn auth-btn" onClick={onClose}>
              Abort
            </button>
            <button type="submit" className={`btn auth-btn ${lower ? "auth-btn--danger" : "auth-btn--primary"}`} disabled={!!busy} aria-busy={busy === "pass" || undefined}>
              {busy === "pass" ? <Spin /> : <LockOpen {...ico} />}
              {lower ? `Lower to ${level(to)[1]}` : "Unlock"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export type PassKind = "new" | "change" | "disable" | "reset";

/** The app passphrase's own dialogs, each: badge, line under the title, what it does, its fields, the action. */
const PASS: Record<
  PassKind,
  {
    title: string;
    sub: string;
    badge?: "warn" | "danger";
    icon: ReactNode;
    primary: string;
    danger?: boolean;
    fields: [string, string][];
    effects?: ["off" | "keep", ReactNode, string, string][];
    note: [ReactNode, string];
  }
> = {
  new: {
    title: "Set passphrase",
    sub: "One passphrase for the whole app. Strict connections ask for it.",
    icon: <KeyRound {...ico} />,
    primary: "Set passphrase",
    fields: [
      ["Passphrase", "new-password"],
      ["Type it again", "new-password"],
    ],
    note: [<Info {...ico} key="i" />, "It cannot be shown again. If you forget it, reset it with Touch ID or your login password."],
  },
  change: {
    title: "Change passphrase",
    sub: "Enter the current one, then the new one twice.",
    icon: <KeyRound {...ico} />,
    primary: "Change passphrase",
    fields: [
      ["Current passphrase", "current-password"],
      ["New passphrase", "new-password"],
      ["Type it again", "new-password"],
    ],
    note: [<ShieldCheck {...ico} key="s" />, "Connections keep their protection; the new passphrase opens them."],
  },
  reset: {
    title: "Reset passphrase",
    sub: "The old passphrase can only be replaced.",
    badge: "warn",
    icon: <KeyRound {...ico} />,
    primary: "Reset passphrase",
    fields: [
      ["New passphrase", "new-password"],
      ["Type it again", "new-password"],
    ],
    note: [<Fingerprint {...ico} key="f" />, "macOS asks for Touch ID or your login password first. Connections keep their protection."],
  },
  disable: {
    title: "Disable passphrase",
    sub: "Enter the current passphrase to turn it off for the whole app.",
    badge: "danger",
    icon: <ShieldOff {...ico} />,
    primary: "Disable passphrase",
    danger: true,
    fields: [["Current passphrase", "current-password"]],
    effects: [
      ["off", <LockOpen {...ico} key="l" />, "Strict connections", "ask to confirm, as Low does"],
      ["off", <Fingerprint {...ico} key="f" />, "Allow Touch ID", "turns off on every connection"],
      ["keep", <ShieldCheck {...ico} key="s" />, "Security levels and warnings", "stay as they are"],
    ],
    note: [<KeyRound {...ico} key="k" />, "You can set a new one any time, here in Security."],
  },
};

/**
 * Set, change, reset or disable the app passphrase (Settings › Security), in the passphrase asks' shape. A new
 * passphrase typed twice says whether the two match as the second is typed.
 */
export function PassphraseDialog({ kind, onClose, onDone }: { kind: PassKind; onClose: () => void; onDone: (k: PassKind) => void }) {
  const d = PASS[kind];
  const [vals, setVals] = useState<string[]>(d.fields.map(() => ""));
  const [bad, setBad] = useState<number[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [caps, setCaps] = useState(false);
  const [box, shake] = useShake();
  useEscape(onClose);
  // a new passphrase and its repeat: the last two fields
  const pair = kind !== "disable";
  const [a, b] = [vals[vals.length - 2], vals[vals.length - 1]];

  const fail = (msg: string, fields: number[]) => {
    setBad(fields);
    setErr(msg);
    shake();
    (document.getElementById(`pass-${fields[0]}`) as HTMLInputElement | null)?.focus();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // React bubbles events through the portal to the connection dialog's form: stop here
    e.stopPropagation();
    const empty = vals.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (empty.length) return fail(kind === "disable" ? "Enter the passphrase." : "Fill in every field.", empty);
    if (pair && a !== b) return fail("The two passphrases differ.", [vals.length - 1]);
    setBusy(true);
    try {
      if (kind === "new") await api.setPassphrase(vals[0]);
      else if (kind === "change") await api.setPassphrase(vals[1], vals[0]);
      else if (kind === "reset") await api.resetPassphrase(vals[0]);
      else await api.disablePassphrase(vals[0]);
      onDone(kind);
    } catch (x) {
      fail(errText(x), [0]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backdrop sub-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="dialog auth" role="dialog" aria-modal="true" aria-labelledby="auth-t" aria-describedby="auth-d">
        <Head badge={d.badge} icon={d.icon} title={d.title} sub={d.sub} />
        {d.effects && (
          <ul className="auth-scope auth-effects">
            {d.effects.map(([k, icon, strong, rest]) => (
              <li key={strong} className={`auth-effect--${k}`}>
                {icon}
                <span>
                  <strong>{strong}</strong> {rest}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="auth-note">
          {d.note[0]}
          <span>{d.note[1]}</span>
        </p>
        <form onSubmit={submit} noValidate>
          {d.fields.map(([label, auto], i) => (
            <PassField
              key={label}
              id={`pass-${i}`}
              label={label}
              value={vals[i]}
              onChange={(v) => {
                setVals(vals.map((x, j) => (j === i ? v : x)));
                setErr("");
                setBad([]);
              }}
              autoComplete={auto}
              autoFocus={i === 0}
              invalid={bad.includes(i)}
              onCaps={setCaps}
            />
          ))}
          {pair && b && (
            <p className={`auth-match ${a === b ? "auth-match--ok" : "auth-match--bad"}`}>
              {a === b ? <CircleCheck {...ico} /> : <CircleAlert {...ico} />}
              {a === b ? "They match" : "They differ"}
            </p>
          )}
          <Caps on={caps} />
          <Err text={err} />
          <footer className="auth-actions">
            <button type="button" className="btn auth-btn" onClick={onClose}>
              Abort
            </button>
            <button type="submit" className={`btn auth-btn ${d.danger ? "auth-btn--danger" : "auth-btn--primary"}`} aria-busy={busy || undefined} disabled={busy}>
              {busy ? <Spin /> : d.icon}
              {d.primary}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
