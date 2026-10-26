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
import { optionValue } from "@yadad/core";
import type { BoardCard, BoardColumn, DocumentError, FieldDisplayExtras, FieldDisplayProps, FieldInputExtras, FieldInputProps, FieldType, FieldValueTypes, SelectField } from "@yadad/core";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { baseRegistry } from "../../registry/base.js";
import { DatetimeDisplay } from "../../sets/base/datetime/v1/index.js";
import {
  CALENDAR_TODAY,
  calendarDays,
  calendarFixtureEntries,
  calendarLegend,
  calendarWeekdays,
  invalidError,
  monthGridDates,
  monthTitle,
  manyReferenceOptions,
  referenceOptions,
  requiredError,
  seriesMonthLine,
  seriesSingleGroup,
  seriesWeekGroups,
  seriesWeekLine,
  samples,
  weekGridDates,
  weekTitle,
} from "./fixtures.js";
import "./gallery.css";

const { FieldFrame, Section, Button, Table, ErrorSummary, Tabs, Panel, Calendar: CalendarMaybe, Board: BoardMaybe, Dialog: DialogMaybe } = baseRegistry.layout;
const Count = baseRegistry.widgets.count;
const SeriesMaybe = baseRegistry.widgets.series;
if (!CalendarMaybe) throw new Error("layout.Calendar missing from baseRegistry");
const Calendar = CalendarMaybe;
if (!SeriesMaybe) throw new Error("widgets.series missing from baseRegistry");
const Series = SeriesMaybe;
if (!BoardMaybe) throw new Error("layout.Board missing from baseRegistry");
const Board = BoardMaybe;
if (!DialogMaybe) throw new Error("layout.Dialog missing from baseRegistry");
const Dialog = DialogMaybe;
// Direct import for the static demo state: modal={false} is a demo/print
// affordance outside the registry's DialogProps contract (same pattern as
// the datetime display's text prop).
import { Dialog as DialogComponent } from "../../sets/base/dialog/v1/index.js";
import { Board as BoardComponent } from "../../sets/base/board/v1/index.js";
// The 15e loading prop is a set-level extension (no `layout.Table` contract
// change without an engine card), so the skeleton state imports the real
// component instead of the registry slot, the way DialogComponent does.
import { Table as TableComponent } from "../../sets/base/table/v1/index.js";
import { Pager } from "../../sets/base/pager/v1/index.js";
const TextEntry = baseRegistry.fields.text;

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
  // A reference picker keeps its picked value so typing and picking can be tried by hand; a tags
  // field keeps its chips so Enter-add, chip-remove and Backspace-remove can be tried by hand
  // (card 23a's keyboard-only check drives the real component, so it needs real state).
  // Every other state is static.
  const [picked, setPicked] = useState(value);
  // The datetime entry is optional until the reference set ships it (RFC 0007); the
  // gallery only renders types it has wired, so this is an invariant, not a state.
  if (entry === undefined) return <p>not wired: {type}</p>;
  const inputId = idPrefix;
  const errorId = `${inputId}-errors`;
  return (
    <FieldFrame inputId={inputId} errorId={errorId} label={field.label} required={field.required === true} errors={errors ?? []}>
      <Host
        component={entry.Input as unknown as (props: FieldInputProps<K>) => ReactNode}
        props={Object.assign(
          {},
          {
            inputId,
            field,
            value: type === "reference" || type === "tags" ? picked : value,
            onChange:
              type === "reference" || type === "tags"
                ? (v: FieldValueTypes[K] | undefined) => setPicked(v)
                : () => {},
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
  // The datetime entry is optional until the reference set ships it (RFC 0007); the
  // gallery only renders types it has wired, so this is an invariant, not a state.
  if (entry === undefined) return <p>not wired: {type}</p>;
  const errors: readonly DocumentError[] =
    type === "boolean" || type === "number"
      ? [invalidError(`/${field.id}`, type === "number" ? "Weight must be a multiple of 2.5." : "This value is not allowed.")]
      : [requiredError(`/${field.id}`)];
  // The gallery plays the renderer: the datetime Input receives the local
  // value instantToLocal would produce (the gallery views in UTC, the engine's
  // viewStates default), not the stored canonical instant — a native
  // datetime-local control rejects the "…sssZ" form (RFC 0007).
  const inputValue = (type === "datetime" && typeof value === "string" ? value.slice(0, 16) : value) as FieldValueTypes[K] | undefined;
  return (
    <section id={`group-${type}`}>
      <h2>{type}</h2>
      {state(`${type}-empty`, "empty", <Field type={type} value={undefined} idPrefix={`g-${type}-empty`} />)}
      {state(`${type}-filled`, "filled", <Field type={type} value={inputValue} idPrefix={`g-${type}-filled`} />)}
      {state(`${type}-required`, "required (no value)", <Field type={type} value={undefined} idPrefix={`g-${type}-required`} />)}
      {state(`${type}-invalid`, "invalid, with an error message", <Field type={type} value={inputValue} errors={errors} idPrefix={`g-${type}-invalid`} />)}
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
      {state("reference-combobox", "40 records: type to filter, one picked", <Field type="reference" value="e2" idPrefix="g-reference-combobox" extras={{ options: { status: "ready", options: manyReferenceOptions, more: false } }} />)}
      {state("reference-combobox-more", "40 records, more than listed", <Field type="reference" value="e99" idPrefix="g-reference-combobox-more" extras={{ options: { status: "ready", options: manyReferenceOptions, more: true }, valueLabel: "Zercher squat" }} />)}
      {state("reference-display-loading", "display: label loading (raw id)", <Display field={field} value="e99" label="e99" status="loading" />)}
      {state("reference-display-missing", "display: record deleted", <Display field={field} value="e99" label="Unknown" status="missing" />)}
      {state("reference-display-long", "display: long label", <Display field={field} value="e4" label={referenceOptions[3]?.label ?? ""} status="found" />)}
    </section>
  );
}

/** The states only a text field has: the word diff of a compare column (RFC 0007). */
function TextDiffStates(): ReactNode {
  const { field } = samples.text;
  const Display = baseRegistry.fields.text.Display;
  const longRun = "The longest diff run in the gallery, long enough that the marks must wrap inside the cell instead of pushing the page sideways.";
  return (
    <section id="group-text-diff">
      <h2>text: word diff (compare column)</h2>
      {state("text-diff-short", "display: short diff (removed + added runs)", <Display field={field} value="Ada Lovelace" diff={[{ kind: "removed", text: "Alice " }, { kind: "same", text: "Ada " }, { kind: "added", text: "Lovelace" }]} />)}
      {state("text-diff-long", "display: long runs wrap", <Display field={field} value={longRun} diff={[{ kind: "removed", text: `Short. ${longRun.slice(0, 60)} ` }, { kind: "added", text: longRun }]} />)}
      {state("text-diff-identical", "display: identical texts (all same)", <Display field={field} value="Ada" diff={[{ kind: "same", text: "Ada" }]} />)}
      {state("text-diff-empty", "display: empty texts", <Display field={field} value={undefined} diff={[{ kind: "removed", text: "" }, { kind: "added", text: "" }]} />)}
    </section>
  );
}

/** The state only a datetime has: the Display showing the text the renderer formatted for the viewer's zone (RFC 0007). */
function DatetimeStates(): ReactNode {
  const { field, value } = samples.datetime;
  return (
    <section id="group-datetime-text">
      <h2>datetime: formatted display</h2>
      {state("datetime-display-text", "display: renderer-formatted text (the stored UTC instant stays in dateTime)", <DatetimeDisplay field={field} value={value} text="Oct 4, 2026, 7:30 AM" />)}
    </section>
  );
}

/** The states only tags has: one chip, and many long chips wrapping (checked at 320px by the phone checks). */
function TagsStates(): ReactNode {
  const { field } = samples.tags;
  const entry = baseRegistry.fields.tags;
  if (entry === undefined) return <p>not wired: tags</p>;
  const Display = entry.Display;
  return (
    <section id="group-tags-states">
      <h2>tags: chip counts</h2>
      {state("tags-display-one", "display: one chip", <Display field={field} value={["squat"]} />)}
      {state("tags-display-many", "display: many long chips (wraps at 320px)", <Display field={field} value={["squat", "bench press", "deadlift", "overhead press, strict, from the rack", "5x5 @ 100 kg", "accessory work", "feet elevated"]} />)}
    </section>
  );
}

/**
 * RFC 0008 items 5–6 (card 23b): options as objects — `label ?? value` in the
 * picker and the display, the documented 8-colour vocabulary as a dot (and an
 * out-of-vocabulary colour painting none), and the FormItem.label override the
 * renderer passes as the frame label (display-only; nothing writes it back).
 */
function SelectStates(): ReactNode {
  const entry = baseRegistry.fields.select;
  if (entry === undefined) return <p>not wired: select</p>;
  const Display = entry.Display;
  const coloured: SelectField = {
    id: "list",
    type: "select",
    label: "List",
    options: {
      source: "static",
      values: [
        { value: "#464EA9", label: "Home", color: "#464EA9" },
        { value: "#D13438", label: "Work", color: "#D13438" },
        { value: "#F7630C", label: "Gym", color: "#F7630C" },
        { value: "#FFB900", label: "Reading", color: "#FFB900" },
        { value: "#107C10", label: "Garden", color: "#107C10" },
        { value: "#038387", label: "Side project", color: "#038387" },
        { value: "#8764B8", label: "Music", color: "#8764B8" },
        { value: "#C239B3", label: "Trips", color: "#C239B3" },
      ],
    },
  };
  const outside: SelectField = {
    id: "tone",
    type: "select",
    label: "Tone",
    options: { source: "static", values: [{ value: "hot", label: "Hot", color: "#123456" }, { value: "cold", label: "Cold" }] },
  };
  return (
    <section id="group-select-states">
      <h2>select: labels, colours, form-item label</h2>
      {state("select-options-labelled", "options with labels (picker shows label, not value)", <FieldFrame inputId="g-select-labelled" errorId="g-select-labelled-errors" label="List" required={false} errors={[]}><Host component={entry.Input as unknown as (props: FieldInputProps<"select">) => ReactNode} props={{ inputId: "g-select-labelled", field: coloured, value: "#D13438", onChange: () => {}, invalid: false }} /></FieldFrame>)}
      {state("select-display-labelled", "display: label plus the vocabulary dot", <Display field={coloured} value="#D13438" />)}
      {state("select-display-all-colours", "display: the full vocabulary", <span style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>{coloured.options.values.map((o) => <Display key={optionValue(o)} field={coloured} value={optionValue(o)} />)}</span>)}
      {state("select-display-no-dot", "display: colour outside the vocabulary paints no dot", <Display field={outside} value="hot" />)}
      {state("select-display-plain-value", "display: a value no option carries (kept as-is)", <Display field={coloured} value="#ABCDEF" />)}
      {state("select-formitem-label", "form-item label override (renderer: item.label ?? field.label)", <FieldFrame inputId="g-select-formitem" errorId="g-select-formitem-errors" label="Important" required={false} errors={[]}><Host component={entry.Input as unknown as (props: FieldInputProps<"select">) => ReactNode} props={{ inputId: "g-select-formitem", field: { ...coloured, id: "flag" }, value: "#8764B8", onChange: () => {}, invalid: false }} /></FieldFrame>)}
    </section>
  );
}

function TableState({ caption, many, idPrefix, loading = false }: { caption: string; many?: boolean; idPrefix: string; loading?: boolean }): ReactNode {
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
  return <TableComponent caption={caption} columns={[...columns]} rows={rows} onSort={() => {}} empty="No sets yet" loading={loading} />;
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

/** Record actions in table rows (RFC 0007): one action, several, pending, danger. */
function TableActionsStates(): ReactNode {
  const columns = (idPrefix: string) => [
    { id: "day", headerId: `${idPrefix}-col-day`, label: "Day", sortable: false },
    { id: "weight", headerId: `${idPrefix}-col-weight`, label: "Weight", sortable: false },
  ];
  const rows = [
    { id: "r1", cells: ["2026-10-04", "100 kg"], actions: [{ id: "a1", label: "Open", tone: "neutral", pending: false, onPress: () => {} }] },
    {
      id: "r2",
      cells: ["2026-10-03", "95 kg"],
      actions: [
        { id: "a1", label: "Open", tone: "neutral", pending: false, onPress: () => {} },
        { id: "a2", label: "Duplicate", tone: "neutral", pending: false, onPress: () => {} },
        { id: "a3", label: "Delete", tone: "danger", pending: false, onPress: () => {} },
      ],
    },
    {
      id: "r3",
      cells: ["2026-10-02", "90 kg"],
      actions: [
        { id: "a1", label: "Open", tone: "neutral", pending: true, onPress: () => {} },
        { id: "a3", label: "Delete", tone: "danger", pending: true, onPress: () => {} },
      ],
    },
  ] as const;
  return (
    <>
      {state("table-actions-one", "actions: one per row", <Table caption="Sets (one action)" columns={columns("g-actions-one")} rows={[...rows.slice(0, 1)]} onSort={() => {}} empty="No sets" />)}
      {state("table-actions-several", "actions: several and a danger tone", <Table caption="Sets (several actions)" columns={columns("g-actions-several")} rows={[...rows.slice(0, 2)]} onSort={() => {}} empty="No sets" />)}
      {state("table-actions-pending", "actions: pending (buttons disabled, Working...)", <Table caption="Sets (pending)" columns={columns("g-actions-pending")} rows={[...rows]} onSort={() => {}} empty="No sets" actionsLabel="Do" />)}
      {state("actions-dialog-confirm", "action asks for confirmation (dialog: Cancel + Confirm; the row goes pending after)", <ActionsDialogState scenario="confirm" />)}
      {state("actions-dialog-reason", "action asks for a reason (empty Reason keeps the dialog open with its validation error)", <ActionsDialogState scenario="reason" />)}
      {state("actions-dialog-refused", "a refused action (after the dialog closes, the view shows the refusal in an ErrorSummary)", <ActionsDialogState scenario="refused" />)}
      {state("actions-dialog-stale", "a stale action (the record changed; the ErrorSummary says reload after the dialog closes)", <ActionsDialogState scenario="stale" />)}
    </>
  );
}

/**
 * Card 14d: actions and dialogs together, as the RFC 0007 review screens
 * compose them. One row carries the action; pressing it opens the dialog the
 * action needs; after the dialog closes the view shows what the renderer
 * decided (a refusal or a stale-record message in the view's ErrorSummary).
 * `scenario` picks which; the phone-frame keeps the non-modal chrome at
 * phone width while the check viewport does the modal.
 */
type ActionsDialogScenario = "confirm" | "reason" | "refused" | "stale";

function ActionsDialogState({ scenario }: { scenario: ActionsDialogScenario }): ReactNode {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const invalidNote = note === "";
  const [viewErrors, setViewErrors] = useState<readonly DocumentError[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const columns = [
    { id: "day", headerId: `g-ad-${scenario}-day`, label: "Day", sortable: false },
    { id: "weight", headerId: `g-ad-${scenario}-weight`, label: "Weight", sortable: false },
  ];
  const actionLabel = scenario === "confirm" ? "Archive" : scenario === "reason" ? "Add note" : scenario === "refused" ? "Export" : "Delete";
  const rows = [
    {
      id: "r1",
      cells: ["2026-10-04", "100 kg"] as const,
      actions: [{ id: "a1", label: actionLabel, tone: scenario === "stale" ? ("danger" as const) : ("neutral" as const), pending, onPress: () => { setViewErrors([]); setDone(null); setNote(""); setOpen(true); } }],
    },
  ];
  const closeDialog = (): void => setOpen(false);
  const finish = (outcome: "done" | "refused" | "stale"): void => {
    setOpen(false);
    setPending(true);
    setTimeout(() => {
      setPending(false);
      if (outcome === "done") setDone(scenario === "reason" ? `Note saved: "${note}".` : `${actionLabel} completed.`);
      if (outcome === "refused") setViewErrors([invalidError("/export", "Export refused: you do not own this record.")]);
      if (outcome === "stale") setViewErrors([invalidError("/record", "The record changed since the dialog opened. Reload and try again.")]);
    }, 1200);
  };
  const titleId = `g-ad-${scenario}-name`;
  const titleErrorId = `g-ad-${scenario}-name-errors`;
  return (
    <div className="phone-frame">
      <Table caption={`Sets (${scenario})`} columns={columns} rows={[...rows]} onSort={() => {}} empty="No sets" />
      {viewErrors.length > 0 ? <ErrorSummary id={`g-ad-${scenario}-view-errors`} errors={viewErrors} /> : null}
      {done !== null ? <p className="note">{done}</p> : null}
      {open ? (
        <Dialog label={scenario === "confirm" ? "Archive this set?" : scenario === "reason" ? "Add a note" : scenario === "refused" ? "Export the log?" : "Delete this set?"} onClose={closeDialog}>
          {scenario === "confirm" ? <p>Archived sets stay out of the table. You can undo it from History.</p> : null}
          {scenario === "refused" ? <p>The renderer asks the server; a refusal lands in the view's ErrorSummary when this closes.</p> : null}
          {scenario === "stale" ? <p>Deleting is permanent. The server rejects it if the record changed since this opened.</p> : null}
          {scenario === "reason" ? (
            <>
              <FieldFrame inputId={titleId} errorId={titleErrorId} label="Reason" required errors={invalidNote ? [requiredError("/note")] : []}>
                <Host
                  component={TextEntry?.Input as unknown as (props: FieldInputProps<"text">) => ReactNode}
                  props={{
                    inputId: titleId,
                    field: { ...samples.text.field, required: true },
                    value: note || undefined,
                    onChange: (v: string | undefined) => setNote(v ?? ""),
                    invalid: invalidNote,
                    ...(invalidNote ? { describedBy: titleErrorId } : {}),
                  }}
                />
              </FieldFrame>
              {/* FieldFrame renders the field's own role="alert" errors (its
                  errorId) — a second ErrorSummary here would only repeat it.
                  ErrorSummary stays reserved for view-level refusals. */}
            </>
          ) : null}
          <p className="dialog-buttons">
            <Button label="Cancel" type="button" variant="secondary" disabled={false} onPress={closeDialog} />
            <Button
              label={scenario === "reason" ? "Save" : "Confirm"}
              type="button"
              variant="primary"
              disabled={false}
              onPress={() => {
                if (scenario === "reason" && invalidNote) return; // keep the dialog open; its ErrorSummary explains
                finish(scenario === "refused" ? "refused" : scenario === "stale" ? "stale" : "done");
              }}
            />
          </p>
        </Dialog>
      ) : null}
    </div>
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
 * renderer would. `movable`/`openable` wire onMove/onOpenEntry with a tiny
 * local "renderer": it owns entry state, optimistic move, and an
 * announcement — moves onto a weekend are refused, to demo that path
 * (cards 8/9; card 7 passed neither).
 */
function CalendarHarness({
  id,
  initialMode,
  oneModeOnly,
  initialAnchor,
  entries,
  legend,
  notice,
  movable,
  openable,
}: {
  id: string;
  initialMode: "month" | "week";
  oneModeOnly?: boolean;
  initialAnchor: string;
  entries: typeof calendarFixtureEntries;
  legend?: boolean;
  notice?: ReactNode;
  movable?: boolean;
  openable?: boolean;
}): ReactNode {
  const [mode, setMode] = useState<"month" | "week">(initialMode);
  const [anchor, setAnchor] = useState(initialAnchor);
  const [localEntries, setLocalEntries] = useState(entries);
  const [announcement, setAnnouncement] = useState<{ seq: number; text: string } | undefined>(undefined);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const seqRef = useRef(0);

  const dates = mode === "month" ? monthGridDates(anchor) : weekGridDates(anchor);
  const title = mode === "month" ? monthTitle(anchor) : weekTitle(dates);
  const days = calendarDays(dates, mode === "month" ? anchor : dates[0] ?? anchor, localEntries).map((d) => ({
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

  const onMove = movable
    ? (id: string, date: string): void => {
        const entry = localEntries.find((e) => e.id === id);
        if (!entry) return;
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        seqRef.current += 1;
        if (weekday === 0 || weekday === 6) {
          setAnnouncement({ seq: seqRef.current, text: `Move refused: "${entry.title}" can't be scheduled on a weekend.` });
          return;
        }
        setLocalEntries((prev) => prev.map((e) => (e.id === id ? { ...e, date } : e)));
        setAnnouncement({ seq: seqRef.current, text: `Moved "${entry.title}" to ${date}.` });
      }
    : undefined;

  const onOpenEntry = openable ? (id: string): void => setOpenedId(id) : undefined;

  return (
    <>
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
        {...(announcement ? { announcement } : {})}
        onModeChange={setMode}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setAnchor(CALENDAR_TODAY)}
        {...(onMove ? { onMove } : {})}
        {...(onOpenEntry ? { onOpenEntry } : {})}
      />
      {openedId ? <p className="note">Opened entry: {openedId}</p> : null}
    </>
  );
}

/** Builds BoardProps<ReactNode> columns: title plus small card fields, as the renderer would. */
function boardCard(n: number, title: string, detail?: string, detail2?: string): BoardCard<ReactNode> {
  return {
    id: `r${n}`,
    label: [title, detail, detail2].filter(Boolean).join(", "),
    movable: false,
    pending: false,
    content: (
      <>
        <span>{title}</span>
        {detail ? <span className="calendar-entry-detail">{detail}</span> : null}
        {detail2 ? <span className="calendar-entry-detail">{detail2}</span> : null}
      </>
    ),
  };
}

function boardColumn(id: string, label: string, cards: BoardCard<ReactNode>[], droppable = true): BoardColumn<ReactNode> {
  return { id, label, count: cards.length, droppable, cards };
}

const STATUS_NAMES = ["To do", "In progress", "Review", "Done"] as const;
const OWNER_NAMES = ["Ada", "Grace", "Linus"] as const;

/** A stateful board harness: owns the group-by choice like a real renderer would. */
function BoardHarness({
  id,
  columnsBy,
  many,
  emptyColumn,
  openable,
  notice,
}: {
  id: string;
  columnsBy?: "status" | "owner";
  many?: boolean;
  emptyColumn?: boolean;
  openable?: boolean;
  notice?: ReactNode;
}): ReactNode {
  const [field, setField] = useState<string>(columnsBy ?? "status");
  const [opened, setOpened] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ seq: number; text: string } | undefined>(undefined);
  const seq = useRef(0);
  const total = many ? 40 : 7;
  const rows = Array.from({ length: total }, (_, i) => ({
    n: i + 1,
    title: i % 5 === 0 ? `Task ${i + 1}: a long title that wraps over several lines to check the card` : `Task ${i + 1}`,
    status: STATUS_NAMES[i % (emptyColumn ? 3 : 4)] as string,
    owner: OWNER_NAMES[i % 3] as string,
    due: `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
  const byField = (names: readonly string[], key: "status" | "owner"): BoardColumn<ReactNode>[] =>
    names.map((name) => boardColumn(`v:${name}`, name, rows.filter((r) => r[key] === name).map((r) => boardCard(r.n, r.title, `Owner: ${r.owner}`, `Due: ${r.due}`))));
  const columns: BoardColumn<ReactNode>[] = many
    ? [...byField(field === "owner" ? OWNER_NAMES : STATUS_NAMES, field === "owner" ? "owner" : "status"),
       ...Array.from({ length: 8 }, (_, i) => boardColumn(`v:extra${i}`, `Extra column ${i + 1}`, []))]
    : byField(field === "owner" ? OWNER_NAMES : STATUS_NAMES, field === "owner" ? "owner" : "status");
  return (
    <>
      <Board
        label={id}
        groupChoices={[
          { field: "status", label: "Status" },
          { field: "owner", label: "Owner" },
        ]}
        groupField={field}
        columns={columns}
        loading={false}
        {...(notice !== undefined ? { notice } : {})}
        {...(announcement ? { announcement } : {})}
        onGroupBy={(f) => {
          setField(f);
          seq.current += 1;
          setAnnouncement({ seq: seq.current, text: `Grouped by ${f === "owner" ? "Owner" : "Status"}, ${f === "owner" ? 3 : 4} columns` });
        }}
        {...(openable ? { onOpenCard: setOpened } : {})}
      />
      {opened ? <p className="note">Opened card: {opened}</p> : null}
    </>
  );
}

/**
 * A board whose cards can move, like a renderer would drive it: the harness
 * (not the component) changes a card's column. Every third card is not
 * movable, and a move into "Done" is refused with a live-announced message.
 * `readOnly` withholds `onMove`, as the renderer does for a viewer who may not edit.
 */
function MovableBoardHarness({ id, readOnly }: { id: string; readOnly?: boolean }): ReactNode {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 9 }, (_, i) => ({ n: i + 1, status: STATUS_NAMES[i % 3] as string })),
  );
  const [announcement, setAnnouncement] = useState<{ seq: number; text: string } | undefined>(undefined);
  const seq = useRef(0);
  const say = (text: string): void => {
    seq.current += 1;
    setAnnouncement({ seq: seq.current, text });
  };
  const columns = STATUS_NAMES.map((name) =>
    boardColumn(
      `v:${name}`,
      name,
      rows
        .filter((r) => r.status === name)
        .map((r) => ({ ...boardCard(r.n, `Task ${r.n}`, r.n % 3 === 0 ? "Locked" : undefined), movable: r.n % 3 !== 0 })),
    ),
  );
  return (
    <Board
      label={id}
      groupChoices={[{ field: "status", label: "Status" }]}
      groupField="status"
      columns={columns}
      loading={false}
      {...(announcement ? { announcement } : {})}
      onGroupBy={() => undefined}
      onOpenCard={() => undefined}
      {...(readOnly
        ? {}
        : {
            onMove: (recordId: string, columnId: string) => {
              const name = columnId.replace(/^v:/, "");
              const n = Number(recordId.slice(1));
              if (name === "Done") {
                say(`Move refused: Task ${n} can't be moved to Done.`);
                return;
              }
              setRows((rs) => rs.map((r) => (r.n === n ? { ...r, status: name } : r)));
              say(`Moved Task ${n} to ${name}.`);
            },
          })}
    />
  );
}

/**
 * A board whose cards carry record actions (RFC 0007): the first card has one
 * action, the next has several (last one danger), and pressing "Archive"
 * puts that card's actions in flight for a moment — buttons disabled and the
 * "Working..." live region speaking — then drops the card, like a renderer
 * would. Actions exist whether or not the board is movable.
 */
function ActionsBoardHarness({ id }: { id: string }): ReactNode {
  const [archived, setArchived] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);
  const archive = (cardId: string): void => {
    setPendingId(cardId);
    setTimeout(() => {
      setPendingId(undefined);
      setArchived((a) => [...a, cardId]);
    }, 1500);
  };
  const press = (): void => undefined;
  const mk = (n: number, title: string): BoardCard<ReactNode> => {
    const base = boardCard(n, title, `Owner: ${OWNER_NAMES[n % 3]}`);
    if (archived.includes(base.id)) return { ...base, content: <span>{title} (archived)</span> };
    const pending = pendingId === base.id;
    // The first two cards are movable too: the actions cluster sits next to
    // the "Move to…" path, which is where the RFC puts it.
    if (n === 1) return { ...base, movable: true, pending, actions: [{ id: "open", label: "Open", tone: "neutral", pending, onPress: press }] };
    if (n === 2)
      return {
        ...base,
        movable: true,
        pending,
        actions: [
          { id: "open", label: "Open", tone: "neutral", pending, onPress: press },
          { id: "dup", label: "Duplicate", tone: "neutral", pending, onPress: press },
          { id: "arch", label: "Archive", tone: "danger", pending, onPress: () => archive(base.id) },
        ],
      };
    return base;
  };
  const columns = [boardColumn("v:todo", "To do", [1, 2, 3].map((n) => mk(n, `Task ${n}`))), boardColumn("v:done", "Done", [])];
  return (
    <Board
      label={id}
      groupChoices={[{ field: "status", label: "Status" }]}
      groupField="status"
      columns={columns}
      loading={false}
      onGroupBy={() => undefined}
      onOpenCard={() => undefined}
      onMove={() => undefined}
    />
  );
}

/**
 * The same board in German (card 15a): every word the Board speaks — the
 * pending live region, the menu trigger and its names, Cancel, Move to…,
 * Group by, the empty column, the card/card count — arrives through the
 * `strings` prop, so the gallery proves the set is not English-locked.
 */
function GermanBoardHarness({ id }: { id: string }): ReactNode {
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);
  const archive = (cardId: string): void => {
    setPendingId(cardId);
    setTimeout(() => setPendingId(undefined), 1500);
  };
  const press = (): void => undefined;
  const mk = (n: number, title: string): BoardCard<ReactNode> => {
    const base = boardCard(n, title, `Bearbeiter: ${OWNER_NAMES[n % 3]}`);
    const pending = pendingId === base.id;
    if (n === 2)
      return {
        ...base,
        movable: true,
        pending,
        actions: [
          { id: "open", label: "Öffnen", tone: "neutral", pending, onPress: press },
          { id: "arch", label: "Archivieren", tone: "danger", pending, onPress: () => archive(base.id) },
        ],
      };
    return { ...base, movable: n !== 3, pending };
  };
  const columns = [boardColumn("v:todo", "Zu erledigen", [1, 2, 3].map((n) => mk(n, `Aufgabe ${n}`))), boardColumn("v:done", "Fertig", [])];
  return (
    <BoardComponent
      label={id}
      groupChoices={[{ field: "status", label: "Status" }, { field: "owner", label: "Bearbeiter" }]}
      groupField="status"
      columns={columns}
      loading={false}
      onGroupBy={() => undefined}
      onOpenCard={() => undefined}
      onMove={() => undefined}
      strings={{
        workingLabel: "Wird geladen...",
        menuLabel: "Aktionen…",
        menuAriaLabel: (card) => `Aktionen ${card}`,
        menuPanelAriaLabel: (card) => `Aktionen ${card}`,
        cancelLabel: "Abbrechen",
        moveLabel: "Verschieben nach…",
        moveAriaLabel: (card) => `Verschieben nach… ${card}`,
        movePanelAriaLabel: (card) => `Verschiebe ${card}`,
        moveToLabel: (card) => `Verschiebe ${card} nach`,
        chooseColumnLabel: "Spalte wählen",
        moveConfirmLabel: "Verschieben",
        groupByLabel: "Gruppieren nach",
        loadingLabel: "Karten werden geladen…",
        emptyLabel: "Keine Karten",
        columnCountLabel: (count) => `${count} ${count === 1 ? "Karte" : "Karten"}`,
      }}
    />
  );
}

/**
 * A calendar whose entries carry record actions (RFC 0007): the entry on the
 * 20th with one action shows a plain button, the one with several shows the
 * "Actions…" menu; Cancel closes it, Escape returns to the trigger. "Delete"
 * is danger and really removes the entry after a 1500ms pending beat, and the
 * entries stay movable so the actions cluster sits next to "Move to day…".
 */
function ActionsCalendarHarness({ id }: { id: string }): ReactNode {
  const [removed, setRemoved] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);
  const [moves, setMoves] = useState<Record<string, string>>({});
  const remove = (entryId: string): void => {
    setPendingId(entryId);
    setTimeout(() => {
      setPendingId(undefined);
      setRemoved((r) => [...r, entryId]);
    }, 1500);
  };
  const press = (): void => undefined;
  const base = calendarFixtureEntries.filter((e) => !removed.includes(e.id) && e.date === "2026-10-20");
  const withActions = base.map((e) => {
    const date = moves[e.id] ?? e.date;
    const pending = pendingId === e.id;
    if (e.id === "e3") return { ...e, date, pending, actions: [{ id: "open", label: "Open", tone: "neutral" as const, pending, onPress: press }] };
    if (e.id === "e4")
      return {
        ...e,
        date,
        pending,
        actions: [
          { id: "open", label: "Open", tone: "neutral" as const, pending, onPress: press },
          { id: "dup", label: "Duplicate", tone: "neutral" as const, pending, onPress: press },
          { id: "del", label: "Delete", tone: "danger" as const, pending, onPress: () => remove(e.id) },
        ],
      };
    return { ...e, date, pending, actions: undefined };
  });
  const days = calendarDays(monthGridDates(CALENDAR_TODAY), CALENDAR_TODAY, withActions).map((d) => ({
    ...d,
    entries: d.entries.map((e) => {
      const w = withActions.find((x) => x.id === e.id);
      return { ...e, content: entryContent(e.title, e.detail), ...(w?.actions ? { actions: w.actions } : {}) };
    }),
  }));
  return (
    <Calendar
      label={id}
      title={monthTitle(CALENDAR_TODAY)}
      mode="month"
      modes={[{ mode: "month", label: "Month" }, { mode: "week", label: "Week" }]}
      weekdays={calendarWeekdays}
      days={days}
      legend={[...calendarLegend]}
      loading={false}
      onModeChange={() => undefined}
      onPrevious={() => undefined}
      onNext={() => undefined}
      onToday={() => undefined}
      onMove={(entryId, date) => setMoves((m) => ({ ...m, [entryId]: date }))}
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
  "button-primary-danger",
  "button-secondary-enabled",
  "button-secondary-disabled",
  "table-empty",
  "table-loading",
  "table-few-rows",
  "table-many-rows-long-text",
  "table-sort-none",
  "table-sort-asc",
  "table-sort-desc",
  "table-actions-one",
  "table-actions-several",
  "table-actions-pending",
  "actions-dialog-confirm",
  "actions-dialog-reason",
  "actions-dialog-refused",
  "actions-dialog-stale",
  "error-summary-one",
  "error-summary-many",
  "tabs-two",
  "tabs-many",
  "panel-titled",
  "panel-untitled",
  "count-small",
  "count-large",
  "count-loading",
  "series-table",
  "series-empty",
  "series-partial",
  "series-bar",
  "series-bar-many",
  "series-bar-loading",
  "series-bar-phone",
  "series-line",
  "series-line-sum",
  "series-line-single",
  "series-line-many",
  "series-line-loading",
  "series-line-phone",
  "calendar-month-empty",
  "calendar-month-busy",
  "calendar-month-today",
  "calendar-week",
  "calendar-one-mode",
  "calendar-phone-agenda",
  "calendar-movable",
  "calendar-actions",
  "board-columns",
  "board-empty-column",
  "board-many-cards",
  "board-many-columns",
  "board-group-by",
  "board-one-grouping",
  "board-loading",
  "board-movable",
  "board-actions",
  "board-phone",
  "board-read-only",
  "pager-middle",
  "pager-first",
  "pager-last",
  "pager-info-wrap",
] as const;

const FIELD_STATES = ["empty", "filled", "required", "invalid", "display-value", "display-empty"] as const;
const FIELD_TYPES: readonly FieldType[] = ["text", "number", "boolean", "select", "date", "reference"];

/**
 * Plays the renderer for the confirmation state: message plus the two
 * Buttons; the component under test supplies only the modal behaviour.
 */
function DialogConfirmDemo(): ReactNode {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <>
      <button type="button" onClick={() => { setResult(null); setOpen(true); }}>
        Open confirmation
      </button>{" "}
      <span aria-live="polite">{result === null ? "" : `closed via ${result}`}</span>
      {open ? (
        <Dialog label="Delete record?" onClose={() => { setResult("dismissed"); setOpen(false); }}>
          <p>Deleting is permanent. The record and its comments go with it.</p>
          <p>
            <Button label="Cancel" type="button" variant="secondary" disabled={false} onPress={() => { setResult("Cancel"); setOpen(false); }} />{" "}
            <Button label="Confirm" type="button" variant="primary" disabled={false} onPress={() => { setResult("Confirm"); setOpen(false); }} />
          </p>
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * Plays the renderer for the dialog group: owns the open state, composes the
 * content (message, an editable input field, ErrorSummary, Cancel + Confirm
 * Buttons — Cancel secondary, Confirm primary), and records which gesture
 * closed it. The component under test never builds any of this content.
 */
function DialogDemo(): ReactNode {
  const [open, setOpen] = useState(false);
  const [lastClose, setLastClose] = useState<string | null>(null);
  const [name, setName] = useState("");
  const invalid = name === "";
  const errors = invalid ? [requiredError("/title")] : [];
  const close = (reason: string): void => {
    setOpen(false);
    setLastClose(reason);
  };
  if (TextEntry === undefined) return <p>not wired: text</p>;
  return (
    <>
      <button type="button" onClick={() => { setName(""); setOpen(true); }}>
        Open dialog
      </button>{" "}
      <span aria-live="polite">{lastClose === null ? "" : `closed via ${lastClose}`}</span>
      {open ? (
        <Dialog label="Name the new record?" onClose={() => close("Escape or a background press")}>
          <p>Every close gesture routes through the renderer&apos;s onClose.</p>
          <FieldFrame inputId="dialog-demo-name" errorId="dialog-demo-name-errors" label="Title" required errors={errors}>
            <Host
              component={TextEntry.Input as unknown as (props: FieldInputProps<"text">) => ReactNode}
              props={{
                inputId: "dialog-demo-name",
                field: samples.text.field,
                value: name || undefined,
                onChange: (v: string | undefined) => { setName(v ?? ""); },
                invalid,
                ...(invalid ? { describedBy: "dialog-demo-name-errors" } : {}),
              }}
            />
          </FieldFrame>
          {invalid ? <ErrorSummary id="dialog-demo-errors" errors={errors} /> : null}
          <p>
            <Button label="Cancel" type="button" variant="secondary" disabled={false} onPress={() => close("Cancel")} />{" "}
            <Button label="Confirm" type="button" variant="primary" disabled={false} onPress={() => close("Confirm")} />
          </p>
        </Dialog>
      ) : null}
    </>
  );
}

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
        <TextDiffStates />
        <FieldGroup type="number" />
        <FieldGroup type="boolean" />
        <FieldGroup type="select" />
        <SelectStates />
        <FieldGroup type="date" />
        <FieldGroup type="datetime" />
        <DatetimeStates />
        <FieldGroup type="reference" />
        <ReferenceStates />
        <FieldGroup type="time" />
        <FieldGroup type="tags" />
        <TagsStates />

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
          {state("button-primary-danger", "primary, tone=danger (an action confirm's destructive button)", <Button label="Delete" type="button" variant="primary" tone="danger" disabled={false} />)}
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
          {state("table-loading", "loading: skeleton rows hold the column geometry (card 15e)", <TableState caption="Sets (loading)" idPrefix="g-load" loading />)}
          {state("table-many-rows-long-text", "many rows and long cell text", <TableState caption="Sets (many rows)" many idPrefix="g-many" />)}
          <TableSortStates />
          <TableActionsStates />
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

        <section id="group-series">
          <h2>series</h2>
          {state(
            "series-table",
            "twelve weeks of groups (every fourth a gap bucket)",
            <Series label="Sets per week" display="table" groups={seriesWeekGroups(12)} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-empty",
            "loaded with no groups",
            <Series label="Sets per week" display="table" groups={[]} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-partial",
            "the read stopped at the record ceiling (5000 of 9000) with 3 records ungroupable",
            <Series label="Sets per week" display="table" groups={seriesWeekGroups(6)} skipped={3} partial={{ read: 5000, total: 9000 }} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-bar",
            "twelve weeks as bars, every fourth a gap bucket (a gap is a dash, not a zero)",
            <Series label="Sets per week" display="bar" groups={seriesWeekGroups(12)} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-bar-many",
            "sixty groups: bars crowd and the x labels thin out",
            <Series label="Sets per week" display="bar" groups={seriesWeekGroups(60)} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-bar-loading",
            "loading holds the chart shape with a skeleton block",
            <Series label="Sets per day" display="bar" groups={[]} skipped={0} loading measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-bar-phone",
            "phone frame (390px container): twelve weeks of bars, coarser ticks",
            <div className="phone-frame">
              <Series label="Sets per week" display="bar" groups={seriesWeekGroups(12)} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />
            </div>,
          )}
          {state(
            "series-line",
            "twenty-six weeks as an avg measure with two gap buckets: the axis fits the data (lowest tick above zero) and the line breaks at each gap",
            <Series label="Weight per week" display="line" groups={seriesMonthLine()} skipped={0} loading={false} measureLabel="Avg of weight" aggregation="avg" />,
          )}
          {state(
            "series-line-sum",
            "the same shape as a sum measure: the axis is anchored at zero (bars and sum-lines share the rule)",
            <Series label="Sets per week" display="line" groups={seriesWeekGroups(12)} skipped={0} loading={false} measureLabel="Sum of sets" aggregation="sum" />,
          )}
          {state(
            "series-line-single",
            "one group only: a lone point has no line to sit on, so the dot alone must make it visible",
            <Series label="Weight per week" display="line" groups={seriesSingleGroup()} skipped={0} loading={false} measureLabel="Avg of weight" aggregation="avg" />,
          )}
          {state(
            "series-line-many",
            "sixty groups: the line crowds and the x labels thin out",
            <Series label="Weight per week" display="line" groups={seriesWeekLine(60)} skipped={0} loading={false} measureLabel="Avg of weight" aggregation="avg" />,
          )}
          {state(
            "series-line-loading",
            "loading holds the chart shape with a skeleton block",
            <Series label="Weight per week" display="line" groups={[]} skipped={0} loading measureLabel="Avg of weight" aggregation="avg" />,
          )}
          {state(
            "series-line-phone",
            "phone frame (390px container): twelve weeks of line, coarser ticks",
            <div className="phone-frame">
              <Series label="Weight per week" display="line" groups={seriesWeekLine(12)} skipped={0} loading={false} measureLabel="Avg of weight" aggregation="avg" />
            </div>,
          )}
        </section>

        <section id="group-pager">
          <h2>pager</h2>
          {state(
            "pager-middle",
            "middle page: First, Previous and Next all live, count in the middle",
            <Pager hasPrev hasNext info="32–63 of 148" onFirst={() => {}} onPrev={() => {}} onNext={() => {}} />,
          )}
          {state(
            "pager-first",
            "first page: First and Previous disabled",
            <Pager hasPrev={false} hasNext info="1–31 of 148" onPrev={() => {}} onNext={() => {}} />,
          )}
          {state(
            "pager-last",
            "last page: Next disabled",
            <Pager hasPrev hasNext={false} info="124–148 of 148" onFirst={() => {}} onPrev={() => {}} />,
          )}
          {state(
            "pager-info-wrap",
            "long info text at narrow width wraps under the buttons",
            <div style={{ inlineSize: "16rem" }}>
              <Pager hasPrev hasNext info="Zeigt 1.240 bis 1.271 von 14.112 Einträgen (gefiltert nach Bearbeiter)" onFirst={() => {}} onPrev={() => {}} onNext={() => {}} />
            </div>,
          )}
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
          {state(
            "calendar-movable",
            "movable + openable entries (drag or keyboard move; weekend moves are refused, live-announced)",
            <CalendarHarness
              id="Training (movable)"
              initialMode="month"
              initialAnchor={CALENDAR_TODAY}
              entries={calendarFixtureEntries}
              movable
              openable
            />,
          )}
          {state(
            "calendar-actions",
            "record actions on entries (one action: plain button; several: Actions… menu; danger Delete really deletes)",
            <ActionsCalendarHarness id="Training (actions)" />,
          )}
        </section>
        <section id="group-board">
          <h2>board</h2>
          {state("board-columns", "columns with cards, openable (Enter or click)", <BoardHarness id="Tasks" openable />)}
          {state("board-empty-column", "an empty column", <BoardHarness id="Tasks (empty column)" emptyColumn />)}
          {state("board-many-cards", "many cards: each column scrolls on its own", <BoardHarness id="Tasks (many cards)" many openable notice={<p>Showing the first 1,000 of 1,412 cards. Narrow the filter.</p>} />)}
          {state(
            "board-many-columns",
            "many columns: the board scrolls sideways",
            <Board
              label="Tasks (many columns)"
              groupChoices={[{ field: "assignee", label: "Assignee" }]}
              groupField="assignee"
              columns={Array.from({ length: 12 }, (_, i) => boardColumn(`v:u${i}`, `Person ${i + 1}`, i % 3 === 0 ? [] : [boardCard(i, `Task ${i}`, "Due: 2026-11-02")]))}
              loading={false}
              onGroupBy={() => undefined}
            />,
          )}
          {state("board-group-by", "group-by switch (Status / Owner), regroups and announces", <BoardHarness id="Tasks (group by)" columnsBy="owner" openable />)}
          {state(
            "board-one-grouping",
            "one grouping: no picker",
            <Board
              label="Tasks (one grouping)"
              groupChoices={[{ field: "status", label: "Status" }]}
              groupField="status"
              columns={[boardColumn("v:To do", "To do", [boardCard(1, "Task 1")]), boardColumn("empty", "No Status", [])]}
              loading={false}
              onGroupBy={() => undefined}
            />,
          )}
          {state(
            "board-loading",
            "loading: columns without cards",
            <Board
              label="Tasks (loading)"
              groupChoices={[{ field: "status", label: "Status" }]}
              groupField="status"
              columns={STATUS_NAMES.map((n) => boardColumn(`v:${n}`, n, []))}
              loading
              onGroupBy={() => undefined}
            />,
          )}
          {state(
            "board-movable",
            "movable cards (drag onto a column, or Move to…); every third card is locked; moves into Done are refused",
            <MovableBoardHarness id="Tasks (movable)" />,
          )}
          {state(
            "board-actions",
            "record actions on cards: one button; several in a menu (danger Archive puts the card's actions in flight: disabled + Working...); next to Move to…",
            <ActionsBoardHarness id="Tasks (actions)" />,
          )}
          {state(
            "board-strings-german",
            "every word via the strings prop (card 15a): Wird geladen..., Aktionen…, Verschieben nach…, Gruppieren nach, Keine Karten",
            <GermanBoardHarness id="Aufgaben (deutsch)" />,
          )}
          {state(
            "board-phone",
            "phone layout (390px container): one column at a time, swipe to the next",
            <div className="phone-frame">
              <MovableBoardHarness id="Tasks (phone)" />
            </div>,
          )}
          {state("board-read-only", "no onMove (viewer may not edit): no drag, no Move to…", <MovableBoardHarness id="Tasks (read only)" readOnly />)}
        </section>

        <section id="group-dialog">
          <h2>dialog</h2>
          {state(
            "dialog-confirm",
            "a confirmation dialog: the renderer composes the message, Cancel (secondary) and Confirm (primary)",
            <DialogConfirmDemo />,
          )}
          {state(
            "dialog-static",
            "static (modal={false}): the same shell rendered in-flow, for demos and print",
            <DialogComponent label="Delete record?" onClose={() => {}} modal={false}>
              <p>Deleting is permanent.</p>
              <p>
                <Button label="Cancel" type="button" variant="secondary" disabled={false} />{" "}
                <Button label="Delete" type="button" variant="primary" tone="danger" disabled={false} />
              </p>
            </DialogComponent>,
          )}
          {state(
            "dialog-open",
            "open it: the content is renderer-composed (an input field, ErrorSummary, Cancel + Confirm); Escape and the background press route to onClose, focus returns to the opener, and the controls outside the dialog are inert while it is open",
            <DialogDemo />,
          )}
        </section>
      </div>
    </>
  );
}
