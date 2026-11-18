import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useCurrent, useStore, type SideView } from "./store";
import { Sidebar } from "./components/Sidebar";
import { TabsBar } from "./components/TabsBar";
import { QueryPane } from "./components/QueryPane";
import { TablePane } from "./components/TablePane";
import { DiagramPane } from "./components/DiagramPane";
import { CollectionPane } from "./components/CollectionPane";
import { KeyPane } from "./components/KeyPane";
import { Modals } from "./components/Modals";
import { Home } from "./components/Home";
import { ConnTile } from "./components/ConnTile";
import { DEFAULT_SCHEME, findScheme, isDark } from "./lib/themes";
import { schemeTokens } from "./lib/themes";
import { connColorId } from "./lib/connColors";
import { useUpdates } from "./updates";
import { UpdateChip } from "./components/UpdateChip";
import { Bookmark, Database, HistoryIcon, House, ListTree, Settings2, X, ico, icoLg } from "./components/Icon";

export const SIDEBAR_DEFAULT = 296;
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 560;
/** dragging the edge this far below the minimum hides the sidebar */
const SIDEBAR_HIDE_AT = SIDEBAR_MIN - 80;

const UI_FALLBACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
/** A family picked in Settings ("JetBrains Mono") becomes a quoted stack with system fallbacks; a full stack is used as is. */
function stack(font: string | undefined, fallback: string): string | undefined {
  const f = font?.trim();
  if (!f) return undefined;
  return f.includes(",") ? f : `"${f.replace(/"/g, "")}", ${fallback}`;
}

/**
 * Theme picks the look (Auto follows the OS), the look picks a slot, the slot holds a colour scheme.
 * Built-in schemes are tokens.css under data-theme; any other scheme also writes its tokens inline on :root.
 */
function useTheme() {
  const theme = useStore((st) => st.settings.theme) ?? "auto";
  const lightScheme = useStore((st) => st.settings.lightScheme) ?? DEFAULT_SCHEME.light;
  const darkScheme = useStore((st) => st.settings.darkScheme) ?? DEFAULT_SCHEME.dark;
  const [osDark, setOsDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setOsDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const look = theme === "auto" ? (osDark ? "dark" : "light") : theme;
    const id = look === "dark" ? darkScheme : lightScheme;
    const scheme = findScheme(id);
    const vars = scheme ? schemeTokens(scheme) : {};
    root.dataset.theme = scheme ? (isDark(scheme) ? "dark" : "light") : id === "ypacapy-dark" ? "dark" : id === "ypacapy-light" ? "light" : look;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
    };
  }, [theme, osDark, lightScheme, darkScheme]);
}

/** The three user fonts and their sizes, and compact mode, as tokens on <html>; empty settings keep the CSS defaults. */
function useTypeTokens() {
  const s = useStore((st) => st.settings);
  useEffect(() => {
    const root = document.documentElement.style;
    const set = (prop: string, v: string | undefined) => (v ? root.setProperty(prop, v) : root.removeProperty(prop));
    set("--font-ui", stack(s.fontUi, UI_FALLBACK));
    set("--font-table", stack(s.fontTable, MONO_FALLBACK));
    set("--font-mono", stack(s.fontMono, MONO_FALLBACK));
    set("--font-size-ui", s.fontSizeUi ? `${s.fontSizeUi}px` : undefined);
    set("--font-size-table", s.fontSizeTable ? `${s.fontSizeTable}px` : undefined);
    set("--font-size-code", s.fontSizeCode ? `${s.fontSizeCode}px` : undefined);
  }, [s.fontUi, s.fontTable, s.fontMono, s.fontSizeUi, s.fontSizeTable, s.fontSizeCode]);
  useEffect(() => {
    const root = document.documentElement;
    if (s.compact) root.dataset.density = "compact";
    else delete root.dataset.density;
  }, [s.compact]);
}

