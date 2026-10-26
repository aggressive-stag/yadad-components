import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chip, ChipRow } from "./Composer.js";

afterEach(cleanup);

// The chip and the chip row must match, attribute for attribute, what the
// renderer draws for saved filters (table-renderer.tsx, RFC 0009 item 5) —
// that markup is what composer.css styles in the field.

describe("Chip (renderer-parity saved-filter toggle)", () => {
  it("is a secondary button carrying the pressed state both ways", () => {
    const { container } = render(<Chip label="Active sessions" pressed onPress={() => {}} />);
    const button = container.querySelector("button")!;
    expect(button.getAttribute("data-yadad")).toBe("button");
    expect(button.getAttribute("data-variant")).toBe("secondary");
    expect(button.getAttribute("data-pressed")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.textContent).toBe("Active sessions");
  });

  it("an unpressed chip has no data-pressed and announces false", () => {
    const { container } = render(<Chip label="All time" pressed={false} onPress={() => {}} />);
    const button = container.querySelector("button")!;
    expect(button.hasAttribute("data-pressed")).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("pressing fires once; a disabled chip cannot fire", () => {
    const onPress = vi.fn();
    const { container } = render(<Chip label="Mine" pressed={false} onPress={onPress} />);
    container.querySelector("button")!.click();
    expect(onPress).toHaveBeenCalledTimes(1);

    const onDisabled = vi.fn();
    const second = render(<Chip label="Mine" pressed={false} disabled onPress={onDisabled} />);
    second.container.querySelector("button")!.click();
    expect(onDisabled).not.toHaveBeenCalled();
  });
});

describe("ChipRow (the saved-filters nav)", () => {
  it("is a labelled nav carrying the renderer's data-yadad-saved-filters hook", () => {
    const { container } = render(
      <ChipRow label="Saved filters">
        <Chip label="Active" pressed onPress={() => {}} />
        <Chip label="Archived" pressed={false} onPress={() => {}} />
      </ChipRow>,
    );
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("aria-label")).toBe("Saved filters");
    expect(nav.hasAttribute("data-yadad-saved-filters")).toBe(true);
    expect(nav.querySelectorAll("button")).toHaveLength(2);
  });
});
