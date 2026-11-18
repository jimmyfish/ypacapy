export type Engine = "postgres" | "mysql" | "sqlite" | "mongo";
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
/** MongoDB TLS; missing = on for an SRV record, off for a host and port */
export type MongoTls = "off" | "on" | "insecure";
export type ReadPref = "primary" | "primaryPreferred" | "secondary" | "secondaryPreferred" | "nearest";

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
  /** MongoDB: the database the user is defined in; missing = admin */
  authSource?: string;
  /** MongoDB: host is a DNS seed list name (mongodb+srv), no port */
  srv?: boolean;
  /** MongoDB TLS; its CA file is sslCa */
  tls?: MongoTls;
  /** MongoDB: PEM with the client certificate and key, for X.509 sign-in */
  tlsCert?: string;
  replicaSet?: string;
  /** missing = primary */
  readPref?: ReadPref;
  /** MongoDB: this host only, not the rest of its replica set */
  direct?: boolean;
  /** MongoDB: seconds between the driver's hello to each host; missing = 60 */
  serverCheck?: number;
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
  /** Updates: check GitHub for a new version on launch; missing = on (as voidHTTP) */
  autoUpdateCheck?: boolean;
}

export const STATEMENTS: [string, string?][] = [["INSERT"], ["UPDATE"], ["DELETE"], ["REPLACE", "MySQL"], ["ALTER"], ["DROP"], ["TRUNCATE"], ["CREATE"], ["GRANT"], ["REVOKE"]];
/**
 * MongoDB's guard kinds (guard::MONGO_KINDS in Rust), each with the methods it covers and a tag. An aggregate
 * that ends in $out or $merge writes, so it is one; a plain aggregate is a read.
 */
export const MONGO_KINDS: [string, string[], string?][] = [
  ["insert", ["insertOne", "insertMany"]],
  ["update", ["updateOne", "updateMany", "replaceOne"]],
  ["delete", ["deleteOne", "deleteMany"]],
  ["findAndModify", ["findOneAndUpdate", "findOneAndReplace", "findOneAndDelete"]],
  ["bulkWrite", ["bulkWrite"]],
  ["$out/$merge", ["$out", "$merge"], "In aggregate"],
  ["drop", ["drop", "dropDatabase", "dropIndex"]],
  ["create", ["createCollection", "createIndex"]],
  ["rename", ["renameCollection", "collMod"]],
  ["users", ["createUser", "grantRolesToUser", "revokeRolesFromUser"]],
];

export interface OpenInfo {
  server: string;
  databases: string[];
  database: string;
  schemas: string[];
  defaultSchema: string;
}

export interface TreeTable {
  name: string;
  /** collection and timeseries: MongoDB */
  kind: "table" | "view" | "matview" | "foreign" | "collection" | "timeseries";
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
  /** MongoDB: the documents (canonical Extended JSON); lib/bson.ts turns them into columns and rows */
  docs?: unknown[];
  /** MongoDB: a cell whose document has no such field, by row then column (not null: absent) */
  missing?: boolean[][];
}

/** MongoDB Info: one $collStats, read when the dialog opens */
export interface CollInfo {
  kind: string;
  count: number | null;
  avgSize: number | null;
  dataSize: number | null;
  storageSize: number | null;
  compression: string | null;
  indexSize: number | null;
  indexes: [string, number][];
  capped: boolean;
  validator: string | null;
  validationLevel: string | null;
  validationAction: string | null;
  readAt: number;
}

export interface Ask {
  kind: "ask";
  kinds: string[];
  /** low: confirm; strict: the passphrase */
  level: "low" | "strict";
  touchId: boolean;
  unreadable: boolean;
  error: string | null;
  /** MongoDB: the methods asked about (deleteMany, $merge), shown in place of kinds */
  ops?: string[];
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
  /** kept with the connection (a restart, a reconnect), first in the row, and not closed until unpinned */
  pinned?: boolean;
  run: RunState;
}

export interface TableTab {
  id: string;
  kind: "table";
  schema: string;
  table: string;
  where: string;
  offset: number;
  /** MongoDB's query bar: Filter is `where`; these are the other boxes. Limit empty = the row limit */
  project?: string;
  sort?: string;
  limit?: string;
  /** MongoDB: the documents as a table or as mongosh prints them */
  as?: "table" | "json";
  /** columns is MongoDB's Fields (from the documents on screen) */
  view: "rows" | "columns" | "indexes";
  /** kept with the connection (a restart, a reconnect), first in the row, and not closed until unpinned */
  pinned?: boolean;
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
