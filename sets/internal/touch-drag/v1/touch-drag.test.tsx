// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTouchDrag } from "./useTouchDrag.js";

/** jsdom has no PointerEvent: a MouseEvent carrying the three fields the helper reads. */
class FakePointerEvent extends MouseEvent {
  pointerType: string;
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, { bubbles: true, cancelable: true, ...init });
    this.pointerType = init.pointerType ?? "mouse";
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}

/** Fire a pointer event the way the browser would: React listens at the root, the helper at the document. */
function pointer(target: Element | Document, type: string, init: PointerEventInit = {}): void {
  act(() => {
    target.dispatchEvent(new FakePointerEvent(type, { pointerType: "touch", ...init }));
  });
}

const onDrop = vi.fn();
const onHover = vi.fn();
let hit: string | undefined;

function Source({ enabled = true }: { enabled?: boolean }): ReactNode {
  const { onPointerDown, dragging } = useTouchDrag<string>({
    enabled,
    findTarget: () => hit,
    onHover,
    onDrop,
  });
  return (
    <div data-yadad="x">
      <p data-testid="src" data-dragging={dragging} onPointerDown={onPointerDown}>
        card
      </p>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("PointerEvent", FakePointerEvent);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  hit = "t1";
  onDrop.mockReset();
  onHover.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const setup = (enabled = true) => {
  const view = render(<Source enabled={enabled} />);
  return { ...view, src: view.getByTestId("src") };
};

describe("useTouchDrag", () => {
  it("lifts after the long-press, shows an aria-hidden copy, and drops on the target", () => {
    const { src, container } = setup();
    pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
    act(() => void vi.advanceTimersByTime(349));
    expect(src.getAttribute("data-dragging")).toBe("false");
    act(() => void vi.advanceTimersByTime(1));
    expect(src.getAttribute("data-dragging")).toBe("true");
    const ghost = container.querySelector('[data-touch-ghost="true"]');
    expect(ghost?.getAttribute("aria-hidden")).toBe("true");
    expect(onHover).toHaveBeenLastCalledWith("t1");
    pointer(document, "pointerup", { clientX: 50, clientY: 50 });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith("t1");
    expect(container.querySelector('[data-touch-ghost="true"]')).toBeNull();
    expect(src.getAttribute("data-dragging")).toBe("false");
    expect(onHover).toHaveBeenLastCalledWith(undefined);
  });

  it("treats movement past the slop before the press matures as a swipe", () => {
    const { src } = setup();
    pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
    pointer(document, "pointermove", { clientX: 30, clientY: 10 });
    act(() => void vi.advanceTimersByTime(1000));
    pointer(document, "pointerup", { clientX: 30, clientY: 10 });
    expect(src.getAttribute("data-dragging")).toBe("false");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("tolerates a small wobble inside the slop", () => {
    const { src } = setup();
    pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
    pointer(document, "pointermove", { clientX: 14, clientY: 14 });
    act(() => void vi.advanceTimersByTime(350));
    expect(src.getAttribute("data-dragging")).toBe("true");
  });

  it("a quick tap never drops", () => {
    const { src } = setup();
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(100));
    pointer(document, "pointerup");
    act(() => void vi.advanceTimersByTime(1000));
    expect(onDrop).not.toHaveBeenCalled();
    expect(src.getAttribute("data-dragging")).toBe("false");
  });

  it("pointercancel and Escape cancel without dropping", () => {
    const { src, container } = setup();
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    pointer(document, "pointercancel");
    expect(onDrop).not.toHaveBeenCalled();
    expect(container.querySelector('[data-touch-ghost="true"]')).toBeNull();
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    act(() => void fireEvent.keyDown(document, { key: "Escape" }));
    pointer(document, "pointerup");
    expect(onDrop).not.toHaveBeenCalled();
    expect(src.getAttribute("data-dragging")).toBe("false");
  });

  it("releasing over no target does not drop", () => {
    const { src } = setup();
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    hit = undefined;
    pointer(document, "pointerup");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("ignores mouse and pen, and a disabled source", () => {
    const { src, rerender } = setup();
    for (const pointerType of ["mouse", "pen"]) {
      pointer(src, "pointerdown", { pointerType });
      act(() => void vi.advanceTimersByTime(1000));
      expect(src.getAttribute("data-dragging")).toBe("false");
      pointer(document, "pointerup", { pointerType });
    }
    rerender(<Source enabled={false} />);
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(1000));
    expect(src.getAttribute("data-dragging")).toBe("false");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("removes its listeners and the copy on unmount", () => {
    const { src, unmount } = setup();
    pointer(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    unmount();
    expect(document.querySelector('[data-touch-ghost="true"]')).toBeNull();
    pointer(document, "pointerup");
    expect(onDrop).not.toHaveBeenCalled();
  });
});