/** Title strip: Home and the open connections, beside the native macOS traffic lights. Drag it to move the window. */
function AppStrip() {
  const conns = useStore((s) => s.conns);
  const openIds = useStore((s) => s.openIds);
  const view = useStore((s) => s.view);
  const current = useStore((s) => s.currentId);
  const settingsOpen = useStore((s) => s.modal?.kind === "settings");
  const st = useStore.getState();

  return (
    <div className="app-strip" data-tauri-drag-region>
      <nav className="ptabs" aria-label="Connections" data-tauri-drag-region>
        <button type="button" className="ptab" aria-current={view === "home" ? "page" : undefined} onClick={() => st.goHome()}>
          <House {...ico} />
          Home
        </button>
        {openIds.length > 0 && <span className="ptab-sep" aria-hidden="true" />}
        {openIds.map((id) => {
          const c = conns.find((x) => x.id === id);
          if (!c) return null;
          const n = connColorId(c.color);
          // the tab wears the connection's colour (fill, ring, tile), so a production connection is seen at a glance
          return (
            <div
              key={id}
              className="ptab ptab--project"
              style={{ "--fg": `var(--proj-${n}-fg)`, "--bg": `var(--proj-${n}-bg)` } as React.CSSProperties}
              aria-current={view === "conn" && current === id ? "page" : undefined}
            >
              <button type="button" className="ptab-main" onClick={() => st.openConn(id)}>
                <ConnTile conn={c} small typed />
                {c.name}
              </button>
              <button type="button" className="icon-btn ptab-close" aria-label={`Close ${c.name}`} onClick={() => st.closeConn(id)}>
                <X {...ico} />
              </button>
            </div>
          );
        })}
      </nav>
      <div className="strip-end">
        <UpdateChip />
        <button type="button" className="icon-btn strip-settings" title="Settings  ⌘," aria-label="Settings" aria-expanded={settingsOpen} onClick={() => st.openModal({ kind: "settings" })}>
          <Settings2 {...ico} />
        </button>
      </div>
    </div>
  );
}

