// @vitest-environment jsdom
import type { TableColumnHeader } from "@yadad/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Table } from "../sets/base/table/v1/Table.js";

afterEach(cleanup);

const columns: TableColumnHeader[] = [
  { id: "d", label: "Date", headerId: "h-d", sortable: true, sort: "asc" as const },
  { id: "n", label: "Name", headerId: "h-n", sortable: true },
];
const rows = [{ id: "r1", cells: ["2026-01-01", "Ann"] }];

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
});
