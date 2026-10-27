import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { DatetimeDisplay, DatetimeInput } from "./Datetime.js";

afterEach(cleanup);

const field = { id: "moment", type: "datetime", label: "Moment" } as const;

function setInputValue(control: HTMLInputElement, value: string): void {
  // A native datetime-local control's value setter does not accept the stored
  // "YYYY-MM-DDTHH:MM:SS.sssZ" form, so React's onChange never fires for a test
  // that types the stored form. Set the control's value with the native setter
  // (the same trick the kit uses for native controls) and dispatch input.
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(control, value);
  fireEvent.input(control);
}

function Input({
  onChange,
  value,
}: {
  onChange: (v: string | undefined) => void;
  value?: string;
}): ReactNode {
  return (
    <DatetimeInput
      inputId="g-moment"
      field={field}
      value={value}
      onChange={onChange}
      invalid={false}
    />
  );
}

describe("DatetimeInput limits", () => {
  it("sets the native min and max from the local limits", () => {
    render(<DatetimeInput inputId="g" field={field} value={undefined} onChange={() => {}} invalid={false} minLocal="2026-10-01T08:00" maxLocal="2026-10-31T18:30" />);
    const el = document.querySelector("input")!;
    expect(el.getAttribute("min")).toBe("2026-10-01T08:00");
    expect(el.getAttribute("max")).toBe("2026-10-31T18:30");
    cleanup();
    render(<DatetimeInput inputId="g" field={field} value={undefined} onChange={() => {}} invalid={false} />);
    expect(document.querySelector("input")!.hasAttribute("min")).toBe(false);
  });
});

describe("DatetimeInput", () => {
  it("renders a native datetime-local control named after the field", () => {
    render(<Input value="2026-10-04T12:30" onChange={() => {}} />);
    // jsdom gives an unknown input type no ARIA role, so query by data attributes.
    const control = document.querySelector<HTMLInputElement>('[data-yadad="datetime"][data-part="input"]')!;
    expect(control.type).toBe("datetime-local");
    expect(control.getAttribute("data-yadad")).toBe("datetime");
    expect(control.getAttribute("data-part")).toBe("input");
    expect(control.name).toBe("moment");
    expect(control.value).toBe("2026-10-04T12:30");
  });

  it("returns the local value it is given and shows, and undefined when emptied", () => {
    const onChange = vi.fn();
    render(<Input value="2026-10-04T12:30" onChange={onChange} />);
    const control = document.querySelector<HTMLInputElement>('[data-yadad="datetime"][data-part="input"]')!;
    setInputValue(control, "2026-10-05T08:00");
    expect(onChange).toHaveBeenLastCalledWith("2026-10-05T08:00");
    setInputValue(control, "");
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("renders empty without a value", () => {
    render(<Input onChange={() => {}} />);
    const control = document.querySelector<HTMLInputElement>('[data-yadad="datetime"][data-part="input"]')!;
    expect(control.value).toBe("");
  });
});

describe("DatetimeDisplay", () => {
  it("renders the text the renderer formatted, on a <time> that carries the stored value", () => {
    render(<DatetimeDisplay field={field} value="2026-10-04T12:30:00.000Z" text="Oct 4, 2026, 7:30 AM" />);
    const time = screen.getByText("Oct 4, 2026, 7:30 AM") as HTMLElement;
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("data-yadad")).toBe("datetime");
    expect(time.getAttribute("data-part")).toBe("display");
    expect(time.getAttribute("dateTime")).toBe("2026-10-04T12:30:00.000Z");
  });

  it("falls back to the stored value without text", () => {
    render(<DatetimeDisplay field={field} value="2026-10-04T12:30:00.000Z" />);
    const time = screen.getByText("2026-10-04T12:30:00.000Z") as HTMLElement;
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("dateTime")).toBe("2026-10-04T12:30:00.000Z");
  });

  it("renders nothing without a value", () => {
    const { container } = render(<DatetimeDisplay field={field} value={undefined} />);
    expect(container.querySelector("time")).toBeNull();
  });
});
