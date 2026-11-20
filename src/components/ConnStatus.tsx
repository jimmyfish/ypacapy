import "./ConnStatus.css";
import { useStore } from "../store";
import { clockOf } from "../lib/time";
import type { Conn, Link, Settings } from "../types";
import { RefreshCw, Unplug } from "./Icon";

/** The heartbeat is on for this connection: its own choice, else Settings. SQLite is never pinged. */
export const beatOn = (c: Conn | undefined, s: Settings) => !!c && c.engine !== "sqlite" && (c.heartbeat ?? s.heartbeat === true);

const LABEL: Record<Link, string> = { connecting: "Connecting", connected: "Connected", disconnected: "Disconnected", reconnecting: "Reconnecting" };

/** The connection's link, heartbeat on only; undefined when there's nothing to show. */
export function useLink(id: string | null | undefined): Link | undefined {
  const on = useStore((s) => beatOn(s.conns.find((c) => c.id === id), s.settings));
  const link = useStore((s) => (id ? s.sessions[id]?.link : undefined));
  return on ? link : undefined;
}

/** Turning refresh-cw while (re)connecting; a dot once it settles, green or red. */
function Mark({ link, className = "", label }: { link: Link; className?: string; label?: string }) {
  return (
    <span className={`cs-mark ${className}`} data-cs={link} {...(label ? { role: "img", "aria-label": label, title: LABEL[link] } : { "aria-hidden": true })}>
      <RefreshCw className="cs-spin" aria-hidden="true" />
    </span>
  );
}

/** On a connection tab in the title strip, so a drop shows while another tab is in front. */
export function TabLink({ conn }: { conn: Conn }) {
  const link = useLink(conn.id);
  return link ? <Mark link={link} className="cs-tab" label={`${conn.name}: ${LABEL[link]}`} /> : null;
}

/** The foot of the sidebar: the current connection's status, the word only. */
export function SideLink() {
  const id = useStore((s) => s.currentId);
  const link = useLink(id);
  if (!link) return null;
  return (
    <div className="conn-status" data-cs={link} role="status">
      <Mark link={link} />
      <span className="cs-label">{LABEL[link]}</span>
    </div>
  );
}

/** host:port, or the host alone for an SRV name or a seed list */
function where(c: Conn): string {
  const host = c.host || "localhost";
  if (c.engine === "mongo" && (c.srv || host.includes(","))) return host;
  return `${host}:${c.port ?? (c.engine === "mysql" ? 3306 : c.engine === "mongo" ? 27017 : c.engine === "redis" ? 6379 : 5432)}`;
}

/**
 * Dropped while nothing ran: a bar over the work area until the heartbeat gets an answer again or Reconnect works.
 * A run that lost the connection says so in its own results instead.
 */
export function LinkBar() {
  const id = useStore((s) => s.currentId);
  const conn = useStore((s) => s.conns.find((c) => c.id === s.currentId));
  const session = useStore((s) => (s.currentId ? s.sessions[s.currentId] : undefined));
  const every = useStore((s) => s.settings.heartbeatEvery ?? 30);
  const link = useLink(id);
  if (!conn || !session || session.status !== "open" || (link !== "disconnected" && link !== "reconnecting")) return null;
  const tab = session.tabs.find((t) => t.id === session.activeTabId);
  const o = tab && "run" in tab ? (tab.run as { outcome?: { kind: string; lost?: boolean } }).outcome : undefined;
  if (o?.kind === "error" && o.lost) return null;
  const retry = link === "reconnecting";
  return (
    <div className="hb-bar" data-cs={link} role="status">
      <Unplug className="hb-bar-ico" aria-hidden="true" />
      <div className="hb-bar-text">
        <strong>{retry ? `Checking ${conn.name} again…` : `${conn.name} stopped answering`}</strong>
        <span>{retry ? `Pinging ${where(conn)}. Nothing you typed is lost.` : `No reply from ${where(conn)} since ${clockOf(session.downAt ?? Date.now())}. Trying again every ${every} s.`}</span>
      </div>
      <button type="button" className="btn" disabled={retry} onClick={() => void useStore.getState().reconnect(conn.id)}>
        Reconnect
      </button>
    </div>
  );
}

/** Under a lost run's Reconnect: the heartbeat keeps trying meanwhile. */
export function LinkNote() {
  const id = useStore((s) => s.currentId);
  const every = useStore((s) => s.settings.heartbeatEvery ?? 30);
  const link = useLink(id);
  if (link !== "disconnected" && link !== "reconnecting") return null;
  return <span className="hint-line">Heartbeat keeps trying every {every} s. The sidebar says Connected when the server's back.</span>;
}
