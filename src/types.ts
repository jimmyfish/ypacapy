export type Engine = "postgres" | "mysql" | "sqlite" | "mongo" | "redis";
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
/** MongoDB and Redis TLS; MongoDB: missing = on for an SRV record, off for a host and port. Redis: on = rediss:// */
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
  /** Home shows it in Pinned, above every group; missing = not pinned */
  pinned?: boolean;
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
  /** missing = Settings > Queries > Keep query history */
  keepHistory?: boolean;
  /** SQL: warn before a query that can return more than 100 rows; missing = Settings > Security > Warnings */
  warnBigLimit?: boolean;
  /** SQL: warn before an UPDATE without WHERE; missing = Settings > Security > Warnings */
  warnUpdateAll?: boolean;
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
  /** Redis: the tree puts keys into folders on this; missing = ":", "" = every key flat */
  keySep?: string;
  /** Redis: about this many keys per SCAN call; missing = 1000 */
  scanCount?: number;
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
  /** Warnings for every SQL connection that does not set its own; missing = on */
  warnBigLimit?: boolean;
  warnUpdateAll?: boolean;
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

/**
 * Redis's guard kinds (redis_cli::KINDS in Rust), each with the commands it shows and a tag. KEYS is a read, on the
 * list because it walks every key and holds the server while it does.
 */
export const REDIS_KINDS: [string, string[], string?][] = [
  ["strings", ["SET", "MSET", "APPEND", "INCR", "DECR"], "Strings"],
  ["hashes", ["HSET", "HDEL", "HINCRBY"], "Hashes"],
  ["lists", ["LPUSH", "RPUSH", "LPOP", "RPOP", "LREM", "LTRIM"], "Lists"],
  ["sets", ["SADD", "SREM", "SMOVE"], "Sets"],
  ["zsets", ["ZADD", "ZREM", "ZINCRBY", "ZREMRANGEBYSCORE"], "Sorted sets"],
  ["streams", ["XADD", "XDEL", "XTRIM"], "Streams"],
  ["keys", ["DEL", "UNLINK", "RENAME"]],
  ["expire", ["EXPIRE", "PERSIST"]],
  ["flush", ["FLUSHDB", "FLUSHALL"]],
  ["scripts", ["EVAL", "EVALSHA", "FCALL"], "Scripts can write"],
  ["server", ["CONFIG SET", "SCRIPT FLUSH", "SHUTDOWN"]],
  ["KEYS", ["KEYS"], "A read that blocks the server"],
];
/** Redis: one key the tree's SCAN returned, with its TYPE and PTTL from the same read */
export interface ScanKey {
  key: string;
  /** string, hash, list, set, zset, stream, or a module's type */
  type: string;
  /** ms left when it was read; -1 no expiry */
  ttlMs: number;
}
/** Redis: the keys read so far, for the tree. cursor "0" after a read: the scan is done */
export interface RedisKeys {
  state: "loading" | "loaded" | "error";
  keys: ScanKey[];
  cursor: string;
  /** DBSIZE */
  total: number;
  /** SCAN's MATCH; "" for every key */
  pattern: string;
  /** ms since the epoch, when the TTLs were read */
  readAt: number;
  error?: string;
}
/** Redis: one page of a key */
export interface KeyPage {
  /** string, hash, list, set, zset, stream, a module's type, or none (the key is gone) */
  type: string;
  len: number | null;
  ttlMs: number;
  columns: ColMeta[];
  rows: (string | null)[][];
  value: string | null;
  binary: boolean;
  cut: boolean;
  /** the next page's cursor, offset or last id; null at the end */
  next: string | null;
  ms: number;
}
/** Redis Info: read when the dialog opens */
export interface KeyInfo {
  type: string;
  encoding: string | null;
  len: number | null;
  ttlMs: number;
  memory: number | null;
  idle: number | null;
  readAt: number;
}
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
  /** MySQL/MariaDB: what MODIFY COLUMN has to say again, or the column loses it */
  mysql?: { extra: string; comment: string; charset: string | null; collation: string | null };
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

/** The ER diagram of one schema (schema_diagram): read from the catalog when the person opens it */
export interface ErdColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
}

export interface ErdTable {
  schema: string;
  name: string;
  /** views are never drawn: they declare no keys */
  kind: "table" | "foreign";
  columns: ErdColumn[];
  /** unique keys other than the primary key, each its columns in key order */
  uniques: string[][];
}

/** columns of schema.table reference refColumns of refSchema.refTable, pairwise */
export interface ErdKey {
  name: string;
  schema: string;
  table: string;
  columns: string[];
  refSchema: string;
  refTable: string;
  refColumns: string[];
}

export interface SchemaDiagram {
  tables: ErdTable[];
  keys: ErdKey[];
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
  /** Redis: the reply as redis-cli prints it */
  raw?: string;
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
  /** MongoDB and Redis: the methods or commands asked about (deleteMany, DEL), shown in place of kinds */
  ops?: string[];
  /** something asked about deletes or overwrites: the ask says it cannot be undone */
  final?: boolean;
  /** the connection's warnings for this run; they ask whatever the security level */
  warnings?: Warning[];
}

