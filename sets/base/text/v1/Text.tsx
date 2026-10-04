import type { DisplayProps, InputProps, TextField } from "@yadad/core";
import type { ReactNode } from "react";

/** Single-line text input. Emits undefined when emptied (no value). */
export function TextInput({ inputId, field, value, onChange, invalid, describedBy }: InputProps<TextField, string>): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="text"
      data-yadad="text"
      data-part="input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
    />
  );
}

/** Read-only text, for table cells and summaries. */
export function TextDisplay({ value }: DisplayProps<TextField, string>): ReactNode {
  return (
    <span data-yadad="text" data-part="display">
      {value ?? ""}
    </span>
  );
}
