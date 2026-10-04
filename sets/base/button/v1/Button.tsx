import type { ButtonProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A native button in a primary or secondary style. */
export function Button({ label, type, variant, disabled, onPress }: ButtonProps): ReactNode {
  return (
    <button type={type} data-yadad="button" data-part="root" data-variant={variant} disabled={disabled} onClick={onPress}>
      {label}
    </button>
  );
}
