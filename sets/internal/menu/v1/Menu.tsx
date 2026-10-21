"use client";

import type { HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The private menu/popup contract, extracted from the five copies in
 * Table.tsx / Board.tsx (×2) / Calendar.tsx (×2) — card 15d: extraction, not
 * redesign. The primitive renders NO DOM: the view keeps every element and
 * every `data-part` name it had before (THEMING.md keeps scanning them from
 * the view's file, and the freeze tests never see a new node).
 *
 * It owns exactly the behavior the copies shared:
 *
 *   - open state; `openMenu()` runs the view's `onOpen` (reset form state)
 *     first, then opens
 *   - Escape closes — spread `wrapperProps` on the wrapper the view renders
 *     around trigger+panel; the handler lives there and stopPropagation's, so
 *     a nested menu never closes its ancestors
 *   - focus moves into the panel on open (`focusPanelOnOpen`; form panels
 *     pass false because their field autofocuses instead)
 *   - focus returns to the trigger on close — including the MoveControl
 *     gymnastics (14b): the trigger may UNMOUNT while open and remount on
 *     close, so the refocus runs in an effect through a ref flag, after the
 *     remount commit (an autoFocus attribute loses that race).
 */
export interface MenuArgs {
  /** whether the menu is open right now */
  open: boolean;
  /** open the menu (runs `onOpen` first); wire this to the trigger's onClick */
  openMenu: () => void;
  /** close the menu and return focus to the trigger; wire this to Cancel/submit */
  close: () => void;
  /** attach to the trigger button (may unmount while open — the refocus still lands on its remount) */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** attach to the panel (focused on open when `focusPanelOnOpen`) */
  panelRef: RefObject<HTMLElement | null>;
  /**
   * spread onto the wrapper the view renders around trigger+panel (the
   * `data-part="actions"` span, the move-panel span, or the move `<form>`).
   * Carries the Escape handler — spread it, or Escape will not close the menu.
   */
  wrapperProps: Pick<HTMLAttributes<HTMLSpanElement>, "onKeyDown">;
}

export interface MenuProps {
  /** renders the menu contents; receives the open state, refs and wrapperProps */
  children: (args: MenuArgs) => ReactNode;
  /**
   * Focus the panel when it opens (the actions menus' contract: Tab then
   * walks the buttons). Form panels pass false — their select/input
   * autofocuses, and stealing that would change behavior.
   */
  focusPanelOnOpen?: boolean;
  /** run when the trigger is activated, before the panel opens (reset form state here) */
  onOpen?: () => void;
}

export function Menu({ children, focusPanelOnOpen = true, onOpen }: MenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // The trigger may unmount while the menu is open (the actions menus and
  // both move controls do this on purpose); mark "refocus once it's back" and
  // do the focus() in the effect that runs after the remount commit.
  const refocusTrigger = useRef(false);

  useEffect(() => {
    if (open) {
      if (focusPanelOnOpen) panelRef.current?.focus();
    } else if (refocusTrigger.current) {
      refocusTrigger.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const close = useCallback((): void => {
    refocusTrigger.current = true;
    setOpen(false);
  }, []);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent): void => {
      // Escape closes from anywhere inside — trigger, panel, or focus that
      // drifted — and returns focus to the trigger.
      if (open && e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    },
    [open, close],
  );

  return children({ open, openMenu: () => { onOpen?.(); setOpen(true); }, close, triggerRef, panelRef, wrapperProps: { onKeyDown } });
}
