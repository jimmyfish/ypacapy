import "./Home.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { ENGINE_LABEL, ENGINE_NAME } from "../lib/sql";
import { when } from "../lib/time";
import type { Conn } from "../types";
import { ConnTile } from "./ConnTile";
import { EmptyState, QueryChip } from "./EmptyState";
import { EngineIcon } from "./EngineIcon";
import { useDismiss } from "./useDismiss";
import { Check, ChevronDown, ChevronRight, Copy, Ellipsis, EllipsisVertical, Folder, FolderInput, FolderMinus, FolderPlus, Pencil, Pin, PinOff, PlugZap, Plus, Search, SearchX, Settings2, Shredder, X, ico, icoC } from "./Icon";

/** host or folder (gives way with an ellipsis) and the tail that always shows: port and database, or the file name */
function address(c: Conn): [string, string] {
  if (c.engine === "sqlite") {
    const f = c.file ?? "";
    const i = f.lastIndexOf("/");
    return i < 0 ? ["", f] : [f.slice(0, i + 1), f.slice(i + 1)];
  }
  const db = c.database ? ` / ${c.database}` : "";
  // MongoDB: an SRV name or a seed list has no single port to show
  if (c.engine === "mongo" && (c.srv || c.host?.includes(","))) return [c.host || "localhost", db];
  const port = c.port ?? (c.engine === "mysql" ? 3306 : c.engine === "mongo" ? 27017 : c.engine === "redis" ? 6379 : 5432);
  // Redis: the database is a number, shown as db0
  if (c.engine === "redis") return [c.host || "localhost", `:${port} / db${c.database?.trim() || "0"}`];
  return [c.host || "localhost", `:${port}${db}`];
}

/** what the search looks through: name, address, engine (its label and the short names people type) and group */
const ENGINE_WORDS = { postgres: "postgresql postgres pg", mysql: "mysql mariadb", sqlite: "sqlite", mongo: "mongodb mongo", redis: "redis valkey cache" } as const;
const haystack = (c: Conn) => {
  const [head, tail] = address(c);
  return `${c.name} ${head}${tail} ${c.user ?? ""} ${ENGINE_WORDS[c.engine]} ${c.group ?? ""}`.toLowerCase();
};

/** Where a dragged card lands: a group by name, out of every group, into a new one, or Pinned. */
type DropKey = { kind: "group"; name: string } | { kind: "none" } | { kind: "new" } | { kind: "pinned" };
const dropAttr = (d: DropKey) => (d.kind === "group" ? `group:${d.name}` : d.kind);
const parseDrop = (v: string | undefined): DropKey | null =>
  !v ? null : v === "none" || v === "new" || v === "pinned" ? { kind: v } : v.startsWith("group:") ? { kind: "group", name: v.slice(6) } : null;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  checked?: boolean;
  sep?: boolean;
  /** a muted line naming the items below it, as "Move to group" */
  heading?: boolean;
  /** red: it deletes for good */
  danger?: boolean;
}

