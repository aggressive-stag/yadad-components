"use client";

import type { CalendarDayProps, CalendarEntry, CalendarMode, CalendarProps } from "@yadad/core";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "../../../internal/menu/v1/index.js";
import { Check } from "../../../internal/check/v1/index.js";
import { paletteSlot } from "../../../internal/swatch/v1/index.js";
import { useTouchDrag } from "../../../internal/touch-drag/v1/index.js";

/** How many entries show before a day collapses the rest behind "+N more" (card 11 issue 3: unbounded growth). */

/** The rolling family (RFC 0004 amendment): "1day".."6day". Anything else — including a mode an older core never heard of — is not rolling. */
const ROLLING = /^([1-6])day$/;
/** Days in a rolling "<n>day" mode; null for month, week and unknown modes (which render like week, card 33a Do 4). */
const rollingLength = (mode: CalendarMode): number | null => {
  const m = ROLLING.exec(mode);
  return m ? Number(m[1]) : null;
};
const nounFor = (mode: CalendarMode, strings: CalendarStrings): string => {
  const n = rollingLength(mode);
  return strings.periodNoun?.(mode) ?? (mode === "month" ? "month" : n === null ? "week" : `${n} days`);
};

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
  /** Phone navigator day button accessible name. Default: `${dayLabel}, ${count} entries`. */
  readonly navigatorDayAriaLabel?: (dayLabel: string, count: number) => string;
  /** Phone navigator group accessible name. Default: "Calendar navigator". */
  readonly navigatorAriaLabel?: string;
  /** Navigator grabber that expands the collapsed week strip to the month. Default: "Show full month". */
  readonly navigatorExpandLabel?: string;
  /** Navigator grabber that collapses the month back to the selected day's week. Default: "Show week only". */
  readonly navigatorCollapseLabel?: string;
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
  /** Mode switcher button text fallback (card 33a) for a mode whose host label is empty; the set's own default for a rolling "3day" is "3 days". A non-empty host `modes[].label` always wins. */
  readonly modeLabel?: (mode: CalendarMode) => string;
  /** The period noun in "Previous ${noun}" / "Next ${noun}" (card 33a). Default: "month", "week", or "3 days" for a rolling mode. */
  readonly periodNoun?: (mode: CalendarMode) => string;
  /** The "Earlier (N)" fold toggle (card 33b): N = past days carrying entries. Default: `Earlier (${n})`. */
  readonly earlierLabel?: (n: number) => string;
  /** Toggle accessible name (card 33b). Function so translations keep the count in the right place. Default: shows or hides the wording around `earlierLabel`. */
  readonly earlierAriaLabel?: (n: number) => string;
  /** Mode switcher group accessible name. Default: "Calendar mode". */
  readonly modeSwitchAriaLabel?: string;
  /** Colour legend accessible name. Default: "Colours". */
  readonly legendAriaLabel?: string;
}

/** Splits the flat day list into rows of `columns`, for role="row" grouping under role="grid". Month/week (and a mode an older core invented) use 7; a rolling "<n>day" period uses n — one row when the renderer sends exactly n days, two when it sends 2n, and so on (card 33a). */
function weekRows(days: readonly CalendarDayProps<ReactNode>[], columns = 7): CalendarDayProps<ReactNode>[][] {
  const rows: CalendarDayProps<ReactNode>[][] = [];
  for (let i = 0; i < days.length; i += columns) rows.push(days.slice(i, i + columns));
  return rows;
}

