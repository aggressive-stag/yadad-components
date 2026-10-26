"use client";

import type { CalendarDayProps, CalendarEntry, CalendarMode, CalendarProps } from "@yadad/core";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "../../../internal/menu/v1/index.js";
import { useTouchDrag } from "../../../internal/touch-drag/v1/index.js";

/** How many entries show before a day collapses the rest behind "+N more" (card 11 issue 3: unbounded growth). */

const nounFor = (mode: CalendarMode): string => (mode === "month" ? "month" : "week");

/**
 * Every word the calendar says, as a prop; each default is the English
 * literal that was hardcoded before (card 15a). The `…Label` functions
 * receive the entry/day label or the period noun ("month"/"week") so the
 * accessible names keep naming the thing they belong to.
 */
export interface CalendarStrings {
  /** Live-region text while an action or move is in flight. Default: "Working...". */
  readonly workingLabel?: string;
  /** Action menu trigger text. Default: "Actions…". */
  readonly menuLabel?: string;
  /** Action menu trigger accessible name. Default: `Actions ${entryLabel}`. */
  readonly menuAriaLabel?: (entryLabel: string) => string;
  /** Open menu panel accessible name. Default: `Actions ${entryLabel}`. */
  readonly menuPanelAriaLabel?: (entryLabel: string) => string;
  /** Menu and move-panel cancel button. Default: "Cancel". */
  readonly cancelLabel?: string;
  /** "Move to day…" trigger text. Default: "Move to day…". */
  readonly moveLabel?: string;
  /** Move panel accessible name. Default: `Move ${entryLabel} to day`. */
  readonly movePanelAriaLabel?: (entryLabel: string) => string;
  /** Move panel field label. Default: `New day for ${entryLabel}`. */
  readonly moveToLabel?: (entryLabel: string) => string;
  /** Move panel confirm button. Default: "Move". */
  readonly moveConfirmLabel?: string;
  /** Completion checkbox visible text. Default: "Done". */
  readonly doneLabel?: string;
  /** Completion checkbox accessible name. Default: `Done: ${entryLabel}`. */
  readonly doneAriaLabel?: (entryLabel: string) => string;
  /** Today badge in the phone agenda. Default: "Today". */
  readonly todayLabel?: string;
  /** Day entries list accessible name. Default: `Entries for ${dayLabel}`. */
  readonly entriesAriaLabel?: (dayLabel: string) => string;
  /** Day overflow button (more entries than the grid shows). Default: `+${hidden} more`. */
  readonly overflowLabel?: (hidden: number) => string;
  /** Nav button group accessible name. Default: `${calendarLabel} navigation`. */
  readonly navGroupAriaLabel?: (calendarLabel: string) => string;
  /** Previous nav button text. Default: "Previous". */
  readonly previousLabel?: string;
  /** Previous nav button accessible name. Default: `Previous ${noun}`. */
  readonly previousAriaLabel?: (noun: string) => string;
  /** Next nav button text. Default: "Next". */
  readonly nextLabel?: string;
  /** Next nav button accessible name. Default: `Next ${noun}`. */
  readonly nextAriaLabel?: (noun: string) => string;
  /** Today nav button. Default: "Today". */
  readonly navTodayLabel?: string;
  /** Mode switcher group accessible name. Default: "Calendar mode". */
  readonly modeSwitchAriaLabel?: string;
  /** Colour legend accessible name. Default: "Colours". */
  readonly legendAriaLabel?: string;
}

/** Splits the flat day list into rows of 7, for role="row" grouping under role="grid". */
function weekRows(days: readonly CalendarDayProps<ReactNode>[]): CalendarDayProps<ReactNode>[][] {
  const rows: CalendarDayProps<ReactNode>[][] = [];
  for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
  return rows;
}

/**
 * The "Move to day…" control for one movable entry: a trigger, always in the
 * DOM and focusable, that opens a labelled date input defaulting to the
 * entry's current day. This is the keyboard, touch and screen-reader move
 * path (RFC 0004); drag (card 9) is an addition on top, never a replacement.
 */
