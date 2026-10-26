"use client";

import type { BoardCard, BoardColumn, BoardProps } from "@yadad/core";
import type { ReactNode } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "../../../internal/menu/v1/index.js";
import { useTouchDrag } from "../../../internal/touch-drag/v1/index.js";
import { Skeleton } from "../../../internal/skeleton/v1/index.js";
import { paletteSlot } from "../../../internal/swatch/v1/index.js";

/** Drag payload type: the card id. Also set as text/plain so other drop targets and tests can read it. */
const DRAG_TYPE = "application/x-yadad-board-card";

/**
 * Every word the board says, as a prop; each default is the English literal
 * that was hardcoded before (card 15a). The `…Label` functions receive the
 * card/column so the accessible names keep naming the thing they belong to.
 */
export interface BoardStrings {
  /** Live-region text while an action or move is in flight. Default: "Working...". */
  readonly workingLabel?: string;
  /** Action menu trigger text. Default: "Actions…". */
  readonly menuLabel?: string;
  /** Action menu trigger accessible name. Default: `Actions ${cardLabel}`. */
  readonly menuAriaLabel?: (cardLabel: string) => string;
  /** Open menu panel accessible name. Default: `Actions ${cardLabel}`. */
  readonly menuPanelAriaLabel?: (cardLabel: string) => string;
  /** Menu and move-panel cancel button. Default: "Cancel". */
  readonly cancelLabel?: string;
  /** "Move to…" trigger text. Default: "Move to…". */
  readonly moveLabel?: string;
  /** "Move to…" trigger accessible name. Default: `Move to… ${cardLabel}`. */
  readonly moveAriaLabel?: (cardLabel: string) => string;
  /** Move panel accessible name. Default: `Move ${cardLabel}`. */
  readonly movePanelAriaLabel?: (cardLabel: string) => string;
  /** Move panel label. Default: `Move ${cardLabel} to`. */
  readonly moveToLabel?: (cardLabel: string) => string;
  /** Move panel select placeholder option. Default: "Choose a column". */
  readonly chooseColumnLabel?: string;
  /** Move panel confirm button. Default: "Move". */
  readonly moveConfirmLabel?: string;
  /** Completion checkbox visible text. Default: "Done". */
  readonly doneLabel?: string;
  /** Completion checkbox accessible name. Default: `Done: ${cardLabel}`. */
  readonly doneAriaLabel?: (cardLabel: string) => string;
  /** Group-by select label. Default: "Group by". */
  readonly groupByLabel?: string;
  /** Empty column while loading. Default: "Loading cards…". */
  readonly loadingLabel?: string;
  /** Empty column. Default: "No cards". */
  readonly emptyLabel?: string;
  /** Column-count accessible name. Default: `${count} ${count === 1 ? "card" : "cards"}`. */
  readonly columnCountLabel?: (count: number) => string;
}

/**
 * The "Move to…" control for one movable card: a trigger, always in the DOM
 * and focusable, that opens a labelled list of the droppable columns other
 * than the card's own. This is the keyboard, touch and screen-reader move
 * path (RFC 0005); drag (card 11) is an addition on top, never a replacement.
 */
