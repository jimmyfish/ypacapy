import { create } from "zustand";
import { api, errText } from "./lib/api";
import { tableSelect } from "./lib/sql";
import { editCount, type Edits } from "./lib/edit";
import type { Approval, Ask, ColumnsEntry, Conn, HistoryEntry, KeyTab, SecurityLevel, QueryTab, ResultSet, RunOutcome, Saved, Session, Settings, Tab, TableTab } from "./types";

export type SettingsSection = "appearance" | "queries" | "security" | "data" | "updates";
export type SideView = "schema" | "history" | "saved";

export type Modal =
  | { kind: "settings"; section?: SettingsSection }
  | { kind: "about" }
  | { kind: "connect"; conn?: Conn; group?: string }
  /** final: it cannot be undone; the dialog says so and the button carries the shredder */
  | { kind: "confirm"; title: string; message: string; confirmLabel?: string; final?: boolean; onConfirm: () => void }
  | { kind: "prompt"; title: string; label: string; initial: string; onSubmit: (v: string) => void }
  | { kind: "saveQuery"; tabId: string }
  /** the passphrase or confirm ask before a run; with title and message, the passphrase before lowering Strict */
  | { kind: "guard"; ask: Ask; connName: string; title?: string; message?: string; onApprove: (a: Approval) => void; alt?: { label: string; run: () => void } }
  /** MongoDB: a collection's sizes and shape, read with $collStats when it opens */
  | { kind: "collInfo"; connId: string; database: string; collection: string }
  /** Redis: a key's type, encoding, length, TTL and memory, read when it opens */
  | { kind: "keyInfo"; connId: string; key: string };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const DEFAULT_ROW_LIMIT = 100;

interface State {
  loaded: boolean;
  settings: Settings;
  conns: Conn[];
  view: "home" | "conn";
  openIds: string[];
  currentId: string | null;
  sessions: Record<string, Session>;
  side: SideView;
  modal: Modal | null;
  toast: string | null;
  history: HistoryEntry[];
  saved: Saved[];
  pass: { set: boolean; touchIdAvailable: boolean };
  /** result grid changes not yet saved, by tab id and result set index (kept while the tab is away) */
  edits: Record<string, Edits>;
  setEdits(key: string, e: Edits | null): void;
  /** a result set as it is after its edits were saved */
  replaceSet(tabId: string, index: number, set: ResultSet): void;

  init(): Promise<void>;
  setSettings(patch: Partial<Settings>): Promise<void>;
  openModal(m: Modal | null): void;
  showToast(msg: string): void;
  setSide(v: SideView): void;

  refreshConns(): Promise<void>;
  deleteConn(id: string): Promise<void>;
  /** copies a connection (and its keychain password) next to it */
  duplicateConn(id: string): Promise<void>;
  /** moves connections into a group; null takes them out of every group */
  setGroup(ids: string[], group: string | null): Promise<void>;
  /** opens every connection given, leaving the first one in front */
  openConns(ids: string[]): void;
  openConn(id: string): Promise<void>;
  closeConn(id: string): Promise<void>;
  goHome(): void;
  reconnect(id: string): Promise<void>;
  setDatabase(db: string): Promise<void>;
  setSchema(schema: string): void;
  setLevel(level: SecurityLevel, approval?: Approval): Promise<void>;

  toggle(path: string): void;
  loadSchema(schema: string): Promise<void>;
  refreshTree(id?: string): void;
  /** autocomplete: reads a table's columns once; later calls reuse them until the tree is cleared */
  loadColumns(schema: string, table: string): void;
  /** Redis: the tree's keys. Without more it starts over (SCAN 0); pattern is SCAN's MATCH ("" every key) */
  scanKeys(opts?: { more?: boolean; pattern?: string; connId?: string }): Promise<void>;
  /** Redis: a key in its own tab */
  openKey(key: string): void;
  /** Redis: a page of the key tab's key; page indexes the starts read so far, one past the last for the next */
  readKey(tabId: string, opts?: { page?: number }): Promise<void>;

  newQueryTab(sql?: string, title?: string, saved?: Saved): string;
  openTable(schema: string, table: string): void;
  setActiveTab(id: string): void;
  closeTab(id: string, force?: boolean): void;
  /** pins or unpins a tab; a pinned tab moves to the end of the pinned ones at the left */
  pinTab(id: string, on: boolean): void;
  updateTab(id: string, patch: Partial<QueryTab> | Partial<TableTab> | Partial<KeyTab>): void;
  run(tabId: string, opts?: { sql?: string; approval?: Approval; discard?: boolean }): Promise<void>;
  cancel(tabId: string): void;
  readTable(tabId: string, opts?: { offset?: number; approval?: Approval; discard?: boolean }): Promise<void>;
  loadTableInfo(tabId: string): Promise<void>;
  saveTab(tabId: string, name?: string, folder?: string): Promise<void>;

