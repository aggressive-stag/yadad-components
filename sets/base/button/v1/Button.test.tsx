import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./Button.js";

afterEach(cleanup);

const base = { label: "Save", type: "button", variant: "primary", disabled: false } as const;

describe("Button tone (the prop the engine's action confirm sends, RFC 0007)", () => {
  it("renders data-tone=danger when tone=danger", () => {
    const { container } = render(<Button {...base} tone="danger" />);
    expect(container.querySelector("button")?.getAttribute("data-tone")).toBe("danger");
  });

  it("renders no data-tone attribute when tone is absent", () => {
    const { container } = render(<Button {...base} />);
    expect(container.querySelector("button")?.hasAttribute("data-tone")).toBe(false);
  });

  it("renders data-tone=neutral when the engine sends it explicitly", () => {
    const { container } = render(<Button {...base} tone="neutral" />);
    expect(container.querySelector("button")?.getAttribute("data-tone")).toBe("neutral");
  });
});
