"use client";
import { type ChangeEvent } from "react";

/**
 * `Check` — the shared check primitive behind every "is it done?" square
 * (card 31b / plan M01; calendar's `done` today, board + boolean in 31c).
 * Not a registry entry and not a documented component: apps import
 * `@yadad/components/calendar` or `.../board`, never this. Internal sets are
 * the repo's shared-primitive lane (`internal/menu`, `internal/skeleton`,
 * `internal/swatch` are the precedents) and their CSS ships inside the
 * fragments that import them (scripts/build-css.ts).
 *
 * It renders a **native `<input type="checkbox">`** with `appearance: none`
 * (plan M01, owner's call 2026-10-31): keyboard (Space), form participation,
 * `checked`/`disabled` and the accessible name from the owning `<label>` or
 * `aria-label` all stay browser behaviour, and only the paint is ours —
 * `check.css` draws the box and the tick from tokens only (D7). The look
 * follows the owner's SPA reference (`todo-app/static/style.css` `.chk`,
 * cited in the plan): a filled square/circle with a tick that shrinks in,
 * never a `display:none` pop.
 *
 * Props stay close to the native input on purpose: `checked` /
 * `defaultChecked` / `disabled` / `onChange` mirror `HTMLInputElement`, the
 * naming props pass through, and `data-part` is overridable so each consumer
 * keeps its own part name (calendar: `done-input`; board/boolean keep theirs
 * in 31c). The primitive owns only the element and its `data-yadad="check"`
 * marker.
 */
export interface CheckProps {
  /** Controlled checked state (native checkbox semantics). */
  checked?: boolean;
  /** Uncontrolled initial state (native `defaultChecked`). */
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Native change handler — fires on click, Space and label clicks. */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Accessible name when no `<label>` wraps the box. */
  "aria-label"?: string;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  "aria-required"?: boolean;
  id?: string;
  name?: string;
  value?: string;
  className?: string;
  /** Override the primitive's own part name (calendar passes `done-input`; board too; boolean keeps `input`). */
  "data-part"?: string;
  /**
   * Override the primitive's own component marker (card 31c: boolean passes
   * `boolean` — its input IS the component root, and the documented
   * `[data-yadad="boolean"][data-part="input"]` contract and field-frame's
   * `:has([data-yadad="boolean"])` label floor must survive the swap). The
   * primitive stays styleable either way: it always also carries the
   * `data-yadad-check` attribute, which is what check.css matches.
   */
  "data-yadad"?: string;
  "data-testid"?: string;
}

export function Check({
  checked,
  defaultChecked,
  disabled,
  required,
  onChange,
  className,
  "data-part": dataPart,
  "data-yadad": dataYadad,
  ...rest
}: CheckProps) {
  return (
    <input
      type="checkbox"
      data-yadad="check"
      {...(dataYadad !== undefined ? { "data-yadad": dataYadad } : {})}
      data-yadad-check=""
      data-part="check-input"
      {...(dataPart !== undefined ? { "data-part": dataPart } : {})}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      required={required}
      onChange={onChange}
      className={className}
      {...rest}
    />
  );
}
