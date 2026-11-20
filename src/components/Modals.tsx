import "./Modals.css";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { DEFAULT_ROW_LIMIT, uid, useStore, type Modal, type SettingsSection } from "../store";
import { api, errText } from "../lib/api";
import { highlightInline } from "../lib/sql";
import { systemFonts } from "../lib/fonts";
import { BUILTIN, DEFAULT_SCHEME, FAMILIES, SCHEMES, schemeSwatch, type BuiltinId } from "../lib/themes";
import { DEFAULT_LEVEL, LEVELS, MONGO_KINDS, REDIS_KINDS, STATEMENTS, type Approval, type Conn, type Engine, type MongoTls, type ReadPref, type SecurityLevel, type Settings, type SslMode } from "../types";
import { Select } from "./Select";
import { LevelSelect } from "./LevelPicker";
import { GroupSelect } from "./GroupPicker";
import { ColorPicker, EnginePicker } from "./Picker";
import { ago, ttlLeft, when } from "../lib/time";
import { CONN_COLOR_COUNT } from "../lib/connColors";
import { useUpdates } from "../updates";
import { RELEASES_URL, mb, releaseDate } from "../lib/updater";
import { DEV_BUILD } from "../build";
import { AboutModal } from "./AboutModal";
import { AuthDialog, PassphraseDialog, type PassKind } from "./AuthDialog";
import { ConfirmAsk, GuardAsk, PromptAsk, SaveQueryAsk } from "./Ask";
import type { CollInfo, KeyInfo } from "../types";
import {
  CircleAlert,
  CircleArrowDown,
  CircleCheck,
  ExternalLink,
  FolderOpen,
  KeyRound,
  LoaderCircle,
  Lock,
  LockOpen,
  PlugZap,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Type,
  ico,
  RefreshCw,
} from "./Icon";

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
      return <ConfirmAsk m={modal} onClose={close} />;
    case "prompt":
      return <PromptAsk m={modal} onClose={close} />;
    case "saveQuery":
      return <SaveQueryAsk tabId={modal.tabId} onClose={close} />;
    case "connect":
      return <ConnectModal conn={modal.conn} group={modal.group} onClose={close} />;
    case "settings":
      return <SettingsModal section={modal.section} onClose={close} />;
    case "guard":
      return <GuardAsk m={modal} onClose={close} />;
    case "lower":
      return <AuthDialog kind="lower" connName={modal.connName} engine={modal.engine} to={modal.to} touch={modal.touch} submit={modal.submit} onClose={close} />;
    case "about":
      return <AboutModal onClose={close} />;
    case "collInfo":
      return <CollInfoModal m={modal} onClose={close} />;
    case "keyInfo":
      return <KeyInfoModal m={modal} onClose={close} />;
  }
}

// ---------- Redis key Info ----------

const REDIS_TYPE_NAME: Record<string, string> = { string: "string", hash: "hash", list: "list", set: "set", zset: "sorted set", stream: "stream" };
const REDIS_PARTS: Record<string, string> = { string: "bytes", hash: "fields", list: "items", set: "members", zset: "members", stream: "entries" };

/**
 * A key's type, encoding, length, TTL, memory and idle time: TYPE, OBJECT ENCODING, the O(1) length, PTTL, MEMORY
 * USAGE (5 samples) and OBJECT IDLETIME, read when the dialog opens and on Refresh. Never on a timer.
 */
