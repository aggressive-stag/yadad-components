"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Timings shared by every touch drag, so the board and the calendar feel the same. */
export const TOUCH_DRAG_DEFAULTS = {
  /** Finger must rest this long before the drag lifts. Shorter than the OS context-menu press. */
  longPressMs: 350,
  /** Movement beyond this before the long-press fires means "scroll or swipe", not "drag". */
  slopPx: 8,
  /** Distance from the scroller's left/right edge at which it starts to auto-scroll. */
  edgePx: 48,
  /** Auto-scroll speed in px per frame at the very edge. */
  scrollStepPx: 8,
} as const;

export interface TouchDragOptions<T> {
  /** False turns the whole gesture off (the card is not movable, there is no `onMove`). */
  readonly enabled: boolean;
  /** The drop target under the finger, or undefined. The view decides what a target is (a column, a day cell). */
  readonly findTarget: (x: number, y: number) => T | undefined;
  /** Called whenever the target under the finger changes, with undefined when it leaves all targets. */
  readonly onHover?: (target: T | undefined) => void;
  /** Called once on release over a target. Not called for cancel, Escape or a release elsewhere. */
  readonly onDrop: (target: T) => void;
  /** The element to auto-scroll sideways near its edges. Evaluated when the drag starts. */
  readonly scroller?: (source: HTMLElement) => HTMLElement | null;
  readonly longPressMs?: number;
  readonly slopPx?: number;
  readonly edgePx?: number;
}

export interface TouchDrag {
  /** Attach to the drag source. Only `pointerType === "touch"` does anything; mouse and pen keep native drag. */
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  /** True from the long-press until release or cancel. */
  readonly dragging: boolean;
}

/**
 * Touch long-press pointer drag (card 16c). A finger resting on the source for
 * `longPressMs` without moving past `slopPx` lifts a `aria-hidden` copy that
 * follows the finger; the view's `findTarget` names the drop target under it;
 * releasing over a target calls `onDrop`. Before the lift the gesture is left
 * alone so scrolling and swiping work; `preventDefault` only starts after it.
 * The rail named by `scroller` auto-scrolls near its edges and its scroll-snap
 * is suspended while dragging.
 */
export function useTouchDrag<T>(options: TouchDragOptions<T>): TouchDrag {
  const [dragging, setDragging] = useState(false);
  const opts = useRef(options);
  opts.current = options;
  const cleanup = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const o = opts.current;
    if (!o.enabled || e.pointerType !== "touch" || !e.isPrimary) return;
    cleanup.current?.();
    const source = e.currentTarget;
    const pointerId = e.pointerId;
    const slop = o.slopPx ?? TOUCH_DRAG_DEFAULTS.slopPx;
    const edge = o.edgePx ?? TOUCH_DRAG_DEFAULTS.edgePx;
    const startX = e.clientX;
    const startY = e.clientY;
    let x = startX;
    let y = startY;
    let lifted = false;
    let hover: T | undefined;
    let ghost: HTMLElement | undefined;
    let ghostDX = 0;
    let ghostDY = 0;
    let frame = 0;
    let rail: HTMLElement | null = null;
    let railSnap = "";

    const setHover = (t: T | undefined): void => {
      if (t === hover) return;
      hover = t;
      opts.current.onHover?.(t);
    };
    const place = (): void => {
      if (ghost) ghost.style.transform = `translate(${x - ghostDX}px, ${y - ghostDY}px)`;
    };
    const update = (): void => {
      place();
      setHover(opts.current.findTarget(x, y));
    };
    const tick = (): void => {
      if (rail) {
        const r = rail.getBoundingClientRect();
        const step = TOUCH_DRAG_DEFAULTS.scrollStepPx;
        if (x < r.left + edge) rail.scrollLeft -= step;
        else if (x > r.right - edge) rail.scrollLeft += step;
        update();
      }
      frame = requestAnimationFrame(tick);
    };
    const blockScroll = (ev: Event): void => {
      if (ev.cancelable) ev.preventDefault();
    };
    const suppress = (ev: Event): void => ev.preventDefault();

    const timer = setTimeout(() => {
      lifted = true;
      const box = source.getBoundingClientRect();
      ghostDX = startX - box.left;
      ghostDY = startY - box.top;
      // The copy lives under the nearest themed root so the component's own CSS (tokens, data-part rules) styles it.
      const host = source.closest<HTMLElement>("[data-yadad]") ?? document.body;
      ghost = source.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("id");
      ghost.setAttribute("aria-hidden", "true");
      ghost.setAttribute("data-touch-ghost", "true");
      ghost.removeAttribute("data-dragging");
      // The copy must never answer a lookup meant for the real source (data-card-id, data-day-id, ...).
      for (const name of ghost.getAttributeNames()) if (/^data-.*-id$/.test(name)) ghost.removeAttribute(name);
      for (const el of ghost.querySelectorAll("[id]")) el.removeAttribute("id");
      ghost.style.cssText = `position:fixed;left:0;top:0;margin:0;width:${box.width}px;pointer-events:none;z-index:2147483647;`;
      host.appendChild(ghost);
      rail = o.scroller?.(source) ?? null;
      if (rail) {
        railSnap = rail.style.scrollSnapType;
        rail.style.scrollSnapType = "none";
      }
      setDragging(true);
      // Haptic tick where supported; never required.
      try {
        navigator.vibrate?.(10);
      } catch {
        /* optional */
      }
      document.addEventListener("touchmove", blockScroll, { passive: false });
      document.addEventListener("contextmenu", suppress);
      frame = requestAnimationFrame(tick);
      update();
    }, o.longPressMs ?? TOUCH_DRAG_DEFAULTS.longPressMs);

    const end = (drop: boolean): void => {
      const target = hover;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", blockScroll);
      // Keep the contextmenu guard a beat: the OS can fire it right after release.
      setTimeout(() => document.removeEventListener("contextmenu", suppress), 0);
      cleanup.current = undefined;
      if (!lifted) return;
      ghost?.remove();
      if (rail) rail.style.scrollSnapType = railSnap;
      setHover(undefined);
      setDragging(false);
      if (drop && target !== undefined) opts.current.onDrop(target);
    };
    const onMove = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      x = ev.clientX;
      y = ev.clientY;
      if (!lifted) {
        // Moved before the press matured: this is a scroll or swipe, leave it alone.
        if (Math.hypot(x - startX, y - startY) > slop) end(false);
        return;
      }
      update();
    };
    const onUp = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      x = ev.clientX;
      y = ev.clientY;
      if (lifted) setHover(opts.current.findTarget(x, y));
      end(true);
    };
    const onCancel = (ev: PointerEvent): void => {
      if (ev.pointerId === pointerId) end(false);
    };
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") end(false);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
    document.addEventListener("keydown", onKey);
    cleanup.current = () => end(false);
  }, []);

  return { onPointerDown, dragging };
}
