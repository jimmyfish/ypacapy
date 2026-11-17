import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { DEFAULT_ROW_LIMIT, useStore, type Modal, type SettingsSection } from "../store";
import { api, errText } from "../lib/api";
import { highlightInline } from "../lib/sql";
import { systemFonts } from "../lib/fonts";
import { BUILTIN, DEFAULT_SCHEME, FAMILIES, SCHEMES, schemeSwatch, type BuiltinId } from "../lib/themes";
import { DEFAULT_LEVEL, LEVELS, STATEMENTS, type Approval, type Conn, type Engine, type SecurityLevel, type Settings, type SslMode } from "../types";
import { Select } from "./Select";
import { ColorPicker, EnginePicker } from "./Picker";
import { when } from "../lib/time";
import { CONN_COLOR_COUNT } from "../lib/connColors";
import { CircleAlert, CircleCheck, Fingerprint, FolderOpen, KeyRound, Lock, LockOpen, PlugZap, ShieldCheck, Terminal, Type, ico } from "./Icon";

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
      return <ConnectModal conn={modal.conn} group={modal.group} onClose={close} />;
    case "settings":
      return <SettingsModal section={modal.section} onClose={close} />;
    case "guard":
      return <GuardModal m={modal} onClose={close} />;
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
  const verify = m.ask.level === "strict";
  const approve = (a: Approval) => {
    onClose();
    m.onApprove(a);
  };
  return (
    <Shell title={m.title ?? (verify ? "Enter the passphrase to run this" : "Run this on " + m.connName + "?")} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (verify) {
            if (pass) approve({ kind: "passphrase", passphrase: pass });
          } else approve({ kind: "confirm" });
        }}
      >
        <p className="help">{m.message ?? (m.ask.unreadable ? "ypacapy could not read what this SQL does, so it asks first." : `It changes data or structure on ${m.connName}:`)}</p>
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
            {m.title ? "Lower it" : "Run"}
          </button>
        </footer>
      </form>
    </Shell>
  );
}

// ---------- New connection ----------

const PORTS: Record<Engine, number | undefined> = { postgres: 5432, mysql: 3306, sqlite: undefined };
const SSL_MODES: [SslMode, string][] = [["disable", "Disable"], ["prefer", "Prefer"], ["require", "Require"], ["verify-ca", "Verify CA"], ["verify-full", "Verify full"]];
const ALL_KINDS = STATEMENTS.map(([k]) => k);
/** a What to protect list as stored: missing when it holds every kind */
const storedList = (l: string[]) => (l.length === ALL_KINDS.length ? undefined : l);
type ConnTab = "general" | "options" | "ssl" | "advanced";
const CONN_TABS: [ConnTab, string][] = [["general", "General"], ["options", "Options"], ["ssl", "SSL"], ["advanced", "Advanced"]];

interface UrlParts {
  engine: Engine;
  host: string;
  port: string;
  user: string;
  database: string;
  file: string;
  sslMode: SslMode;
}

// MySQL spells the modes its own way in a URL (ssl-mode=VERIFY_IDENTITY)
const MY_SSL: Record<SslMode, string> = { disable: "DISABLED", prefer: "PREFERRED", require: "REQUIRED", "verify-ca": "VERIFY_CA", "verify-full": "VERIFY_IDENTITY" };
const SSL_ALIASES: Record<string, SslMode> = {
  disable: "disable", disabled: "disable", prefer: "prefer", preferred: "prefer", require: "require", required: "require",
  "verify-ca": "verify-ca", verify_ca: "verify-ca", "verify-full": "verify-full", verify_identity: "verify-full",
};

/** The connection as a URL: postgresql://user@host:port/db, mysql://…, sqlite:path. Never carries the password. */
function connUrl(p: UrlParts): string {
  if (p.engine === "sqlite") return `sqlite:${p.file}`;
  const enc = encodeURIComponent;
  const q = p.sslMode === "prefer" ? "" : p.engine === "mysql" ? `?ssl-mode=${MY_SSL[p.sslMode]}` : `?sslmode=${p.sslMode}`;
  return `${p.engine === "mysql" ? "mysql" : "postgresql"}://${p.user ? enc(p.user) + "@" : ""}${p.host}${p.port ? ":" + p.port : ""}${p.database ? "/" + enc(p.database) : ""}${q}`;
}

