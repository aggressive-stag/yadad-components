import type { CountWidgetProps } from "@yadad/core";
import type { ReactNode } from "react";

/**
 * A labelled number, e.g. "Working sets 12". Shows the engine's preformatted
 * `text` when given (stat widgets), and an ellipsis while loading.
 */
export function Count({ label, value, text }: CountWidgetProps): ReactNode {
  return (
    <div data-yadad="count" data-part="root" aria-busy={text === undefined && value === undefined}>
      <div data-part="label">{label}</div>
      <div data-part="value">{text ?? value ?? "…"}</div>
    </div>
  );
}
