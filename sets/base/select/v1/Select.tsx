import type { DisplayProps, InputProps, SelectField } from "@yadad/core";
import type { ReactNode } from "react";

/** A native select over the field's static choices. The empty "Choose…" entry emits undefined. */
export function SelectInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<SelectField, string>): ReactNode {
  return (
    <select
      id={inputId}
      name={field.id}
      data-yadad="select"
      data-part="input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    >
      <option value="">Choose…</option>
      {field.options.values.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
}

export function SelectDisplay({ value }: DisplayProps<SelectField, string>): ReactNode {
  return (
    <span data-yadad="select" data-part="display">
      {value ?? ""}
    </span>
  );
}
