import type { PanelProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A card around one dashboard widget. */
export function Panel({ title, children }: PanelProps<ReactNode>): ReactNode {
  return (
    <div data-yadad="panel" data-part="root">
      {title !== undefined && <h3 data-part="title">{title}</h3>}
      {children}
    </div>
  );
}
