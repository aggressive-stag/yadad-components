"use client";

import { paletteSlot } from "../../../internal/swatch/v1/index.js";
import type { FieldDisplayProps, FieldInputProps } from "@yadad/core";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";

/**
 * Every word the reference input says, as a prop; each default is the
 * English literal that was hardcoded before (card 15a).
 */
export interface ReferenceStrings {
  /** Empty option when not loading. Default: "Choose…". */
  readonly chooseLabel?: string;
  /** Empty option while choices load. Default: "Loading…". */
  readonly loadingOptionLabel?: string;
  /** Status line while choices load. Default: "Loading choices…". */
  readonly loadingStatusLabel?: string;
  /** Status line when loading failed. Default: `Could not load choices: ${message}`. */
  readonly errorLabel?: (message: string) => string;
  /** Status line when there are no records. Default: "No records to choose from yet.". */
  readonly emptyLabel?: string;
  /** Status line when the list was cut short. Default: `Showing the first ${count} records only.`. */
  readonly moreLabel?: (count: number) => string;
  /** Combobox only: the same cut-short status, saying typing filters just the loaded records. Default: `Showing the first ${count} records only. Typing filters only these.`. */
  readonly moreFilterLabel?: (count: number) => string;
  /** Combobox only: the one disabled option shown when nothing matches the typed text. Default: "No matches". */
  readonly noMatchLabel?: string;
}

/** From this many loaded options on, the picker is a type-to-filter combobox; fewer keep the native select. */
export const COMBOBOX_MIN_OPTIONS = 8;

/** Case- and accent-insensitive form of a label, for substring matching. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * The picker for the records the renderer loaded for the target entity. With
 * fewer than COMBOBOX_MIN_OPTIONS records it is a native select; from there on
 * it is an ARIA 1.2 combobox that filters the loaded records as you type
 * (client-side only). Both reuse the select component's look
 * (data-yadad="select"), so the select CSS variables, tap target and focus ring
 * apply. The renderer fetches the options; this component only shows them, plus
 * a status line while they load, when they fail, when there are none and when
 * the list was cut short. The current value is always shown, even if it is not
 * among the options.
 */
export function ReferenceInput(props: FieldInputProps<"reference"> & { strings?: ReferenceStrings }): ReactNode {
  return props.options.status === "ready" && props.options.options.length >= COMBOBOX_MIN_OPTIONS ? <ReferenceCombobox {...props} /> : <ReferenceSelect {...props} />;
}

function statusMessage(options: FieldInputProps<"reference">["options"], strings: ReferenceStrings, combobox: boolean): string | undefined {
  return options.status === "loading"
    ? (strings.loadingStatusLabel ?? "Loading choices…")
    : options.status === "error"
      ? (strings.errorLabel ?? ((m: string) => `Could not load choices: ${m}`))(options.message)
      : options.options.length === 0
        ? (strings.emptyLabel ?? "No records to choose from yet.")
        : options.more
          ? combobox
            ? (strings.moreFilterLabel ?? ((count: number) => `Showing the first ${count} records only. Typing filters only these.`))(options.options.length)
            : (strings.moreLabel ?? ((count: number) => `Showing the first ${count} records only.`))(options.options.length)
          : undefined;
}

function StatusLine({ id, options, message }: { id: string; options: FieldInputProps<"reference">["options"]; message: string | undefined }): ReactNode {
  return message === undefined ? null : (
    <span id={id} role="status" data-yadad="reference" data-part="status" data-state={options.status === "ready" ? (options.options.length === 0 ? "empty" : "more") : options.status}>
      {message}
    </span>
  );
}

