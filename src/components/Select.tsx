import type { SelectHTMLAttributes } from "react";
import { ChevronDown, ico } from "./Icon";

/**
 * A native <select> with a Lucide chevron laid over its right edge (the chevron ignores the pointer,
 * so clicks still reach the select). The wrapper is a one-cell grid: the select stretches to it unless
 * its own class gives it a width (e.g. .set-scheme).
 */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-wrap">
      <select {...props} />
      <ChevronDown {...ico} className="ico select-chev" />
    </span>
  );
}
