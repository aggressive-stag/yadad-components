"use client";

import type { ReactNode } from "react";
import { Button } from "../../button/v1/index.js";

/**
 * Cursor paging controls for the engine's 35e cursor model — there are no
 * page numbers here because the engine gives no page numbers: `First`,
 * `Previous`, `Next`, enabled only when there is a page on that side. A
 * renderer wires the callbacks to its adapter's cursors and puts whatever
 * "32–63 of 148" text it likes in `info`.
 *
 * Not a registry key: `@yadad/core` has no `layout.Pager`/`widgets.pager`
 * contract yet (checked against dist/registry.d.ts, card 15e). It ships as a
 * set — `@yadad/components/pager` + `@yadad/components/styles/pager.css` —
 * and registers when an engine card asks for the key.
 */
export interface PagerProps {
  /** go to the first page; omit (or hasPrev false) and First is disabled */
  onFirst?: () => void;
  /** go to the previous page */
  onPrev?: () => void;
  /** go to the next page */
  onNext?: () => void;
  /** is there a page before this one */
  hasPrev: boolean;
  /** is there a page after this one */
  hasNext: boolean;
  /** text between the buttons, e.g. "32–63 of 148" (announced politely) */
  info?: ReactNode;
  /** First button text. Default: "First". */
  readonly firstLabel?: string;
  /** Previous button text. Default: "Previous". */
  readonly prevLabel?: string;
  /** Next button text. Default: "Next". */
  readonly nextLabel?: string;
  /** Accessible name for the control group. Default: "Pagination". */
  readonly label?: string;
}

export function Pager({ onFirst, onPrev, onNext, hasPrev, hasNext, info, firstLabel = "First", prevLabel = "Previous", nextLabel = "Next", label = "Pagination" }: PagerProps): ReactNode {
  return (
    <nav data-yadad="pager" data-part="root" aria-label={label}>
      <Button label={firstLabel} type="button" variant="secondary" disabled={!hasPrev || onFirst === undefined} {...(onFirst ? { onPress: onFirst } : {})} />
      <Button label={prevLabel} type="button" variant="secondary" disabled={!hasPrev || onPrev === undefined} {...(onPrev ? { onPress: onPrev } : {})} />
      <span data-part="info" aria-live="polite">
        {info}
      </span>
      <Button label={nextLabel} type="button" variant="secondary" disabled={!hasNext || onNext === undefined} {...(onNext ? { onPress: onNext } : {})} />
    </nav>
  );
}