function ReferenceCombobox({ inputId, field, value, onChange, invalid, describedBy, labelledBy, options, valueLabel, strings = {} }: FieldInputProps<"reference"> & { strings?: ReferenceStrings }): ReactNode {
  const statusId = useId();
  const listboxId = useId();
  const loaded = options.status === "ready" ? options.options : [];
  const [open, setOpen] = useState(false);
  // null: the text is the current label; a string: what the user typed.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const current = loaded.find((o) => o.id === value);
  const shownLabel = value === undefined ? "" : (current?.label ?? valueLabel ?? value);
  const matches = query === null || query.trim() === "" ? loaded : loaded.filter((o) => fold(o.label).includes(fold(query.trim())));
  const message = statusMessage(options, strings, true);
  const optionId = (i: number): string => `${listboxId}-o${i}`;
  const activeId = open && matches[active] !== undefined ? optionId(active) : undefined;

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, query]);

  const show = (): void => {
    if (!open) {
      setOpen(true);
      const at = loaded.findIndex((o) => o.id === value);
      setActive(at < 0 ? 0 : at);
    }
  };
  const close = (): void => {
    setOpen(false);
    setQuery(null);
  };
  const pick = (id: string): void => {
    if (id !== value) onChange(id);
    close();
  };

  return (
    <>
      <div data-yadad="reference" data-part="combobox">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          data-yadad="select"
          data-part="input"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={invalid}
          aria-required={field.required === true}
          aria-describedby={[describedBy, message === undefined ? undefined : statusId].filter((id) => id !== undefined).join(" ") || undefined}
          aria-labelledby={labelledBy}
          placeholder={strings.chooseLabel ?? "Choose…"}
          value={query ?? shownLabel}
          onClick={show}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onBlur={() => {
            // Leaving: an emptied text clears an optional field; anything else restores the label.
            if (query !== null && query.trim() === "" && field.required !== true && value !== undefined) onChange(undefined);
            close();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) show();
              else setActive((i) => Math.max(0, Math.min(matches.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              const o = matches[active];
              if (o !== undefined) pick(o.id);
            } else if (e.key === "Escape" && open) {
              e.stopPropagation();
              close();
            }
          }}
        />
        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={labelledBy}
            data-yadad="reference"
            data-part="listbox"
            // Keep focus in the input while the pointer or a finger picks.
            onMouseDown={(e) => e.preventDefault()}
          >
            {matches.length === 0 ? (
              <li role="option" aria-selected="false" aria-disabled="true" data-yadad="reference" data-part="option" data-state="empty">
                {strings.noMatchLabel ?? "No matches"}
              </li>
            ) : (
              matches.map((o, i) => (
                <li
                  key={o.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={o.id === value}
                  data-yadad="reference"
                  data-part="option"
                  data-active={i === active ? "true" : undefined}
                  onClick={() => pick(o.id)}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <StatusLine id={statusId} options={options} message={message} />
    </>
  );
}

function ReferenceSelect({ inputId, field, value, onChange, invalid, describedBy, labelledBy, options, valueLabel, strings = {} }: FieldInputProps<"reference"> & { strings?: ReferenceStrings }): ReactNode {
  const statusId = useId();
  const listed = options.status === "ready" && options.options.some((o) => o.id === value);
  const message = statusMessage(options, strings, false);
  return (
    <>
      <select
        id={inputId}
        name={field.id}
        data-yadad="select"
        data-part="input"
        value={value ?? ""}
        disabled={options.status === "loading"}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        aria-invalid={invalid}
        aria-required={field.required === true}
        aria-busy={options.status === "loading"}
        aria-describedby={[describedBy, message === undefined ? undefined : statusId].filter((id) => id !== undefined).join(" ") || undefined}
        aria-labelledby={labelledBy}
      >
        <option value="">{options.status === "loading" ? (strings.loadingOptionLabel ?? "Loading…") : (strings.chooseLabel ?? "Choose…")}</option>
        {value !== undefined && !listed && <option value={value}>{valueLabel ?? value}</option>}
        {options.status === "ready" &&
          options.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
      </select>
      <StatusLine id={statusId} options={options} message={message} />
    </>
  );
}

/** The referenced record's label (the renderer passes its raw id while loading and "Unknown" when it is gone), with its colour dot when the field declares `colorFrom`. */
export function ReferenceDisplay({ value, label, status, color }: FieldDisplayProps<"reference">): ReactNode {
  // RFC 0008 item 8: the referenced record's own colour (field.colorFrom) is a swatch hint,
  // painted only for a found record and only from the documented vocabulary (as the select does).
  const slot = status === "found" ? paletteSlot(color) : undefined;
  return value === undefined || value === "" ? null : (
    <span data-yadad="reference" data-part="display" data-status={status}>
      {slot !== undefined && <span data-part="swatch" data-slot={slot} aria-hidden="true" />}
      {label}
    </span>
  );
}