/** Reads a typed or pasted URL back into fields; a password in it is returned separately. Null when it is not one. */
function parseUrl(v: string): (Partial<UrlParts> & { password?: string }) | null {
  const t = v.trim();
  if (/^sqlite:/i.test(t)) return { engine: "sqlite", file: t.replace(/^sqlite:(\/\/)?/i, "") };
  const m = t.match(/^(postgres(?:ql)?|mysql|mariadb):\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d*))?(?:\/([^?]*))?(?:\?(.*))?$/i);
  if (!m) return null;
  const dec = (s?: string) => {
    try {
      return decodeURIComponent(s ?? "");
    } catch {
      return s ?? "";
    }
  };
  const q = new URLSearchParams(m[7] ?? "");
  const ssl = SSL_ALIASES[(q.get("sslmode") ?? q.get("ssl-mode") ?? "").toLowerCase()];
  return {
    engine: /^(mysql|mariadb)$/i.test(m[1]) ? "mysql" : "postgres",
    user: dec(m[2]),
    password: m[3] === undefined ? undefined : dec(m[3]),
    host: m[4],
    port: m[5] ?? "",
    database: dec(m[6]),
    ...(ssl ? { sslMode: ssl } : {}),
  };
}

const optNum = (s: string) => (s.trim() && Number(s) > 0 ? Number(s) : undefined);
const optStr = (s: string) => s.trim() || undefined;

/** A number field with its unit where empty means "use the value in Settings" (shown as the placeholder). */
function OptUnit({ id, value, unit, placeholder, onChange }: { id: string; value: string; unit: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <span className="unit-field">
      <input id={id} className="field" inputMode="numeric" autoComplete="off" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
      <span className="unit">{unit}</span>
    </span>
  );
}

