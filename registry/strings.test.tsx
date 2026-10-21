// @vitest-environment jsdom
// Card 15a: every word is a prop; English is only the default. For each
// component that speaks: one test that the default renders the historical
// literal (protects every existing consumer), one that an override replaces
// it. German literals are deliberate — they are the language a consumer
// actually needs today.
import type { BoardCard, BoardColumn, CalendarEntry, RecordActionItem, TableColumnHeader } from "@yadad/core";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CALENDAR_TODAY, calendarWeekdays, referenceOptions } from "../gallery/src/fixtures.js";
import { Board } from "../sets/base/board/v1/Board.js";
import { Calendar } from "../sets/base/calendar/v1/Calendar.js";
import type { CalendarStrings } from "../sets/base/calendar/v1/Calendar.js";
import { Dialog } from "../sets/base/dialog/v1/Dialog.js";
import { ReferenceInput } from "../sets/base/reference/v1/Reference.js";
import { SelectInput } from "../sets/base/select/v1/Select.js";
import { Table } from "../sets/base/table/v1/Table.js";

afterEach(cleanup);

const action = (over: Partial<RecordActionItem> = {}): RecordActionItem => ({
  id: "a1",
  label: "Open",
  tone: "neutral",
  pending: false,
  onPress: () => {},
  ...over,
});

// ---------------------------------------------------------------- Table

const tableColumns: TableColumnHeader[] = [{ id: "n", label: "Name", headerId: "h-n", sortable: true }];

function phone(): void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

describe("table strings", () => {
  const rows = [{ id: "r1", cells: ["Ann"] as [string], actions: [action(), action({ id: "a2", label: "Löschen" })] }];

  it("says Working..., Actions… and the sort state in English by default", () => {
    const { container } = render(<Table caption="c" columns={tableColumns} rows={[{ id: "r1", cells: ["Ann"], actions: [action({ pending: true })] }]} onSort={() => {}} empty="none" />);
    expect(container.querySelector('[data-part="action-status"]')?.textContent).toBe("Working...");
    cleanup();
    const sorted = render(<Table caption="c" columns={[{ id: "n", label: "Name", headerId: "h-n", sortable: true, sort: "asc" }]} rows={[{ id: "r1", cells: ["Ann"] }]} onSort={() => {}} empty="none" />);
    expect(sorted.container.querySelector('[data-part="sort"]')?.textContent).toContain("Name, sorted ascending");
  });

  it("renders every override in place of the English default", () => {
    phone();
    const { container } = render(
      <Table
        caption="c"
        columns={tableColumns}
        rows={rows}
        onSort={() => {}}
        empty="none"
        strings={{ workingLabel: "Wird geladen...", menuLabel: "Aktionen…", menuAriaLabel: (row) => `Aktionen (${row})`, menuPanelAriaLabel: (row) => `Aktionen (${row})`, cancelLabel: "Abbrechen", sortedLabel: (dir) => `, sortiert (${dir === "ascending" ? "aufsteigend" : "absteigend"})` }}
      />,
    );
    const trigger = container.querySelector('[data-part="actions-trigger"]') as HTMLElement;
    expect(trigger.textContent).toBe("Aktionen…");
    expect(trigger.getAttribute("aria-label")).toBe("Aktionen (c)");
    fireEvent.click(trigger);
    expect(container.querySelector('[data-part="actions-panel"]')?.getAttribute("aria-label")).toBe("Aktionen (c)");
    expect(container.querySelector('[data-part="actions-cancel"]')?.textContent).toBe("Abbrechen");
    cleanup();
    const sorted = render(
      <Table caption="c" columns={[{ id: "n", label: "Name", headerId: "h-n", sortable: true, sort: "asc" }]} rows={[{ id: "r1", cells: ["Ann"] }]} onSort={() => {}} empty="none" strings={{ sortedLabel: (dir) => `, sortiert (${dir === "ascending" ? "aufsteigend" : "absteigend"})` }} />,
    );
    expect(sorted.container.querySelector('[data-part="sort"]')?.textContent).toContain("Name, sortiert (aufsteigend)");
  });
});

// ---------------------------------------------------------------- Board

