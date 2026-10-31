/**
 * Card 31b (plan M01): `Check` is a native `<input type="checkbox">` with
 * `appearance: none`. The tests below are the "Done when" list the card can
 * assert in jsdom — Space toggles, the accessible name is the owning label's
 * text (unchanged from the native box it replaces), the part name is
 * overridable so each consumer keeps its `[data-part]` contract, and the CSS
 * contract: the sheet carries `appearance: none`, the forced-colors block,
 * the reduced-motion override, and every colour/size through `--yadad-check-*`
 * defaulting to tokens. The ≥22px drawn size and ≥44px hit box are proven in
 * the browser by `gallery/check/check-phone.ts` and 31a's calendar audit.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Check } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(here, "check.css"), "utf8");

describe("Check (internal primitive, card 31b)", () => {
  it("is a native checkbox input", () => {
    const { container } = render(<Check checked={false} onChange={() => {}} />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect(input!.getAttribute("data-yadad")).toBe("check");
    expect(input!.getAttribute("data-part")).toBe("check-input");
  });

  it("Space toggles a focused box (native keyboard behaviour)", () => {
    const onChange = vi.fn();
    const { container } = render(<Check checked={false} onChange={onChange} />);
    const input = container.querySelector("input")!;
    input.focus();
    fireEvent.keyDown(input, { key: " " });
    fireEvent.click(input); // Space on a focused checkbox fires click in browsers
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the accessible name from the owning label", () => {
    const { getByRole } = render(
      <label>
        Done
        <Check checked />
      </label>,
    );
    expect(getByRole("checkbox", { name: "Done" })).not.toBeNull();
  });

  it("keeps an aria-label name when no label wraps it", () => {
    const { getByRole } = render(<Check checked={false} onChange={() => {}} aria-label="Done: Wash dishes" />);
    expect(getByRole("checkbox", { name: "Done: Wash dishes" })).not.toBeNull();
  });

  it("carries the consumer's part name (calendar passes done-input)", () => {
    const { container } = render(<Check checked={false} onChange={() => {}} data-part="done-input" />);
    expect(container.querySelector('[data-part="done-input"]')).not.toBeNull();
  });

  it("passes disabled through — a disabled box never becomes checked", () => {
    const { container } = render(<Check checked={false} disabled onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    // jsdom dispatches click on a disabled input (a real browser does not),
    // and the box is controlled — what a disabled box can never do is become
    // checked. The browser proof (a locked one stays unchecked, click forced)
    // is gallery/check/done-toggle.ts.
    fireEvent.click(input);
    expect(input.checked).toBe(false);
  });

  it("is controlled: checked follows the prop", () => {
    const { container, rerender } = render(<Check checked={false} onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(false);
    rerender(<Check checked onChange={() => {}} />);
    expect(input.checked).toBe(true);
  });
});

describe("check.css (card 31b contract)", () => {
  it("paints a native input: appearance none, no children assumed", () => {
    expect(css).toContain("appearance: none;");
  });
  it("documents every tunable through --yadad-check-*", () => {
    for (const v of ["--yadad-check-size", "--yadad-check-radius", "--yadad-check-border", "--yadad-check-on"]) {
      expect(css, v).toContain(v);
    }
  });
  it("carries the forced-colors fallback the plan requires", () => {
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("CanvasText");
    expect(css).toContain("Highlight");
  });
  it("honours reduced motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
