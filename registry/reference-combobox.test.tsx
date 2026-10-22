// @vitest-environment jsdom
// Card 16b: the reference picker is a type-to-filter combobox from 8 loaded
// options on, and the native select below that.
import axe from "axe-core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { manyReferenceOptions, referenceOptions } from "../gallery/src/fixtures.js";
import { ReferenceInput } from "../sets/base/reference/v1/Reference.js";

afterEach(cleanup);

const field = { id: "lift", type: "reference", label: "Lift", entity: "exercise" } as const;

function setup(over: { value?: string; required?: boolean; more?: boolean; valueLabel?: string; options?: typeof manyReferenceOptions } = {}) {
  const onChange = vi.fn();
  const view = render(
    <ReferenceInput
      inputId="i"
      field={over.required ? { ...field, required: true } : field}
      value={over.value}
      onChange={onChange}
      invalid={false}
      options={{ status: "ready", options: over.options ?? manyReferenceOptions, more: over.more ?? false }}
      {...(over.valueLabel === undefined ? {} : { valueLabel: over.valueLabel })}
    />,
  );
  const input = view.container.querySelector('input[role="combobox"]') as HTMLInputElement;
  const labels = (): string[] => [...view.container.querySelectorAll('[role="option"]')].map((o) => o.textContent ?? "");
  return { ...view, input, onChange, labels };
}

describe("reference combobox (card 16b)", () => {
  it("is a closed ARIA combobox that opens on tap and lists every option", () => {
    const { input, labels } = setup();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-controls")).toBe(document.querySelector('[role="listbox"]')?.id);
    expect(labels()).toHaveLength(manyReferenceOptions.length);
  });

  it("typing filters by label, ignoring case and accents", () => {
    const { input, labels } = setup();
    fireEvent.change(input, { target: { value: "BENCH" } });
    expect(labels()).toEqual(["Bench press", "Incline bench press", "Close-grip bench press", "Dumbbell bench press"]);
    fireEvent.change(input, { target: { value: "creme brulee" } });
    expect(labels()).toEqual(["Crème brûlée carry"]);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(labels()).toEqual(["No matches"]);
  });

  it("picks with the keyboard alone: ArrowDown, ArrowDown, Enter", () => {
    const { input, onChange } = setup();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(document.querySelectorAll('[role="option"]')[1]?.id);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("e2");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("picks a filtered option with Enter and with a click", () => {
    const a = setup();
    fireEvent.change(a.input, { target: { value: "dead" } });
    fireEvent.keyDown(a.input, { key: "Enter" });
    expect(a.onChange).toHaveBeenCalledWith("e3");
    cleanup();
    const b = setup();
    fireEvent.change(b.input, { target: { value: "plank" } });
    fireEvent.click(b.container.querySelector('[role="option"]') as HTMLElement);
    expect(b.onChange).toHaveBeenCalledWith("m31");
  });

  it("Escape closes and restores the shown label without changing the value", () => {
    const { input, onChange } = setup({ value: "e2" });
    expect(input.value).toBe("Bench press");
    fireEvent.change(input, { target: { value: "xyz" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.value).toBe("Bench press");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaving with the text cleared empties an optional field", () => {
    const { input, onChange } = setup({ value: "e2" });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("leaving with the text cleared restores a required field", () => {
    const { input, onChange } = setup({ value: "e2", required: true });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("Bench press");
  });

  it("leaving with half-typed text restores the label (Tab never changes the value)", () => {
    const { input, onChange } = setup({ value: "e2" });
    fireEvent.change(input, { target: { value: "dead" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("Bench press");
  });

  it("labels a current value that is not among the options", () => {
    const { input } = setup({ value: "e99", valueLabel: "Zercher squat", more: true });
    expect(input.value).toBe("Zercher squat");
    const raw = setup({ value: "e98" });
    expect(raw.input.value).toBe("e98");
  });

  it("says typing filters only the loaded records when the list was cut short", () => {
    const { container } = setup({ more: true });
    expect(container.querySelector('[data-part="status"]')?.textContent).toBe("Showing the first 38 records only. Typing filters only these.");
  });

  it("keeps the native select under 8 options", () => {
    const { container } = render(
      <ReferenceInput inputId="i" field={field} value={undefined} onChange={() => {}} invalid={false} options={{ status: "ready", options: referenceOptions, more: false }} />,
    );
    expect(container.querySelector("select")).not.toBeNull();
    expect(container.querySelector('[role="combobox"]')).toBeNull();
  });

  it("switches to the combobox at exactly 8 options", () => {
    const eight = manyReferenceOptions.slice(0, 8);
    expect(setup({ options: eight }).input).not.toBeNull();
    cleanup();
    const seven = render(<ReferenceInput inputId="i" field={field} value={undefined} onChange={() => {}} invalid={false} options={{ status: "ready", options: manyReferenceOptions.slice(0, 7), more: false }} />);
    expect(seven.container.querySelector("select")).not.toBeNull();
  });

  it("passes axe when open", async () => {
    const { container, input } = setup({ value: "e2" });
    const label = document.createElement("label");
    label.htmlFor = "i";
    label.textContent = "Lift";
    container.prepend(label);
    fireEvent.click(input);
    const results = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});