/** An icon button with its menu below it (the tabs bar's level menu, the tree's "…" menu). */
function MenuButton({ label, title, icon, note, items, menuClass, onOpenChange }: { label: string; title: string; icon: React.ReactNode; note?: string; items: MenuItem[]; menuClass?: string; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpenRaw] = useState(false);
  const setOpen = (v: boolean) => {
    setOpenRaw(v);
    onOpenChange?.(v);
  };
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>(".menu button")?.focus();
  }, [open, ref]);
  return (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="icon-btn" title={title} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {icon}
      </button>
      {open && (
        <div className={`menu${menuClass ? ` ${menuClass}` : ""}`} role="menu" aria-label={label}>
          {note && <p className="menu-note">{note}</p>}
          {items.map((it, i) =>
            it.sep ? (
              <hr key={`sep-${i}`} />
            ) : it.heading ? (
              <p key={`heading-${i}`} className="menu-note">
                {it.label}
              </p>
            ) : (
              <button
                key={it.label}
                type="button"
                className={it.danger ? "danger" : undefined}
                role={it.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={it.checked}
                onClick={() => {
                  setOpen(false);
                  it.run();
                }}
              >
                {it.icon}
                <span className="menu-name">{it.label}</span>
                {it.checked !== undefined && <Check {...icoC("tick")} />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** A group's name turned into a field: Enter or leaving it keeps the new name, Escape keeps the old one. */
function GroupRename({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    const name = v?.trim();
    onDone(name && name !== initial ? name : null);
  };
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="field group-rename"
      aria-label="Group name"
      defaultValue={initial}
      spellCheck={false}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(e.currentTarget.value);
        else if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

/** Home: every connection on this Mac, in groups you can open, fold, rename and ungroup, with a search over all of them.
 *  Pinned ones sit above every group, whatever group they're in. */
export function Home() {
  const conns = useStore((s) => s.conns);
  const openIds = useStore((s) => s.openIds);
  const closedGroups = useStore((s) => s.settings.closedGroups);
  const st = useStore.getState();
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuCard, setMenuCard] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const closed = useMemo(() => new Set(closedGroups ?? []), [closedGroups]);
  const needle = q.trim().toLowerCase();

  // oldest first; connections without createdAt predate it and keep their file order, which is creation order.
  // Pinned first, then groups by name; Ungrouped comes last. A group's list keeps its pinned members (Open all,
  // rename and ungroup take them too); its grid shows only the unpinned ones, so a fully pinned group stays.
  const { groups, ungrouped, pinned } = useMemo(() => {
    const sorted = [...conns].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const m = new Map<string, Conn[]>();
    const none: Conn[] = [];
    for (const c of sorted) {
      if (c.group) m.set(c.group, [...(m.get(c.group) ?? []), c]);
      else if (!c.pinned) none.push(c);
    }
    return { groups: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)), ungrouped: none, pinned: sorted.filter((c) => c.pinned) };
  }, [conns]);
  const groupNames = groups.map(([g]) => g);
  const unpinned = (list: Conn[]) => list.filter((c) => !c.pinned);

  // a group's name matching shows all of it; otherwise only the connections that match (a pinned one's group is in its haystack)
  const shown = (list: Conn[], group?: string) => (!needle || group?.toLowerCase().includes(needle) ? list : list.filter((c) => haystack(c).includes(needle)));
  const shownPinned = shown(pinned);
  const visible = [...shownPinned, ...groups.flatMap(([g, list]) => shown(unpinned(list), g)), ...shown(ungrouped)];

  // ⌘F finds, while Home is showing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key.toLowerCase() === "f" && !useStore.getState().modal) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setFold = (group: string, fold: boolean) => {
    const next = new Set(closed);
    if (fold) next.add(group);
    else next.delete(group);
    void st.setSettings({ closedGroups: next.size ? [...next].sort() : undefined });
  };

  const remove = (c: Conn) =>
    st.openModal({
      kind: "confirm",
      title: `Remove ${c.name}?`,
      message: "Capy wipes it from this Mac.",
      confirmLabel: "Remove",
      final: c.engine === "sqlite" ? true : "It can't be undone. To get it back, add it again with its password.",
      icon: "unplug",
      subject: { conn: c, name: c.name, meta: address(c).join(""), mono: c.engine === "sqlite" },
      effects:
        c.engine === "sqlite"
          ? [["off", "unplug", "The connection", "goes"], ["off", "history", "Its query history", "goes"], ["keep", "bookmark", "Saved queries", "stay"], ["keep", "hard-drive", "The database file", "stays put"]]
          : [["off", "unplug", "The connection and its keychain password", "go"], ["off", "history", "Its query history", "goes"], ["keep", "bookmark", "Saved queries", "stay"], ["keep", "database", "The database", "isn't touched"]],
      onConfirm: () => void st.deleteConn(c.id),
    });

  // dropped on the "new group" zone, a pinned card leaves Pinned too
  const newGroupFor = (c: Conn, unpin = false) =>
    st.openModal({
      kind: "prompt",
      title: `Move ${c.name} to a new group`,
      message: `Capy makes the group and moves ${c.name} into it.`,
      label: "Group name",
      icon: "folder-plus",
      fieldIcon: "folder",
      placeholder: "Production",
      confirmLabel: "Move",
      actionIcon: "folder-input",
      initial: "",
      onSubmit: (name) => void st.setGroup([c.id], name).then(() => (unpin ? st.setPinned(c.id, false) : undefined)),
    });

  // renaming onto an existing group joins the two; a folded group stays folded under its new name
  const renameGroup = (from: string, to: string, list: Conn[]) => {
    void st.setGroup(
      list.map((c) => c.id),
      to,
    );
    if (closed.has(from)) {
      const next = new Set(closed);
      next.delete(from);
      next.add(to);
      void st.setSettings({ closedGroups: [...next].sort() });
    }
  };

  const ungroup = (group: string, list: Conn[]) => {
    void st.setGroup(
      list.map((c) => c.id),
      null,
    );
    if (closed.has(group)) setFold(group, false);
  };

  /** Pointer-driven drag, as voidHTTP's tree (HTML5 drag and drop is unreliable inside the Tauri webview). */
  const startDrag = (e: React.MouseEvent, c: Conn) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".card-actions")) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    // a pinned card comes from Pinned, so its own group is a target: dropping it there unpins it
    const from = c.pinned ? "pinned" : c.group ? dropAttr({ kind: "group", name: c.group }) : "none";
    let active = false;
    let target: string | null = null;
    const place = (x: number, y: number) => {
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${x + 14}px, ${y + 10}px) rotate(-1.5deg)`;
    };
    const move = (ev: MouseEvent) => {
      if (!active) {
        if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 5) return;
        active = true;
        setDragId(c.id);
        document.body.classList.add("cards-dragging");
        // the ghost renders on the next frame; place it then
        requestAnimationFrame(() => place(ev.clientX, ev.clientY));
      }
      place(ev.clientX, ev.clientY);
      // near the top or bottom edge the list scrolls, so a far group can be reached
      const home = homeRef.current;
      if (home) {
        const r = home.getBoundingClientRect();
        if (ev.clientY < r.top + 40) home.scrollTop -= 14;
        else if (ev.clientY > r.bottom - 40) home.scrollTop += 14;
      }
      const el = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-drop]");
      const next = el && el.dataset.drop !== from ? el.dataset.drop! : null;
      if (next !== target) setDrop((target = next));
    };
    const end = (commit: boolean) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", key, true);
      if (!active) return;
      // the click that ends a drag must not also open the card
      const swallow = (ev: MouseEvent) => (ev.stopPropagation(), ev.preventDefault());
      window.addEventListener("click", swallow, true);
      setTimeout(() => window.removeEventListener("click", swallow, true), 0);
      document.body.classList.remove("cards-dragging");
      setDragId(null);
      setDrop(null);
      // the card goes where it's dropped: onto Pinned it's pinned, in its group; out of Pinned it's unpinned
      const d = commit ? parseDrop(target ?? undefined) : null;
      if (d?.kind === "pinned") void st.setPinned(c.id, true);
      else if (d?.kind === "new") newGroupFor(c, c.pinned);
      else if (d) {
        const group = d.kind === "group" ? d.name : null;
        void (async () => {
          if (group !== (c.group ?? null)) await st.setGroup([c.id], group);
          if (c.pinned) await st.setPinned(c.id, false);
        })();
      }
    };
    const up = () => end(true);
    // Escape drops nothing
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && active) {
        ev.preventDefault();
        ev.stopPropagation();
        end(false);
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", key, true);
  };

  const card = (c: Conn) => {
    const [head, tail] = address(c);
    return (
      <div key={c.id} className={`project-card conn-card${menuCard === c.id ? " menu-open" : ""}${dragId === c.id ? " dragging" : ""}`} onMouseDown={(e) => startDrag(e, c)}>
        <button type="button" className="project-open" aria-label={`Open ${c.name}, ${ENGINE_LABEL[c.engine]}, ${head}${tail}`} onClick={() => st.openConn(c.id)} />
        <ConnTile conn={c} typed />
        <span className="conn-id">
          <span className="proj-name">{c.name}</span>
          <span className="proj-cols">
            <span className="addr">
              <span className="addr-head">{head}</span>
              <span className="addr-tail">{tail}</span>
            </span>
          </span>
        </span>
        <span className="proj-when">
          {/* in Pinned the footer names the group it belongs to */}
          {c.pinned && c.group && <span className="pin-from">{c.group} · </span>}
          {c.lastOpened ? `Opened ${when(c.lastOpened)}` : "Not opened yet"}
        </span>
        <span className="card-actions">
          {/* every action in one "…": Edit, Duplicate, Pin, Move to group, Remove */}
          <MenuButton
            label={`More actions for ${c.name}`}
            title="More actions"
            icon={<EllipsisVertical {...ico} />}
            menuClass="card-menu"
            onOpenChange={(o) => setMenuCard(o ? c.id : null)}
            items={[
              { label: "Edit connection", icon: <Settings2 {...ico} />, run: () => st.openModal({ kind: "connect", conn: c }) },
              { label: "Duplicate", icon: <Copy {...ico} />, run: () => void st.duplicateConn(c.id) },
              c.pinned ? { label: "Unpin", icon: <PinOff {...ico} />, run: () => void st.setPinned(c.id, false) } : { label: "Pin to top", icon: <Pin {...ico} />, run: () => void st.setPinned(c.id, true) },
              { label: "sep", icon: null, sep: true, run: () => {} },
              { label: "Move to group", icon: null, heading: true, run: () => {} },
              ...groupNames.map((g) => ({ label: g, icon: <Folder {...ico} />, checked: g === c.group, run: () => void (g !== c.group && st.setGroup([c.id], g)) })),
              { label: "New group…", icon: <FolderPlus {...ico} />, run: () => newGroupFor(c) },
              ...(c.group ? [{ label: "Remove from group", icon: <FolderMinus {...ico} />, run: () => void st.setGroup([c.id], null) }] : []),
              { label: "sep", icon: null, sep: true, run: () => {} },
              // a shredder, not an X: the connection, its keychain password and history go for good
              { label: "Remove connection", icon: <Shredder {...ico} />, danger: true, run: () => remove(c) },
            ]}
          />
        </span>
      </div>
    );
  };

  const newCard = (group?: string) =>
    !needle && (
      <button type="button" className="project-card project-card--new conn-card" onClick={() => st.openModal({ kind: "connect", group })}>
        <Plus {...ico} />
        New connection
      </button>
    );

  const dropProps = (d: DropKey) => ({ "data-drop": dropAttr(d), className: drop === dropAttr(d) ? "drop-target" : undefined });
  const dragged = dragId ? conns.find((c) => c.id === dragId) : undefined;
  const hasGroups = groups.length > 0;
  const shownUngrouped = shown(ungrouped);

  return (
    <div className="home" ref={homeRef}>
      <div className="home-inner">
        <div className="home-head">
          <div>
            <h1>Connections</h1>
            <p className="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p>
          </div>
          <div className="home-actions">
            {conns.length > 0 && (
              <div className="search home-search">
                <Search {...ico} />
                <input
                  ref={searchRef}
                  className="field"
                  type="search"
                  placeholder="Search connections"
                  aria-label="Search connections by name, host, user, database, file, engine or group"
                  aria-describedby="home-q-h"
                  autoComplete="off"
                  spellCheck={false}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      if (q) setQ("");
                      else e.currentTarget.blur();
                    } else if (e.key === "Enter" && needle && visible[0]) void st.openConn(visible[0].id);
                  }}
                />
                {q ? (
                  <button
                    type="button"
                    className="icon-btn search-clear"
                    aria-label="Clear search"
                    title="Clear search  Esc"
                    onClick={() => {
                      setQ("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X {...ico} />
                  </button>
                ) : (
                  <kbd aria-hidden="true">⌘F</kbd>
                )}
              </div>
            )}
            {/* with no connections the welcome below has the button */}
            {conns.length > 0 && (
              <button type="button" className="btn btn--primary" onClick={() => st.openModal({ kind: "connect" })}>
                <Plus {...ico} />
                New connection
              </button>
            )}
          </div>
        </div>
        <p className="sr-only" id="home-q-h">
          Enter opens the first match. Escape clears the search.
        </p>

        {!conns.length ? (
          <EmptyState
            size="xl"
            capy
            title="No connections yet"
            line="Add a database and Capy keeps it here. Passwords stay in the macOS keychain."
            actions={
              <>
                <button type="button" className="btn btn--primary" onClick={() => st.openModal({ kind: "connect" })}>
                  <Plus {...ico} />
                  New connection
                </button>
                <ul className="es-engines" aria-label="Engines">
                  {(["postgres", "mysql", "sqlite", "mongo", "redis"] as const).map((e) => (
                    <li key={e}>
                      <EngineIcon engine={e} />
                      {ENGINE_NAME[e]}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
        ) : needle && !visible.length ? (
          <EmptyState
            size="xl"
            tone="match"
            icon={SearchX}
            title={
              <>
                No connection matches <QueryChip q={q.trim()} label="Clear the search" onClear={() => (setQ(""), searchRef.current?.focus())} />
              </>
            }
            line="Searches names, hosts, users, databases, files, engines and groups."
          />
        ) : (
          <div className="conn-groups">
            {/* Pinned: above every group, while something is pinned (and, during a search, matches) */}
            {shownPinned.length > 0 && (
              <section className={`conn-group conn-pinned${drop === "pinned" ? " drop-target" : ""}`} data-drop="pinned" aria-label="Pinned">
                <div className="group-head">
                  <h2>
                    <Pin {...icoC("pin-mark")} />
                    Pinned
                  </h2>
                  <span className="group-count">{needle ? `${shownPinned.length} of ${pinned.length}` : pinned.length}</span>
                  <span className="drop-note">Drop to pin</span>
                </div>
                <div className="projects">{shownPinned.map(card)}</div>
              </section>
            )}

            {groups.map(([g, list]) => {
              const rest = unpinned(list);
              const cards = shown(rest, g);
              if (needle && !cards.length) return null;
              const folded = closed.has(g) && !needle;
              const live = list.filter((c) => openIds.includes(c.id));
              const d = dropProps({ kind: "group", name: g });
              return (
                <section key={g} className={`conn-group${d.className ? ` ${d.className}` : ""}`} data-drop={d["data-drop"]} aria-label={g}>
                  <div className="group-head">
                    {renaming === g ? (
                      <GroupRename initial={g} onDone={(name) => (setRenaming(null), name && renameGroup(g, name, list))} />
                    ) : (
                      <button type="button" className="group-toggle" aria-expanded={!folded} onClick={() => !needle && setFold(g, !folded)}>
                        {folded ? <ChevronRight {...icoC("g-caret")} /> : <ChevronDown {...icoC("g-caret")} />}
                        <h2>{g}</h2>
                        <span className="group-count">{needle ? `${cards.length} of ${rest.length}` : rest.length}</span>
                      </button>
                    )}
                    {live.length > 0 && (
                      <span className="group-live">
                        <span className="dot" aria-hidden="true" />
                        {live.length} open
                      </span>
                    )}
                    <span className="drop-note">Drop to move into {g}</span>
                    <span className="group-actions">
                      <button type="button" className="btn" title={`Open every connection in ${g}`} onClick={() => st.openConns(list.map((c) => c.id))}>
                        <PlugZap {...ico} />
                        Open all
                      </button>
                      <MenuButton
                        label={`More actions for ${g}`}
                        title="More actions"
                        icon={<Ellipsis {...ico} />}
                        items={[
                          { label: "New connection here", icon: <Plus {...ico} />, run: () => st.openModal({ kind: "connect", group: g }) },
                          { label: "Rename group", icon: <Pencil {...ico} />, run: () => setRenaming(g) },
                          ...(live.length ? [{ label: `Close ${live.length} open`, icon: <X {...ico} />, run: () => live.forEach((c) => void st.closeConn(c.id)) }] : []),
                          { label: "sep", icon: null, sep: true, run: () => {} },
                          { label: "Ungroup", icon: <FolderMinus {...ico} />, run: () => ungroup(g, list) },
                        ]}
                      />
                    </span>
                  </div>
                  {!folded && (
                    <div className="projects">
                      {cards.map(card)}
                      {newCard(g)}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Ungrouped (or, before any group exists, the one list) shows while it has connections, and as a drop target while a grouped card is dragged */}
            {(shownUngrouped.length > 0 || (!needle && !hasGroups) || ((dragged?.group || dragged?.pinned) && !needle)) && (
              <section className={`conn-group${drop === "none" ? " drop-target" : ""}`} data-drop="none" aria-label={hasGroups ? "Ungrouped" : "On this Mac"}>
                <div className="group-head">
                  <h2>{hasGroups ? "Ungrouped" : "On this Mac"}</h2>
                  {hasGroups && <span className="group-count">{needle ? `${shownUngrouped.length} of ${ungrouped.length}` : ungrouped.length}</span>}
                  <span className="drop-note">Drop to remove from its group</span>
                </div>
                <div className="projects">
                  {shownUngrouped.map(card)}
                  {newCard()}
                </div>
                {!hasGroups && conns.length > 1 && (
                  <p className="muted group-hint">
                    <FolderInput {...ico} />
                    To make a group, drag a card or use its Move to group button. You can also fill in Group when you add a connection.
                  </p>
                )}
              </section>
            )}

            {dragged && (
              <div className={`group-drop-new${drop === "new" ? " drop-target" : ""}`} data-drop="new" aria-hidden="true">
                <FolderPlus {...ico} />
                Drop here to make a new group
              </div>
            )}
          </div>
        )}
      </div>
      {dragged && (
        <div ref={ghostRef} className="drag-ghost" aria-hidden="true">
          <ConnTile conn={dragged} typed small />
          <span>{dragged.name}</span>
        </div>
      )}
    </div>
  );
}
