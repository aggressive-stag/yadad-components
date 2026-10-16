/**
 * The yadad base component set, every component in every state.
 *
 * All data is shaped exactly like the @yadad/testing contract fixtures (the
 * contract-kit entry is test-runner code and cannot be loaded in a browser
 * page; see gallery/src/fixtures.ts) and uses the contract types from
 * @yadad/core. Every component is rendered through baseRegistry, the same
 * way a host would. Each state gets a heading and a stable anchor id so a
 * check can link to it.
 */
import { darkTheme, lightTheme, themeToCss, type Theme } from "@yadad/theme";
import type { DocumentError, FieldDisplayExtras, FieldDisplayProps, FieldInputExtras, FieldInputProps, FieldType, FieldValueTypes } from "@yadad/core";
import { useState } from "react";
import type { ReactNode } from "react";
import { baseRegistry } from "../../registry/base.js";
import {
  CALENDAR_TODAY,
  calendarDays,
  calendarFixtureEntries,
  calendarLegend,
  calendarWeekdays,
  invalidError,
  monthGridDates,
  monthTitle,
  referenceOptions,
  requiredError,
  samples,
  weekGridDates,
  weekTitle,
} from "./fixtures.js";
import "./gallery.css";

const { FieldFrame, Section, Button, Table, ErrorSummary, Tabs, Panel, Calendar: CalendarMaybe } = baseRegistry.layout;
const Count = baseRegistry.widgets.count;
if (!CalendarMaybe) throw new Error("layout.Calendar missing from baseRegistry");
const Calendar = CalendarMaybe;

/**
 * The "stress" theme: a deliberately different dark token set, defined here
 * on purpose. If a component followed the engine's dark theme instead of the
 * tokens, it would not pick up these values. The "dark" option is the
 * engine's own darkTheme, which is what hosts actually get.
 */
export const galleryDarkTheme: Theme = {
  "color-text": "#e8f0e8",
  "color-text-muted": "#93b393",
  "color-background": "#0d1a0d",
  "color-surface": "#16241a",
  "color-border": "#4a7a5a",
  "color-accent": "#5ce27a",
  "color-danger": "#ff6b57",
  "space-1": "0.25rem",
  "space-2": "0.5rem",
  "space-3": "0.75rem",
  "space-4": "1rem",
  "radius-sm": "0.125rem",
  "radius-md": "0.75rem",
  "font-family": "Georgia, serif",
  "font-size-sm": "0.8125rem",
  "font-size-md": "1.0625rem",
  "focus-ring-width": "4px",
  "shadow-sm": "0 0 0 1px #5ce27a",
  "shadow-md": "0 0 12px #5ce27a",
};

/**
 * A third, clearly different look — the card 5 proof that THEMING.md is
 * sufficient to restyle the whole set. It is built ONLY from names the
 * reference documents: theme tokens (via themeToCss, below) and
 * per-component variables plus data-part selectors. No component CSS, no
 * new variables, no knowledge of a component's internals.
 */
export const galleryBrandTheme: Theme = {
  "color-text": "#241a35",
  "color-text-muted": "#6b5f82",
  "color-background": "#fff6ec",
  "color-surface": "#f1e6ff",
  "color-border": "#3d2c63",
  "color-accent": "#8a2be2",
  "color-danger": "#c2261c",
  "space-1": "0.25rem",
  "space-2": "0.5rem",
  "space-3": "0.75rem",
  "space-4": "1rem",
  "radius-sm": "0.9rem",
  "radius-md": "1.6rem",
  "font-family": "\"Trebuchet MS\", Verdana, sans-serif",
  "font-size-sm": "0.9375rem",
  "font-size-md": "1.125rem",
  "focus-ring-width": "5px",
  "shadow-sm": "3px 3px 0 #3d2c63",
  "shadow-md": "6px 6px 0 #3d2c63",
};

/**
 * Brand look, layer 2: per-component variables and one data-part rule, every
 * name taken verbatim from THEMING.md. (Unlayered, so it wins over
 * @layer yadad.components — the layer rule the reference documents.)
 */