/** guard::Warning. bigLimit: more than 100 rows; limit is the query's LIMIT or the row limit ypacapy adds (added), null when nothing bounds it. */
export type Warning = { kind: "bigLimit"; limit: number | null; added: boolean } | { kind: "updateAll" };

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
  /** fix: Redis, a command that does what was meant (HGETALL for a hash read with LRANGE) */
  | { kind: "error"; title: string; says: string | null; message: string; hint: string | null; lost: boolean; ms: number; fix?: string }
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
  /** paging a run ypacapy added the row limit to: rows skipped before the page shown (0 or unset: the first page) */
  offset?: number;
  /** the columns of the last page that had rows, so an empty page still shows its header */
  pageCols?: ColMeta[];
  run: RunState;
}

export interface TableTab {
  id: string;
  kind: "table";
  schema: string;
  table: string;
  where: string;
  offset: number;
  /** MongoDB's query bar: Filter is `where`; these are the other boxes. Limit empty = the row limit.
   *  `limit` is also the rows per page picked on a table tab (SQL and MongoDB) */
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

/** Redis: one key, read a page at a time */
export interface KeyTab {
  id: string;
  kind: "key";
  key: string;
  /** hash and set: HSCAN or SSCAN's MATCH */
  pattern: string;
  /** sorted set: lowest score first */
  ascending?: boolean;
  /** string: as text or as JSON */
  as?: "text" | "json";
  /** where each page read so far starts (cursor, offset or last id); "" for the first. page indexes it */
  starts: string[];
  page: number;
  pinned?: boolean;
  /** the page's read: status and runId as a query's (Close and Cancel stop it); no outcome */
  run: RunState;
  data?: KeyPage;
  error?: string;
}
/** Where a diagram's box is, in diagram units */
export interface DiagramPoint {
  x: number;
  y: number;
}

/** A diagram as its Save left it, kept in the connection's workspace (ypacapy.db), so it survives a restart */
export interface SavedDiagram {
  tables: string[];
  /** every box, by table key ("schema\u0000table") */
  positions: Record<string, DiagramPoint>;
  view: { x: number; y: number; k: number };
  detail: "all" | "keys" | "none";
  /** when it was saved (ms since the epoch) */
  at: number;
}

/**
 * An ER diagram of one schema's picked tables. Never pinned: once saved, Show diagram reopens it as saved. What
 * differs from the save (picks, dragged boxes, column detail) lives here until Save or until the tab closes.
 */
export interface DiagramTab {
  id: string;
  kind: "diagram";
  database: string;
  schema: string;
  /** null: the schema's diagram; a table: opened with that table's Show diagram (its own saved diagram) */
  origin: string | null;
  /** the picked tables of `schema`; empty until the picker's first Show */
  tables: string[];
  detail: "all" | "keys" | "none";
  /** boxes dragged since the last Save, by table key */
  moves: Record<string, DiagramPoint>;
  /** Reset layout pressed since the last Save: every box laid out afresh */
  auto?: boolean;
  /** zoom and pan, kept while the tab is away; none means fit the diagram */
  view?: { x: number; y: number; k: number };
  /** never saved: the picks and detail as first drawn, what "Not saved" compares against */
  baseline?: { tables: string[]; detail: DiagramTab["detail"] };
  /** the table picker is open */
  picking?: boolean;
  /** what the picker ticks first for a table's diagram: the table and the tables linked to it */
  preset?: string[];
  /** the catalog read of the picked tables (merged as more are picked) */
  data?: SchemaDiagram;
  loading?: boolean;
  error?: string;
  /** diagrams are never pinned; here for the tab bar's sake */
  pinned?: undefined;
  run: RunState;
}

export type Tab = QueryTab | TableTab | KeyTab | DiagramTab;

export interface SchemaNode {
  state: "loading" | "loaded" | "error";
  data?: SchemaObjects;
  error?: string;
}

/** One open connection: its pool on the Rust side, its tree cache and tabs here. */
/** A connection's status with the heartbeat on: connecting while its tab opens, then what the heartbeat (conn:link) and runs say */
export type Link = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface Session {
  status: "opening" | "open" | "error";
  /** heartbeat on only: the status on its tab and at the foot of the sidebar */
  link?: Link;
  /** when it went down (ms), for the bar over the work area; cleared when it's back */
  downAt?: number;
  error?: string;
  info?: OpenInfo;
  database: string;
  schema: string;
  /** the schema tree, per schema, cached for the session (Refresh, DDL and Reconnect clear it) */
  tree: Record<string, SchemaNode>;
  /** columns autocomplete has read, per "schema.table"; cleared with the tree */
  columns: Record<string, ColumnsEntry>;
  expanded: Record<string, boolean>;
  /** Redis: the keys the tree read with SCAN */
  keys?: RedisKeys;
  tabs: Tab[];
  activeTabId: string | null;
  /** saved diagrams, by diagramKey (database, schema, origin); kept with the workspace */
  diagrams?: Record<string, SavedDiagram>;
}
