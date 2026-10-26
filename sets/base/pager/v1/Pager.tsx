"use client";

import type { PagerProps as CorePagerProps } from "@yadad/core";
import type { ReactNode } from "react";
import { Button } from "../../button/v1/index.js";

/**
 * Cursor paging controls for the engine's 35e cursor model — there are no
 * page numbers here because the engine gives no page numbers: `First`,
 * `Previous`, `Next`, enabled only when there is a page on that side. A
 * renderer wires the callbacks to its adapter's cursors and puts whatever
 * "32–63 of 148" text it likes in `info`.
 *
 * Not a registry key: the cursor model has no registry contract. It ships as
 * a set — `@yadad/components/pager` + `@yadad/components/styles/pager.css`.
 * The component for the `layout.Pager` registry key (RFC 0008 item 11,
 * engine 47e) is `TablePager` in this same module.
 */
export interface PagerCursorProps {
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

export function Pager({ onFirst, onPrev, onNext, hasPrev, hasNext, info, firstLabel = "First", prevLabel = "Previous", nextLabel = "Next", label = "Pagination" }: PagerCursorProps): ReactNode {
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

/**
 * The `layout.Pager` registry component (RFC 0008 item 11, engine 47e): the
 * renderer owns page state and hands enabled-ness through `hasPrevious`/
 * `hasNext`; the set owns the styling. The markup matches the renderer's
 * built-in pager (table-renderer.tsx:419) — a labelled `<nav>` carrying
 * `data-yadad-pager`, the same secondary Previous/Next Button pair, the same
 * "Page N [of M]" text — so a host swapping one for the other breaks no
 * query; there are no numbered buttons because the built-in has none (card
 * 23c: match the built-in shape). What the base adds is styling: the current
 * page carries `aria-current` (typographic marker — never colour alone),
 * disabled ends come free from the Button, and focus rings are the set's
 * Button rings. Cursor mode (`pageCount` undefined) shows "Page N".
 */
export function TablePager({ label, hasPrevious, hasNext, page, pageCount, onPrevious, onNext }: CorePagerProps): ReactNode {
  return (
    <nav data-yadad="pager" data-yadad-pager="" data-part="root" aria-label={label}>
      <Button label="Previous" type="button" variant="secondary" disabled={!hasPrevious} {...(hasPrevious ? { onPress: onPrevious } : {})} />
      <span data-part="info" aria-current="true">
        {pageCount === undefined ? `Page ${page}` : `Page ${page} of ${pageCount}`}
      </span>
      <Button label="Next" type="button" variant="secondary" disabled={!hasNext} {...(hasNext ? { onPress: onNext } : {})} />
    </nav>
  );
}