function KeyInfoModal({ m, onClose }: { m: Extract<Modal, { kind: "keyInfo" }>; onClose: () => void }) {
  const [info, setInfo] = useState<KeyInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const db = useStore((s) => s.sessions[m.connId]?.database || "0");
  const read = () => {
    setBusy(true);
    setErr(null);
    api.redisKeyInfo(m.connId, m.key).then(
      (i) => (setInfo(i), setBusy(false)),
      (e) => (setErr(errText(e)), setBusy(false)),
    );
  };
  useEffect(read, [m.connId, m.key]);
  const row = (k: string, v: ReactNode, note?: string) => (
    <>
      <dt>{k}</dt>
      <dd>
        {v}
        {note && <span className="info-note">{note}</span>}
      </dd>
    </>
  );
  const idle = (s: number) => (s < 60 ? `${s} s` : ttlLeft(s * 1000));
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog info-dlg" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <h2 id="info-title">
          <span className="info-db">db{db} · </span>
          {m.key}
        </h2>
        {busy && !info ? (
          <div className="info-body">
            <div className="empty">
              <span className="spinner" />
              <span>Reading {m.key}</span>
            </div>
          </div>
        ) : err ? (
          <div className="info-body">
            <div className="error-box">
              <strong>Could not read {m.key}</strong>
              <span className="msg">{err}</span>
            </div>
          </div>
        ) : info?.type === "none" ? (
          <div className="info-body">
            <div className="empty">
              <strong>{m.key} is gone</strong>
              <span>It expired or was deleted.</span>
            </div>
          </div>
        ) : info ? (
          <div className="info-body" aria-busy={busy || undefined}>
            <h3 className="cx-h">Key</h3>
            <dl className="info-grid">
              {row("Type", REDIS_TYPE_NAME[info.type] ?? info.type)}
              {row("Encoding", info.encoding ?? "unknown")}
              {info.len !== null && row("Length", `${info.len.toLocaleString("en-US")} ${REDIS_PARTS[info.type] ?? ""}`)}
              {row("Expires", info.ttlMs >= 0 ? `in ${ttlLeft(info.ttlMs)}` : "Never", info.ttlMs >= 0 ? undefined : "No TTL set")}
            </dl>
            <h3 className="cx-h">Memory</h3>
            <dl className="info-grid">
              {row("Size", info.memory === null ? "unknown" : `~${bytes(info.memory)}`, info.memory === null ? "MEMORY USAGE is not allowed for this user" : "MEMORY USAGE, 5 samples")}
              {row("Idle", info.idle === null ? "unknown" : idle(info.idle), info.idle === null ? "Not kept under an LFU eviction policy" : "Since the last read or write")}
            </dl>
          </div>
        ) : null}
        <footer>
          <span className="help info-when">{info ? `Read with TYPE, OBJECT and MEMORY USAGE at ${new Date(info.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          <button type="button" className="btn" disabled={busy} onClick={read}>
            <RefreshCw {...ico} />
            Refresh
          </button>
          <button type="button" className="btn btn--primary" autoFocus onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------- MongoDB collection Info ----------

/** 712 B, 12.4 MB: 1024-based, one decimal from MB up */
function bytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "unknown";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/**
 * A collection's sizes and shape: one $collStats (storage stats are metadata; nothing is scanned), read when
 * the dialog opens and on Refresh, never before and never on a timer.
 */
function CollInfoModal({ m, onClose }: { m: Extract<Modal, { kind: "collInfo" }>; onClose: () => void }) {
  const [info, setInfo] = useState<CollInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const read = () => {
    setBusy(true);
    setErr(null);
    api.mongoStats(m.connId, m.database, m.collection).then(
      (i) => (setInfo(i), setBusy(false)),
      (e) => (setErr(errText(e)), setBusy(false)),
    );
  };
  useEffect(read, [m.connId, m.database, m.collection]);
  const row = (k: string, v: ReactNode, note?: string) => (
    <>
      <dt>{k}</dt>
      <dd>
        {v}
        {note && <span className="info-note">{note}</span>}
      </dd>
    </>
  );
  const kind = info ? { collection: "Standard", view: "View", timeseries: "Time series" }[info.kind] ?? info.kind : "";
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog info-dlg" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <h2 id="info-title">
          <span className="info-db">{m.database}.</span>
          {m.collection}
        </h2>
        {busy && !info ? (
          <div className="info-body">
            <div className="empty">
              <span className="spinner" />
              <span>Reading stats for {m.collection}</span>
            </div>
          </div>
        ) : err ? (
          <div className="info-body">
            <div className="error-box">
              <strong>Could not read the stats</strong>
              <span className="msg">{err}</span>
            </div>
          </div>
        ) : info?.kind === "view" ? (
          <div className="info-body">
            <h3 className="cx-h">Collection</h3>
            <dl className="info-grid">{row("Type", "View", "Reads another collection and stores nothing of its own")}</dl>
          </div>
        ) : info ? (
          <div className="info-body" aria-busy={busy || undefined}>
            <h3 className="cx-h">Documents</h3>
            <dl className="info-grid">
              {row("Count", info.count === null ? "unknown" : `~${info.count.toLocaleString("en-US")}`, "Kept by the server, not counted")}
              {row("Average size", bytes(info.avgSize))}
              {row("Data size", bytes(info.dataSize), "Uncompressed")}
              {row("On disk", bytes(info.storageSize), info.compression ? `Compressed, ${info.compression}` : undefined)}
            </dl>
            <h3 className="cx-h">
              Indexes{" "}
              <span className="cx-h-note">
                {info.indexes.length}, {bytes(info.indexSize)} in all
              </span>
            </h3>
            <dl className="info-grid info-idx">
              {info.indexes.map(([name, size]) => (
                <span key={name} style={{ display: "contents" }}>
                  <dt className="mono">{name}</dt>
                  <dd>{bytes(size)}</dd>
                </span>
              ))}
            </dl>
            <h3 className="cx-h">Collection</h3>
            <dl className="info-grid">
              {row("Type", info.capped ? `${kind}, capped` : kind)}
              {row("Validator", info.validator ?? "none", info.validator ? [info.validationLevel, info.validationAction].filter(Boolean).join(", ") : undefined)}
            </dl>
          </div>
        ) : null}
        <footer>
          <span className="help info-when">{info ? `Read with $collStats at ${new Date(info.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          <button type="button" className="btn" disabled={busy} onClick={read}>
            <RefreshCw {...ico} />
            Refresh
          </button>
          <button type="button" className="btn btn--primary" autoFocus onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
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

// ---------- New connection ----------

const PORTS: Record<Engine, number | undefined> = { postgres: 5432, mysql: 3306, sqlite: undefined, mongo: 27017, redis: 6379 };
const SSL_MODES: [SslMode, string][] = [["disable", "Disable"], ["prefer", "Prefer"], ["require", "Require"], ["verify-ca", "Verify CA"], ["verify-full", "Verify full"]];
const ALL_KINDS = STATEMENTS.map(([k]) => k);
/** MongoDB asks about kinds of write method, not statements */
const MONGO_ALL = MONGO_KINDS.map(([k]) => k);
/** Redis asks about kinds of command */
const REDIS_ALL = REDIS_KINDS.map(([k]) => k);
const kindsOf = (e: Engine) => (e === "mongo" ? MONGO_ALL : e === "redis" ? REDIS_ALL : ALL_KINDS);
/** a What to protect list as stored: missing when it holds every kind */
const storedList = (l: string[], e: Engine) => (l.length === kindsOf(e).length ? undefined : l);
const MONGO_TLS: [MongoTls, string][] = [["off", "Off"], ["on", "On"], ["insecure", "On, without checking the certificate"]];
const READ_PREFS: [ReadPref, string][] = [
  ["primary", "Primary"],
  ["primaryPreferred", "Primary, or a secondary if it is down"],
  ["secondary", "Secondary"],
  ["secondaryPreferred", "Secondary, or the primary if none is up"],
  ["nearest", "Nearest"],
];
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
  /** MongoDB */
  srv: boolean;
  authSource: string;
  replicaSet: string;
  readPref: ReadPref;
  /** Redis: rediss:// */
  tls: boolean;
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
  // Redis: redis:// or rediss:// (TLS on); the database is the number after the slash
  if (p.engine === "redis") return `redis${p.tls ? "s" : ""}://${p.user ? enc(p.user) + "@" : ""}${p.host}${p.port ? ":" + p.port : ""}${p.database ? "/" + p.database : ""}`;
  // MongoDB: mongodb:// or mongodb+srv:// (no port); a seed list stays as typed; the rest rides in the query string
  if (p.engine === "mongo") {
    const qs = [["authSource", p.authSource], ["replicaSet", p.replicaSet], ["readPreference", p.readPref === "primary" ? "" : p.readPref]].filter(([, v]) => v).map(([k, v]) => `${k}=${enc(v)}`).join("&");
    const port = p.srv || p.host.includes(",") || !p.port ? "" : ":" + p.port;
    return `mongodb${p.srv ? "+srv" : ""}://${p.user ? enc(p.user) + "@" : ""}${p.host}${port}/${p.database ? enc(p.database) : ""}${qs ? "?" + qs : ""}`;
  }
  const q = p.sslMode === "prefer" ? "" : p.engine === "mysql" ? `?ssl-mode=${MY_SSL[p.sslMode]}` : `?sslmode=${p.sslMode}`;
  return `${p.engine === "mysql" ? "mysql" : "postgresql"}://${p.user ? enc(p.user) + "@" : ""}${p.host}${p.port ? ":" + p.port : ""}${p.database ? "/" + enc(p.database) : ""}${q}`;
}

/** Reads a typed or pasted URL back into fields; a password in it is returned separately. Null when it is not one. */
function parseUrl(v: string): (Partial<UrlParts> & { password?: string }) | null {
  const t = v.trim();
  if (/^sqlite:/i.test(t)) return { engine: "sqlite", file: t.replace(/^sqlite:(\/\/)?/i, "") };
  const mg = t.match(/^mongodb(\+srv)?:\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^/?]*)(?:\/([^?]*))?(?:\?(.*))?$/i);
  if (mg) {
    const dec = (x?: string) => {
      try {
        return decodeURIComponent(x ?? "");
      } catch {
        return x ?? "";
      }
    };
    const hosts = mg[4] ?? "";
    // one host with its port splits into Host and Port; a seed list stays whole in Host
    const one = !hosts.includes(",") ? /^(.*?)(?::(\d+))?$/.exec(hosts) : null;
    const q = new URLSearchParams(mg[6] ?? "");
    const rp = q.get("readPreference");
    return {
      engine: "mongo",
      srv: !!mg[1],
      user: dec(mg[2]),
      password: mg[3] === undefined ? undefined : dec(mg[3]),
      host: one ? one[1] : hosts,
      port: one?.[2] ?? (mg[1] ? "" : "27017"),
      database: dec(mg[5]),
      authSource: q.get("authSource") ?? "",
      replicaSet: q.get("replicaSet") ?? "",
      readPref: READ_PREFS.some(([v]) => v === rp) ? (rp as ReadPref) : "primary",
    };
  }
  const rd = t.match(/^(rediss?|valkeys?):\/\/(?:([^@/:]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d*))?(?:\/(\d*))?/i);
  if (rd) {
    const dec = (x?: string) => {
      try {
        return decodeURIComponent(x ?? "");
      } catch {
        return x ?? "";
      }
    };
    return { engine: "redis", tls: /s$/i.test(rd[1]), user: dec(rd[2]), password: rd[3] === undefined ? undefined : dec(rd[3]), host: rd[4], port: rd[5] || "6379", database: rd[6] ?? "" };
  }
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
    list: conn?.protect ?? kindsOf(conn?.engine ?? "postgres"),
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
  const [keepHistory, setKeepHistory] = useState<Tri>(tri(conn?.keepHistory));
  // SQL: the warnings that ask at any security level; a new connection follows Settings
  const [warn, setWarn] = useState<Warn>({ limit: tri(conn?.warnBigLimit), update: tri(conn?.warnUpdateAll) });
  // MongoDB
  const [srv, setSrv] = useState(!!conn?.srv);
  const [authSource, setAuthSource] = useState(conn?.authSource ?? "");
  const [tls, setTls] = useState<MongoTls | "">(conn?.tls ?? "");
  const [tlsCert, setTlsCert] = useState(conn?.tlsCert ?? "");
  const [replicaSet, setReplicaSet] = useState(conn?.replicaSet ?? "");
  const [readPref, setReadPref] = useState<ReadPref>(conn?.readPref ?? "primary");
  const [direct, setDirect] = useState(!!conn?.direct);
  const [serverCheck, setServerCheck] = useState(conn?.serverCheck ? String(conn.serverCheck) : "");
  // Redis
  const [keySep, setKeySep] = useState(conn?.keySep ?? ":");
  const [scanCount, setScanCount] = useState(conn?.scanCount ? String(conn.scanCount) : "");
  const [line, setLine] = useState<{ kind: "testing" | "ok" | "fail" | "stopped"; text: string } | null>(null);
  // the test running now; Stop test (or closing the dialog) cancels it and its late answer is dropped
  const testId = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (testId.current) void api.cancelQuery(testId.current);
    },
    [],
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Partial<Record<ConnTab, HTMLButtonElement | null>>>({});
  const nameBad = touched && !name.trim();
  const lite = engine === "sqlite";
  const mongo = engine === "mongo";
  const redis = engine === "redis";
  // TLS as it will be. MongoDB: an SRV record turns it on unless it was set. Redis: off until it is set (redis://)
  const tlsNow: MongoTls = tls || (!redis && (srv || sslCa || tlsCert) ? "on" : "off");
  const url = urlDraft ?? connUrl({ engine, host, port, user, database, file, sslMode, srv, authSource, replicaSet, readPref, tls: tlsNow !== "off" });

  const pickEngine = (e: Engine) => {
    // MongoDB, Redis and SQL ask about different things: switching between them starts from every kind of the new one
    if (kindsOf(e) !== kindsOf(engine)) setProtection((p) => ({ ...p, list: kindsOf(e) }));
    setEngine(e);
    if (e !== "sqlite" && (!port || Object.values(PORTS).includes(Number(port)))) setPort(String(PORTS[e]));
    setLine(null);
  };

  const typeUrl = (v: string) => {
    setUrlDraft(v);
    const p = parseUrl(v);
    if (!p) return;
    if (p.engine && p.engine !== engine) pickEngine(p.engine);
    if (p.engine === "sqlite") return setFile(p.file ?? "");
    if (p.engine === "mongo") {
      setSrv(!!p.srv);
      setAuthSource(p.authSource ?? "");
      setReplicaSet(p.replicaSet ?? "");
      setReadPref(p.readPref ?? "primary");
    }
    // Redis: rediss:// is TLS on; a TLS mode picked before stays when the scheme agrees
    if (p.engine === "redis") setTls(p.tls ? (tls === "insecure" ? "insecure" : "on") : "off");
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
    protect: storedList(protection.list, engine),
    // Touch ID and the unlock window mean something only under Strict
    touchId: (level === "strict" && protection.touchId) || undefined,
    unlockWindow: level === "strict" && protection.window ? protection.window : undefined,
    rowLimit: optNum(rowLimit),
    statementTimeout: optNum(stmtTimeout),
    heartbeat: lite || heartbeat === "app" ? undefined : heartbeat === "on",
    keepHistory: fromTri(keepHistory),
    warnBigLimit: mongo || redis ? undefined : fromTri(warn.limit),
    warnUpdateAll: mongo || redis ? undefined : fromTri(warn.update),
    ...(lite
      ? { file: file.trim() }
      : {
          host: host.trim() || "localhost",
          port: mongo && srv ? undefined : Number(port) || PORTS[engine],
          database: database.trim() || undefined,
          user: user.trim() || undefined,
          sslMode: mongo || sslMode === "prefer" ? undefined : sslMode,
          sslCa: optStr(sslCa),
          appName: engine === "postgres" || mongo || redis ? optStr(appName) : undefined,
          connectTimeout: optNum(connectTimeout),
          ...(mongo
            ? {
                srv: srv || undefined,
                authSource: optStr(authSource),
                tls: tls || undefined,
                tlsCert: optStr(tlsCert),
                replicaSet: optStr(replicaSet),
                readPref: readPref === "primary" ? undefined : readPref,
                direct: direct || undefined,
                serverCheck: optNum(serverCheck),
              }
            : redis
              ? {
                  tls: tls && tls !== "off" ? tls : undefined,
                  tlsCert: optStr(tlsCert),
                  keySep: keySep === ":" ? undefined : keySep,
                  scanCount: optNum(scanCount),
                }
              : {}),
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
    // Stop test: the same button while a test runs; nothing was saved
    if (action === "test" && testId.current) {
      void api.cancelQuery(testId.current);
      testId.current = null;
      setLine({ kind: "stopped", text: "Stopped the test. Nothing was saved." });
      return;
    }
    const c = build();
    if (action === "test") {
      const id = uid();
      testId.current = id;
      setLine({ kind: "testing", text: lite ? `Opening ${file}` : mongo && (srv || c.host?.includes(",")) ? `Connecting to ${c.host}` : `Connecting to ${c.host}:${c.port}` });
      try {
        const r = await api.testConnection(c, password || null, id);
        if (testId.current === id) setLine({ kind: "ok", text: `Connected to ${r.server} in ${r.ms} ms` });
      } catch (err) {
        if (testId.current === id) setLine({ kind: "fail", text: errText(err) });
      }
      if (testId.current === id) testId.current = null;
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
            <GroupSelect id="c-group" value={group} groups={groups} onChange={setGroup} />
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
                {k === "ssl" && (mongo || redis) ? "TLS" : label}
              </button>
            ))}
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-general" aria-labelledby="ct-general" hidden={tab !== "general"}>
            <div className="cx-grid">
              <label htmlFor="c-engine">Engine</label>
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
                      <input className={`field mono${mongo && srv ? " cx-full" : ""}`} id="c-host" autoComplete="off" spellCheck={false} value={host} onChange={(e) => (setHost(e.target.value), setUrlDraft(null))} />
                      {!(mongo && srv) && (
                        <>
                          <label htmlFor="c-port">Port</label>
                          <input className="field mono" id="c-port" inputMode="numeric" autoComplete="off" value={port} onChange={(e) => (setPort(e.target.value.replace(/\D/g, "")), setUrlDraft(null))} />
                        </>
                      )}
                      <label htmlFor="c-user">User</label>
                      <input className="field mono cx-full" id="c-user" autoComplete="username" spellCheck={false} value={user} onChange={(e) => (setUser(e.target.value), setUrlDraft(null))} />
                    </>
                  )}
                  <label htmlFor="c-pass">Password</label>
                  <input className="field cx-full" id="c-pass" type="password" autoComplete="current-password" aria-describedby="c-pass-h" placeholder={conn ? "Unchanged" : ""} value={password} onChange={(e) => setPassword(e.target.value)} />
                  {!urlOnly && (
                    <>
                      <label htmlFor="c-db">Database</label>
                      <input className="field mono cx-full" id="c-db" autoComplete="off" spellCheck={false} placeholder={redis ? "0" : undefined} inputMode={redis ? "numeric" : undefined} value={database} onChange={(e) => (setDatabase(redis ? e.target.value.replace(/\D/g, "") : e.target.value), setUrlDraft(null))} />
                      {redis && <span className="help cx-full cx-under">A number, 0 to 15. Empty uses 0. Capy only peeks at this one.</span>}
                      {mongo && (
                        <>
                          <label htmlFor="c-authdb">Auth database</label>
                          <input className="field mono cx-full" id="c-authdb" placeholder="admin" aria-describedby="c-authdb-h" autoComplete="off" spellCheck={false} value={authSource} onChange={(e) => (setAuthSource(e.target.value), setUrlDraft(null))} />
                          <span className="help cx-full cx-under" id="c-authdb-h">
                            The database the user is defined in. Empty uses admin.
                          </span>
                          <span className="cx-label">SRV record</span>
                          <label className="check cx-full">
                            <input type="checkbox" checked={srv} onChange={(e) => (setSrv(e.target.checked), setUrlDraft(null))} />
                            Host is a DNS seed list name (mongodb+srv), so there is no port
                          </label>
                        </>
                      )}
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
              mongo={mongo}
              redis={redis}
              warn={mongo || redis ? undefined : warn}
              onWarn={setWarn}
            />
            <h3 className="cx-h">
              Queries <span className="cx-h-note">Empty uses Global</span>
            </h3>
            <div className="set-list">
              <SetItem
                label={redis ? "Page size" : "Row limit"}
                desc={redis ? "How many fields, items or members a key tab reads at a time" : mongo ? "Added to a find or aggregate that has no limit of its own" : "Added to a select that has no limit of its own"}
                htmlFor="c-limit"
              >
                <OptUnit id="c-limit" unit="rows" placeholder={String(settings.rowLimit ?? DEFAULT_ROW_LIMIT)} value={rowLimit} onChange={setRowLimit} />
              </SetItem>
              <SetItem
                label={redis ? "Command timeout" : "Statement timeout"}
                desc={redis ? "Capy gives up waiting; Redis can't stop a command once it starts" : "0 lets a statement run as long as it takes"}
                htmlFor="c-timeout"
              >
                <OptUnit id="c-timeout" unit="s" placeholder={String(settings.statementTimeout ?? 30)} value={stmtTimeout} onChange={setStmtTimeout} />
              </SetItem>
              {!lite && (
                <SetItem label="Connection heartbeat" desc={redis ? "Keeps idle connections open with PING" : mongo ? "Keeps idle connections open with a ping command" : "Keeps idle connections open with select 1"} htmlFor="c-beat">
                  <Select id="c-beat" className="field set-choice" value={heartbeat} onChange={(e) => setHeartbeat(e.target.value as "app" | "on" | "off")}>
                    <option value="app">Use Global ({settings.heartbeat ? "on" : "off"})</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </Select>
                </SetItem>
              )}
              <SetItem label="Keep query history" desc="Off keeps this connection's runs out of History" htmlFor="c-hist">
                <Select id="c-hist" className="field set-choice" value={keepHistory} onChange={(e) => setKeepHistory(e.target.value as Tri)}>
                  <option value="app">Use Global ({settings.keepHistory !== false ? "on" : "off"})</option>
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </Select>
              </SetItem>
            </div>
          </div>

          <div className="cx-panel" role="tabpanel" id="cp-ssl" aria-labelledby="ct-ssl" hidden={tab !== "ssl"}>
            {lite ? (
              none("SQLite opens a file on this Mac. There is no network to secure.")
            ) : redis ? (
              <div className="cx-grid">
                <label htmlFor="c-tls">TLS</label>
                <span className="cx-full">
                  <Select id="c-tls" className="field" value={tlsNow} onChange={(e) => (setTls(e.target.value as MongoTls), setUrlDraft(null))}>
                    {MONGO_TLS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </span>
                <span className="help cx-full cx-under">On uses rediss://. ElastiCache with encryption in transit requires it.</span>
                <label htmlFor="c-tlsca">CA file</label>
                <span className="with-btn cx-full">
                  <input className="field mono" id="c-tlsca" placeholder="~/certs/ca.pem" autoComplete="off" spellCheck={false} value={sslCa} onChange={(e) => setSslCa(e.target.value)} />
                  <button type="button" className="btn" onClick={() => void choose("Choose a CA certificate", setSslCa)}>
                    <FolderOpen {...ico} />
                    Choose
                  </button>
                </span>
                <label htmlFor="c-tlscert">Client certificate</label>
                <span className="with-btn cx-full">
                  <input className="field mono" id="c-tlscert" placeholder="~/certs/client.pem" aria-describedby="c-tlscert-h" autoComplete="off" spellCheck={false} value={tlsCert} onChange={(e) => setTlsCert(e.target.value)} />
                  <button type="button" className="btn" onClick={() => void choose("Choose a client certificate", setTlsCert)}>
                    <FolderOpen {...ico} />
                    Choose
                  </button>
                </span>
                <span className="help cx-full cx-under" id="c-tlscert-h">
                  A file with the certificate and its key. Needed only when the server asks for one.
                </span>
              </div>
            ) : mongo ? (
              <div className="cx-grid">
                <label htmlFor="c-tls">TLS</label>
                <span className="cx-full">
                  <Select id="c-tls" className="field" value={tlsNow} onChange={(e) => setTls(e.target.value as MongoTls)}>
                    {MONGO_TLS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </span>
                <span className="help cx-full cx-under">An SRV record turns TLS on. Atlas requires it.</span>
                <label htmlFor="c-tlsca">CA file</label>
                <span className="with-btn cx-full">
                  <input className="field mono" id="c-tlsca" placeholder="~/certs/ca.pem" autoComplete="off" spellCheck={false} value={sslCa} onChange={(e) => setSslCa(e.target.value)} />
                  <button type="button" className="btn" onClick={() => void choose("Choose a CA certificate", setSslCa)}>
                    <FolderOpen {...ico} />
                    Choose
                  </button>
                </span>
                <label htmlFor="c-tlscert">Client certificate</label>
                <span className="with-btn cx-full">
                  <input className="field mono" id="c-tlscert" placeholder="~/certs/client.pem" aria-describedby="c-tlscert-h" autoComplete="off" spellCheck={false} value={tlsCert} onChange={(e) => setTlsCert(e.target.value)} />
                  <button type="button" className="btn" onClick={() => void choose("Choose a client certificate", setTlsCert)}>
                    <FolderOpen {...ico} />
                    Choose
                  </button>
                </span>
                <span className="help cx-full cx-under" id="c-tlscert-h">
                  For X.509 sign-in: one file with the certificate and its key. Leave the user and password empty.
                </span>
              </div>
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
                {(engine === "postgres" || mongo || redis) && (
                  <>
                    <label htmlFor="c-app">Application name</label>
                    <input className="field mono cx-full" id="c-app" placeholder="ypacapy" autoComplete="off" spellCheck={false} value={appName} onChange={(e) => setAppName(e.target.value)} />
                  </>
                )}
                <label htmlFor="c-ctimeout">Connect timeout</label>
                <span className="cx-full">
                  <OptUnit id="c-ctimeout" unit="s" placeholder="15" value={connectTimeout} onChange={setConnectTimeout} />
                </span>
                {mongo && (
                  <>
                    <label htmlFor="c-rs">Replica set</label>
                    <input className="field mono cx-full" id="c-rs" placeholder="Read from the server" autoComplete="off" spellCheck={false} value={replicaSet} onChange={(e) => (setReplicaSet(e.target.value), setUrlDraft(null))} />
                    <label htmlFor="c-readpref">Read from</label>
                    <span className="cx-full">
                      <Select id="c-readpref" className="field" value={readPref} onChange={(e) => (setReadPref(e.target.value as ReadPref), setUrlDraft(null))}>
                        {READ_PREFS.map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </span>
                    <span className="help cx-full cx-under">A secondary keeps your reads off the primary. Writes always go to the primary.</span>
                    <span className="cx-label">Direct connection</span>
                    <label className="check cx-full">
                      <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} />
                      Talk to this host only, not the rest of its replica set
                    </label>
                    <label htmlFor="c-hb">Server check</label>
                    <span className="cx-full">
                      <OptUnit id="c-hb" unit="s" placeholder="60" value={serverCheck} onChange={setServerCheck} />
                    </span>
                    <span className="help cx-full cx-under">While connected, the driver sends hello to each host at this interval to find the primary. It cannot be turned off.</span>
                  </>
                )}
                {redis && (
                  <>
                    <label htmlFor="c-sep">Key separator</label>
                    <input className="field mono cx-full" id="c-sep" autoComplete="off" spellCheck={false} aria-describedby="c-sep-h" value={keySep} onChange={(e) => setKeySep(e.target.value)} />
                    <span className="help cx-full cx-under" id="c-sep-h">
                      The tree groups keys into folders on it: user:3107 goes in user. Empty shows every key flat.
                    </span>
                    <label htmlFor="c-scan">Keys per scan</label>
                    <span className="cx-full">
                      <OptUnit id="c-scan" unit="keys" placeholder="1000" value={scanCount} onChange={setScanCount} />
                    </span>
                    <span className="help cx-full cx-under">The tree reads keys with SCAN, about this many per call, and only when you ask for more. It never sends KEYS.</span>
                  </>
                )}
              </div>
            )}
          </div>

          {line && (
            <p className={`test-line${line.kind === "ok" ? " ok" : line.kind === "fail" ? " fail" : ""}`} role="status">
              {line.kind === "testing" ? <span className="spinner" /> : line.kind === "ok" ? <CircleCheck {...ico} /> : line.kind === "fail" ? <CircleAlert {...ico} /> : null}
              {line.text}
            </p>
          )}
          <footer className="cx-foot">
            <button type="submit" className="btn" value="test" id="c-test" aria-busy={line?.kind === "testing" || undefined}>
              {line?.kind === "testing" ? "Stop test" : "Test connection"}
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

// Opened from a connection tab, Settings starts with that connection's own settings, in a group above the app-wide
// ones (Global). Opened from Home there is no connection: only Global shows, without its heading.
function SettingsModal({ section: initial, onClose }: { section?: SettingsSection; onClose: () => void }) {
  const conn = useStore((s) => (s.view === "conn" && s.currentId ? s.conns.find((c) => c.id === s.currentId) : undefined));
  const [section, setSection] = useState<SettingsSection>(initial ?? (conn ? "conn-security" : "appearance"));
  const connItems: [SettingsSection, string, ReactNode][] = [
    ["conn-security", "Security", <ShieldCheck {...ico} key="cs" />],
    ["conn-queries", "Queries", <Terminal {...ico} key="cq" />],
  ];
  const items: [SettingsSection, string, ReactNode][] = [
    ["appearance", "Appearance", <Type {...ico} key="a" />],
    ["queries", "Queries", <Terminal {...ico} key="q" />],
    ["security", "Security", <ShieldCheck {...ico} key="s" />],
    ["data", "Data on this Mac", <Lock {...ico} key="d" />],
    ["updates", "Updates", <CircleArrowDown {...ico} key="u" />],
  ];
  const navItem = ([k, label, icon]: [SettingsSection, string, ReactNode]) => (
    <li key={k}>
      <button type="button" aria-current={section === k} onClick={() => setSection(k)}>
        {icon}
        {label}
      </button>
    </li>
  );
  return (
    <Shell title="Settings" onClose={onClose} wide>
      <div className="vars settings">
        <ul>
          {conn && (
            <li className="group">
              <span>Connection</span>
              <span className="cx-h-note">{conn.name}</span>
            </li>
          )}
          {conn && connItems.map(navItem)}
          {conn && <li className="group">Global</li>}
          {items.map(navItem)}
        </ul>
        {section === "conn-security" && conn ? (
          <ConnSecurityPane key={conn.id} conn={conn} />
        ) : section === "conn-queries" && conn ? (
          <ConnQueriesPane key={conn.id} conn={conn} />
        ) : section === "queries" ? (
          <QueriesPane />
        ) : section === "security" ? (
          <SecurityPane />
        ) : section === "updates" ? (
          <UpdatesPane />
        ) : section === "data" ? (
          <DataPane />
        ) : (
          <AppearancePane />
        )}
      </div>
    </Shell>
  );
}

type Tri = "app" | "on" | "off";
/** A per-connection switch that may follow Settings: missing = "app" (Use Settings). */
const tri = (b?: boolean): Tri => (b === undefined ? "app" : b ? "on" : "off");
const fromTri = (t: Tri) => (t === "app" ? undefined : t === "on");

/** Settings › Connection: saves the open connection as its fields change, one save after another. */
function useConnSave(id: string) {
  const chain = useRef(Promise.resolve());
  const [err, setErr] = useState("");
  const save = (patch: Partial<Conn>, opts: { done?: () => void; failed?: () => void } = {}) => {
    chain.current = chain.current.then(async () => {
      const st = useStore.getState();
      const cur = st.conns.find((c) => c.id === id);
      if (!cur) return;
      try {
        // null keeps the keychain password as it is
        await api.saveConnection({ ...cur, ...patch }, null);
        await st.refreshConns();
        setErr("");
        opts.done?.();
      } catch (e) {
        setErr(errText(e));
        opts.failed?.();
      }
    });
  };
  return [save, err] as const;
}

/** Settings › Connection › Security: the level, what it asks about, and the warnings (SQL). */
function ConnSecurityPane({ conn }: { conn: Conn }) {
  const passSet = useStore((st) => st.pass.set);
  const [save, err] = useConnSave(conn.id);
  const mongo = conn.engine === "mongo";
  const redis = conn.engine === "redis";
  const [level, setLevel] = useState(conn.level);
  const [protection, setProtection] = useState<Protection>({ touchId: !!conn.touchId, window: conn.unlockWindow ?? 0, list: conn.protect ?? kindsOf(conn.engine) });
  const [warn, setWarn] = useState<Warn>({ limit: tri(conn.warnBigLimit), update: tri(conn.warnUpdateAll) });
  // a Strict connection stays open for lowering only while this pane is open
  useEffect(() => () => void api.lockProtect().catch(() => {}), []);
  // a save that failed (Strict still locked) puts back what is saved
  const revert = () => {
    const c = useStore.getState().conns.find((x) => x.id === conn.id);
    if (!c) return;
    setLevel(c.level);
    setProtection({ touchId: !!c.touchId, window: c.unlockWindow ?? 0, list: c.protect ?? kindsOf(c.engine) });
    setWarn({ limit: tri(c.warnBigLimit), update: tri(c.warnUpdateAll) });
  };
  // Touch ID and the unlock window mean something only under Strict
  const strictOnly = (l: SecurityLevel, p: Protection) => ({ touchId: (l === "strict" && p.touchId) || undefined, unlockWindow: l === "strict" && p.window ? p.window : undefined });
  return (
    <div className="set-pane conn-pane">
      <SecuritySection
        title={
          <>
            Security <span className="cx-h-note">{conn.name} only</span>
          </>
        }
        connId={conn.id}
        level={level}
        onLevel={(l) => {
          setLevel(l);
          save({ level: l, ...strictOnly(l, protection) }, { failed: revert });
        }}
        value={protection}
        onChange={(p) => {
          setProtection(p);
          save({ protect: storedList(p.list, conn.engine), ...strictOnly(level, p) }, { failed: revert });
        }}
        lockable={conn.level === "strict" && passSet}
        mongo={mongo}
        redis={redis}
        follow="Global"
        warn={mongo || redis ? undefined : warn}
        onWarn={(w) => {
          setWarn(w);
          save({ warnBigLimit: fromTri(w.limit), warnUpdateAll: fromTri(w.update) }, { failed: revert });
        }}
      />
      {err && (
        <p className="help err" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

/** Settings › Connection › Queries: the values that follow Global › Queries while empty. */
function ConnQueriesPane({ conn }: { conn: Conn }) {
  const settings = useStore((s) => s.settings);
  const [save, err] = useConnSave(conn.id);
  const lite = conn.engine === "sqlite";
  const mongo = conn.engine === "mongo";
  const redis = conn.engine === "redis";
  const [rowLimit, setRowLimit] = useState(conn.rowLimit ? String(conn.rowLimit) : "");
  const [stmtTimeout, setStmtTimeout] = useState(conn.statementTimeout ? String(conn.statementTimeout) : "");
  const [keepHistory, setKeepHistory] = useState<Tri>(tri(conn.keepHistory));
  const [heartbeat, setHeartbeat] = useState<Tri>(tri(conn.heartbeat));
  // the two numbers save once typing pauses, and when the pane closes
  const nums = useRef({ rowLimit, stmtTimeout });
  nums.current = { rowLimit, stmtTimeout };
  const savedNums = useRef(nums.current);
  const flush = useRef(() => {});
  flush.current = () => {
    const n = nums.current;
    if (n.rowLimit === savedNums.current.rowLimit && n.stmtTimeout === savedNums.current.stmtTimeout) return;
    savedNums.current = n;
    save({ rowLimit: optNum(n.rowLimit), statementTimeout: optNum(n.stmtTimeout) });
  };
  useEffect(() => {
    const t = setTimeout(() => flush.current(), 500);
    return () => clearTimeout(t);
  }, [rowLimit, stmtTimeout]);
  useEffect(() => () => flush.current(), []);
  return (
    <div className="set-pane conn-pane">
      <h3>
        Queries <span className="cx-h-note">{conn.name} only · empty uses Global</span>
      </h3>
      <div className="set-list">
        <SetItem
          label={redis ? "Page size" : "Row limit"}
          desc={redis ? "How many fields, items or members a key tab reads at a time" : mongo ? "Added to a find or aggregate that has no limit of its own" : "Added to a select that has no limit of its own"}
          htmlFor="cn-limit"
        >
          <OptUnit id="cn-limit" unit="rows" placeholder={String(settings.rowLimit ?? DEFAULT_ROW_LIMIT)} value={rowLimit} onChange={setRowLimit} />
        </SetItem>
        <SetItem label={redis ? "Command timeout" : "Statement timeout"} desc={redis ? "Capy gives up waiting; Redis can't stop a command once it starts" : "0 lets a statement run as long as it takes"} htmlFor="cn-timeout">
          <OptUnit id="cn-timeout" unit="s" placeholder={String(settings.statementTimeout ?? 30)} value={stmtTimeout} onChange={setStmtTimeout} />
        </SetItem>
        <SetItem label="Keep query history" desc="Off keeps this connection's runs out of History" htmlFor="cn-hist">
          <Select
            id="cn-hist"
            className="field set-choice"
            value={keepHistory}
            onChange={(e) => {
              const v = e.target.value as Tri;
              setKeepHistory(v);
              save({ keepHistory: fromTri(v) }, { failed: () => setKeepHistory(tri(conn.keepHistory)) });
            }}
          >
            <option value="app">Use Global ({settings.keepHistory !== false ? "on" : "off"})</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </Select>
        </SetItem>
        {!lite && (
          <SetItem label="Connection heartbeat" desc={redis ? "Keeps idle connections open with PING" : mongo ? "Keeps idle connections open with a ping command" : "Keeps idle connections open with select 1"} htmlFor="cn-beat">
            <Select
              id="cn-beat"
              className="field set-choice"
              value={heartbeat}
              onChange={(e) => {
                const v = e.target.value as Tri;
                setHeartbeat(v);
                // the heartbeat is read when the connection opens: a live one reconnects to pick it up
                save(
                  { heartbeat: fromTri(v) },
                  {
                    done: () => {
                      const st = useStore.getState();
                      if (st.sessions[conn.id]) void st.reconnect(conn.id);
                    },
                    failed: () => setHeartbeat(tri(conn.heartbeat)),
                  },
                );
              }}
            >
              <option value="app">Use Global ({settings.heartbeat ? "on" : "off"})</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </Select>
          </SetItem>
        )}
      </div>
      {err && (
        <p className="help err" role="alert">
          {err}
        </p>
      )}
    </div>
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
        <SetItem label="Connection heartbeat" desc="Keeps idle connections open, for servers that drop them" htmlFor="set-beat">
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

type SubKind = PassKind;

function SecurityPane() {
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const passSet = useStore((st) => st.pass.set);
  const level = s.defaultLevel ?? DEFAULT_LEVEL;
  // lowering the default from Strict asks for the passphrase, as lowering a connection does
  const [lowering, setLowering] = useState<SecurityLevel | null>(null);

  return (
    <div className="set-pane">
      <h3>Security</h3>
      <p className="pane-note">
        The passphrase is one for the whole app. Each connection keeps its own security level (None, Low or Strict) and the statements it asks about, set in its
        Options or the tabs bar. The warnings here hold for every SQL connection that does not set its own.
      </p>
      <div className="set-list">
        <SetItem label="Default security level for new connections" desc="Existing connections keep their own" htmlFor="sec-level">
          <LevelSelect
            id="sec-level"
            value={level}
            off={(v) => v === "strict" && !passSet && level !== "strict" && "Set a passphrase below first"}
            onChange={(v) => (level === "strict" && v !== "strict" && passSet ? setLowering(v) : void set({ defaultLevel: v }))}
          />
        </SetItem>
      </div>
      {lowering &&
        createPortal(
          <AuthDialog kind="lower" defaults to={lowering} touch={false} submit={(a) => set({ defaultLevel: lowering }, a)} onClose={() => setLowering(null)} />,
          document.body,
        )}
      <PassphraseManager />
      <h3 className="cx-h">
        Warnings <span className="cx-h-note">For every connection that does not set its own</span>
      </h3>
      <div className="set-list">
        {WARNINGS.map(([k, key, label, desc]) => (
          <SetItem key={k} label={label} desc={desc} htmlFor={`sec-warn-${k}`}>
            <input id={`sec-warn-${k}`} className="switch" type="checkbox" role="switch" checked={s[key] !== false} onChange={(e) => void set({ [key]: e.target.checked ? undefined : false })} />
          </SetItem>
        ))}
      </div>
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
              {pass.set ? "Set, in the macOS login keychain" : "Not set. With one, the statements you pick ask for it before they run"}
              {/* a reset cannot be prevented (the Mac's owner can always do it), so it is never silent */}
              {pass.set && s.passphraseResetAt && <span className="pass-reset"> Reset with Touch ID or your login password {when(s.passphraseResetAt)}.</span>}
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
          <PassphraseDialog
            kind={sub}
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
/** The warnings a SQL connection asks before a run, whatever its level; "app" follows Settings › Security. */
interface Warn {
  limit: Tri;
  update: Tri;
}

/** The two warnings: [key in Warn, key in Settings, label, description]. */
const WARNINGS: [keyof Warn, "warnBigLimit" | "warnUpdateAll", ReactNode, string][] = [
  ["limit", "warnBigLimit", "More than 100 rows", "A select whose LIMIT, or the row limit Capy tacks on, is above 100"],
  [
    "update",
    "warnUpdateAll",
    <>
      <code className="stmt">UPDATE</code> without <code className="stmt">WHERE</code>
    </>,
    "Changes every row of its table, even a table of one row",
  ],
];

function SecuritySection({
  title,
  connId,
  level,
  onLevel,
  value,
  onChange,
  lockable,
  mongo = false,
  redis = false,
  warn,
  onWarn,
  follow = "Global",
}: {
  /** Settings › Connection: the pane's own heading in place of the dialog's sub-head */
  title?: ReactNode;
  connId?: string;
  level: SecurityLevel;
  onLevel: (l: SecurityLevel) => void;
  value: Protection;
  onChange: (p: Protection) => void;
  lockable: boolean;
  /** MongoDB: write methods, grouped by kind, in place of SQL statements */
  mongo?: boolean;
  /** Redis: commands, grouped by the type they write to */
  redis?: boolean;
  /** SQL only: the warnings, shown when given */
  warn?: Warn;
  onWarn?: (w: Warn) => void;
  /** what "Use …" follows: the Global settings */
  follow?: string;
}) {
  const settings = useStore((st) => st.settings);
  const kinds = mongo ? MONGO_ALL : redis ? REDIS_ALL : ALL_KINDS;
  const rows: [string, ReactNode, string?][] =
    mongo || redis
      ? (mongo ? MONGO_KINDS : REDIS_KINDS).map(([k, methods, tag]) => [k, methods.map((m) => <code key={m} className="stmt">{m}</code>), tag])
      : STATEMENTS.map(([k, tag]) => [k, <code className="stmt">{k}</code>, tag]);
  const pass = useStore((st) => st.pass);
  // Touch ID opens it for changes only when the connection, as saved, allows Touch ID
  const savedTouch = useStore((st) => !!st.conns.find((c) => c.id === connId)?.touchId);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  // a lower level picked while Strict is locked: the same ask as the tabs bar's level picker
  const [lowering, setLowering] = useState<SecurityLevel | null>(null);
  const connName = useStore((st) => st.conns.find((c) => c.id === connId)?.name ?? "");
  const locked = lockable && !unlocked;
  // the passphrase (or Touch ID) opens the connection for changes; a rejection stays in the ask
  const unlock = async (a: Approval) => {
    await api.unlockProtect(connId ?? "", a.kind === "passphrase" ? a.passphrase : undefined, a.kind === "touchId");
    setUnlocked(true);
  };
  const put = (p: Partial<Protection>) => onChange({ ...value, ...p });
  const desc = LEVELS.find(([l]) => l === level)?.[2]?.replace("statement", redis ? "command" : "statement");

  return (
    <>
      {title ? <h3>{title}</h3> : <h3 className="cx-h">Security</h3>}
      <div className="set-list">
        <SetItem label="Security level" desc={locked ? "Locked. Lowering asks for the passphrase" : desc} htmlFor="c-level">
          <LevelSelect
            id="c-level"
            commands={redis}
            value={level}
            off={(v) => v === "strict" && !pass.set && level !== "strict" && "Set a passphrase in Settings first"}
            onChange={(v) => (locked && v !== "strict" ? setLowering(v) : onLevel(v))}
          />
        </SetItem>
        {level === "strict" && (
          <>
            <SetItem label="Allow Touch ID" htmlFor="c-touch" sub desc={pass.touchIdAvailable ? undefined : "Touch ID isn't set up on this Mac"}>
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
              {mongo ? "Writes to ask about" : redis ? "Commands to ask about" : "Statements to ask about"} <span className="cx-h-note">For this connection</span>
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
                <span>{unlocked ? "Lock" : "Unlock"}</span>
              </button>
            )}
          </div>
          <div className="set-list stmts">
            {rows.map(([k, label, tag], i) => (
              <SetItem
                key={k}
                htmlFor={`c-prot-${i}`}
                label={
                  <>
                    {label}
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
                  onChange={(e) => put({ list: kinds.filter((x) => (x === k ? e.target.checked : value.list.includes(x))) })}
                />
              </SetItem>
            ))}
          </div>
        </>
      )}
      {warn && onWarn && (
        <>
          <h3 className="cx-h">
            Warnings <span className="cx-h-note">Ask even when the security level is None</span>
          </h3>
          <div className="set-list">
            {/* not behind the passphrase: a locked Strict connection can still change them */}
            {WARNINGS.map(([k, key, label, desc]) => (
              <SetItem key={k} label={label} desc={desc} htmlFor={`c-warn-${k}`}>
                <Select id={`c-warn-${k}`} className="field set-choice" value={warn[k]} onChange={(e) => onWarn({ ...warn, [k]: e.target.value as Tri })}>
                  <option value="app">
                    Use {follow} ({settings[key] !== false ? "on" : "off"})
                  </option>
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </Select>
              </SetItem>
            ))}
          </div>
        </>
      )}
      {/* portals: over Settings or the connection dialog (a form, which cannot hold another), where the store's single modal cannot be */}
      {lowering &&
        connId &&
        createPortal(
          <AuthDialog
            kind="lower"
            connName={connName}
            engine={mongo ? "mongo" : redis ? "redis" : undefined}
            to={lowering}
            touch={savedTouch && pass.touchIdAvailable}
            submit={async (a) => {
              await unlock(a);
              onLevel(lowering);
            }}
            onClose={() => setLowering(null)}
          />,
          document.body,
        )}
      {unlocking &&
        connId &&
        createPortal(
          <AuthDialog
            kind="unlock"
            connName={connName}
            engine={mongo ? "mongo" : redis ? "redis" : undefined}
            touch={savedTouch && pass.touchIdAvailable}
            submit={unlock}
            onClose={() => setUnlocking(false)}
          />,
          document.body,
        )}
    </>
  );
}

const releaseLink = (label: string) => (
  <button type="button" className="upd-link" onClick={() => void openUrl(RELEASES_URL)}>
    {label}
    <ExternalLink {...ico} />
  </button>
);

/**
 * Settings > Updates (voidHTTP's UpdatesPane), drawn as an onsen (preview .hallmark/preview/settings.html, Updates):
 * the capy soaking in the middle as in About, the version under it, the updater's state as a pill, one line of detail,
 * the action below. Then the launch check and release notes. A dev build never checks, so an update never replaces it.
 */
function UpdatesPane() {
  const auto = useStore((s) => s.settings.autoUpdateCheck !== false);
  const setSettings = useStore((s) => s.setSettings);
  const u = useUpdates();
  const st = u.state;
  const onsen = useRef<HTMLDivElement>(null);

  // a click on the capy drops it back into the water, as in About
  const ping = () => {
    const el = onsen.current;
    if (!el) return;
    el.classList.remove("ping");
    void el.offsetWidth;
    el.classList.add("ping");
  };

  const checkAgain = (
    <button type="button" className="btn" disabled={st.kind === "checking"} onClick={() => void u.check()}>
      <RefreshCw {...ico} />
      Check again
    </button>
  );
  const spin = <LoaderCircle {...ico} className="ico upd-spin" />;

  let pill: [string, ReactNode, ReactNode];
  let sub: string;
  let action: ReactNode = checkAgain;
  let progress: number | undefined;
  if (DEV_BUILD) {
    pill = ["dev", null, "dev build"];
    sub = DEV_BUILD.branch ? `Branch ${DEV_BUILD.branch} · updates are off here` : "Updates are off here";
    action = releaseLink("Get the release");
  } else if (st.kind === "checking") {
    pill = ["busy", spin, "Checking"];
    sub = "Asking GitHub what's new…";
  } else if (st.kind === "current") {
    pill = ["ok", <CircleCheck {...ico} />, "Up to date"];
    sub = `Nothing newer out there.${u.checkedAt ? ` Checked ${ago(u.checkedAt)}.` : ""}`;
  } else if (st.kind === "available") {
    const date = releaseDate(st.date);
    pill = ["new", <CircleArrowDown {...ico} />, `${st.version} is out`];
    sub = date ? `Released ${date}. Grab it whenever.` : "Grab it whenever.";
    action = (
      <button type="button" className="btn btn--primary" onClick={() => void u.install()}>
        <CircleArrowDown {...ico} />
        Install update
      </button>
    );
  } else if (st.kind === "downloading") {
    const pct = st.total ? Math.floor((st.received / st.total) * 100) : undefined;
    pill = ["busy", spin, `Downloading ${st.version}${pct !== undefined ? ` · ${pct}%` : "…"}`];
    sub = `${st.total ? `${mb(st.received)} of ${mb(st.total)} MB` : `${mb(st.received)} MB`} · go on, keep working`;
    action = null;
    progress = pct ?? 0;
  } else if (st.kind === "installing") {
    pill = ["busy", spin, `Installing ${st.version}`];
    sub = "Downloaded, signature checks out";
    action = null;
    progress = 100;
  } else if (st.kind === "ready") {
    pill = ["ok", <CircleCheck {...ico} />, `${st.version} is in`];
    sub = "Restart ypacapy to commit it.";
    action = (
      <button type="button" className="btn btn--primary" onClick={() => void u.restart()}>
        <RefreshCw {...ico} />
        Restart now
      </button>
    );
  } else if (st.kind === "error") {
    const install = u.failed === "install";
    pill = ["bad", <TriangleAlert {...ico} />, install ? `Couldn't install ${u.target ?? "the update"}` : "Couldn't check for updates"];
    sub = st.message;
    if (install)
      action = (
        <button type="button" className="btn" onClick={() => void u.install()}>
          Try again
        </button>
      );
  } else {
    pill = ["", null, "Not checked yet"];
    sub = "Hit the button to take a look.";
  }

  return (
    <div className="set-pane">
      <h3>Updates</h3>
      <div className="upd-hero" aria-live="polite">
        <div className="about-onsen upd-onsen ping" ref={onsen} aria-hidden="true" onClick={ping}>
          <span className="steam">
            <b />
            <b />
            <b />
          </span>
          <i />
          <i />
          <i />
          <img src="/app-icon.png" alt="" />
        </div>
        <div className="upd-hero-name">
          ypa<span>capy</span> <code>{DEV_BUILD?.describe || u.version}</code>
        </div>
        <span className={`upd-pill ${pill[0]}`}>
          {pill[1]}
          {pill[2]}
        </span>
        <p className="upd-hero-sub" title={sub}>
          {sub}
        </p>
        {progress !== undefined && <i className="upd-hero-prog" style={{ "--p": `${progress}%` } as CSSProperties} />}
        {action && <div className="upd-hero-ctl">{action}</div>}
      </div>
      <div className="set-list">
        <div className="set-item" aria-disabled={DEV_BUILD ? "true" : undefined}>
          <div className="set-text">
            <label htmlFor="set-auto-update">Check automatically</label>
            <span className="desc">{DEV_BUILD ? "Off in dev builds, so nothing overwrites this one" : "Peek for a new version every time Capy wakes up"}</span>
          </div>
          <div className="set-ctl">
            {DEV_BUILD ? (
              <input id="set-auto-update" className="switch" type="checkbox" role="switch" checked={false} disabled readOnly />
            ) : (
              <input
                id="set-auto-update"
                className="switch"
                type="checkbox"
                role="switch"
                checked={auto}
                onChange={(e) => void setSettings({ autoUpdateCheck: e.target.checked ? undefined : false })}
              />
            )}
          </div>
        </div>
        <SetItem label="Release notes" desc="What's new, version by version">
          {releaseLink("Open on GitHub")}
        </SetItem>
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
        <SetItem label="Network">The databases you add, and GitHub for updates</SetItem>
      </div>
      <button type="button" className="btn" disabled={!dir} onClick={() => void revealItemInDir(dir).catch((e) => useStore.getState().showToast(errText(e)))}>
        <FolderOpen {...ico} />
        Show in Finder
      </button>
    </div>
  );
}
