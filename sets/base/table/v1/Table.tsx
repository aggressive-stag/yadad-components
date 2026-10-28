"use client";

import type { RecordActionItem, TableProps } from "@yadad/core";
import { useEffect, useState } from "react";
import { Menu } from "../../../internal/menu/v1/index.js";
import { Skeleton } from "../../../internal/skeleton/v1/index.js";
import type { ReactNode } from "react";

const ariaSort = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined);
const arrow = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "▲" : sort === "desc" ? "▼" : "");

/** A phone-width viewport: the same thumb-first layout the @container rules in table.css pick up. */
const PHONE_QUERY = "(max-width: 500px)";

/**
 * Every word the table says, as a prop; each default is the English literal
 * that was hardcoded before (card 15a). `sortedLabel` receives "ascending" or
 * "descending" — the `aria-sort` attribute itself is a spec value and stays
 * untranslated; `menuAriaLabel` receives the row caption so the trigger
 * keeps naming its row.
 */
export interface TableStrings {
  /** Live-region text while an action is in flight. Default: "Working...". */
  readonly workingLabel?: string;
  /** Phone menu trigger text. Default: "Actions…". */
  readonly menuLabel?: string;
  /** Phone menu trigger accessible name. Called with the table caption (pre-existing wiring). Default: `Actions (${caption})`. */
  readonly menuAriaLabel?: (rowLabel: string) => string;
  /** Open phone menu panel accessible name. Called with the table caption. Default: `Actions (${caption})`. */
  readonly menuPanelAriaLabel?: (rowLabel: string) => string;
  /** Phone menu cancel button. Default: "Cancel". */
  readonly cancelLabel?: string;
  /** Screen-reader sort status. Default: `, sorted ${direction}`. */
  readonly sortedLabel?: (direction: "ascending" | "descending") => string;
}

function isPhone(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
}

function ActionButton({ action, disabled }: { action: RecordActionItem; disabled: boolean }): ReactNode {
  // The button's accessible name is its label verbatim (the card's wording);
  // inside a table cell the row and column header already give context.
  // `disabled` is the whole row's pending state (the contract: a record with
  // an action in flight disables its buttons), not the item's own flag.
  return (
    <button type="button" data-part="action" data-tone={action.tone} disabled={disabled} onClick={action.onPress}>
      {action.label}
    </button>
  );
}

/**
 * The actions cell for one row (RFC 0007). Desktop: every action is a button
 * in the cell. Phone width: two or more actions collapse into an "Actions…"
 * menu with the board's "Move to…" behaviour — Tab reaches the trigger,
 * Enter or Space opens the panel, every action is reachable by Tab, Escape
 * closes and focus returns to the trigger — all of that focus movement is
 * `Menu`'s own contract (sets/internal/menu), including the refocus through
 * a ref when the trigger unmounts while open. One action stays a plain
 * button on phones too. While a record has an action in flight every one of
 * its buttons is disabled and a polite status says
 * "Working...". There is no disabled-with-a-reason state: the renderer hides
 * unavailable actions instead.
 */
function RowActions({ actions, rowLabel, strings }: { actions: readonly RecordActionItem[]; rowLabel: string; strings: TableStrings }): ReactNode {
  const [phone, setPhone] = useState(isPhone);

  // Re-evaluate the phone breakpoint; jsdom has no matchMedia (desktop).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (): void => setPhone(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The live region is always mounted; only its text changes. A region
  // inserted at the moment work starts is often not announced (screen
  // readers watch regions that already exist).
  const pending = actions.some((a) => a.pending);
  const status = (
    <span data-part="action-status" role="status">
      {pending ? (strings.workingLabel ?? "Working...") : ""}
    </span>
  );

  const useMenu = phone && actions.length > 1;

  return (
    <Menu>
      {({ open, openMenu, close, triggerRef, panelRef, wrapperProps }) => (
        <span
          data-part="actions"
          {...wrapperProps}
        >
          {status}
          {useMenu ? (
            <button
              ref={triggerRef}
              type="button"
              data-part="actions-trigger"
              data-yadad-focus-return="actions"
              aria-haspopup="true"
              aria-expanded={open}
              aria-label={(strings.menuAriaLabel ?? ((row: string) => `Actions (${row})`))(rowLabel)}
              onClick={openMenu}
            >
              {strings.menuLabel ?? "Actions…"}
            </button>
          ) : (
            <span data-part="actions-list">
              {actions.map((a) => (
                <ActionButton key={a.id} action={a} disabled={pending} />
              ))}
            </span>
          )}
          {useMenu && open ? (
            <span
              ref={panelRef}
              tabIndex={-1}
              data-part="actions-panel"
              data-yadad-focus-return="actions"
              role="group"
              aria-label={(strings.menuPanelAriaLabel ?? ((row: string) => `Actions (${row})`))(rowLabel)}
            >
              {actions.map((a) => (
                <ActionButton key={a.id} action={a} disabled={pending} />
              ))}
              <button type="button" data-part="actions-cancel" onClick={close}>
                {strings.cancelLabel ?? "Cancel"}
              </button>
            </span>
          ) : null}
        </span>
      )}
    </Menu>
  );
}

