"use client";

import type { SeriesWidgetProps } from "@yadad/core";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
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
 * - `display: "table"` (17a): a compact two-column table (group label,
 *   formatted value) captioned by `label`, with `measureLabel` as the value
 *   header.
 * - `display: "bar"` (17b): an inline-SVG column chart — a value axis from
 *   zero with nice (1/2/5×10ⁿ) ticks and group labels under the bars. The
 *   table still renders every group's label and text, visually hidden: a
 *   chart of bars is decoration, the numbers are data, and the chart is
 *   never the only way to read them (the contract kit checks this).
 * - `display: "line"`: still 17a's table — card 17c replaces it with the
 *   line chart, which keeps the same rules.
 *
 * The value shown is always the engine's preformatted `text`; the component
 * never formats a group's number itself (axis ticks are chart chrome, not
 * data, and are formatted from the tick value). `loading` holds the shape
 * with skeleton rows/blocks and stays `aria-hidden` — the host view owns the
 * announcement.
 */
export interface SeriesComponentProps extends SeriesWidgetProps {
  readonly strings?: SeriesStrings;
}

const SKELETON_ROWS = 4;

// Chart geometry (17b). Logical units are CSS px: the viewBox is drawn at
// the measured container width, so 1 unit = 1 px at rest.
const CHART_HEIGHT = 260;
const MARGIN = { top: 10, right: 8, bottom: 30, left: 36 };
/** Width assumed before the container has been measured (SSR/jsdom). */
export const CHART_FALLBACK_WIDTH = 640;
/** Minimum px a horizontal group label may claim before labels thin out. */
export const MIN_LABEL_PX = 48;

/** Nice axis ticks from 0 to a rounded ceiling: steps of 1, 2 or 5 × 10ⁿ. */
export function niceTicks(max: number, targetTicks: number): { ticks: number[]; top: number } {
  if (!(max > 0) || !(targetTicks > 0)) return { ticks: [0, 1], top: 1 };
  const rough = max / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return { ticks, top };
}

/** How many groups share one drawn x label: 1 while they fit, else thinned. */
export function labelEveryFor(count: number, plotWidth: number): number {
  const fit = Math.max(1, Math.floor(plotWidth / MIN_LABEL_PX));
  return Math.max(1, Math.ceil(count / fit));
}

const tickText = (v: number, step: number): string =>
  v.toFixed(step >= 1 ? 0 : Math.min(6, Math.max(0, -Math.floor(Math.log10(step)) + 1)));

