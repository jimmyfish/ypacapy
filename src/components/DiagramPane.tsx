/**
 * ER diagram tab, read-only (ported from opengrip's DiagramView, approved in the Hallmark preview .hallmark/preview
 * diagram.html). The picked tables of a schema with their columns and the foreign keys between them.
 *
 * Drag a table to move it, drag the background or scroll to pan, ⌘ + scroll or pinch to zoom. Pan and zoom move
 * the canvas with a CSS transform and never render React. Selecting a table marks the columns its keys link and
 * the cardinality at both ends; double-click opens its rows. Save (⌘S) keeps the picks and layout with the
 * connection; nothing is kept on its own. Export writes an image, Mermaid, DBML or a .drawio file on this Mac.
 */
import "./DiagramPane.css";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { api, errText } from "../lib/api";
import { estimate, kindOf, type Kind } from "../lib/cells";
import { quoteIdent } from "../lib/sql";
import { cardinality, edgeGeometry, edgeLabel, linkedColumns, visibleColumns, withLinked, type DiagramDetail, type DiagramLayout, type DiagramModel, type DiagramTable, type EdgeEnd } from "../lib/diagram";
import { diagramSvg, svgToImage, toDbml, toDrawio, toMermaid, type DiagramPalette } from "../lib/diagramExport";
import { diagramCanSave, diagramChanged, diagramKey, diagramLayoutOf, diagramModelOf, diagramViews, savedAtLabel } from "../lib/diagramTab";
import { useCurrent, useStore } from "../store";
import type { DiagramPoint, DiagramTab } from "../types";
import { useDismiss } from "./useDismiss";
import {
  Braces,
  Brackets,
  CalendarClock,
  ChevronDown,
  Copy,
  Download,
  EyeOff,
  FileCode,
  FileDown,
  Hash,
  IdCard,
  ImageIcon,
  KeyRound,
  Link,
  ListChecks,
  LoaderCircle,
  Locate,
  Maximize,
  Network,
  RefreshCw,
  Save,
  Search,
  SquareCode,
  Table2,
  ToggleLeft,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  icoC,
  ico,
} from "./Icon";

const DETAILS: { value: DiagramDetail; label: string }[] = [
  { value: "all", label: "All columns" },
  { value: "keys", label: "Key columns" },
  { value: "none", label: "Table names" },
];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const FIT_PAD = 24;
const GRID = 16;
const MARK_GAP = 5;
const ARROW_GAP = 12;
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
const TYPE_ICON: Record<Kind, typeof Hash> = { num: Hash, ts: CalendarClock, bool: ToggleLeft, json: Braces, bytes: Type, text: Type, oid: IdCard, doc: Braces, arr: Brackets };

type View = { x: number; y: number; k: number };

/** Where a cardinality mark goes: past `gap`, its text running away from the box */
const markAt = (end: EdgeEnd, gap: number) => ({ x: end.x + end.out * gap, y: end.y - 5, textAnchor: end.out > 0 ? ("start" as const) : ("end" as const) });

