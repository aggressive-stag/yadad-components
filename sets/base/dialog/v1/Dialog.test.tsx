/**
 * Dialog behaviour tests (card 13c). jsdom may or may not implement
 * HTMLDialogElement.showModal, so the browser path is exercised by stubbing
 * the prototype method (and asserted to be called), while the attribute
 * fallback is exercised by removing it — the component feature-detects
 * either way. Focus movement and inert are asserted directly because the
 * component owns them; the browser's own top-layer blocking is not testable
 * in jsdom.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseRegistry } from "../../../../registry/base.js";
import { Dialog } from "./index.js";

afterEach(() => {
  cleanup();
});

const dialogEl = (container: HTMLElement): HTMLDialogElement =>
  container.querySelector<HTMLDialogElement>('[data-yadad="dialog"][data-part="root"]')!;

describe("the base dialog", () => {
  it("is a native dialog element with the part hooks", () => {
    const { container } = render(
      <Dialog label="Delete record?" onClose={() => {}}>
        <p>Deleting is permanent.</p>
      </Dialog>,
    );
    const el = dialogEl(container);
    expect(el.tagName).toBe("DIALOG");
    expect(el.querySelector('[data-part="header"]')).not.toBeNull();
    expect(el.querySelector('[data-part="title"]')?.textContent).toBe("Delete record?");
    expect(el.querySelector('[data-part="close"]')).not.toBeNull();
    expect(el.querySelector('[data-part="body"]')?.textContent).toBe("Deleting is permanent.");
  });

  it("names itself by the label via the title element", () => {
    const { container } = render(<Dialog label="Confirm" onClose={() => {}}><span /></Dialog>);
    const el = dialogEl(container);
    const titleId = el.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(el.querySelector(`#${CSS.escape(titleId!)}`)?.textContent).toBe("Confirm");
  });

  it("renders the content the renderer gave it, untouched", () => {
    const { container } = render(
      <Dialog label="L" onClose={() => {}}>
        <input aria-label="field" />
        <button type="button">Confirm</button>
      </Dialog>,
    );
    const body = dialogEl(container).querySelector('[data-part="body"]')!;
    expect(body.querySelector('input[aria-label="field"]')).not.toBeNull();
    expect(body.querySelector("button")?.textContent).toBe("Confirm");
  });

  it("opens modally with showModal where the browser has it", () => {
    const spy = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    const original = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = spy;
    try {
      const { container } = render(<Dialog label="L" onClose={() => {}}><span /></Dialog>);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(dialogEl(container).getAttribute("data-modal")).toBe("true");
      // The kit (RFC 0007) requires the explicit attribute: role=dialog does
      // not imply aria-modal=true for assistive tech, native top-layer
      // blocking notwithstanding.
      expect(dialogEl(container).getAttribute("aria-modal")).toBe("true");
    } finally {
      HTMLDialogElement.prototype.showModal = original;
    }
  });

  it("falls back to the open attribute where showModal is missing", () => {
    const original = HTMLDialogElement.prototype.showModal;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLDialogElement.prototype as any).showModal = undefined;
    try {
      const { container } = render(
        <Dialog label="L" onClose={() => {}}><button type="button">x</button></Dialog>,
      );
      const el = dialogEl(container);
      expect(el.open).toBe(true);
      expect(el.getAttribute("data-modal")).toBe("fallback");
      expect(el.getAttribute("aria-modal")).toBe("true");
      // Focus management still holds in the fallback.
      expect(document.activeElement).toBe(el.querySelector('[data-part="close"]'));
    } finally {
      HTMLDialogElement.prototype.showModal = original;
    }
  });

  it("moves focus into the dialog on open", () => {
    const { container } = render(
      <Dialog label="L" onClose={() => {}}>
        <button type="button">First</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(dialogEl(container).querySelector('[data-part="close"]'));
  });

  it("returns focus to the opener when the renderer closes it", () => {
    function Harness(): ReactNode {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" id="trigger" onClick={() => setOpen(true)}>open</button>
          {open ? <Dialog label="L" onClose={() => setOpen(false)}><button type="button">in</button></Dialog> : null}
        </>
      );
    }
    const { container } = render(<Harness />);
    const trigger = document.getElementById("trigger")!;
    // The opener had focus, then activated the dialog (jsdom does not focus
    // on click, so focus it explicitly first, as a real click would).
    trigger.focus();
    fireEvent.click(trigger);
    const el = dialogEl(container);
    expect(document.activeElement).toBe(el.querySelector('[data-part="close"]'));
    fireEvent.click(el.querySelector('[data-part="close"]')!);
    expect(container.querySelector('[data-yadad="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("calls onClose once on Escape without closing itself (the renderer owns closing)", () => {
    const onClose = vi.fn();
    const { container } = render(<Dialog label="L" onClose={onClose}><span /></Dialog>);
    const el = dialogEl(container);
    fireEvent.keyDown(el, { key: "Escape" });
    fireEvent.keyDown(el, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    // The element stays open until the renderer stops rendering it.
    expect(el.open).toBe(true);
  });

  it("routes the native cancel event (browser Escape) through onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<Dialog label="L" onClose={onClose}><span /></Dialog>);
    const el = dialogEl(container);
    fireEvent(el, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(el.open).toBe(true);
  });

  it("calls onClose on a press outside the content", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog label="L" onClose={onClose}><button type="button">inside</button></Dialog>,
    );
    const el = dialogEl(container);
    // A press landing on the dialog box itself is the backdrop area.
    fireEvent.pointerDown(el);
    expect(onClose).toHaveBeenCalledTimes(1);
    // A press on the content is not.
    fireEvent.pointerDown(el.querySelector('[data-part="body"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab at both ends of the content", () => {
    const { container } = render(
      <Dialog label="L" onClose={() => {}}>
        <button type="button" id="a">a</button>
        <button type="button" id="b">b</button>
      </Dialog>,
    );
    const el = dialogEl(container);
    const close = el.querySelector('[data-part="close"]')!;
    const b = document.getElementById("b")!;
    // Forward wrap: from the last focusable to the first.
    b.focus();
    fireEvent.keyDown(el, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    // Backward wrap: from the first focusable to the last.
    fireEvent.keyDown(el, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(b);
    // A middle Tab is left to the browser.
    document.getElementById("a")!.focus();
    fireEvent.keyDown(el, { key: "Tab" });
    expect(document.activeElement).toBe(document.getElementById("a"));
  });

  it("makes everything outside the dialog inert and restores it on close", () => {
    const holder = document.createElement("div");
    document.body.appendChild(holder);
    const outside = document.createElement("button");
    holder.appendChild(outside);
    const { container, unmount } = render(
      <Dialog label="L" onClose={() => {}}><span /></Dialog>,
      { container: holder },
    );
    const el = dialogEl(container);
    expect(el.hasAttribute("inert")).toBe(false);
    // The branch holding the dialog is not inert (inert is inherited); the
    // rest of the document is.
    expect(holder.hasAttribute("inert")).toBe(false);
    for (const branch of [...document.body.children]) {
      expect(branch.hasAttribute("inert"), `body branch should be inert: ${branch.tagName}`).toBe(branch !== holder);
    }
    const other = document.createElement("div");
    document.body.appendChild(other);
    unmount();
    expect(document.body.hasAttribute("inert")).toBe(false);
    for (const branch of [...document.body.children]) {
      expect(branch.hasAttribute("inert"), `no leftover inert on ${branch.tagName}`).toBe(false);
    }
    holder.remove();
    other.remove();
  });

  it("leaves the page alone when rendered non-modal", () => {
    const spy = vi.fn();
    const original = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = spy;
    try {
      const { container } = render(
        <Dialog label="L" onClose={() => {}} modal={false}><span /></Dialog>,
      );
      const el = dialogEl(container);
      expect(spy).not.toHaveBeenCalled();
      expect(el.open).toBe(true);
      expect(el.getAttribute("data-modal")).toBe("static");
      // A static demo dialog must not claim modality to assistive tech.
      expect(el.getAttribute("aria-modal")).toBeNull();
      expect(document.body.hasAttribute("inert")).toBe(false);
      for (const branch of [...document.body.children]) {
        expect(branch.hasAttribute("inert")).toBe(false);
      }
    } finally {
      HTMLDialogElement.prototype.showModal = original;
    }
  });

  it("is wired in the registry as layout.Dialog", () => {
    expect(baseRegistry.layout.Dialog).toBe(Dialog);
  });
});
