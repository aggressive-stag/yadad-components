import type { DateField, DisplayProps, InputProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A native date input. Values are "YYYY-MM-DD"; emptying it emits undefined. */
export function DateInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<DateField, string>): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="date"
      data-yadad="date"
      data-part="input"
      min={field.min}
      max={field.max}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    />
  );
}

export function DateDisplay({ value }: DisplayProps<DateField, string>): ReactNode {
  return value === undefined ? null : (
    <time data-yadad="date" data-part="display" dateTime={value}>
      {value}
    </time>
  );
}
