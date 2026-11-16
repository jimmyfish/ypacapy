import { create } from "zustand";
import { api, errText } from "./lib/api";
import { tableSelect } from "./lib/sql";
import type { Approval, Ask, Conn, GuardLevel, HistoryEntry, QueryTab, RunOutcome, Saved, Session, Settings, Tab, TableTab } from "./types";

export type SettingsSection = "appearance" | "queries" | "security" | "data";
export type SideView = "schema" | "history" | "saved";

export type Modal =
  | { kind: "settings"; section?: SettingsSection }
  | { kind: "connect"; conn?: Conn }
  | { kind: "confirm"; title: string; message: string; confirmLabel?: string; onConfirm: () => void }
  | { kind: "prompt"; title: string; label: string; initial: string; onSubmit: (v: string) => void }
  | { kind: "saveQuery"; tabId: string }
  | { kind: "guard"; ask: Ask; connName: string; onApprove: (a: Approval) => void }
  | { kind: "lowerGuard"; connId: string; level: GuardLevel };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const DEFAULT_ROW_LIMIT = 500;

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

  init(): Promise<void>;
  setSettings(patch: Partial<Settings>): Promise<void>;
  openModal(m: Modal | null): void;
  showToast(msg: string): void;
  setSide(v: SideView): void;

  refreshConns(): Promise<void>;
  deleteConn(id: string): Promise<void>;
  openConn(id: string): Promise<void>;
  closeConn(id: string): Promise<void>;
  goHome(): void;
  reconnect(id: string): Promise<void>;
  setDatabase(db: string): Promise<void>;
  setSchema(schema: string): void;
  setGuard(level: GuardLevel): Promise<void>;

  toggle(path: string): void;
  loadSchema(schema: string): Promise<void>;
  refreshTree(id?: string): void;

  newQueryTab(sql?: string, title?: string, saved?: Saved): string;
  openTable(schema: string, table: string): void;
  setActiveTab(id: string): void;
  closeTab(id: string, force?: boolean): void;
  updateTab(id: string, patch: Partial<QueryTab> | Partial<TableTab>): void;
  run(tabId: string, opts?: { sql?: string; approval?: Approval }): Promise<void>;
  cancel(tabId: string): void;
  readTable(tabId: string, opts?: { offset?: number; approval?: Approval }): Promise<void>;
  loadTableInfo(tabId: string): Promise<void>;
  saveTab(tabId: string, name?: string, folder?: string): Promise<void>;

  loadHistory(search?: string): Promise<void>;
  loadSaved(): Promise<void>;
}

