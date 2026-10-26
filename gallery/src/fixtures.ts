/**
 * The gallery's fixture data, shaped exactly like the @yadad/testing contract
 * fixtures (the contract-kit entry is test-runner code and cannot be loaded
 * in a browser page, so the FieldSample/FieldSamples shapes are mirrored
 * here). Same field shapes and values as the kit's defaultSamples, with the
 * wider shapes this gallery adds: a select with many choices and a date with
 * min/max.
 */
import type { DocumentError, FieldDefinitions, FieldDisplayExtras, FieldInputExtras, FieldValueTypes, FieldType, SeriesGroupProps } from "@yadad/core";

/** A field definition and a value to drive it with, per field type. */
export interface FieldSample<K extends FieldType> {
  readonly field: FieldDefinitions[K];
  readonly value: FieldValueTypes[K];
  /** Extra props the Input needs (a reference picker's options). */
  readonly inputExtras: FieldInputExtras[K];
  /** Extra props the Display needs (a reference's label). */
  readonly displayExtras: FieldDisplayExtras[K];
}

const NONE = {};

/** The records a reference picker offers: long labels included, so wrapping and truncation show. */
export const referenceOptions = [
  { id: "e1", label: "Squat" },
  { id: "e2", label: "Bench press" },
  { id: "e3", label: "Deadlift" },
  { id: "e4", label: "Overhead press, strict, from the rack, with a pause at the bottom of every repetition" },
];

/** 40 records (enough for the type-to-filter combobox): lifts with accents and shared words, so filtering shows. */
export const manyReferenceOptions = [
  ...referenceOptions,
  ...[
    "Front squat", "Hack squat", "Goblet squat", "Split squat", "Incline bench press", "Close-grip bench press", "Dumbbell bench press",
    "Romanian deadlift", "Sumo deadlift", "Trap bar deadlift", "Barbell row", "Pendlay row", "Seated cable row", "Pull-up", "Chin-up",
    "Lat pulldown", "Dip", "Push-up", "Dumbbell shoulder press", "Lateral raise", "Face pull", "Biceps curl", "Hammer curl", "Triceps pushdown",
    "Skull crusher", "Leg press", "Leg curl", "Leg extension", "Calf raise", "Hip thrust", "Plank", "Crème brûlée carry", "Farmer's carry", "Kettlebell swing",
  ].map((label, i) => ({ id: `m${i + 1}`, label })),
];

export type FieldSamples = { readonly [K in FieldType]: FieldSample<K> };

/**
 * The contract fixture fields and values, extended where the gallery shows a
 * wider shape than the kit's default (select: many choices; date: min/max).
 */
export const samples: FieldSamples = {
  text: { field: { id: "name", type: "text", label: "Name", required: true }, value: "Ada", inputExtras: NONE, displayExtras: NONE },
  number: { field: { id: "weight", type: "number", label: "Weight", min: 0, step: 2.5, unit: "kg" }, value: 102.5, inputExtras: NONE, displayExtras: NONE },
  boolean: { field: { id: "warmup", type: "boolean", label: "Warm-up set" }, value: true, inputExtras: NONE, displayExtras: NONE },
  select: {
    field: {
      id: "exercise",
      type: "select",
      label: "Exercise",
      options: {
        source: "static",
        values: [
          "Squat",
          "Bench press",
          "Deadlift",
          "Overhead press",
          "Barbell row",
          "Pull-up",
          "Bicep curl",
          "Lateral raise",
          "Leg press",
          "Walking lunges",
          "Cable fly",
          "Plank",
        ],
      },
    },
    value: "Bench press",
    inputExtras: NONE,
    displayExtras: NONE,
  },
  date: { field: { id: "day", type: "date", label: "Day", min: "2026-01-01", max: "2026-12-31" }, value: "2026-10-04", inputExtras: NONE, displayExtras: NONE },
  datetime: { field: { id: "moment", type: "datetime", label: "Moment", required: true }, value: "2026-10-04T12:30:00.000Z", inputExtras: NONE, displayExtras: NONE },
  reference: {
    field: { id: "lift", type: "reference", label: "Lift", entity: "exercise" },
    value: "e2",
    inputExtras: { options: { status: "ready", options: referenceOptions, more: false } },
    displayExtras: { label: "Bench press", status: "found" },
  },
  // RFC 0008 items 14-15 (card 23a): a time of day with the field's bounds,
  // and a tag list long enough to wrap at phone width.
  time: { field: { id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 }, value: "09:30", inputExtras: NONE, displayExtras: NONE },
  tags: { field: { id: "tags", type: "tags", label: "Tags" }, value: ["squat", "bench press", "deadlift", "overhead press", "5x5", "accessory work"], inputExtras: NONE, displayExtras: NONE },
};

