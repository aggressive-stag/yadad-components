import type { ButtonProps } from "@yadad/core";
import type { ReactNode } from "react";

/** A native button in a primary or secondary style, in a neutral or danger tone. `pressed` (RFC 0009 item 5, the saved-filter chip) marks a toggle: it draws the selected look and announces `aria-pressed`; absent, a plain push button. */
export function Button({ label, type, variant, tone, disabled, pressed, onPress }: ButtonProps): ReactNode {
  return (
    <button type={type} data-yadad="button" data-part="root" data-variant={variant} data-tone={tone} data-pressed={pressed === true ? "true" : undefined} disabled={disabled} {...(pressed === undefined ? {} : { "aria-pressed": pressed })} onClick={onPress}>
      {label}
    </button>
  );
}
