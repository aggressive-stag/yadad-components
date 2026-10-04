import type { BooleanField, DisplayProps, InputProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A checkbox. Emits true when ticked and false when unticked. */
export function BooleanInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<BooleanField, boolean>): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="checkbox"
      data-yadad="boolean"
      data-part="input"
      checked={value === true}
      onChange={(e) => onChange(e.target.checked)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    />
  );
}

export function BooleanDisplay({ value }: DisplayProps<BooleanField, boolean>): ReactNode {
  return (
    <span data-yadad="boolean" data-part="display">
      {value === undefined ? "" : value ? "Yes" : "No"}
    </span>
  );
}
