// @vitest-environment jsdom
// Card 17a: the series widget as a table. The engine computes the groups
// (runtime/aggregate.ts); this component only draws them and never formats a
// number — the group's `text` is shown verbatim, including the dash for a gap
// bucket. Tests here cover the drawing rules the contract kit cannot: notes
// hidden while loading, empty ≠ loading, strings overrides (15a's pattern),
// and the table display under every engine display value.
// Card 17b adds the bar chart: geometry (counts, proportional heights, nice
// ticks), gap semantics (no-value is no bar), roving-tabindex keyboard
// movement, the hidden data table that must match the chart, and axe.
import type { SeriesGroupProps } from "@yadad/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { labelEveryFor, measureFitsData, niceRange, niceTicks } from "./chart.js";
import { Series } from "./Series.js";

afterEach(cleanup);

const base = {
  label: "Sets per day",
  display: "table" as const,
  loading: false,
  measureLabel: "Sum of sets",
  aggregation: "sum" as const,
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

  it("bar and line both draw their chart over the data table (17b and 17c)", () => {
    {
      const { container } = render(<Series {...base} display="bar" groups={groups} skipped={0} />);
      expect(container.querySelector('[data-part="root"]')?.getAttribute("data-display")).toBe("bar");
      expect(container.querySelector('svg[data-part="chart-svg"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-part="bar-group"]')).toHaveLength(2); // the gap group draws no bar
      expect(container.querySelectorAll('[data-part="table"] tbody [data-part="group-row"]')).toHaveLength(3);
      cleanup();
    }
    {
      const { container } = render(<Series {...base} display="line" groups={groups} skipped={0} />);
      expect(container.querySelector('[data-part="root"]')?.getAttribute("data-display")).toBe("line");
      expect(container.querySelector('svg[data-part="chart-svg"]')).not.toBeNull();
      expect(container.querySelector('path[data-part="line"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-part="point-group"]')).toHaveLength(2); // the gap group draws no dot
      expect(container.querySelectorAll('[data-part="table"] tbody [data-part="group-row"]')).toHaveLength(3);
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

// ---------------------------------------------------------------- bar (17b)

const manyGroups: SeriesGroupProps[] = Array.from({ length: 60 }, (_, i) => ({
  key: `k${i}`,
  label: `G${i}`,
  value: (i % 7) + 1,
  text: String((i % 7) + 1),
}));

describe("series bar chart (card 17b)", () => {
  it("one bar per value group; a no-value group draws no bar, just the dash", () => {
    const { container } = render(<Series {...base} display="bar" groups={groups} skipped={0} />);
    expect(container.querySelectorAll('[data-part="bar"]')).toHaveLength(2); // the gap group has no rect
    expect(container.querySelectorAll('[data-part="bar-group"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="gap-group"]')).toHaveLength(1);
    const dash = container.querySelector('[data-part="gap-dash"]');
    expect(dash?.textContent).toBe("–");
    expect(container.querySelector('[data-part="gap-group"] [data-part="bar"]')).toBeNull(); // a gap is not a zero
  });

  it("bar heights are proportional to the values against a nice-tick axis from zero", () => {
    const gs: SeriesGroupProps[] = [
      { key: "a", label: "A", value: 5, text: "5" },
      { key: "b", label: "B", value: 10, text: "10" },
      { key: "c", label: "C", value: 15, text: "15" },
    ];
    const { container } = render(<Series {...base} display="bar" groups={gs} skipped={0} />);
    const bars = [...container.querySelectorAll<SVGRectElement>('[data-part="bar"]')];
    expect(bars).toHaveLength(3);
    const h = bars.map((b) => parseFloat(b.getAttribute("height") ?? "0"));
    expect(h[1]).toBeCloseTo((h[0] ?? 0) * 2, 3);
    expect(h[2]).toBeCloseTo((h[0] ?? 0) * 3, 3);
    // axis from 0 with nice ticks: 0 at the baseline, top tick a multiple of 1/2/5×10ⁿ
    const tickLabels = [...container.querySelectorAll('[data-part="tick-label"]')].map((t) => t.textContent);
    expect(tickLabels[0]).toBe("0");
    expect(tickLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("the hidden table carries every group's label and text — the chart is never the only reading", () => {
    const { container } = render(<Series {...base} display="bar" groups={groups} skipped={0} />);
    const table = container.querySelector('[data-part="table"]');
    expect(table).not.toBeNull();
    const rows = [...table!.querySelectorAll("tbody [data-part=\"group-row\"]")];
    expect(rows).toHaveLength(groups.length);
    for (const g of groups) {
      expect(table!.textContent).toContain(g.label);
      expect(table!.textContent).toContain(g.text);
    }
    // the svg is a named img; the table keeps the data role
    const svg = container.querySelector('svg[data-part="chart-svg"]');
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Sets per day");
  });

  it("roving tabindex: one tab stop, arrows move it and announce through the bar name", () => {
    const { container } = render(<Series {...base} display="bar" groups={groups} skipped={0} />);
    // `groups` is Mon, Tue, and a gap: only the two drawn bars are focusable,
    // the gap group has no focusable node at all.
    const barGroups = [...container.querySelectorAll<SVGGElement>('[data-part="bar-group"]')];
    expect(barGroups).toHaveLength(2);
    expect(barGroups.filter((g) => g.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(barGroups.every((g) => (g.getAttribute("tabindex") === "0" ? true : g.getAttribute("tabindex") === "-1"))).toBe(true);
    fireEvent.keyDown(barGroups[0]!, { key: "ArrowRight" });
    expect(barGroups[1]?.getAttribute("tabindex")).toBe("0");
    expect(barGroups[0]?.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(barGroups[1]!, { key: "Home" });
    expect(barGroups[0]?.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(barGroups[0]!, { key: "End" });
    const last = barGroups[barGroups.length - 1]!;
    expect(last.getAttribute("tabindex")).toBe("0");
    // hover/focus marks the bar active and the tooltip echoes label+text
    fireEvent.focus(last);
    expect(last.querySelector('[data-part="bar"]')?.hasAttribute("data-active")).toBe(true);
    const tip = document.querySelector('[data-part="tooltip"]');
    // barGroups[1] is the *second drawn bar* = groups[2] (Saturday): Friday
    // is the gap group and is not in the roving set at all.
    expect(tip?.textContent).toBe(`${groups[2]!.label}: ${groups[2]!.text}`);
    expect(tip?.getAttribute("aria-hidden")).toBe("true");
  });

  it("labels thin out when the groups would collide (≈48px minimum per label)", () => {
    expect(labelEveryFor(10, 640)).toBe(1);
    expect(labelEveryFor(60, 640)).toBe(5); // 13 slots fit, 60 need 5×
    expect(labelEveryFor(1, 10)).toBe(1);
    const { container } = render(<Series {...base} display="bar" groups={manyGroups} skipped={0} />);
    const labels = container.querySelectorAll('[data-part="bar"] ~ [data-part="bar-label"], [data-part="bar-group"] [data-part="bar-label"]');
    expect(labels.length).toBeLessThan(manyGroups.length); // thinned at the fallback width
    expect(labels.length).toBeGreaterThan(0);
  });

  it("niceTicks walks 1/2/5 × 10ⁿ and always starts at 0", () => {
    expect(niceTicks(12, 5)).toEqual({ ticks: [0, 5, 10, 15], top: 15 });
    expect(niceTicks(0.31, 4).ticks[0]).toBe(0);
    expect(niceTicks(0.31, 4).top).toBeCloseTo(0.4, 6);
    expect(niceTicks(97, 5).top).toBe(100);
  });

  it("loading gives the chart a skeleton, not a stub or a crash", () => {
    const { container } = render(<Series {...base} display="bar" groups={[]} skipped={0} loading />);
    const sk = container.querySelector('[data-part="chart-skeleton"]');
    expect(sk).not.toBeNull();
    expect(sk?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll('[data-part="skeleton-row"]').length).toBeGreaterThan(0);
  });

  it("the chart passes axe (bar names, hidden table, svg label)", async () => {
    const { container } = render(
      <div>
        <Series {...base} display="bar" groups={groups} skipped={1} partial={{ read: 3, total: 9 }} />
      </div>,
    );
    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

// -------------------------------------------------------------- line (17c)

/** Three runs of value separated by two null gaps. */
const lineGroups: SeriesGroupProps[] = [
  { key: "a", label: "A", value: 10, text: "10" },
  { key: "b", label: "B", value: 20, text: "20" },
  { key: "c", label: "C", value: undefined, text: "—" },
  { key: "d", label: "D", value: 30, text: "30" },
  { key: "e", label: "E", value: undefined, text: "—" },
  { key: "f", label: "F", value: 40, text: "40" },
];

describe("series line chart (card 17c)", () => {
  it("the path has one segment per run of non-null values (the line breaks at null)", () => {
    const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} />);
    const d = container.querySelector('path[data-part="line"]')?.getAttribute("d") ?? "";
    const segments = d.split("M").filter((s) => s.trim() !== "");
    expect(segments).toHaveLength(3); // [A B], [D], [F]
    // each segment: one M plus its L's
    expect(segments[0]).toContain("L");
    expect(segments[1]).not.toContain("L"); // the lone point D
    expect(segments[2]).not.toContain("L"); // the lone point F
  });

  it("a single point shows as a dot (no line needed to see it)", () => {
    const one: SeriesGroupProps[] = [{ key: "x", label: "Only", value: 7, text: "7" }];
    const { container } = render(<Series {...base} display="line" groups={one} skipped={0} />);
    const dot = container.querySelector('circle[data-part="dot"]');
    expect(dot).not.toBeNull();
    expect(parseFloat(dot!.getAttribute("r") ?? "0")).toBeGreaterThan(0);
  });

  it("one dot per value group; a null group is a gap — no dot, no dash-as-zero", () => {
    const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} />);
    expect(container.querySelectorAll('circle[data-part="dot"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-part="gap-group"]')).toHaveLength(2);
    for (const gap of container.querySelectorAll('[data-part="gap-group"]')) {
      expect(gap.querySelector('circle[data-part="dot"]')).toBeNull();
      expect(gap.querySelector('[data-part="gap-dash"]')?.textContent).toBe("–");
    }
  });

  it("the sum axis starts at 0; a min/max/avg axis fits the data", () => {
    // measureLabel "Sum of sets" -> zero-anchored
    {
      const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} measureLabel="Sum of sets" />);
      const sumTicks = [...container.querySelectorAll('[data-part="tick-label"]')].map((t) => parseFloat(t.textContent ?? "0"));
      expect(sumTicks[0]).toBe(0);
      cleanup();
    }
    // measureLabel "Avg of weight" -> fits the data: the lowest tick is
    // clearly above zero (data spans 10..40, so the axis need not touch 0)
    {
      const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} measureLabel="Avg of weight" aggregation="avg" />);
      const avgTicks = [...container.querySelectorAll('[data-part="tick-label"]')].map((t) => parseFloat(t.textContent ?? "0"));
      expect(avgTicks[0]).toBeGreaterThan(0);
      // and every data point still fits inside the axis
      expect(Math.min(...avgTicks)).toBeLessThanOrEqual(10);
      expect(Math.max(...avgTicks)).toBeGreaterThanOrEqual(40);
      cleanup();
    }
    // card 19: with `aggregation` present the label is decoration. A min
    // wearing a sum's label still fits its data...
    {
      const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} measureLabel="Total kg" aggregation="min" />);
      const ticks = [...container.querySelectorAll('[data-part="tick-label"]')].map((t) => parseFloat(t.textContent ?? "0"));
      expect(ticks[0]).toBeGreaterThan(0);
      cleanup();
    }
    // ...and a sum wearing a min's label still anchors at 0.
    {
      const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} measureLabel="Minimum kg" aggregation="sum" />);
      const ticks = [...container.querySelectorAll('[data-part="tick-label"]')].map((t) => parseFloat(t.textContent ?? "0"));
      expect(ticks[0]).toBe(0);
      cleanup();
    }
  });

  it("dots are focusable as one roving tab stop; focus shows label and text", () => {
    const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} />);
    const pts = [...container.querySelectorAll<SVGGElement>('[data-part="point-group"]')];
    expect(pts).toHaveLength(4);
    expect(pts.filter((p) => p.getAttribute("tabindex") === "0")).toHaveLength(1);
    fireEvent.keyDown(pts[0]!, { key: "ArrowRight" });
    expect(pts[1]?.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(pts[1]!, { key: "End" });
    const last = pts[pts.length - 1]!;
    expect(last.getAttribute("tabindex")).toBe("0");
    expect(last.getAttribute("aria-label")).toBe("F: 40");
    const tip = document.querySelector('[data-part="tooltip"]');
    expect(tip?.textContent).toBe("F: 40");
    expect(tip?.getAttribute("aria-hidden")).toBe("true");
  });

  it("the hidden table carries every group's label and text (same rules as bars)", () => {
    const { container } = render(<Series {...base} display="line" groups={lineGroups} skipped={0} />);
    const table = container.querySelector('[data-part="table"]');
    expect(table).not.toBeNull();
    expect(table!.querySelectorAll("tbody [data-part=\"group-row\"]")).toHaveLength(lineGroups.length);
    for (const g of lineGroups) {
      expect(table!.textContent).toContain(g.label);
      expect(table!.textContent).toContain(g.text);
    }
    const svg = container.querySelector('svg[data-part="chart-svg"]');
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Sets per day");
  });

  it("loading gives the line a skeleton, not a stub or a crash", () => {
    const { container } = render(<Series {...base} display="line" groups={[]} skipped={0} loading />);
    expect(container.querySelector('[data-part="chart-skeleton"]')).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("the line passes axe (dot names, hidden table, svg label)", async () => {
    const { container } = render(
      <div>
        <Series {...base} display="line" groups={lineGroups} skipped={1} partial={{ read: 4, total: 9 }} />
      </div>,
    );
    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe("chart helpers (shared by 17b and 17c)", () => {
  it("niceRange rounds the bounds outward to a 1/2/5x10^n step", () => {
    const r = niceRange(12, 43, 5);
    expect(r.low).toBeLessThanOrEqual(12);
    expect(r.top).toBeGreaterThanOrEqual(43);
    expect(r.ticks[0]).toBe(r.low);
    expect(r.ticks[r.ticks.length - 1]).toBe(r.top);
    const step = (r.ticks[1] ?? 0) - r.low;
    expect(step).toBeGreaterThan(0);
  });

  it("a flat run gets a padded axis instead of zero height", () => {
    const r = niceRange(5, 5, 4);
    expect(r.top).toBeGreaterThan(r.low);
  });

  it("measureFitsData reads the first word of measureLabel (fallback: no aggregation, card 19)", () => {
    expect(measureFitsData(undefined, "Min of weight")).toBe(true);
    expect(measureFitsData(undefined, "Max of weight")).toBe(true);
    expect(measureFitsData(undefined, "Average of weight")).toBe(true);
    expect(measureFitsData(undefined, "Avg weight")).toBe(true);
    expect(measureFitsData(undefined, "Sum of sets")).toBe(false);
    expect(measureFitsData(undefined, "Count of records")).toBe(false);
  });

  it("measureFitsData trusts aggregation over the label's first word (card 19)", () => {
    // the label is engine-owned copy; the op is protocol
    expect(measureFitsData("min", "Total kg")).toBe(true); // misleading label, real op
    expect(measureFitsData("max", "Total kg")).toBe(true);
    expect(measureFitsData("avg", "Total kg")).toBe(true);
    expect(measureFitsData("sum", "Minimum kg")).toBe(false); // friendly label, sum still anchors at 0
    expect(measureFitsData("count", "Average of luck")).toBe(false);
    expect(measureFitsData("countDistinct", "Min per day")).toBe(false);
  });
});