/** callback ref (stable): focus the element the moment it mounts */
const focusOnMount = (el: HTMLElement | null): void => {
  el?.focus();
};

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
          <button ref={triggerRef} type="button" data-part="move-trigger" data-yadad-focus-return="move" onClick={openMenu}>
            {strings.moveLabel ?? "Move to day…"}
          </button>
        ) : (
          <span data-part="move-panel" data-yadad-focus-return="move" role="group" aria-label={(strings.movePanelAriaLabel ?? ((label: string) => `Move ${label} to day`))(entry.label)} {...wrapperProps}>
            <label htmlFor={inputId} data-part="move-label">
              {(strings.moveToLabel ?? ((label: string) => `New day for ${label}`))(entry.label)}
            </label>
            <input id={inputId} type="date" data-part="move-input" ref={focusOnMount} value={value} onChange={(e) => setValue(e.target.value)} />
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
            <button ref={triggerRef} type="button" data-part="actions-trigger" data-yadad-focus-return="actions" aria-label={(strings.menuAriaLabel ?? ((label: string) => `Actions ${label}`))(entry.label)} onClick={openMenu}>
              {strings.menuLabel ?? "Actions…"}
            </button>
          ) : (
            <span data-part="actions-panel" data-yadad-focus-return="actions" role="group" aria-label={(strings.menuPanelAriaLabel ?? ((label: string) => `Actions ${label}`))(entry.label)} tabIndex={-1} ref={panelRef}>
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
      <Check
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
  weekday,
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
  earlier,
}: {
  day: CalendarDayProps<ReactNode>;
  /** This day's column header short name (the weekday of its row index). */
  weekday: { short: string; long: string } | undefined;
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
  /** Strictly before today under listStart:"today" (card 33b). The attribute
   *  alone changes nothing on a laptop — visibility is the phone container
   *  query's job (C5: attributes + CSS, never a wrapper element). */
  earlier?: boolean;
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
      data-earlier={earlier ? "true" : undefined}
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
        {/* Card 31d: the short weekday (from the set's own weekday names) —
            hidden by default, and in the phone agenda it is the day heading
            next to the bold day number ("Thu 29"), where the weekday column
            headers are gone. On a laptop the weekday row above the grid
            already carries it, so this stays hidden. */}
        <span data-part="day-weekday">{weekday?.short}</span>
        <span data-part="day-number">{day.dayOfMonth}</span>
        {/* Full-date heading: hidden by default, and hidden in the phone
            agenda since 31d (it repeated the month/year 31 times). The full
            form still reaches assistive tech: the gridcell's aria-label and
            the entries list below carry day.label verbatim. */}
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
 * Phone week/month navigator (card 32a): a compact map of the period —
 * single-letter weekday header, day number, a dot per busy day — rendered
 * before the grid and visible only inside the phone container (base
 * `display: none`). It shows *where* things are; the list below shows *what*
 * they are. 32b adds the collapsed/pinned week-strip form; this card is the
 * expanded month form.
 *
 * Presentation state only: the selected day is local (an open Actions panel
 * is the same kind of state), never `data-mode` — `CalendarMode` is a period,
 * not a rendering. Keyboard is its own roving tabindex over the day buttons
 * inside a `role="group"` — deliberately NOT the list grid's ARIA grid model
 * (`Calendar.tsx`'s gridcell roving, which this component must not touch).
 */
function Navigator({
  days,
  weekdays,
  strings,
  mode,
  onSelect,
}: {
  days: readonly CalendarDayProps<ReactNode>[];
  weekdays: readonly { short: string; long: string }[];
  strings: CalendarStrings;
  mode: "month" | "week";
  /** Notified with the tapped date (card 33b: a past-day tap opens the fold). */
  onSelect?: (date: string) => void;
}): ReactNode {
  // Default: today if the period contains it, else the first in-month day
  // (a week period can legitimately sit away from today).
  const [selectedDate, setSelectedDate] = useState<string>(
    () => days.find((d) => d.isToday)?.date ?? days.find((d) => d.inMonth)?.date ?? days[0]?.date ?? ""
  );
  // Card 32b (D9): collapsed is the DEFAULT — the pinned strip is a week,
  // not a month. Six rows plus a header is over a third of an 844px screen
  // to pin, so only the collapsed strip sticks and the expanded month
  // scrolls away like any other content.
  const [expanded, setExpanded] = useState(false);
  // Card 32c (M22): as the list scrolls, the strip shows the week being
  // READ — selectedDate follows the top-most visible day under the pinned
  // chrome, so the strip's pill, its Tab stop and its week all move
  // together. Observer only: it NEVER sets scroll position (no hijack), and
  // a day tap wins over it: the tap suppresses the observer until its own
  // scrollIntoView settles.
  const rowsId = useId();
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusRef = useRef(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  // The tap's own scroll owns the strip until it settles; the observer
  // waits it out rather than flickering the strip through intermediate weeks.
  const tapScrollRef = useRef(false);
  // The list lives beside the navigator (both under the calendar root);
  // both effects resolve it from navRef at run time, after commit.
  const listRoot = (): HTMLElement | null =>
    navRef.current?.closest('[data-yadad="calendar"]')?.querySelector<HTMLElement>('[data-part="grid"]') ?? null;

  useEffect(() => {
    if (!days.some((d) => d.date === selectedDate)) {
      setSelectedDate(days.find((d) => d.isToday)?.date ?? days.find((d) => d.inMonth)?.date ?? days[0]?.date ?? "");
      pendingFocusRef.current = true;
    }
  }, [days]);

  useEffect(() => {
    if (pendingFocusRef.current) {
      pendingFocusRef.current = false;
      buttonsRef.current.get(selectedDate)?.focus();
    }
  }, [selectedDate]);

  // Card 32c (M22): the strip follows the list. Observer only — it reads
  // which day is being read and re-anchors the collapsed strip; it never
  // calls scrollTo/scrollIntoView, so the user's scroll is never hijacked.
  // Three exits, all of which tear it down: unmount, leaving the phone
  // container (base hides the navigator, so a zero-height nav means the
  // container query is off), and expanded (all rows render anyway).
  //
  // The top band comes from the COMPUTED day-head inset — the same composed
  // sticky-top + strip-size the 32b audit enforces — not a constant, so a
  // host that re-tokens the chrome moves the observer line with it. A tap's
  // own scrollIntoView wins: callbacks are dropped until that scroll settles
  // (scroll events going quiet for a beat), which is what stops the strip
  // flickering through every intermediate week on the way to the tap target.
  useEffect(() => {
    if (expanded || mode === "week") return;
    if (typeof IntersectionObserver === "undefined") return; // jsdom without a stub
    const nav = navRef.current;
    const root = listRoot();
    if (!nav || !root) return;
    const cal = nav.closest('[data-yadad="calendar"]');
    if (!cal) return;

    let observer: IntersectionObserver | null = null;

    const start = (): void => {
      if (observer) return;
      // Hidden at base: the stylesheet's `display: none` IS the phone gate
      // (the container query flips it), so read that property rather than
      // layout — same signal, no forced reflow, and honest in jsdom where
      // no stylesheet loads and offsetHeight is a constant 0.
      if (getComputedStyle(nav).display === "none") return;
      const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-part="day"]')).filter(
        (el) => typeof el.dataset["date"] === "string"
      );
      if (cells.length === 0) return;
      // The scroll container is whatever actually scrolls the list — the
      // host's overflow box, or the viewport when the page itself scrolls.
      let scroller: HTMLElement | null = null;
      for (let p: HTMLElement | null = root.parentElement; p; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
          scroller = p;
          break;
        }
      }
      const head = root.querySelector<HTMLElement>('[data-part="day-head"]');
      const chrome = head ? parseFloat(getComputedStyle(head).insetBlockStart) : NaN;
      const top = Number.isFinite(chrome) ? chrome : 0;
      observer = new IntersectionObserver(
        (entries) => {
          if (tapScrollRef.current) return; // the tap's scroll owns the strip
          let best: { date: string; top: number } | null = null;
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const d = (e.target as HTMLElement).dataset["date"];
            if (!d) continue;
            const t = e.boundingClientRect.top;
            if (!best || t < best.top) best = { date: d, top: t };
          }
          if (!best) return;
          if (!days.some((d) => d.date === best!.date)) return;
          // The selection follows the reading — never via the pendingFocus
          // path, so the keyboard focus the user placed stays put (a scroll
          // must not move the Tab ring; the strip just changes week).
          setSelectedDate((cur) => (cur === best!.date ? cur : best!.date));
        },
        { root: scroller, rootMargin: `-${Math.max(top, 0)}px 0px -45% 0px`, threshold: 0 }
      );
      for (const c of cells) observer.observe(c);
    };

    const stop = (): void => {
      observer?.disconnect();
      observer = null;
    };

    start();
    // Phone-ness is a CONTAINER query, so the gate watches the container:
    // the nav's box appears/disappears when the container query flips
    // (display:none has no box), and a ResizeObserver reports that. A
    // viewport matchMedia would lie for hosts that size the container
    // independently of the window — the gallery's hosted stories do.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => (getComputedStyle(nav).display === "none" ? stop() : start()));
      ro.observe(nav);
    }
    return () => {
      ro?.disconnect();
      stop();
    };
  }, [days, expanded, mode]);

  // The tap's own scroll owns the strip until it settles (see above). A
  // settle = scroll events quiet for 120ms — ONE shared timer, rearmed on
  // every scroll event, so continuous user scrolling keeps suppression held
  // (a per-event timer would fire mid-scroll and let the observer steal the
  // strip). A tap that needs no scroll clears through the same timer.
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRootRef = useRef<HTMLElement | null>(null);
  const armSettle = (): void => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    tapScrollRef.current = true;
    settleTimerRef.current = setTimeout(() => {
      tapScrollRef.current = false;
      settleRootRef.current?.removeEventListener("scroll", armSettle);
      settleRootRef.current = null;
      settleTimerRef.current = null;
    }, 120);
  };
  // The grabber's toggle owns the strip through its OWN layout shift:
  // collapsing removes ~4 rows above the list, which clamps scrollTop,
  // which fires scroll events the observer would otherwise read as "the
  // user scrolled" and yank the selection off the day just tapped (measured:
  // 28 → 29 on collapse). Same suppression, same settle.
  const onToggle = (): void => {
    settleRootRef.current?.removeEventListener("scroll", armSettle);
    settleRootRef.current = listRoot();
    settleRootRef.current?.addEventListener("scroll", armSettle);
    armSettle();
    setExpanded((e) => !e);
  };
  useEffect(() => {
    return () => {
      // Unmount mid-tap: no orphan listener, no orphan timer holding a
      // stale suppression that the next mount would inherit as a ref anyway.
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleRootRef.current?.removeEventListener("scroll", armSettle);
      settleRootRef.current = null;
      settleTimerRef.current = null;
    };
  }, []);
  const select = (date: string): void => {
    setSelectedDate(date);
    // Card 33b Do 3: the parent may need to open the Earlier fold for a
    // past-day tap; its scrollIntoView below lands on the now-visible cell.
    onSelect?.(date);
    tapScrollRef.current = true;
    const root = listRoot();
    settleRootRef.current?.removeEventListener("scroll", armSettle);
    settleRootRef.current = root;
    root?.addEventListener("scroll", armSettle);
    // Search from the navigator's own root, not document.activeElement:
    // Safari never focuses buttons on click, so activeElement is a liar
    // there. dataset scan, not a selector — jsdom has no CSS global and
    // dates are ISO anyway.
    const navRoot = navRef.current?.closest('[data-yadad="calendar"]');
    const target = Array.from(navRoot?.querySelectorAll('[data-part="day"]') ?? []).find(
      (el) => (el as HTMLElement).dataset["date"] === date
    );
    target?.scrollIntoView({ block: "start" });
    armSettle();
  };

  const onDayKeyDown = (date: string, e: KeyboardEvent<HTMLButtonElement>): void => {
    const idx = days.findIndex((d) => d.date === date);
    if (idx < 0) return;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowLeft": next = idx - 1; break;
      case "ArrowRight": next = idx + 1; break;
      case "ArrowUp": next = idx - 7; break;
      case "ArrowDown": next = idx + 7; break;
      case "Home": next = 0; break;
      case "End": next = days.length - 1; break;
      default: return;
    }
    // Up from the first week leaves the navigator (Shift+Tab) and Down past
    // the last week enters the list — neither wraps and neither swallows
    // the keypress: outside the grid the browser keeps its own scroll.
    if (next < 0 || next >= days.length) return;
    e.preventDefault();
    const target = days[next];
    if (!target) return;
    pendingFocusRef.current = true;
    setSelectedDate(target.date);
  };

  const nameDay = strings.navigatorDayAriaLabel ?? ((dayLabel: string, count: number) => `${dayLabel}, ${count} entries`);

  const rows = weekRows(days);
  // The strip anchors on the selection (32c moves it as the list is read).
  // A selection the host removed (period change mid-render) falls back to
  // the first row rather than rendering an empty strip.
  const selectedIndex = days.findIndex((d) => d.date === selectedDate);
  const selectedRow = selectedIndex >= 0 ? Math.floor(selectedIndex / 7) : 0;
  const showAll = expanded || mode === "week";
  const visibleRows = showAll ? rows : rows.slice(selectedRow, selectedRow + 1);
  // aria-controls names exactly the row elements that render (collapsed:
  // the one visible week, not all five — a stale id points at nothing).
  const rowIds = visibleRows.map((row) => `${rowsId}-${rows.indexOf(row)}`);
  const rowIdOf = (row: (typeof visibleRows)[number]): string =>
    rowIds[visibleRows.indexOf(row)] ?? `${rowsId}-hidden`;

  return (
    <div
      ref={navRef}
      role="group"
      aria-label={strings.navigatorAriaLabel ?? "Calendar navigator"}
      data-part="navigator"
      /* "false" = the pinned strip form (a collapsed month, or week mode's
         single row — one row is a strip); CSS sticks it under the host's
         header. "true" = expanded month, which per D9 scrolls away. */
      data-expanded={expanded ? "true" : "false"}
    >
      {mode === "month" ? (
        <button
          type="button"
          data-part="navigator-toggle"
          aria-expanded={expanded}
          aria-controls={rowIds.join(" ")}
          onClick={onToggle}
        >
          {(expanded ? strings.navigatorCollapseLabel : strings.navigatorExpandLabel) ?? (expanded ? "Show week only" : "Show full month")}
        </button>
      ) : null}
      <div data-part="navigator-weekday-row">
        {weekdays.map((w, i) => (
          // Single letter (first grapheme, locale-safe — never a hard-coded
          // "S M T W T F S"), named by the full weekday for assistive tech.
          <span key={w.long} data-part="navigator-weekday" aria-label={w.long} title={w.long} data-first={i === 0 ? "true" : undefined}>
            {Array.from(w.short)[0] ?? w.short}
          </span>
        ))}
      </div>
      {visibleRows.map((row, r) => (
        <div key={row[0]?.date ?? r} id={rowIdOf(row)} data-part="navigator-row">
          {row.map((day) => (
            <button
              key={day.date}
              type="button"
              ref={(el) => {
                if (el) buttonsRef.current.set(day.date, el);
                else buttonsRef.current.delete(day.date);
              }}
              data-part="navigator-day"
              data-date={day.date}
              data-in-month={day.inMonth}
              data-today={day.isToday}
              data-has-entries={day.entries.length > 0 ? "true" : undefined}
              aria-pressed={day.date === selectedDate ? true : undefined}
              aria-label={nameDay(day.label, day.entries.length)}
              tabIndex={day.date === selectedDate ? 0 : -1}
              onClick={() => select(day.date)}
              onKeyDown={(e) => onDayKeyDown(day.date, e)}
            >
              <span data-part="navigator-day-number">{day.dayOfMonth}</span>
              {day.entries.length > 0 ? <span data-part="navigator-dot" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ))}
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
  listStart,
  strings = {},
}: CalendarProps<ReactNode> & { strings?: CalendarStrings }): ReactNode {
  const base = useId();
  const titleId = `${base}-title`;
  const noun = nounFor(mode, strings);
  // Grid columns (card 33a): a rolling "<n>day" mode has n columns; month,
  // week and any mode an older core never validated (rollingLength null)
  // keep the seven-day week. `weekdays` arrives one-per-column from the
  // renderer either way, so headers always match the columns.
  const columns = rollingLength(mode) ?? 7;

  // Card 33b: the "Earlier (N)" fold. Only listStart:"today" with today
  // actually IN the period folds anything — with "period", an absent key,
  // or a period away from today the component renders exactly as before
  // (no attributes, no toggle, keyboard untouched). The fold is collapsed
  // by default; the phone container query hides folded days, the laptop
  // never hides them (C5 — attributes + CSS, and the toggle lives outside
  // [data-part="grid"], never between a row and its cells).
  const hasToday = listStart === "today" && days.some((d) => d.isToday);
  const earlierDates = hasToday
    ? new Set(days.filter((d) => !d.isToday && d.date < (days.find((x) => x.isToday)?.date ?? "")).map((d) => d.date))
    : null;
  const earlierCount = earlierDates
    ? days.filter((d) => earlierDates.has(d.date) && d.entries.length > 0).length
    : 0;
  const [earlierExpanded, setEarlierExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  // The toggle is display:none at base and flex inside the phone query
  // (mirror of the 32a navigator). jsdom has no stylesheet, so a rendered
  // toggle reads display "" — the phone verdict; a real browser reports the
  // container query's answer, laptop included.
  const onPhoneWithFold = (): boolean => {
    if (!hasToday || !toggleRef.current) return false;
    return window.getComputedStyle(toggleRef.current).display !== "none";
  };
  // The CSS hides (a) every earlier day while collapsed and (b) earlier
  // days with NO entries outright (Do 1) — the keyboard skip must match
  // that rule exactly or roving focus lands on a display:none cell.
  const foldedDates = (): Set<string> | null => {
    if (!hasToday || !earlierDates || !onPhoneWithFold()) return null;
    return new Set(
      days
        .filter((d) => earlierDates.has(d.date) && (d.entries.length === 0 || !earlierExpanded))
        .map((d) => d.date),
    );
  };

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

  const focusDelta = (from: string, delta: number, scope?: "home" | "end"): void => {
    const idx = dates.indexOf(from);
    if (idx < 0) return;
    const folded = foldedDates();
    // No fold in play (no listStart, "period", period away from today,
    // expanded with every earlier day busy, or a laptop where the toggle
    // is display:none): EXACTLY the pre-33b walk, clamp and all — month/
    // week behavior and byte-identical DOM stay untouched.
    if (!folded || folded.size === 0) {
      const next = dates[Math.min(Math.max(idx + delta, 0), dates.length - 1)];
      if (next === undefined) return;
      pendingFocusRef.current = true;
      setFocusedDate(next);
      return;
    }
    // Fold on a phone: hidden earlier days are display:none, so the roving
    // tabindex must not land on one. Hidden days are a chronological
    // PREFIX of the period, so any step rightward/downward from a visible
    // cell stays visible — only Home into today's row and backward steps
    // can touch the fold. Those walk past it; a run that would leave the
    // visible tail (a fully hidden leading row) leaves the cursor put,
    // matching the grid's own "outside the grid the browser scrolls" rule.
    const skip = (d: string | undefined): boolean => (d === undefined ? false : folded.has(d));
    let target: number;
    if (scope === "home" || scope === "end") {
      const rowStart = idx - (idx % columns);
      const rowEnd = Math.min(rowStart + columns - 1, dates.length - 1);
      target = scope === "home" ? rowStart : rowEnd;
      const step = scope === "home" ? 1 : -1;
      while (skip(dates[target]) && target + step >= rowStart && target + step <= rowEnd) target += step;
      if (skip(dates[target])) return; // whole row folded: the cursor stays put
    } else {
      target = idx + delta;
      while (target >= 0 && target < dates.length && skip(dates[target])) target += delta > 0 ? 1 : -1;
      if (target < 0 || target >= dates.length) return; // past the visible tail: stay put
    }
    const next = dates[target];
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
        focusDelta(date, columns);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusDelta(date, -columns);
        break;
      case "Home":
        e.preventDefault();
        focusDelta(date, -(idx % columns), "home");
        break;
      case "End":
        e.preventDefault();
        focusDelta(date, columns - 1 - (idx % columns), "end");
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
                {m.label !== "" ? m.label : strings.modeLabel?.(m.mode) ?? (rollingLength(m.mode) === null ? m.mode : `${rollingLength(m.mode)} days`)}
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
              <span data-part="legend-swatch" data-slot={paletteSlot(l.color) ?? l.slot} aria-hidden="true" />
              <span data-part="legend-label">{l.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Phone navigator (card 32a): before the grid, outside it, hidden at
          base — the phone container query shows it. month/week/unknown only:
          rolling periods have no navigator (card 33a Do 5 — D4, the phone
          list already pages them), and an unknown mode gets week's form
          whole, per Do 4's "renders like week". */}
      {rollingLength(mode) === null ? (
        <Navigator
          days={days}
          weekdays={weekdays}
          strings={strings}
          mode={mode === "month" ? "month" : "week"}
          {...(hasToday
            ? {
                // Card 33b Do 3: tapping a past day in the navigator opens
                // the fold; the Navigator scrollIntoView then lands on the
                // day (React batches this setState before the scroll runs).
                // NOTE: no apostrophes in comments inside attribute braces —
                // scripts/theming.ts scanParts counts quotes, not comments.
                onSelect: (date: string) => {
                  if (earlierDates?.has(date)) setEarlierExpanded(true);
                },
              }
            : {})}
        />
      ) : null}

      {/* Card 33b: the "Earlier (N)" fold toggle — before the grid, outside
          it (C5: nothing may sit between a row and its cells), collapsed by
          default, shown only by the phone container query. N counts the past
          days that carry entries (the overdue ones). Laptop: display:none,
          the grid unchanged. */}
      {hasToday && earlierDates && earlierDates.size > 0 ? (
        <button
          ref={toggleRef}
          type="button"
          data-part="earlier-toggle"
          aria-expanded={earlierExpanded}
          onClick={() => setEarlierExpanded((e) => !e)}
          aria-label={(strings.earlierAriaLabel ?? ((n: number) => `${earlierExpanded ? "Hide" : "Show"} earlier days (${n})`))(earlierCount)}
        >
          {(strings.earlierLabel ?? ((n: number) => `Earlier (${n})`))(earlierCount)}
        </button>
      ) : null}

      <div
        role="grid"
        aria-labelledby={titleId}
        aria-busy={loading ? true : undefined}
        data-part="grid"
        /* Card 33a: the visual column count follows the row length (n for a
           rolling period, 7 otherwise) so calendar.css can lay out with
           repeat(var(--yadad-calendar-columns, 7), 1fr). month/week write
           nothing, so their computed style is byte-identical to before. */
        style={columns === 7 ? undefined : ({ "--yadad-calendar-columns": String(columns) } as CSSProperties)}
      >
        <div role="row" data-part="weekday-row">
          {weekdays.map((w) => (
            <span key={w.long} role="columnheader" aria-label={w.long} data-part="weekday">
              {w.short}
            </span>
          ))}
        </div>
        {weekRows(days, columns).map((row, r) => (
          <div key={row[0]?.date ?? r} role="row" data-part="day-row">
            {row.map((day, column) => (
              <DayCell
                key={day.date}
                day={day}
                weekday={weekdays[column]}
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
                {...(earlierDates && earlierDates.has(day.date) ? { earlier: true } : {})}
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
