import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Engine } from "../types";
import { CONN_COLORS, connColor } from "../lib/connColors";
import { ConnTile } from "./ConnTile";
import { Check, ChevronDown, ico } from "./Icon";
import { EngineIcon } from "./EngineIcon";

export interface PickerOption<T> {
  value: T;
  label: string;
  /** shown before the label, in the field and in the list */
  icon: ReactNode;
}

/**
 * A select drawn by hand, so every option can carry an icon: a field-styled button showing the current option,
 * over a listbox of all of them with a check on the current one.
 * The listbox is portalled to <body> at a fixed position under the field (above it when there is no room below),
 * so a scrolling parent such as .cx-panel cannot clip its ring and shadow.
 * Keyboard: Enter, Space or the arrows open it; arrows, Home and End move; Enter or Space picks; Escape or Tab closes.
 */
export function Picker<T extends string | number>({
  id,
  value,
  options,
  label,
  className,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly PickerOption<T>[];
  /** the listbox's accessible name */
  label: string;
  className?: string;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ref = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const curIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const cur = options[curIdx];
  const listId = `${id}-list`;

  const focusAt = (i: number) => {
    const n = (i + options.length) % options.length;
    setActive(n);
    optRefs.current[n]?.focus();
  };
  const show = () => {
    setActive(curIdx);
    setOpen(true);
    // the list renders on this update; focus its current option once it is in the DOM
    requestAnimationFrame(() => optRefs.current[curIdx]?.focus());
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (v: T) => {
    if (v !== value) onChange(v);
    close();
  };

  // place the list against the field; follow it when anything scrolls or the window resizes
  useLayoutEffect(() => {
    if (!open) return setPos(null);
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const h = menuRef.current?.offsetHeight ?? 0;
      const gap = 4;
      const below = window.innerHeight - r.bottom - gap;
      const up = below < h + 8 && r.top > below;
      setPos({
        left: r.left,
        width: r.width,
        ...(up
          ? { bottom: window.innerHeight - r.top + gap }
          : { top: r.bottom + gap }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // a press outside both the field and the list closes it; the list is portalled, so it is checked on its own
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !menuRef.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent) => {
    if (open) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusAt(active + 1),
      ArrowUp: () => focusAt(active - 1),
      Home: () => focusAt(0),
      End: () => focusAt(options.length - 1),
      // preventDefault keeps the dialog's own Escape handler from closing the whole dialog
      Escape: () => close(),
    };
    // back on the field before the browser moves focus, so Tab goes to the field after it, not the end of <body>
    if (e.key === "Tab") return close();
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    e.stopPropagation();
    run();
  };

  return (
    <span ref={ref} className={`picker${className ? " " + className : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="field picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
      >
        {cur.icon}
        <span className="picker-label">{cur.label}</span>
        <ChevronDown {...ico} className="ico select-chev" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={`menu picker-menu${className ? " " + className + "-menu" : ""}`}
            id={listId}
            role="listbox"
            aria-label={label}
            style={pos ?? { visibility: "hidden" }}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => {
              const sel = i === curIdx;
              return (
                <button
                  key={String(o.value)}
                  ref={(el) => {
                    optRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  tabIndex={i === active ? 0 : -1}
                  className="picker-opt"
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setActive(i)}
                >
                  {o.icon}
                  <span className="picker-label">{o.label}</span>
                  <Check
                    {...ico}
                    className={`ico picker-check${sel ? "" : " is-off"}`}
                  />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Every convention colour, each previewed as the connection's own tile in that colour. */
export function ColorPicker({
  id,
  value,
  engine,
  onChange,
}: {
  id: string;
  value: number;
  engine: Engine;
  onChange: (id: number) => void;
}) {
  const options = CONN_COLORS.map((c) => ({
    value: c.id,
    label: c.name,
    icon: <ConnTile conn={{ engine, color: c.id }} small />,
  }));
  return (
    <Picker
      id={id}
      value={connColor(value).id}
      options={options}
      label="Connection color"
      className="picker--color"
      onChange={onChange}
    />
  );
}

export const ENGINE_LABELS: Record<Engine, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL / MariaDB",
  sqlite: "SQLite",
};

const ENGINES: Engine[] = ["postgres", "mysql", "sqlite"];

export function EnginePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Engine;
  onChange: (e: Engine) => void;
}) {
  const options = ENGINES.map((e) => ({
    value: e,
    label: ENGINE_LABELS[e],
    icon: <EngineIcon engine={e} />,
  }));
  return (
    <Picker
      id={id}
      value={value}
      options={options}
      label="Driver"
      className="picker--engine"
      onChange={onChange}
    />
  );
}