  loadHistory(search?: string): Promise<void>;
  loadSaved(): Promise<void>;
}

/**
 * Each connection's query tabs (scratchpads and edited saved queries) and its pinned tabs are kept in
 * ypacapy.db and come back when it is opened again, also after a restart. An unpinned table tab is not kept.
 * A table entry has `kind: "table"` and no `sql`, so a build that knows only query tabs skips it.
 */
type KeptQuery = { kind?: "query"; id: string; title: string; sql: string; savedId?: string; savedFolder?: string; savedSql?: string; pinned?: boolean };
type KeptTable = { kind: "table"; id: string; schema: string; table: string; where: string; view: TableTab["view"]; pinned?: boolean; project?: string; sort?: string; limit?: string; as?: TableTab["as"] };
/** Redis: a pinned key tab */
type KeptKey = { kind: "key"; id: string; key: string; pattern?: string; ascending?: boolean; as?: KeyTab["as"]; pinned?: boolean };
interface Workspace {
  v: 1;
  active: string | null;
  tabs: (KeptQuery | KeptTable | KeptKey)[];
}
/** a short pause after the last change, so a quit right after typing loses little */
const WORKSPACE_SAVE_MS = 300;
/** connections whose kept tabs were read back; only those are written, so an empty session never overwrites them */
const restored = new Set<string>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Redis: the latest SCAN read per connection; an answer to an older one is dropped */
const scanTokens = new Map<string, string>();
const lastWritten = new Map<string, string>();

function workspaceOf(s: Session): string {
  const kept = s.tabs.filter((t) => t.pinned || (t.kind === "query" && (!!t.savedId || t.sql.trim() !== "")));
  const active = kept.find((t) => t.id === s.activeTabId)?.id ?? kept[kept.length - 1]?.id ?? null;
  const w: Workspace = {
    v: 1,
    active,
    tabs: kept.map((t) =>
      t.kind === "query"
        ? { id: t.id, title: t.title, sql: t.sql, savedId: t.savedId, savedFolder: t.savedFolder, savedSql: t.savedSql, pinned: t.pinned || undefined }
        : t.kind === "key"
          ? { kind: "key", id: t.id, key: t.key, pattern: t.pattern || undefined, ascending: t.ascending || undefined, as: t.as, pinned: true }
          : { kind: "table", id: t.id, schema: t.schema, table: t.table, where: t.where, view: t.view, pinned: true, project: t.project || undefined, sort: t.sort || undefined, limit: t.limit || undefined, as: t.as === "json" ? "json" : undefined },
    ),
  };
  return JSON.stringify(w);
}

/** Writes the connection's kept tabs now, if they changed since the last write. */
async function flushWorkspace(id: string): Promise<void> {
  clearTimeout(saveTimers.get(id));
  saveTimers.delete(id);
  const s = useStore.getState().sessions[id];
  if (!s || !restored.has(id)) return;
  const data = workspaceOf(s);
  if (lastWritten.get(id) === data) return;
  lastWritten.set(id, data);
  await api.saveWorkspace(id, data).catch((e) => {
    lastWritten.delete(id);
    useStore.getState().showToast(`Could not save open tabs: ${errText(e)}`);
  });
}

async function readWorkspace(id: string): Promise<{ tabs: Tab[]; active: string | null }> {
  try {
    const raw = await api.loadWorkspace(id);
    if (!raw) return { tabs: [], active: null };
    lastWritten.set(id, raw);
    const w = JSON.parse(raw) as Partial<Workspace>;
    const tabs: Tab[] = [];
    for (const t of Array.isArray(w.tabs) ? w.tabs : []) {
      if (!t) continue;
      const pinned = t.pinned ? { pinned: true } : {};
      if (t.kind === "key") {
        if (typeof t.key !== "string" || !t.key) continue;
        tabs.push({ id: t.id || uid(), kind: "key", key: t.key, pattern: typeof t.pattern === "string" ? t.pattern : "", ...(t.ascending ? { ascending: true } : {}), ...(t.as === "text" || t.as === "json" ? { as: t.as } : {}), starts: [""], page: 0, ...pinned, run: { status: "idle" } });
      } else if (t.kind === "table") {
        if (typeof t.schema !== "string" || typeof t.table !== "string" || !t.table) continue;
        const view = t.view === "columns" || t.view === "indexes" ? t.view : "rows";
        const str = (v: unknown) => (typeof v === "string" && v ? { v } : null);
        tabs.push({
          id: t.id || uid(),
          kind: "table",
          schema: t.schema,
          table: t.table,
          where: typeof t.where === "string" ? t.where : "",
          offset: 0,
          view,
          // MongoDB's query bar
          ...(str(t.project) ? { project: t.project } : {}),
          ...(str(t.sort) ? { sort: t.sort } : {}),
          ...(str(t.limit) ? { limit: t.limit } : {}),
          ...(t.as === "json" ? { as: "json" as const } : {}),
          ...pinned,
          run: { status: "idle" },
        });
      } else if (typeof t.sql === "string") {
        tabs.push({
          id: t.id || uid(),
          kind: "query",
          title: t.title || "Query",
          sql: t.sql,
          ...(t.savedId ? { savedId: t.savedId, savedFolder: t.savedFolder, savedSql: t.savedSql } : {}),
          ...pinned,
          run: { status: "idle" },
        });
      }
    }
    // pinned tabs first, each group in its kept order
    tabs.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    return { tabs, active: tabs.some((t) => t.id === w.active) ? (w.active ?? null) : (tabs[tabs.length - 1]?.id ?? null) };
  } catch {
    return { tabs: [], active: null };
  }
}

