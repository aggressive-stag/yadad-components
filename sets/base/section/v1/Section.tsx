import type { SectionProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A titled group of fields: a fieldset, so the title names the group for screen readers. */
export function Section({ id, title, children }: SectionProps<ReactNode>): ReactNode {
  return (
    <fieldset data-yadad="section" data-part="root" data-section={id}>
      {title !== undefined && <legend data-part="title">{title}</legend>}
      {children}
    </fieldset>
  );
}
