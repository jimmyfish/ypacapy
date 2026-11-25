import { invoke } from "@tauri-apps/api/core";
import type { Approval, Ask, CollInfo, ColumnBrief, Conn, HistoryEntry, KeyInfo, KeyPage, OpenInfo, RunOutcome, Saved, ScanKey, SchemaDiagram, SchemaObjects, SecurityLevel, Settings, TableInfo } from "../types";

/** Every Tauri command, typed. Rust errors arrive as strings. */
export const api = {
  loadSettings: () => invoke<Settings>("load_settings"),
  /** approval: lowering the default security level from Strict (guard::approve_default_lowering) */
  saveSettings: (settings: Settings, approval?: Approval) => invoke<void>("save_settings", { settings, approval }),
  listConnections: () => invoke<Conn[]>("list_connections"),
  saveConnection: (conn: Conn, password: string | null) => invoke<Conn>("save_connection", { conn, password }),
  deleteConnection: (id: string) => invoke<void>("delete_connection", { id }),
  /** a copy with a new id and the same keychain password; returns the copy */
  duplicateConnection: (id: string) => invoke<Conn>("duplicate_connection", { id }),
  /** group null takes them out of every group */
  setGroup: (ids: string[], group: string | null) => invoke<void>("set_group", { ids, group }),
  setPinned: (id: string, pinned: boolean) => invoke<void>("set_pinned", { id, pinned }),
  touchConnection: (id: string) => invoke<void>("touch_connection", { id }),
  setLevel: (id: string, level: SecurityLevel, approval?: Approval) => invoke<void>("set_level", { id, level, approval }),
  /** with testId, cancelQuery(testId) stops the test */
  testConnection: (conn: Conn, password: string | null, testId?: string) => invoke<{ server: string; ms: number }>("test_connection", { conn, password, testId }),
  openConnection: (id: string, database?: string) => invoke<OpenInfo>("open_connection", { id, database }),
  closeConnection: (id: string) => invoke<void>("close_connection", { id }),
  loadSchema: (id: string, database: string, schema: string) => invoke<SchemaObjects>("load_schema", { id, database, schema }),
  /** columns only, for autocomplete */
  tableColumns: (id: string, database: string, schema: string, table: string) => invoke<ColumnBrief[]>("table_columns", { id, database, schema, table }),
  tableInfo: (id: string, database: string, schema: string, table: string) => invoke<TableInfo>("table_info", { id, database, schema, table }),
  /** ER diagram: the picked tables of a schema, their columns and foreign keys, from the catalog (SQL engines only) */
  schemaDiagram: (id: string, database: string, schema: string, tables: string[]) => invoke<SchemaDiagram>("schema_diagram", { id, database, schema, tables }),
  /** the diagram picker's Add linked tables: [referencing, referenced] table pairs within the schema, one catalog read */
  schemaLinks: (id: string, database: string, schema: string) => invoke<[string, string][]>("schema_links", { id, database, schema }),
  runQuery: (req: { runId: string; connId: string; database?: string; schema?: string; sql: string; addLimit: boolean; offset?: number; approval?: Approval; history: boolean }) =>
    invoke<RunOutcome>("run_query", { req }),
  cancelQuery: (runId: string) => invoke<void>("cancel_query", { runId }),
  /** MongoDB's collection tab: find(filter, projection).sort().skip().limit(); boxes are read in Rust first */
  mongoFind: (req: { runId: string; connId: string; database?: string; collection: string; filter: string; projection: string; sort: string; skip?: number; limit?: number }) =>
    invoke<RunOutcome>("mongo_find", { req }),
  /** MongoDB Info: listCollections and $collStats, once */
  mongoStats: (id: string, database: string, collection: string) => invoke<CollInfo>("mongo_stats", { id, database, collection }),
  /** Redis's tree: one SCAN step from cursor ("0" starts over), with TYPE and PTTL for each key, and DBSIZE */
  redisScan: (id: string, cursor: string, pattern?: string) => invoke<{ cursor: string; keys: ScanKey[]; total: number }>("redis_scan", { id, cursor, pattern }),
  /** Redis's key tab: one page, read for the key's type; cursor (hash, set), offset (list, zset) or after (stream) */
  redisKey: (req: { runId: string; connId: string; key: string; cursor?: string; offset?: number; after?: string; pattern?: string; ascending?: boolean }) => invoke<KeyPage>("redis_key", { req }),
  /** Redis Info: TYPE, OBJECT, PTTL, MEMORY USAGE, once */
  redisKeyInfo: (id: string, key: string) => invoke<KeyInfo>("redis_key_info", { id, key }),
  /** one transaction; every statement must change exactly one row */
  /** ddl: a table's structure (the Columns editor): one transaction, no row counts, the schema tree is stale after */
  applyEdits: (req: { connId: string; database?: string; statements: string[]; approval?: Approval; ddl?: boolean }) => invoke<RunOutcome>("apply_edits", { req }),
  /** what the write guard would ask before this SQL runs, without running it; null: it runs as is */
  guardAsk: (connId: string, sql: string) => invoke<Omit<Ask, "kind"> | null>("guard_ask", { connId, sql }),
  passphraseStatus: () => invoke<{ set: boolean; touchIdAvailable: boolean }>("passphrase_status"),
  setPassphrase: (newPass: string, current?: string) => invoke<void>("set_passphrase", { new: newPass, current }),
  disablePassphrase: (current: string) => invoke<void>("disable_passphrase", { current }),
  /** forgot it: macOS asks for Touch ID or the login password, then the new one replaces it */
  resetPassphrase: (newPass: string) => invoke<void>("reset_passphrase", { new: newPass }),
  unlockProtect: (connId: string, passphrase: string | undefined, touchId: boolean) => invoke<void>("unlock_protect", { connId, passphrase, touchId }),
  lockProtect: () => invoke<void>("lock_protect"),
  /** one connection's history only */
  listHistory: (connId: string, search?: string) => invoke<HistoryEntry[]>("list_history", { connId, search, limit: 300 }),
  clearHistory: (connId: string) => invoke<void>("clear_history", { connId }),
  listSaved: () => invoke<Saved[]>("list_saved"),
  saveQuery: (q: Partial<Saved> & { name: string; sql: string }) => invoke<Saved>("save_query", { q }),
  deleteSaved: (id: string) => invoke<void>("delete_saved", { id }),
  loadWorkspace: (connId: string) => invoke<string | null>("load_workspace", { connId }),
  saveWorkspace: (connId: string, data: string | null) => invoke<void>("save_workspace", { connId, data }),
  configPath: () => invoke<string>("config_path"),
  writeTextFile: (path: string, contents: string) => invoke<void>("write_text_file", { path, contents }),
  /** an exported image: its bytes as base64 */
  writeBinaryFile: (path: string, base64: string) => invoke<void>("write_binary_file", { path, base64 }),
};

export const errText = (e: unknown) => (typeof e === "string" ? e : e instanceof Error ? e.message : String(e));
