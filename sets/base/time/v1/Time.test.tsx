import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { TimeDisplay, TimeInput } from "./Time.js";

afterEach(cleanup);

const field = { id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 } as const;

function Input({ onChange, value }: { onChange: (v: string | undefined) => void; value?: string }): ReactNode {
  return <TimeInput inputId="g-start" field={field} value={value} onChange={onChange} invalid={false} />;
}

describe("TimeInput", () => {
  it("renders a native time control named after the field", () => {
    render(<Input value="09:30" onChange={() => {}} />);
    const control = document.querySelector<HTMLInputElement>('[data-yadad="time"][data-part="input"]')!;
    expect(control.type).toBe("time");
    expect(control.getAttribute("name")).toBe("start");
  });

  it("carries the field's bounds, scaling step from minutes to seconds", () => {
    render(<Input value="09:30" onChange={() => {}} />);
    const control = document.querySelector<HTMLInputElement>('[data-yadad="time"][data-part="input"]')!;
    expect(control.getAttribute("min")).toBe("09:00");
    expect(control.getAttribute("max")).toBe("17:00");
    expect(control.getAttribute("step")).toBe("900"); // 15 minutes × 60
  });

  it("defaults step to any minute when the field does not set one", () => {
    render(<TimeInput inputId="g-x" field={{ id: "x", type: "time", label: "X" }} value="08:00" onChange={() => {}} invalid={false} />);
    const control = document.querySelector<HTMLInputElement>('[data-yadad="time"][data-part="input"]')!;
    expect(control.getAttribute("step")).toBe("60");
  });

  it("round-trips a typed value", () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);
    fireEvent.change(document.querySelector<HTMLInputElement>('[data-yadad="time"][data-part="input"]')!, { target: { value: "14:15" } });
    expect(onChange).toHaveBeenCalledWith("14:15");
  });

  it("emits undefined when cleared", () => {
    const onChange = vi.fn();
    render(<Input value="09:30" onChange={onChange} />);
    fireEvent.change(document.querySelector<HTMLInputElement>('[data-yadad="time"][data-part="input"]')!, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe("TimeDisplay", () => {
  it("shows HH:MM as entered", () => {
    render(<TimeDisplay field={field} value="09:30" />);
    const el = document.querySelector<HTMLElement>('[data-yadad="time"][data-part="display"]')!;
    expect(el.tagName).toBe("TIME");
    expect(el.textContent).toBe("09:30");
    expect(el.getAttribute("dateTime")).toBe("09:30");
  });

  it("shows the em-dash marker when there is no value", () => {
    render(<TimeDisplay field={field} value={undefined} />);
    const el = document.querySelector<HTMLElement>('[data-yadad="time"][data-part="display"]')!;
    expect(el.getAttribute("data-empty")).toBe("true");
    expect(el.textContent).toBe("—");
  });
});
