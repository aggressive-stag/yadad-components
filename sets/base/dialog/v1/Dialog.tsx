import type { DialogProps } from "@yadad/core";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Extra to DialogProps: modal={false} renders the dialog in-flow (open, no
 * top layer, no focus capture, no inert) for demos and print. A host renders
 * a Dialog only while it is open, so the default is modal. */
export type DialogComponentProps = DialogProps<ReactNode> & { modal?: boolean };

/**
 * A modal dialog (RFC 0007; RFC 0003's dialog mode reuses it). The renderer
 * builds the content — message, input fields, ErrorSummary, Cancel and Confirm
 * Buttons; this component only provides the modal behaviour: a native
 * `<dialog>` shown with `showModal()` where the browser has it (top layer,
 * Escape, backdrop), the `[open]`-attribute fallback where it does not, an
 * explicit focus trap, focus returned to the opener on close, and the
 * background made inert either way. The dialog is renderer-controlled: Escape,
 * outside presses and the close button all call onClose(), and the unmount
 * (when the renderer stops rendering the dialog) is what closes the element
 * and restores focus — so onClose fires exactly once per close gesture.
 */
export function Dialog({ label, onClose, children, modal = true }: DialogComponentProps): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let shown = false;
    if (modal && typeof el.showModal === "function") {
      el.showModal();
      shown = true;
    } else {
      el.open = true;
    }
    el.setAttribute("data-modal", modal ? (shown ? "true" : "fallback") : "static");
    if (!modal) return;
    // A modal's top layer already blocks the background in real browsers;
    // inert makes the guarantee explicit (and holds in the fallback). Every
    // branch that does not contain the dialog is inerted — walking up from
    // the dialog and inerting each ancestor's siblings — since inert is
    // inherited and the dialog usually sits deep in the tree.
    const inerted: Element[] = [];
    const markSiblings = (node: Element): void => {
      for (const sibling of node.parentElement?.children ?? []) {
        if (sibling !== node && !sibling.contains(el)) {
          sibling.setAttribute("inert", "");
          inerted.push(sibling);
        }
      }
    };
    for (let node: Element = el; node !== document.body && node.parentElement !== null; node = node.parentElement) {
      markSiblings(node);
    }
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el).focus();
    return () => {
      for (const branch of inerted) branch.removeAttribute("inert");
      if (el.open) {
        if (typeof el.close === "function") el.close();
        else el.open = false;
      }
      if (opener !== null && opener.isConnected) opener.focus();
    };
  }, [modal]);

  const focusables = (): HTMLElement[] =>
    ref.current === null ? [] : [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      data-yadad="dialog"
      data-part="root"
      data-modal={modal ? undefined : "static"}
      aria-labelledby={titleId}
      onPointerDown={(e) => {
        // The backdrop area of a dialog box is the element itself; a press
        // landing on the element rather than its content is an outside press.
        if (e.target === e.currentTarget) onClose();
      }}
      onCancel={(e) => {
        // Native Escape under showModal: route through onClose; the element
        // closes when the renderer stops rendering the dialog.
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key !== "Tab") return;
        const list = focusables();
        if (list.length === 0) {
          e.preventDefault();
          return;
        }
        const first = list[0] as HTMLElement;
        const last = list[list.length - 1] as HTMLElement;
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === ref.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <header data-part="header">
        <h2 data-part="title" id={titleId}>
          {label}
        </h2>
        <button type="button" data-part="close" aria-label="Close" onClick={onClose}>
          &#215;
        </button>
      </header>
      <div data-part="body">{children}</div>
    </dialog>
  );
}
