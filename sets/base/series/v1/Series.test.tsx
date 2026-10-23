// @vitest-environment jsdom
// Card 17a: the series widget as a table. The engine computes the groups
// (runtime/aggregate.ts); this component only draws them and never formats a
// number — the group's `text` is shown verbatim, including the dash for a gap
// bucket. Tests here cover the drawing rules the contract kit cannot: notes
// hidden while loading, empty ≠ loading, strings overrides (15a's pattern),
// and the table display under every engine display value.
import type { SeriesGroupProps } from "@yadad/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Series } from "./Series.js";

afterEach(cleanup);

const base = {
  label: "Sets per day",
  display: "table" as const,
  loading: false,
  measureLabel: "Sum of sets",
};

const groups: SeriesGroupProps[] = [
  { key: "2026-10-01", label: "Thursday 1 October", value: 12, text: "12" },
  { key: "2026-10-02", label: "Friday 2 October", value: undefined, text: "—" },
  { key: "2026-10-03", label: "Saturday 3 October", value: 3.5, text: "3.5" },
];

describe("series table (card 17a)", () => {
  it("renders a two-column table with label caption, measureLabel header and every group's text", () => {
    const { container } = render(<Series {...base} groups={groups} skipped={0} />);
    const table = container.querySelector('table[data-part="table"]');
    expect(table).not.toBeNull();
    expect(container.querySelector('caption[data-part="caption"]')?.textContent).toBe("Sets per day");
    expect(container.querySelector('[data-part="measure-header"]')?.textContent).toBe("Sum of sets");
    expect(container.querySelector('[data-part="group-header"]')?.textContent).toBe("Group");
    const rows = [...container.querySelectorAll('[data-part="group-row"]')];
    expect(rows).toHaveLength(3);
    expect(rows[0]?.querySelector('[data-part="group-label"]')?.textContent).toBe("Thursday 1 October");
    expect(rows[0]?.querySelector('[data-part="group-value"]')?.textContent).toBe("12");
    // the gap group keeps its dash text verbatim and is flagged for styling
    expect(rows[1]?.getAttribute("data-gap")).not.toBeNull();
    expect(rows[1]?.querySelector('[data-part="group-value"]')?.textContent).toBe("—");
  });

  it("bar and line draw the same table until 17b and 17c land (Decision:)", () => {
    for (const display of ["bar", "line"] as const) {
      const { container } = render(<Series {...base} display={display} groups={groups} skipped={0} />);
      expect(container.querySelector('[data-part="root"]')?.getAttribute("data-display")).toBe(display);
      expect(container.querySelectorAll('[data-part="group-row"]')).toHaveLength(3);
      // no SVG yet — the table display is the data layer the charts draw over
      expect(container.querySelector("svg")).toBeNull();
      cleanup();
    }
  });

  it("the table is named by its label so a screen reader can find it", () => {
    const { container } = render(<Series {...base} groups={groups} skipped={0} />);
    expect(container.querySelector('table[data-part="table"]')?.getAttribute("aria-label")).toBe("Sets per day");
  });

  it("loading holds the shape: skeleton rows in the real table, aria-hidden, no notes, no empty cell", () => {
    const { container } = render(<Series {...base} groups={[]} skipped={4} partial={{ read: 3, total: 9 }} loading />);
    const table = container.querySelector('table[data-part="table"]');
    expect(table).not.toBeNull();
    expect(table?.getAttribute("aria-hidden")).toBe("true");
    expect(table?.getAttribute("aria-label")).toBeNull();
    const rows = [...container.querySelectorAll('[data-part="skeleton-row"]')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.querySelectorAll('[data-part="skeleton"]')).toHaveLength(2);
    expect(container.querySelector('[data-part="empty"]')).toBeNull();
    // a grey bar is decoration while loading: notes and values wait for data
    expect(container.querySelector('[data-testid="series-skipped"]')).toBeNull();
    expect(container.querySelector('[data-testid="series-partial"]')).toBeNull();
    expect(container.querySelector('[data-part="root"]')?.getAttribute("data-state")).toBe("loading");
  });

  it("loaded with no groups is the empty state, never the loading shape", () => {
    const { container } = render(<Series {...base} groups={[]} skipped={0} />);
    expect(container.querySelector('[data-part="empty"]')?.textContent).toBe("Nothing to show yet");
    expect(container.querySelector('[data-part="skeleton-row"]')).toBeNull();
    expect(container.querySelector('[data-part="root"]')?.getAttribute("data-state")).toBe("empty");
    expect(container.querySelector('table[data-part="table"]')?.getAttribute("aria-hidden")).toBeNull();
  });

  it("shows the skipped and partial notes with their counts, hidden at zero/absent", () => {
    const { container, rerender } = render(<Series {...base} groups={groups} skipped={2} />);
    expect(container.querySelector('[data-testid="series-skipped"]')?.textContent).toBe("2 records without a group");
    expect(container.querySelector('[data-testid="series-partial"]')).toBeNull();
    rerender(<Series {...base} groups={groups} skipped={1} partial={{ read: 5000, total: 9000 }} />);
    expect(container.querySelector('[data-testid="series-skipped"]')?.textContent).toBe("1 record without a group");
    expect(container.querySelector('[data-testid="series-partial"]')?.textContent).toBe("Partial: 5000 of 9000 records read");
    cleanup();
    const { container: clean } = render(<Series {...base} groups={groups} skipped={0} />);
    expect(clean.querySelector('[data-testid="series-skipped"]')).toBeNull();
    expect(clean.querySelector('[data-testid="series-partial"]')).toBeNull();
  });

  it("an error read is content: rendered in a role=alert, not hidden", () => {
    const { container } = render(<Series {...base} groups={[]} skipped={0} error="The read failed" />);
    const alert = container.querySelector('[data-part="error"]');
    expect(alert?.getAttribute("role")).toBe("alert");
    expect(alert?.textContent).toBe("The read failed");
    expect(container.querySelector('[data-part="root"]')?.getAttribute("data-state")).toBe("error");
  });

  it("every word is a prop; English is only the default (15a)", () => {
    const { container } = render(
      <Series
        {...base}
        groups={groups}
        skipped={2}
        partial={{ read: 3, total: 9 }}
        strings={{
          emptyLabel: "Noch nichts",
          groupLabel: "Gruppe",
          skippedLabel: (n) => `${n} ohne Gruppe`,
          partialLabel: (r, t) => `Unvollständig: ${r} von ${t}`,
          tableAriaLabel: (name) => `Tabelle ${name}`,
        }}
      />,
    );
    expect(container.querySelector('[data-part="group-header"]')?.textContent).toBe("Gruppe");
    expect(container.querySelector('[data-testid="series-skipped"]')?.textContent).toBe("2 ohne Gruppe");
    expect(container.querySelector('[data-testid="series-partial"]')?.textContent).toBe("Unvollständig: 3 von 9");
    expect(container.querySelector('table[data-part="table"]')?.getAttribute("aria-label")).toBe("Tabelle Sets per day");
    cleanup();
    const { container: empty } = render(
      <Series {...base} groups={[]} skipped={0} strings={{ emptyLabel: "Noch nichts" }} />,
    );
    expect(empty.querySelector('[data-part="empty"]')?.textContent).toBe("Noch nichts");
  });
});
