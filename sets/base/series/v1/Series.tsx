"use client";

import type { SeriesWidgetProps } from "@yadad/core";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Skeleton } from "../../../internal/skeleton/v1/index.js";
import {
  CHART_FALLBACK_WIDTH,
  CHART_HEIGHT,
  CHART_PHONE_WIDTH,
  MARGIN,
  PHONE_TICKS,
  TARGET_TICKS,
  labelEveryFor,
  measureFitsData,
  niceRange,
  niceTicks,
  tickText,
} from "./chart.js";

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
 *   zero with nice (1/2/5×10ⁿ) ticks and group labels under the bars.
 * - `display: "line"` (17c): an inline-SVG line chart over the same axes and
 *   label thinning (shared in `chart.ts`). The line breaks at `null` — one
 *   path segment per run of non-null values — and every point carries a dot,
 *   so a single point reads as a dot. The value axis starts at 0 for
 *   sum/count-style measures and fits the data for min/max/avg (see
 *   `measureFitsData` and the 17c Report's Decision).
 *
 * In both charts the table still renders every group's label and text,
 * visually hidden: a chart of bars or lines is decoration, the numbers are
 * data, and the chart is never the only way to read them (the contract kit
 * checks this).
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

export function Series({
  label,
  display,
  groups,
  skipped,
  partial,
  loading,
  error,
  measureLabel,
  aggregation,
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
  const isLine = display === "line";
  const isChart = isBar || isLine;
  const chartReady = isChart && !loading && groups.length > 0;
  const W = containerW > 0 ? Math.round(containerW) : CHART_FALLBACK_WIDTH;
  const plotW = Math.max(10, W - MARGIN.left - MARGIN.right);
  const plotH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const phone = W < CHART_PHONE_WIDTH;
  const targetTicks = phone ? PHONE_TICKS : TARGET_TICKS;

  const numeric = groups.map((g) => g.value).filter((v): v is number => v !== undefined);
  // Axis (shared rules, chart.ts): bars and zero-anchored lines run from 0;
  // a min/max/avg line fits its data. The machine answer is
  // SeriesWidgetProps.aggregation (core >= 0.14); the label sniff inside
  // measureFitsData runs only against an older engine that omits it
  // (Decision: 17c, updated by card 19).
  const fits = isLine && measureFitsData(aggregation, measureLabel);
  const axis = (() => {
    if (isBar || !fits) {
      const positives = numeric.filter((v) => v > 0);
      const max = positives.length > 0 ? Math.max(...positives) : 0;
      const { ticks, top } = niceTicks(max, targetTicks);
      return { ticks, low: 0, top: top === 0 ? 1 : top };
    }
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    return niceRange(min, max, targetTicks);
  })();
  const { ticks, low, top } = axis;
  const step = ticks.length > 1 ? (ticks[1] ?? 1) - (ticks[0] ?? 0) : 1;
  const labelEvery = chartReady ? labelEveryFor(groups.length, plotW) : 1;
  const baseY = MARGIN.top + plotH;
  const yFor = (v: number): number => baseY - ((v - low) / (top - low)) * plotH;

  // Roving tabindex (17b/17c): one tab stop across the *drawn* marks — gap
  // groups have no focusable node, so the roving index walks the value
  // groups only. `pos` is the position within those; `active` drives the
  // tooltip (hover may land on any drawn mark, so it stores the group index).
  const focusable = groups.map((g, i) => (g.value === undefined ? -1 : i)).filter((i) => i >= 0);
  const [pos, setPos] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const markRefs = useRef<(SVGGElement | null)[]>([]);
  const clampedPos = Math.min(pos, Math.max(0, focusable.length - 1));
  const rovingGroup = focusable[clampedPos];

  const onMarkKeyDown = (i: number) => (e: KeyboardEvent<SVGGElement>): void => {
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
      markRefs.current[groupIdx]?.focus();
    }
  };

  const slot = chartReady ? plotW / groups.length : 0;
  const barW = chartReady ? Math.min(48, slot * 0.62) : 0;
  const cxFor = (i: number): number => MARGIN.left + slot * i + slot / 2;

  // The line's path: one subpath (one `M…L…`) per run of non-null values —
  // `null` is a gap, so the line breaks there instead of bridging to a zero
  // or to the far neighbour. A run of one point contributes a segment too;
  // the dot makes it visible either way.
  const linePath = (() => {
    if (!chartReady || !isLine) return "";
    const segs: string[] = [];
    let run: string[] = [];
    groups.forEach((g, i) => {
      if (g.value === undefined) {
        if (run.length > 0) {
          segs.push(run.join(" "));
          run = [];
        }
        return;
      }
      const x = cxFor(i);
      const y = yFor(g.value);
      run.push(`${run.length > 0 ? "L" : "M"} ${x} ${y}`);
    });
    if (run.length > 0) segs.push(run.join(" "));
    return segs.join(" ");
  })();

  const markPart = isLine ? "point-group" : "bar-group";
  const labelPart = isLine ? "x-label" : "bar-label";
  // Labels live in their own non-interactive layer, not inside the marks:
  // a wide group label inside a focusable <g> makes that group's hit box
  // swallow its neighbours' hover targets (found by the 17c browser check —
  // see the Report). The label text is decoration for AT; the table and the
  // mark names carry the words.
  const xLabels: { key: string; cx: number; text: string }[] = [];
  if (chartReady) {
    groups.forEach((g, i) => {
      if (i % labelEvery === 0) xLabels.push({ key: g.key, cx: cxFor(i), text: g.label });
    });
  }
  // A line point's hit area: the dot alone is too small a target and the
  // <g> has no box of its own — one transparent rect per point, exactly its
  // slot, tiling the plot so no neighbour can overlap it.
  const hitW = chartReady ? Math.max(1, slot) : 0;

  return (
    <div data-yadad="series" data-part="root" data-display={display} data-state={loading ? "loading" : groups.length === 0 ? "empty" : "ready"}>
      <div data-part="label">{label}</div>
      {isChart && (
        <div data-part="chart" ref={wrapRef}>
          {loading ? (
            // The chart holds its shape too (15e): a block where the plot
            // will be, bars/line included in the illusion. aria-hidden: the
            // host view announces loading, a grey box is decoration.
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
                      <line data-part="gridline" x1={MARGIN.left} x2={W - MARGIN.right} y1={yFor(t)} y2={yFor(t)} />
                      <text data-part="tick-label" x={MARGIN.left - 6} y={yFor(t) + 4} textAnchor="end">
                        {tickText(t, step)}
                      </text>
                    </g>
                  ))}
                  <line data-part="baseline" x1={MARGIN.left} x2={W - MARGIN.right} y1={baseY} y2={baseY} />
                </g>
                {isLine && linePath !== "" && <path data-part="line" d={linePath} />}
                {groups.map((g, i) => {
                  const cx = cxFor(i);
                  const showLabel = i % labelEvery === 0;
                  if (g.value === undefined) {
                    // A gap is a gap, never a zero: no bar, no dot, no line
                    // through it — just the small dash at the baseline.
                    return (
                      <g key={g.key} data-part="gap-group">
                        <title>{`${g.label}: ${g.text}`}</title>
                        <text data-part="gap-dash" x={cx} y={baseY - 4} textAnchor="middle">
                          –
                        </text>
                      </g>
                    );
                  }
                  if (isLine) {
                    return (
                      <g
                        key={g.key}
                        data-part={markPart}
                        role="img"
                        ref={(el) => {
                          markRefs.current[i] = el;
                        }}
                        tabIndex={i === rovingGroup ? 0 : -1}
                        aria-label={`${g.label}: ${g.text}`}
                        onFocus={() => setActive(i)}
                        onBlur={() => setActive((a) => (a === i ? null : a))}
                        onPointerEnter={() => setActive(i)}
                        onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                        onKeyDown={onMarkKeyDown(i)}
                      >
                        <title>{`${g.label}: ${g.text}`}</title>
                        <rect data-part="point-hit" x={cx - hitW / 2} y={MARGIN.top} width={hitW} height={plotH} fill="transparent" />
                        <circle data-part="dot" data-active={active === i || undefined} cx={cx} cy={yFor(g.value)} r={4} />
                      </g>
                    );
                  }
                  const h = Math.max(1, (Math.max(0, g.value) / top) * plotH);
                  return (
                    <g
                      key={g.key}
                      data-part={markPart}
                      ref={(el) => {
                        markRefs.current[i] = el;
                      }}
                      tabIndex={i === rovingGroup ? 0 : -1}
                      aria-label={`${g.label}: ${g.text}`}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive((a) => (a === i ? null : a))}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                      onKeyDown={onMarkKeyDown(i)}
                    >
                      <title>{`${g.label}: ${g.text}`}</title>
                      <rect data-part="bar" data-active={active === i || undefined} x={cx - barW / 2} y={baseY - h} width={barW} height={h} rx={2} />
                      {showLabel && (
                        <text data-part={labelPart} x={cx} y={CHART_HEIGHT - 10} textAnchor="middle">
                          {g.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                {isLine && (
                  <g data-part="x-labels" aria-hidden="true">
                    {xLabels.map((l) => (
                      <text key={l.key} data-part="x-label" x={l.cx} y={CHART_HEIGHT - 10} textAnchor="middle">
                        {l.text}
                      </text>
                    ))}
                  </g>
                )}
              </svg>
              {active !== null && groups[active] !== undefined && (
                // Visual echo of the focused/hovered mark; the same words are
                // already in the mark's accessible name and the table below,
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
