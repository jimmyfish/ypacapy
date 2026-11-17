import type { Conn } from "../types";
import { connColorId } from "../lib/connColors";
import { HardDrive, Server, ico } from "./Icon";
import { EngineIcon } from "./EngineIcon";

/**
 * voidHTTP's project tile in the connection's colour: a server for PostgreSQL and MySQL, a drive for an SQLite file.
 * `typed` (Home cards) shows the engine's own glyph instead: the PostgreSQL elephant, MySQL dolphin or SQLite feather.
 */
export function ConnTile({ conn, small, typed }: { conn: Pick<Conn, "engine" | "color">; small?: boolean; typed?: boolean }) {
  const n = connColorId(conn.color);
  const Icon = conn.engine === "sqlite" ? HardDrive : Server;
  return (
    <span className={`proj-tile${small ? " proj-tile--sm" : ""}`} style={{ "--fg": `var(--proj-${n}-fg)`, "--bg": `var(--proj-${n}-bg)` } as React.CSSProperties}>
      {typed ? <EngineIcon engine={conn.engine} size={small ? 13 : 22} /> : <Icon {...ico} />}
    </span>
  );
}
