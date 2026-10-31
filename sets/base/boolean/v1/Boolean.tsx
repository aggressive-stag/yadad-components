import type { BooleanField, DisplayProps, InputProps } from "@yadad/core";
import type { ReactNode } from "react";
import { Check } from "../../../internal/check/v1/index.js";

/**
 * A checkbox. Emits true when ticked and false when unticked.
 *
 * Card 31c: the box is the shared internal `Check` primitive. It stays a
 * native `<input type="checkbox">` (keyboard, form and naming are browser
 * behaviour), and it keeps this component's markers — `data-yadad="boolean"`
 * and `data-part="input"` — because the documented selector
 * `[data-yadad="boolean"][data-part="input"]` and field-frame's
 * `:has([data-yadad="boolean"])` label floor depend on them; the primitive
 * always also carries `data-yadad-check`, which is what its own sheet paints.
 */
export function BooleanInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<BooleanField, boolean>): ReactNode {
  return (
    <Check
      data-yadad="boolean"
      data-part="input"
      id={inputId}
      name={field.id}
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
