import { optionLabel, optionValue } from "@yadad/core";
import type { DisplayProps, InputProps, SelectField } from "@yadad/core";
import type { ReactNode } from "react";
import { paletteSlot } from "../../../internal/swatch/v1/index.js";

/** The colour slot of an option, or undefined when it carries no vocabulary colour. */
function optionSlot(option: string | { readonly color?: string }): number | undefined {
  return paletteSlot(typeof option === "string" ? undefined : option.color);
}

/**
 * A native select over the field's static choices. The empty "Choose…" entry
 * emits undefined. `chooseLabel` overrides that entry's text (card 15a;
 * default: "Choose…"). RFC 0008 item 5: an option may be `{ value, label?,
 * color? }`; every surface shows `label ?? value`. A native `<option>` cannot
 * hold a swatch, so the colour rides on the display only (Decision).
 */
export function SelectInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy, chooseLabel }: InputProps<SelectField, string> & { chooseLabel?: string }): ReactNode {
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
      <option value="">{chooseLabel ?? "Choose…"}</option>
      {field.options.values.map((choice) => (
        <option key={optionValue(choice)} value={optionValue(choice)}>
          {optionLabel(choice)}
        </option>
      ))}
    </select>
  );
}

/**
 * Read-only label plus the RFC 0008 colour dot. The dot is token-derived
 * (categorical `--yadad-select-slot-*` variables, the calendar slot precedent)
 * and never the only signal: the label text sits beside it, and an option
 * without a colour — or with one outside the documented vocabulary — paints
 * no dot at all.
 */
export function SelectDisplay({ field, value }: DisplayProps<SelectField, string>): ReactNode {
  const option = value === undefined ? undefined : field.options.values.find((choice) => optionValue(choice) === value);
  const slot = option === undefined ? undefined : optionSlot(option);
  return (
    <span data-yadad="select" data-part="display">
      {slot !== undefined && <span data-part="swatch" data-slot={slot} aria-hidden="true" />}
      {option === undefined ? (value ?? "") : optionLabel(option)}
    </span>
  );
}
