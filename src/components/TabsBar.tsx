import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isDirty, useCurrent, useStore } from "../store";
import { LEVELS } from "../types";
import { useDismiss } from "./useDismiss";
import { LEVEL_ICON, LevelItems } from "./LevelPicker";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Pin, PinOff, Plus, ShieldOff, SquareCode, Table2, X, icoC, ico } from "./Icon";

/** The security level of the open connection: voidHTTP's environment picker and menu. Lowering from Strict asks for the passphrase (store.setLevel). */
function GuardPicker() {
  const { conn } = useCurrent();
  const passSet = useStore((s) => s.pass.set);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  if (!conn) return null;
  const level = conn.level;
  const [, label] = LEVELS.find(([l]) => l === level) ?? LEVELS[0];
  const Icon = LEVEL_ICON[level] ?? ShieldOff;
  return (
    <div className="menu-anchor env-group guard" ref={ref}>
      <button
        type="button"
        className="env-picker"
        data-level={level}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Security level for ${conn.name}: ${label}`}
        title={`Security level for ${conn.name}`}
        onClick={() => setOpen(!open)}
      >
        <Icon {...icoC("guard-ico")} />
        <span className="env-name">{label}</span>
        <ChevronDown {...ico} />
      </button>
      {open && (
        <div className="menu guard-menu" role="menu" aria-label={`Security level for ${conn.name}`}>
          <p className="menu-note">Security level for {conn.name}</p>
          <LevelItems
            value={level}
            off={(l) => l === "strict" && !passSet && level !== "strict" && "Set a passphrase in Settings first"}
            onPick={(l) => {
              setOpen(false);
              void useStore.getState().setLevel(l);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** A tab's right-click menu: Pin tab / Unpin tab, and Close tab (off while pinned). Opens at the pointer. */
function TabMenu({ x, y, pinned, onPin, onClose, onDismiss }: { x: number; y: number; pinned: boolean; onPin: () => void; onClose: () => void; onDismiss: () => void }) {
  const ref = useDismiss(true, onDismiss);
  const [pos, setPos] = useState({ left: x, top: y });
  // kept inside the window: flips up or left near an edge
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = m.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(x, innerWidth - r.width - 8)), top: y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y });
    m.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [x, y, ref]);
  return createPortal(
    <div className="menu ctx-menu" role="menu" aria-label="Tab" ref={ref} style={pos} onContextMenu={(e) => e.preventDefault()}>
      <button type="button" role="menuitem" onClick={onPin}>
        {pinned ? <PinOff {...ico} /> : <Pin {...ico} />}
        {pinned ? "Unpin tab" : "Pin tab"}
      </button>
      <hr />
      <button type="button" role="menuitem" disabled={pinned} onClick={onClose}>
        <X {...ico} />
        Close tab<kbd>⌘W</kbd>
      </button>
      {pinned && <p className="menu-note">Unpin the tab to close it</p>}
    </div>,
    document.body,
  );
}

export function TabsBar() {
  const { session } = useCurrent();
  const sidebarHidden = useStore((s) => !!s.settings.sidebarHidden);
  const st = useStore.getState();
  const activeTabId = session?.activeTabId;
  // a tab out of view comes in when picked
  useEffect(() => {
    document.querySelector('.tabsbar .tab[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);
  // many tabs: the row scrolls sideways with no scrollbar, so the edge with tabs past it fades (data-fade-*),
  // and a mouse wheel scrolls the row
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabCount = session?.tabs.length ?? 0;
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuTab = menu ? session?.tabs.find((t) => t.id === menu.id) : undefined;
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const edges = () => {
      el.dataset.fadeStart = String(el.scrollLeft > 1);
      el.dataset.fadeEnd = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
    };
    const ro = new ResizeObserver(edges);
    ro.observe(el);
    for (const c of el.children) ro.observe(c);
    el.addEventListener("scroll", edges, { passive: true });
    el.addEventListener("wheel", wheel, { passive: true });
    edges();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", edges);
      el.removeEventListener("wheel", wheel);
    };
  }, [tabCount]);

  return (
    <div className="tabsbar">
      <button
        type="button"
        className="icon-btn side-toggle"
        title={`${sidebarHidden ? "Show" : "Hide"} sidebar  ⌘\\`}
        aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
        onClick={() => st.setSettings({ sidebarHidden: !sidebarHidden })}
      >
        {sidebarHidden ? <PanelLeftOpen {...ico} /> : <PanelLeftClose {...ico} />}
      </button>
      <div className="tabs" ref={tabsRef}>
        {session?.tabs.map((t) => {
          const name = t.kind === "query" ? t.title : t.table;
          return (
            <div
              key={t.id}
              className="tab"
              aria-current={t.id === activeTabId ? "page" : undefined}
              data-pinned={t.pinned || undefined}
              onAuxClick={(e) => e.button === 1 && st.closeTab(t.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: t.id, x: e.clientX, y: e.clientY });
              }}
            >
              <button type="button" className="tab-main" title={t.kind === "table" ? `${t.schema}.${t.table}` : name} onClick={() => st.setActiveTab(t.id)}>
                {t.kind === "query" ? <SquareCode {...ico} /> : <Table2 {...ico} />}
                <span className="name">{name}</span>
                {t.kind === "query" && isDirty(t) && <span className="dirty" role="img" aria-label="Unsaved changes" />}
              </button>
              {t.pinned ? (
                <button type="button" className="icon-btn pin" aria-label={`Unpin ${name}`} title={`Pinned: kept with this connection. Click to unpin`} onClick={() => st.pinTab(t.id, false)}>
                  <Pin {...ico} />
                </button>
              ) : (
                <button type="button" className="icon-btn close" aria-label={`Close ${name}`} onClick={() => st.closeTab(t.id)}>
                  <X {...ico} />
                </button>
              )}
            </div>
          );
        })}
        {session?.status === "open" && (
          <button type="button" className="icon-btn tab-add" title="New query  ⌘T" aria-label="New query tab" onClick={() => st.newQueryTab()}>
            <Plus {...ico} />
          </button>
        )}
      </div>
      {menu && menuTab && (
        <TabMenu
          x={menu.x}
          y={menu.y}
          pinned={!!menuTab.pinned}
          onDismiss={() => setMenu(null)}
          onPin={() => {
            setMenu(null);
            st.pinTab(menuTab.id, !menuTab.pinned);
          }}
          onClose={() => {
            setMenu(null);
            st.closeTab(menuTab.id);
          }}
        />
      )}
      <GuardPicker />
    </div>
  );
}