/**
 * A semantic table. Sortable headers hold a button; the sorted one carries
 * aria-sort and a visually hidden status so the button names its direction.
 * Under a narrow container (see table.css) rows stack as cards, each cell
 * labelled by its column via data-label; explicit roles keep the table
 * semantics when the CSS display type is no longer table. Rows with `actions`
 * gain a last column headed `actionsLabel` ("Actions") of action buttons
 * (RFC 0007; see RowActions for the phone menu). Plain DOM for now;
 * virtualization arrives with a later version.
 */
export function Table({ caption, columns, rows, onSort, empty, actionsLabel, strings = {}, loading = false, skeletonRows = 5 }: TableProps<ReactNode> & { strings?: TableStrings; loading?: boolean; skeletonRows?: number }): ReactNode {
  const hasActions = rows.some((row) => row.actions !== undefined && row.actions.length > 0);
  return (
    <div data-yadad="table" data-part="root">
      <table data-part="table" role="table">
        <caption data-part="caption">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((c) => (
              <th key={c.id} id={c.headerId} scope="col" role="columnheader" data-part="header" aria-sort={ariaSort(c.sort)}>
                {c.sortable ? (
                  <button type="button" data-part="sort" onClick={() => onSort(c.id)}>
                    {c.label}
                    {c.sort ? <span data-part="sort-status">{(strings.sortedLabel ?? ((direction: "ascending" | "descending") => `, sorted ${direction}`))(ariaSort(c.sort) ?? "ascending")}</span> : null}
                    <span data-part="sort-indicator" aria-hidden="true">
                      {arrow(c.sort)}
                    </span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
            {hasActions ? (
              <th scope="col" role="columnheader" data-part="header" data-col="actions">
                {actionsLabel ?? "Actions"}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {loading ? (
            // Loading holds the shape (card 15e): skeleton rows inside the
            // real table, so column geometry is the real columns' and the
            // arriving content does not jump. `empty` keeps its meaning of
            // *loaded with zero rows* — it never doubles as loading.
            Array.from({ length: Math.max(0, skeletonRows) }, (_, r) => (
              <tr key={`skeleton-${r}`} role="row" data-part="skeleton-row">
                {Array.from({ length: columns.length + (hasActions ? 1 : 0) }, (_, c) => (
                  <td key={columns[c]?.id ?? c} role="cell" data-label={columns[c]?.label} data-part="cell">
                    <Skeleton width={c === 0 ? "70%" : `${50 + ((r * 13 + c * 29) % 40)}%`} height="1em" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr role="row">
              <td colSpan={columns.length + (hasActions ? 1 : 0)} role="cell" data-part="empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} role="row" data-yadad-row={row.id} data-part="row">
                {row.cells.map((cell, i) => (
                  <td key={columns[i]?.id ?? i} role="cell" data-label={columns[i]?.label} data-part="cell">
                    {cell}
                  </td>
                ))}
                {hasActions ? (
                  <td role="cell" data-label={actionsLabel ?? "Actions"} data-part="cell" data-col="actions">
                    {row.actions && row.actions.length > 0 ? <RowActions actions={row.actions} rowLabel={caption} strings={strings} /> : null}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
