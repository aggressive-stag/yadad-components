// @vitest-environment jsdom
import type { BoardCard, BoardColumn } from "@yadad/core";
import { cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
