import type { DisplayProps, InputProps, TimeField } from "@yadad/core";
import type { ReactNode } from "react";

/**
 * A native time input (RFC 0008 item 14). Values are "HH:MM" — 24-hour,
 * zero-padded, no day, no zone; emptying it emits undefined. `field.step` is
 * minutes in the contract but seconds on the native control, so it is scaled.
 */
export function TimeInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<TimeField, string>): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="time"
      data-yadad="time"
      data-part="input"
      min={field.min}
      max={field.max}
      step={(field.step ?? 1) * 60}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    />
  );
}

/**
 * Read-only time. Empty renders the set's em-dash marker (a table cell or
 * summary always shows the column exists), unlike `date`, whose empty display
 * is nothing — RFC 0008 item 14 asked for the visible empty here.
 */
export function TimeDisplay({ value }: DisplayProps<TimeField, string>): ReactNode {
  if (value === undefined) {
    return (
      <span data-yadad="time" data-part="display" data-empty="true">
        —
      </span>
    );
  }
  return (
    <time data-yadad="time" data-part="display" dateTime={value}>
      {value}
    </time>
  );
}
