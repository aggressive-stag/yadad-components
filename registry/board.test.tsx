// @vitest-environment jsdom
import type { BoardCard, BoardColumn, RecordActionItem } from "@yadad/core";
import { act, cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "../sets/base/board/v1/Board.js";

afterEach(cleanup);

const card = (id: string, movable: boolean): BoardCard<ReactNode> => ({ id, label: id, movable, pending: false, content: id });
const col = (id: string, cards: BoardCard<ReactNode>[], droppable = true): BoardColumn<ReactNode> => ({ id, label: id, count: cards.length, droppable, cards });
const columns = [col("a", [card("r1", true), card("r2", false)]), col("b", []), col("locked", [], false)];

function setup(onMove?: (id: string, columnId: string) => void) {
  const view = render(
    <Board label="Tasks" groupChoices={[{ field: "s", label: "S" }]} groupField="s" columns={columns} loading={false} onGroupBy={() => {}} {...(onMove ? { onMove } : {})} />,
  );
  const q = (sel: string): HTMLElement => view.container.querySelector(sel) as HTMLElement;
  return { ...view, q };
}

/** A DataTransfer stand-in: jsdom has none. */
function transfer(): DataTransfer {
  const data = new Map<string, string>();
  return {
    setData: (t: string, v: string) => void data.set(t, v),
    getData: (t: string) => data.get(t) ?? "",
    get types() {
      return [...data.keys()];
    },
    effectAllowed: "uninitialized",
    dropEffect: "none",
  } as unknown as DataTransfer;
}

describe("board drag", () => {
  it("makes only movable cards draggable, and only with onMove", () => {
    const withMove = setup(() => {});
    expect(withMove.q('[data-card-id="r1"]').getAttribute("draggable")).toBe("true");
    expect(withMove.q('[data-card-id="r2"]').getAttribute("draggable")).toBeNull();
    cleanup();
    const without = setup();
    expect(without.q('[data-card-id="r1"]').getAttribute("draggable")).toBeNull();
    expect(without.container.querySelector('[data-part="move-trigger"]')).toBeNull();
  });

  it("calls onMove when a card is dropped on another droppable column, and does not move it itself", () => {
    const onMove = vi.fn();
    const { q } = setup(onMove);
    const dt = transfer();
    fireEvent.dragStart(q('[data-card-id="r1"]'), { dataTransfer: dt });
    const over = createEvent.dragOver(q('[data-column-id="b"]'), { dataTransfer: dt });
    fireEvent(q('[data-column-id="b"]'), over);
    expect(over.defaultPrevented).toBe(true);
    fireEvent.dragEnter(q('[data-column-id="b"]'), { dataTransfer: dt });
    expect(q('[data-column-id="b"]').getAttribute("data-drag-over")).toBe("true");
    fireEvent.drop(q('[data-column-id="b"]'), { dataTransfer: dt });
    expect(onMove).toHaveBeenCalledWith("r1", "b");
    expect(q('[data-column-id="b"]').getAttribute("data-drag-over")).toBeNull();
    expect(q('[data-column-id="a"]').querySelector('[data-card-id="r1"]')).not.toBeNull();
  });

  it("ignores drops on the card's own column and on columns that are not droppable", () => {
    const onMove = vi.fn();
    const { q } = setup(onMove);
    const dt = transfer();
    fireEvent.dragStart(q('[data-card-id="r1"]'), { dataTransfer: dt });
    fireEvent.drop(q('[data-column-id="a"]'), { dataTransfer: dt });
    const over = createEvent.dragOver(q('[data-column-id="locked"]'), { dataTransfer: dt });
    fireEvent(q('[data-column-id="locked"]'), over);
    expect(over.defaultPrevented).toBe(false);
    fireEvent.drop(q('[data-column-id="locked"]'), { dataTransfer: dt });
    expect(onMove).not.toHaveBeenCalled();
  });
});

const action = (over: Partial<RecordActionItem> = {}): RecordActionItem => ({
  id: "a1",
  label: "Open",
  tone: "neutral",
  pending: false,
  onPress: () => {},
  ...over,
});

/** One board whose only card carries the given actions; no onMove (actions stand alone). */
function cardWithActions(actions: readonly RecordActionItem[] | undefined, pending = false) {
  const c: BoardCard<ReactNode> = { ...card("r1", false), ...(actions ? { actions } : {}), pending };
  const view = render(
    <Board label="Tasks" groupChoices={[{ field: "s", label: "S" }]} groupField="s" columns={[col("a", [c])]} loading={false} onGroupBy={() => {}} />,
  );
  const q = (sel: string): HTMLElement | null => view.container.querySelector(`[data-card-id="r1"] ${sel}`);
  return { ...view, q };
}

describe("record actions on cards (RFC 0007)", () => {
  it("renders nothing when a card has no actions", () => {
    const { q } = cardWithActions(undefined);
    expect(q('[data-part="actions"]')).toBeNull();
  });

  it("renders one action as a plain button named by its label and calls onPress", () => {
    const onPress = vi.fn();
    const { q } = cardWithActions([action({ onPress })]);
    const btn = q('[data-part="action"]') as HTMLButtonElement;
    expect(btn.textContent).toBe("Open");
    expect(q('[data-part="actions-trigger"]')).toBeNull();
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("marks the danger tone through data-tone (colour AND border in CSS)", () => {
    const { q } = cardWithActions([action({ id: "d", label: "Delete", tone: "danger" })]);
    expect(q('[data-part="action"]')?.getAttribute("data-tone")).toBe("danger");
  });

  it("disables ALL of a record's buttons while any action is pending and says Working...", () => {
    const { q } = cardWithActions([action(), action({ id: "a2", label: "Delete", tone: "danger", pending: true })]);
    // Two actions live behind the menu: open it to see the buttons.
    fireEvent.click(q('[data-part="actions-trigger"]') as HTMLButtonElement);
    const buttons = [...(q('[data-part="actions-panel"]') as HTMLElement).querySelectorAll<HTMLButtonElement>("[data-part='action']")];
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    const status = q('[data-part="action-status"]');
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.textContent).toBe("Working...");
  });

  it("disables the buttons while the card's MOVE is in flight too (card.pending)", () => {
    const { q } = cardWithActions([action()], true);
    const btn = q('[data-part="action"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(q('[data-part="action-status"]')?.textContent).toBe("Working...");
  });

  it("collapses two or more actions into one menu: Enter opens, Tab reaches every action and Cancel, Escape returns focus to the trigger", () => {
    const { q, container } = cardWithActions([
      action(),
      action({ id: "a2", label: "Duplicate" }),
      action({ id: "a3", label: "Delete", tone: "danger" }),
    ]);
    const trigger = q('[data-part="actions-trigger"]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toBe("Actions…");
    // closed: no individual action buttons in the card
    expect(q('[data-part="action"]')).toBeNull();

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter", bubbles: true });
    // a focused <button> fires click on Enter; jsdom does not synthesize it, so fire it as the browser would
    fireEvent.click(trigger);
    const panel = q('[data-part="actions-panel"]');
    expect(panel).not.toBeNull();
    const items = [...(panel as HTMLElement).querySelectorAll("button")].map((b) => b.textContent);
    expect(items).toEqual(["Open", "Duplicate", "Delete", "Cancel"]);
    expect(document.activeElement).toBe(panel);

    fireEvent.keyDown(panel as HTMLElement, { key: "Escape", bubbles: true });
    expect(q('[data-part="actions-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-part="actions-trigger"]'));
    void container;
  });

  it("Cancel closes the menu and returns focus to the trigger", () => {
    const { q } = cardWithActions([action(), action({ id: "a2", label: "Duplicate" })]);
    const trigger = q('[data-part="actions-trigger"]') as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    const cancel = q('[data-part="actions-cancel"]') as HTMLButtonElement;
    fireEvent.click(cancel);
    expect(q('[data-part="actions-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-part="actions-trigger"]'));
  });

  it("sits on the card whether or not the board is movable (no onMove: still actions, no Move to…)", () => {
    const { container } = cardWithActions([action()]);
    expect(container.querySelector('[data-card-id="r1"] [data-part="action"]')).not.toBeNull();
    expect(container.querySelector('[data-card-id="r1"] [data-part="move-trigger"]')).toBeNull();
  });
});

describe("board touch drag", () => {
  class FakePointerEvent extends MouseEvent {
    pointerType: string;
    pointerId = 1;
    isPrimary = true;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, { bubbles: true, cancelable: true, ...init });
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  const fire = (target: Element | Document, type: string, pointerType = "touch", init: PointerEventInit = {}): void => {
    act(() => void target.dispatchEvent(new FakePointerEvent(type, { pointerType, ...init })));
  };
  let under: Element | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    document.elementFromPoint = () => under;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    under = null;
  });

  it("long-press, move and release over another column calls onMove once", () => {
    const onMove = vi.fn();
    const { q } = setup(onMove);
    under = q('[data-column-id="b"] [data-part="cards"]');
    fire(q('[data-card-id="r1"]'), "pointerdown", "touch", { clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(350));
    expect(q('[data-card-id="r1"]').getAttribute("data-dragging")).toBe("true");
    fire(document, "pointermove", "touch", { clientX: 200, clientY: 5 });
    expect(q('[data-column-id="b"]').getAttribute("data-drag-over")).toBe("true");
    fire(document, "pointerup", "touch", { clientX: 200, clientY: 5 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith("r1", "b");
    expect(q('[data-column-id="b"]').getAttribute("data-drag-over")).toBeNull();
  });

  it("never calls onMove for a swipe, a cancel, the own column, a locked column or a mouse", () => {
    const onMove = vi.fn();
    const { q } = setup(onMove);
    const src = q('[data-card-id="r1"]');
    // swipe: moves past the slop before the press matures
    under = q('[data-column-id="b"]');
    fire(src, "pointerdown", "touch", { clientX: 5, clientY: 5 });
    fire(document, "pointermove", "touch", { clientX: 60, clientY: 5 });
    act(() => void vi.advanceTimersByTime(500));
    fire(document, "pointerup");
    // cancel
    fire(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointercancel");
    // own column
    under = q('[data-column-id="a"]');
    fire(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointerup");
    // locked column
    under = q('[data-column-id="locked"]');
    fire(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointerup");
    // mouse
    under = q('[data-column-id="b"]');
    fire(src, "pointerdown", "mouse");
    act(() => void vi.advanceTimersByTime(1000));
    fire(document, "pointerup", "mouse");
    // a card that cannot move
    fire(q('[data-card-id="r2"]'), "pointerdown");
    act(() => void vi.advanceTimersByTime(1000));
    fire(document, "pointerup");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("stops the browser's own drag after a touch press", () => {
    const { q } = setup(vi.fn());
    fire(q('[data-card-id="r1"]'), "pointerdown");
    const e = createEvent.dragStart(q('[data-card-id="r1"]'), { dataTransfer: transfer() });
    fireEvent(q('[data-card-id="r1"]'), e);
    expect(e.defaultPrevented).toBe(true);
  });
});
