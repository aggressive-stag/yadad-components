import type { CalendarDayProps, CalendarEntry, CalendarMode, CalendarProps } from "@yadad/core";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

/** How many entries show before a day collapses the rest behind "+N more" (card 11 issue 3: unbounded growth). */
const MAX_VISIBLE_ENTRIES = 3;

const nounFor = (mode: CalendarMode): string => (mode === "month" ? "month" : "week");

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
function MoveControl({ entry, day, onMove }: { entry: CalendarEntry<ReactNode>; day: string; onMove: (id: string, date: string) => void }): ReactNode {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(day);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const refocusTrigger = useRef(false);
  const inputId = useId();

  // The trigger unmounts while the panel is open, so a plain ref can't carry
  // focus across that transition: mark "focus it once it's back" and do the
  // focus() in an effect that runs after the re-render puts it back in the DOM.
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
        onClick={() => {
          setValue(day);
          setOpen(true);
        }}
      >
        Move to day…
      </button>
    );
  }

  const confirm = (): void => {
    onMove(entry.id, value);
    refocusTrigger.current = true;
    setOpen(false);
  };
  const cancel = (): void => {
    refocusTrigger.current = true;
    setOpen(false);
  };

  return (
    <span data-part="move-panel" role="group" aria-label={`Move ${entry.label} to day`}>
      <label htmlFor={inputId} data-part="move-label">
        New day for {entry.label}
      </label>
      <input
        id={inputId}
        type="date"
        data-part="move-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cancel();
          }
        }}
      />
      <button type="button" data-part="move-confirm" onClick={confirm}>
        Move
      </button>
      <button type="button" data-part="move-cancel" onClick={cancel}>
        Cancel
      </button>
    </span>
  );
}

function EntryView({
  entry,
  day,
  onOpenEntry,
  onMove,
}: {
  entry: CalendarEntry<ReactNode>;
  day: string;
  onOpenEntry?: (id: string) => void;
  onMove?: (id: string, date: string) => void;
}): ReactNode {
  const draggable = entry.movable && !!onMove;
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
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
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
      {entry.movable && onMove ? <MoveControl entry={entry} day={day} onMove={onMove} /> : null}
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
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? day.entries : day.entries.slice(0, MAX_VISIBLE_ENTRIES);
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
        {day.isToday ? <span data-part="today-badge">Today</span> : null}
      </div>
      <ul data-part="entries" aria-label={`Entries for ${day.label}`}>
        {visible.map((entry) => (
          <EntryView key={entry.id} entry={entry} day={day.date} {...(onOpenEntry ? { onOpenEntry } : {})} {...(onMove ? { onMove } : {})} />
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" data-part="overflow" aria-expanded={expanded} onClick={() => setExpanded(true)}>
          +{hidden} more
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
}: CalendarProps<ReactNode>): ReactNode {
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
        <div role="group" aria-label={`${label} navigation`} data-part="nav">
          <button type="button" data-part="nav-previous" aria-label={`Previous ${noun}`} onClick={onPrevious}>
            Previous
          </button>
          <button type="button" data-part="nav-today" onClick={onToday}>
            Today
          </button>
          <button type="button" data-part="nav-next" aria-label={`Next ${noun}`} onClick={onNext}>
            Next
          </button>
        </div>
        {modes.length > 1 ? (
          <div role="group" aria-label="Calendar mode" data-part="mode-switch">
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
        <ul aria-label="Colours" data-part="legend">
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