const brandOverridesCss = `
[data-yadad="button"][data-part="root"] {
  --yadad-button-radius: 999px;
  --yadad-button-border: transparent;
  font-weight: 700;
}
[data-yadad="button"][data-part="root"][data-variant="secondary"] {
  --yadad-button-secondary-color: var(--yadad-color-background);
  --yadad-button-secondary-background: var(--yadad-color-border);
}
[data-yadad="panel"], [data-yadad="section"] {
  --yadad-panel-border: var(--yadad-color-border);
  --yadad-section-border: var(--yadad-color-border);
}
/* nested parts use the descendant form (the marker is on the component root) */
[data-yadad="table"] [data-part="header"] {
  --yadad-table-header-background: var(--yadad-color-accent);
  color: var(--yadad-color-background);
}
[data-yadad="tabs"] {
  --yadad-tabs-indicator: var(--yadad-color-danger);
  --yadad-tabs-selected-color: var(--yadad-color-accent);
}
[data-yadad="error-summary"] {
  --yadad-error-summary-bar: var(--yadad-color-accent);
  --yadad-error-summary-background: var(--yadad-color-surface);
}
[data-yadad="count"] [data-part="value"] {
  color: var(--yadad-color-accent);
  font-weight: 700;
}
`;

const THEMES: Record<"light" | "dark" | "stress" | "brand", Theme> = {
  light: lightTheme,
  dark: darkTheme,
  stress: galleryDarkTheme,
  brand: galleryBrandTheme,
};

const state = (id: string, title: string, children: ReactNode): ReactNode => (
  <div className="state" id={id}>
    <h3>{title}</h3>
    {children}
  </div>
);

/**
 * Renders a component with its props. The compiler cannot check JSX on a
 * generic component type, so this calls it inside its own render, which is the
 * same thing for React.
 */
function Host<P>({ component, props }: { component: (props: P) => ReactNode; props: P }): ReactNode {
  return component(props);
}

/** FieldFrame + the type's Input, exactly as the contract kit renders it. */
function Field<K extends FieldType>({
  type,
  value,
  errors,
  idPrefix,
  extras,
}: {
  type: K;
  value: FieldValueTypes[K] | undefined;
  errors?: readonly DocumentError[];
  idPrefix: string;
  /** Overrides the sample's extra Input props (e.g. a reference picker that is still loading). */
  extras?: FieldInputExtras[K];
}): ReactNode {
  const sample = samples[type];
  const { field } = sample;
  const entry = baseRegistry.fields[type];
  const inputId = idPrefix;
  const errorId = `${inputId}-errors`;
  return (
    <FieldFrame inputId={inputId} errorId={errorId} label={field.label} required={field.required === true} errors={errors ?? []}>
      <Host
        component={entry.Input as (props: FieldInputProps<K>) => ReactNode}
        props={Object.assign(
          {},
          {
            inputId,
            field,
            value,
            onChange: () => {},
            invalid: errors !== undefined && errors.length > 0,
            ...(errors && errors.length > 0 ? { describedBy: errorId } : {}),
          },
          extras ?? sample.inputExtras,
        )}
      />
    </FieldFrame>
  );
}

function applyTextScale(scale: "100" | "200"): void {
  if (scale === "200") {
    document.documentElement.dataset.textScale = "200";
  } else {
    delete document.documentElement.dataset.textScale;
  }
}

function FieldGroup<K extends FieldType>({ type }: { type: K }): ReactNode {
  const sample = samples[type];
  const { field, value } = sample;
  const entry = baseRegistry.fields[type];
  const errors: readonly DocumentError[] =
    type === "boolean" || type === "number"
      ? [invalidError(`/${field.id}`, type === "number" ? "Weight must be a multiple of 2.5." : "This value is not allowed.")]
      : [requiredError(`/${field.id}`)];
  return (
    <section id={`group-${type}`}>
      <h2>{type}</h2>
      {state(`${type}-empty`, "empty", <Field type={type} value={undefined} idPrefix={`g-${type}-empty`} />)}
      {state(`${type}-filled`, "filled", <Field type={type} value={value} idPrefix={`g-${type}-filled`} />)}
      {state(`${type}-required`, "required (no value)", <Field type={type} value={undefined} idPrefix={`g-${type}-required`} />)}
      {state(`${type}-invalid`, "invalid, with an error message", <Field type={type} value={value} errors={errors} idPrefix={`g-${type}-invalid`} />)}
      {state(`${type}-display-value`, "display: value", <Host component={entry.Display as (props: FieldDisplayProps<K>) => ReactNode} props={Object.assign({}, { field, value }, sample.displayExtras)} />)}
      {state(`${type}-display-empty`, "display: no value", <Host component={entry.Display as (props: FieldDisplayProps<K>) => ReactNode} props={Object.assign({}, { field, value: undefined }, sample.displayExtras)} />)}
      <p className="note">The contract's InputProps has no disabled state, so none is shown.</p>
    </section>
  );
}

