/**
 * Chart geometry shared by the series bar (17b) and line (17c) displays:
 * the axes, the "nice tick" walk, and label thinning. Kept out of Series.tsx
 * so both displays import the same rules and one fix lands in both.
 *
 * Logical units are CSS px: the viewBox is drawn at the measured container
 * width, so 1 unit = 1 px at rest (see the preserveAspectRatio Decision in
 * the 17b Report — a resize re-renders the viewBox instead of stretching).
 */
import type { Measure } from "@yadad/core";

export const CHART_HEIGHT = 260;
export const MARGIN = { top: 10, right: 8, bottom: 30, left: 36 };
/** Width assumed before the container has been measured (SSR/jsdom). */
export const CHART_FALLBACK_WIDTH = 640;
/** Minimum px a horizontal group label may claim before labels thin out. */
export const MIN_LABEL_PX = 48;
/** Measured width below which the chart switches to the phone shape. */
export const CHART_PHONE_WIDTH = 420;
export const TARGET_TICKS = 5;
export const PHONE_TICKS = 3;

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

/**
 * Nice ticks over a data range that need not include 0 (17c: a min/max/avg
 * line fits the data instead of collapsing to the ceiling). The step walks
 * 1/2/5×10ⁿ and the bounds round outward to it, so every data point lands
 * inside the axis.
 */
export function niceRange(
  min: number,
  max: number,
  targetTicks: number,
): { ticks: number[]; low: number; top: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(targetTicks > 0)) {
    return { ticks: [0, 1], low: 0, top: 1 };
  }
  if (min === max) {
    // A flat run still gets a readable axis: pad one step either way.
    const pad = Math.abs(min) >= 1 ? Math.abs(min) * 0.1 : 1;
    return niceRange(min - pad, max + pad, targetTicks);
  }
  const rough = (max - min) / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const low = Math.floor(min / step) * step;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = low; v <= top + step / 2; v += step) ticks.push(v);
  return { ticks, low, top };
}

/** How many groups share one drawn x label: 1 while they fit, else thinned. */
export function labelEveryFor(count: number, plotWidth: number): number {
  const fit = Math.max(1, Math.floor(plotWidth / MIN_LABEL_PX));
  return Math.max(1, Math.ceil(count / fit));
}

/** Tick text from the tick value and the step size (chart chrome, not data). */
export function tickText(v: number, step: number): string {
  return v.toFixed(step >= 1 ? 0 : Math.min(6, Math.max(0, -Math.floor(Math.log10(step)) + 1)));
}

/**
 * `Decision:` the axis baseline (17c, updated by card 19). Core 0.14.0's
 * `SeriesWidgetProps` carries `aggregation: Measure["op"]` — the machine
 * answer to "what is this number" — and the axis trusts it: `min`, `max` and
 * `avg` fit their data; `sum`, `count` (and any other op) start at 0, the
 * honest default. The 17c label sniff (first word min/max/avg/average,
 * case-insensitive) survives ONLY as the fallback for an engine older than
 * core 0.14, which sends just the prose `measureLabel`; it is copy, not
 * protocol, so behaviour must never depend on it when `aggregation` is there.
 */
export function measureFitsData(aggregation: Measure["op"] | undefined, measureLabel: string): boolean {
  if (aggregation !== undefined) return aggregation === "min" || aggregation === "max" || aggregation === "avg";
  const first = measureLabel.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return first === "min" || first === "max" || first === "avg" || first === "average";
}
