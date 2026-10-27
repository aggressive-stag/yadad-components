import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DiffSegment } from "@yadad/core";
import { TextDisplay, TextInput } from "./Text.js";

afterEach(cleanup);

const field = { id: "name", type: "text", label: "Name" } as const;

describe("TextDisplay without diff", () => {
  it("renders the plain value, no marks", () => {
    const { container } = render(<TextDisplay field={field} value="Ada" />);
    const display = container.querySelector('[data-part="display"]');
    expect(display?.textContent).toBe("Ada");
    expect(container.querySelector("ins")).toBeNull();
    expect(container.querySelector("del")).toBeNull();
    expect(display?.getAttribute("data-diff")).toBeNull();
  });

  it("renders an empty value as empty text", () => {
    const { container } = render(<TextDisplay field={field} value={undefined} />);
    expect(container.querySelector('[data-part="display"]')?.textContent).toBe("");
  });
});

describe("TextDisplay with diff", () => {
  const diff: readonly DiffSegment[] = [
    { kind: "removed", text: "Alice " },
    { kind: "same", text: "Ada " },
    { kind: "added", text: "Lovelace" },
  ];

  it("draws removed runs in <del> and added runs in <ins>, same runs plain", () => {
    const { container } = render(<TextDisplay field={field} value="Ada Lovelace" diff={diff} />);
    const removed = container.querySelectorAll("del");
    const added = container.querySelectorAll("ins");
    expect(removed).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(removed[0]?.getAttribute("data-part")).toBe("diff-removed");
    expect(added[0]?.getAttribute("data-part")).toBe("diff-added");
    expect(removed[0]?.textContent).toBe("removed: Alice ");
    expect(added[0]?.textContent).toBe("added: Lovelace");
    // The same run is text, not a mark.
    expect(container.querySelector('[data-part="diff-same"]')?.textContent).toBe("Ada ");
  });

  it("carries the unsplit before and after text, whitespace included", () => {
    const { container } = render(<TextDisplay field={field} value="Ada Lovelace" diff={diff} />);
    const root = container.querySelector('[data-part="display"]');
    expect(root?.getAttribute("data-raw-before")).toBe("Alice Ada ");
    expect(root?.getAttribute("data-raw-after")).toBe("Ada Lovelace");
  });

  it("prefixes each run with visually hidden kind text (meaning never rests on colour alone)", () => {
    const { container } = render(<TextDisplay field={field} value="Ada Lovelace" diff={diff} />);
    const labels = [...container.querySelectorAll<HTMLElement>('[data-part="diff-label"]')];
    expect(labels.map((l) => l.textContent)).toEqual(["removed: ", "added: "]);
    // The hidden text is in the accessibility tree: assert the accessible name
    // of each mark carries the kind, which is what a screen reader reads.
    const del = container.querySelector("del");
    const ins = container.querySelector("ins");
    expect(del?.textContent?.startsWith("removed: ")).toBe(true);
    expect(ins?.textContent?.startsWith("added: ")).toBe(true);
    // and they are hidden by CSS geometry only (text.css), never display:none,
    // which would remove them from the a11y tree too
    expect(labels.every((l) => l.style.display !== "none")).toBe(true);
  });

  it("marks an all-same diff with no ins/del at all", () => {
    const { container } = render(<TextDisplay field={field} value="Ada" diff={[{ kind: "same", text: "Ada" }]} />);
    expect(container.querySelector("ins")).toBeNull();
    expect(container.querySelector("del")).toBeNull();
    expect(container.querySelector('[data-part="display"]')?.textContent).toBe("Ada");
  });

  it("renders empty-text segments without crashing", () => {
    const { container } = render(<TextDisplay field={field} value={undefined} diff={[{ kind: "removed", text: "" }, { kind: "added", text: "" }]} />);
    expect(container.querySelectorAll("del")).toHaveLength(1);
    expect(container.querySelectorAll("ins")).toHaveLength(1);
    expect(container.querySelector('[data-part="display"]')?.textContent).toBe("removed: added: ");
  });

  it("tags the display so CSS (underline + strike, never colour alone) can key off it", () => {
    const { container } = render(<TextDisplay field={field} value="Ada Lovelace" diff={diff} />);
    expect(container.querySelector('[data-part="display"]')?.getAttribute("data-diff")).toBe("words");
  });
});

