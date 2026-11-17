export type Engine = "postgres" | "mysql" | "sqlite";
/**
 * A connection's security level, for the statements it asks about (Conn.protect): None runs them, Low asks to
 * confirm, Strict asks for the passphrase (needs one set, in Settings › Security). Other statements run.
 */
export type SecurityLevel = "none" | "low" | "strict";
/** Level for a new connection when Settings › Security has no default stored. Existing connections keep their own. */
export const DEFAULT_LEVEL: SecurityLevel = "none";
/** Each level, its name and what it does: the tabs bar menu, Options and Settings */
export const LEVELS: [SecurityLevel, string, string][] = [
  ["none", "None", "Every statement runs"],
  ["low", "Low", "Confirm the picked statements"],
  ["strict", "Strict", "Passphrase for the picked statements"],
];
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
  /** 1..8, src/lib/connColors.ts */
  color: number;
  /** Home groups connections under this name; missing = ungrouped */
  group?: string;
  level: SecurityLevel;
  /** Low and Strict: the statements they ask about; missing = every kind */
  protect?: string[];
  /** Strict: Touch ID may stand in for the passphrase */
  touchId?: boolean;
  /** Strict: seconds this connection stays unlocked after the passphrase; missing = ask every time */
  unlockWindow?: number;
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
  /** ms since the epoch; missing on connections saved before it was recorded */
  createdAt?: number;
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
  /** security level for new connections; missing = DEFAULT_LEVEL */
  defaultLevel?: SecurityLevel;
  /** ms: when the passphrase was last reset with macOS authentication (Forgot passphrase), shown in Security */
  passphraseResetAt?: number;
  /** layout */
  sidebarWidth?: number;
  sidebarHidden?: boolean;
  /** Home: the connection groups shown folded */
  closedGroups?: string[];
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

/** a column for the editor's autocomplete */
export interface ColumnBrief {
  name: string;
  type: string;
  primary: boolean;
}

/** one table's columns as autocomplete knows them, by "schema.table" */
export type ColumnsEntry = { state: "loading"; req: string } | { state: "loaded"; cols: ColumnBrief[] } | { state: "error" };

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
  /** low: confirm; strict: the passphrase */
  level: "low" | "strict";
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
  /** the SQL that gave the outcome (the selection, when only that ran) */
  sql?: string;
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
  /** columns autocomplete has read, per "schema.table"; cleared with the tree */
  columns: Record<string, ColumnsEntry>;
  expanded: Record<string, boolean>;
  tabs: Tab[];
  activeTabId: string | null;
}
