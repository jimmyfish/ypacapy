export type Engine = "postgres" | "mysql" | "sqlite";
export type GuardLevel = "run" | "confirm" | "verify";
export type SslMode = "disable" | "prefer" | "require" | "verify-ca" | "verify-full";

/** connections.toml: one connection, never its password (that is in the keychain). */
export interface Conn {
  id: string;
  name: string;
  engine: Engine;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  /** SQLite: the database file, opened in place */
  file?: string;
  /** 1..6 */
  color: number;
  guard: GuardLevel;
  /** Options tab; each one missing = the value in Settings */
  rowLimit?: number;
  /** seconds */
  statementTimeout?: number;
  /** SSL (PostgreSQL, MySQL); missing = prefer */
  sslMode?: SslMode;
  /** CA certificate file */
  sslCa?: string;
  /** Advanced tab. PostgreSQL application_name; missing = ypacapy */
  appName?: string;
  /** seconds; missing = 15 */
  connectTimeout?: number;
  /** missing = Settings > Queries > Connection heartbeat */
  heartbeat?: boolean;
  lastOpened?: number;
}

/** settings.toml. Missing = default. */
export interface Settings {
  theme?: "light" | "dark";
  lightScheme?: string;
  darkScheme?: string;
  compact?: boolean;
  fontUi?: string;
  fontSizeUi?: number;
  fontTable?: string;
  fontSizeTable?: number;
  fontMono?: string;
  fontSizeCode?: number;
  /** Queries */
  rowLimit?: number;
  statementTimeout?: number;
  keepHistory?: boolean;
  heartbeat?: boolean;
  heartbeatEvery?: number;
  /** Security: statement kinds the write guard asks about (all when missing) */
  protect?: string[];
  /** write guard for new connections; missing = confirm */
  defaultGuard?: GuardLevel;
  touchId?: boolean;
  /** seconds a passphrase or Touch ID lasts; 0 asks every time */
  unlockWindow?: number;
  /** layout */
  sidebarWidth?: number;
  sidebarHidden?: boolean;
}

export const STATEMENTS: [string, string?][] = [["INSERT"], ["UPDATE"], ["DELETE"], ["REPLACE", "MySQL"], ["ALTER"], ["DROP"], ["TRUNCATE"], ["CREATE"], ["GRANT"], ["REVOKE"]];

export interface OpenInfo {
  server: string;
  databases: string[];
  database: string;
  schemas: string[];
  defaultSchema: string;
}

export interface TreeTable {
  name: string;
  kind: "table" | "view" | "matview" | "foreign";
  estimate: number | null;
}

export interface SchemaObjects {
  tables: TreeTable[];
  functions: string[];
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primary: boolean;
  references: string | null;
}

export interface TableInfo {
  columns: TableColumn[];
  indexes: { name: string; columns: string; method: string; unique: boolean; primary: boolean }[];
  foreignKeys: { name: string; column: string; references: string; onDelete: string }[];
}

export interface ColMeta {
  name: string;
  type: string;
}

export interface ResultSet {
  columns: ColMeta[];
  rows: (string | null)[][];
  truncated: boolean;
}

export interface Ask {
  kind: "ask";
  kinds: string[];
  level: GuardLevel;
  touchId: boolean;
  unreadable: boolean;
  error: string | null;
}

export type RunOutcome =
  | {
      kind: "done";
      sets: ResultSet[];
      messages: string[];
      ms: number;
      limit: number | null;
      affected: number | null;
      ddl: boolean;
      lastIsQuery: boolean;
      server: string;
    }
  | Ask
  | { kind: "error"; title: string; says: string | null; message: string; hint: string | null; lost: boolean; ms: number }
  | { kind: "cancelled"; ms: number; timeout: boolean };

export type Approval = { kind: "confirm" } | { kind: "passphrase"; passphrase: string } | { kind: "touchId" };

export interface HistoryEntry {
  id: number;
  connId: string;
  connName: string;
  engine: Engine;
  database: string;
  sql: string;
  startedAt: number;
  ms: number;
  rows: number | null;
  status: "ok" | "error" | "cancelled";
  error: string | null;
}

export interface Saved {
  id: string;
  folder: string;
  name: string;
  sql: string;
  connId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RunState {
  status: "idle" | "running" | "done";
  runId?: string;
  startedAt?: number;
  outcome?: RunOutcome;
}

export interface QueryTab {
  id: string;
  kind: "query";
  title: string;
  sql: string;
  /** the saved query this tab edits, and its text when last saved */
  savedId?: string;
  savedFolder?: string;
  savedSql?: string;
  run: RunState;
}

export interface TableTab {
  id: string;
  kind: "table";
  schema: string;
  table: string;
  where: string;
  offset: number;
  view: "rows" | "columns" | "indexes";
  run: RunState;
  info?: TableInfo;
  infoError?: string;
}

export type Tab = QueryTab | TableTab;

export interface SchemaNode {
  state: "loading" | "loaded" | "error";
  data?: SchemaObjects;
  error?: string;
}

/** One open connection: its pool on the Rust side, its tree cache and tabs here. */
export interface Session {
  status: "opening" | "open" | "error";
  error?: string;
  info?: OpenInfo;
  database: string;
  schema: string;
  /** the schema tree, per schema, cached for the session (Refresh, DDL and Reconnect clear it) */
  tree: Record<string, SchemaNode>;
  expanded: Record<string, boolean>;
  tabs: Tab[];
  activeTabId: string | null;
}
