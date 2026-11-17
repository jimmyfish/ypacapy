import { useEffect, useState } from "react";
import { isDirty, useCurrent, useStore } from "../store";
import type { GuardLevel } from "../types";
import { useDismiss } from "./useDismiss";
import { Check, ChevronDown, Fingerprint, PanelLeftClose, PanelLeftOpen, Plus, Shield, ShieldOff, SquareCode, Table2, X, icoC, ico } from "./Icon";

const LEVELS: [GuardLevel, string, typeof Shield][] = [
  ["run", "Run it", ShieldOff],
  ["confirm", "Ask to confirm", Shield],
];

/** The write guard of the open connection: voidHTTP's environment picker and menu. */
function GuardPicker() {
  const { conn } = useCurrent();
  const passSet = useStore((s) => s.pass.set);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  if (!conn) return null;
  const level = conn.guard;
  const [, label, Icon] = LEVELS.find(([l]) => l === level) ?? LEVELS[1];
  // passphrase protection sits beside the guard, not in it: shown as a fingerprint on the picker
  const protectedByPass = passSet && !!conn.passProtect;
  return (
    <div className="menu-anchor env-group guard" ref={ref}>
      <button
        type="button"
        className="env-picker"
        data-level={level}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Write guard for ${conn.name}: ${label}${protectedByPass ? ", passphrase protection on" : ""}`}
        title={`Write guard for ${conn.name}`}
        onClick={() => setOpen(!open)}
      >
        <Icon {...icoC("guard-ico")} />
        <span className="env-name">{label}</span>
        {protectedByPass && <Fingerprint {...icoC("guard-pass")} />}
        <ChevronDown {...ico} />
      </button>
      {open && (
        <div className="menu guard-menu" role="menu" aria-label={`Write guard for ${conn.name}`}>
          <p className="menu-note">Before a write runs on {conn.name}</p>
          {LEVELS.map(([l, text, I]) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === level}
              onClick={() => {
                setOpen(false);
                void useStore.getState().setGuard(l);
              }}
            >
              <I {...ico} />
              <span>{text}</span>
              <Check {...icoC("tick")} />
            </button>
          ))}
          {protectedByPass && <p className="menu-note">Protected statements also ask for the passphrase. Change that in the connection's Options</p>}
        </div>
      )}
    </div>
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
      <div className="tabs">
        {session?.tabs.map((t) => {
          const name = t.kind === "query" ? t.title : t.table;
          return (
            <div key={t.id} className="tab" aria-current={t.id === activeTabId ? "page" : undefined} onAuxClick={(e) => e.button === 1 && st.closeTab(t.id)}>
              <button type="button" className="tab-main" title={t.kind === "table" ? `${t.schema}.${t.table}` : name} onClick={() => st.setActiveTab(t.id)}>
                {t.kind === "query" ? <SquareCode {...ico} /> : <Table2 {...ico} />}
                <span className="name">{name}</span>
                {t.kind === "query" && isDirty(t) && <span className="dirty" role="img" aria-label="Unsaved changes" />}
              </button>
              <button type="button" className="icon-btn close" aria-label={`Close ${name}`} onClick={() => st.closeTab(t.id)}>
                <X {...ico} />
              </button>
            </div>
          );
        })}
        {session?.status === "open" && (
          <button type="button" className="icon-btn tab-add" title="New query  ⌘T" aria-label="New query tab" onClick={() => st.newQueryTab()}>
            <Plus {...ico} />
          </button>
        )}
      </div>
      <GuardPicker />
    </div>
  );
}
