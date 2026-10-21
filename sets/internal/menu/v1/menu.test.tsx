// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu } from "./Menu.js";

afterEach(cleanup);

/** The smallest honest host: trigger + panel + Cancel, markup owned by the view. */
function Harness({
  onOpen,
  panelLabel = "Panel",
  disabledTrigger = false,
}: {
  onOpen?: () => void;
  panelLabel?: string;
  disabledTrigger?: boolean;
} = {}): ReactNode {
  return (
    <Menu {...(onOpen ? { onOpen } : {})}>
      {({ open, openMenu, close, triggerRef, panelRef, wrapperProps }) => (
        <span data-part="wrap" {...wrapperProps}>
          <button ref={triggerRef} type="button" data-part="t" aria-expanded={open} disabled={disabledTrigger} onClick={openMenu}>
            Trigger
          </button>
          {open ? (
            <span ref={panelRef} tabIndex={-1} data-part="p" role="group" aria-label={panelLabel}>
              <button type="button" data-part="a1">
                One
              </button>
              <button type="button" data-part="cancel" onClick={close}>
                Cancel
              </button>
            </span>
          ) : null}
        </span>
      )}
    </Menu>
  );
}

describe("Menu primitive (card 15d)", () => {
  it("opens on trigger click, exposes aria-expanded, focuses the panel", () => {
    const { container } = render(<Harness />);
    const trigger = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    expect(container.querySelector('[data-part="p"]')).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    fireEvent.click(trigger);
    const panel = container.querySelector('[data-part="p"]') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(panel);
  });

  it("Escape in the panel closes and returns focus to the trigger", () => {
    const { container } = render(<Harness />);
    const trigger = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    fireEvent.keyDown(container.querySelector('[data-part="p"]') as HTMLElement, { key: "Escape", bubbles: true });
    expect(container.querySelector('[data-part="p"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape on an action (bubbling through the panel) also closes", () => {
    const { container } = render(<Harness />);
    fireEvent.click(container.querySelector('[data-part="t"]') as HTMLButtonElement);
    fireEvent.keyDown(container.querySelector('[data-part="a1"]') as HTMLElement, { key: "Escape", bubbles: true });
    expect(container.querySelector('[data-part="p"]')).toBeNull();
  });

  it("Cancel closes and returns focus to the trigger", () => {
    const { container } = render(<Harness />);
    const trigger = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(container.querySelector('[data-part="cancel"]') as HTMLButtonElement);
    expect(container.querySelector('[data-part="p"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to a trigger that unmounted while open and remounted on close (MoveControl's trick)", () => {
    // The host unmounts the trigger while open — the board/calendar pattern.
    function Unmounty(): ReactNode {
      return (
        <Menu>
          {({ open, openMenu, close, triggerRef, panelRef }) => (
            <>
              {!open ? (
                <button ref={triggerRef} type="button" data-part="t" onClick={openMenu}>
                  Trigger
                </button>
              ) : null}
              {open ? (
                <span ref={panelRef} tabIndex={-1} data-part="p">
                  <button type="button" data-part="cancel" onClick={close}>
                    Cancel
                  </button>
                </span>
              ) : null}
            </>
          )}
        </Menu>
      );
    }
    const { container } = render(<Unmounty />);
    fireEvent.click(container.querySelector('[data-part="t"]') as HTMLButtonElement);
    expect(container.querySelector('[data-part="t"]')).toBeNull(); // gone while open
    fireEvent.click(container.querySelector('[data-part="cancel"]') as HTMLButtonElement);
    const back = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    expect(back).not.toBeNull(); // remounted
    expect(document.activeElement).toBe(back); // and refocused through the ref
  });

  it("a disabled trigger cannot open; onOpen runs exactly once per open", () => {
    const onOpen = vi.fn();
    const { container } = render(<Harness onOpen={onOpen} disabledTrigger />);
    const trigger = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(container.querySelector('[data-part="p"]')).toBeNull();
    expect(onOpen).not.toHaveBeenCalled();

    const { container: c2 } = render(<Harness onOpen={onOpen} />);
    const t2 = c2.querySelector('[data-part="t"]') as HTMLButtonElement;
    fireEvent.click(t2);
    fireEvent.click(c2.querySelector('[data-part="cancel"]') as HTMLButtonElement);
    fireEvent.click(t2);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("focusPanelOnOpen=false leaves focus where it is (form panels autofocus instead)", () => {
    function Formish(): ReactNode {
      return (
        <Menu focusPanelOnOpen={false}>
          {({ open, openMenu, panelRef }) => (
            <>
              <button type="button" data-part="t" onClick={openMenu}>
                Trigger
              </button>
              {open ? (
                <span ref={panelRef} tabIndex={-1} data-part="p">
                  <input data-part="field" autoFocus />
                </span>
              ) : null}
            </>
          )}
        </Menu>
      );
    }
    const { container } = render(<Formish />);
    const trigger = container.querySelector('[data-part="t"]') as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(container.querySelector('[data-part="field"]'));
  });
});
