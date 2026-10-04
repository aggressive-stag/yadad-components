import type { DisplayProps, InputProps, NumberField } from "@yadad/core";
import type { ReactNode } from "react";

/** Number input with an optional visible unit, which screen readers also hear. Emits undefined when emptied. */
export function NumberInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<NumberField, number>): ReactNode {
  const unitId = `${inputId}-unit`;
  const described = [describedBy, field.unit !== undefined ? unitId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div data-yadad="number" data-part="root">
      <input
        id={inputId}
        name={field.id}
        type="number"
        inputMode="decimal"
        data-part="input"
        min={field.min}
        max={field.max}
        step={field.step ?? "any"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        aria-invalid={invalid}
        aria-required={field.required === true}
        aria-describedby={described}
        aria-labelledby={labelledBy}
      />
      {field.unit !== undefined && (
        <span id={unitId} data-part="unit">
          {field.unit}
        </span>
      )}
    </div>
  );
}

export function NumberDisplay({ field, value }: DisplayProps<NumberField, number>): ReactNode {
  return (
    <span data-yadad="number" data-part="display">
      {value === undefined ? "" : `${value}${field.unit !== undefined ? ` ${field.unit}` : ""}`}
    </span>
  );
}