/** One table box; memoised so a drag renders only the box that moves */
const Box = memo(function Box({ t, index, x, y, w, h, detail, selected, outside, linked }: { t: DiagramTable; index: number; x: number; y: number; w: number; h: number; detail: DiagramDetail; selected: boolean; outside: boolean; linked: ReadonlySet<string> | undefined }) {
  const cols = visibleColumns(t, detail);
  return (
    <div
      className={`erd-table${selected ? " selected" : ""}${outside ? " outside" : ""}`}
      data-table={index}
      style={{ left: x, top: y, width: w, height: h }}
      title={`${t.schema}.${t.name}${outside ? " (linked from another schema)" : ""}`}
    >
      <div className="erd-head">
        <Table2 {...ico} />
        <span className="erd-name">{t.label}</span>
      </div>
      {cols.length > 0 && (
        <div className="erd-rows">
          {cols.map((c) => {
            const I = c.primaryKey ? KeyRound : c.foreignKey ? Link : TYPE_ICON[kindOf(c.type)];
            return (
              <div key={c.name} className={`erd-row${linked?.has(c.name) ? " linked" : ""}`}>
                <I {...icoC(c.primaryKey ? "pk" : c.foreignKey ? "fk" : "")} />
                <span className="erd-name">{c.name}</span>
                <span className="erd-type">{c.type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/** The theme's colours as the canvas paints them, for the image export */
function palette(): DiagramPalette {
  const probe = document.createElement("span");
  document.body.append(probe);
  const css = (v: string) => {
    probe.style.color = `var(${v})`;
    return getComputedStyle(probe).color;
  };
  const p = { background: css("--color-paper-3"), box: css("--color-paper"), head: css("--color-paper-2"), border: css("--color-field-edge"), ink: css("--color-ink"), muted: css("--color-muted"), line: css("--color-muted"), pk: css("--color-warn"), fk: css("--color-link") };
  probe.remove();
  return p;
}

const blobBase64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
const fileName = (path: string) => path.split("/").pop() ?? path;

export function DiagramPane({ tab }: { tab: DiagramTab }) {
  const { id: connId, conn, session } = useCurrent();
  const st = useStore.getState();
  const saved = session?.diagrams?.[diagramKey(tab)];
  const title = tab.origin ?? tab.schema;
  const allTables = useMemo(() => (session?.tree[tab.schema]?.data?.tables ?? []).filter((t) => t.kind === "table" || t.kind === "foreign"), [session?.tree, tab.schema]);

  const model = useMemo(() => diagramModelOf(tab), [tab.data, tab.tables, tab.schema]); // eslint-disable-line react-hooks/exhaustive-deps
  const tables = useMemo(() => new Map(model?.tables.map((t) => [t.key, t]) ?? []), [model]);
  /** the box being dragged, before it is committed to the tab on release */
  const [live, setLive] = useState<ReadonlyMap<string, DiagramPoint>>(new Map());
  const layout = useMemo(() => (model ? diagramLayoutOf(tab, model, saved, live) : null), [model, tab.detail, tab.moves, tab.auto, saved, live]); // eslint-disable-line react-hooks/exhaustive-deps
  const layoutRef = useRef<DiagramLayout | null>(null);
  layoutRef.current = layout;
  const [selected, setSelected] = useState<string | null>(null);
  const linked = useMemo(() => linkedColumns(model?.edges ?? [], selected), [model, selected]);

  // ---------- view: moved without React ----------
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(tab.view ?? null);
  const [pct, setPct] = useState(Math.round((tab.view?.k ?? 1) * 100));
  useEffect(() => {
    diagramViews.set(tab.id, view);
    return () => {
      diagramViews.delete(tab.id);
      // the tab keeps its zoom and pan while it is away
      if (view.current) useStore.getState().updateTab(tab.id, { view: view.current });
    };
  }, [tab.id]);
  const place = useCallback(() => {
    const v = view.current;
    if (!v || !world.current || !host.current) return;
    world.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
    host.current.style.backgroundSize = `${GRID * v.k}px ${GRID * v.k}px`;
    host.current.style.backgroundPosition = `${v.x}px ${v.y}px`;
    setPct(Math.round(v.k * 100));
  }, []);
  const fit = useCallback(() => {
    const el = host.current;
    const l = layoutRef.current;
    if (!el || !l?.width) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const k = clampZoom(Math.min(1, (width - FIT_PAD) / l.width, (height - FIT_PAD) / l.height));
    view.current = { k, x: (width - l.width * k) / 2, y: Math.max(FIT_PAD / 2, (height - l.height * k) / 2) };
    place();
  }, [place]);
  const zoomBy = useCallback(
    (f: number, at?: { x: number; y: number }) => {
      const v = view.current;
      const r = host.current?.getBoundingClientRect();
      if (!v || !r) return;
      const px = at?.x ?? r.width / 2;
      const py = at?.y ?? r.height / 2;
      const k = clampZoom(v.k * f);
      view.current = { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k };
      place();
    },
    [place],
  );
  const ready = !!layout && !!model?.tables.length && !tab.error;
  // a new drawing with no view (first draw, new picks, Reset layout) fits the window; otherwise the kept view
  // (fitted once the tables just picked are read, so the fit takes them in)
  useLayoutEffect(() => {
    if (!ready) return;
    if (!tab.view) {
      if (tab.loading) return;
      fit();
      if (view.current) useStore.getState().updateTab(tab.id, { view: view.current });
    } else {
      // the pane's own view is newer than the tab's (which is written when the pane goes away)
      if (!view.current) view.current = tab.view;
      place();
    }
  }, [ready, tab.view, tab.loading, tab.id, fit, place]);
  // wheel: pan, or zoom with ⌘/Ctrl (a trackpad pinch arrives as Ctrl + wheel); not passive, to keep the page still
  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      if (!v) return;
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomBy(Math.exp(-e.deltaY * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top });
      } else {
        view.current = { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
        place();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ready, zoomBy, place]);

  // ---------- pointer: drag a table to move it, anywhere else to pan; a press that doesn't move selects ----------
  /** last: where the dragged box is now, read on release (a fast flick can end before the next render) */
  const drag = useRef<{ x: number; y: number; moved: boolean; ox: number; oy: number; table: string | null; last?: DiagramPoint } | null>(null);
  const keyOf = (el: EventTarget) => {
    const i = (el as HTMLElement).closest<HTMLElement>("[data-table]")?.dataset.table;
    return i === undefined ? null : (model?.tables[Number(i)]?.key ?? null);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !layout) return;
    const table = keyOf(e.target);
    const box = table === null ? undefined : layout.boxes.get(table);
    const v = view.current ?? { x: 0, y: 0, k: 1 };
    drag.current = box ? { x: e.clientX, y: e.clientY, moved: false, ox: box.x, oy: box.y, table } : { x: e.clientX, y: e.clientY, moved: false, ox: v.x, oy: v.y, table: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!d.moved) {
      // captured only once it is a drag: capturing on press would retarget the click and double-click
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // a pointer the page doesn't know (synthetic): the drag still works without capture
      }
      d.moved = true;
      host.current?.classList.add("dragging");
      if (d.table !== null) setSelected(d.table);
    }
    const v = view.current ?? { x: 0, y: 0, k: 1 };
    if (d.table === null) {
      view.current = { ...v, x: d.ox + dx, y: d.oy + dy };
      place();
    } else {
      d.last = { x: d.ox + dx / v.k, y: d.oy + dy / v.k };
      setLive(new Map([[d.table, d.last]]));
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    host.current?.classList.remove("dragging");
    if (!d) return;
    if (d.moved && d.table !== null) {
      const p = d.last;
      if (p) st.updateTab(tab.id, { moves: { ...tab.moves, [d.table]: { x: Math.max(0, p.x), y: Math.max(0, p.y) } } });
      setLive(new Map());
      return;
    }
    if (!d.moved && e.type === "pointerup") setSelected(d.table);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-") zoomBy(0.8);
    else if (e.key === "0") zoomBy(1 / (view.current?.k ?? 1));
    else if (e.key === "Escape") setSelected(null);
    else return;
    e.preventDefault();
  };

  const edges = useMemo(() => {
    if (!model || !layout) return [];
    return model.edges.flatMap((e, i) => {
      const g = edgeGeometry(e, layout, tables, tab.detail);
      const from = tables.get(e.from);
      const to = tables.get(e.to);
      if (!g || !from || !to) return [];
      const card = cardinality(e, from);
      return [{ ...g, key: `${e.from}\u0001${e.name}\u0001${i}`, edge: e, card, title: `${e.name}\n${edgeLabel(e, from, to, card)}` }];
    });
  }, [model, layout, tables, tab.detail]);

  // ---------- menus and dialogs ----------
  const [boxMenu, setBoxMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useDismiss(exportOpen, () => setExportOpen(false));
  const [imageOpen, setImageOpen] = useState(false);
  const [code, setCode] = useState<"mermaid" | "dbml" | null>(null);

  const changed = diagramChanged(tab, saved);
  const canSave = ready && diagramCanSave(tab, saved);
  const status = !ready ? "" : changed ? "Not saved" : saved ? savedAtLabel(saved.at) : "";
  const save = () => st.saveDiagram(tab.id, view.current ?? undefined);
  const canReset = Object.keys(tab.moves).length > 0 || (!tab.auto && !!saved && Object.keys(saved.positions).length > 0);

  const saveDrawio = async () => {
    setExportOpen(false);
    if (!model || !layout) return;
    const path = await saveDialog({ defaultPath: `${title}.drawio`, title: "Export diagram for diagrams.net", filters: [{ name: "diagrams.net", extensions: ["drawio"] }] }).catch(() => null);
    if (!path) return;
    try {
      await api.writeTextFile(path, toDrawio(model, layout, tab.detail, title));
      st.showToast(`Saved ${fileName(path)}. Open it in diagrams.net with File › Open from › Device.`);
    } catch (e) {
      st.showToast(errText(e));
    }
  };

  const qualified = (t: DiagramTable) => (conn?.engine === "sqlite" && t.schema === "main" ? quoteIdent(conn.engine, t.name) : `${quoteIdent(conn!.engine, t.schema)}.${quoteIdent(conn!.engine, t.name)}`);
  const reveal = (t: DiagramTable) => {
    const s = useStore.getState();
    const ses = s.currentId ? s.sessions[s.currentId] : undefined;
    if (ses && !ses.expanded[t.schema]) s.toggle(t.schema);
    if (ses && !ses.expanded[`${t.schema}/tables`]) s.toggle(`${t.schema}/tables`);
    s.setSide("schema");
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll<HTMLButtonElement>(".tree .row-main")].find((b) => b.title === `Open the rows of ${t.name}`);
      row?.scrollIntoView({ block: "nearest" });
      row?.focus();
    });
  };

  const body = tab.error ? (
    <div className="empty">
      <strong>Could not read the catalog of {tab.schema}</strong>
      <span className="erd-err">{tab.error}</span>
      <button type="button" className="btn" onClick={() => void st.readDiagram(tab.id, { reload: true })}>
        Try again
      </button>
    </div>
  ) : !tab.tables.length ? (
    <div className="empty">
      <strong>No tables picked</strong>
      <span>Pick the tables of {tab.schema} to draw. Only those are read from the catalog.</span>
      {!tab.picking && (
        <button type="button" className="btn btn--primary" onClick={() => st.updateTab(tab.id, { picking: true })}>
          <ListChecks {...ico} />
          Pick tables
        </button>
      )}
    </div>
  ) : !model || (tab.loading && !layout) ? (
    <div className="empty">
      <span className="spinner" />
      <strong>Reading the catalog of {tab.schema}</strong>
      <span>Tables, columns and foreign keys. No row is read.</span>
    </div>
  ) : !model.tables.length ? (
    <div className="empty">
      <strong>The picked tables are not in {tab.schema} any more</strong>
      <span>They were dropped or renamed. Pick the tables to draw again.</span>
      <button type="button" className="btn btn--primary" onClick={() => st.updateTab(tab.id, { picking: true })}>
        <ListChecks {...ico} />
        Pick tables
      </button>
    </div>
  ) : (
    <>
      <div
        ref={host}
        className="erd-host"
        tabIndex={0}
        role="img"
        aria-label={`Diagram of ${title}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={(e) => {
          const t = tables.get(keyOf(e.target) ?? "");
          if (t) st.openTable(t.schema, t.name);
        }}
        onContextMenu={(e) => {
          const key = keyOf(e.target);
          if (key === null) return;
          e.preventDefault();
          setSelected(key);
          setBoxMenu({ key, x: e.clientX, y: e.clientY });
        }}
      >
        <div ref={world} className="erd-world" style={{ width: layout!.width, height: layout!.height }}>
          <svg className="erd-edges" width={layout!.width} height={layout!.height} aria-hidden>
            {edges.map((e) => {
              const on = selected !== null && (e.edge.from === selected || e.edge.to === selected);
              const a = markAt(e.start, MARK_GAP);
              const b = markAt(e.end, ARROW_GAP);
              return (
                <g key={e.key} className={`erd-edge${on ? " on" : ""}`}>
                  <title>{e.title}</title>
                  <path d={e.path} className="erd-hit" />
                  <path d={e.path} className="erd-line" />
                  <path d={e.arrow} className="erd-arrow" />
                  <text x={e.mid.x} y={e.mid.y - 5} className="erd-label">
                    {e.edge.columns.join(", ")}
                  </text>
                  {on && (
                    <>
                      <text {...a} className="erd-mark">
                        {e.card.from}
                      </text>
                      <text {...b} className="erd-mark">
                        {e.card.to}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          {model.tables.map((t, i) => {
            const b = layout!.boxes.get(t.key);
            return b ? <Box key={t.key} t={t} index={i} x={b.x} y={b.y} w={b.w} h={b.h} detail={tab.detail} selected={selected === t.key} outside={t.schema !== tab.schema} linked={linked.get(t.key)} /> : null;
          })}
        </div>
      </div>
      <p className="erd-foot">Drag a table to move it. Drag the background or scroll to pan, ⌘ scroll or pinch to zoom. Double-click a table to open its rows. Save keeps the picked tables and this layout with {conn?.name}; Show diagram brings them back, after a restart too. Tables ticked after a save are placed to the right of the saved ones.</p>
    </>
  );

  const menuTable = boxMenu ? tables.get(boxMenu.key) : undefined;
  return (
    <div className="work-body erd-body">
      <div className="req-title">
        <span className="name name--static">{title}</span>
        <span className="path">
          {conn?.name} / {tab.database ? `${tab.database} / ` : ""}
          {tab.schema}
        </span>
      </div>
      <div className="erd-tools" role="toolbar" aria-label="Diagram">
        <button type="button" className="btn btn--quiet erd-pick-btn" title="Choose the tables to draw" onClick={() => st.updateTab(tab.id, { picking: true })}>
          <ListChecks {...ico} />
          Tables
          {tab.tables.length > 0 && (
            <span className="n">
              {tab.tables.length}
              {allTables.length ? ` of ${allTables.length}` : ""}
            </span>
          )}
        </button>
        <div className="menu-anchor" ref={exportRef}>
          <button type="button" className="btn btn--quiet erd-export" disabled={!ready} aria-haspopup="menu" aria-expanded={exportOpen} title="Export the diagram" onClick={() => setExportOpen(!exportOpen)}>
            <Download {...ico} />
            Export
          </button>
          {exportOpen && (
            <div className="menu" role="menu" aria-label="Export as">
              <p className="menu-note">Export as</p>
              <button type="button" role="menuitem" onClick={() => (setExportOpen(false), setImageOpen(true))}>
                <ImageIcon {...ico} />
                Image (PNG or JPG)…
              </button>
              <button type="button" role="menuitem" onClick={() => (setExportOpen(false), setCode("mermaid"))}>
                <FileCode {...ico} />
                Mermaid code…
              </button>
              <button type="button" role="menuitem" onClick={() => (setExportOpen(false), setCode("dbml"))}>
                <FileCode {...ico} />
                DBML for dbdiagram.io…
              </button>
              <button type="button" role="menuitem" onClick={() => void saveDrawio()}>
                <FileDown {...ico} />
                diagrams.net file (.drawio)…
              </button>
            </div>
          )}
        </div>
        <button type="button" className="btn btn--quiet erd-save" disabled={!canSave} title={`Save the tables and layout with ${conn?.name ?? "this connection"}  ⌘S`} onClick={save}>
          <Save {...ico} />
          <span>{ready && !canSave && saved ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className="icon-btn" aria-label="Refresh" title="Refresh from the catalog" disabled={!tab.tables.length || tab.loading} onClick={() => void st.readDiagram(tab.id, { reload: true })}>
          {tab.loading ? <LoaderCircle {...icoC("spin")} /> : <RefreshCw {...ico} />}
        </button>
        <span className="sep" aria-hidden />
        <button type="button" className="icon-btn" aria-label="Zoom out" title="Zoom out  −" disabled={!ready} onClick={() => zoomBy(0.8)}>
          <ZoomOut {...ico} />
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom in" title="Zoom in  +" disabled={!ready} onClick={() => zoomBy(1.25)}>
          <ZoomIn {...ico} />
        </button>
        <button type="button" className="btn btn--quiet erd-zoom" disabled={!ready} title="Actual size  0" aria-label={`Zoom ${pct}%, actual size`} onClick={() => zoomBy(1 / (view.current?.k ?? 1))}>
          {pct}%
        </button>
        <button type="button" className="icon-btn" aria-label="Fit the diagram" title="Fit the diagram" disabled={!ready} onClick={fit}>
          <Maximize {...ico} />
        </button>
        <button type="button" className="icon-btn" aria-label="Reset layout" title="Arrange every table again. Save to keep the new layout." disabled={!ready || !canReset} onClick={() => st.updateTab(tab.id, { moves: {}, auto: true, view: undefined })}>
          <Undo2 {...ico} />
        </button>
        <span className="sep" aria-hidden />
        <span className="ctx-select">
          <select aria-label="Columns shown" disabled={!ready} value={tab.detail} onChange={(e) => st.updateTab(tab.id, { detail: e.target.value as DiagramDetail })}>
            {DETAILS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown {...ico} />
        </span>
        <span className={`push erd-status${changed ? " unsaved" : ""}`} aria-live="polite" title={!changed && saved ? new Date(saved.at).toLocaleString("en", { dateStyle: "full", timeStyle: "short" }) : undefined}>
          {status}
        </span>
      </div>
      <div className="erd-state">{body}</div>

      {tab.picking && <Picker tab={tab} connId={connId!} allTables={allTables} loadingTree={session?.tree[tab.schema]?.state} />}
      {boxMenu && menuTable && (
        <BoxMenu
          x={boxMenu.x}
          y={boxMenu.y}
          onDismiss={() => setBoxMenu(null)}
          items={[
            { label: "Open rows", icon: <Table2 {...ico} />, run: () => st.openTable(menuTable.schema, menuTable.name) },
            { label: "New query on this table", icon: <SquareCode {...ico} />, run: () => st.newQueryTab(`select *\nfrom ${qualified(menuTable)}\n`) },
            "sep",
            { label: "Show diagram of this table", icon: <Network {...ico} />, disabled: menuTable.schema === tab.schema && menuTable.name === tab.origin, run: () => st.openDiagram(menuTable.schema, menuTable.name) },
            { label: "Select in Schema tree", icon: <Locate {...ico} />, run: () => reveal(menuTable) },
            {
              label: "Hide from diagram",
              icon: <EyeOff {...ico} />,
              disabled: menuTable.schema !== tab.schema,
              title: menuTable.schema !== tab.schema ? "Shown because a picked table links to it; hide that table instead" : undefined,
              run: () => {
                setSelected(null);
                st.updateTab(tab.id, { tables: tab.tables.filter((n) => n !== menuTable.name) });
              },
            },
          ]}
        />
      )}
      {imageOpen && model && layout && <ImageDialog model={model} layout={layout} detail={tab.detail} name={title} onClose={() => setImageOpen(false)} />}
      {code && model && <CodeDialog kind={code} model={model} schema={tab.schema} name={title} onClose={() => setCode(null)} />}
    </div>
  );
}

type BoxItem = { label: string; icon: React.ReactNode; run: () => void; disabled?: boolean; title?: string } | "sep";

/** A table box's right-click menu, at the pointer */
function BoxMenu({ x, y, items, onDismiss }: { x: number; y: number; items: BoxItem[]; onDismiss: () => void }) {
  const ref = useDismiss(true, onDismiss);
  const [pos, setPos] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = m.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(x, innerWidth - r.width - 8)), top: y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y });
    m.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [x, y, ref]);
  return createPortal(
    <div className="menu ctx-menu" role="menu" aria-label="Table" ref={ref} style={pos} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) =>
        it === "sep" ? (
          <hr key={i} />
        ) : (
          <button key={it.label} type="button" role="menuitem" disabled={it.disabled} title={it.title} onClick={() => (onDismiss(), it.run())}>
            {it.icon}
            {it.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

/** Esc closes a dialog of this pane (App's Modals only know the store's modal) */
function useEscape(close: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
}

/**
 * The table picker: the schema's tables as the tree has them (no extra read to open it), a filter, Select all and
 * Unselect all (the shown rows while filtering), Add linked tables (one read of the schema's keys, on demand).
 */
function Picker({ tab, connId, allTables, loadingTree }: { tab: DiagramTab; connId: string; allTables: { name: string; estimate: number | null }[]; loadingTree: "loading" | "loaded" | "error" | undefined }) {
  const st = useStore.getState();
  const names = useMemo(() => allTables.map((t) => t.name), [allTables]);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(tab.tables.length ? tab.tables : (tab.preset ?? [])));
  const touched = useRef(false);
  // a table's diagram: its links arrive after the picker opens; they tick until the person ticks something
  useEffect(() => {
    if (!touched.current && tab.preset && !tab.tables.length) setTicked(new Set(tab.preset));
  }, [tab.preset, tab.tables.length]);
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    return f ? allTables.filter((t) => t.name.toLowerCase().includes(f)) : allTables;
  }, [allTables, q]);
  const links = useRef<[string, string][] | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const set = (next: Set<string>) => {
    touched.current = true;
    setTicked(next);
  };
  const cancel = useCallback(() => st.pickDiagramTables(tab.id, null), [st, tab.id]);
  useEscape(cancel);
  const addLinked = async () => {
    setLinkErr(null);
    if (!links.current) {
      setLinking(true);
      try {
        links.current = await api.schemaLinks(connId, tab.database, tab.schema);
      } catch (e) {
        setLinkErr(errText(e));
        return;
      } finally {
        setLinking(false);
      }
    }
    set(new Set(withLinked(names, [...ticked], links.current)));
  };
  const n = names.filter((x) => ticked.has(x)).length;
  const filtering = !!q.trim();
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <div className="dialog erd-pick" role="dialog" aria-modal="true" aria-label="Tables to draw">
        <h2>Tables to draw</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (n) st.pickDiagramTables(tab.id, names.filter((x) => ticked.has(x)));
          }}
        >
          <p className="help">
            Tables of <strong>{tab.schema}</strong>. Only the tables you pick are read from the catalog and drawn.
          </p>
          <div className="search">
            <Search {...ico} />
            <input className="field" type="search" placeholder="Filter tables" aria-label="Filter tables" autoComplete="off" spellCheck={false} value={q} autoFocus onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && q && (e.preventDefault(), e.stopPropagation(), setQ(""))} />
          </div>
          <div className="ep-tools">
            <button type="button" className="btn btn--quiet" onClick={() => set(new Set([...ticked, ...shown.map((t) => t.name)]))}>
              {filtering ? "Pick shown" : "Pick all"}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => set(new Set([...ticked].filter((x) => !shown.some((t) => t.name === x))))}>
              {filtering ? "Clear shown" : "Clear all"}
            </button>
            <button type="button" className="btn btn--quiet" disabled={!n || linking} aria-busy={linking || undefined} title="Pick every table one foreign key away from a ticked one (reads the schema's foreign keys)" onClick={() => void addLinked()}>
              {linking ? <LoaderCircle {...icoC("spin")} /> : <Link {...ico} />}
              Add linked tables
            </button>
          </div>
          {linkErr && <p className="help err">{linkErr}</p>}
          <div className="ep-list" role="group" aria-label={`Tables of ${tab.schema}`}>
            {loadingTree !== "loaded" && !allTables.length ? (
              <p className="ep-empty">{loadingTree === "error" ? `Could not read the tables of ${tab.schema}` : <>Reading the tables of {tab.schema}…</>}</p>
            ) : !allTables.length ? (
              <p className="ep-empty">{tab.schema} has no tables</p>
            ) : !shown.length ? (
              <p className="ep-empty">No table matches {q.trim()}</p>
            ) : (
              shown.map((t) => (
                <label key={t.name} className="check ep-row">
                  <input
                    type="checkbox"
                    checked={ticked.has(t.name)}
                    onChange={(e) => {
                      const next = new Set(ticked);
                      if (e.target.checked) next.add(t.name);
                      else next.delete(t.name);
                      set(next);
                    }}
                  />
                  <span className="ep-name">{t.name}</span>
                  {t.estimate !== null && (
                    <span className="ep-est" title="Estimate from table statistics">
                      {estimate(t.estimate)}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
          <footer>
            <span className="ep-n" aria-live="polite">
              {n} of {names.length} picked
            </span>
            <button type="button" className="btn" onClick={cancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!n}>
              {n ? `Show diagram (${n})` : "Show diagram"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Export image: PNG with the diagram's background or transparent; JPG has no transparency, so nothing to choose */
function ImageDialog({ model, layout, detail, name, onClose }: { model: DiagramModel; layout: DiagramLayout; detail: DiagramDetail; name: string; onClose: () => void }) {
  const [fmt, setFmt] = useState<"png" | "jpg">("png");
  const [fill, setFill] = useState(true);
  const [busy, setBusy] = useState(false);
  useEscape(onClose);
  const n = model.tables.length;
  const go = async () => {
    const path = await saveDialog({ defaultPath: `${name}.${fmt}`, title: "Export diagram as image", filters: [{ name: fmt.toUpperCase(), extensions: [fmt] }] }).catch(() => null);
    if (!path) return;
    setBusy(true);
    try {
      const p = palette();
      const bg = fmt === "jpg" || fill ? p.background : null;
      const blob = await svgToImage(diagramSvg(model, layout, detail, p, !!bg), layout.width, layout.height, fmt, bg);
      await api.writeBinaryFile(path, await blobBase64(blob));
      onClose();
      useStore.getState().showToast(`Saved ${fileName(path)}`);
    } catch (e) {
      useStore.getState().showToast(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog erd-img" role="dialog" aria-modal="true" aria-label="Export image">
        <h2>Export image</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <p className="help">
            The whole diagram as drawn: {n} {n === 1 ? "table" : "tables"}, {{ all: "all columns", keys: "key columns", none: "table names only" }[detail]}. Exported at twice its size so the text stays sharp.
          </p>
          <div className="seg ei-format" role="radiogroup" aria-label="Format">
            {(["png", "jpg"] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={fmt === f} aria-pressed={fmt === f} onClick={() => setFmt(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {fmt === "png" && (
            <fieldset className="ei-bg">
              <legend>Background</legend>
              <label className="check">
                <input type="radio" name="ei-bg" checked={fill} onChange={() => setFill(true)} />
                Fill with the diagram's background
              </label>
              <label className="check">
                <input type="radio" name="ei-bg" checked={!fill} onChange={() => setFill(false)} />
                Transparent
              </label>
            </fieldset>
          )}
          <footer>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy} autoFocus>
              {busy ? <LoaderCircle {...icoC("spin")} /> : <Download {...ico} />}
              Export {fmt.toUpperCase()}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

const CODE = {
  mermaid: { title: "Mermaid code", ext: "mmd", help: "Paste it where Mermaid renders: a Markdown file on GitHub or GitLab, Notion, or the Mermaid live editor. It lists every column of the tables drawn." },
  dbml: { title: "DBML for dbdiagram.io", ext: "dbml", help: "Paste it into the editor at dbdiagram.io (ypacapy doesn't open or send anything there). It lists every column of the tables drawn, their keys and references." },
} as const;

/** Mermaid or DBML of the tables drawn: Copy, or Save as file */
function CodeDialog({ kind, model, schema, name, onClose }: { kind: "mermaid" | "dbml"; model: DiagramModel; schema: string; name: string; onClose: () => void }) {
  const c = CODE[kind];
  const text = useMemo(() => (kind === "mermaid" ? toMermaid(model) : toDbml(model, schema)), [kind, model, schema]);
  useEscape(onClose);
  const st = useStore.getState();
  const saveFile = async () => {
    const path = await saveDialog({ defaultPath: `${name}.${c.ext}`, title: `Save ${c.title}`, filters: [{ name: c.title, extensions: [c.ext] }] }).catch(() => null);
    if (!path) return;
    try {
      await api.writeTextFile(path, text);
      st.showToast(`Saved ${fileName(path)}`);
    } catch (e) {
      st.showToast(errText(e));
    }
  };
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog wide erd-code" role="dialog" aria-modal="true" aria-label={c.title}>
        <h2>{c.title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void navigator.clipboard?.writeText(text).then(() => st.showToast(`Copied the ${kind === "mermaid" ? "Mermaid code" : "DBML"}`));
          }}
        >
          <p className="help">{c.help}</p>
          <pre className="erd-code-pre" tabIndex={0} aria-label="Code">
            {text}
          </pre>
          <footer>
            <button type="button" className="btn" onClick={() => void saveFile()}>
              <Download {...ico} />
              Save as file…
            </button>
            <span className="grow" />
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn--primary" autoFocus>
              <Copy {...ico} />
              Copy
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