const bcard = (id: string, actions?: readonly RecordActionItem[]): BoardCard<ReactNode> => ({ id, label: id, movable: true, pending: false, content: id, ...(actions ? { actions } : {}) });
const bcol = (id: string, cards: BoardCard<ReactNode>[], count = cards.length): BoardColumn<ReactNode> => ({ id, label: id, count, droppable: true, cards });
const boardProps = { label: "Tasks", groupChoices: [{ field: "s", label: "S" }, { field: "d", label: "D" }], groupField: "s", onGroupBy: () => {}, onMove: () => {} } as const;

describe("board strings", () => {
  it("speaks English by default: Working..., Move to…, Group by, Loading cards…, No cards, card/card", () => {
    const { container } = render(<Board {...boardProps} columns={[bcol("a", [bcard("r1", [action(), action({ id: "a2" })])], 1), bcol("b", [])]} loading={false} />);
    expect(container.querySelector('[data-part="move-trigger"]')?.textContent).toBe("Move to…");
    expect(container.querySelector('[data-part="actions-trigger"]')?.textContent).toBe("Actions…");
    expect(container.querySelector('[data-part="group-by"]')?.textContent).toContain("Group by");
    cleanup();
    const loading = render(<Board {...boardProps} columns={[bcol("b", [], 0)]} loading={true} />);
    expect(loading.container.querySelector('[data-part="column-empty"]')?.textContent).toBe("Loading cards…");
    cleanup();
    const empty = render(<Board {...boardProps} columns={[bcol("b", [], 0)]} loading={false} />);
    expect(empty.container.querySelector('[data-part="column-empty"]')?.textContent).toBe("No cards");
    expect(empty.container.querySelector('[data-part="column-count"]')?.getAttribute("aria-label")).toBe("0 cards");
  });

  it("renders every override, live region included", () => {
    const { container } = render(
      <Board
        {...boardProps}
        columns={[bcol("a", [{ ...bcard("r1", [action({ pending: true }), action({ id: "a2" })]) }], 1), bcol("b", [], 0)]}
        loading={false}
        strings={{ workingLabel: "Wird geladen...", menuLabel: "Aktionen…", menuAriaLabel: (c) => `Aktionen ${c}`, moveLabel: "Verschieben nach…", groupByLabel: "Gruppieren nach", emptyLabel: "Keine Karten", columnCountLabel: (n) => `${n} Karten` }}
      />,
    );
    expect(container.querySelector('[data-part="action-status"]')?.textContent).toBe("Wird geladen...");
    expect(container.querySelector('[data-part="actions-trigger"]')?.textContent).toBe("Aktionen…");
    expect(container.querySelector('[data-part="actions-trigger"]')?.getAttribute("aria-label")).toBe("Aktionen r1");
    expect(container.querySelector('[data-part="move-trigger"]')?.textContent).toBe("Verschieben nach…");
    expect(container.querySelector('[data-part="group-by"]')?.textContent).toContain("Gruppieren nach");
    const counts = [...container.querySelectorAll('[data-part="column-count"]')].map((n) => n.getAttribute("aria-label"));
    expect(counts).toEqual(["1 Karten", "0 Karten"]);
  });
});

// ---------------------------------------------------------------- Calendar

function calendarEntry(pending: boolean): CalendarEntry<ReactNode> {
  return { id: "e1", label: "Kreuzheben", content: <span>Kreuzheben</span>, movable: true, pending, actions: [action(), action({ id: "a2", label: "Löschen" })] };
}

function renderCalendar(strings?: CalendarStrings, pending = false): ReturnType<typeof render> {
  const days = [{ date: CALENDAR_TODAY, dayOfMonth: 16, weekday: 5, label: "Freitag 16 Oktober 2026", inMonth: true, isToday: true, entries: [calendarEntry(pending)] }];
  return render(
    <Calendar
      label="Training"
      title="Oktober 2026"
      mode="week"
      modes={[{ mode: "week", label: "Woche" }, { mode: "month", label: "Monat" }]}
      weekdays={calendarWeekdays}
      days={days}
      legend={[{ slot: 1, label: "Schwer" }]}
      loading={false}
      onModeChange={() => {}}
      onPrevious={() => {}}
      onNext={() => {}}
      onToday={() => {}}
      onMove={() => {}}
      {...(strings ? { strings } : {})}
    />,
  );
}

