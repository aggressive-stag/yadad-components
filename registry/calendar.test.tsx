// @vitest-environment jsdom
import type { CalendarDayProps, CalendarEntry, RecordActionItem } from "@yadad/core";
import { act, cleanup, createEvent, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CALENDAR_TODAY, calendarWeekdays } from "../gallery/src/fixtures.js";
import { Calendar } from "../sets/base/calendar/v1/Calendar.js";

afterEach(cleanup);

const action = (over: Partial<RecordActionItem> = {}): RecordActionItem => ({
  id: "a1",
  label: "Open",
  tone: "neutral",
  pending: false,
  onPress: () => {},
  ...over,
});

/** One month whose only entry on the anchor day carries the given actions. */
function entryWithActions(actions: readonly RecordActionItem[] | undefined, opts: { pending?: boolean; movable?: boolean; done?: CalendarEntry<ReactNode>["done"]; onOpenEntry?: (id: string) => void; onMove?: (id: string, d: string) => void } = {}) {
  const entry: CalendarEntry<ReactNode> = {
    id: "e1",
    label: "Bench press, 5x5 @ 70kg",
    content: <span>Bench press</span>,
    movable: opts.movable ?? false,
    pending: opts.pending ?? false,
    ...(actions ? { actions } : {}),
    ...(opts.done ? { done: opts.done } : {}),
  };
  const days = [{ date: CALENDAR_TODAY, dayOfMonth: 16, weekday: 5, label: "Friday 16 October 2026", inMonth: true, isToday: true, entries: [entry] }];
  const view = render(
    <Calendar
      label="Training"
      title="October 2026"
      mode="week"
      modes={[{ mode: "week", label: "Week" }]}
      weekdays={calendarWeekdays}
      days={days}
      legend={[]}
      loading={false}
      onModeChange={() => {}}
      onPrevious={() => {}}
      onNext={() => {}}
      onToday={() => {}}
      {...(opts.onOpenEntry ? { onOpenEntry: opts.onOpenEntry } : {})}
      {...(opts.onMove ? { onMove: opts.onMove } : {})}
    />,
  );
  const q = (sel: string): HTMLElement | null => view.container.querySelector(`[data-part="entry"] ${sel}`);
  return { ...view, q };
}

