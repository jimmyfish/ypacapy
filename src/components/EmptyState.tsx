import "./EmptyState.css";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X, ico } from "./Icon";

/**
 * Empty states: one family in three sizes (preview .hallmark/preview/empty.html). A tinted mark in water rings, like
 * the icon's onsen; the title with the thing's name in mono (<Obj>); one line; the way out as a real button. The tone
 * says why it's empty: yet (Turquoise) nothing yet, empty (River) the read worked and came back empty, match (Carrot)
 * a filter found nothing. Only for nothing to show: loading, a run's outcome and errors keep .empty and .error-box.
 * The capybara (capy) only greets: no connections, no tab open.
 */
export function EmptyState({
  tone = "yet",
  icon: Icon,
  capy,
  title,
  line,
  keys,
  actions,
  size,
}: {
  tone?: "yet" | "empty" | "match";
  icon?: LucideIcon;
  capy?: boolean;
  title: ReactNode;
  line?: ReactNode;
  /** shortcut, then what it runs: [["⌘↵", "the whole editor"]] */
  keys?: [string, ReactNode][];
  actions?: ReactNode;
  /** sm: a sidebar or a list in a dialog; xl: Home */
  size?: "sm" | "xl";
}) {
  return (
    <div className={`es${size ? ` es--${size}` : ""}`} data-tone={tone}>
      {capy ? (
        <span className="es-capy about-onsen ping" aria-hidden="true">
          <span className="steam">
            <b />
            <b />
            <b />
          </span>
          <i />
          <i />
          <i />
          <img src="/app-icon.png" alt="" />
        </span>
      ) : (
        Icon && (
          <span className="es-mark" aria-hidden="true">
            <i />
            <i />
            <Icon {...ico} />
          </span>
        )
      )}
      <strong className="es-title">{title}</strong>
      {line && <p className="es-line">{line}</p>}
      {keys && (
        <dl className="es-keys">
          {keys.map(([k, d]) => (
            <div key={k}>
              <dt>
                <Keys k={k} />
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="es-actions">{actions}</div>}
    </div>
  );
}

/** A shortcut drawn as keys, one cap per symbol: <Keys k="⇧⌘↵" /> */
export function Keys({ k }: { k: string }) {
  return (
    <>
      {[...k].map((c, i) => (
        <kbd key={i}>{c}</kbd>
      ))}
    </>
  );
}

/** A name in a title: the table, the key, the schema. */
export function Obj({ children }: { children: ReactNode }) {
  return <code className="es-obj">{children}</code>;
}

/** What was typed, as a chip; its × clears it. */
export function QueryChip({ q, label = "Clear the filter", onClear }: { q: string; label?: string; onClear: () => void }) {
  return (
    <span className="es-q">
      <code>{q}</code>
      <button type="button" className="es-q-x" aria-label={label} title={label} onClick={onClear}>
        <X {...ico} />
      </button>
    </span>
  );
}

/** A line where a list would be (no indexes, no fields): a dashed slot. */
export function EmptyRow({ icon: Icon, title, line }: { icon: LucideIcon; title: ReactNode; line?: ReactNode }) {
  return (
    <div className="es-row">
      <Icon {...ico} />
      <p>
        <strong>{title}</strong>
        {line && <> {line}</>}
      </p>
    </div>
  );
}