describe("calendar strings", () => {
  it("speaks English by default: nav, mode group, entries, Today badge, Actions…, Move to day…", () => {
    const { container } = renderCalendar();
    expect(container.querySelector('[data-part="nav-previous"]')?.textContent).toBe("Previous");
    expect(container.querySelector('[data-part="nav-previous"]')?.getAttribute("aria-label")).toBe("Previous week");
    expect(container.querySelector('[data-part="nav"]')?.getAttribute("aria-label")).toBe("Training navigation");
    expect(container.querySelector('[data-part="mode-switch"]')?.getAttribute("aria-label")).toBe("Calendar mode");
    expect(container.querySelector('[data-part="entries"]')?.getAttribute("aria-label")).toBe("Entries for Freitag 16 Oktober 2026");
    expect(container.querySelector('[data-part="today-badge"]')?.textContent).toBe("Today");
    expect(container.querySelector('[data-part="move-trigger"]')?.textContent).toBe("Move to day…");
    expect(container.querySelector('[data-part="legend"]')?.getAttribute("aria-label")).toBe("Colours");
  });

  it("renders every override, live region and move panel included", () => {
    const { container } = renderCalendar(
      {
        workingLabel: "Wird geladen...",
        menuLabel: "Aktionen…",
        menuAriaLabel: (l) => `Aktionen ${l}`,
        cancelLabel: "Abbrechen",
        moveLabel: "Auf Tag verschieben…",
        moveToLabel: (l) => `Neuer Tag für ${l}`,
        moveConfirmLabel: "Verschieben",
        todayLabel: "Heute",
        entriesAriaLabel: (l) => `Einträge für ${l}`,
        previousLabel: "Zurück",
        previousAriaLabel: (n) => `${n} zuvor`,
        nextLabel: "Weiter",
        nextAriaLabel: (n) => `${n} weiter`,
        navTodayLabel: "Heute",
        modeSwitchAriaLabel: "Kalenderansicht",
        legendAriaLabel: "Farben",
        navGroupAriaLabel: (l) => `${l}-Navigation`,
      },
      true,
    );
    expect(container.querySelector('[data-part="action-status"]')?.textContent).toBe("Wird geladen...");
    expect(container.querySelector('[data-part="actions-trigger"]')?.textContent).toBe("Aktionen…");
    expect(container.querySelector('[data-part="nav-previous"]')?.textContent).toBe("Zurück");
    expect(container.querySelector('[data-part="nav-previous"]')?.getAttribute("aria-label")).toBe("week zuvor");
    expect(container.querySelector('[data-part="nav"]')?.getAttribute("aria-label")).toBe("Training-Navigation");
    expect(container.querySelector('[data-part="mode-switch"]')?.getAttribute("aria-label")).toBe("Kalenderansicht");
    expect(container.querySelector('[data-part="entries"]')?.getAttribute("aria-label")).toBe("Einträge für Freitag 16 Oktober 2026");
    expect(container.querySelector('[data-part="today-badge"]')?.textContent).toBe("Heute");
    const moveTrigger = container.querySelector('[data-part="move-trigger"]') as HTMLElement;
    expect(moveTrigger.textContent).toBe("Auf Tag verschieben…");
    fireEvent.click(moveTrigger);
    expect(container.querySelector('[data-part="move-label"]')?.textContent).toBe("Neuer Tag für Kreuzheben");
    expect(container.querySelector('[data-part="move-confirm"]')?.textContent).toBe("Verschieben");
    expect(container.querySelector('[data-part="move-cancel"]')?.textContent).toBe("Abbrechen");
  });
});

// ---------------------------------------------------------------- Dialog

describe("dialog strings", () => {
  it("names the close button Close by default and by override", () => {
    const { container } = render(<Dialog label="Stimmen" onClose={() => {}} modal={false}>x</Dialog>);
    expect(container.querySelector('[data-part="close"]')?.getAttribute("aria-label")).toBe("Close");
    cleanup();
    const german = render(<Dialog label="Stimmen" onClose={() => {}} modal={false} closeLabel="Schließen">x</Dialog>);
    expect(german.container.querySelector('[data-part="close"]')?.getAttribute("aria-label")).toBe("Schließen");
  });
});

