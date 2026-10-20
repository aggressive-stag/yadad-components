// @vitest-environment jsdom
import type { CalendarEntry, RecordActionItem } from "@yadad/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
function entryWithActions(actions: readonly RecordActionItem[] | undefined, opts: { pending?: boolean; movable?: boolean } = {}) {
  const entry: CalendarEntry<ReactNode> = {
    id: "e1",
    label: "Bench press, 5x5 @ 70kg",
    content: <span>Bench press</span>,
    movable: opts.movable ?? false,
    pending: opts.pending ?? false,
    ...(actions ? { actions } : {}),
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