/** The states only a reference has: options still loading, failed, empty or cut short; a value outside the options; labels that did not resolve. */
function ReferenceStates(): ReactNode {
  const { field, value } = samples.reference;
  const Display = baseRegistry.fields.reference.Display;
  return (
    <section id="group-reference-states">
      <h2>reference: option and label states</h2>
      {state("reference-loading", "options loading", <Field type="reference" value={undefined} idPrefix="g-reference-loading" extras={{ options: { status: "loading" } }} />)}
      {state("reference-error", "options failed to load", <Field type="reference" value={undefined} idPrefix="g-reference-error" extras={{ options: { status: "error", message: "The server is unreachable." } }} />)}
      {state("reference-no-options", "no records to choose from", <Field type="reference" value={undefined} idPrefix="g-reference-none" extras={{ options: { status: "ready", options: [], more: false } }} />)}
      {state("reference-more", "more records than listed", <Field type="reference" value={value} idPrefix="g-reference-more" extras={{ options: { status: "ready", options: referenceOptions, more: true } }} />)}
      {state("reference-outside-options", "value not among the options (shows its label)", <Field type="reference" value="e99" idPrefix="g-reference-outside" extras={{ options: { status: "ready", options: referenceOptions, more: true }, valueLabel: "Zercher squat" }} />)}
      {state("reference-display-loading", "display: label loading (raw id)", <Display field={field} value="e99" label="e99" status="loading" />)}
      {state("reference-display-missing", "display: record deleted", <Display field={field} value="e99" label="Unknown" status="missing" />)}
      {state("reference-display-long", "display: long label", <Display field={field} value="e4" label={referenceOptions[3]?.label ?? ""} status="found" />)}
    </section>
  );
}

function TableState({ caption, many, idPrefix }: { caption: string; many?: boolean; idPrefix: string }): ReactNode {
  const columns = [
    { id: "day", headerId: `${idPrefix}-col-day`, label: "Day", sortable: true },
    { id: "weight", headerId: `${idPrefix}-col-weight`, label: "Weight", sortable: true },
    { id: "actions", headerId: `${idPrefix}-col-actions`, label: "Actions", sortable: false },
  ] as const;
  const long = "The longest cell text in the gallery, long enough to wrap in a narrow column without pushing the page sideways.";
  const rows = many
    ? Array.from({ length: 40 }, (_, i) => ({
        id: `r${i}`,
        cells: [`2026-10-${String(40 - i).padStart(2, "0")}`, i % 2 === 0 ? long : "100 kg", i % 3 === 0 ? long : "—"],
      }))
    : [
        { id: "r1", cells: ["2026-10-04", "100 kg", "—"] },
        { id: "r2", cells: ["2026-10-03", "95 kg", "—"] },
      ];
  return <Table caption={caption} columns={[...columns]} rows={rows} onSort={() => {}} empty="No sets yet" />;
}