describe("TextInput maxLength", () => {
  const props = { inputId: "name", value: undefined, onChange: () => {}, invalid: false } as const;

  it("sets the native maxLength attribute from the field", () => {
    const { container } = render(<TextInput {...props} field={{ ...field, maxLength: 12 }} />);
    expect(container.querySelector("input")?.getAttribute("maxlength")).toBe("12");
  });

  it("leaves the attribute off when the field declares no limit", () => {
    const { container } = render(<TextInput {...props} field={field} />);
    expect(container.querySelector("input")?.hasAttribute("maxlength")).toBe(false);
  });

  it("renders a quick filter's placeholder, and none when absent", () => {
    const { container, rerender } = render(<TextInput {...props} field={field} placeholder="Contains..." />);
    expect(container.querySelector("input")?.getAttribute("placeholder")).toBe("Contains...");
    rerender(<TextInput {...props} field={field} />);
    expect(container.querySelector("input")?.hasAttribute("placeholder")).toBe(false);
  });

});

describe("TextInput multiline", () => {
  const multi = { ...field, multiline: true, required: true, maxLength: 4000 } as const;
  const props = { inputId: "name", value: undefined, onChange: () => {}, invalid: false } as const;

  it("renders one textarea, no input, with the id, name, limit and part names", () => {
    const { container } = render(<TextInput {...props} field={multi} />);
    expect(container.querySelectorAll("input")).toHaveLength(0);
    const area = container.querySelector("textarea");
    expect(area?.id).toBe("name");
    expect(area?.getAttribute("name")).toBe("name");
    expect(area?.getAttribute("maxlength")).toBe("4000");
    expect(area?.getAttribute("data-yadad")).toBe("text");
    expect(area?.getAttribute("data-part")).toBe("input");
    expect(area?.getAttribute("aria-required")).toBe("true");
    expect(Number(area?.getAttribute("rows"))).toBeGreaterThanOrEqual(3);
  });

  it("carries aria-invalid, aria-describedby and aria-labelledby", () => {
    const { container } = render(<TextInput {...props} field={multi} invalid describedBy="err" labelledBy="lbl" />);
    const area = container.querySelector("textarea");
    expect(area?.getAttribute("aria-invalid")).toBe("true");
    expect(area?.getAttribute("aria-describedby")).toBe("err");
    expect(area?.getAttribute("aria-labelledby")).toBe("lbl");
  });

  it("shows the value, emits the string, and undefined when emptied", () => {
    const seen: (string | undefined)[] = [];
    const { container } = render(<TextInput {...props} value={"a\nb"} field={multi} onChange={(v) => seen.push(v)} />);
    const area = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(area.value).toBe("a\nb");
    fireEvent.change(area, { target: { value: "a\nbc" } });
    fireEvent.change(area, { target: { value: "" } });
    expect(seen).toEqual(["a\nbc", undefined]);
  });

  it("a field that is not multiline stays a single-line input", () => {
    const { container } = render(<TextInput {...props} field={{ ...field, multiline: false }} />);
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("input")).not.toBeNull();
  });
});

describe("TextDisplay multiline", () => {
  it("marks a multiline display so CSS keeps line breaks, and keeps the raw text (no markup)", () => {
    const { container } = render(<TextDisplay field={{ ...field, multiline: true }} value={"one\n<b>two</b>"} />);
    const d = container.querySelector('[data-part="display"]');
    expect(d?.getAttribute("data-multiline")).toBe("true");
    expect(d?.textContent).toBe("one\n<b>two</b>");
    expect(d?.querySelector("b")).toBeNull();
  });

  it("does not mark a single-line display", () => {
    const { container } = render(<TextDisplay field={field} value="x" />);
    expect(container.querySelector('[data-part="display"]')?.hasAttribute("data-multiline")).toBe(false);
  });
});
