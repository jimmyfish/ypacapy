import "./GroupPicker.css";
import { useRef, useState } from "react";
import { useDismiss } from "./useDismiss";
import { Check, ChevronDown, Folder, FolderMinus, FolderPlus, icoC, ico } from "./Icon";

/**
 * The connection dialog's Group: a field that opens a menu of the groups on Home. No group first, New group… last.
 * New group… turns the field into a name field: Enter or leaving it keeps the name, Escape goes back.
 * A new name shows in the list until the connection is saved; a group exists while a connection is in it.
 */
export function GroupSelect({ id, value, groups, onChange }: { id: string; value: string; groups: string[]; onChange: (g: string) => void }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const done = useRef(false);
  const btn = useRef<HTMLButtonElement>(null);
  const ref = useDismiss(open, () => setOpen(false));
  const all = value && !groups.includes(value) ? [...groups, value].sort((a, b) => a.localeCompare(b)) : groups;

  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    const g = draft.trim();
    if (keep && g) onChange(g);
    setNaming(false);
    requestAnimationFrame(() => btn.current?.focus());
  };
  const pick = (g: string) => {
    setOpen(false);
    if (g !== value) onChange(g);
    btn.current?.focus();
  };

  if (naming)
    return (
      <div className="cx-group group-pick">
        <input
          id={id}
          className="field group-new"
          placeholder="New group name"
          aria-label="New group name"
          aria-describedby={`${id}-h`}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              finish(true);
            } else if (e.key === "Escape") {
              // goes back to the menu field, not out of the dialog
              e.preventDefault();
              finish(false);
            }
          }}
          onBlur={() => finish(true)}
        />
        <span className="help group-help" id={`${id}-h`}>
          Enter keeps the name. Escape goes back.
        </span>
      </div>
    );

  const Icon = value ? Folder : FolderMinus;
  return (
    <div
      className="menu-anchor cx-group group-pick"
      ref={ref}
      onKeyDown={(e) => {
        // Escape closes the menu, not the dialog under it
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      <button ref={btn} type="button" id={id} className="field group-btn" data-none={value ? undefined : ""} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon {...icoC("grp-ico")} />
        <span className="env-name">{value || "No group"}</span>
        <ChevronDown {...icoC("select-chev")} />
      </button>
      {open && (
        <div className="menu group-menu" role="menu" aria-label="Group">
          {[["", "No group"], ...all.map((g) => [g, g])].map(([g, label]) => {
            const I = g ? Folder : FolderMinus;
            return (
              <button key={g || "\0none"} type="button" role="menuitemradio" aria-checked={g === value} onClick={() => pick(g)}>
                <I {...ico} />
                <span className="menu-name">{label}</span>
                <Check {...icoC("tick")} />
              </button>
            );
          })}
          <hr />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setDraft("");
              done.current = false;
              setNaming(true);
            }}
          >
            <FolderPlus {...ico} />
            New group…
          </button>
        </div>
      )}
    </div>
  );
}
