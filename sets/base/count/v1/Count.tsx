import type { CountWidgetProps } from "@yadad/core";
import type { ReactNode } from "react";

/**
 * A labelled number, e.g. "Working sets 12". The label is an `<h2>` (RFC 0008 item 12: the dashboard gives the widget no panel title, so the label is the widget's heading). Shows the engine's preformatted
 * `text` when given (stat widgets), and an ellipsis while loading.
 */
export function Count({ label, value, text }: CountWidgetProps): ReactNode {
  return (
    <div data-yadad="count" data-part="root" aria-busy={text === undefined && value === undefined}>
      <h2 data-part="label">{label}</h2>
      <div data-part="value">{text ?? value ?? "…"}</div>
    </div>
  );
}
