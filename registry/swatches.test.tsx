// @vitest-environment jsdom
import type { BoardColumn, ReferenceField } from "@yadad/core";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Board } from "../sets/base/board/v1/Board.js";
import { ReferenceDisplay } from "../sets/base/reference/v1/Reference.js";

afterEach(cleanup);

const field: ReferenceField = { id: "list", type: "reference", label: "List", entity: "lists" };

describe("reference display colour (RFC 0008 item 8, colorFrom)", () => {
  const show = (props: { color?: string; status?: "found" | "loading" | "missing" | "error" }) =>
    render(<ReferenceDisplay field={field} value="l1" label="Home" status={props.status ?? "found"} {...(props.color ? { color: props.color } : {})} />).container;

  it("paints a dot for a vocabulary colour, aria-hidden, with the label beside it", () => {
    const c = show({ color: "#D13438" });
    const swatch = c.querySelector('[data-part="swatch"]');
    expect(swatch?.getAttribute("data-slot")).toBe("1");
    expect(swatch?.getAttribute("aria-hidden")).toBe("true");
    expect(c.querySelector('[data-part="display"]')?.textContent).toBe("Home");
  });

  it("paints nothing without a colour, for a colour outside the vocabulary, or when the record is not found", () => {
    expect(show({}).querySelector('[data-part="swatch"]')).toBeNull();
    expect(show({ color: "#123456" }).querySelector('[data-part="swatch"]')).toBeNull();
    expect(show({ color: "#d13438", status: "missing" }).querySelector('[data-part="swatch"]')).toBeNull();
  });
});

describe("board column colour (RFC 0008 item 5)", () => {
  const column = (id: string, color?: string): BoardColumn<ReactNode> => ({ id, label: id, count: 0, droppable: true, cards: [], ...(color ? { color } : {}) });
  const heading = (c: BoardColumn<ReactNode>): Element => {
    const { container } = render(<Board label="Tasks" groupChoices={[{ field: "s", label: "S" }]} groupField="s" columns={[c]} loading={false} onGroupBy={() => {}} />);
    return container.querySelector('[data-part="column-heading"]') as Element;
  };

  it("paints a dot in the heading for a vocabulary colour, and the label text stays", () => {
    const h = heading(column("Doing", "#107c10"));
    expect(h.querySelector('[data-part="swatch"]')?.getAttribute("data-slot")).toBe("4");
    expect(h.querySelector('[data-part="column-label"]')?.textContent).toBe("Doing");
  });

  it("paints no dot without a colour or with one outside the vocabulary", () => {
    expect(heading(column("A")).querySelector('[data-part="swatch"]')).toBeNull();
    cleanup();
    expect(heading(column("B", "#123456")).querySelector('[data-part="swatch"]')).toBeNull();
  });
});
