import { optionValue } from "@yadad/core";
import type { DisplayProps, InputProps, SelectField } from "@yadad/core";
import type { ReactNode } from "react";

/** A native select over the field's static choices. The empty "Choose…" entry emits undefined. `chooseLabel` overrides that entry's text (card 15a; default: "Choose…"). */
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
        // RFC 0008 item 5 made an option `{ value, label?, color? }` or a bare
        // string. Rendering `label ?? value` and the colour dot is card 23b;
        // until then an object option shows its stored value, unchanged from
        // the string behaviour (optionValue normalizes both spellings).
        <option key={optionValue(choice)} value={optionValue(choice)}>
          {optionValue(choice)}
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