const BAR_TARGET_TICKS = 5;
const PHONE_TICKS = 3;

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

  // 17b: the chart measures its panel so label thinning and tick counts
  // follow the width a widget actually got (a dashboard column can be 320px
  // on a phone). jsdom/SSR never measure: the fallback width draws the
  // desktop shape.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const read = (): void => setContainerW(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [display, loading, groups.length]);

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

  const isBar = display === "bar";
  const chartReady = isBar && !loading && groups.length > 0;
  const W = containerW > 0 ? Math.round(containerW) : CHART_FALLBACK_WIDTH;
  const plotW = Math.max(10, W - MARGIN.left - MARGIN.right);
  const plotH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const phone = W < 420;

  const values = groups.map((g) => g.value).filter((v): v is number => v !== undefined && v > 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const { ticks, top } = niceTicks(max, phone ? PHONE_TICKS : BAR_TARGET_TICKS);
  const step = ticks.length > 1 ? (ticks[1] ?? 1) - (ticks[0] ?? 0) : 1;
  const labelEvery = chartReady ? labelEveryFor(groups.length, plotW) : 1;

  // Roving tabindex (17b): one tab stop across the *drawn* bars — gap groups
  // have no focusable node, so the roving index walks the value groups only.
  // `pos` is the position within those; `active` drives the tooltip (hover
  // may land on any drawn bar, so it stores the group index directly).
  const focusable = groups.map((g, i) => (g.value === undefined ? -1 : i)).filter((i) => i >= 0);
  const [pos, setPos] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const barRefs = useRef<(SVGGElement | null)[]>([]);
  const clampedPos = Math.min(pos, Math.max(0, focusable.length - 1));
  const rovingGroup = focusable[clampedPos];

  const onBarKeyDown = (i: number) => (e: KeyboardEvent<SVGGElement>): void => {
    const p = focusable.indexOf(i);
    if (p < 0) return;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(focusable.length - 1, p + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, p - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = focusable.length - 1;
    if (next === null) return;
    e.preventDefault();
    setPos(next);
    const groupIdx = focusable[next];
    if (groupIdx !== undefined) {
      setActive(groupIdx);
      barRefs.current[groupIdx]?.focus();
    }
  };

  const slot = chartReady ? plotW / groups.length : 0;
  const barW = chartReady ? Math.min(48, slot * 0.62) : 0;
  const baseY = MARGIN.top + plotH;

  return (
    <div data-yadad="series" data-part="root" data-display={display} data-state={loading ? "loading" : groups.length === 0 ? "empty" : "ready"}>
      <div data-part="label">{label}</div>
      {isBar && (
        <div data-part="chart" ref={wrapRef}>
          {loading ? (
            // The chart holds its shape too (15e): a block where the plot
            // will be, bars included in the illusion. aria-hidden: the host
            // view announces loading, a grey box is decoration.
            <div data-part="chart-skeleton" aria-hidden="true">
              <Skeleton width="100%" height={CHART_HEIGHT} />
            </div>
          ) : groups.length > 0 ? (
            <>
              <svg
                data-part="chart-svg"
                role="img"
                aria-label={label}
                viewBox={`0 0 ${W} ${CHART_HEIGHT}`}
                preserveAspectRatio="xMinYMin meet"
              >
                <g data-part="axis">
                  {ticks.map((t) => (
                    <g key={`tick-${t}`} data-part="tick">
                      <line data-part="gridline" x1={MARGIN.left} x2={W - MARGIN.right} y1={baseY - (t / top) * plotH} y2={baseY - (t / top) * plotH} />
                      <text data-part="tick-label" x={MARGIN.left - 6} y={baseY - (t / top) * plotH + 4} textAnchor="end">
                        {tickText(t, step)}
                      </text>
                    </g>
                  ))}
                  <line data-part="baseline" x1={MARGIN.left} x2={W - MARGIN.right} y1={baseY} y2={baseY} />
                </g>
                {groups.map((g, i) => {
                  const cx = MARGIN.left + slot * i + slot / 2;
                  const showLabel = i % labelEvery === 0;
                  if (g.value === undefined) {
                    // A gap is a gap, never a zero-height bar: no rect at
                    // all, just the small dash at the baseline.
                    return (
                      <g key={g.key} data-part="gap-group">
                        <title>{`${g.label}: ${g.text}`}</title>
                        <text data-part="gap-dash" x={cx} y={baseY - 4} textAnchor="middle">
                          –
                        </text>
                        {showLabel && (
                          <text data-part="bar-label" x={cx} y={CHART_HEIGHT - 10} textAnchor="middle">
                            {g.label}
                          </text>
                        )}
                      </g>
                    );
                  }
                  const h = Math.max(1, (Math.max(0, g.value) / top) * plotH);
                  return (
                    <g
                      key={g.key}
                      data-part="bar-group"
                      ref={(el) => {
                        barRefs.current[i] = el;
                      }}
                      tabIndex={i === rovingGroup ? 0 : -1}
                      aria-label={`${g.label}: ${g.text}`}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive((a) => (a === i ? null : a))}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                      onKeyDown={onBarKeyDown(i)}
                    >
                      <title>{`${g.label}: ${g.text}`}</title>
                      <rect data-part="bar" data-active={active === i || undefined} x={cx - barW / 2} y={baseY - h} width={barW} height={h} rx={2} />
                      {showLabel && (
                        <text data-part="bar-label" x={cx} y={CHART_HEIGHT - 10} textAnchor="middle">
                          {g.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {active !== null && groups[active] !== undefined && (
                // Visual echo of the focused/hovered bar; the same words are
                // already in the bar's accessible name and the table below,
                // so this must not be announced twice.
                <div data-part="tooltip" aria-hidden="true">
                  {groups[active]!.label}: {groups[active]!.text}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
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