function MoveControl({
  card,
  columnId,
  columns,
  onMove,
  onMoved,
  strings,
}: {
  card: BoardCard<ReactNode>;
  columnId: string;
  columns: readonly BoardColumn<ReactNode>[];
  onMove: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
  strings: BoardStrings;
}): ReactNode {
  const [target, setTarget] = useState("");
  const selectId = useId();

  // Trigger unmounts while the panel is open; the primitive refocuses it
  // through a ref after the remount commit (14b's contract, now shared).
  return (
    <Menu focusPanelOnOpen={false} onOpen={() => setTarget("")}>
      {({ open, openMenu, close, triggerRef, wrapperProps }) =>
        !open ? (
          <button
            ref={triggerRef}
            type="button"
            data-part="move-trigger"
            aria-label={(strings.moveAriaLabel ?? ((label: string) => `Move to… ${label}`))(card.label)}
            onClick={openMenu}
          >
            {strings.moveLabel ?? "Move to…"}
          </button>
        ) : (
          <form
            data-part="move-panel"
            aria-label={(strings.movePanelAriaLabel ?? ((label: string) => `Move ${label}`))(card.label)}
            onSubmit={(e) => {
              e.preventDefault();
              if (target !== "") {
                onMove(card.id, target);
                onMoved(card.id);
              }
              close();
            }}
            {...wrapperProps}
          >
            <label htmlFor={selectId} data-part="move-label">
              {(strings.moveToLabel ?? ((label: string) => `Move ${label} to`))(card.label)}
            </label>
            <select id={selectId} data-yadad="select" data-part="move-select" autoFocus value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="" disabled>
                {strings.chooseColumnLabel ?? "Choose a column"}
              </option>
              {columns
                .filter((c) => c.droppable && c.id !== columnId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
            </select>
            <button type="submit" data-part="move-confirm">
              {strings.moveConfirmLabel ?? "Move"}
            </button>
            <button type="button" data-part="move-cancel" onClick={close}>
              {strings.cancelLabel ?? "Cancel"}
            </button>
          </form>
        )
      }
    </Menu>
  );
}

/**
 * A card's record actions (RFC 0007), next to the "Move to…" path. One
 * action is a plain button; two or more collapse into one menu with the same
 * keyboard contract as "Move to…": Enter or Space opens it, Tab reaches every
 * action and Cancel, Escape closes it and focus goes back to the trigger
 * (the trigger unmounts while the menu is open and is refocused through a
 * ref, exactly like MoveControl). A record with an action in flight has ALL
 * its buttons disabled and a polite status says "Working...". There is no
 * disabled-with-a-reason state: the renderer hides unavailable actions.
 * Actions exist on the card whether or not the board is movable.
 */
function CardActions({ card, strings }: { card: BoardCard<ReactNode>; strings: BoardStrings }): ReactNode {
  const actions = card.actions ?? [];
  if (actions.length === 0) return null;
  // card.pending (a move of this card is in flight) is also "an action in
  // flight" for the RFC's purposes: while the engine is moving the card, its
  // action buttons must not fire either.
  const pending = card.pending || actions.some((a) => a.pending);
  // The live region is always mounted; only its text changes, so screen
  // readers announce the change (regions inserted at work-start are often ignored).
  const status = (
    <span data-part="action-status" role="status">
      {pending ? (strings.workingLabel ?? "Working...") : ""}
    </span>
  );
  const buttons = actions.map((a) => (
    // Accessible name is the label verbatim; the card around it gives context.
    <button key={a.id} type="button" data-part="action" data-tone={a.tone} disabled={pending} onClick={a.onPress}>
      {a.label}
    </button>
  ));

  if (actions.length === 1) {
    return (
      <span data-part="actions">
        {status}
        {buttons}
      </span>
    );
  }

  // The trigger unmounts while the menu is open; the primitive's refocus-
  // through-a-ref effect lands the focus back on its remount (the contract
  // this view used to hand-roll, and MoveControl below reuses from here).
  return (
    <Menu>
      {({ open, openMenu, close, triggerRef, panelRef, wrapperProps }) => (
        <span data-part="actions" {...wrapperProps}>
          {status}
          {!open ? (
            <button ref={triggerRef} type="button" data-part="actions-trigger" aria-label={(strings.menuAriaLabel ?? ((label: string) => `Actions ${label}`))(card.label)} onClick={openMenu}>
              {strings.menuLabel ?? "Actions…"}
            </button>
          ) : (
            <span data-part="actions-panel" role="group" aria-label={(strings.menuPanelAriaLabel ?? ((label: string) => `Actions ${label}`))(card.label)} tabIndex={-1} ref={panelRef}>
              {buttons}
              <button type="button" data-part="actions-cancel" onClick={close}>
                {strings.cancelLabel ?? "Cancel"}
              </button>
            </span>
          )}
        </span>
      )}
    </Menu>
  );
}

/**
 * The card's completion checkbox (RFC 0008 item 3), drawn only when the
 * renderer passes `done`. A native checkbox named for the card; it owns
 * `checked` and `disabled` from the renderer and calls `toggle` once per
 * change. Pointer-down stops here so a press on it never lifts the card for a
 * touch drag; it is a sibling of the open-card button, so it never opens it.
 */
function DoneToggle({ card, strings }: { card: BoardCard<ReactNode>; strings: BoardStrings }): ReactNode {
  const done = card.done;
  if (!done) return null;
  return (
    <label data-part="done" onPointerDown={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        data-part="done-input"
        aria-label={(strings.doneAriaLabel ?? ((label: string) => `Done: ${label}`))(card.label)}
        checked={done.checked}
        disabled={done.disabled}
        onChange={() => done.toggle()}
      />
      <span data-part="done-label">{strings.doneLabel ?? "Done"}</span>
    </label>
  );
}

/** The id of the droppable column under a point, other than the card's own; undefined elsewhere. */
function columnUnder(x: number, y: number, ownColumn: string): string | undefined {
  const el = document.elementFromPoint(x, y)?.closest('[data-part="column"]');
  const id = el?.getAttribute("data-column-id");
  if (!el || !id || id === ownColumn || el.getAttribute("data-droppable") !== "true") return undefined;
  return id;
}

/** The sideways-scrolling row of columns a card sits in. */
function columnRail(source: HTMLElement): HTMLElement | null {
  return source.closest<HTMLElement>('[data-part="columns"]');
}

/**
 * One card. A card with `onOpenCard` is a button (click or Enter opens it);
 * without it the card is plain content. A movable card is a drag source and
 * also gets the "Move to…" control. Neither exists without `onMove`.
 */
function CardView({
  card,
  columnId,
  columns,
  onOpenCard,
  onMove,
  onMoved,
  onTouchOver,
  strings,
}: {
  card: BoardCard<ReactNode>;
  columnId: string;
  columns: readonly BoardColumn<ReactNode>[];
  onOpenCard?: (id: string) => void;
  onMove?: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
  onTouchOver: (columnId: string | undefined) => void;
  strings: BoardStrings;
}): ReactNode {
  const [dragging, setDragging] = useState(false);
  // Only a card the renderer lets move is a drag source: no `onMove` or `movable: false` means no drag at all.
  const canMove = onMove !== undefined && card.movable;
  // Touch pointers can't start an HTML5 drag, so a long-press lifts the card and a finger drag moves it (card 16c).
  // The drop calls the same `onMove` as the mouse drop; the card's own column and locked columns are not targets.
  const touchPointer = useRef(false);
  const touch = useTouchDrag<string>({
    enabled: canMove,
    findTarget: (x, y) => columnUnder(x, y, columnId),
    onHover: onTouchOver,
    onDrop: (target) => onMove?.(card.id, target),
    scroller: columnRail,
  });
  return (
    <li
      data-part="card"
      data-card-id={card.id}
      data-pending={card.pending}
      data-movable={card.movable}
      data-dragging={dragging || touch.dragging ? "true" : undefined}
      {...(canMove
        ? {
            draggable: true,
            onPointerDown: (e: ReactPointerEvent<HTMLLIElement>) => {
              touchPointer.current = e.pointerType === "touch";
              touch.onPointerDown(e);
            },
            onDragStart: (e: DragEvent<HTMLLIElement>) => {
              // A touch long-press must not also begin the native drag; the pointer drag owns it.
              if (touchPointer.current) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData(DRAG_TYPE, card.id);
              e.dataTransfer.setData("text/plain", card.id);
              e.dataTransfer.effectAllowed = "move";
              setDragging(true);
            },
            onDragEnd: () => setDragging(false),
          }
        : {})}
    >
      {onOpenCard ? (
        <button type="button" data-part="card-open" aria-label={card.label} onClick={() => onOpenCard(card.id)}>
          <span data-part="card-content">{card.content}</span>
        </button>
      ) : (
        <span data-part="card-static">
          <span data-part="card-content">{card.content}</span>
        </span>
      )}
      <DoneToggle card={card} strings={strings} />
      {canMove ? <MoveControl card={card} columnId={columnId} columns={columns} onMove={onMove} onMoved={onMoved} strings={strings} /> : null}
      <CardActions card={card} strings={strings} />
    </li>
  );
}

/**
 * One column: a labelled region with a heading (label and count) and a list
 * of cards that scrolls on its own. A `droppable` column is a drop target
 * while `onMove` is set (`data-droppable`, and `data-drag-over` during a drag).
 */
function ColumnView({
  column,
  loading,
  columns,
  scrollFocusable,
  touchOver,
  onTouchOver,
  onOpenCard,
  onMove,
  onMoved,
  strings,
}: {
  column: BoardColumn<ReactNode>;
  loading: boolean;
  columns: readonly BoardColumn<ReactNode>[];
  scrollFocusable: boolean;
  touchOver: boolean;
  onTouchOver: (columnId: string | undefined) => void;
  onOpenCard?: (id: string) => void;
  onMove?: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
  strings: BoardStrings;
}): ReactNode {
  const headingId = useId();
  const [over, setOver] = useState(false);
  // A drop target only when the renderer gave us `onMove` and the column accepts drops. The component never moves the card itself.
  const dropTarget = onMove !== undefined && column.droppable;
  const hasDrag = (e: DragEvent<HTMLElement>): boolean => e.dataTransfer.types.includes(DRAG_TYPE);
  return (
    <section
      data-part="column"
      data-column-id={column.id}
      data-droppable={column.droppable}
      data-drag-over={over || touchOver ? "true" : undefined}
      aria-label={`${column.label}, ${(strings.columnCountLabel ?? ((count: number) => `${count} ${count === 1 ? "card" : "cards"}`))(column.count)}`}
      {...(dropTarget
        ? {
            onDragOver: (e: DragEvent<HTMLElement>) => {
              if (!hasDrag(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            },
            onDragEnter: (e: DragEvent<HTMLElement>) => {
              if (hasDrag(e)) setOver(true);
            },
            onDragLeave: (e: DragEvent<HTMLElement>) => {
              // Leaving to a child of the column is not leaving the column.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
            },
            onDrop: (e: DragEvent<HTMLElement>) => {
              setOver(false);
              if (!hasDrag(e)) return;
              e.preventDefault();
              const id = e.dataTransfer.getData(DRAG_TYPE);
              if (id === "" || column.cards.some((c) => c.id === id)) return;
              onMove(id, column.id);
            },
          }
        : {})}
    >
      <h2 id={headingId} data-part="column-heading">
        <span data-part="column-label">
          {paletteSlot(column.color) !== undefined && <span data-part="swatch" data-slot={paletteSlot(column.color)} aria-hidden="true" />}
          {column.label}
        </span>
        <span data-part="column-count" aria-label={(strings.columnCountLabel ?? ((count: number) => `${count} ${count === 1 ? "card" : "cards"}`))(column.count)}>
          {column.count}
        </span>
      </h2>
      <ul data-part="cards" aria-labelledby={headingId} {...(scrollFocusable ? { tabIndex: 0 } : {})}>
        {column.cards.length === 0 && loading ? (
          // Loading holds the shape (card 15e): bars where the cards will
          // land, sized like a real card, plus the text alternative the bars
          // cannot be. NOT another status region — the board keeps exactly
          // one role="status" (the announcement div), and a second would
          // make the contract kit's queryByRole("status") ambiguous.
          <li data-part="column-empty">
            <span data-part="loading-text">
              {strings.loadingLabel ?? "Loading cards…"}
            </span>
            {Array.from({ length: 2 }, (_, i) => (
              <span key={i} data-part="skeleton-card">
                <Skeleton width="60%" height="1em" />
                <Skeleton width="90%" height="0.75em" />
                <Skeleton width="75%" height="0.75em" />
              </span>
            ))}
          </li>
        ) : column.cards.length === 0 ? (
          <li data-part="column-empty">{strings.emptyLabel ?? "No cards"}</li>
        ) : (
          column.cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              columnId={column.id}
              columns={columns}
              onMoved={onMoved}
              onTouchOver={onTouchOver}
              strings={strings}
              {...(onOpenCard ? { onOpenCard } : {})}
              {...(onMove ? { onMove } : {})}
            />
          ))
        )}
      </ul>
    </section>
  );
}

/**
 * The board (RFC 0005): cards in columns, one column per value of the
 * grouping field. The renderer owns data, grouping and announcements; this
 * component draws them. Columns sit side by side and scroll horizontally on
 * overflow; each column scrolls on its own. A movable card can be dragged
 * onto a droppable column or moved with "Move to…" (keyboard, touch); both
 * call `onMove` and nothing else: the engine moves it and reverts refusals.
 * At phone widths the board shows one column at a time, with scroll snap.
 */
export function Board({ label, groupChoices, groupField, columns, loading, notice, announcement, onGroupBy, onOpenCard, onMove, strings = {} }: BoardProps<ReactNode> & { strings?: BoardStrings }): ReactNode {
  const groupId = useId();
  // The column a finger-drag is currently over; mouse drags keep their own state per column.
  const [touchOver, setTouchOver] = useState<string | undefined>(undefined);
  // A scroll container must be reachable by keyboard. Open-card buttons already are; without them the lists take the tab stop.
  const scrollFocusable = onOpenCard === undefined && onMove === undefined;
  // A moved card is rebuilt in its new column, so its "Move to…" trigger is focused again when focus was lost.
  const movedCard = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (movedCard.current === undefined) return;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    document.querySelector<HTMLElement>(`[data-card-id="${movedCard.current}"] [data-part="move-trigger"]`)?.focus();
  });
  return (
    <section
      aria-label={label}
      aria-busy={loading}
      data-yadad="board"
      data-part="root"
      data-group-field={groupField}
      onKeyDownCapture={() => (movedCard.current = undefined)}
      onPointerDownCapture={() => (movedCard.current = undefined)}
    >
      <div data-part="header">
        <h2 data-part="title">{label}</h2>
        {groupChoices.length > 1 ? (
          <div data-part="group-by">
            <label htmlFor={groupId} data-part="group-by-label">
              {strings.groupByLabel ?? "Group by"}
            </label>
            <select
              id={groupId}
              data-yadad="select"
              data-part="input"
              value={groupField}
              onChange={(e) => onGroupBy(e.target.value)}
            >
              {groupChoices.map((choice) => (
                <option key={choice.field} value={choice.field}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {notice !== undefined ? <div data-part="notice">{notice}</div> : null}
      <div role="status" aria-live="polite" data-part="status">
        {announcement ? <span key={announcement.seq}>{announcement.text}</span> : null}
      </div>
      <div data-part="columns">
        {columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            loading={loading}
            columns={columns}
            scrollFocusable={scrollFocusable}
            touchOver={touchOver === column.id}
            onTouchOver={setTouchOver}
            onMoved={(id) => (movedCard.current = id)}
            strings={strings}
            {...(onOpenCard ? { onOpenCard } : {})}
            {...(onMove ? { onMove } : {})}
          />
        ))}
      </div>
    </section>
  );
}
