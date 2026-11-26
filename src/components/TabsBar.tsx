import "./TabsBar.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isDirty, useCurrent, useStore } from "../store";
import { diagramChanged, diagramKey } from "../lib/diagramTab";
import { LEVELS } from "../types";
import { useDismiss } from "./useDismiss";
import { LEVEL_ICON, LevelItems } from "./LevelPicker";
import { ArrowLeftToLine, ArrowRightToLine, Braces, ChevronDown, CopyX, Key, Network, PanelLeftClose, PanelLeftOpen, Pin, PinOff, Plus, ShieldOff, SquareCode, Table2, X, icoC, ico } from "./Icon";

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
            commands={conn.engine === "redis"}
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

/** The bulk closes of a tab's menu: tab ids to close, never a pinned tab nor the tab itself */
type BulkClose = { others: string[]; right: string[]; left: string[] };

/**
 * A tab's right-click menu: Pin tab / Unpin tab, Close tab (off while pinned), and voidHTTP's Close other tabs, Close
 * tabs to the right and Close tabs to the left, each greyed out when there's nothing to close. Opens at the pointer.
 * A diagram can't be pinned (unpinnable): its note says Show diagram reopens it once saved.
 */
function TabMenu({ x, y, pinned, unpinnable, bulk, onPin, onClose, onCloseMany, onDismiss }: { x: number; y: number; pinned: boolean; unpinnable?: boolean; bulk: BulkClose; onPin: () => void; onClose: () => void; onCloseMany: (ids: string[]) => void; onDismiss: () => void }) {
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
      {!unpinnable && (
        <>
          <button type="button" role="menuitem" onClick={onPin}>
            {pinned ? <PinOff {...ico} /> : <Pin {...ico} />}
            {pinned ? "Unpin tab" : "Pin tab"}
          </button>
          <hr />
        </>
      )}
      <button type="button" role="menuitem" disabled={pinned} onClick={onClose}>
        <X {...ico} />
        Close tab<kbd>⌘W</kbd>
      </button>
      <button type="button" role="menuitem" disabled={!bulk.others.length} onClick={() => onCloseMany(bulk.others)}>
        <CopyX {...ico} />
        Close other tabs
      </button>
      <button type="button" role="menuitem" disabled={!bulk.right.length} onClick={() => onCloseMany(bulk.right)}>
        <ArrowRightToLine {...ico} />
        Close tabs to the right
      </button>
      <button type="button" role="menuitem" disabled={!bulk.left.length} onClick={() => onCloseMany(bulk.left)}>
        <ArrowLeftToLine {...ico} />
        Close tabs to the left
      </button>
      {pinned && <p className="menu-note">Unpin the tab to close it</p>}
      {unpinnable && <p className="menu-note tm-wrap">Diagrams are not pinned. Once saved, Show diagram reopens this one as saved.</p>}
    </div>,
    document.body,
  );
}

