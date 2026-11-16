import type { Conn } from "../types";
import { HardDrive, Server, ico } from "./Icon";

/** voidHTTP's project tile: a server for PostgreSQL and MySQL, a drive for an SQLite file, in the connection's colour. */
export function ConnTile({ conn, small }: { conn: Pick<Conn, "engine" | "color">; small?: boolean }) {
  const n = Math.min(6, Math.max(1, conn.color || 1));
  const Icon = conn.engine === "sqlite" ? HardDrive : Server;
  return (
    <span className={`proj-tile${small ? " proj-tile--sm" : ""}`} style={{ "--fg": `var(--proj-${n}-fg)`, "--bg": `var(--proj-${n}-bg)` } as React.CSSProperties}>
      <Icon {...ico} />
    </span>
  );
}
