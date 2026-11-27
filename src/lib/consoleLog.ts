import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";

/**
 * Console history: every statement ypacapy sent to a connection, as Rust reports it ("console-entry"): what you
 * typed in a console tab (who "you") and what ypacapy sent on its own (who "app": table reads, saves, the schema
 * tree, columns, autocomplete, the heartbeat). Kept in memory for this run only, the last CAP per connection.
 */
export interface ConsoleEntry {
  connId: string;
  /** ms since the epoch, when it was sent */
  at: number;
  who: "you" | "app";
  /** where it came from: "Query 1", "orders · Rows", "Schema tree", "Heartbeat" */
  what: string;
  /** the statement or command as sent */
  text: string;
  /** "20 rows", "ok", "error", "cancelled" */
  result: string;
  ms: number;
  flag?: "err" | "write" | "ping" | "cancel";
  error?: string;
  /** this run's order, unique: the row's key */
  seq: number;
}

const CAP = 1000;
let seq = 0;

interface ConsoleLog {
  byConn: Record<string, ConsoleEntry[]>;
  push(e: Omit<ConsoleEntry, "seq">): void;
  clear(connId: string): void;
}

export const useConsoleLog = create<ConsoleLog>()((set) => ({
  byConn: {},
  push: (e) =>
    set((s) => {
      const list = s.byConn[e.connId] ?? [];
      const next = list.length >= CAP ? list.slice(list.length - CAP + 1) : list.slice();
      next.push({ ...e, seq: ++seq });
      return { byConn: { ...s.byConn, [e.connId]: next } };
    }),
  clear: (connId) => set((s) => ({ byConn: { ...s.byConn, [connId]: [] } })),
}));

/** Starts listening for Rust's entries; returns the stop. */
export function listenConsole(): () => void {
  const off = listen<Omit<ConsoleEntry, "seq">>("console-entry", (ev) => useConsoleLog.getState().push(ev.payload));
  return () => void off.then((f) => f());
}