const emptySession = (): Session => ({ status: "opening", database: "", schema: "", tree: {}, expanded: {}, tabs: [], activeTabId: null });

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
  const patchTab = (tabId: string, patch: Partial<QueryTab> | Partial<TableTab>) => {
    const hit = sessionOfTab(tabId);
    if (!hit) return;
    patchSession(hit[0], (s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? ({ ...t, ...patch } as Tab) : t)) }));
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
      try {
        await api.deleteConnection(id);
      } catch (e) {
        get().showToast(errText(e));
      }
      await get().refreshConns();
    },

    async openConn(id) {
      set((st) => ({ view: "conn", currentId: id, openIds: st.openIds.includes(id) ? st.openIds : [...st.openIds, id] }));
      const existing = get().sessions[id];
      if (existing && existing.status !== "error") return;
      set((st) => ({ sessions: { ...st.sessions, [id]: { ...emptySession(), tabs: existing?.tabs ?? [], activeTabId: existing?.activeTabId ?? null } } }));
      void api.touchConnection(id).then(() => get().refreshConns());
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
          expanded: schema ? { [schema]: true, [`${schema}/tables`]: true, [`${schema}/views`]: true } : {},
          ...(s.tabs.length ? {} : (() => {
            const t = newQuery(1);
            return { tabs: [t], activeTabId: t.id };
          })()),
        }));
        if (schema) void get().loadSchema(schema);
      } catch (e) {
        patchSession(id, () => ({ status: "error", error: errText(e) }));
      }
    },

    async closeConn(id) {
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
      patchSession(id, () => ({ status: "error" }));
      await get().openConn(id);
    },

    async setDatabase(db) {
      const id = get().currentId;
      if (!id) return;
      patchSession(id, () => ({ database: db, tree: {} }));
      try {
        const info = await api.openConnection(id, db);
        const conn = get().conns.find((c) => c.id === id);
        // MySQL: a database is a schema, so the picked one becomes the open schema too
        const schema = conn?.engine === "mysql" ? db : info.defaultSchema;
        patchSession(id, () => ({ info, database: info.database || db, schema, tree: {}, expanded: { [schema]: true, [`${schema}/tables`]: true, [`${schema}/views`]: true } }));
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

    async setGuard(level) {
      const id = get().currentId;
      const conn = get().conns.find((c) => c.id === id);
      if (!id || !conn || conn.guard === level) return;
      if (conn.guard === "verify" && get().pass.set) {
        get().openModal({ kind: "lowerGuard", connId: id, level });
        return;
      }
      try {
        await api.setGuard(id, level);
        await get().refreshConns();
      } catch (e) {
        get().showToast(errText(e));
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

    /** Refresh button, DDL that ypacapy ran, Reconnect: the cached tree goes and the open schemas reload. */
    refreshTree(connId) {
      const id = connId ?? get().currentId;
      if (!id) return;
      const s = get().sessions[id];
      if (!s) return;
      const open = Object.keys(s.tree);
      patchSession(id, () => ({ tree: {} }));
      if (id === get().currentId) for (const schema of open) void get().loadSchema(schema);
    },

    newQueryTab(sql = "", title, saved) {
      const id = get().currentId;
      if (!id) return "";
      const s = get().sessions[id];
      const n = s.tabs.filter((t) => t.kind === "query").length + 1;
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
      if (tab.run.status === "running" && tab.run.runId) void api.cancelQuery(tab.run.runId);
      patchSession(id, (s) => {
        const i = s.tabs.findIndex((t) => t.id === tabId);
        const tabs = s.tabs.filter((t) => t.id !== tabId);
        const activeTabId = s.activeTabId === tabId ? (tabs[Math.min(i, tabs.length - 1)]?.id ?? null) : s.activeTabId;
        return { tabs, activeTabId };
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
        get().openModal({ kind: "guard", ask: out, connName: conn?.name ?? "", onApprove: (approval) => void get().run(tabId, { ...opts, approval }) });
        return;
      }
      patchTab(tabId, { run: { status: "done", runId, outcome: out } });
      if (out.kind === "done" && out.ddl) get().refreshTree(connId);
      if (out.kind === "error" && out.lost) patchSession(connId, () => ({ tree: {} }));
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
      const limit = get().settings.rowLimit || DEFAULT_ROW_LIMIT;
      const sql = tableSelect(conn.engine, tab.schema, tab.table, tab.where, limit, offset);
      const runId = uid();
      const prev = tab.run;
      patchTab(tabId, { offset, view: "rows", run: { status: "running", runId, startedAt: Date.now(), outcome: prev.outcome } });
      const out = await api.runQuery({ runId, connId, database: s.database, schema: s.schema, sql, addLimit: false, approval: opts.approval, history: false }).catch(failed);
      const now = sessionOfTab(tabId)?.[2];
      if (!now || now.run.runId !== runId) return;
      if (out.kind === "ask") {
        // the where clause carried a statement that changes data
        patchTab(tabId, { run: prev });
        get().openModal({ kind: "guard", ask: out, connName: conn.name, onApprove: (approval) => void get().readTable(tabId, { offset, approval }) });
        return;
      }
      patchTab(tabId, { run: { status: "done", runId, outcome: out } });
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

    async loadHistory(search) {
      try {
        set({ history: await api.listHistory(search) });
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

function newQuery(n: number): QueryTab {
  return { id: uid(), kind: "query", title: `Query ${n}`, sql: "", run: { status: "idle" } };
}

export const isDirty = (t: QueryTab) => (t.savedId ? t.sql !== t.savedSql : t.sql.trim() !== "");

/** The open connection and its session, for components. */
export function useCurrent() {
  const id = useStore((s) => s.currentId);
  const conn = useStore((s) => s.conns.find((c) => c.id === s.currentId));
  const session = useStore((s) => (s.currentId ? s.sessions[s.currentId] : undefined));
  return { id, conn, session };
}