function ConnWork() {
  const { session, conn } = useCurrent();
  const tab = session?.tabs.find((t) => t.id === session.activeTabId);
  const st = useStore.getState();
  if (!session) return null;
  if (session.status === "opening")
    return (
      <div className="state">
        <div className="empty">
          <span className="spinner" />
          <strong>Connecting</strong>
        </div>
      </div>
    );
  if (session.status === "error")
    return (
      <div className="state">
        <div className="error-box">
          <strong>Could not connect</strong>
          <span className="msg">{session.error}</span>
          <div className="actions">
            <button type="button" className="btn" onClick={() => st.currentId && st.reconnect(st.currentId)}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  if (!tab)
    return (
      <div className="state">
        <div className="empty">
          <strong>No tab open</strong>
          <span>Open a table from the schema, or start a query.</span>
          <button type="button" className="btn" onClick={() => st.newQueryTab()}>
            New query
          </button>
        </div>
      </div>
    );
  if (tab.kind === "query") return <QueryPane key={tab.id} tab={tab} />;
  // Redis: a key, read for its type
  if (tab.kind === "key") return <KeyPane key={tab.id} tab={tab} />;
  // an ER diagram of picked tables (SQL engines)
  if (tab.kind === "diagram") return <DiagramPane key={tab.id} tab={tab} />;
  // MongoDB: a collection gets the query bar, not a where clause
  return conn?.engine === "mongo" ? <CollectionPane key={tab.id} tab={tab} /> : <TablePane key={tab.id} tab={tab} />;
}

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const appView = useStore((s) => s.view);
  const toast = useStore((s) => s.toast);
  const side = useStore((s) => s.side);
  const settings = useStore((s) => s.settings);
  // while the edge is dragged the width lives here; it is saved to settings on release
  const [liveSide, setLiveSide] = useState<{ width: number; hidden: boolean } | null>(null);
  const sideWidth = liveSide?.width ?? settings.sidebarWidth ?? SIDEBAR_DEFAULT;
  const sideHidden = liveSide?.hidden ?? !!settings.sidebarHidden;
  useTypeTokens();
  useTheme();

  useEffect(() => {
    void useStore.getState().init();
  }, []);

  // Updates: one quiet check once settings have loaded (autoUpdateCheck: false turns it off).
  // Dev builds never check (src/updates.ts). The title-strip chip shows what it finds.
  useEffect(() => {
    if (!loaded || useStore.getState().settings.autoUpdateCheck === false) return;
    void useUpdates.getState().check({ quiet: true });
  }, [loaded]);

  // app-wide keys: ⌘T new query, ⌘\ sidebar, ⌘S save; ⌘W and ⌘, come from the native menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (!e.metaKey || s.modal) return;
      if (e.key === "t" && s.view === "conn") {
        e.preventDefault();
        s.newQueryTab();
      } else if (e.key === "\\") {
        e.preventDefault();
        void s.setSettings({ sidebarHidden: !s.settings.sidebarHidden });
      } else if (e.key === "s" && s.view === "conn" && s.currentId) {
        e.preventDefault();
        const ses = s.sessions[s.currentId];
        if (ses?.activeTabId) void s.saveTab(ses.activeTabId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const offs = [
      listen("menu:close-tab", () => {
        const s = useStore.getState();
        if (s.modal) s.openModal(null);
        else if (s.view === "conn" && s.currentId) {
          const ses = s.sessions[s.currentId];
          if (ses?.activeTabId) s.closeTab(ses.activeTabId);
        }
      }),
      listen("menu:settings", () => useStore.getState().openModal({ kind: "settings" })),
      // "About ypacapy" opens our own dialog instead of the native panel
      listen("menu:about", () => useStore.getState().openModal({ kind: "about" })),
      // "Check for Updates…": the chip's popover when there is something to act on, otherwise Settings > Updates
      listen("menu:check-updates", async () => {
        const u = useUpdates.getState();
        const busy = ["downloading", "installing", "ready"].includes(u.state.kind);
        const s = busy ? u.state : await u.check();
        if (s.kind === "available" || busy) u.setPopover(true);
        else useStore.getState().openModal({ kind: "settings", section: "updates" });
      }),
    ];
    return () => offs.forEach((p) => p.then((off) => off()));
  }, []);

  /** Drag the sidebar's right edge: resize between the limits, hide past the minimum, come back when dragged out again. */
  const startSideResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = sideWidth;
    let state = { width: w0, hidden: false };
    document.body.classList.add("col-resizing");
    const move = (ev: MouseEvent) => {
      const w = w0 + ev.clientX - x0;
      state = w < SIDEBAR_HIDE_AT ? { width: w0, hidden: true } : { width: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)), hidden: false };
      setLiveSide(state);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.classList.remove("col-resizing");
      void useStore.getState().setSettings({ sidebarWidth: state.width, sidebarHidden: state.hidden });
      setLiveSide(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!loaded) return <div className="boot" />;

  const rail = (v: SideView, label: string, Icon: typeof ListTree) => (
    <button type="button" className="rail-item" aria-label={label} title={label} aria-current={side === v ? "page" : undefined} onClick={() => useStore.getState().setSide(v)}>
      <Icon {...icoLg} />
    </button>
  );

  return (
    <div className="app">
      <AppStrip />
      {appView === "home" ? (
        <Home />
      ) : (
        <>
          <nav className="rail" aria-label="Sections">
            <div className="rail-mark" aria-hidden="true">
              <Database {...ico} />
            </div>
            {rail("schema", "Schema", ListTree)}
            {rail("history", "History", HistoryIcon)}
            {rail("saved", "Saved queries", Bookmark)}
          </nav>
          <div className="panel" style={{ gridTemplateColumns: sideHidden ? "minmax(0, 1fr)" : `${sideWidth}px minmax(0, 1fr)` }}>
            {!sideHidden && <Sidebar view={side} onResizeStart={startSideResize} />}
            <main className="work">
              <TabsBar />
              <ConnWork />
            </main>
          </div>
        </>
      )}
      <Modals />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
