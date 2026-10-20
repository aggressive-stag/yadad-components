// @vitest-environment jsdom
import type { RecordActionItem, TableColumnHeader } from "@yadad/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table } from "../sets/base/table/v1/Table.js";

afterEach(cleanup);

const columns: TableColumnHeader[] = [
  { id: "d", label: "Date", headerId: "h-d", sortable: true, sort: "asc" as const },
  { id: "n", label: "Name", headerId: "h-n", sortable: true },
];
const rows = [{ id: "r1", cells: ["2026-01-01", "Ann"] }];

const action = (over: Partial<RecordActionItem> = {}): RecordActionItem => ({
  id: "a1",
  label: "Open",
  tone: "neutral",
  pending: false,
  onPress: () => {},
  ...over,
});

describe("table markup", () => {
  it("names the sort direction on the button and labels every cell for the stacked layout", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={rows} onSort={() => {}} empty="none" />);
    const [date, name] = [...container.querySelectorAll('[data-part="sort"]')];
    expect(date?.textContent).toContain("Date, sorted ascending");
    expect(name?.textContent).not.toContain("sorted");
    expect(container.querySelector('th[aria-sort="ascending"]')).not.toBeNull();
    const cells = [...container.querySelectorAll('[data-part="cell"]')].map((c) => c.getAttribute("data-label"));
    expect(cells).toEqual(["Date", "Name"]);
  });

  it("tags each body row with its stable id", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={rows} onSort={() => {}} empty="none" />);
    expect(container.querySelector('tr[data-yadad-row="r1"]')).not.toBeNull();
  });
});

describe("record actions (RFC 0007)", () => {
  const withActions = [{ id: "r1", cells: ["2026-01-01", "Ann"], actions: [action(), action({ id: "a2", label: "Delete", tone: "danger" })] }];

  it("adds a last Actions column only when some row has actions, and names each button by its label", () => {
    const plain = render(<Table caption="c" columns={columns} rows={rows} onSort={() => {}} empty="none" />);
    expect(plain.container.querySelector('th[data-col="actions"]')).toBeNull();
    cleanup();

    const { container } = render(<Table caption="c" columns={columns} rows={withActions} onSort={() => {}} empty="none" />);
    const headers = [...container.querySelectorAll("th")];
    expect(headers[headers.length - 1]?.textContent).toBe("Actions");
    const buttons = [...container.querySelectorAll('[data-part="action"]')];
    expect(buttons.map((b) => b.textContent)).toEqual(["Open", "Delete"]);
    // exactly the buttons given, none invented
    expect(container.querySelectorAll("button").length).toBe(2 /* sorts */ + 2);
  });

  it("uses actionsLabel for the header and the stacked cell label", () => {
    const { container } = render(<Table caption="c" columns={columns} rows={withActions} onSort={() => {}} empty="none" actionsLabel="Do" />);
    expect(container.querySelector('th[data-col="actions"]')?.textContent).toBe("Do");
    expect(container.querySelector('td[data-col="actions"]')?.getAttribute("data-label")).toBe("Do");
  });

  it("marks the danger tone and presses call onPress", () => {
    const onPress = vi.fn();
    const { container } = render(
      <Table caption="c" columns={columns} rows={[{ id: "r1", cells: ["a", "b"], actions: [action({ id: "d", label: "Delete", tone: "danger", onPress })] }]} onSort={() => {}} empty="none" />,
    );
    const btn = container.querySelector('[data-part="action"]') as HTMLButtonElement;
    expect(btn.getAttribute("data-tone")).toBe("danger");
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("disables every button of a pending row and says Working... to screen readers", () => {
    const { container } = render(
      <Table caption="c" columns={columns} rows={[{ id: "r1", cells: ["a", "b"], actions: [action(), action({ id: "a2", label: "Delete", tone: "danger", pending: true })] }]} onSort={() => {}} empty="none" />,
    );
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-part="action"]')];
    expect(buttons.every((b) => b.disabled)).toBe(true);
    const status = container.querySelector('[data-part="action-status"]');
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.textContent).toBe("Working...");
  });

  it("hides actions behind a trigger on phone width, opening on Enter and closing on Escape to the trigger", () => {
    // jsdom's matchMedia stub reports no match; make this a phone viewport.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("500px"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    try {
      const { container } = render(<Table caption="c" columns={columns} rows={withActions} onSort={() => {}} empty="none" />);
      const trigger = container.querySelector('[data-part="actions-trigger"]') as HTMLButtonElement;
      expect(trigger).not.toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      // the collapsed cell shows only the trigger
      expect(container.querySelector('[data-part="actions-list"]')).toBeNull();

      trigger.focus();
      fireEvent.click(trigger); // Enter/Space on a focused <button> fires click
      expect(container.querySelector('[data-part="actions-panel"]')).not.toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const panel = container.querySelector('[data-part="actions-panel"]') as HTMLElement;
      expect(document.activeElement).toBe(panel);
      // every action reachable in the panel, in order, plus Cancel
      const items = [...panel.querySelectorAll("button")].map((b) => b.textContent);
      expect(items).toEqual(["Open", "Delete", "Cancel"]);

      fireEvent.keyDown(panel, { key: "Escape" });
      expect(container.querySelector('[data-part="actions-panel"]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    } finally {
      window.matchMedia = original;
    }
  });
});