// ---------------------------------------------------------------- Select

const selectField = { id: "exercise", type: "select", label: "Exercise", options: { source: "static", values: ["Squat", "Bench press"] } } as const;
const selectBase = { inputId: "i", field: selectField, value: undefined, onChange: () => {}, invalid: false } as const;

describe("select strings", () => {
  it("offers Choose… by default and the override instead", () => {
    const { container } = render(<SelectInput {...selectBase} />);
    expect(container.querySelector("option")?.textContent).toBe("Choose…");
    cleanup();
    const german = render(<SelectInput {...selectBase} chooseLabel="Auswählen…" />);
    expect(german.container.querySelector("option")?.textContent).toBe("Auswählen…");
  });
});

// ---------------------------------------------------------------- Reference

const referenceField = { id: "lift", type: "reference", label: "Lift", entity: "exercise" } as const;
const referenceBase = { inputId: "i", field: referenceField, value: undefined, onChange: () => {}, invalid: false } as const;

describe("reference strings", () => {
  it("says Choose… / Loading choices… / Could not load choices / no records / first-N in English by default", () => {
    const ready = render(<ReferenceInput {...referenceBase} options={{ status: "ready", options: referenceOptions, more: false }} />);
    expect(ready.container.querySelector("option")?.textContent).toBe("Choose…");
    expect(ready.container.querySelector('[data-part="status"]')).toBeNull();
    cleanup();
    const loading = render(<ReferenceInput {...referenceBase} options={{ status: "loading" }} />);
    expect(loading.container.querySelector("option")?.textContent).toBe("Loading…");
    expect(loading.container.querySelector('[data-part="status"]')?.textContent).toBe("Loading choices…");
    cleanup();
    const failed = render(<ReferenceInput {...referenceBase} options={{ status: "error", message: "boom" }} />);
    expect(failed.container.querySelector('[data-part="status"]')?.textContent).toBe("Could not load choices: boom");
    cleanup();
    const none = render(<ReferenceInput {...referenceBase} options={{ status: "ready", options: [], more: false }} />);
    expect(none.container.querySelector('[data-part="status"]')?.textContent).toBe("No records to choose from yet.");
    cleanup();
    const cut = render(<ReferenceInput {...referenceBase} options={{ status: "ready", options: referenceOptions, more: true }} />);
    expect(cut.container.querySelector('[data-part="status"]')?.textContent).toBe("Showing the first 4 records only.");
  });

  it("renders every override", () => {
    const { container } = render(
      <ReferenceInput
        {...referenceBase}
        options={{ status: "ready", options: referenceOptions, more: true }}
        strings={{ chooseLabel: "Auswählen…", loadingOptionLabel: "Wird geladen…", loadingStatusLabel: "Auswahl wird geladen…", errorLabel: (m) => `Auswahl konnte nicht geladen werden: ${m}`, emptyLabel: "Noch keine Datensätze.", moreLabel: (n) => `Nur die ersten ${n} Datensätze.` }}
      />,
    );
    expect(container.querySelector("option")?.textContent).toBe("Auswählen…");
    expect(container.querySelector('[data-part="status"]')?.textContent).toBe("Nur die ersten 4 Datensätze.");
    cleanup();
    const loading = render(
      <ReferenceInput {...referenceBase} options={{ status: "loading" }} strings={{ loadingOptionLabel: "Wird geladen…", loadingStatusLabel: "Auswahl wird geladen…" }} />,
    );
    expect(loading.container.querySelector("option")?.textContent).toBe("Wird geladen…");
    expect(loading.container.querySelector('[data-part="status"]')?.textContent).toBe("Auswahl wird geladen…");
    cleanup();
    const failed = render(<ReferenceInput {...referenceBase} options={{ status: "error", message: "boom" }} strings={{ errorLabel: (m) => `Auswahl konnte nicht geladen werden: ${m}` }} />);
    expect(failed.container.querySelector('[data-part="status"]')?.textContent).toBe("Auswahl konnte nicht geladen werden: boom");
  });
});
