import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectDisplay, SelectInput } from "./Select.js";
import type { SelectField } from "@yadad/core";

afterEach(cleanup);

const plain: SelectField = { id: "exercise", type: "select", label: "Exercise", options: { source: "static", values: ["Squat", "Bench press"] } };

const coloured: SelectField = {
  id: "list",
  type: "select",
  label: "List",
  options: {
    source: "static",
    values: [
      { value: "#464EA9", label: "Home", color: "#464EA9" },
      { value: "#D13438", label: "Work", color: "#D13438" },
      { value: "#123456", label: "Off-list", color: "#123456" },
      { value: "plain", label: "No colour" },
      { value: "bare" },
    ],
  },
};

const q = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

describe("SelectInput", () => {
  it("renders label ?? value for object options and the string itself otherwise", () => {
    render(<SelectInput inputId="g" field={coloured} value={undefined} onChange={() => {}} invalid={false} />);
    const options = [...document.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toEqual(["Choose…", "Home", "Work", "Off-list", "No colour", "bare"]);
  });

  it("the option VALUE stays the stored value, not the label (RFC 0008 item 5)", () => {
    render(<SelectInput inputId="g" field={coloured} value={"#D13438"} onChange={() => {}} invalid={false} />);
    const control = q<HTMLSelectElement>('[data-yadad="select"][data-part="input"]');
    expect(control.value).toBe("#D13438");
    const selected = control.selectedOptions[0]!;
    expect(selected.textContent).toBe("Work");
  });

  it("emits the stored value on change, undefined on the empty entry", () => {
    const onChange = vi.fn();
    render(<SelectInput inputId="g" field={coloured} value={undefined} onChange={onChange} invalid={false} />);
    fireEvent.change(q<HTMLSelectElement>('[data-yadad="select"]'), { target: { value: "#464EA9" } });
    expect(onChange).toHaveBeenCalledWith("#464EA9");
    fireEvent.change(q<HTMLSelectElement>('[data-yadad="select"]'), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("keeps string options rendering as before (the pre-0008 shape)", () => {
    render(<SelectInput inputId="g" field={plain} value="Squat" onChange={() => {}} invalid={false} />);
    const options = [...document.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toEqual(["Choose…", "Squat", "Bench press"]);
  });
});

describe("SelectDisplay", () => {
  it("shows the label, not the value, for an object option", () => {
    render(<SelectDisplay field={coloured} value="#D13438" />);
    const el = q<HTMLElement>('[data-yadad="select"][data-part="display"]');
    expect(el.textContent).toBe("Work");
  });

  it("paints the vocabulary dot with the option's documented slot, aria-hidden", () => {
    render(<SelectDisplay field={coloured} value="#D13438" />);
    const swatch = q<HTMLElement>('[data-part="swatch"]');
    expect(swatch.getAttribute("data-slot")).toBe("1"); // #d13438 = slot 1 (red)
    expect(swatch.getAttribute("aria-hidden")).toBe("true");
  });

  it("matching is case-insensitive on the author's hex", () => {
    render(<SelectDisplay field={coloured} value="#464EA9" />);
    expect(q<HTMLElement>('[data-part="swatch"]').getAttribute("data-slot")).toBe("0");
  });

  it("a colour outside the vocabulary paints no dot (Decision)", () => {
    render(<SelectDisplay field={coloured} value="#123456" />);
    expect(document.querySelector('[data-part="swatch"]')).toBeNull();
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("Off-list");
  });

  it("an option without a colour paints no dot; its label still shows", () => {
    render(<SelectDisplay field={coloured} value="plain" />);
    expect(document.querySelector('[data-part="swatch"]')).toBeNull();
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("No colour");
  });

  it("a bare-string option entry renders the string and no dot", () => {
    render(<SelectDisplay field={coloured} value="bare" />);
    expect(document.querySelector('[data-part="swatch"]')).toBeNull();
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("bare");
  });

  it("a value no option carries is kept as-is (defensive: stale/external value)", () => {
    render(<SelectDisplay field={coloured} value="#ABCDEF" />);
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("#ABCDEF");
  });

  it("empty stays empty", () => {
    render(<SelectDisplay field={coloured} value={undefined} />);
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("");
  });

  it("string fields keep the old rendering (pre-0008 shape)", () => {
    render(<SelectDisplay field={plain} value="Squat" />);
    expect(q<HTMLElement>('[data-part="display"]').textContent).toBe("Squat");
    expect(document.querySelector('[data-part="swatch"]')).toBeNull();
  });
});
