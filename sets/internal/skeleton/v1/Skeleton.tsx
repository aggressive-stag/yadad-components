"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * A grey block that holds the shape of content still arriving — card 15e.
 * Internal: table rows and board cards compose it; it is not a registry key
 * and never standalone content. Always `aria-hidden`: the loading announcement
 * is the host's job (the board's `role="status"`, the table's caption), and a
 * screen reader has nothing to read in a grey bar.
 *
 * Sizes are props because only the caller knows the geometry it is imitating
 * (a column's width, a card's line count); numbers are px, strings pass
 * through so `%` and `calc()` work.
 */
export interface SkeletonProps {
  /** block width — a number is px, a string passes through (`"60%"`, …) */
  width?: number | string;
  /** block height — a number is px, a string passes through */
  height?: number | string;
  /** extra class hooks are not a thing here; `data-part` callers may override */
  part?: string;
  style?: CSSProperties;
}

const size = (v: number | string | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

export function Skeleton({ width, height, part = "skeleton", style }: SkeletonProps): ReactNode {
  return (
    <span
      aria-hidden="true"
      data-part={part}
      style={{ display: "block", inlineSize: size(width), blockSize: size(height), ...style }}
    />
  );
}
