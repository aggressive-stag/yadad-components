import type { CountWidgetProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A labelled number, e.g. "Working sets 12". Shows an ellipsis while loading. */
export function Count({ label, value }: CountWidgetProps): ReactNode {
  return (
    <div data-yadad="count" data-part="root" aria-busy={value === undefined}>
      <div data-part="label">{label}</div>
      <div data-part="value">{value ?? "…"}</div>
    </div>
  );
}