function TableSortStates(): ReactNode {
  const rows = [
    { id: "r1", cells: ["2026-10-04", "100 kg", "—"] },
    { id: "r2", cells: ["2026-10-03", "95 kg", "—"] },
  ];
  const columns = (idPrefix: string, sort?: "asc" | "desc") =>
    [
      { id: "day", headerId: `${idPrefix}-col-day`, label: "Day", sortable: true, ...(sort ? { sort } : {}) },
      { id: "weight", headerId: `${idPrefix}-col-weight`, label: "Weight", sortable: true },
      { id: "actions", headerId: `${idPrefix}-col-actions`, label: "Actions", sortable: false },
    ] as const;
  return (
    <>
      {state("table-sort-none", "sortable headers: no sort", <Table caption="Sets (unsorted)" columns={[...columns("g-sort-none")]} rows={rows} onSort={() => {}} empty="No sets" />)}
      {state("table-sort-asc", "sortable headers: ascending", <Table caption="Sets (ascending)" columns={[...columns("g-sort-asc", "asc")]} rows={rows} onSort={() => {}} empty="No sets" />)}
      {state("table-sort-desc", "sortable headers: descending", <Table caption="Sets (descending)" columns={[...columns("g-sort-desc", "desc")]} rows={rows} onSort={() => {}} empty="No sets" />)}
    </>
  );
}

function TabsState({ many }: { many?: boolean }): ReactNode {
  const tabs = many
    ? ["Log", "History", "Stats", "Goals", "Equipment", "Diet", "Recovery", "Calendar", "Export", "Settings"].map((title, i) => ({ id: `t${i}`, title }))
    : [
        { id: "log", title: "Log" },
        { id: "history", title: "History" },
      ];
  const [selected, setSelected] = useState(tabs[0]?.id ?? "");
  const title = tabs.find((t) => t.id === selected)?.title ?? selected;
  return (
    <Tabs label={many ? "Dashboard (many tabs)" : "Training"} tabs={tabs} selected={selected} onSelect={setSelected} panel={<p>Panel for {title}</p>} />
  );
}

/** Builds the CalendarProps<ReactNode> content: title + small detail fields, with a real gap between them (card 11 issue 1). */
function entryContent(title: string, detail?: string): ReactNode {
  return (
    <>
      <span>{title}</span>
      {detail ? <span className="calendar-entry-detail">{detail}</span> : null}
    </>
  );
}

/**
 * A stateful month/week calendar harness: owns the visible range like a real
 * renderer would. Card 7 does not wire onOpenEntry/onMove (those are cards 8
 * and 9); nav and the mode switch are real.
 */
function CalendarHarness({
  id,
  initialMode,
  oneModeOnly,
  initialAnchor,
  entries,
  legend,
  notice,
}: {
  id: string;
  initialMode: "month" | "week";
  oneModeOnly?: boolean;
  initialAnchor: string;
  entries: typeof calendarFixtureEntries;
  legend?: boolean;
  notice?: ReactNode;
}): ReactNode {
  const [mode, setMode] = useState<"month" | "week">(initialMode);
  const [anchor, setAnchor] = useState(initialAnchor);

  const dates = mode === "month" ? monthGridDates(anchor) : weekGridDates(anchor);
  const title = mode === "month" ? monthTitle(anchor) : weekTitle(dates);
  const days = calendarDays(dates, mode === "month" ? anchor : dates[0] ?? anchor, entries).map((d) => ({
    ...d,
    entries: d.entries.map((e) => ({ ...e, content: entryContent(e.title, e.detail) })),
  }));

  const step = (n: number): void => {
    setAnchor((a) => {
      const d = new Date(`${a}T00:00:00Z`);
      if (mode === "month") d.setUTCMonth(d.getUTCMonth() + n);
      else d.setUTCDate(d.getUTCDate() + n * 7);
      return d.toISOString().slice(0, 10);
    });
  };

  return (
    <Calendar
      label={id}
      title={title}
      mode={mode}
      modes={oneModeOnly ? [{ mode, label: mode === "month" ? "Month" : "Week" }] : [{ mode: "month", label: "Month" }, { mode: "week", label: "Week" }]}
      weekdays={calendarWeekdays}
      days={days}
      legend={legend === false ? [] : [...calendarLegend]}
      loading={false}
      {...(notice !== undefined ? { notice } : {})}
      onModeChange={setMode}
      onPrevious={() => step(-1)}
      onNext={() => step(1)}
      onToday={() => setAnchor(CALENDAR_TODAY)}
    />
  );
}