const emptySession = (): Session => ({ status: "opening", database: "", schema: "", tree: {}, columns: {}, expanded: {}, tabs: [], activeTabId: null });

export const useStore = create<State>()((set, get) => {
  /** Changes the current connection's session. */
  const patchSession = (id: string, f: (s: Session) => Partial<Session>) =>
    set((st) => {
      const s = st.sessions[id];
      return s ? { sessions: { ...st.sessions, [id]: { ...s, ...f(s) } } } : {};
    });
  const sessionOfTab = (tabId: string): [string, Session, Tab] | null => {
    for (const [id, s] of Object.entries(get().sessions)) {
      const t = s.tabs.find((x) => x.id === tabId);
      if (t) return [id, s, t];
    }
    return null;
  };
  const patchTab = (tabId: string, patch: Partial<QueryTab> | Partial<TableTab> | Partial<KeyTab>) => {
    const hit = sessionOfTab(tabId);
    if (!hit) return;
    patchSession(hit[0], (s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? ({ ...t, ...patch } as Tab) : t)) }));
  };
  const editKeys = (tabId: string) => Object.keys(get().edits).filter((k) => k.startsWith(tabId + ":"));
  const pendingIn = (tabId: string) => editKeys(tabId).reduce((n, k) => n + editCount(get().edits[k]), 0);
  const dropEdits = (tabId: string) => {
    const keys = editKeys(tabId);
    if (!keys.length) return;
    set((st) => {
      const edits = { ...st.edits };
      for (const k of keys) delete edits[k];
      return { edits };
    });
  };
  /** a new read replaces the rows the changes were made on: ask first */
  const askDiscard = (tabId: string, again: () => void) => {
    const n = pendingIn(tabId);
    if (!n) return false;
    get().openModal({
      kind: "confirm",
      title: `Discard ${n} unsaved change${n === 1 ? "" : "s"}?`,
      message: "Running again reloads the rows. Save first to keep the changes.",
      confirmLabel: "Discard",
      onConfirm: again,
    });
    return true;
  };
  const failed = (e: unknown): RunOutcome => ({ kind: "error", title: "The query did not run", says: null, message: errText(e), hint: null, lost: false, ms: 0 });
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    loaded: false,
    settings: {},
    conns: [],
    view: "home",
    openIds: [],
    currentId: null,
    sessions: {},
    side: "schema",
    modal: null,
    toast: null,
    history: [],
    saved: [],
    pass: { set: false, touchIdAvailable: false },
    edits: {},

    setEdits(key, e) {
      set((st) => {
        const edits = { ...st.edits };
        if (e && editCount(e)) edits[key] = e;
        else delete edits[key];
        return { edits };
      });
    },

    replaceSet(tabId, index, rs) {
      const t = sessionOfTab(tabId)?.[2];
      const o = t?.run.outcome;
      if (!t || o?.kind !== "done" || !o.sets[index]) return;
      patchTab(tabId, { run: { ...t.run, outcome: { ...o, sets: o.sets.map((x, i) => (i === index ? rs : x)) } } });
    },

    async init() {
      const [settings, conns, pass] = await Promise.all([
        api.loadSettings().catch((e) => {
          get().showToast(errText(e));
          return {} as Settings;
        }),
        api.listConnections().catch((e) => {
          get().showToast(errText(e));
          return [] as Conn[];
        }),
        api.passphraseStatus().catch(() => ({ set: false, touchIdAvailable: false })),
      ]);
      set({ settings, conns, pass, loaded: true });
      void get().loadSaved();
      void get().loadHistory();
    },

    async setSettings(patch) {
      const prev = get().settings;
      const next = { ...prev, ...patch };
      for (const k of Object.keys(next) as (keyof Settings)[]) if (next[k] === undefined) delete next[k];
      set({ settings: next });
      try {
        await api.saveSettings(next);
      } catch (e) {
        set({ settings: prev });
        get().showToast(errText(e));
      }
    },

    openModal(m) {
      set({ modal: m });
    },

    showToast(msg) {
      set({ toast: msg });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 3500);
    },

    setSide(v) {
      set({ side: v });
      if (v === "history") void get().loadHistory();
      if (v === "saved") void get().loadSaved();
      if (get().settings.sidebarHidden) void get().setSettings({ sidebarHidden: false });
    },

    async refreshConns() {
      try {
        set({ conns: await api.listConnections() });
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    async deleteConn(id) {
      await get().closeConn(id);
      lastWritten.delete(id);
      try {
        await api.saveWorkspace(id, null);
        await api.deleteConnection(id);
      } catch (e) {
        get().showToast(errText(e));
      }
      await get().refreshConns();
    },

    async duplicateConn(id) {
      try {
        const copy = await api.duplicateConnection(id);
        get().showToast(`Duplicated as ${copy.name}`);
      } catch (e) {
        get().showToast(errText(e));
      }
      await get().refreshConns();
    },

    async setGroup(ids, group) {
      try {
        await api.setGroup(ids, group);
      } catch (e) {
        get().showToast(errText(e));
      }
      await get().refreshConns();
    },

    openConns(ids) {
      if (!ids.length) return;
      for (const id of ids) void get().openConn(id);
      set({ currentId: ids[0] });
    },

    async openConn(id) {
      set((st) => ({ view: "conn", currentId: id, openIds: st.openIds.includes(id) ? st.openIds : [...st.openIds, id] }));
      const existing = get().sessions[id];
      if (existing && existing.status !== "error") return;
      set((st) => ({ sessions: { ...st.sessions, [id]: { ...emptySession(), tabs: existing?.tabs ?? [], activeTabId: existing?.activeTabId ?? null } } }));
      if (!restored.has(id)) {
        const ws = await readWorkspace(id);
        patchSession(id, (s) => ({ tabs: [...ws.tabs, ...s.tabs], activeTabId: s.activeTabId ?? ws.active }));
        restored.add(id);
      }
      void api.touchConnection(id).then(() => get().refreshConns());
      const mongo = get().conns.find((c) => c.id === id)?.engine === "mongo";
      try {
        const info = await api.openConnection(id);
        const schema = info.defaultSchema;
        patchSession(id, (s) => ({
          status: "open",
          error: undefined,
          info,
          database: info.database,
          schema,
          tree: {},
          columns: {},
          expanded: schema ? { [schema]: true, [`${schema}/tables`]: true, [`${schema}/views`]: true } : {},
          // MongoDB opens on its first collection (below), not on an empty console; Redis on its console
          ...(s.tabs.length || mongo ? {} : (() => {
            const t = newQuery(1);
            return { tabs: [t], activeTabId: t.id };
          })()),
        }));
        if (schema)
          void get()
            .loadSchema(schema)
            .then(() => {
              const now = get().sessions[id];
              if (!mongo || !now || now.tabs.length) return;
              const first = now.tree[schema]?.data?.tables.find((t) => t.kind !== "view");
              if (first) get().openTable(schema, first.name);
              else get().newQueryTab();
            });
        // Redis: the tree's first SCAN
        if (get().conns.find((c) => c.id === id)?.engine === "redis") void get().scanKeys({ connId: id });
        // pinned table tabs kept from last time read their rows and columns now that the pool is open
        for (const t of get().sessions[id]?.tabs ?? []) {
          if (t.kind === "key") {
            if (t.run.status === "idle") void get().readKey(t.id);
            continue;
          }
          if (t.kind !== "table" || t.run.status !== "idle" || t.info) continue;
          void get().readTable(t.id);
          void get().loadTableInfo(t.id);
        }
      } catch (e) {
        patchSession(id, () => ({ status: "error", error: errText(e) }));
      }
    },

    async closeConn(id) {
      await flushWorkspace(id);
      restored.delete(id);
      await api.closeConnection(id).catch(() => {});
      set((st) => {
        const openIds = st.openIds.filter((x) => x !== id);
        const sessions = { ...st.sessions };
        delete sessions[id];
        const leaving = st.currentId === id;
        return { openIds, sessions, currentId: leaving ? openIds[openIds.length - 1] ?? null : st.currentId, view: leaving && !openIds.length ? "home" : st.view };
      });
    },

    goHome() {
      set({ view: "home" });
    },

    async reconnect(id) {
      await api.closeConnection(id).catch(() => {});
      patchSession(id, () => ({ status: "error", keys: undefined }));
      await get().openConn(id);
    },

    async setDatabase(db) {
      const id = get().currentId;
      if (!id) return;
      patchSession(id, () => ({ database: db, tree: {}, columns: {} }));
      try {
        const info = await api.openConnection(id, db);
        const conn = get().conns.find((c) => c.id === id);
        // MySQL: a database is a schema, so the picked one becomes the open schema too
        const schema = conn?.engine === "mysql" ? db : info.defaultSchema;
        patchSession(id, () => ({ info, database: info.database || db, schema, tree: {}, columns: {}, expanded: { [schema]: true, [`${schema}/tables`]: true, [`${schema}/views`]: true } }));
        if (schema) void get().loadSchema(schema);
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    setSchema(schema) {
      const id = get().currentId;
      if (id) patchSession(id, (s) => ({ schema, expanded: { ...s.expanded, [schema]: true, [`${schema}/tables`]: true } }));
      if (!get().sessions[id ?? ""]?.tree[schema]) void get().loadSchema(schema);
    },

    async setLevel(level, approval) {
      const id = get().currentId;
      const conn = get().conns.find((c) => c.id === id);
      if (!id || !conn || conn.level === level) return;
      // lowering from Strict needs the passphrase first, or Touch ID when the connection allows it
      const ask = (error: string | null) =>
        get().openModal({
          kind: "guard",
          ask: { kind: "ask", kinds: [], level: "strict", touchId: !!conn.touchId && get().pass.touchIdAvailable, unreadable: false, error },
          connName: conn.name,
          title: `Lower ${conn.name} from Strict?`,
          message: `Enter the passphrase to change it to ${level === "low" ? "Low" : "None"}.`,
          onApprove: (a) => void get().setLevel(level, a),
        });
      if (conn.level === "strict" && get().pass.set && !approval) return ask(null);
      try {
        await api.setLevel(id, level, approval);
        await get().refreshConns();
      } catch (e) {
        if (approval) ask(errText(e));
        else get().showToast(errText(e));
      }
    },

    toggle(path) {
      const id = get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      const open = !s.expanded[path];
      patchSession(id, (x) => ({ expanded: { ...x.expanded, [path]: open } }));
      if (open && !path.includes("/") && !s.tree[path]) void get().loadSchema(path);
    },

    async loadSchema(schema) {
      const id = get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      if (!s) return;
      patchSession(id, (x) => ({ tree: { ...x.tree, [schema]: { state: "loading" } } }));
      try {
        const data = await api.loadSchema(id, s.database, schema);
        patchSession(id, (x) => ({ tree: { ...x.tree, [schema]: { state: "loaded", data } } }));
      } catch (e) {
        patchSession(id, (x) => ({ tree: { ...x.tree, [schema]: { state: "error", error: errText(e) } } }));
      }
    },

    loadColumns(schema, table) {
      const id = get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      const key = `${schema}.${table}`;
      if (!s || s.status !== "open" || s.columns[key]) return;
      // a token, so an answer that lands after Refresh or a database switch is dropped
      const req = uid();
      patchSession(id, (x) => ({ columns: { ...x.columns, [key]: { state: "loading", req } } }));
      const done = (entry: ColumnsEntry) => {
        const cur = get().sessions[id]?.columns[key];
        if (cur?.state === "loading" && cur.req === req) patchSession(id, (x) => ({ columns: { ...x.columns, [key]: entry } }));
      };
      api.tableColumns(id, s.database, schema, table).then(
        (cols) => done({ state: "loaded", cols }),
        () => done({ state: "error" }),
      );
    },

    /** Refresh button, DDL that ypacapy ran, Reconnect: the cached tree goes and the open schemas reload. */
    refreshTree(connId) {
      const id = connId ?? get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      if (!s) return;
      const open = Object.keys(s.tree);
      patchSession(id, () => ({ tree: {}, columns: {} }));
      // Redis: the keys are read again from the start, with the same pattern
      if (get().conns.find((c) => c.id === id)?.engine === "redis") {
        void get().scanKeys({ connId: id, pattern: s.keys?.pattern ?? "" });
        return;
      }
      // the databases and schemas too (one catalog read), so one made or dropped elsewhere shows up
      if (s.status === "open")
        void api.openConnection(id, s.database || undefined).then(
          (info) => patchSession(id, () => ({ info })),
          () => {},
        );
      if (id === get().currentId) for (const schema of open) void get().loadSchema(schema);
    },

    async scanKeys(opts = {}) {
      const id = opts.connId ?? get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      if (!s) return;
      const more = !!opts.more && !!s.keys && s.keys.cursor !== "0";
      const pattern = opts.pattern ?? s.keys?.pattern ?? "";
      const prev = more && s.keys ? s.keys : { keys: [], cursor: "0", total: s.keys?.total ?? 0, readAt: 0 };
      const token = uid();
      scanTokens.set(id, token);
      patchSession(id, () => ({ keys: { ...prev, pattern, state: "loading" } }));
      try {
        const page = await api.redisScan(id, more ? prev.cursor : "0", pattern || undefined);
        // a newer read (Refresh, another pattern) started meanwhile: that one wins
        if (scanTokens.get(id) !== token || !get().sessions[id]) return;
        const seen = new Set(prev.keys.map((k) => k.key));
        const keys = [...prev.keys, ...page.keys.filter((k) => !seen.has(k.key))];
        patchSession(id, () => ({ keys: { state: "loaded", keys, cursor: page.cursor, total: page.total, pattern, readAt: Date.now() } }));
      } catch (e) {
        if (scanTokens.get(id) !== token) return;
        patchSession(id, () => ({ keys: { ...prev, pattern, state: "error", error: errText(e) } }));
      }
    },

    openKey(key) {
      const id = get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      const hit = s.tabs.find((t) => t.kind === "key" && t.key === key);
      if (hit) {
        patchSession(id, () => ({ activeTabId: hit.id }));
        return;
      }
      const t: KeyTab = { id: uid(), kind: "key", key, pattern: "", starts: [""], page: 0, run: { status: "idle" } };
      patchSession(id, (x) => ({ tabs: [...x.tabs, t], activeTabId: t.id }));
      void get().readKey(t.id);
    },

    async readKey(tabId, opts = {}) {
      const hit = sessionOfTab(tabId);
      if (!hit) return;
      const [connId, , tab] = hit;
      if (tab.kind !== "key" || tab.run.status === "running") return;
      const page = Math.max(0, Math.min(opts.page ?? 0, tab.starts.length - 1));
      const start = tab.starts[page] ?? "";
      const runId = uid();
      patchTab(tabId, { page, run: { status: "running", runId, startedAt: Date.now() } });
      // where the page starts, in the terms of the key's type (the type the page before had)
      const ty = tab.data?.type;
      const at = !start ? {} : ty === "list" || ty === "zset" ? { offset: Number(start) } : ty === "stream" ? { after: start } : { cursor: start };
      try {
        const data = await api.redisKey({ runId, connId, key: tab.key, pattern: tab.pattern || undefined, ascending: !!tab.ascending, ...at });
        const now = sessionOfTab(tabId)?.[2];
        if (!now || now.kind !== "key" || now.run.runId !== runId) return;
        // the next page's start, kept so Previous can go back
        const starts = [...now.starts.slice(0, page + 1), ...(data.next !== null ? [data.next] : [])];
        patchTab(tabId, { data, error: undefined, starts, run: { status: "done", runId } });
      } catch (e) {
        const now = sessionOfTab(tabId)?.[2];
        if (now?.run.runId === runId) patchTab(tabId, { error: errText(e), run: { status: "done", runId } });
      }
    },

    newQueryTab(sql = "", title, saved) {
      const id = get().currentId;
      if (!id) return "";
      const s = get().sessions[id];
      // after the highest "Query n", so restored tabs keep their names unique
      const n = Math.max(0, ...s.tabs.map((t) => (t.kind === "query" ? Number(/^Query (\d+)$/.exec(t.title)?.[1] ?? 0) : 0))) + 1;
      const t: QueryTab = { ...newQuery(n), sql, ...(title ? { title } : {}) };
      if (saved) Object.assign(t, { title: saved.name, savedId: saved.id, savedFolder: saved.folder, savedSql: saved.sql, sql: saved.sql });
      patchSession(id, (x) => ({ tabs: [...x.tabs, t], activeTabId: t.id }));
      return t.id;
    },

    openTable(schema, table) {
      const id = get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      const hit = s.tabs.find((t) => t.kind === "table" && t.schema === schema && t.table === table);
      if (hit) {
        patchSession(id, () => ({ activeTabId: hit.id }));
        return;
      }
      const t: TableTab = { id: uid(), kind: "table", schema, table, where: "", offset: 0, view: "rows", run: { status: "idle" } };
      patchSession(id, (x) => ({ tabs: [...x.tabs, t], activeTabId: t.id }));
      void get().readTable(t.id);
      void get().loadTableInfo(t.id);
    },

    setActiveTab(tabId) {
      const hit = sessionOfTab(tabId);
      if (hit) patchSession(hit[0], () => ({ activeTabId: tabId }));
    },

    closeTab(tabId, force) {
      const hit = sessionOfTab(tabId);
      if (!hit) return;
      const [id, , tab] = hit;
      // a pinned tab stays open, ⌘W included, until it is unpinned
      if (tab.pinned) {
        get().showToast("Unpin the tab to close it");
        return;
      }
      if (!force && tab.kind === "query" && isDirty(tab)) {
        get().openModal({
          kind: "confirm",
          title: `Close ${tab.title}?`,
          message: tab.savedId ? "Its changes since the last save are lost." : "Its text is not saved anywhere.",
          confirmLabel: "Close",
          onConfirm: () => get().closeTab(tabId, true),
        });
        return;
      }
      const pending = pendingIn(tabId);
      if (!force && pending) {
        get().openModal({
          kind: "confirm",
          title: `Close ${tab.kind === "query" ? tab.title : tab.kind === "key" ? tab.key : tab.table}?`,
          message: `${pending} unsaved change${pending === 1 ? "" : "s"} to its rows ${pending === 1 ? "is" : "are"} lost.`,
          confirmLabel: "Close",
          onConfirm: () => get().closeTab(tabId, true),
        });
        return;
      }
      dropEdits(tabId);
      if (tab.run.status === "running" && tab.run.runId) void api.cancelQuery(tab.run.runId);
      patchSession(id, (s) => {
        const i = s.tabs.findIndex((t) => t.id === tabId);
        const tabs = s.tabs.filter((t) => t.id !== tabId);
        const activeTabId = s.activeTabId === tabId ? (tabs[Math.min(i, tabs.length - 1)]?.id ?? null) : s.activeTabId;
        return { tabs, activeTabId };
      });
    },

    pinTab(tabId, on) {
      const hit = sessionOfTab(tabId);
      if (!hit) return;
      patchSession(hit[0], (s) => {
        const tab = s.tabs.find((t) => t.id === tabId);
        if (!tab) return {};
        const rest = s.tabs.filter((t) => t.id !== tabId);
        const at = rest.filter((t) => t.pinned).length;
        const moved = { ...tab, pinned: on || undefined } as Tab;
        return { tabs: [...rest.slice(0, at), moved, ...rest.slice(at)] };
      });
    },

    updateTab(tabId, patch) {
      patchTab(tabId, patch);
    },

    async run(tabId, opts = {}) {
      const hit = sessionOfTab(tabId);
      if (!hit) return;
      const [connId, s, tab] = hit;
      if (tab.kind !== "query" || s.status !== "open") return;
      const sql = opts.sql ?? tab.sql;
      if (!sql.trim() || tab.run.status === "running") return;
      if (!opts.discard && askDiscard(tabId, () => void get().run(tabId, { ...opts, discard: true }))) return;
      const runId = uid();
      const prev = tab.run;
      patchTab(tabId, { run: { status: "running", runId, startedAt: Date.now(), outcome: prev.outcome } });
      const out = await api
        .runQuery({ runId, connId, database: s.database, schema: s.schema, sql, addLimit: true, approval: opts.approval, history: true })
        .catch(failed);
      const now = sessionOfTab(tabId)?.[2];
      if (!now || now.run.runId !== runId) return;
      if (out.kind === "ask") {
        patchTab(tabId, { run: prev });
        const conn = get().conns.find((c) => c.id === connId);
        // Redis KEYS: SCAN reads the same keys a batch at a time and never holds the server
        const scan = conn?.engine === "redis" && out.ops?.includes("KEYS") ? keysToScan(sql) : null;
        const alt = scan
          ? {
              label: "Use SCAN instead",
              run: () => {
                if (sql === tab.sql) get().updateTab(tabId, { sql: scan });
                void get().run(tabId, { ...opts, sql: scan });
              },
            }
          : undefined;
        get().openModal({ kind: "guard", ask: out, connName: conn?.name ?? "", onApprove: (approval) => void get().run(tabId, { ...opts, approval }), alt });
        return;
      }
      dropEdits(tabId);
      patchTab(tabId, { run: { status: "done", runId, outcome: out, sql } });
      if (out.kind === "done" && out.ddl) get().refreshTree(connId);
      if (out.kind === "error" && out.lost) patchSession(connId, () => ({ tree: {}, columns: {} }));
      if (get().side === "history") void get().loadHistory();
    },

    cancel(tabId) {
      const t = sessionOfTab(tabId)?.[2];
      if (t?.run.status === "running" && t.run.runId) void api.cancelQuery(t.run.runId);
    },

    async readTable(tabId, opts = {}) {
      const hit = sessionOfTab(tabId);
      if (!hit) return;
      const [connId, s, tab] = hit;
      if (tab.kind !== "table" || tab.run.status === "running") return;
      const conn = get().conns.find((c) => c.id === connId);
      if (!conn) return;
      const offset = opts.offset ?? 0;
      if (!opts.discard && askDiscard(tabId, () => void get().readTable(tabId, { ...opts, discard: true }))) return;
      const rowLimit = conn.rowLimit || get().settings.rowLimit || DEFAULT_ROW_LIMIT;
      // MongoDB: the query bar's Limit, when set, is the page size
      const limit = conn.engine === "mongo" && Number(tab.limit) > 0 ? Number(tab.limit) : rowLimit;
      const mongo = conn.engine === "mongo";
      const sql = mongo ? `find(${tab.where.trim() || "{}"})` : tableSelect(conn.engine, tab.schema, tab.table, tab.where, limit, offset);
      const runId = uid();
      const prev = tab.run;
      patchTab(tabId, { offset, view: "rows", run: { status: "running", runId, startedAt: Date.now(), outcome: prev.outcome } });
      // MongoDB: find on the collection (its "schema" is its database); the boxes are read in Rust before anything is sent
      const out = await (mongo
        ? api.mongoFind({ runId, connId, database: tab.schema, collection: tab.table, filter: tab.where, projection: tab.project ?? "", sort: tab.sort ?? "", skip: offset, limit })
        : api.runQuery({ runId, connId, database: s.database, schema: s.schema, sql, addLimit: false, approval: opts.approval, history: false })
      ).catch(failed);
      const now = sessionOfTab(tabId)?.[2];
      if (!now || now.run.runId !== runId) return;
      if (out.kind === "ask") {
        // the where clause carried a statement that changes data
        patchTab(tabId, { run: prev });
        get().openModal({ kind: "guard", ask: out, connName: conn.name, onApprove: (approval) => void get().readTable(tabId, { offset, approval, discard: true }) });
        return;
      }
      dropEdits(tabId);
      patchTab(tabId, { run: { status: "done", runId, outcome: out, sql } });
    },

    async loadTableInfo(tabId) {
      const hit = sessionOfTab(tabId);
      if (!hit || hit[2].kind !== "table") return;
      const [connId, s, tab] = hit as [string, Session, TableTab];
      try {
        const info = await api.tableInfo(connId, s.database, tab.schema, tab.table);
        patchTab(tabId, { info, infoError: undefined });
      } catch (e) {
        patchTab(tabId, { infoError: errText(e) });
      }
    },

    async saveTab(tabId, name, folder) {
      const t = sessionOfTab(tabId)?.[2];
      if (!t || t.kind !== "query") return;
      if (!t.savedId && name === undefined) {
        get().openModal({ kind: "saveQuery", tabId });
        return;
      }
      try {
        const q = await api.saveQuery({ id: t.savedId ?? "", name: name ?? t.title, folder: folder ?? t.savedFolder ?? "", sql: t.sql, connId: get().currentId });
        patchTab(tabId, { savedId: q.id, savedFolder: q.folder, savedSql: q.sql, title: q.name });
        void get().loadSaved();
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    // the open connection's history; nothing on Home
    async loadHistory(search) {
      const id = get().currentId;
      if (!id) return set({ history: [] });
      try {
        const history = await api.listHistory(id, search);
        // a switch to another connection while this was loading: that connection's load wins
        if (get().currentId === id) set({ history });
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    async loadSaved() {
      try {
        set({ saved: await api.listSaved() });
      } catch (e) {
        get().showToast(errText(e));
      }
    },
  };
});

useStore.subscribe((st, prev) => {
  if (st.sessions === prev.sessions) return;
  for (const [id, s] of Object.entries(st.sessions)) {
    const before = prev.sessions[id];
    if (!restored.has(id) || (before && s.tabs === before.tabs && s.activeTabId === before.activeTabId)) continue;
    clearTimeout(saveTimers.get(id));
    saveTimers.set(id, setTimeout(() => void flushWorkspace(id), WORKSPACE_SAVE_MS));
  }
});

function newQuery(n: number): QueryTab {
  return { id: uid(), kind: "query", title: `Query ${n}`, sql: "", run: { status: "idle" } };
}

/** Redis: each KEYS line as the first SCAN step over the same pattern; null when there is no KEYS to change */
export function keysToScan(text: string): string | null {
  let hit = false;
  const out = text
    .split("\n")
    .map((l) => {
      const m = /^(\s*)KEYS\s+(\S+)\s*$/i.exec(l);
      if (!m) return l;
      hit = true;
      return `${m[1]}SCAN 0 MATCH ${m[2]} COUNT 1000`;
    })
    .join("\n");
  return hit ? out : null;
}

export const isDirty = (t: QueryTab) => (t.savedId ? t.sql !== t.savedSql : t.sql.trim() !== "");

/** The open connection and its session, for components. */
export function useCurrent() {
  const id = useStore((s) => s.currentId);
  const conn = useStore((s) => s.conns.find((c) => c.id === s.currentId));
  const session = useStore((s) => (s.currentId ? s.sessions[s.currentId] : undefined));
  return { id, conn, session };
}