describe("record actions on calendar entries (RFC 0007)", () => {
  it("renders nothing when an entry has no actions", () => {
    const { q } = entryWithActions(undefined);
    expect(q('[data-part="actions"]')).toBeNull();
  });

  it("renders one action as a plain button named by its label and calls onPress", () => {
    const onPress = vi.fn();
    const { q } = entryWithActions([action({ onPress })]);
    const btn = q('[data-part="action"]') as HTMLButtonElement;
    expect(btn.textContent).toBe("Open");
    expect(q('[data-part="actions-trigger"]')).toBeNull();
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("marks the danger tone through data-tone (colour AND border in CSS)", () => {
    const { q } = entryWithActions([action({ id: "d", label: "Delete", tone: "danger" })]);
    expect(q('[data-part="action"]')?.getAttribute("data-tone")).toBe("danger");
  });

  it("disables ALL of an entry's buttons while any action is pending and says Working...", () => {
    const { q } = entryWithActions([action(), action({ id: "a2", label: "Delete", tone: "danger", pending: true })]);
    // Two actions live behind the menu: open it to see the buttons.
    fireEvent.click(q('[data-part="actions-trigger"]') as HTMLButtonElement);
    const buttons = [...(q('[data-part="actions-panel"]') as HTMLElement).querySelectorAll<HTMLButtonElement>("[data-part='action']")];
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    const status = q('[data-part="action-status"]');
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.textContent).toBe("Working...");
  });

  it("disables the buttons while the entry's MOVE is in flight too (entry.pending)", () => {
    const { q } = entryWithActions([action()], { pending: true });
    const btn = q('[data-part="action"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(q('[data-part="action-status"]')?.textContent).toBe("Working...");
  });

  it("collapses two or more actions into one menu: Enter opens, Tab reaches every action and Cancel, Escape returns focus to the trigger", () => {
    const { q } = entryWithActions([
      action(),
      action({ id: "a2", label: "Duplicate" }),
      action({ id: "a3", label: "Delete", tone: "danger" }),
    ]);
    const trigger = q('[data-part="actions-trigger"]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toBe("Actions…");
    // closed: no individual action buttons in the entry
    expect(q('[data-part="action"]')).toBeNull();

    trigger.focus();
    // a focused <button> fires click on Enter; jsdom does not synthesize it, so fire it as the browser would
    fireEvent.click(trigger);
    const panel = q('[data-part="actions-panel"]');
    expect(panel).not.toBeNull();
    const items = [...(panel as HTMLElement).querySelectorAll("button")].map((b) => b.textContent);
    expect(items).toEqual(["Open", "Duplicate", "Delete", "Cancel"]);
    expect(document.activeElement).toBe(panel);

    fireEvent.keyDown(panel as HTMLElement, { key: "Escape", bubbles: true });
    expect(q('[data-part="actions-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-part="actions-trigger"]'));
  });

  it("Cancel closes the menu and returns focus to the trigger", () => {
    const { q } = entryWithActions([action(), action({ id: "a2", label: "Duplicate" })]);
    const trigger = q('[data-part="actions-trigger"]') as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    const cancel = q('[data-part="actions-cancel"]') as HTMLButtonElement;
    fireEvent.click(cancel);
    expect(q('[data-part="actions-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-part="actions-trigger"]'));
  });

  it("names the trigger with the entry's accessible name", () => {
    const { q } = entryWithActions([action(), action({ id: "a2", label: "Duplicate" })]);
    const trigger = q('[data-part="actions-trigger"]') as HTMLButtonElement;
    expect(trigger.getAttribute("aria-label")).toBe("Actions Bench press, 5x5 @ 70kg");
  });

  it("sits on the entry whether or not it is movable (no move control: still actions)", () => {
    const { q } = entryWithActions([action()], { movable: false });
    expect(q('[data-part="action"]')).not.toBeNull();
    expect(q('[data-part="move-trigger"]')).toBeNull();
  });
});

describe("calendar touch drag", () => {
  class FakePointerEvent extends MouseEvent {
    pointerType: string;
    pointerId = 1;
    isPrimary = true;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, { bubbles: true, cancelable: true, ...init });
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  const fire = (target: Element | Document, type: string, pointerType = "touch", init: PointerEventInit = {}): void => {
    act(() => void target.dispatchEvent(new FakePointerEvent(type, { pointerType, ...init })));
  };
  let under: Element | null = null;
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("innerHeight", 800);
    Object.defineProperty(document, "scrollingElement", { configurable: true, value: document.documentElement });
    document.elementFromPoint = () => under;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.documentElement.scrollTop = 0;
    under = null;
  });

  const days = (movable: boolean): CalendarDayProps<ReactNode>[] =>
    ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"].map((date, i) => ({
      date,
      dayOfMonth: 16 + i,
      weekday: 5 + i,
      label: `Day ${date}`,
      inMonth: true,
      isToday: i === 0,
      entries: i === 0 ? [{ id: "e1", label: "Bench press", content: <span>Bench press</span>, movable, pending: false }] : [],
    }));
  function setup(onMove: ((id: string, date: string) => void) | undefined, movable = true, onOpenEntry?: (id: string) => void) {
    const view = render(
      <Calendar
        label="Training"
        title="October 2026"
        mode="week"
        modes={[{ mode: "week", label: "Week" }]}
        weekdays={calendarWeekdays}
        days={days(movable)}
        legend={[]}
        loading={false}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        {...(onMove ? { onMove } : {})}
        {...(onOpenEntry ? { onOpenEntry } : {})}
      />,
    );
    const q = (sel: string): HTMLElement => view.container.querySelector(sel) as HTMLElement;
    return { ...view, q, day: (d: string) => q(`[data-part="day"][data-date="${d}"]`) };
  }

  it("long-press, move and release over another day calls onMove once", () => {
    const onMove = vi.fn();
    const { q, day } = setup(onMove);
    under = day("2026-10-19");
    fire(q('[data-part="entry"]'), "pointerdown", "touch", { clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(350));
    expect(q('[data-part="entry"]').getAttribute("data-dragging")).toBe("true");
    fire(document, "pointermove", "touch", { clientX: 200, clientY: 5 });
    expect(day("2026-10-19").getAttribute("data-drag-over")).toBe("true");
    fire(document, "pointerup", "touch", { clientX: 200, clientY: 5 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith("e1", "2026-10-19");
    expect(day("2026-10-19").getAttribute("data-drag-over")).toBeNull();
  });

  it("scrolls the page near the bottom edge so a day off-screen can be reached (agenda layout)", () => {
    const onMove = vi.fn();
    const { q, day } = setup(onMove);
    under = day("2026-10-18");
    fire(q('[data-part="entry"]'), "pointerdown", "touch", { clientX: 5, clientY: 790 });
    act(() => void vi.advanceTimersByTime(350));
    const before = document.documentElement.scrollTop;
    act(() => frames.splice(0).forEach((cb) => cb(0)));
    expect(document.documentElement.scrollTop).toBeGreaterThan(before);
    fire(document, "pointerup", "touch", { clientX: 5, clientY: 790 });
    expect(onMove).toHaveBeenCalledWith("e1", "2026-10-18");
  });

  it("never calls onMove for a swipe, a cancel, the own day, a mouse, a locked entry or no onMove", () => {
    const onMove = vi.fn();
    const { q, day } = setup(onMove);
    const src = q('[data-part="entry"]');
    under = day("2026-10-19");
    fire(src, "pointerdown", "touch", { clientX: 5, clientY: 5 });
    fire(document, "pointermove", "touch", { clientX: 60, clientY: 5 });
    act(() => void vi.advanceTimersByTime(500));
    fire(document, "pointerup");
    fire(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointercancel");
    under = day("2026-10-16");
    fire(src, "pointerdown");
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointerup");
    under = day("2026-10-19");
    fire(src, "pointerdown", "mouse");
    act(() => void vi.advanceTimersByTime(1000));
    fire(document, "pointerup", "mouse");
    cleanup();
    const locked = setup(onMove, false);
    under = locked.day("2026-10-19");
    fire(locked.q('[data-part="entry"]'), "pointerdown");
    act(() => void vi.advanceTimersByTime(1000));
    fire(document, "pointerup");
    cleanup();
    const noMove = setup(undefined);
    under = noMove.day("2026-10-19");
    fire(noMove.q('[data-part="entry"]'), "pointerdown");
    act(() => void vi.advanceTimersByTime(1000));
    fire(document, "pointerup");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does not open the entry from the click that follows a drag, but opens it on a plain tap", () => {
    const onOpen = vi.fn();
    const { q, day } = setup(vi.fn(), true, onOpen);
    const open = q('[data-part="entry-open"]');
    under = day("2026-10-19");
    fire(q('[data-part="entry"]'), "pointerdown", "touch", { clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(350));
    fire(document, "pointerup", "touch", { clientX: 5, clientY: 5 });
    fireEvent.click(open);
    expect(onOpen).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    fire(q('[data-part="entry"]'), "pointerdown", "touch", { clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(100));
    fire(document, "pointerup", "touch", { clientX: 5, clientY: 5 });
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("stops the browser's own drag after a touch press", () => {
    const { q } = setup(vi.fn());
    fire(q('[data-part="entry"]'), "pointerdown");
    const e = createEvent.dragStart(q('[data-part="entry"]'), { dataTransfer: { setData() {}, getData: () => "", effectAllowed: "" } });
    fireEvent(q('[data-part="entry"]'), e);
    expect(e.defaultPrevented).toBe(true);
  });
});

describe("completion checkbox on calendar entries (RFC 0008 item 3)", () => {
  it("renders nothing without done", () => {
    const { q } = entryWithActions(undefined);
    expect(q('[data-part="done"]')).toBeNull();
  });

  it("renders a native checkbox named for the entry, reflecting checked", () => {
    const { q, getByRole } = entryWithActions(undefined, { done: { checked: true, disabled: false, toggle: () => {} } });
    const box = q('[data-part="done-input"]') as HTMLInputElement;
    expect(box.type).toBe("checkbox");
    expect(box.checked).toBe(true);
    expect(getByRole("checkbox", { name: "Done: Bench press, 5x5 @ 70kg" })).toBe(box);
  });

  it("calls toggle once per change and never opens the entry or moves it", () => {
    const toggle = vi.fn();
    const onOpenEntry = vi.fn();
    const onMove = vi.fn();
    const { q } = entryWithActions(undefined, { movable: true, onOpenEntry, onMove, done: { checked: false, disabled: false, toggle } });
    fireEvent.click(q('[data-part="done-input"]') as HTMLInputElement);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(onOpenEntry).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does not toggle when disabled", () => {
    const toggle = vi.fn();
    const { q } = entryWithActions(undefined, { done: { checked: false, disabled: true, toggle } });
    const box = q('[data-part="done-input"]') as HTMLInputElement;
    expect(box.disabled).toBe(true);
    // A disabled native checkbox takes no click or Space in a browser (jsdom's synthetic click ignores that), so the attribute is the contract.
    expect(toggle).not.toHaveBeenCalled();
  });

  it("is a tab stop after the open-entry button and keeps pointer-down from the entry's touch drag", () => {
    const { container, q } = entryWithActions(undefined, { movable: true, onOpenEntry: () => {}, onMove: () => {}, done: { checked: false, disabled: false, toggle: () => {} } });
    const stops = [...container.querySelectorAll<HTMLElement>('[data-part="entry"] button, [data-part="entry"] input')].map((el) => el.getAttribute("data-part"));
    expect(stops.slice(0, 2)).toEqual(["entry-open", "done-input"]);
    const box = q('[data-part="done-input"]') as HTMLInputElement;
    const down = createEvent.pointerDown(box, { pointerType: "touch" });
    const stop = vi.spyOn(down, "stopPropagation");
    fireEvent(box, down);
    expect(stop).toHaveBeenCalled();
  });
});

describe("busy-day cutoff comes from the renderer (RFC 0008 item 7)", () => {
  const entryOf = (n: number): CalendarEntry<ReactNode> => ({ id: `e${n}`, label: `Entry ${n}`, content: <span>Entry {n}</span>, movable: false, pending: false });
  const renderDay = (count: number, overflow?: { shown: number; hidden: number }) => {
    const days = [{ date: CALENDAR_TODAY, dayOfMonth: 16, weekday: 5, label: "Friday 16 October 2026", inMonth: true, isToday: true, entries: Array.from({ length: count }, (_, i) => entryOf(i + 1)), ...(overflow ? { overflow } : {}) }];
    return render(
      <Calendar label="Training" title="October 2026" mode="week" modes={[{ mode: "week", label: "Week" }]} weekdays={calendarWeekdays} days={days} legend={[]} loading={false} onModeChange={() => {}} onPrevious={() => {}} onNext={() => {}} onToday={() => {}} />,
    );
  };

  it("shows overflow.shown entries and a +N more button for the hidden ones", () => {
    const { container } = renderDay(7, { shown: 5, hidden: 2 });
    expect(container.querySelectorAll('[data-part="entry"]')).toHaveLength(5);
    expect(container.querySelector('[data-part="overflow"]')?.textContent).toBe("+2 more");
  });

  it("a cutoff above the old fixed 3 shows all of them with no button when nothing is hidden", () => {
    const { container } = renderDay(5);
    expect(container.querySelectorAll('[data-part="entry"]')).toHaveLength(5);
    expect(container.querySelector('[data-part="overflow"]')).toBeNull();
  });

  it("a cutoff of 1 shows one entry", () => {
    const { container } = renderDay(3, { shown: 1, hidden: 2 });
    expect(container.querySelectorAll('[data-part="entry"]')).toHaveLength(1);
    expect(container.querySelector('[data-part="overflow"]')?.textContent).toBe("+2 more");
  });

  it("expanding the day shows every entry", () => {
    const { container } = renderDay(7, { shown: 5, hidden: 2 });
    fireEvent.click(container.querySelector('[data-part="overflow"]') as HTMLElement);
    expect(container.querySelectorAll('[data-part="entry"]')).toHaveLength(7);
    expect(container.querySelector('[data-part="overflow"]')).toBeNull();
  });
});

describe("Calendar legend colour", () => {
  it("paints a legend swatch from its palette colour, else its slot", async () => {
    const { COLOR_PALETTE } = await import("@yadad/core");
    const view = render(
      <Calendar
        label="Training"
        title="October 2026"
        mode="week"
        modes={[{ mode: "week", label: "Week" }]}
        weekdays={calendarWeekdays}
        days={[]}
        legend={[
          { slot: 0, label: "Coloured", color: COLOR_PALETTE[3]!.hex },
          { slot: 2, label: "Plain" },
        ]}
        loading={false}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );
    const slots = [...view.container.querySelectorAll('[data-part="legend-swatch"]')].map((e) => e.getAttribute("data-slot"));
    expect(slots).toEqual(["3", "2"]);
  });
});

describe("focus return markers and panel focus", () => {
  it("marks the Actions and Move triggers and their panels, and focuses the date input on open", () => {
    const { q } = entryWithActions([action(), action({ id: "a2", label: "Duplicate" })], { movable: true, onMove: () => {} });
    fireEvent.click(q('[data-part="actions-trigger"]') as HTMLElement);
    expect(q('[data-part="actions-panel"]')?.getAttribute("data-yadad-focus-return")).toBe("actions");
    fireEvent.click(q('[data-part="actions-cancel"]') as HTMLElement);
    expect(q('[data-part="actions-trigger"]')?.getAttribute("data-yadad-focus-return")).toBe("actions");
    const move = q('[data-part="move-trigger"]') as HTMLElement;
    expect(move.getAttribute("data-yadad-focus-return")).toBe("move");
    fireEvent.click(move);
    expect(q('[data-part="move-panel"]')?.getAttribute("data-yadad-focus-return")).toBe("move");
    expect(document.activeElement).toBe(q('[data-part="move-input"]'));
    fireEvent.click(q('[data-part="move-cancel"]') as HTMLElement);
    expect(document.activeElement).toBe(q('[data-part="move-trigger"]'));
  });
});

describe("phone navigator (card 32a)", () => {
  /** One week period, Tue–Mon around the anchor, entry on one day. */
  function navRender(over: { strings?: import("../sets/base/calendar/v1/Calendar.js").CalendarStrings; mode?: "month" | "week" } = {}) {
    const base = "2026-10-14";
    const days: CalendarDayProps<ReactNode>[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${String(14 + i).padStart(2, "0")}`,
      dayOfMonth: 14 + i,
      weekday: (2 + i) % 7,
      label: `Day ${14 + i} October 2026`,
      inMonth: true,
      isToday: i === 2, // 2026-10-16
      entries: i === 4 ? [{ id: "e9", label: "Swim", content: <span>Swim</span>, movable: false, pending: false }] : [],
    }));
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function () {};
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    const view = render(
      <Calendar
        label="Training"
        title="October 2026"
        mode={over.mode ?? "week"}
        modes={[{ mode: "week", label: "Week" }]}
        weekdays={calendarWeekdays}
        days={days}
        legend={[]}
        loading={false}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        {...(over.strings ? { strings: over.strings } : {})}
      />,
    );
    const nav = view.container.querySelector('[data-part="navigator"]') as HTMLElement;
    return { ...view, nav, spy, base, days };
  }

  it("renders the navigator with a single-letter header, full aria-labels", () => {
    const { nav } = navRender();
    expect(nav).toBeTruthy();
    const cells = Array.from(nav.querySelectorAll("[data-part='navigator-weekday']"));
    expect(cells).toHaveLength(7);
    // The header row is the weekdays prop (the columns), not the period's
    // days: the fixture's week starts Sunday.
    expect(cells.map((c) => (c.textContent ?? "").trim())).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
    expect(cells[0]?.getAttribute("aria-label")).toBe(calendarWeekdays[0]?.long);
  });

  it("derives the letter from weekdays[i].short, not a hard-coded row", () => {
    // Spanish short names would come out D L M J V S D — any hard-coded
    // "S M T W T F S" would betray them.
    const view = render(
      <Calendar label="T" title="O" mode="week" modes={[{ mode: "week", label: "W" }]}
        weekdays={[
          { short: "mié", long: "miércoles" }, { short: "jue", long: "jueves" }, { short: "vie", long: "viernes" },
          { short: "sáb", long: "sábado" }, { short: "dom", long: "domingo" }, { short: "lun", long: "lunes" },
          { short: "mar", long: "martes" },
        ]}
        days={Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${14 + i}`, dayOfMonth: 14 + i, weekday: i, label: `d${i}`, inMonth: true, isToday: false, entries: [] }))}
        legend={[]} loading={false} onModeChange={() => {}} onPrevious={() => {}} onNext={() => {}} onToday={() => {}} />,
    );
    const letters = Array.from(view.container.querySelectorAll("[data-part='navigator-weekday']")).map((c) => (c.textContent ?? "").trim());
    expect(letters).toEqual(["m", "j", "v", "s", "d", "l", "m"]);
  });

  it("one dot iff the day has entries; count lives in the name", () => {
    const { nav } = navRender();
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    expect(buttons).toHaveLength(7);
    for (const btn of buttons) {
      const hasDot = !!btn.querySelector("[data-part='navigator-dot']");
      const busy = btn.getAttribute("data-date") === "2026-10-18";
      expect(hasDot).toBe(busy);
    }
    expect(buttons[4]?.getAttribute("aria-label")).toBe("Day 18 October 2026, 1 entries");
    expect(buttons[0]?.getAttribute("aria-label")).toBe("Day 14 October 2026, 0 entries");
  });

  it("strings.navigatorDayAriaLabel overrides the name", () => {
    const { nav } = navRender({ strings: { navigatorDayAriaLabel: (label, count) => `${label} — ${count}` } });
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    expect(buttons[4]?.getAttribute("aria-label")).toBe("Day 18 October 2026 — 1");
  });

  it("today is marked; exactly one day is selected and tabbable", () => {
    const { nav } = navRender();
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    const today = buttons.find((b) => b.getAttribute("data-today") === "true");
    expect(today?.getAttribute("data-date")).toBe("2026-10-16");
    const pressed = buttons.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.getAttribute("data-date")).toBe("2026-10-16"); // default: today in period
    expect(buttons.filter((b) => b.tabIndex === 0)).toEqual([pressed[0]]);
  });

  it("default selection falls back to the first in-month day", () => {
    const { nav } = navRender();
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    const noToday = buttons.map((b) => b);
    expect(noToday.some((b) => b.getAttribute("aria-pressed") === "true")).toBe(true);
  });

  it("tapping a day scrolls the matching list day into view", () => {
    const { nav, spy } = navRender();
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    const target = buttons.find((b) => b.getAttribute("data-date") === "2026-10-18") as HTMLElement;
    fireEvent.click(target);
    expect(spy).toHaveBeenCalledTimes(1);
    const scrolled = (spy.mock.instances as HTMLElement[])[0] as HTMLElement;
    expect(scrolled.getAttribute("data-part")).toBe("day");
    expect(scrolled.getAttribute("data-date")).toBe("2026-10-18");
    // selection followed the tap
    const pressed = Array.from(nav.querySelectorAll("[data-part='navigator-day'][aria-pressed='true']"));
    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.getAttribute("data-date")).toBe("2026-10-18");
  });

  it("arrow keys move the roving focus within the navigator only", () => {
    const { nav } = navRender();
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-part='navigator-day']"));
    const focused = buttons.find((b) => b.tabIndex === 0) as HTMLElement;
    focused.focus();
    fireEvent.keyDown(focused, { key: "ArrowRight" });
    const moved = buttons.find((b) => b.tabIndex === 0);
    expect(moved?.getAttribute("data-date")).toBe("2026-10-17");
    // up a week from row 0 leaves the grid: no wrap, focus unchanged model
    fireEvent.keyDown(moved as HTMLElement, { key: "ArrowUp" });
    expect(buttons.find((b) => b.tabIndex === 0)?.getAttribute("data-date")).toBe("2026-10-17");
  });

  it("the list grid's roving tabindex is untouched by the navigator", () => {
    const { container } = navRender();
    const cells = Array.from(container.querySelectorAll<HTMLElement>('[data-part="day"][role="gridcell"]'));
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });
});

