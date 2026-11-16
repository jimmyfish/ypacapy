import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useStore, type Modal, type SettingsSection } from "../store";
import { api, errText } from "../lib/api";
import { highlightInline } from "../lib/sql";
import { systemFonts } from "../lib/fonts";
import { BUILTIN, DEFAULT_SCHEME, FAMILIES, SCHEMES, schemeSwatch, type BuiltinId } from "../lib/themes";
import { STATEMENTS, type Approval, type Conn, type Engine, type Settings } from "../types";
import { Select } from "./Select";
import { CircleAlert, CircleCheck, Fingerprint, FolderOpen, KeyRound, Lock, LockOpen, ShieldCheck, Terminal, Type, ico } from "./Icon";

export function Modals() {
  const modal = useStore((s) => s.modal);
  const close = () => useStore.getState().openModal(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!modal) return null;
  switch (modal.kind) {
    case "confirm":
      return (
        <Shell title={modal.title} onClose={close}>
          <p>{modal.message}</p>
          <footer>
            <button type="button" className="btn" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger" autoFocus onClick={() => (close(), modal.onConfirm())}>
              {modal.confirmLabel ?? "Delete"}
            </button>
          </footer>
        </Shell>
      );
    case "prompt":
      return <PromptModal m={modal} onClose={close} />;
    case "saveQuery":
      return <SaveQueryModal tabId={modal.tabId} onClose={close} />;
    case "connect":
      return <ConnectModal conn={modal.conn} onClose={close} />;
    case "settings":
      return <SettingsModal section={modal.section} onClose={close} />;
    case "guard":
      return <GuardModal m={modal} onClose={close} />;
    case "lowerGuard":
      return <LowerGuardModal m={modal} onClose={close} />;
  }
}

function Shell({ title, onClose, children, wide, style }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} style={style}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PromptModal({ m, onClose }: { m: Extract<Modal, { kind: "prompt" }>; onClose: () => void }) {
  const [v, setV] = useState(m.initial);
  return (
    <Shell title={m.title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onClose();
          m.onSubmit(v.trim());
        }}
      >
        <label>
          {m.label}
          <input className="field" autoFocus value={v} onFocus={(e) => e.target.select()} onChange={(e) => setV(e.target.value)} />
        </label>
        <footer>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            OK
          </button>
        </footer>
      </form>
    </Shell>
  );
}

function SaveQueryModal({ tabId, onClose }: { tabId: string; onClose: () => void }) {
  const saved = useStore((s) => s.saved);
  const tab = useStore((s) => Object.values(s.sessions).flatMap((x) => x.tabs).find((t) => t.id === tabId));
  const [name, setName] = useState(tab?.kind === "query" ? tab.title : "");
  const [folder, setFolder] = useState(tab?.kind === "query" ? (tab.savedFolder ?? "") : "");
  const folders = [...new Set(saved.map((s) => s.folder).filter(Boolean))].sort();
  return (
    <Shell title="Save query" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onClose();
          void useStore.getState().saveTab(tabId, name.trim(), folder.trim());
        }}
      >
        <label>
          Name
          <input className="field" autoFocus value={name} onFocus={(e) => e.target.select()} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Folder
          <input className="field" list="save-folders" placeholder="None" value={folder} onChange={(e) => setFolder(e.target.value)} />
          <datalist id="save-folders">
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <p className="help">Kept in ~/.config/ypacapy/ypacapy.db</p>
        <footer>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Save
          </button>
        </footer>
      </form>
    </Shell>
  );
}

// ---------- the write guard ----------