function ConnectModal({ conn, group: initialGroup, onClose }: { conn?: Conn; group?: string; onClose: () => void }) {
  const conns = useStore((s) => s.conns);
  // Home groups it under this name; a group's menu or New connection card starts it there
  const [group, setGroup] = useState(conn?.group ?? initialGroup ?? "");
  const groups = [...new Set(conns.map((c) => c.group).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b));
  const settings = useStore((s) => s.settings);
  const [tab, setTab] = useState<ConnTab>("general");
  const [engine, setEngine] = useState<Engine>(conn?.engine ?? "postgres");
  const [name, setName] = useState(conn?.name ?? "");
  const [color, setColor] = useState(conn?.color ?? (conns.length % CONN_COLOR_COUNT) + 1);
  const [touched, setTouched] = useState(false);
  const [urlOnly, setUrlOnly] = useState(false);
  const [file, setFile] = useState(conn?.file ?? "");
  const [host, setHost] = useState(conn?.host ?? "localhost");
  const [port, setPort] = useState(String(conn?.port ?? PORTS[conn?.engine ?? "postgres"] ?? ""));
  const [database, setDatabase] = useState(conn?.database ?? "");
  const [user, setUser] = useState(conn?.user ?? "");
  const [password, setPassword] = useState("");
  // the URL while it is being typed; null shows the one built from the fields
  const [urlDraft, setUrlDraft] = useState<string | null>(null);
  const passSet = useStore((s) => s.pass.set);
  // the connection's own level; a new one starts from Settings › Security (Low when that says Strict but no passphrase is set)
  const [level, setLevel] = useState<SecurityLevel>(() => {
    if (conn) return conn.level;
    const d = settings.defaultLevel ?? DEFAULT_LEVEL;
    return d === "strict" && !passSet ? "low" : d;
  });
  // what Low and Strict ask about, and Strict's Touch ID and unlock window; a new one lists every statement
  const [protection, setProtection] = useState<Protection>({
    touchId: !!conn?.touchId,
    window: conn?.unlockWindow ?? 0,
    list: conn?.protect ?? ALL_KINDS,
  });
  // a Strict connection stays open for lowering only while this dialog is open
  useEffect(() => () => void api.lockProtect().catch(() => {}), []);
  const [rowLimit, setRowLimit] = useState(conn?.rowLimit ? String(conn.rowLimit) : "");
  const [stmtTimeout, setStmtTimeout] = useState(conn?.statementTimeout ? String(conn.statementTimeout) : "");
  const [sslMode, setSslMode] = useState<SslMode>(conn?.sslMode ?? "prefer");
  const [sslCa, setSslCa] = useState(conn?.sslCa ?? "");
  const [appName, setAppName] = useState(conn?.appName ?? "");
  const [connectTimeout, setConnectTimeout] = useState(conn?.connectTimeout ? String(conn.connectTimeout) : "");
  const [heartbeat, setHeartbeat] = useState<"app" | "on" | "off">(conn?.heartbeat === undefined ? "app" : conn.heartbeat ? "on" : "off");
  const [line, setLine] = useState<{ kind: "testing" | "ok" | "fail"; text: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Partial<Record<ConnTab, HTMLButtonElement | null>>>({});
  const nameBad = touched && !name.trim();
  const lite = engine === "sqlite";
  const url = urlDraft ?? connUrl({ engine, host, port, user, database, file, sslMode });

  const pickEngine = (e: Engine) => {
    setEngine(e);
    if (e !== "sqlite" && (!port || Object.values(PORTS).includes(Number(port)))) setPort(String(PORTS[e]));
    setLine(null);
  };

  const typeUrl = (v: string) => {
    setUrlDraft(v);
    const p = parseUrl(v);
    if (!p) return;
    if (p.engine && p.engine !== engine) setEngine(p.engine);
    if (p.engine === "sqlite") return setFile(p.file ?? "");
    setUser(p.user ?? "");
    setHost(p.host ?? "");
    setPort(p.port ?? "");
    setDatabase(p.database ?? "");
    if (p.sslMode) setSslMode(p.sslMode);
    // a password typed into the URL goes to the keychain field and out of the URL
    if (p.password !== undefined) {
      setPassword(p.password);
      setUrlDraft(null);
    }
  };

  const build = (): Conn => ({
    id: conn?.id ?? "",
    name: name.trim(),
    engine,
    color,
    group: group.trim() || undefined,
    level,
    protect: storedList(protection.list),
    // Touch ID and the unlock window mean something only under Strict
    touchId: (level === "strict" && protection.touchId) || undefined,
    unlockWindow: level === "strict" && protection.window ? protection.window : undefined,
    rowLimit: optNum(rowLimit),
    statementTimeout: optNum(stmtTimeout),
    heartbeat: lite || heartbeat === "app" ? undefined : heartbeat === "on",
    ...(lite
      ? { file: file.trim() }
      : {
          host: host.trim() || "localhost",
          port: Number(port) || PORTS[engine],
          database: database.trim() || undefined,
          user: user.trim() || undefined,
          sslMode: sslMode === "prefer" ? undefined : sslMode,
          sslCa: optStr(sslCa),
          appName: engine === "postgres" ? optStr(appName) : undefined,
          connectTimeout: optNum(connectTimeout),
        }),
  });

  const choose = async (title: string, set: (f: string) => void) => {
    const f = await openDialog({ multiple: false, directory: false, title }).catch(() => null);
    if (typeof f === "string") set(f);
    return typeof f === "string" ? f : null;
  };
  const chooseFile = async () => {
    const f = await choose("Choose an SQLite database", setFile);
    if (f && !name.trim()) setName(f.split("/").pop() ?? "");
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const action = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "save";
    setTouched(true);
    if (!name.trim()) {
      setTab("general");
      setTimeout(() => nameRef.current?.focus());
      return;
    }
    const c = build();
    if (action === "test") {
      setLine({ kind: "testing", text: lite ? `Opening ${file}` : `Connecting to ${c.host}:${c.port}` });
      try {
        const r = await api.testConnection(c, password || null);
        setLine({ kind: "ok", text: `Connected to ${r.server} in ${r.ms} ms` });
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
      // Save & connect opens it (reconnecting a live session so it picks up the change);
      // Save only stores it, but a live session still reconnects so it runs on what was saved
      if (st.sessions[saved.id]) void st.reconnect(saved.id);
      else if (action === "connect") void st.openConn(saved.id);
    } catch (err) {
      setLine({ kind: "fail", text: errText(err) });
    }
  };

  const tabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = CONN_TABS[(i + d + CONN_TABS.length) % CONN_TABS.length][0];
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const none = (text: string) => <p className="cx-none">{text}</p>;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog cx" role="dialog" aria-modal="true" aria-labelledby="cx-title">
        <h2 id="cx-title">{conn ? "Edit connection" : "New connection"}</h2>
        <form onSubmit={submit} noValidate>
          <div className="cx-grid cx-head">
            <label htmlFor="c-name">Name</label>
            <input
              ref={nameRef}
              id="c-name"
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
            <label htmlFor="c-color">Color</label>
            <ColorPicker id="c-color" value={color} engine={engine} onChange={setColor} />
            {nameBad && (
              <span className="help err" id="c-name-h">
                Give the connection a name so you can find it again
              </span>
            )}
            <label htmlFor="c-group">Group</label>
            <input id="c-group" className="field cx-group" list="c-groups" placeholder="None" autoComplete="off" spellCheck={false} value={group} onChange={(e) => setGroup(e.target.value)} />
            <datalist id="c-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          <div className="subtabs cx-tabs" role="tablist" aria-label="Connection settings">
            {CONN_TABS.map(([k, label], i) => (
              <button
                key={k}
                ref={(el) => {
                  tabRefs.current[k] = el;
                }}
                type="button"
                className="subtab"
                role="tab"
                id={`ct-${k}`}
                aria-controls={`cp-${k}`}
                aria-selected={tab === k}
                tabIndex={tab === k ? 0 : -1}
                onClick={() => setTab(k)}
                onKeyDown={(e) => tabKey(e, i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-general" aria-labelledby="ct-general" hidden={tab !== "general"}>
            <div className="cx-grid">
              <label htmlFor="c-engine">Driver</label>
              <span className="cx-full cx-driver">
                <EnginePicker id="c-engine" value={engine} onChange={(e) => (pickEngine(e), setUrlDraft(null))} />
              </span>
              {lite ? (
                <>
                  <label htmlFor="c-file">File</label>
                  <span className="with-btn cx-full">
                    <input className="field mono" id="c-file" placeholder="~/data/analytics.sqlite" autoComplete="off" spellCheck={false} value={file} onChange={(e) => (setFile(e.target.value), setUrlDraft(null))} />
                    <button type="button" className="btn" onClick={chooseFile}>
                      <FolderOpen {...ico} />
                      Choose
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="cx-label" id="c-type-l">
                    Connection type
                  </span>
                  <span className="cx-full">
                    <span className="seg seg--lg" role="group" aria-labelledby="c-type-l">
                      <button type="button" aria-pressed={!urlOnly} onClick={() => setUrlOnly(false)}>
                        Default
                      </button>
                      <button type="button" aria-pressed={urlOnly} onClick={() => setUrlOnly(true)}>
                        URL only
                      </button>
                    </span>
                  </span>
                  {!urlOnly && (
                    <>
                      <label htmlFor="c-host">Host</label>
                      <input className="field mono" id="c-host" autoComplete="off" spellCheck={false} value={host} onChange={(e) => (setHost(e.target.value), setUrlDraft(null))} />
                      <label htmlFor="c-port">Port</label>
                      <input className="field mono" id="c-port" inputMode="numeric" autoComplete="off" value={port} onChange={(e) => (setPort(e.target.value.replace(/\D/g, "")), setUrlDraft(null))} />
                      <label htmlFor="c-user">User</label>
                      <input className="field mono cx-full" id="c-user" autoComplete="username" spellCheck={false} value={user} onChange={(e) => (setUser(e.target.value), setUrlDraft(null))} />
                    </>
                  )}
                  <label htmlFor="c-pass">Password</label>
                  <input className="field cx-full" id="c-pass" type="password" autoComplete="current-password" aria-describedby="c-pass-h" placeholder={conn ? "Unchanged" : ""} value={password} onChange={(e) => setPassword(e.target.value)} />
                  {!urlOnly && (
                    <>
                      <label htmlFor="c-db">Database</label>
                      <input className="field mono cx-full" id="c-db" autoComplete="off" spellCheck={false} value={database} onChange={(e) => (setDatabase(e.target.value), setUrlDraft(null))} />
                    </>
                  )}
                </>
              )}
              <label htmlFor="c-url">URL</label>
              <input className="field mono cx-full" id="c-url" autoComplete="off" spellCheck={false} aria-describedby="c-url-h" value={url} onChange={(e) => typeUrl(e.target.value)} onBlur={() => setUrlDraft(null)} />
              <span className="help cx-full cx-under" id="c-url-h">
                {urlOnly ? "Paste the whole URL. A password in it moves to the field above." : "Editing the URL fills in the settings above."}
              </span>
              {!lite && (
                <span className="help cx-full cx-under" id="c-pass-h">
                  <KeyRound {...ico} />
                  Passwords stay in the macOS login keychain on this Mac
                </span>
              )}
            </div>
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-options" aria-labelledby="ct-options" hidden={tab !== "options"}>
            <SecuritySection
              connId={conn?.id}
              level={level}
              onLevel={(l) => (setLevel(l), setLine(null))}
              value={protection}
              onChange={setProtection}
              lockable={conn?.level === "strict" && passSet}
            />
            <h3 className="cx-h">
              Queries <span className="cx-h-note">Empty uses the value in Settings</span>
            </h3>
            <div className="set-list">
              <SetItem label="Row limit" desc="Added to a select that has no limit of its own" htmlFor="c-limit">
                <OptUnit id="c-limit" unit="rows" placeholder={String(settings.rowLimit ?? DEFAULT_ROW_LIMIT)} value={rowLimit} onChange={setRowLimit} />
              </SetItem>
              <SetItem label="Statement timeout" desc="0 lets a statement run as long as it takes" htmlFor="c-timeout">
                <OptUnit id="c-timeout" unit="s" placeholder={String(settings.statementTimeout ?? 30)} value={stmtTimeout} onChange={setStmtTimeout} />
              </SetItem>
              {!lite && (
                <SetItem label="Connection heartbeat" desc="Keeps idle sessions open with select 1" htmlFor="c-beat">
                  <Select id="c-beat" className="field set-choice" value={heartbeat} onChange={(e) => setHeartbeat(e.target.value as "app" | "on" | "off")}>
                    <option value="app">Use Settings ({settings.heartbeat ? "on" : "off"})</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </Select>
                </SetItem>
              )}
            </div>
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-ssl" aria-labelledby="ct-ssl" hidden={tab !== "ssl"}>
            {lite ? (
              none("SQLite opens a file on this Mac. There is no network to secure.")
            ) : (
              <div className="cx-grid">
                <label htmlFor="c-sslmode">Mode</label>
                <span className="cx-full">
                  <Select id="c-sslmode" className="field" value={sslMode} onChange={(e) => (setSslMode(e.target.value as SslMode), setUrlDraft(null))}>
                    {SSL_MODES.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </span>
                <span className="help cx-full cx-under">
                  {sslMode === "verify-ca" ? "Checks the server certificate against the CA file." : sslMode === "verify-full" ? "Checks the certificate and that it names this host." : "Verify CA and Verify full check the server's certificate."}
                </span>
                <label htmlFor="c-ca">CA file</label>
                <span className="with-btn cx-full">
                  <input className="field mono" id="c-ca" placeholder="~/certs/ca.pem" autoComplete="off" spellCheck={false} value={sslCa} onChange={(e) => setSslCa(e.target.value)} />
                  <button type="button" className="btn" onClick={() => void choose("Choose a CA certificate", setSslCa)}>
                    <FolderOpen {...ico} />
                    Choose
                  </button>
                </span>
              </div>
            )}
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-advanced" aria-labelledby="ct-advanced" hidden={tab !== "advanced"}>
            {lite ? (
              none("Nothing to set for an SQLite file.")
            ) : (
              <div className="cx-grid">
                {engine === "postgres" && (
                  <>
                    <label htmlFor="c-app">Application name</label>
                    <input className="field mono cx-full" id="c-app" placeholder="ypacapy" autoComplete="off" spellCheck={false} value={appName} onChange={(e) => setAppName(e.target.value)} />
                  </>
                )}
                <label htmlFor="c-ctimeout">Connect timeout</label>
                <span className="cx-full">
                  <OptUnit id="c-ctimeout" unit="s" placeholder="15" value={connectTimeout} onChange={setConnectTimeout} />
                </span>
              </div>
            )}
          </div>

          {line && (
            <p className={`test-line${line.kind === "ok" ? " ok" : line.kind === "fail" ? " fail" : ""}`} role="status">
              {line.kind === "testing" ? <span className="spinner" /> : line.kind === "ok" ? <CircleCheck {...ico} /> : <CircleAlert {...ico} />}
              {line.text}
            </p>
          )}
          <footer className="cx-foot">
            <button type="submit" className="btn" value="test" id="c-test" aria-busy={line?.kind === "testing" || undefined} disabled={line?.kind === "testing"}>
              Test connection
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" value="save">
              Save
            </button>
            <button type="submit" className="btn btn--primary" value="connect">
              <PlugZap {...ico} />
              Save &amp; Connect
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ---------- Settings ----------

const UI_FONTS = ["SF Pro", "Helvetica Neue", "Avenir Next", "Inter", "Georgia"];
const MONO_FONTS = ["SF Mono", "Menlo", "Monaco", "Courier New", "JetBrains Mono"];

function SettingsModal({ section: initial, onClose }: { section?: SettingsSection; onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>(initial ?? "appearance");
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
            label="Color scheme"
            value={(theme === "dark" ? settings.darkScheme : settings.lightScheme) ?? DEFAULT_SCHEME[theme]}
            onChange={(v) => void set(theme === "dark" ? { darkScheme: v } : { lightScheme: v })}
          />
        )}
        <SetItem label="Compact mode" htmlFor="set-compact">
          <input id="set-compact" className="switch" type="checkbox" role="switch" checked={settings.compact === true} onChange={(e) => void set({ compact: e.target.checked || undefined })} />
        </SetItem>
        <FontRow id="set-ui-font" label="Interface font" placeholder="System default" fonts={fonts.all} font={settings.fontUi} size={settings.fontSizeUi ?? 14} sizes={[12, 13, 14, 15, 16]} onFont={(fontUi) => void set({ fontUi })} onSize={size(14, "fontSizeUi")} />
        <FontRow id="set-table-font" label="Table font" placeholder="System monospace" fonts={fonts.all} font={settings.fontTable} size={settings.fontSizeTable ?? 13} sizes={[11, 12, 13, 14, 15, 16]} onFont={(fontTable) => void set({ fontTable })} onSize={size(13, "fontSizeTable")} />
        <FontRow id="set-console-font" label="Editor font" placeholder="System monospace" fonts={fonts.mono} font={settings.fontMono} size={settings.fontSizeCode ?? 13} sizes={[11, 12, 13, 14, 15, 16, 18]} onFont={(fontMono) => void set({ fontMono })} onSize={size(13, "fontSizeCode")} />
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
          <UnitField id="set-limit" value={s.rowLimit ?? DEFAULT_ROW_LIMIT} unit="rows" min={1} max={100000} onChange={(n) => void set({ rowLimit: n === DEFAULT_ROW_LIMIT ? undefined : n })} />
        </SetItem>
        <SetItem label="Statement timeout" htmlFor="set-timeout" desc="0 lets a statement run as long as it takes">
          <UnitField id="set-timeout" value={s.statementTimeout ?? 30} unit="s" min={0} max={86400} onChange={(n) => void set({ statementTimeout: n === 30 ? undefined : n })} />
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

type SubKind = "unlock" | "new" | "change" | "disable" | "reset";

function SecurityPane() {
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const passSet = useStore((st) => st.pass.set);
  const level = s.defaultLevel ?? DEFAULT_LEVEL;

  return (
    <div className="set-pane">
      <h3>Security</h3>
      <p className="pane-note">
        The passphrase is one for the whole app. Each connection keeps its own security level (None, Low or Strict) and the statements it asks about, set in its
        Options or the tabs bar.
      </p>
      <div className="set-list">
        <SetItem label="Default security level for new connections" desc="Existing connections keep their own" htmlFor="sec-level">
          <Select id="sec-level" className="field set-choice" value={level} onChange={(e) => void set({ defaultLevel: e.target.value as SecurityLevel })}>
            {LEVELS.map(([v, t]) => (
              <option key={v} value={v} disabled={v === "strict" && !passSet && level !== "strict"}>
                {v === "strict" && !passSet ? "Strict (set a passphrase below)" : t}
              </option>
            ))}
          </Select>
        </SetItem>
      </div>
      <PassphraseManager />
    </div>
  );
}

/** The passphrase, one for the whole app: set, change, disable, or reset with macOS authentication. Managed only here. */
function PassphraseManager() {
  const s = useStore((st) => st.settings);
  const pass = useStore((st) => st.pass);
  const set = useStore((st) => st.setSettings);
  const [sub, setSub] = useState<SubKind | null>(null);
  const refreshPass = async () => useStore.setState({ pass: await api.passphraseStatus() });

  return (
    <>
      <div className="set-list">
        <div className="set-item set-item--pass">
          <div className="set-text">
            <span className="set-label">Passphrase</span>
            <span className="desc">
              {pass.set ? "Set, in the macOS keychain" : "Not set. With one, the statements you pick ask for it before they run"}
              {/* a reset cannot be prevented (the Mac's owner can always do it), so it is never silent */}
              {pass.set && s.passphraseResetAt && <span className="pass-reset"> Reset with macOS authentication {when(s.passphraseResetAt)}.</span>}
            </span>
            {pass.set && (
              <button type="button" className="pass-forgot" onClick={() => setSub("reset")}>
                Forgot passphrase?
              </button>
            )}
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
      </div>
      {sub &&
        createPortal(
          <PassDialog
            kind={sub}
            touch={false}
            onClose={() => setSub(null)}
            onDone={async (k) => {
              setSub(null);
              if (k === "reset") await set({ passphraseResetAt: Date.now() });
              if (k === "disable") {
                // the backend turned every connection's protection off
                await set({ passphraseResetAt: undefined });
                await useStore.getState().refreshConns();
              }
              await refreshPass();
            }}
          />,
          document.body,
        )}
    </>
  );
}

/** What a connection's Low and Strict ask about, and Strict's Touch ID and unlock window, in its Options. */
interface Protection {
  touchId: boolean;
  /** seconds it stays unlocked after the passphrase; 0 asks every time */
  window: number;
  /** the statements to ask about, every kind in STATEMENTS order when never changed */
  list: string[];
}

const UNLOCK_WINDOWS: [number, string][] = [
  [0, "Ask every time"],
  [60, "1 minute"],
  [300, "5 minutes"],
  [900, "15 minutes"],
];

/**
 * A connection's security level, Strict's Touch ID and Stay unlocked for, and the statements Low and Strict
 * ask about. Strict needs a passphrase (set in Settings › Security). A connection saved as Strict is locked:
 * lowering it, dropping a statement, Touch ID on or a longer unlock needs the passphrase first (unlock_protect).
 */
function SecuritySection({
  connId,
  level,
  onLevel,
  value,
  onChange,
  lockable,
}: {
  connId?: string;
  level: SecurityLevel;
  onLevel: (l: SecurityLevel) => void;
  value: Protection;
  onChange: (p: Protection) => void;
  lockable: boolean;
}) {
  const pass = useStore((st) => st.pass);
  // Touch ID opens it for changes only when the connection, as saved, allows Touch ID
  const savedTouch = useStore((st) => !!st.conns.find((c) => c.id === connId)?.touchId);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const locked = lockable && !unlocked;
  const put = (p: Partial<Protection>) => onChange({ ...value, ...p });
  const desc = LEVELS.find(([l]) => l === level)?.[2];

  return (
    <>
      <h3 className="cx-h">Security</h3>
      <div className="set-list">
        <SetItem label="Security level" desc={locked ? "Locked. Use Change below to lower it" : desc} htmlFor="c-level">
          <Select id="c-level" className="field set-choice" value={level} onChange={(e) => onLevel(e.target.value as SecurityLevel)}>
            {LEVELS.map(([v, t]) => (
              <option key={v} value={v} disabled={(v === "strict" && !pass.set && level !== "strict") || (locked && v !== "strict")}>
                {v === "strict" && !pass.set ? "Strict (needs a passphrase, in Settings)" : t}
              </option>
            ))}
          </Select>
        </SetItem>
        {level === "strict" && (
          <>
            <SetItem label="Open with Touch ID" htmlFor="c-touch" sub desc={pass.touchIdAvailable ? undefined : "This Mac has no Touch ID ready"}>
              <input id="c-touch" className="switch" type="checkbox" role="switch" disabled={locked || !pass.touchIdAvailable} checked={value.touchId} onChange={(e) => put({ touchId: e.target.checked })} />
            </SetItem>
            <SetItem label="Stay unlocked for" desc="After the passphrase, for this connection only" htmlFor="c-window" sub>
              <Select id="c-window" className="field set-choice" disabled={locked} value={String(value.window)} onChange={(e) => put({ window: Number(e.target.value) })}>
                {UNLOCK_WINDOWS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </SetItem>
          </>
        )}
      </div>
      {level !== "none" && (
        <>
          <div className="protect-head cx-protect-head">
            <h3 className="cx-h">
              Statements to ask about <span className="cx-h-note">For this connection</span>
            </h3>
            {lockable && level === "strict" && (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  if (unlocked) {
                    setUnlocked(false);
                    void api.lockProtect();
                  } else setUnlocking(true);
                }}
              >
                {unlocked ? <LockOpen {...ico} /> : <Lock {...ico} />}
                <span>{unlocked ? "Lock" : "Change"}</span>
              </button>
            )}
          </div>
          <div className="set-list stmts">
            {STATEMENTS.map(([k, tag], i) => (
              <SetItem
                key={k}
                htmlFor={`c-prot-${i}`}
                label={
                  <>
                    <code className="stmt">{k}</code>
                    {tag && <> <span className="tag">{tag}</span></>}
                  </>
                }
              >
                <input
                  id={`c-prot-${i}`}
                  className="switch"
                  type="checkbox"
                  role="switch"
                  disabled={level === "strict" && locked}
                  checked={value.list.includes(k)}
                  onChange={(e) => put({ list: ALL_KINDS.filter((x) => (x === k ? e.target.checked : value.list.includes(x))) })}
                />
              </SetItem>
            ))}
          </div>
        </>
      )}
      {unlocking &&
        connId &&
        // a portal: the connection dialog is a form, and a form cannot hold another
        createPortal(
          <PassDialog
            kind="unlock"
            connId={connId}
            touch={savedTouch && pass.touchIdAvailable}
            onClose={() => setUnlocking(false)}
            onDone={() => {
              setUnlocking(false);
              setUnlocked(true);
            }}
          />,
          document.body,
        )}
    </>
  );
}

const SUB: Record<SubKind, { title: string; primary: string; fields: [string, string][]; help?: string; danger?: boolean }> = {
  unlock: { title: "Change passphrase protection", primary: "Unlock", fields: [["Passphrase", "current-password"]] },
  new: { title: "Set passphrase", primary: "Set passphrase", fields: [["Passphrase", "new-password"], ["Type it again", "new-password"]], help: "It cannot be shown again. If you forget it, reset it with Touch ID or your login password." },
  change: { title: "Change passphrase", primary: "Change passphrase", fields: [["Current passphrase", "current-password"], ["New passphrase", "new-password"], ["Type it again", "new-password"]] },
  disable: {
    title: "Disable passphrase",
    primary: "Disable passphrase",
    fields: [["Current passphrase", "current-password"]],
    help: "This turns off passphrase protection on every connection, and Open with Touch ID. Write guards stay as they are.",
    danger: true,
  },
  reset: {
    title: "Reset passphrase",
    primary: "Reset passphrase",
    fields: [["New passphrase", "new-password"], ["Type it again", "new-password"]],
    help: "The old passphrase cannot be shown, only replaced. macOS asks for Touch ID or your login password first. Connections keep their protection.",
  },
};

/** Set, change or disable the passphrase (Settings), or open a connection's protection for changes (its dialog). */
function PassDialog({ kind, connId = "", touch, onClose, onDone }: { kind: SubKind; connId?: string; touch: boolean; onClose: () => void; onDone: (k: SubKind) => void }) {
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
    // React bubbles events through the portal to the connection dialog's form: stop here
    e.stopPropagation();
    const empty = vals.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (empty.length) {
      setBad(empty);
      setErr("Fill in every field.");
      return;
    }
    if ((kind === "new" || kind === "change" || kind === "reset") && vals[vals.length - 1] !== vals[vals.length - 2]) {
      setBad([vals.length - 1]);
      setErr("The two passphrases differ.");
      return;
    }
    setBusy(true);
    try {
      if (kind === "unlock") await api.unlockProtect(connId, vals[0], false);
      else if (kind === "new") await api.setPassphrase(vals[0]);
      else if (kind === "change") await api.setPassphrase(vals[1], vals[0]);
      else if (kind === "reset") await api.resetPassphrase(vals[0]);
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
                    await api.unlockProtect(connId, undefined, true);
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