function MoveControl({ entry, day, onMove, strings }: { entry: CalendarEntry<ReactNode>; day: string; onMove: (id: string, date: string) => void; strings: CalendarStrings }): ReactNode {
  const [value, setValue] = useState(day);
  const inputId = useId();

  // Trigger unmounts while the panel is open; the shared Menu primitive
  // refocuses it through a ref after the remount (14b's contract) and owns
  // Escape on the wrapper.
  return (
    <Menu focusPanelOnOpen={false} onOpen={() => setValue(day)}>
      {({ open, openMenu, close, triggerRef, wrapperProps }) =>
        !open ? (
          <button ref={triggerRef} type="button" data-part="move-trigger" onClick={openMenu}>
            {strings.moveLabel ?? "Move to day…"}
          </button>
        ) : (
          <span data-part="move-panel" role="group" aria-label={(strings.movePanelAriaLabel ?? ((label: string) => `Move ${label} to day`))(entry.label)} {...wrapperProps}>
            <label htmlFor={inputId} data-part="move-label">
              {(strings.moveToLabel ?? ((label: string) => `New day for ${label}`))(entry.label)}
            </label>
            <input id={inputId} type="date" data-part="move-input" value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="button" data-part="move-confirm" onClick={() => { onMove(entry.id, value); close(); }}>
              {strings.moveConfirmLabel ?? "Move"}
            </button>
            <button type="button" data-part="move-cancel" onClick={close}>
              {strings.cancelLabel ?? "Cancel"}
            </button>
          </span>
        )
      }
    </Menu>
  );
}

/**
 * The RFC 0007 record actions of one entry. The calendar has no entry menu,
 * so the buttons sit next to the entry (the RFC's fallback): one action is a
 * plain button, two or more collapse into one "Actions…" menu with the same
 * keyboard contract as the move control. A record with an action in flight —
 * its own or a move of the entry — has all its buttons disabled.
 */