function GuardModal({ m, onClose }: { m: Extract<Modal, { kind: "guard" }>; onClose: () => void }) {
  const [pass, setPass] = useState("");
  const verify = m.ask.level === "verify";
  const approve = (a: Approval) => {
    onClose();
    m.onApprove(a);
  };
  return (
    <Shell title={verify ? "Enter the passphrase to run this" : "Run this on " + m.connName + "?"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (verify) {
            if (pass) approve({ kind: "passphrase", passphrase: pass });
          } else approve({ kind: "confirm" });
        }}
      >
        <p className="help">{m.ask.unreadable ? "ypacapy could not read what this SQL does, so it asks first." : `It changes data or structure on ${m.connName}:`}</p>
        {m.ask.kinds.length > 0 && (
          <div className="guard-kinds">
            {m.ask.kinds.map((k) => (
              <code key={k} className="stmt">
                {k}
              </code>
            ))}
          </div>
        )}
        {verify && (
          <label>
            Passphrase
            <input className="field" type="password" autoFocus autoComplete="current-password" aria-invalid={m.ask.error ? true : undefined} value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
        )}
        {m.ask.error && (
          <p className="help err" role="alert">
            {m.ask.error}
          </p>
        )}
        <footer>
          {verify && m.ask.touchId && (
            <button type="button" className="btn" onClick={() => approve({ kind: "touchId" })}>
              <Fingerprint {...ico} />
              Use Touch ID
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--danger" autoFocus={!verify}>
            Run
          </button>
        </footer>
      </form>
    </Shell>
  );
}

function LowerGuardModal({ m, onClose }: { m: Extract<Modal, { kind: "lowerGuard" }>; onClose: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const touch = useStore((s) => s.settings.touchId === true && s.pass.touchIdAvailable);
  const go = async (touchId: boolean) => {
    try {
      await api.setGuard(m.connId, m.level, touchId ? undefined : pass, touchId);
      await useStore.getState().refreshConns();
      onClose();
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <Shell title="Lower the write guard" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pass) void go(false);
        }}
      >
        <label>
          Passphrase
          <input className="field" type="password" autoFocus autoComplete="current-password" aria-invalid={err ? true : undefined} value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        <p className="help err" role="alert">
          {err}
        </p>
        <footer>
          {touch && (
            <button type="button" className="btn" onClick={() => void go(true)}>
              <Fingerprint {...ico} />
              Use Touch ID
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Lower it
          </button>
        </footer>
      </form>
    </Shell>
  );
}

// ---------- New connection ----------

const PORTS: Record<Engine, number | undefined> = { postgres: 5432, mysql: 3306, sqlite: undefined };

function ConnectModal({ conn, onClose }: { conn?: Conn; onClose: () => void }) {
  const conns = useStore((s) => s.conns);
  const [engine, setEngine] = useState<Engine>(conn?.engine ?? "postgres");
  const [name, setName] = useState(conn?.name ?? "");
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState(conn?.file ?? "");
  const [host, setHost] = useState(conn?.host ?? "localhost");
  const [port, setPort] = useState(String(conn?.port ?? PORTS[conn?.engine ?? "postgres"]));
  const [database, setDatabase] = useState(conn?.database ?? "");
  const [user, setUser] = useState(conn?.user ?? "");
  const [password, setPassword] = useState("");
  const [line, setLine] = useState<{ kind: "testing" | "ok" | "fail"; text: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameBad = touched && !name.trim();
  const lite = engine === "sqlite";

  const pickEngine = (e: Engine) => {
    setEngine(e);
    if (e !== "sqlite" && (!port || Object.values(PORTS).includes(Number(port)))) setPort(String(PORTS[e]));
    setLine(null);
  };

  const build = (): Conn => ({
    id: conn?.id ?? "",
    name: name.trim(),
    engine,
    color: conn?.color ?? (conns.length % 6) + 1,
    guard: conn?.guard ?? "confirm",
    ...(lite
      ? { file: file.trim() }
      : { host: host.trim() || "localhost", port: Number(port) || PORTS[engine], database: database.trim() || undefined, user: user.trim() || undefined }),
  });

  const chooseFile = async () => {
    const f = await openDialog({ multiple: false, directory: false, title: "Choose an SQLite database" }).catch(() => null);
    if (typeof f === "string") {
      setFile(f);
      if (!name.trim()) setName(f.split("/").pop() ?? "");
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const action = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "save";
    setTouched(true);
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    const c = build();
    if (action === "test") {
      setLine({ kind: "testing", text: lite ? `Opening ${file}` : `Connecting to ${c.host}:${c.port}` });
      try {
        const r = await api.testConnection(c, password || null);
        setLine({ kind: "ok", text: `Connected to ${r.server} in ${r.ms} ms` });
      } catch (err) {
        setLine({ kind: "fail", text: errText(err) });
      }
      return;
    }
    try {
      // a new connection without a password stores none; an edit keeps the keychain's when the field is empty
      const saved = await api.saveConnection(c, lite ? null : password ? password : conn ? null : "");
      const st = useStore.getState();
      await st.refreshConns();
      onClose();
      if (!conn) void st.openConn(saved.id);
      else if (st.sessions[saved.id]) void st.reconnect(saved.id);
    } catch (err) {
      setLine({ kind: "fail", text: errText(err) });
    }
  };

  return (
    <Shell title={conn ? "Edit connection" : "New connection"} onClose={onClose} style={{ width: 520 }}>
      <form onSubmit={submit} noValidate>
        <label>
          Engine
          <Select className="field" value={engine} onChange={(e) => pickEngine(e.target.value as Engine)}>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL / MariaDB</option>
            <option value="sqlite">SQLite</option>
          </Select>
        </label>
        <label>
          Name
          <input
            ref={nameRef}
            className="field"
            required
            aria-required="true"
            aria-invalid={nameBad}
            aria-describedby="c-name-h"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={name}
            onBlur={() => name && setTouched(true)}
            onChange={(e) => setName(e.target.value)}
          />
          <span className={`help${nameBad ? " err" : ""}`} id="c-name-h">
            {nameBad ? "Give the connection a name so you can find it again" : ""}
          </span>
        </label>
        {lite ? (
          <div>
            <label htmlFor="c-file">Database file</label>
            <div className="with-btn">
              <input className="field mono" id="c-file" placeholder="~/data/analytics.sqlite" autoComplete="off" spellCheck={false} aria-describedby="c-file-h" value={file} onChange={(e) => setFile(e.target.value)} />
              <button type="button" className="btn" onClick={chooseFile}>
                <FolderOpen {...ico} />
                Choose
              </button>
            </div>
            <span className="help" id="c-file-h">
              Opened in place, never copied
            </span>
          </div>
        ) : (
          <div>
            <div className="pair">
              <label>
                Host
                <input className="field mono" autoComplete="off" spellCheck={false} value={host} onChange={(e) => setHost(e.target.value)} />
              </label>
              <label>
                Port
                <input className="field mono" inputMode="numeric" autoComplete="off" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
            <div className="pair pair--even">
              <label>
                Database
                <input className="field mono" autoComplete="off" spellCheck={false} value={database} onChange={(e) => setDatabase(e.target.value)} />
              </label>
              <label>
                User
                <input className="field mono" autoComplete="username" spellCheck={false} value={user} onChange={(e) => setUser(e.target.value)} />
              </label>
            </div>
            <label>
              Password
              <input className="field" type="password" autoComplete="current-password" aria-describedby="c-pass-h" placeholder={conn ? "Unchanged" : ""} value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="help" id="c-pass-h">
                <KeyRound {...ico} />
                Kept in the macOS login keychain on this Mac only
              </span>
            </label>
          </div>
        )}
        {line && (
          <p className={`test-line${line.kind === "ok" ? " ok" : line.kind === "fail" ? " fail" : ""}`} role="status">
            {line.kind === "testing" ? <span className="spinner" /> : line.kind === "ok" ? <CircleCheck {...ico} /> : <CircleAlert {...ico} />}
            {line.text}
          </p>
        )}
        <footer>
          <button type="submit" className="btn" value="test" aria-busy={line?.kind === "testing" || undefined} disabled={line?.kind === "testing"}>
            Test
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" value="save">
            Save
          </button>
        </footer>
      </form>
    </Shell>
  );
}

// ---------- Settings ----------

const UI_FONTS = ["SF Pro", "Helvetica Neue", "Avenir Next", "Inter", "Georgia"];
const MONO_FONTS = ["SF Mono", "Menlo", "Monaco", "Courier New", "JetBrains Mono"];

function SettingsModal({ section: initial, onClose }: { section?: SettingsSection; onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>(initial ?? "appearance");
  // What to protect stays open for changes only while Settings is open
  useEffect(() => () => void api.lockProtect().catch(() => {}), []);
  const items: [SettingsSection, string, ReactNode][] = [
    ["appearance", "Appearance", <Type {...ico} key="a" />],
    ["queries", "Queries", <Terminal {...ico} key="q" />],
    ["security", "Security", <ShieldCheck {...ico} key="s" />],
    ["data", "Data on this Mac", <Lock {...ico} key="d" />],
  ];
  return (
    <Shell title="Settings" onClose={onClose} wide>
      <div className="vars settings">
        <ul>
          {items.map(([k, label, icon]) => (
            <li key={k}>
              <button type="button" aria-current={section === k} onClick={() => setSection(k)}>
                {icon}
                {label}
              </button>
            </li>
          ))}
        </ul>
        {section === "appearance" ? <AppearancePane /> : section === "queries" ? <QueriesPane /> : section === "security" ? <SecurityPane /> : <DataPane />}
      </div>
    </Shell>
  );
}

function SetItem({ label, desc, htmlFor, children, sub }: { label: ReactNode; desc?: string; htmlFor?: string; children: ReactNode; sub?: boolean }) {
  return (
    <div className={`set-item${sub ? " set-item--sub" : ""}`}>
      <div className="set-text">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span className="set-label">{label}</span>}
        {desc && <span className="desc">{desc}</span>}
      </div>
      <div className="set-ctl">{children}</div>
    </div>
  );
}

function SchemeRow(p: { id: string; label: string; value: string; onChange: (id: string) => void }) {
  const [bg, ...dots] = schemeSwatch(p.value);
  return (
    <SetItem label={p.label} htmlFor={p.id}>
      <span className="scheme-dots" aria-hidden="true" style={{ background: bg }}>
        {dots.map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </span>
      <Select id={p.id} className="field set-scheme" value={p.value} onChange={(e) => p.onChange(e.target.value)}>
        <optgroup label="ypacapy">
          {(Object.keys(BUILTIN) as BuiltinId[]).map((id) => (
            <option key={id} value={id}>
              {BUILTIN[id].name}
            </option>
          ))}
        </optgroup>
        {FAMILIES.map((f) => (
          <optgroup key={f} label={f}>
            {SCHEMES.filter((s) => s.family === f).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </SetItem>
  );
}

function FontRow(p: { id: string; label: string; placeholder: string; fonts: string[]; font?: string; size: number; sizes: number[]; onFont: (v: string | undefined) => void; onSize: (n: number) => void }) {
  return (
    <SetItem label={p.label} htmlFor={p.id}>
      <input
        id={p.id}
        className="field set-font"
        list={`${p.id}-list`}
        placeholder={p.placeholder}
        spellCheck={false}
        value={p.font ?? ""}
        onChange={(e) => p.onFont(e.target.value.trim() ? e.target.value : undefined)}
      />
      <datalist id={`${p.id}-list`}>
        {p.fonts.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <Select className="field set-size" aria-label={`${p.label} size`} value={p.size} onChange={(e) => p.onSize(Number(e.target.value))}>
        {p.sizes.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
    </SetItem>
  );
}

function AppearancePane() {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  const theme = settings.theme ?? "auto";
  const [fonts, setFonts] = useState({ all: UI_FONTS, mono: MONO_FONTS });
  useEffect(() => {
    let live = true;
    void systemFonts().then((f) => {
      if (live && f.all.length) setFonts({ all: f.all, mono: f.mono.length ? f.mono : MONO_FONTS });
    });
    return () => {
      live = false;
    };
  }, []);
  const size = (def: number, key: keyof Settings) => (n: number) => void set({ [key]: n === def ? undefined : n });
  return (
    <div className="set-pane">
      <h3>Appearance</h3>
      <div className="set-list">
        <SetItem label="Theme">
          <div className="seg seg--lg" role="group" aria-label="Theme">
            {(["auto", "light", "dark"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => void set({ theme: t === "auto" ? undefined : t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </SetItem>
        {theme === "auto" ? (
          <>
            <SchemeRow id="set-scheme-light" label="Light theme" value={settings.lightScheme ?? DEFAULT_SCHEME.light} onChange={(lightScheme) => void set({ lightScheme })} />
            <SchemeRow id="set-scheme-dark" label="Dark theme" value={settings.darkScheme ?? DEFAULT_SCHEME.dark} onChange={(darkScheme) => void set({ darkScheme })} />
          </>
        ) : (
          <SchemeRow
            id="set-scheme"
            label="Colour scheme"
            value={(theme === "dark" ? settings.darkScheme : settings.lightScheme) ?? DEFAULT_SCHEME[theme]}
            onChange={(v) => void set(theme === "dark" ? { darkScheme: v } : { lightScheme: v })}
          />
        )}
        <SetItem label="Compact mode" htmlFor="set-compact">
          <input id="set-compact" className="switch" type="checkbox" role="switch" checked={settings.compact === true} onChange={(e) => void set({ compact: e.target.checked || undefined })} />
        </SetItem>
        <FontRow id="set-ui-font" label="Interface font" placeholder="System default" fonts={fonts.all} font={settings.fontUi} size={settings.fontSizeUi ?? 14} sizes={[12, 13, 14, 15, 16]} onFont={(fontUi) => void set({ fontUi })} onSize={size(14, "fontSizeUi")} />
        <FontRow id="set-table-font" label="Table font" placeholder="System monospace" fonts={fonts.all} font={settings.fontTable} size={settings.fontSizeTable ?? 13} sizes={[11, 12, 13, 14, 15, 16]} onFont={(fontTable) => void set({ fontTable })} onSize={size(13, "fontSizeTable")} />
        <FontRow id="set-console-font" label="Query console font" placeholder="System monospace" fonts={fonts.mono} font={settings.fontMono} size={settings.fontSizeCode ?? 13} sizes={[11, 12, 13, 14, 15, 16, 18]} onFont={(fontMono) => void set({ fontMono })} onSize={size(13, "fontSizeCode")} />
        <div className="set-sample" aria-label="Sample">
          <span className="set-sample-ui">
            Refunds by customer <span className="muted">Saved queries / Reports</span>
          </span>
          <code dangerouslySetInnerHTML={{ __html: highlightInline("select c.email, count(*) from orders") }} />
          <code style={{ fontFamily: "var(--font-table)", fontSize: "var(--text-table)" }}>10482   4,820.00   2026-11-14 09:41:07+07</code>
        </div>
      </div>
      <button
        type="button"
        className="link set-reset"
        onClick={() =>
          void set({ theme: undefined, lightScheme: undefined, darkScheme: undefined, compact: undefined, fontUi: undefined, fontTable: undefined, fontMono: undefined, fontSizeUi: undefined, fontSizeTable: undefined, fontSizeCode: undefined })
        }
      >
        Reset to defaults
      </button>
    </div>
  );
}

/** A number field with its unit; written to settings when it holds a whole number in range. */
function UnitField({ id, value, unit, min, max, onChange }: { id: string; value: number; unit: string; min: number; max: number; onChange: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <span className="unit-field">
      <input
        id={id}
        className="field"
        inputMode="numeric"
        value={v}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "");
          setV(t);
          const n = Number(t);
          if (t && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => setV(String(value))}
      />
      <span className="unit">{unit}</span>
    </span>
  );
}

function QueriesPane() {
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  return (
    <div className="set-pane">
      <h3>Queries</h3>
      <div className="set-list">
        <SetItem label="Row limit" desc="Added to a select that has no limit of its own" htmlFor="set-limit">
          <UnitField id="set-limit" value={s.rowLimit ?? 500} unit="rows" min={1} max={100000} onChange={(n) => void set({ rowLimit: n === 500 ? undefined : n })} />
        </SetItem>
        <SetItem label="Statement timeout" htmlFor="set-timeout" desc="0 lets a statement run as long as it takes">
          <UnitField id="set-timeout" value={s.statementTimeout ?? 30} unit="s" min={0} max={86400} onChange={(n) => void set({ statementTimeout: n === 30 ? undefined : n })} />
        </SetItem>
        <SetItem label="Open new connections read-only" htmlFor="set-ro">
          <input id="set-ro" className="switch" type="checkbox" role="switch" checked={s.readOnly === true} onChange={(e) => void set({ readOnly: e.target.checked || undefined })} />
        </SetItem>
        <SetItem label="Keep query history" htmlFor="set-hist">
          <input id="set-hist" className="switch" type="checkbox" role="switch" checked={s.keepHistory !== false} onChange={(e) => void set({ keepHistory: e.target.checked ? undefined : false })} />
        </SetItem>
        <SetItem label="Connection heartbeat" desc="Sends select 1 on every open connection, for servers that drop idle ones" htmlFor="set-beat">
          <input id="set-beat" className="switch" type="checkbox" role="switch" checked={s.heartbeat === true} onChange={(e) => void set({ heartbeat: e.target.checked || undefined })} />
        </SetItem>
        {s.heartbeat && (
          <SetItem label="Every" desc="Below the server idle timeout" htmlFor="set-beat-every" sub>
            <UnitField id="set-beat-every" value={s.heartbeatEvery ?? 30} unit="s" min={5} max={3600} onChange={(n) => void set({ heartbeatEvery: n === 30 ? undefined : n })} />
          </SetItem>
        )}
      </div>
    </div>
  );
}

type SubKind = "unlock" | "new" | "change" | "disable";

function SecurityPane() {
  const s = useStore((st) => st.settings);
  const pass = useStore((st) => st.pass);
  const set = useStore((st) => st.setSettings);
  const [sub, setSub] = useState<SubKind | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const protect = s.protect ?? STATEMENTS.map(([k]) => k);
  const refreshPass = async () => useStore.setState({ pass: await api.passphraseStatus() });

  return (
    <div className="set-pane">
      <h3>Security</h3>
      <p className="pane-note">Each connection sets its own write guard in the tabs bar.</p>
      <div className="set-list">
        <div className="set-item">
          <div className="set-text">
            <span className="set-label">Passphrase</span>
            <span className="desc">{pass.set ? "Set, in the macOS keychain" : "Not set"}</span>
          </div>
          {pass.set ? (
            <div className="set-ctl" data-pass="set">
              <button type="button" className="btn" onClick={() => setSub("change")}>
                Change passphrase
              </button>
              <button type="button" className="btn btn--danger" onClick={() => setSub("disable")}>
                Disable passphrase
              </button>
            </div>
          ) : (
            <div className="set-ctl" data-pass="none">
              <button type="button" className="btn" onClick={() => setSub("new")}>
                Set passphrase
              </button>
            </div>
          )}
        </div>
        {pass.set && (
          <>
            <SetItem label="Open with Touch ID" htmlFor="sec-touch" sub desc={pass.touchIdAvailable ? undefined : "This Mac has no Touch ID ready"}>
              <input id="sec-touch" className="switch" type="checkbox" role="switch" disabled={!pass.touchIdAvailable} checked={s.touchId === true} onChange={(e) => void set({ touchId: e.target.checked || undefined })} />
            </SetItem>
            <SetItem label="Stay unlocked for" htmlFor="sec-window" sub>
              <Select id="sec-window" className="field set-choice" value={String(s.unlockWindow ?? 0)} onChange={(e) => void set({ unlockWindow: Number(e.target.value) || undefined })}>
                <option value="0">Ask every time</option>
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
                <option value="900">15 minutes</option>
              </Select>
            </SetItem>
          </>
        )}
      </div>
      {pass.set && (
        <>
          <div className="protect-head">
            <h3>What to protect</h3>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                if (unlocked) {
                  setUnlocked(false);
                  void api.lockProtect();
                } else setSub("unlock");
              }}
            >
              {unlocked ? <LockOpen {...ico} /> : <Lock {...ico} />}
              <span>{unlocked ? "Lock" : "Change"}</span>
            </button>
          </div>
          <div className="set-list stmts">
            {STATEMENTS.map(([k, tag], i) => (
              <SetItem
                key={k}
                htmlFor={`prot-${i}`}
                label={
                  <>
                    <code className="stmt">{k}</code>
                    {tag && <> <span className="tag">{tag}</span></>}
                  </>
                }
              >
                <input
                  id={`prot-${i}`}
                  className="switch"
                  type="checkbox"
                  role="switch"
                  disabled={!unlocked}
                  checked={protect.includes(k)}
                  onChange={(e) => {
                    const next = STATEMENTS.map(([x]) => x).filter((x) => (x === k ? e.target.checked : protect.includes(x)));
                    void set({ protect: next.length === STATEMENTS.length ? undefined : next });
                  }}
                />
              </SetItem>
            ))}
          </div>
        </>
      )}
      {sub && (
        <PassDialog
          kind={sub}
          touch={sub === "unlock" && s.touchId === true && pass.touchIdAvailable}
          onClose={() => setSub(null)}
          onDone={async (k) => {
            setSub(null);
            if (k === "unlock") setUnlocked(true);
            if (k === "disable") {
              setUnlocked(false);
              await set({ touchId: undefined });
              await useStore.getState().refreshConns();
            }
            await refreshPass();
          }}
        />
      )}
    </div>
  );
}

const SUB: Record<SubKind, { title: string; primary: string; fields: [string, string][]; help?: string; danger?: boolean }> = {
  unlock: { title: "Change what to protect", primary: "Open for changes", fields: [["Passphrase", "current-password"]] },
  new: { title: "Set passphrase", primary: "Set passphrase", fields: [["Passphrase", "new-password"], ["Type it again", "new-password"]], help: "It cannot be recovered." },
  change: { title: "Change passphrase", primary: "Change passphrase", fields: [["Current passphrase", "current-password"], ["New passphrase", "new-password"], ["Type it again", "new-password"]] },
  disable: {
    title: "Disable passphrase",
    primary: "Disable passphrase",
    fields: [["Current passphrase", "current-password"]],
    help: "Connections set to Ask for passphrase fall back to Ask to confirm, and Open with Touch ID turns off.",
    danger: true,
  },
};

/** Set, change or disable the passphrase, or open What to protect: a dialog over Settings. */
function PassDialog({ kind, touch, onClose, onDone }: { kind: SubKind; touch: boolean; onClose: () => void; onDone: (k: SubKind) => void }) {
  const d = SUB[kind];
  const [vals, setVals] = useState<string[]>(d.fields.map(() => ""));
  const [bad, setBad] = useState<number[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Escape closes this dialog, not Settings under it
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const empty = vals.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (empty.length) {
      setBad(empty);
      setErr("Fill in every field.");
      return;
    }
    if ((kind === "new" || kind === "change") && vals[vals.length - 1] !== vals[vals.length - 2]) {
      setBad([vals.length - 1]);
      setErr("The two passphrases differ.");
      return;
    }
    setBusy(true);
    try {
      if (kind === "unlock") await api.unlockProtect(vals[0], false);
      else if (kind === "new") await api.setPassphrase(vals[0]);
      else if (kind === "change") await api.setPassphrase(vals[1], vals[0]);
      else await api.disablePassphrase(vals[0]);
      onDone(kind);
    } catch (x) {
      setErr(errText(x));
      setBad([0]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backdrop sub-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={d.title}>
        <h2>{d.title}</h2>
        <form onSubmit={submit} noValidate>
          {d.fields.map(([label, auto], i) => (
            <label key={label}>
              {label}
              <input
                className="field"
                type="password"
                autoComplete={auto}
                required
                aria-required="true"
                autoFocus={i === 0}
                aria-invalid={bad.includes(i) || undefined}
                value={vals[i]}
                onChange={(e) => setVals(vals.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </label>
          ))}
          {d.help && <p className="help">{d.help}</p>}
          <p className="help err" role="alert">
            {err}
          </p>
          <footer>
            {touch && (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  try {
                    await api.unlockProtect(undefined, true);
                    onDone(kind);
                  } catch (x) {
                    setErr(errText(x));
                  }
                }}
              >
                <Fingerprint {...ico} />
                Use Touch ID
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`btn ${d.danger ? "btn--danger" : "btn--primary"}`} aria-busy={busy || undefined} disabled={busy}>
              {d.primary}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function DataPane() {
  const [dir, setDir] = useState("");
  useEffect(() => {
    void api.configPath().then(setDir, () => {});
  }, []);
  const show = (p: string) => <span className="set-path">{p}</span>;
  return (
    <div className="set-pane">
      <h3>Data on this Mac</h3>
      <div className="set-list">
        <SetItem label="Settings">{show("~/.config/ypacapy/settings.toml")}</SetItem>
        <SetItem label="Connections" desc="No passwords">
          {show("~/.config/ypacapy/connections.toml")}
        </SetItem>
        <SetItem label="History and saved queries">{show("~/.config/ypacapy/ypacapy.db")}</SetItem>
        <SetItem label="Passwords" desc="Never synced to iCloud">
          macOS login keychain
        </SetItem>
        <SetItem label="Network">Only the databases you add</SetItem>
      </div>
      <button type="button" className="btn" disabled={!dir} onClick={() => void revealItemInDir(dir).catch((e) => useStore.getState().showToast(errText(e)))}>
        <FolderOpen {...ico} />
        Show in Finder
      </button>
    </div>
  );
}