export function TabsBar() {
  const { session, conn } = useCurrent();
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
  // drag to reorder: the held tab follows the pointer inside its group (pinned ones, or the rest), the others slide
  // aside to show where it lands. `base` is the group's first index in the row, `from` and `to` are group indices.
  const [drag, setDrag] = useState<{ id: string; dx: number; base: number; from: number; to: number; step: number } | null>(null);
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    const box = tabsRef.current;
    const tabs = session?.tabs;
    if (e.button !== 0 || !box || !tabs || (e.target as Element).closest(".close, .pin")) return;
    const me = tabs.find((t) => t.id === id);
    if (!me) return;
    const pins = tabs.filter((t) => t.pinned).length;
    const base = me.pinned ? 0 : pins;
    const end = me.pinned ? pins : tabs.length;
    const x0 = e.clientX + box.scrollLeft;
    const pointer = e.pointerId;
    let live: { from: number; lefts: number[]; widths: number[]; step: number; min: number; max: number; at: { dx: number; to: number } } | null = null;
    const place = (clientX: number) => {
      if (!live) return;
      const b = box.getBoundingClientRect();
      // near an edge of a scrolled row, the row scrolls under the pointer
      if (clientX < b.left + 32) box.scrollLeft -= 10;
      else if (clientX > b.right - 32) box.scrollLeft += 10;
      const { from, lefts, widths, min, max } = live;
      const dx = Math.min(max, Math.max(min, clientX + box.scrollLeft - x0));
      const mid = lefts[from] + widths[from] / 2 + dx;
      const to = lefts.filter((l, j) => j !== from && l + widths[j] / 2 < mid).length;
      live.at = { dx, to };
      setDrag({ id, dx, base, from, to, step: live.step });
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      if (!live) {
        if (Math.abs(ev.clientX + box.scrollLeft - x0) < 5) return;
        const els = [...box.querySelectorAll<HTMLElement>(":scope > .tab")].slice(base, end);
        const from = els.findIndex((el) => el.dataset.id === id);
        if (from < 0) return stop();
        const lefts = els.map((el) => el.getBoundingClientRect().left + box.scrollLeft);
        const widths = els.map((el) => el.getBoundingClientRect().width);
        const last = els.length - 1;
        const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
        live = { from, lefts, widths, step: widths[from] + gap, min: lefts[0] - lefts[from], max: lefts[last] + widths[last] - lefts[from] - widths[from], at: { dx: 0, to: from } };
      }
      place(ev.clientX);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keydown", key, true);
      setDrag(null);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      const done = live;
      stop();
      if (!done) return;
      // the click that ends a drag doesn't also pick a tab
      const eat = (c: MouseEvent) => c.stopPropagation();
      window.addEventListener("click", eat, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", eat, true), 0);
      if (done.at.to !== done.from) st.moveTab(id, base + done.at.to);
      st.setActiveTab(id);
    };
    // Escape puts the tab back
    const key = (k: KeyboardEvent) => {
      if (k.key !== "Escape" || !live) return;
      k.preventDefault();
      k.stopPropagation();
      live = null;
      stop();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keydown", key, true);
  };
  const bulkOf = (id: string): BulkClose => {
    const tabs = session?.tabs ?? [];
    const i = tabs.findIndex((t) => t.id === id);
    const ids = (list: typeof tabs) => list.filter((t) => !t.pinned && t.id !== id).map((t) => t.id);
    return { others: ids(tabs), right: ids(tabs.slice(i + 1)), left: ids(tabs.slice(0, i)) };
  };
  const shift = (i: number, id: string) => {
    if (!drag) return 0;
    if (id === drag.id) return drag.dx;
    const j = i - drag.base;
    if (drag.from < j && j <= drag.to) return -drag.step;
    if (drag.to <= j && j < drag.from) return drag.step;
    return 0;
  };
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
      <div className="tabs" ref={tabsRef} data-dragging={drag ? true : undefined}>
        {session?.tabs.map((t, i) => {
          const name = t.kind === "query" ? t.title : t.kind === "key" ? t.key : t.kind === "table" ? t.table : (t.origin ?? t.schema);
          const unsaved = t.kind === "query" ? isDirty(t) : t.kind === "diagram" && diagramChanged(t, session.diagrams?.[diagramKey(t)]);
          const x = shift(i, t.id);
          return (
            <div
              key={t.id}
              className="tab"
              data-id={t.id}
              aria-current={t.id === activeTabId ? "page" : undefined}
              data-pinned={t.pinned || undefined}
              data-dragging={drag?.id === t.id || undefined}
              style={x ? { transform: `translateX(${x}px)` } : undefined}
              onPointerDown={(e) => startDrag(e, t.id)}
              onAuxClick={(e) => e.button === 1 && st.closeTab(t.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: t.id, x: e.clientX, y: e.clientY });
              }}
            >
              <button
                type="button"
                className="tab-main"
                title={t.kind === "table" ? `${t.schema}.${t.table}` : t.kind === "diagram" ? `Diagram of ${t.origin ? `${t.schema}.${t.origin}` : t.schema}` : name}
                onClick={() => st.setActiveTab(t.id)}
              >
                {t.kind === "query" ? <SquareCode {...ico} /> : t.kind === "key" ? <Key {...ico} /> : t.kind === "diagram" ? <Network {...ico} /> : conn?.engine === "mongo" ? <Braces {...ico} /> : <Table2 {...ico} />}
                <span className="name">{name}</span>
                {unsaved && <span className="dirty" role="img" aria-label={t.kind === "diagram" ? "Unsaved layout" : "Unsaved changes"} />}
              </button>
              {t.pinned ? (
                <button type="button" className="icon-btn pin" aria-label={`Unpin ${name}`} title="Pinned to this connection. Click to unpin." onClick={() => st.pinTab(t.id, false)}>
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
          unpinnable={menuTab.kind === "diagram"}
          bulk={bulkOf(menuTab.id)}
          onDismiss={() => setMenu(null)}
          onPin={() => {
            setMenu(null);
            st.pinTab(menuTab.id, !menuTab.pinned);
          }}
          onClose={() => {
            setMenu(null);
            st.closeTab(menuTab.id);
          }}
          onCloseMany={(ids) => {
            setMenu(null);
            st.closeTabs(ids, menuTab.id);
          }}
        />
      )}
      <GuardPicker />
    </div>
  );
}