/** The error shapes the contract kit drives components with. */
export const requiredError = (path: string): DocumentError => ({
  path,
  code: "required",
  message: "This value is required.",
  hint: "Enter a value.",
});

export const invalidError = (path: string, message: string): DocumentError => ({
  path,
  code: "invalid-value",
  message,
  hint: "Use one of the allowed values.",
});

/* ---------------------------------------------------------------------- */
/* Calendar fixtures (RFC 0004 / registry CalendarProps). Mirrors the      */
/* shapes @yadad/testing's contract-kit drives the component with; the     */
/* gallery cannot import contract-kit (test-runner code), so the grid math */
/* and sample entries live here instead.                                  */
/* ---------------------------------------------------------------------- */

export const CALENDAR_TODAY = "2026-10-16";

const WEEKDAY_NAMES = [
  { short: "Sun", long: "Sunday" },
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
] as const;

export const calendarWeekdays = WEEKDAY_NAMES.map((w) => ({ short: w.short, long: w.long }));

const toISO = (d: Date): string => d.toISOString().slice(0, 10);
const fromISO = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, n: number): string => {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};

const dayLabel = (iso: string): string => {
  const d = fromISO(iso);
  const long = WEEKDAY_NAMES[d.getUTCDay()]?.long ?? "";
  return `${long} ${d.getUTCDate()} ${d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
};

export interface CalendarFixtureEntry {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly detail?: string;
  readonly slot?: number;
  readonly movable: boolean;
  readonly pending?: boolean;
}

/** Sample entries across October/November 2026: a busy day (5 entries), movable and fixed entries, one pending. */
export const calendarFixtureEntries: readonly CalendarFixtureEntry[] = [
  { id: "e1", date: "2026-10-16", title: "Squat day", detail: "5x5 @ 100kg", slot: 0, movable: true },
  { id: "e2", date: "2026-10-16", title: "Physio check-in", detail: "Knee follow-up", slot: 3, movable: true },
  { id: "e3", date: "2026-10-20", title: "Bench press", detail: "5x5 @ 70kg", slot: 0, movable: true },
  { id: "e4", date: "2026-10-20", title: "Deadlift", detail: "3x5 @ 120kg", slot: 0, movable: true },
  { id: "e5", date: "2026-10-20", title: "Team sync", detail: "9:30am", slot: 3, movable: false },
  { id: "e6", date: "2026-10-20", title: "Travel: Boston", detail: "All day", slot: 2, movable: true },
  { id: "e7", date: "2026-10-20", title: "Rest day note", detail: "Shoulder is sore", slot: 1, movable: true },
  { id: "e8", date: "2026-10-22", title: "Overhead press", detail: "5x5 @ 45kg", slot: 0, movable: true, pending: true },
  { id: "e9", date: "2026-10-05", title: "Pull-up ladder", detail: "Max set 11", slot: 0, movable: true },
];

export const calendarLegend = [
  { slot: 0, label: "Training" },
  { slot: 1, label: "Recovery" },
  { slot: 2, label: "Travel" },
  { slot: 3, label: "Appointments" },
] as const;

/** 42 ISO dates (Sun-start, 6 weeks) covering the month containing `anchor`. */
export function monthGridDates(anchor: string): string[] {
  const d = fromISO(anchor);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const start = addDays(toISO(first), -first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** 7 ISO dates (Sun-start) covering the week containing `anchor`. */
export function weekGridDates(anchor: string): string[] {
  const d = fromISO(anchor);
  const start = addDays(anchor, -d.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthTitle(anchor: string): string {
  const d = fromISO(anchor);
  return `${d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
}

export function weekTitle(dates: readonly string[]): string {
  const start = dates[0] ?? "";
  const end = dates[dates.length - 1] ?? "";
  return `${dayLabel(start).split(" ").slice(1).join(" ")} – ${dayLabel(end).split(" ").slice(1).join(" ")}`;
}

/** Builds CalendarDayProps[] (content as plain JSX, built by the caller's render step) for a list of dates. */
export function calendarDays(
  dates: readonly string[],
  monthAnchor: string,
  entries: readonly CalendarFixtureEntry[],
  pendingOverrides?: ReadonlySet<string>,
): {
  date: string;
  dayOfMonth: number;
  weekday: number;
  label: string;
  inMonth: boolean;
  isToday: boolean;
  entries: { id: string; label: string; movable: boolean; pending: boolean; color?: { slot: number; label: string }; title: string; detail?: string }[];
}[] {
  const month = fromISO(monthAnchor).getUTCMonth();
  return dates.map((date) => {
    const d = fromISO(date);
    const dayEntries = entries.filter((e) => e.date === date);
    return {
      date,
      dayOfMonth: d.getUTCDate(),
      weekday: d.getUTCDay(),
      label: dayLabel(date),
      inMonth: d.getUTCMonth() === month,
      isToday: date === CALENDAR_TODAY,
      entries: dayEntries.map((e) => ({
        id: e.id,
        title: e.title,
        label: `${e.title}${e.detail ? `, ${e.detail}` : ""}${e.slot !== undefined ? `, ${calendarLegend.find((l) => l.slot === e.slot)?.label ?? ""}` : ""}`,
        movable: e.movable,
        pending: pendingOverrides?.has(e.id) ?? (e.pending ?? false),
        ...(e.detail !== undefined ? { detail: e.detail } : {}),
        ...(e.slot !== undefined ? { color: { slot: e.slot, label: calendarLegend.find((l) => l.slot === e.slot)?.label ?? "" } } : {}),
      })),
    };
  });
}

/**
 * Twelve weeks of a series widget's groups (card 17a): the engine's shape —
 * `value` is the number, `text` the preformatted string a component shows.
 * Every fourth week is a gap bucket (min/max/avg style: no value, an em dash
 * as text) so the gallery shows what a hole in the data looks like.
 */
export function seriesWeekGroups(count = 12): SeriesGroupProps[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 6 + i * 7)); // Mondays from 2026-07-06
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const label = `Week of ${key}`;
    if (i % 4 === 3) return { key, label, value: undefined, text: "—" };
    const value = 8 + ((i * 17) % 23);
    return { key, label, value, text: String(value) };
  });
}

