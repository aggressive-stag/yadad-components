import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { TagsDisplay, TagsInput } from "./Tags.js";

afterEach(cleanup);

const field = { id: "tags", type: "tags", label: "Tags" } as const;

function Input({ onChange, value }: { onChange: (v: readonly string[] | undefined) => void; value?: readonly string[] | undefined }): ReactNode {
  return <TagsInput inputId="g-tags" field={field} value={value} onChange={onChange} invalid={false} />;
}

const addInput = (): HTMLInputElement => document.querySelector<HTMLInputElement>('[data-yadad="tags"] [data-part="add-input"]')!;

describe("TagsInput", () => {
  it("renders one chip per value in entry order", () => {
    render(<Input value={["b", "a", "c"]} onChange={() => {}} />);
    const labels = [...document.querySelectorAll<HTMLElement>('[data-yadad="tags"] [data-part="chips"] [data-part="chip-label"]')];
    expect(labels.map((el) => el.textContent)).toEqual(["b", "a", "c"]);
  });

  it("no-crash on an empty array and on no value at all", () => {
    render(<Input value={[]} onChange={() => {}} />);
    expect(document.querySelectorAll('[data-part="chip"]')).toHaveLength(0);
    cleanup();
    render(<Input value={undefined} onChange={() => {}} />);
    expect(document.querySelectorAll('[data-part="chip"]')).toHaveLength(0);
  });

  it("Enter appends the trimmed tag and clears the draft", () => {
    const onChange = vi.fn();
    render(<Input value={["squat"]} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "  bench press  " } });
    fireEvent.keyDown(addInput(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["squat", "bench press"]);
  });

  it("Enter refuses an empty or whitespace draft", () => {
    const onChange = vi.fn();
    render(<Input value={["squat"]} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "   " } });
    fireEvent.keyDown(addInput(), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses a case-insensitive duplicate", () => {
    const onChange = vi.fn();
    render(<Input value={["Squat"]} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "squat" } });
    fireEvent.keyDown(addInput(), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("collapses interior runs of spaces when adding", () => {
    const onChange = vi.fn();
    render(<Input value={undefined} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "overhead   press" } });
    fireEvent.keyDown(addInput(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["overhead press"]);
  });

  it("the add button appends like Enter", () => {
    const onChange = vi.fn();
    render(<Input value={undefined} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "5x5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenCalledWith(["5x5"]);
  });

  it("the per-chip remove button removes just that chip", () => {
    const onChange = vi.fn();
    render(<Input value={["a", "b", "c"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove b" }));
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);
  });

  it("removing the last chip emits undefined (cleared, not an empty list)", () => {
    const onChange = vi.fn();
    render(<Input value={["only"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove only" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("Backspace on an empty draft removes the last chip", () => {
    const onChange = vi.fn();
    render(<Input value={["a", "b"]} onChange={onChange} />);
    fireEvent.keyDown(addInput(), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });

  it("Backspace on an empty draft with no chips does nothing", () => {
    const onChange = vi.fn();
    render(<Input value={undefined} onChange={onChange} />);
    fireEvent.keyDown(addInput(), { key: "Backspace" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Backspace with text in the draft does not remove a chip", () => {
    const onChange = vi.fn();
    render(<Input value={["a"]} onChange={onChange} />);
    fireEvent.change(addInput(), { target: { value: "x" } });
    fireEvent.keyDown(addInput(), { key: "Backspace" });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagsDisplay", () => {
  it("renders the chips in order", () => {
    render(<TagsDisplay field={field} value={["squat", "bench press"]} />);
    const el = document.querySelector<HTMLElement>('[data-yadad="tags"][data-part="display"]')!;
    expect(el.querySelectorAll('[data-part="chip"]')).toHaveLength(2);
    expect(el.textContent).toBe("squatbench press");
  });

  it("shows the em-dash marker for an empty or missing value", () => {
    render(<TagsDisplay field={field} value={[]} />);
    const el = document.querySelector<HTMLElement>('[data-yadad="tags"][data-part="display"]')!;
    expect(el.getAttribute("data-empty")).toBe("true");
    expect(el.textContent).toBe("—");
  });
});
