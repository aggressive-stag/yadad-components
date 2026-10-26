// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Count } from "../sets/base/count/v1/Count.js";
import { Series } from "../sets/base/series/v1/Series.js";

afterEach(cleanup);

describe("dashboard widget titles are headings (RFC 0008 item 12)", () => {
  it("the count label is an h2", () => {
    const { container } = render(<Count label="Open tasks" value={4} />);
    const h = container.querySelector('[data-part="label"]');
    expect(h?.tagName).toBe("H2");
    expect(h?.textContent).toBe("Open tasks");
  });

  const series = (over: Record<string, unknown> = {}) =>
    render(<Series label="Volume by week" display="table" groups={[{ key: "2026-W40", label: "W40", value: 3, text: "3" }]} skipped={0} loading={false} measureLabel="Count" aggregation="count" {...over} />).container;

  it("the series label is an h2, also on the error state", () => {
    expect(series().querySelector('[data-part="label"]')?.tagName).toBe("H2");
    cleanup();
    expect(series({ error: "Could not read" }).querySelector('[data-part="label"]')?.tagName).toBe("H2");
  });
});