const LAYOUT_ANCHORS = [
  "field-frame-errors",
  "field-frame-clean",
  "section-titled",
  "section-untitled",
  "button-primary-enabled",
  "button-primary-disabled",
  "button-secondary-enabled",
  "button-secondary-disabled",
  "table-empty",
  "table-few-rows",
  "table-many-rows-long-text",
  "table-sort-none",
  "table-sort-asc",
  "table-sort-desc",
  "error-summary-one",
  "error-summary-many",
  "tabs-two",
  "tabs-many",
  "panel-titled",
  "panel-untitled",
  "count-small",
  "count-large",
  "count-loading",
  "calendar-month-empty",
  "calendar-month-busy",
  "calendar-month-today",
  "calendar-week",
  "calendar-one-mode",
  "calendar-phone-agenda",
] as const;

const FIELD_STATES = ["empty", "filled", "required", "invalid", "display-value", "display-empty"] as const;
const FIELD_TYPES: readonly FieldType[] = ["text", "number", "boolean", "select", "date", "reference"];

export default function App(): ReactNode {
  const [mode, setMode] = useState<"light" | "dark" | "stress" | "brand">("light");
  const [textScale, setTextScale] = useState<"100" | "200">("100");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeToCss(THEMES[mode]) }} />
      {mode === "brand" ? (
        <style dangerouslySetInnerHTML={{ __html: brandOverridesCss }} />
      ) : null}
      <div className="gallery">
        <h1>yadad base component gallery</h1>
        <nav aria-label="Controls" className="controls">
          <span>
            Theme:{" "}
            <button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}>
              light
            </button>{" "}
            <button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}>
              dark
            </button>{" "}
            <button type="button" aria-pressed={mode === "stress"} onClick={() => setMode("stress")}>
              stress
            </button>{" "}
            <button type="button" aria-pressed={mode === "brand"} onClick={() => setMode("brand")}>
              brand
            </button>
          </span>
          <span>
            Text:{" "}
            <button
              type="button"
              aria-pressed={textScale === "100"}
              onClick={() => {
                setTextScale("100");
                applyTextScale("100");
              }}
            >
              100%
            </button>{" "}
            <button
              type="button"
              aria-pressed={textScale === "200"}
              onClick={() => {
                setTextScale("200");
                applyTextScale("200");
              }}
            >
              200%
            </button>
          </span>
        </nav>
        <nav aria-label="States" className="toc">
          <details open>
            <summary>all states</summary>
            <ul>
              {FIELD_TYPES.map((t) => (
                <li key={t}>
                  <a href={`#group-${t}`}>{t}</a>:{" "}
                  {FIELD_STATES.map((s) => (
                    <a key={s} href={`#${t}-${s}`}>
                      {s}
                    </a>
                  ))}
                </li>
              ))}
              <li>
                layout: {LAYOUT_ANCHORS.map((s) => (
                  <a key={s} href={`#${s}`}>
                    {s}
                  </a>
                ))}
              </li>
            </ul>
          </details>
        </nav>

        <FieldGroup type="text" />
        <FieldGroup type="number" />
        <FieldGroup type="boolean" />
        <FieldGroup type="select" />
        <FieldGroup type="date" />
        <FieldGroup type="reference" />
        <ReferenceStates />

        <section id="group-field-frame">
          <h2>field-frame</h2>
          {state("field-frame-errors", "with errors", <Field type="text" value={undefined} errors={[requiredError("/name")]} idPrefix="g-frame-errors" />)}
          {state("field-frame-clean", "without errors", <Field type="text" value="Ada" idPrefix="g-frame-clean" />)}
        </section>

        <section id="group-section">
          <h2>section</h2>
          {state(
            "section-titled",
            "with a title",
            <Section id="g-section-titled" title="Details">
              <p>Inside the titled section.</p>
            </Section>,
          )}
          {state(
            "section-untitled",
            "without a title",
            <Section id="g-section-untitled">
              <p>Inside the untitled section.</p>
            </Section>,
          )}
        </section>

        <section id="group-button">
          <h2>button</h2>
          {state("button-primary-enabled", "primary, enabled", <Button label="Save" type="button" variant="primary" disabled={false} />)}
          {state("button-primary-disabled", "primary, disabled", <Button label="Save" type="button" variant="primary" disabled onPress={() => {}} />)}
          {state("button-secondary-enabled", "secondary, enabled", <Button label="Cancel" type="button" variant="secondary" disabled={false} />)}
          {state("button-secondary-disabled", "secondary, disabled", <Button label="Cancel" type="button" variant="secondary" disabled onPress={() => {}} />)}
        </section>

        <section id="group-table">
          <h2>table</h2>
          {state(
            "table-empty",
            "empty",
            <Table
              caption="Sets (empty)"
              columns={[
                { id: "day", headerId: "g-e-col-day", label: "Day", sortable: true },
                { id: "weight", headerId: "g-e-col-weight", label: "Weight", sortable: false },
              ]}
              rows={[]}
              onSort={() => {}}
              empty="No sets yet"
            />,
          )}
          {state("table-few-rows", "a few rows", <TableState caption="Sets (a few rows)" idPrefix="g-few" />)}
          {state("table-many-rows-long-text", "many rows and long cell text", <TableState caption="Sets (many rows)" many idPrefix="g-many" />)}
          <TableSortStates />
        </section>

        <section id="group-error-summary">
          <h2>error-summary</h2>
          {state("error-summary-one", "one error", <ErrorSummary id="g-errors-one" errors={[requiredError("/name")]} />)}
          {state(
            "error-summary-many",
            "several errors",
            <ErrorSummary
              id="g-errors-many"
              errors={[
                requiredError("/name"),
                invalidError("/weight", "Weight must be a multiple of 2.5."),
                { path: "/day", code: "invalid-value", message: "Day is outside the allowed range.", hint: "Pick a day between 2026-01-01 and 2026-12-31." },
              ]}
            />,
          )}
        </section>

        <section id="group-tabs">
          <h2>tabs</h2>
          {state("tabs-two", "two tabs", <TabsState />)}
          {state("tabs-many", "many tabs", <TabsState many />)}
        </section>

        <section id="group-panel">
          <h2>panel</h2>
          {state(
            "panel-titled",
            "with a title",
            <Panel title="Working sets">
              <p>Widget body inside a titled panel.</p>
            </Panel>,
          )}
          {state(
            "panel-untitled",
            "without a title",
            <Panel>
              <p>Widget body inside an untitled panel.</p>
            </Panel>,
          )}
        </section>

        <section id="group-count">
          <h2>count</h2>
          {state("count-small", "a small number", <Count label="Working sets" value={4} />)}
          {state("count-large", "a large number", <Count label="Total reps this year" value={1234567} />)}
          {state("count-loading", "loading (no value)", <Count label="Working sets" value={undefined} />)}
        </section>

        <section id="group-calendar">
          <h2>calendar</h2>
          {state(
            "calendar-month-empty",
            "empty month",
            <CalendarHarness id="Training (empty)" initialMode="month" initialAnchor="2026-12-01" entries={[]} legend={false} />,
          )}
          {state(
            "calendar-month-busy",
            "busy day with overflow (+N more)",
            <CalendarHarness id="Training" initialMode="month" initialAnchor={CALENDAR_TODAY} entries={calendarFixtureEntries} />,
          )}
          {state(
            "calendar-month-today",
            "today marked, with a notice",
            <CalendarHarness
              id="Training (today)"
              initialMode="month"
              initialAnchor={CALENDAR_TODAY}
              entries={calendarFixtureEntries}
              notice={<p>Showing the first 2,000 of 2,431 entries.</p>}
            />,
          )}
          {state(
            "calendar-week",
            "week mode",
            <CalendarHarness id="Training (week)" initialMode="week" initialAnchor={CALENDAR_TODAY} entries={calendarFixtureEntries} />,
          )}
          {state(
            "calendar-one-mode",
            "one mode only (no mode switch)",
            <CalendarHarness id="Travel" initialMode="month" oneModeOnly initialAnchor={CALENDAR_TODAY} entries={calendarFixtureEntries} />,
          )}
          {state(
            "calendar-phone-agenda",
            "phone agenda reflow (390px container)",
            <div className="phone-frame">
              <CalendarHarness id="Training (phone)" initialMode="month" initialAnchor={CALENDAR_TODAY} entries={calendarFixtureEntries} />
            </div>,
          )}
        </section>
      </div>
    </>
  );
}
