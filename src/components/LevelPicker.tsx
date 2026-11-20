import "./LevelPicker.css";
import { useState } from "react";
import { LEVELS, type SecurityLevel } from "../types";
import { useDismiss } from "./useDismiss";
import { Check, ChevronDown, Lock, Shield, ShieldOff, icoC, ico } from "./Icon";

export const LEVEL_ICON: Record<SecurityLevel, typeof Shield> = { none: ShieldOff, low: Shield, strict: Lock };

/**
 * The three security levels as menu items: icon, name, what it does, a tick on the picked one.
 * `off` greys a level out; a string there replaces its description with the reason.
 */
export function LevelItems({ value, off, onPick, commands }: { value: SecurityLevel; off?: (l: SecurityLevel) => boolean | string; onPick: (l: SecurityLevel) => void; commands?: boolean }) {
  return (
    <>
      {LEVELS.map(([l, text, desc]) => {
        const I = LEVEL_ICON[l];
        const why = off?.(l);
        return (
          <button key={l} type="button" role="menuitemradio" aria-checked={l === value} disabled={!!why} onClick={() => onPick(l)}>
            <I {...ico} />
            <span className="gm-text">
              <span>{text}</span>
              {/* Redis has commands, not statements */}
              <small>{typeof why === "string" ? why : commands ? desc.replace("statement", "command") : desc}</small>
            </span>
            <Check {...icoC("tick")} />
          </button>
        );
      })}
    </>
  );
}

/** A dialog field for a security level that opens the tab bar's level menu. */
export function LevelSelect({ id, value, off, onChange, commands }: { id: string; value: SecurityLevel; off?: (l: SecurityLevel) => boolean | string; onChange: (l: SecurityLevel) => void; commands?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const [, label] = LEVELS.find(([l]) => l === value) ?? LEVELS[0];
  const Icon = LEVEL_ICON[value] ?? ShieldOff;
  return (
    <div
      className="menu-anchor level-pick"
      ref={ref}
      onKeyDown={(e) => {
        // Escape closes the menu, not the dialog under it
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      <button type="button" id={id} className="field set-choice level-btn" data-level={value} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon {...icoC("guard-ico")} />
        <span className="env-name">{label}</span>
        <ChevronDown {...icoC("select-chev")} />
      </button>
      {open && (
        <div className="menu guard-menu" role="menu" aria-label="Security level">
          <LevelItems
            commands={commands}
            value={value}
            off={off}
            onPick={(l) => {
              setOpen(false);
              if (l !== value) onChange(l);
            }}
          />
        </div>
      )}
    </div>
  );
}
