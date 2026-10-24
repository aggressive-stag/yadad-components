import type { ButtonProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A native button in a primary or secondary style, in a neutral or danger tone. */
export function Button({ label, type, variant, tone, disabled, onPress }: ButtonProps): ReactNode {
  return (
    <button type={type} data-yadad="button" data-part="root" data-variant={variant} data-tone={tone} disabled={disabled} onClick={onPress}>
      {label}
    </button>
  );
}
