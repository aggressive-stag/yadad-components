"use client";

import type { SeriesWidgetProps } from "@yadad/core";
import type { ReactNode } from "react";
import { Skeleton } from "../../../internal/skeleton/v1/index.js";

/**
 * Every word a series widget shows, overridable per host (15a's pattern):
 * each prop is optional and defaults to the English literal.
 */
export interface SeriesStrings {
  /** Empty state: loaded, zero groups. */
  emptyLabel?: string;
  /** Header of the group column (the value column's header is `measureLabel`). */
  groupLabel?: string;
  /** Note when records carry no group value. Takes the count. */
  skippedLabel?: (count: number) => string;
  /** Note when the read stopped at the record ceiling. Takes read and total. */
  partialLabel?: (read: number, total: number) => string;
  /** Accessible name for the group/value table. */
  tableAriaLabel?: (label: string) => string;
}

/**
 * The series widget (RFC 0001 slice 2): one measure per group of a table
 * view. The engine computes the groups; this component only draws them.
 *
 * The table display is a compact two-column table (group label, formatted
 * value) captioned by `label`, with `measureLabel` as the value header.
 * `bar` and `line` draw the SAME table here — cards 17b and 17c replace
 * them with SVG charts that keep this table as the visible data layer.
 *
 * The value shown is always the engine's preformatted `text`; the component
 * never formats a number itself. `loading` holds the shape with skeleton
 * rows and stays `aria-hidden` — the host view owns the announcement.
 */
export interface SeriesComponentProps extends SeriesWidgetProps {
  readonly strings?: SeriesStrings;
}

const SKELETON_ROWS = 4;

export function Series({
  label,
  display,
  groups,
  skipped,
  partial,
  loading,
  error,
  measureLabel,
  strings = {},
}: SeriesComponentProps): ReactNode {
  const emptyLabel = strings.emptyLabel ?? "Nothing to show yet";
  const groupLabel = strings.groupLabel ?? "Group";
  const skippedLabel =
    strings.skippedLabel ?? ((count: number) => `${count} record${count === 1 ? "" : "s"} without a group`);
  const partialLabel =
    strings.partialLabel ?? ((read: number, total: number) => `Partial: ${read} of ${total} records read`);
  const tableAriaLabel = strings.tableAriaLabel ?? ((name: string) => name);

  if (error !== undefined) {
    // A failed read is content, not decoration: it must be readable.
    return (
      <div data-yadad="series" data-part="root" data-display={display} data-state="error">
        <div data-part="label">{label}</div>
        <p data-part="error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div data-yadad="series" data-part="root" data-display={display} data-state={loading ? "loading" : groups.length === 0 ? "empty" : "ready"}>
      <div data-part="label">{label}</div>
      <table
        data-part="table"
        aria-label={loading ? undefined : tableAriaLabel(label)}
        {...(loading ? { "aria-hidden": "true" as const } : {})}
      >
        <caption data-part="caption">{label}</caption>
        <thead>
          <tr>
            <th scope="col" data-part="group-header">
              {groupLabel}
            </th>
            <th scope="col" data-part="measure-header">
              {measureLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Loading holds the shape (15e): skeleton rows inside the real
            // table so the columns keep their width. `empty` means loaded
            // with zero groups and never doubles as loading.
            Array.from({ length: SKELETON_ROWS }, (_, r) => (
              <tr key={`skeleton-${r}`} data-part="skeleton-row">
                <td role="cell">
                  <Skeleton width="60%" height="1em" />
                </td>
                <td role="cell">
                  <Skeleton width={`${40 + ((r * 13) % 30)}%`} height="1em" />
                </td>
              </tr>
            ))
          ) : groups.length === 0 ? (
            <tr>
              <td colSpan={2} data-part="empty">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            groups.map((g) => (
              <tr key={g.key} data-part="group-row" data-gap={g.value === undefined || undefined}>
                <td data-part="group-label">{g.label}</td>
                <td data-part="group-value">{g.text}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && skipped > 0 && (
        <p data-part="skipped" data-testid="series-skipped">
          {skippedLabel(skipped)}
        </p>
      )}
      {!loading && partial !== undefined && (
        <p data-part="partial" data-testid="series-partial">
          {partialLabel(partial.read, partial.total)}
        </p>
      )}
    </div>
  );
}
