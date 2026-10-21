// @vitest-environment jsdom
// Card 15e: loading holds the shape (table + board skeletons) and the cursor
// Pager. Skeleton tests assert geometry and aria-hidden (bars are decoration;
// the announcement stays text), pager tests assert the cursor model: enabled
// only toward an existing page, callbacks once, labels as props (15a pattern).
import type { BoardColumn, TableColumnHeader } from "@yadad/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "../sets/base/board/v1/Board.js";
import { Pager } from "../sets/base/pager/v1/Pager.js";
import { Table } from "../sets/base/table/v1/Table.js";

afterEach(cleanup);

const columns: TableColumnHeader[] = [
  { id: "d", label: "Date", headerId: "h-d", sortable: true },
  { id: "n", label: "Name", headerId: "h-n", sortable: true },
  { id: "s", label: "Status", headerId: "h-s", sortable: false },
];

// ---------------------------------------------------------------- skeletons

describe("table skeleton (card 15e)", () => {
  it("loading renders five skeleton rows inside the real table, not the empty cell", () => {
    const { container } = render(<Table caption="Sets" columns={columns} rows={[]} onSort={() => {}} empty="No sets" loading />);
    const bodyRows = [...container.querySelectorAll('tbody [data-part="skeleton-row"]')];
    expect(bodyRows).toHaveLength(5);
    expect(container.querySelector('[data-part="empty"]')).toBeNull();
    // real geometry: one cell per column, each holding an aria-hidden bar
    for (const row of bodyRows) {
      const cells = [...row.querySelectorAll('[role="cell"]')];
      expect(cells).toHaveLength(3);
      for (const cell of cells) {
        const bar = cell.querySelector('[data-part="skeleton"]');
        expect(bar).not.toBeNull();
        expect(bar?.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  it("skeletonRows sizes the placeholder block; 0 collapses to an empty body", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={[]} onSort={() => {}} empty="none" loading skeletonRows={2} />);
    expect(container.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(2);
    const { container: c0 } = render(<Table caption="c" columns={columns} rows={[]} onSort={() => {}} empty="none" loading skeletonRows={0} />);
    expect(c0.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(0);
  });

  it("empty keeps its meaning: not loading, zero rows shows the empty cell, no bars", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={[]} onSort={() => {}} empty="No sets" />);
    expect(container.querySelector('[data-part="empty"]')?.textContent).toBe("No sets");
    expect(container.querySelector('[data-part="skeleton"]')).toBeNull();
  });

  it("loading wins over stale rows (the table shows the shape, not last page's content)", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={[{ id: "r1", cells: ["a", "b", "c"] }]} onSort={() => {}} empty="none" loading />);
    expect(container.querySelectorAll('[data-part="skeleton-row"]')).toHaveLength(5);
    expect(container.querySelector("[data-yadad-row]")).toBeNull();
  });
});

const boardColumn = (id: string, label: string): BoardColumn<string> => ({ id, label, count: 0, droppable: false, cards: [] });

describe("board skeleton (card 15e)", () => {
  const harness = (loading: boolean, over: Partial<BoardColumn<string>> = {}) =>
    render(
      <Board
        label="Tasks"
        groupChoices={[{ field: "s", label: "S" }]}
        groupField="s"
        columns={[{ ...boardColumn("a", "To do"), ...over }]}
        loading={loading}
        onGroupBy={() => {}}
      />,
    );

  it("loading columns show card-shaped bars with a text alternative (exactly one status region)", () => {
    const { container } = harness(true);
    const empty = container.querySelector('[data-part="column-empty"]') as HTMLElement;
    expect(empty).not.toBeNull();
    // the announcement region is the board's only role="status" — the
    // skeleton must not add a second (contract kit queries it by role)
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(empty.textContent).toContain("Loading cards…"); // the text alternative survives
    const cards = [...empty.querySelectorAll('[data-part="skeleton-card"]')];
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const bars = [...card.querySelectorAll('[data-part="skeleton"]')];
      expect(bars.length).toBeGreaterThanOrEqual(2); // label + body
      for (const bar of bars) expect(bar.getAttribute("aria-hidden")).toBe("true");
    }
    // the status text must not be visible layout text — it is the bars' alt
    expect(empty.querySelector('[data-part="loading-text"]')).not.toBeNull();
  });

  it("not loading, empty column keeps the plain 'No cards' — no bars, no status", () => {
    const { container } = harness(false);
    const empty = container.querySelector('[data-part="column-empty"]');
    expect(empty?.textContent).toBe("No cards");
    expect(container.querySelector('[data-part="skeleton-card"]')).toBeNull();
    expect(empty?.getAttribute("role")).toBeNull();
  });
});

// -------------------------------------------------------------------- pager

describe("Pager (card 15e)", () => {
  const buttons = (container: HTMLElement): HTMLButtonElement[] =>
    [...container.querySelectorAll("button")] as HTMLButtonElement[];

  it("renders First, Previous and Next with English defaults and a polite info slot", () => {
    const { container } = render(<Pager hasPrev hasNext info="32–63 of 148" />);
    const [first, prev, next] = buttons(container);
    expect(first?.textContent).toBe("First");
    expect(prev?.textContent).toBe("Previous");
    expect(next?.textContent).toBe("Next");
    const info = container.querySelector('[data-part="info"]');
    expect(info?.textContent).toBe("32–63 of 148");
    expect(info?.getAttribute("aria-live")).toBe("polite");
    expect(container.querySelector('[data-yadad="pager"]')?.getAttribute("aria-label")).toBe("Pagination");
  });

  it("middle page: everything enabled and each callback fires exactly once", () => {
    const onFirst = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container } = render(<Pager hasPrev hasNext onFirst={onFirst} onPrev={onPrev} onNext={onNext} />);
    const [first, prev, next] = buttons(container);
    expect(first && prev && next && ![first, prev, next].some((b) => b.disabled)).toBe(true);
    fireEvent.click(first as HTMLButtonElement);
    fireEvent.click(prev as HTMLButtonElement);
    fireEvent.click(next as HTMLButtonElement);
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("first page: First and Previous disabled, Next live; last page mirrors it", () => {
    const { container: cFirst } = render(<Pager hasPrev={false} hasNext onFirst={() => {}} onPrev={() => {}} onNext={() => {}} />);
    const [first, prev, next] = buttons(cFirst);
    expect([first?.disabled, prev?.disabled, next?.disabled]).toEqual([true, true, false]);
    const { container: cLast } = render(<Pager hasPrev hasNext={false} onFirst={() => {}} onPrev={() => {}} onNext={() => {}} />);
    const [f2, p2, n2] = buttons(cLast);
    expect([f2?.disabled, p2?.disabled, n2?.disabled]).toEqual([false, false, true]);
  });

  it("no callback means no direction: the button is disabled even when has* says a page exists", () => {
    const { container } = render(<Pager hasPrev hasNext />);
    for (const b of buttons(container)) expect(b.disabled).toBe(true);
  });

  it("labels are props (15a pattern): overrides replace every default, including the group name", () => {
    const { container } = render(<Pager hasPrev hasNext firstLabel="Anfang" prevLabel="Zurück" nextLabel="Weiter" label="Seiten" info="1–10 von 148" />);
    const [first, prev, next] = buttons(container);
    expect([first?.textContent, prev?.textContent, next?.textContent]).toEqual(["Anfang", "Zurück", "Weiter"]);
    expect(container.querySelector('[data-yadad="pager"]')?.getAttribute("aria-label")).toBe("Seiten");
  });
});
