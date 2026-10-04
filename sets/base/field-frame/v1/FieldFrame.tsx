import type { FieldFrameProps } from "@yadad/core";
import type { ReactNode } from "react";

/** Label, required marker and error chrome around every Input. */
export function FieldFrame({ inputId, label, required, errors, children }: FieldFrameProps<ReactNode>): ReactNode {
  return (
    <div data-yadad="field-frame" data-part="root">
      <label data-part="label" htmlFor={inputId}>
        {label}
        {required && (
          <span data-part="required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {errors.length > 0 && (
        <div data-part="errors" role="alert">
          {errors.map((e) => (
            <p key={`${e.path} ${e.code}`} data-part="error" data-code={e.code}>
              {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