describe("navigator week strip (card 32b)", () => {
  /** Five-week month fixture; selection starts on today (row 0). */
  function stripRender(over: { strings?: import("../sets/base/calendar/v1/Calendar.js").CalendarStrings } = {}) {
    const days: CalendarDayProps<ReactNode>[] = Array.from({ length: 35 }, (_, i) => ({
      date: `2026-10-${String(1 + i).padStart(2, "0")}`,
      dayOfMonth: 1 + i,
      weekday: i % 7,
      label: `Day ${1 + i} October 2026`,
      inMonth: i >= 3,
      isToday: i === 15, // row 2
      entries: [],
    }));
    Element.prototype.scrollIntoView = vi.fn();
    const view = render(
      <Calendar
        label="Training"
        title="October 2026"
        mode="month"
        modes={[{ mode: "month", label: "Month" }]}
        weekdays={calendarWeekdays}
        days={days}
        legend={[]}
        loading={false}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        {...(over.strings ? { strings: over.strings } : {})}
      />,
    );
    const nav = view.container.querySelector('[data-part="navigator"]') as HTMLElement;
    const toggle = view.container.querySelector('[data-part="navigator-toggle"]') as HTMLButtonElement;
    const rows = () => Array.from(nav.querySelectorAll('[data-part="navigator-row"]'));
    return { ...view, nav, toggle, rows };
  }

  it("collapses by default to the selected day's week, declared as the pinned strip", () => {
    const { nav, toggle, rows } = stripRender();
    expect(nav.getAttribute("data-expanded")).toBe("false");
    expect(rows()).toHaveLength(1);
    // selected day is today (row 2): the one visible row is week 2
    expect(rows()[0]?.querySelectorAll("[data-part='navigator-day']")).toHaveLength(7);
    expect(rows()[0]?.querySelector("[data-part='navigator-day'][data-today='true']")).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("the grabber controls exactly the rendered rows", () => {
    const { nav, toggle, rows } = stripRender();
    const ids = (toggle.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    expect(ids.length).toBe(1);
    const el = nav.ownerDocument.getElementById(ids[0] ?? "");
    expect(el).toBe(rows()[0]);
  });

  it("expanding shows every week, announces it, and names all rows", () => {
    const { toggle, rows } = stripRender();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(rows()).toHaveLength(5);
    const ids = (toggle.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    expect(ids).toHaveLength(5);
    for (const id of ids) expect(document.getElementById(id)).toBeTruthy();
  });

  it("expanding moves neither focus nor list scroll; collapsing returns to the selected week", () => {
    const { nav, toggle, rows } = stripRender();
    const scrollSpy = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    toggle.focus();
    fireEvent.click(toggle); // expand
    expect(document.activeElement).toBe(toggle);
    expect(scrollSpy).not.toHaveBeenCalled();
    // select a day in the last week while expanded
    const late = nav.querySelector("[data-part='navigator-day'][data-date='2026-10-31']") as HTMLButtonElement;
    fireEvent.click(late);
    fireEvent.click(toggle); // collapse again
    expect(rows()).toHaveLength(1);
    const shown = Array.from(rows()[0]?.querySelectorAll("[data-part='navigator-day']") ?? []);
    expect(shown.some((b) => b.getAttribute("data-date") === "2026-10-31")).toBe(true);
  });

  it("week mode is one pinned row with no grabber", () => {
    const view = render(
      <Calendar label="W" title="W" mode="week" modes={[{ mode: "week", label: "Week" }]}
        weekdays={calendarWeekdays}
        days={Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${14 + i}`, dayOfMonth: 14 + i, weekday: i, label: `d${i}`, inMonth: true, isToday: false, entries: [] }))}
        legend={[]} loading={false} onModeChange={() => {}} onPrevious={() => {}} onNext={() => {}} onToday={() => {}} />,
    );
    const nav = view.container.querySelector('[data-part="navigator"]') as HTMLElement;
    expect(view.container.querySelector('[data-part="navigator-toggle"]')).toBeNull();
    expect(nav.getAttribute("data-expanded")).toBe("false"); // the strip form
    expect(nav.querySelectorAll("[data-part='navigator-row']")).toHaveLength(1);
  });

  it("strings.navigatorExpandLabel / navigatorCollapseLabel replace the grabber's name", () => {
    const { toggle } = stripRender({ strings: { navigatorExpandLabel: "Todo el mes", navigatorCollapseLabel: "Solo la semana" } });
    expect(toggle.textContent).toBe("Todo el mes");
    fireEvent.click(toggle);
    expect(toggle.textContent).toBe("Solo la semana");
  });
});

describe("the strip follows the list (card 32c)", () => {
  /** Controllable stand-ins: jsdom ships neither observer, so the card's
   *  contract (observer only, tap wins, teardown) is otherwise untested. */
  class FakeIO {
    static instances: FakeIO[] = [];
    observed: Element[] = [];
    disconnected = false;
    constructor(
      private cb: IntersectionObserverCallback,
      public init: IntersectionObserverInit | undefined,
    ) {
      FakeIO.instances.push(this);
    }
    observe(el: Element): void {
      this.observed.push(el);
    }
    unobserve(): void {}
    disconnect(): void {
      this.disconnected = true;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    /** Deliver `dates` as simultaneously visible, topmost first. */
    fire(dates: { date: string; top: number }[]): void {
      const entries = dates.map((d) => ({
        isIntersecting: true,
        target: document.querySelector(`[data-part="day"][data-date="${d.date}"]`) as Element,
        boundingClientRect: { top: d.top },
      })) as unknown as IntersectionObserverEntry[];
      act(() => {
        this.cb(entries, this as unknown as IntersectionObserver);
      });
    }
  }
  class FakeRO {
    static instances: FakeRO[] = [];
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
      FakeRO.instances.push(this);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    trigger(): void {
      this.cb([], this as unknown as ResizeObserver);
    }
  }

  function followRender() {
    const days: CalendarDayProps<ReactNode>[] = Array.from({ length: 35 }, (_, i) => ({
      date: `2026-10-${String(1 + i).padStart(2, "0")}`,
      dayOfMonth: 1 + i,
      weekday: i % 7,
      label: `Day ${1 + i} October 2026`,
      inMonth: true,
      isToday: i === 15, // row 2 — the strip's initial week
      entries: [],
    }));
    Element.prototype.scrollIntoView = vi.fn();
    // If the component ever tries to MOVE the list, these catch the hijack.
    const scrollToSpy = vi.fn();
    const scrollBySpy = vi.fn();
    Element.prototype.scrollTo = scrollToSpy as unknown as typeof Element.prototype.scrollTo;
    Element.prototype.scrollBy = scrollBySpy as unknown as typeof Element.prototype.scrollBy;
    FakeIO.instances = [];
    FakeRO.instances = [];
    const view = render(
      <Calendar
        label="Training"
        title="October 2026"
        mode="month"
        modes={[{ mode: "month", label: "Month" }]}
        weekdays={calendarWeekdays}
        days={days}
        legend={[]}
        loading={false}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );
    const nav = view.container.querySelector('[data-part="navigator"]') as HTMLElement;
    const toggle = view.container.querySelector('[data-part="navigator-toggle"]') as HTMLButtonElement;
    const rows = () => Array.from(nav.querySelectorAll('[data-part="navigator-row"]'));
    const datesShown = (): string[] =>
      Array.from(rows()[0]?.querySelectorAll("[data-part='navigator-day']") ?? []).map((b) => b.getAttribute("data-date") ?? "");
    return { ...view, nav, toggle, rows, datesShown, scrollToSpy, scrollBySpy };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("watches exactly the list's day cells while the phone navigator shows", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    followRender();
    expect(FakeIO.instances).toHaveLength(1);
    const io = FakeIO.instances[0];
    if (!io) throw new Error("no observer constructed");
    expect(io.observed).toHaveLength(35);
    expect(io.observed.every((el) => el.matches('[data-part="day"][data-date]'))).toBe(true);
    // and the follow band derives from the chrome, as a negative top margin
    expect(String(io.init?.rootMargin ?? "")).toMatch(/^-\d+(\.\d+)?px 0px -45% 0px$/);
  });

  it("reading the 27th walks the strip to the 27th's week, focus untouched", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    const { nav, datesShown, toggle } = followRender();
    expect(datesShown()).toContain("2026-10-16"); // row 2
    const io = FakeIO.instances[0];
    if (!io) throw new Error("no observer constructed");
    toggle.focus();
    io.fire([{ date: "2026-10-27", top: 130 }, { date: "2026-10-28", top: 320 }]);
    // the top-most visible day wins, and selection + pill + Tab stop move with it
    expect(datesShown()).toContain("2026-10-27");
    const pill = nav.querySelector("[data-part='navigator-day'][data-date='2026-10-27']") as HTMLButtonElement;
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(toggle); // a scroll never steals focus
  });

  it("observer only: the component never sets scroll position", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    const { scrollToSpy, scrollBySpy, datesShown } = followRender();
    const io = FakeIO.instances[0];
    if (!io) throw new Error("no observer constructed");
    for (const date of ["2026-10-20", "2026-10-24", "2026-10-27", "2026-10-31"]) {
      io.fire([{ date, top: 130 }]);
      expect(datesShown()).toContain(date);
    }
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollBySpy).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("a day tap wins over the observer until its scroll settles", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    vi.useFakeTimers();
    const { datesShown } = followRender();
    const nav = document.querySelector('[data-part="navigator"]') as HTMLElement;
    const io = FakeIO.instances[0];
    if (!io) throw new Error("no observer constructed");
    const day20 = nav.querySelector("[data-part='navigator-day'][data-date='2026-10-20']") as HTMLButtonElement;
    fireEvent.click(day20); // the tap's own scrollIntoView starts
    io.fire([{ date: "2026-10-27", top: 130 }]); // list scrolls past weeks en route
    expect(datesShown()).toContain("2026-10-20"); // the tap still owns the strip
    act(() => {
      vi.advanceTimersByTime(150); // the tap's scroll settles
    });
    io.fire([{ date: "2026-10-27", top: 130 }]); // a NEW scroll position, after settle
    expect(datesShown()).toContain("2026-10-27");
  });

  it("collapsing through the grabber survives its own layout shift (measured bug: 28→29)", () => {
    // Collapsing deletes ~4 rows above the list: real browsers clamp
    // scrollTop, which fires scroll events. Those are OUR doing — the
    // observer must not read them as the user scrolling and steal the day
    // the user just tapped. Found by the Chromium probe, not by jsdom.
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    vi.useFakeTimers();
    const { toggle, datesShown } = followRender();
    const nav = document.querySelector('[data-part="navigator"]') as HTMLElement;
    const io = FakeIO.instances[0];
    if (!io) throw new Error("no observer constructed");
    fireEvent.click(toggle); // expand so the 28th renders
    const day28 = nav.querySelector("[data-part='navigator-day'][data-date='2026-10-28']") as HTMLButtonElement;
    fireEvent.click(day28); // tap: strip lands on the 25th's week (25..31)
    act(() => {
      vi.advanceTimersByTime(150); // the tap's scroll settles; suppression off
    });
    fireEvent.click(toggle); // collapse — the layout shift fires scroll
    // fire a day OUTSIDE the 25th's week: if the clamp's scroll callbacks
    // were read, the strip would move to the 11th's week and lose the 28th.
    io.fire([{ date: "2026-10-12", top: 130 }]);
    expect(datesShown()).toContain("2026-10-28"); // still the tapped day
    act(() => {
      vi.advanceTimersByTime(150);
    });
    io.fire([{ date: "2026-10-02", top: 130 }]); // a real user scroll afterwards
    expect(datesShown()).toContain("2026-10-02");
  });

  it("no observer survives unmount, expanding, or the base (non-phone) style", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    vi.stubGlobal("ResizeObserver", FakeRO);
    const { unmount, toggle } = followRender();
    const first = FakeIO.instances[0];
    if (!first) throw new Error("no observer constructed");
    fireEvent.click(toggle); // expand: all rows render, nothing to follow
    expect(first.disconnected).toBe(true);
    fireEvent.click(toggle); // collapse: a fresh watch
    const second = FakeIO.instances[1];
    if (!second) throw new Error("collapse did not re-watch");
    unmount();
    expect(second.disconnected).toBe(true);

    // Base style (display:none on the navigator = outside the phone query):
    // the container never gets a watcher at all.
    FakeIO.instances = [];
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, ...rest) =>
      el instanceof HTMLElement && el.dataset["part"] === "navigator"
        ? ({ display: "none" } as CSSStyleDeclaration)
        : real(el, ...(rest as [undefined])),
    );
    followRender();
    expect(FakeIO.instances).toHaveLength(0);
  });
});

/** One day as the renderer would build it (card 33a fixtures). */
function dayOf(date: string, dayOfMonth: number, weekday: number, entries: CalendarEntry<ReactNode>[] = []): CalendarDayProps<ReactNode> {
  return { date, dayOfMonth, weekday, label: `${date} day ${dayOfMonth}`, inMonth: true, isToday: false, entries };
}

const entryOfCal = (id: string): CalendarEntry<ReactNode> => ({ id, label: id, content: <span>{id}</span>, movable: false, pending: false });

/** N consecutive days starting Mon 2026-11-02 (weekday 1); no entries unless ids given for the first day. */
function periodDays(n: number, rows = 1): CalendarDayProps<ReactNode>[] {
  const out: CalendarDayProps<ReactNode>[] = [];
  for (let i = 0; i < n * rows; i++) {
    const dow = (1 + i) % 7; // Mon..Sun, wrapping for the second row
    out.push(dayOf(`2026-11-0${2 + (i % 7)}`, 2 + (i % 7), dow, i === 0 ? [entryOfCal("e1")] : []));
  }
  return out;
}

function periodWeekdays(n: number): { short: string; long: string }[] {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, n).map((s) => ({ short: s[0] ?? "M", long: s }));
}

describe("N-day periods (card 33a)", () => {
  function renderPeriod(mode: string, days: CalendarDayProps<ReactNode>[], weekdays = periodWeekdays(mode === "5day" ? 5 : 3), strings = {}) {
    return render(
      <Calendar
        label="Shifts"
        title="November 2026"
        mode={mode as never}
        modes={[{ mode: mode as never, label: mode }]}
        weekdays={weekdays}
        days={days}
        legend={[]}
        loading={false}
        strings={strings}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );
  }

  it("a 3-day period is one row of 3 with the weekday headers of those columns", () => {
    const view = renderPeriod("3day", periodDays(3));
    const rows = view.container.querySelectorAll('[data-part="day-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.querySelectorAll('[data-part="day"]')).toHaveLength(3);
    const heads = Array.from(view.container.querySelectorAll('[data-part="weekday-row"] [data-part="weekday"]')).map((h) => h.getAttribute("aria-label"));
    expect(heads).toEqual(["Mon", "Tue", "Wed"]);
  });

  it("a 5-day period of ten days is two rows of five", () => {
    const view = renderPeriod("5day", periodDays(5, 2));
    const rows = view.container.querySelectorAll('[data-part="day-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll('[data-part="day"]')).toHaveLength(5);
    expect(rows[1]?.querySelectorAll('[data-part="day"]')).toHaveLength(5);
  });

  it("the grid carries --yadad-calendar-columns from the row length", () => {
    const view = renderPeriod("3day", periodDays(3));
    const grid = view.container.querySelector<HTMLElement>('[data-part="grid"]');
    expect(grid?.style.getPropertyValue("--yadad-calendar-columns")).toBe("3");
    // month/week keep the DOM untouched (no inline custom property).
    const month = render(
      <Calendar label="M" title="November 2026" mode="month" modes={[{ mode: "month", label: "Month" }]} weekdays={periodWeekdays(7)} days={periodDays(7, 6)} legend={[]} loading={false} onModeChange={() => {}} onPrevious={() => {}} onNext={() => {}} onToday={() => {}} />,
    );
    expect(month.container.querySelector<HTMLElement>('[data-part="grid"]')?.style.getPropertyValue("--yadad-calendar-columns")).toBe("");
  });

  it("nav buttons name the period: 'Previous 3 days', 'Next 3 days'", () => {
    const view = renderPeriod("3day", periodDays(3));
    expect(view.container.querySelector('[data-part="nav-previous"]')?.getAttribute("aria-label")).toBe("Previous 3 days");
    expect(view.container.querySelector('[data-part="nav-next"]')?.getAttribute("aria-label")).toBe("Next 3 days");
  });

  it("strings.periodNoun re-labels the period", () => {
    const view = renderPeriod("3day", periodDays(3), periodWeekdays(3), { periodNoun: (m: string) => (m === "3day" ? "shift block" : m) });
    expect(view.container.querySelector('[data-part="nav-previous"]')?.getAttribute("aria-label")).toBe("Previous shift block");
  });

  it("no navigator is rendered for N-day modes", () => {
    const view = renderPeriod("3day", periodDays(3));
    expect(view.container.querySelector('[data-part="navigator"]')).toBeNull();
  });

  it("ArrowDown steps by the row length, not by 7", () => {
    const view = renderPeriod("5day", periodDays(5, 2));
    const first = view.container.querySelector<HTMLElement>('[data-part="day"][data-date="2026-11-02"]');
    if (!first) throw new Error("first cell missing");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const focused = view.container.querySelector('[data-part="day"][data-date="2026-11-07"]');
    expect(view.container.ownerDocument.activeElement).toBe(focused);
  });

  it("an unknown mode (older core) renders like week", () => {
    const view = renderPeriod("9day", periodDays(7));
    const rows = view.container.querySelectorAll('[data-part="day-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.querySelectorAll('[data-part="day"]')).toHaveLength(7);
    expect(view.container.querySelector('[data-part="nav-previous"]')?.getAttribute("aria-label")).toBe("Previous week");
    // Week's form includes its navigator strip (card 32b): the unknown mode
    // must not be missing it either — "renders like week" means the whole form.
    expect(view.container.querySelector('[data-part="navigator"]')).not.toBeNull();
  });
});

/**
 * Card 33b: the "Earlier (N)" fold for listStart:"today".
 * 2026-11-02 is a Monday, so 2026-11-11 is a Wednesday (weekday 3).
 */
function foldDay(date: string, dayOfMonth: number, weekday: number, opts: { today?: boolean; entries?: boolean } = {}): CalendarDayProps<ReactNode> {
  return {
    date,
    dayOfMonth,
    weekday,
    label: `${date} day ${dayOfMonth}`,
    inMonth: true,
    isToday: opts.today ?? false,
    entries: opts.entries ? [entryOfCal(`e-${date}`)] : [],
  };
}

/** Wed 11 → Fri 13, today Thu 12; overdue entry on the 11th, today has one too. */
function foldTriad(): CalendarDayProps<ReactNode>[] {
  return [
    foldDay("2026-11-11", 11, 3, { entries: true }),
    foldDay("2026-11-12", 12, 4, { today: true, entries: true }),
    foldDay("2026-11-13", 13, 5),
  ];
}

/** Mon 09 → Sun 15 (week form, navigator included), today Thu 12; overdue on 10 and 11. */
function foldWeek(): CalendarDayProps<ReactNode>[] {
  return [
    foldDay("2026-11-09", 9, 1),
    foldDay("2026-11-10", 10, 2, { entries: true }),
    foldDay("2026-11-11", 11, 3, { entries: true }),
    foldDay("2026-11-12", 12, 4, { today: true, entries: true }),
    foldDay("2026-11-13", 13, 5),
    foldDay("2026-11-14", 14, 6),
    foldDay("2026-11-15", 15, 0),
  ];
}

describe("Earlier (N) fold (card 33b)", () => {
  function renderFold(
    days: CalendarDayProps<ReactNode>[],
    opts: { mode?: string; listStart?: "period" | "today"; strings?: Record<string, unknown> } = {},
  ) {
    const mode = opts.mode ?? "3day";
    const n = mode === "week" ? 7 : 3;
    return render(
      <Calendar
        label="Shifts"
        title="November 2026"
        mode={mode as never}
        modes={[{ mode: mode as never, label: mode }]}
        weekdays={periodWeekdays(n)}
        days={days}
        legend={[]}
        loading={false}
        {...(opts.listStart ? { listStart: opts.listStart } : {})}
        strings={opts.strings as never}
        onModeChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );
  }

  it("marks days strictly before today data-earlier, today and after unmarked", () => {
    const view = renderFold(foldTriad(), { listStart: "today" });
    const day = (d: string) => view.container.querySelector(`[data-part="day"][data-date="${d}"]`);
    expect(day("2026-11-11")?.getAttribute("data-earlier")).toBe("true");
    expect(day("2026-11-12")?.hasAttribute("data-earlier")).toBe(false);
    expect(day("2026-11-13")?.hasAttribute("data-earlier")).toBe(false);
  });

  it("renders an earlier-toggle before the grid, collapsed, counting past days WITH entries", () => {
    const view = renderFold(foldTriad(), { listStart: "today" });
    const toggle = view.container.querySelector('[data-part="earlier-toggle"]');
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    // one past day with entries (the 11th); the 12th is today, not past
    expect(toggle?.textContent).toBe("Earlier (1)");
    const grid = view.container.querySelector('[data-part="grid"]');
    if (!toggle || !grid) throw new Error("toggle or grid missing");
    // outside the grid, immediately before it
    expect(toggle.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.parentElement).toBe(grid.parentElement);
  });

  it("expanding flips aria-expanded and never reorders the days", () => {
    const view = renderFold(foldTriad(), { listStart: "today" });
    const before = Array.from(view.container.querySelectorAll('[data-part="day"]')).map((d) => d.getAttribute("data-date"));
    const toggle = view.container.querySelector('[data-part="earlier-toggle"]');
    if (!toggle) throw new Error("no toggle");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const after = Array.from(view.container.querySelectorAll('[data-part="day"]')).map((d) => d.getAttribute("data-date"));
    expect(after).toEqual(before);
  });

  it("no listStart or 'period' renders no toggle, no data-earlier, byte-identical DOM", () => {
    const bare = renderFold(foldTriad());
    const period = renderFold(foldTriad(), { listStart: "period" });
    expect(bare.container.querySelector('[data-part="earlier-toggle"]')).toBeNull();
    expect(period.container.querySelector('[data-part="earlier-toggle"]')).toBeNull();
    expect(bare.container.querySelector("[data-earlier]")).toBeNull();
    expect(period.container.querySelector("[data-earlier]")).toBeNull();
    // normalize useId counters — render order differs between the two mounts;
    // React's useId counter is base36 (_r_3o_), not just digits.
    const norm = (s: string) => s.replace(/_r_[a-z0-9]+_/g, "_r_X_");
    expect(norm(period.container.innerHTML)).toBe(norm(bare.container.innerHTML));
  });

  it("earlierLabel overrides the count label", () => {
    const view = renderFold(foldTriad(), {
      listStart: "today",
      strings: { earlierLabel: (n: number) => `Overdue (${n})` },
    });
    expect(view.container.querySelector('[data-part="earlier-toggle"]')?.textContent).toBe("Overdue (1)");
  });

  it("no toggle when today is not in the period", () => {
    const days = foldTriad().map((d) => ({ ...d, isToday: false }));
    const view = renderFold(days, { listStart: "today" });
    expect(view.container.querySelector('[data-part="earlier-toggle"]')).toBeNull();
    expect(view.container.querySelector("[data-earlier]")).toBeNull();
  });

  it("count ignores past days without entries", () => {
    const days = foldTriad().map((d) => (d.date === "2026-11-11" ? { ...d, entries: [] } : d));
    // 11th loses its entry; no other past day has one → count 0, still a fold
    const view = renderFold(days, { listStart: "today" });
    expect(view.container.querySelector('[data-part="earlier-toggle"]')?.textContent).toBe("Earlier (0)");
  });

  it("navigator: selecting a past day expands the fold and scrolls to it", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const view = renderFold(foldWeek(), { mode: "week", listStart: "today" });
    const navDay = view.container.querySelector('[data-part="navigator-day"][data-date="2026-11-10"]');
    if (!navDay) throw new Error("navigator day missing");
    fireEvent.click(navDay);
    const toggle = view.container.querySelector('[data-part="earlier-toggle"]');
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("phone collapsed: arrow keys skip the folded days; expanded they return", () => {
    // jsdom has no stylesheet: the toggle's computed display is "" (not
    // "none"), which is the phone verdict the component reads.
    const view = renderFold(foldTriad(), { listStart: "today" });
    const todayCell = view.container.querySelector('[data-part="day"][data-date="2026-11-12"]');
    if (!(todayCell instanceof HTMLElement)) throw new Error("today cell missing");
    todayCell.focus();
    fireEvent.keyDown(todayCell, { key: "ArrowLeft" });
    // folded away — focus stays put rather than landing on a display:none cell
    expect(document.activeElement).toBe(todayCell);
    const toggle = view.container.querySelector('[data-part="earlier-toggle"]');
    if (!toggle) throw new Error("no toggle");
    fireEvent.click(toggle);
    fireEvent.keyDown(todayCell, { key: "ArrowLeft" });
    const earlierCell = view.container.querySelector('[data-part="day"][data-date="2026-11-11"]');
    expect(document.activeElement).toBe(earlierCell);
  });

  it("laptop (toggle hidden): arrow keys reach the earlier days — grid unchanged", () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, ...rest) =>
      el instanceof HTMLElement && el.dataset["part"] === "earlier-toggle"
        ? ({ display: "none" } as CSSStyleDeclaration)
        : real(el, ...(rest as [undefined])),
    );
    const view = renderFold(foldTriad(), { listStart: "today" });
    const todayCell = view.container.querySelector('[data-part="day"][data-date="2026-11-12"]');
    if (!(todayCell instanceof HTMLElement)) throw new Error("today cell missing");
    todayCell.focus();
    fireEvent.keyDown(todayCell, { key: "ArrowLeft" });
    const earlierCell = view.container.querySelector('[data-part="day"][data-date="2026-11-11"]');
    expect(document.activeElement).toBe(earlierCell);
  });
});