function EntryActions({ entry, strings }: { entry: CalendarEntry<ReactNode>; strings: CalendarStrings }): ReactNode {
  const actions = entry.actions ?? [];

  if (actions.length === 0) return null;
  // entry.pending (a move of this entry is in flight) is also "an action in
  // flight" for the RFC's purposes: while the engine is moving the entry, its
  // action buttons must not fire either.
  const pending = entry.pending || actions.some((a) => a.pending);
  // The live region is always mounted; only its text changes, so screen
  // readers announce the change (regions inserted at work-start are often ignored).
  const status = (
    <span data-part="action-status" role="status">
      {pending ? (strings.workingLabel ?? "Working...") : ""}
    </span>
  );
  const buttons = actions.map((a) => (
    // Accessible name is the label verbatim; the entry around it gives context.
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
  // this view used to hand-roll, shared with the board's CardActions).
  return (
    <Menu>
      {({ open, openMenu, close, triggerRef, panelRef, wrapperProps }) => (
        <span data-part="actions" {...wrapperProps}>
          {status}
          {!open ? (
            <button ref={triggerRef} type="button" data-part="actions-trigger" aria-label={(strings.menuAriaLabel ?? ((label: string) => `Actions ${label}`))(entry.label)} onClick={openMenu}>
              {strings.menuLabel ?? "Actions…"}
            </button>
          ) : (
            <span data-part="actions-panel" role="group" aria-label={(strings.menuPanelAriaLabel ?? ((label: string) => `Actions ${label}`))(entry.label)} tabIndex={-1} ref={panelRef}>
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
 * The entry's completion checkbox (RFC 0008 item 3), drawn only when the
 * renderer passes `done`. A native checkbox named for the entry; `checked` and
 * `disabled` come from the renderer and a change calls `toggle` once.
 * Pointer-down stops here so a press on it never lifts the entry for a touch
 * drag; it is a sibling of the open-entry button, so it never opens it.
 */
function DoneToggle({ entry, strings }: { entry: CalendarEntry<ReactNode>; strings: CalendarStrings }): ReactNode {
  const done = entry.done;
  if (!done) return null;
  return (
    <label data-part="done" onPointerDown={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        data-part="done-input"
        aria-label={(strings.doneAriaLabel ?? ((label: string) => `Done: ${label}`))(entry.label)}
        checked={done.checked}
        disabled={done.disabled}
        onChange={() => done.toggle()}
      />
      <span data-part="done-label">{strings.doneLabel ?? "Done"}</span>
    </label>
  );
}

/** The date of the day cell under a point, other than the entry's own; undefined elsewhere. */
function dayUnder(x: number, y: number, ownDay: string): string | undefined {
  const date = document.elementFromPoint(x, y)?.closest('[data-part="day"]')?.getAttribute("data-date");
  return date && date !== ownDay ? date : undefined;
}

function EntryView({
  entry,
  day,
  onOpenEntry,
  onMove,
  onTouchOver,
  strings,
}: {
  entry: CalendarEntry<ReactNode>;
  day: string;
  onOpenEntry?: (id: string) => void;
  onMove?: (id: string, date: string) => void;
  onTouchOver: (date: string | undefined) => void;
  strings: CalendarStrings;
}): ReactNode {
  const draggable = entry.movable && !!onMove;
  // Touch pointers can't start an HTML5 drag, so a long-press lifts the entry and a finger drag moves it (card 16d).
  // The drop calls the same `onMove` as the mouse drop; the entry's own day is not a target. The agenda layout
  // stacks days vertically, so the page scrolls near the top and bottom edges.
  const touchPointer = useRef(false);
  const touch = useTouchDrag<string>({
    enabled: draggable,
    findTarget: (x, y) => dayUnder(x, y, day),
    onHover: onTouchOver,
    onDrop: (date) => onMove?.(entry.id, date),
    autoScrollY: true,
  });
  const content = (
    <>
      {entry.color ? <span data-part="entry-color" data-slot={entry.color.slot} aria-hidden="true" /> : null}
      <span data-part="entry-content">{entry.content}</span>
    </>
  );
  return (
    <li
      data-part="entry"
      data-pending={entry.pending}
      data-movable={entry.movable}
      data-dragging={touch.dragging ? "true" : undefined}
      draggable={draggable}
      onPointerDown={
        draggable
          ? (e) => {
              touchPointer.current = e.pointerType === "touch";
              touch.onPointerDown(e);
            }
          : undefined
      }
      onDragStart={
        draggable
          ? (e) => {
              // A touch long-press must not also begin the native drag; the pointer drag owns it.
              if (touchPointer.current) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData("text/plain", entry.id);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
    >
      {onOpenEntry ? (
        <button type="button" data-part="entry-open" aria-label={entry.label} onClick={() => onOpenEntry(entry.id)}>
          {content}
        </button>
      ) : (
        <span data-part="entry-static">{content}</span>
      )}
      <DoneToggle entry={entry} strings={strings} />
      {entry.movable && onMove ? <MoveControl entry={entry} day={day} onMove={onMove} strings={strings} /> : null}
      <EntryActions entry={entry} strings={strings} />
    </li>
  );
}

function DayCell({
  day,
  focused,
  dragOver,
  registerCell,
  onCellKeyDown,
  onCellFocus,
  onOpenEntry,
  onMove,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTouchOver,
  strings,
}: {
  day: CalendarDayProps<ReactNode>;
  focused: boolean;
  dragOver: boolean;
  registerCell: (date: string, el: HTMLDivElement | null) => void;
  onCellKeyDown: (date: string, e: KeyboardEvent<HTMLDivElement>) => void;
  onCellFocus: (date: string) => void;
  onOpenEntry?: (id: string) => void;
  onMove?: (id: string, date: string) => void;
  onDragEnter?: (date: string) => void;
  onDragLeave?: (date: string) => void;
  onDrop?: (date: string, entryId: string) => void;
  onTouchOver: (date: string | undefined) => void;
  strings: CalendarStrings;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  // The renderer owns the cutoff (RFC 0008 item 7, the view's maxEntriesPerDay) and sends
  // `overflow` only for a day with hidden entries; a day without it shows every entry.
  const visible = expanded || day.overflow === undefined ? day.entries : day.entries.slice(0, day.overflow.shown);
  const hidden = day.entries.length - visible.length;
  const canDrop = !!onMove;
  return (
    <div
      ref={(el) => registerCell(day.date, el)}
      role="gridcell"
      aria-label={day.label}
      aria-current={day.isToday ? "date" : undefined}
      tabIndex={focused ? 0 : -1}
      onKeyDown={(e) => onCellKeyDown(day.date, e)}
      onFocus={() => onCellFocus(day.date)}
      data-part="day"
      data-date={day.date}
      data-in-month={day.inMonth}
      data-today={day.isToday}
      data-drag-over={canDrop && dragOver ? "true" : undefined}
      onDragOver={canDrop ? (e) => e.preventDefault() : undefined}
      onDragEnter={canDrop ? () => onDragEnter?.(day.date) : undefined}
      onDragLeave={canDrop ? () => onDragLeave?.(day.date) : undefined}
      onDrop={
        canDrop
          ? (e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDrop?.(day.date, id);
            }
          : undefined
      }
    >
      <div data-part="day-head">
        <span data-part="day-number">{day.dayOfMonth}</span>
        {/* Visible only in the phone agenda reflow, where the weekday column headers are gone. */}
        <span data-part="day-date">{day.label}</span>
        {day.isToday ? <span data-part="today-badge">{strings.todayLabel ?? "Today"}</span> : null}
      </div>
      <ul data-part="entries" aria-label={(strings.entriesAriaLabel ?? ((label: string) => `Entries for ${label}`))(day.label)}>
        {visible.map((entry) => (
          <EntryView key={entry.id} entry={entry} day={day.date} strings={strings} onTouchOver={onTouchOver} {...(onOpenEntry ? { onOpenEntry } : {})} {...(onMove ? { onMove } : {})} />
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" data-part="overflow" aria-expanded={expanded} onClick={() => setExpanded(true)}>
          {(strings.overflowLabel ?? ((count: number) => `+${count} more`))(hidden)}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Month/week grid, navigation and entries (RFC 0004). Layout, drawing and
 * every drag/move affordance belong here; the renderer owns data, range and
 * optimistic state (`@yadad/core` CalendarProps). Phone agenda reflow and the
 * full ARIA grid keyboard pattern land in v1 as these cards progress; the
 * data-part hooks below are already in place for them.
 */
export function Calendar({
  label,
  title,
  mode,
  modes,
  weekdays,
  days,
  legend,
  loading,
  notice,
  announcement,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
  onOpenEntry,
  onMove,
  strings = {},
}: CalendarProps<ReactNode> & { strings?: CalendarStrings }): ReactNode {
  const base = useId();
  const titleId = `${base}-title`;
  const noun = nounFor(mode);

  // Roving tabindex (ARIA grid pattern): one gridcell is in the Tab order at
  // a time; arrow keys move the "active" cell, Home/End to the week's ends,
  // PageUp/PageDown page the whole view via the same callbacks the nav
  // buttons use. Tab from the active cell reaches its own entries next,
  // since they're its DOM children — no extra wiring needed for that part.
  const dates = days.map((d) => d.date);
  const [focusedDate, setFocusedDate] = useState<string>(() => days.find((d) => d.isToday)?.date ?? days[0]?.date ?? "");
  const cellsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    if (!dates.includes(focusedDate)) {
      setFocusedDate(days.find((d) => d.isToday)?.date ?? days[0]?.date ?? "");
      pendingFocusRef.current = true;
    }
  }, [days]);

  useEffect(() => {
    if (pendingFocusRef.current) {
      pendingFocusRef.current = false;
      cellsRef.current.get(focusedDate)?.focus();
    }
  }, [focusedDate]);

  const registerCell = (date: string, el: HTMLDivElement | null): void => {
    if (el) cellsRef.current.set(date, el);
    else cellsRef.current.delete(date);
  };

  // Drag (desktop, card 9): the component never moves the entry itself —
  // it only calls onMove on drop. The renderer owns optimistic state and
  // reverts refused moves (RFC 0004); dragOverDate is purely the visible
  // drop-target highlight.
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const onDragEnter = (date: string): void => setDragOverDate(date);
  const onDragLeave = (date: string): void => setDragOverDate((cur) => (cur === date ? null : cur));
  const onTouchOver = (date: string | undefined): void => setDragOverDate(date ?? null);
  const onDrop = (date: string, entryId: string): void => {
    setDragOverDate(null);
    onMove?.(entryId, date);
  };

  const focusDelta = (from: string, delta: number): void => {
    const idx = dates.indexOf(from);
    if (idx < 0) return;
    const next = dates[Math.min(Math.max(idx + delta, 0), dates.length - 1)];
    if (next === undefined) return;
    pendingFocusRef.current = true;
    setFocusedDate(next);
  };

  const onCellKeyDown = (date: string, e: KeyboardEvent<HTMLDivElement>): void => {
    const idx = dates.indexOf(date);
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusDelta(date, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusDelta(date, -1);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusDelta(date, 7);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusDelta(date, -7);
        break;
      case "Home":
        e.preventDefault();
        focusDelta(date, -(idx % 7));
        break;
      case "End":
        e.preventDefault();
        focusDelta(date, 6 - (idx % 7));
        break;
      case "PageUp":
        e.preventDefault();
        pendingFocusRef.current = true;
        onPrevious();
        break;
      case "PageDown":
        e.preventDefault();
        pendingFocusRef.current = true;
        onNext();
        break;
      default:
        break;
    }
  };

  return (
    <section aria-label={label} data-yadad="calendar" data-part="root" data-mode={mode}>
      <header data-part="header">
        <h2 id={titleId} data-part="title" aria-live="polite">
          {title}
        </h2>
        <div role="group" aria-label={(strings.navGroupAriaLabel ?? ((calendarLabel: string) => `${calendarLabel} navigation`))(label)} data-part="nav">
          <button type="button" data-part="nav-previous" aria-label={(strings.previousAriaLabel ?? ((n: string) => `Previous ${n}`))(noun)} onClick={onPrevious}>
            {strings.previousLabel ?? "Previous"}
          </button>
          <button type="button" data-part="nav-today" onClick={onToday}>
            {strings.navTodayLabel ?? "Today"}
          </button>
          <button type="button" data-part="nav-next" aria-label={(strings.nextAriaLabel ?? ((n: string) => `Next ${n}`))(noun)} onClick={onNext}>
            {strings.nextLabel ?? "Next"}
          </button>
        </div>
        {modes.length > 1 ? (
          <div role="group" aria-label={strings.modeSwitchAriaLabel ?? "Calendar mode"} data-part="mode-switch">
            {modes.map((m) => (
              <button key={m.mode} type="button" aria-pressed={m.mode === mode} onClick={() => onModeChange(m.mode)} data-part="mode-button">
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {notice !== undefined ? <div data-part="notice">{notice}</div> : null}

      {/* key={announcement.seq}: a refusal can repeat the same text as a
          prior announcement (e.g. two refused moves in a row); without a
          key change screen readers won't re-announce unchanged text. */}
      <div role="status" aria-live="polite" data-part="status">
        {announcement ? <span key={announcement.seq}>{announcement.text}</span> : null}
      </div>

      {legend.length > 0 ? (
        <ul aria-label={strings.legendAriaLabel ?? "Colours"} data-part="legend">
          {legend.map((l) => (
            <li key={l.label} data-part="legend-item">
              <span data-part="legend-swatch" data-slot={l.slot} aria-hidden="true" />
              <span data-part="legend-label">{l.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div role="grid" aria-labelledby={titleId} aria-busy={loading ? true : undefined} data-part="grid">
        <div role="row" data-part="weekday-row">
          {weekdays.map((w) => (
            <span key={w.long} role="columnheader" aria-label={w.long} data-part="weekday">
              {w.short}
            </span>
          ))}
        </div>
        {weekRows(days).map((row, r) => (
          <div key={row[0]?.date ?? r} role="row" data-part="day-row">
            {row.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                focused={day.date === focusedDate}
                dragOver={day.date === dragOverDate}
                registerCell={registerCell}
                onCellKeyDown={onCellKeyDown}
                onCellFocus={setFocusedDate}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onTouchOver={onTouchOver}
                strings={strings}
                {...(onOpenEntry ? { onOpenEntry } : {})}
                {...(onMove ? { onMove } : {})}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
