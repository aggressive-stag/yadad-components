import type { BoardCard, BoardColumn, BoardProps } from "@yadad/core";
import type { ReactNode } from "react";
import type { DragEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

/** Drag payload type: the card id. Also set as text/plain so other drop targets and tests can read it. */
const DRAG_TYPE = "application/x-yadad-board-card";

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
}: {
  card: BoardCard<ReactNode>;
  columnId: string;
  columns: readonly BoardColumn<ReactNode>[];
  onMove: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const refocusTrigger = useRef(false);
  const selectId = useId();

  // The trigger unmounts while the list is open: focus it again once it is back in the DOM.
  useEffect(() => {
    if (!open && refocusTrigger.current) {
      refocusTrigger.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        data-part="move-trigger"
        aria-label={`Move to… ${card.label}`}
        onClick={() => {
          setTarget("");
          setOpen(true);
        }}
      >
        Move to…
      </button>
    );
  }

  const close = (): void => {
    refocusTrigger.current = true;
    setOpen(false);
  };
  return (
    <form
      data-part="move-panel"
      aria-label={`Move ${card.label}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (target !== "") {
          onMove(card.id, target);
          onMoved(card.id);
        }
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <label htmlFor={selectId} data-part="move-label">
        Move {card.label} to
      </label>
      <select id={selectId} data-yadad="select" data-part="move-select" autoFocus value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="" disabled>
          Choose a column
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
        Move
      </button>
      <button type="button" data-part="move-cancel" onClick={close}>
        Cancel
      </button>
    </form>
  );
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
}: {
  card: BoardCard<ReactNode>;
  columnId: string;
  columns: readonly BoardColumn<ReactNode>[];
  onOpenCard?: (id: string) => void;
  onMove?: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
}): ReactNode {
  const [dragging, setDragging] = useState(false);
  // Only a card the renderer lets move is a drag source: no `onMove` or `movable: false` means no drag at all.
  const canMove = onMove !== undefined && card.movable;
  return (
    <li
      data-part="card"
      data-card-id={card.id}
      data-pending={card.pending}
      data-movable={card.movable}
      data-dragging={dragging ? "true" : undefined}
      {...(canMove
        ? {
            draggable: true,
            onDragStart: (e: DragEvent<HTMLLIElement>) => {
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
      {canMove ? <MoveControl card={card} columnId={columnId} columns={columns} onMove={onMove} onMoved={onMoved} /> : null}
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
  onOpenCard,
  onMove,
  onMoved,
}: {
  column: BoardColumn<ReactNode>;
  loading: boolean;
  columns: readonly BoardColumn<ReactNode>[];
  scrollFocusable: boolean;
  onOpenCard?: (id: string) => void;
  onMove?: (id: string, columnId: string) => void;
  onMoved: (id: string) => void;
}): ReactNode {
  const headingId = useId();
  const [over, setOver] = useState(false);
  // A drop target only when the renderer gave us `onMove` and the column accepts drops. The component never moves the card itself.
  const dropTarget = onMove !== undefined && column.droppable;
  const hasDrag = (e: DragEvent<HTMLElement>): boolean => e.dataTransfer.types.includes(DRAG_TYPE);
  return (
    <section
      data-part="column"
      data-testid={`column-${column.id}`}
      data-column-id={column.id}
      data-droppable={column.droppable}
      data-drag-over={over ? "true" : undefined}
      aria-labelledby={headingId}
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
      <h3 id={headingId} data-part="column-heading">
        <span data-part="column-label">{column.label}</span>
        <span data-part="column-count" aria-label={`${column.count} ${column.count === 1 ? "card" : "cards"}`}>
          {column.count}
        </span>
      </h3>
      <ul data-part="cards" aria-labelledby={headingId} {...(scrollFocusable ? { tabIndex: 0 } : {})}>
        {column.cards.length === 0 ? (
          <li data-part="column-empty">{loading ? "Loading cards…" : "No cards"}</li>
        ) : (
          column.cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              columnId={column.id}
              columns={columns}
              onMoved={onMoved}
              {...(onOpenCard ? { onOpenCard } : {})}
              {...(onMove ? { onMove } : {})}
            />
          ))
        )}
      </ul>
    </section>
  );
}

// data-testid="board" and "column-<id>" exist only because the engine's contract kit looks them up (a kit gap; see the card report).
/**
 * The board (RFC 0005): cards in columns, one column per value of the
 * grouping field. The renderer owns data, grouping and announcements; this
 * component draws them. Columns sit side by side and scroll horizontally on
 * overflow; each column scrolls on its own. A movable card can be dragged
 * onto a droppable column or moved with "Move to…" (keyboard, touch); both
 * call `onMove` and nothing else: the engine moves it and reverts refusals.
 * At phone widths the board shows one column at a time, with scroll snap.
 */
export function Board({ label, groupChoices, groupField, columns, loading, notice, announcement, onGroupBy, onOpenCard, onMove }: BoardProps<ReactNode>): ReactNode {
  const groupId = useId();
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
      data-testid="board"
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
              Group by
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
            onMoved={(id) => (movedCard.current = id)}
            {...(onOpenCard ? { onOpenCard } : {})}
            {...(onMove ? { onMove } : {})}
          />
        ))}
      </div>
    </section>
  );
}
