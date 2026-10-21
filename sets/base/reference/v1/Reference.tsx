import type { FieldDisplayProps, FieldInputProps } from "@yadad/core";
import type { ReactNode } from "react";
import { useId } from "react";

/**
 * Every word the reference input says, as a prop; each default is the
 * English literal that was hardcoded before (card 15a).
 */
export interface ReferenceStrings {
  /** Empty option when not loading. Default: "Choose…". */
  readonly chooseLabel?: string;
  /** Empty option while choices load. Default: "Loading…". */
  readonly loadingOptionLabel?: string;
  /** Status line while choices load. Default: "Loading choices…". */
  readonly loadingStatusLabel?: string;
  /** Status line when loading failed. Default: `Could not load choices: ${message}`. */
  readonly errorLabel?: (message: string) => string;
  /** Status line when there are no records. Default: "No records to choose from yet.". */
  readonly emptyLabel?: string;
  /** Status line when the list was cut short. Default: `Showing the first ${count} records only.`. */
  readonly moreLabel?: (count: number) => string;
}

/**
 * A native select over the records the renderer loaded for the target entity.
 * It reuses the select component's look (data-yadad="select"), so the select
 * CSS variables, tap target and focus ring apply. The renderer fetches the
 * options; this component only shows them, plus a status line while they load,
 * when they fail, when there are none and when the list was cut short. The
 * current value is always shown, even if it is not among the options.
 */
export function ReferenceInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy, options, valueLabel, strings = {} }: FieldInputProps<"reference"> & { strings?: ReferenceStrings }): ReactNode {
  const statusId = useId();
  const listed = options.status === "ready" && options.options.some((o) => o.id === value);
  const message =
    options.status === "loading"
      ? (strings.loadingStatusLabel ?? "Loading choices…")
      : options.status === "error"
        ? (strings.errorLabel ?? ((m: string) => `Could not load choices: ${m}`))(options.message)
        : options.options.length === 0
          ? (strings.emptyLabel ?? "No records to choose from yet.")
          : options.more
            ? (strings.moreLabel ?? ((count: number) => `Showing the first ${count} records only.`))(options.options.length)
            : undefined;
  return (
    <>
      <select
        id={inputId}
        name={field.id}
        data-yadad="select"
        data-part="input"
        value={value ?? ""}
        disabled={options.status === "loading"}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        aria-invalid={invalid}
        aria-required={field.required === true}
        aria-busy={options.status === "loading"}
        aria-describedby={[describedBy, message === undefined ? undefined : statusId].filter((id) => id !== undefined).join(" ") || undefined}
        aria-labelledby={labelledBy}
      >
        <option value="">{options.status === "loading" ? (strings.loadingOptionLabel ?? "Loading…") : (strings.chooseLabel ?? "Choose…")}</option>
        {value !== undefined && !listed && <option value={value}>{valueLabel ?? value}</option>}
        {options.status === "ready" &&
          options.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
      </select>
      {message !== undefined && (
        <span id={statusId} role="status" data-yadad="reference" data-part="status" data-state={options.status === "ready" ? (options.options.length === 0 ? "empty" : "more") : options.status}>
          {message}
        </span>
      )}
    </>
  );
}

/** The referenced record's label (the renderer passes its raw id while loading and "Unknown" when it is gone). */
export function ReferenceDisplay({ value, label, status }: FieldDisplayProps<"reference">): ReactNode {
  return value === undefined || value === "" ? null : (
    <span data-yadad="reference" data-part="display" data-status={status}>
      {label}
    </span>
  );
}
