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

function Source({ enabled = true, autoScrollY = false, onClick }: { enabled?: boolean; autoScrollY?: boolean; onClick?: () => void }): ReactNode {
  const { onPointerDown, dragging } = useTouchDrag<string>({
    enabled,
    findTarget: () => hit,
    onHover,
    onDrop,
    autoScrollY,
  });
  return (
    <div data-yadad="x">
      <p data-testid="src" data-dragging={dragging} onPointerDown={onPointerDown} onClick={onClick}>
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

const setup = (enabled = true, extra: { autoScrollY?: boolean; onClick?: () => void } = {}) => {
  const view = render(<Source enabled={enabled} {...extra} />);
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

  describe("vertical auto-scroll", () => {
    let frames: FrameRequestCallback[] = [];
    const runFrame = (): void => {
      const f = frames;
      frames = [];
      act(() => f.forEach((cb) => cb(0)));
    };
    beforeEach(() => {
      frames = [];
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
      vi.stubGlobal("innerHeight", 800);
      Object.defineProperty(document, "scrollingElement", { configurable: true, value: document.documentElement });
      document.documentElement.scrollTop = 100;
    });
    afterEach(() => {
      document.documentElement.scrollTop = 0;
    });

    const lift = (autoScrollY: boolean, y: number) => {
      const view = setup(true, { autoScrollY });
      pointer(view.src, "pointerdown", { clientX: 10, clientY: y });
      act(() => void vi.advanceTimersByTime(350));
      return view;
    };

    it("scrolls the page up near the top edge and down near the bottom edge", () => {
      lift(true, 10);
      runFrame();
      expect(document.documentElement.scrollTop).toBe(92);
      pointer(document, "pointermove", { clientX: 10, clientY: 790 });
      runFrame();
      expect(document.documentElement.scrollTop).toBe(100);
      pointer(document, "pointermove", { clientX: 10, clientY: 400 });
      runFrame();
      expect(document.documentElement.scrollTop).toBe(100);
    });

    it("leaves the page alone unless autoScrollY is set", () => {
      lift(false, 10);
      runFrame();
      expect(document.documentElement.scrollTop).toBe(100);
    });

    it("scrolls the nearest vertically scrolling container instead of the page", () => {
      const view = render(
        <div data-testid="box" style={{ overflowY: "auto" }}>
          <Source autoScrollY />
        </div>,
      );
      const box = view.getByTestId("box");
      Object.defineProperty(box, "scrollHeight", { configurable: true, value: 900 });
      Object.defineProperty(box, "clientHeight", { configurable: true, value: 300 });
      box.getBoundingClientRect = () => ({ top: 100, bottom: 400, left: 0, right: 300, width: 300, height: 300, x: 0, y: 100, toJSON: () => ({}) });
      box.scrollTop = 50;
      const src = view.getAllByTestId("src").at(-1) as HTMLElement;
      pointer(src, "pointerdown", { clientX: 10, clientY: 390 });
      act(() => void vi.advanceTimersByTime(350));
      runFrame();
      expect(box.scrollTop).toBe(58);
      expect(document.documentElement.scrollTop).toBe(100);
    });
  });

  describe("click after a lifted drag", () => {
    it("swallows exactly one click after a drop, then lets clicks through", () => {
      const onClick = vi.fn();
      const { src } = setup(true, { onClick });
      pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
      act(() => void vi.advanceTimersByTime(350));
      pointer(document, "pointerup", { clientX: 50, clientY: 50 });
      fireEvent.click(src);
      expect(onClick).not.toHaveBeenCalled();
      fireEvent.click(src);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("also swallows after a cancel and after a release over no target", () => {
      const onClick = vi.fn();
      const { src } = setup(true, { onClick });
      pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
      act(() => void vi.advanceTimersByTime(350));
      pointer(document, "pointercancel");
      fireEvent.click(src);
      hit = undefined;
      pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
      act(() => void vi.advanceTimersByTime(350));
      pointer(document, "pointerup", { clientX: 10, clientY: 10 });
      fireEvent.click(src);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("stops listening on the next tick when no click came", () => {
      const onClick = vi.fn();
      const { src } = setup(true, { onClick });
      pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
      act(() => void vi.advanceTimersByTime(350));
      pointer(document, "pointerup", { clientX: 50, clientY: 50 });
      act(() => void vi.advanceTimersByTime(1));
      fireEvent.click(src);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("never swallows the click of a plain tap that did not lift", () => {
      const onClick = vi.fn();
      const { src } = setup(true, { onClick });
      pointer(src, "pointerdown", { clientX: 10, clientY: 10 });
      act(() => void vi.advanceTimersByTime(100));
      pointer(document, "pointerup", { clientX: 10, clientY: 10 });
      fireEvent.click(src);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
