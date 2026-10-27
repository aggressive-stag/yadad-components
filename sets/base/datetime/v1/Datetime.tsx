import type { DatetimeField, DatetimeInputExtras, DisplayProps, InputProps } from "@yadad/core";
import type { ReactNode } from "react";

/**
 * A native datetime input. The value is the local datetime the renderer
 * handed the component (the renderer converts between the viewer's zone and
 * the stored UTC instant, RFC 0007); the component only shows and returns it.
 * Emptying it emits undefined.
 */
export function DatetimeInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy, minLocal, maxLocal }: InputProps<DatetimeField, string> & DatetimeInputExtras): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="datetime-local"
      data-yadad="datetime"
      data-part="input"
      min={minLocal}
      max={maxLocal}
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
 * `<time dateTime={stored}>` with the text the renderer formatted for the
 * viewer's zone and locale; shows the stored instant when no text is given.
 */
export function DatetimeDisplay({ value, text }: DisplayProps<DatetimeField, string> & { text?: string }): ReactNode {
  return value === undefined ? null : (
    <time data-yadad="datetime" data-part="display" dateTime={value}>
      {text ?? value}
    </time>
  );
}