/**
 * The same twelve weeks as an avg-of-weight measure (card 17c): values with
 * decimals so the line's fitted axis (min/max/avg) is visible next to the
 * bar/sum zero-anchored one, gaps kept (i % 4 === 3) so the line must break.
 */
export function seriesWeekLine(count = 12): SeriesGroupProps[] {
  return seriesWeekGroups(count).map((g) =>
    g.value === undefined ? g : { ...g, value: g.value * 2.5, text: `${g.value * 2.5} kg` },
  );
}

/** A series with exactly one group (card 17c): the single point must show. */
export function seriesSingleGroup(): SeriesGroupProps[] {
  const [only] = seriesWeekGroups(1);
  return [only!];
}

/**
 * Twenty-six weeks with exactly two gap buckets (card 17c's gallery
 * requirement): a long run, a hole, a middle run, a hole, a tail — the
 * three segments the line must draw.
 */
export function seriesMonthLine(): SeriesGroupProps[] {
  return Array.from({ length: 26 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 6 + i * 7)); // Mondays from 2026-07-06
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const label = `Week of ${key}`;
    if (i === 9 || i === 18) return { key, label, value: undefined, text: "—" };
    const value = 40 + ((i * 13) % 45);
    return { key, label, value, text: `${value} kg` };
  });
}

/* Pager fixtures (RFC 0008 item 11 / registry PagerProps), mirroring the     */
/* calendarFixtureEntries pattern: data shaped exactly like the engine's      */
/* contract, built by the gallery's render step.                              */

/** One page of a long-enough-to-page table: eight rows, a wide text column. */
export function pagerTableRows(page: number, pageCount: number): { id: string; cells: [string, string, string] }[] {
  return Array.from({ length: 8 }, (_, i) => {
    const n = (page - 1) * 8 + i + 1;
    return {
      id: `r${n}`,
      cells: [`2026-10-${String((n % 28) + 1).padStart(2, "0")}`, `${60 + ((n * 7) % 90)} kg`, `Session ${n} of ${pageCount * 8} — ${n % 3 === 0 ? "a long note that wraps on a phone" : "ok"}`],
    } as const;
  });
}

/** The registry PagerProps for a paged table: page is 1-based, ends disabled at the edges. */
export function pagerProps(page: number, pageCount: number): { label: string; hasPrevious: boolean; hasNext: boolean; page: number; pageCount: number; onPrevious: () => void; onNext: () => void } {
  return {
    label: "Sessions pages",
    hasPrevious: page > 1,
    hasNext: page < pageCount,
    page,
    pageCount,
    onPrevious: () => {},
    onNext: () => {},
  };
}
