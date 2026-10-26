import type { DisplayProps, InputProps, TagsField } from "@yadad/core";
import { useState } from "react";
import type { ReactNode } from "react";

/** Trim and collapse runs of spaces — the whole normalization this set applies (RFC 0008 item 15). */
function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

/**
 * Chip editor (RFC 0008 item 15): a text field plus an add button; Enter or
 * the button appends (trimmed, empty and case-insensitive duplicates refused),
 * each chip has a remove button, and Backspace on an empty text field removes
 * the last chip. No autocomplete framework — the card's UX is exactly this.
 * An emptied list emits undefined, like every other cleared input.
 */
export function TagsInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<TagsField, readonly string[]>): ReactNode {
  const [draft, setDraft] = useState("");
  const tags = value ?? [];
  const add = (): void => {
    const tag = normalizeTag(draft);
    if (tag === "" || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      return;
    }
    onChange([...tags, tag]);
    setDraft("");
  };
  const remove = (at: number): void => {
    const next = tags.filter((_, i) => i !== at);
    onChange(next.length === 0 ? undefined : next);
  };
  return (
    <div data-yadad="tags" data-part="input">
      <ul data-part="chips">
        {tags.map((tag, i) => (
          <li key={`${tag}-${i}`} data-part="chip">
            <span data-part="chip-label">{tag}</span>
            <button type="button" data-part="remove" aria-label={`Remove ${tag}`} onClick={() => remove(i)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <span data-part="editor">
        <input
          id={inputId}
          data-part="add-input"
          name={field.id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              remove(tags.length - 1);
            }
          }}
          aria-invalid={invalid}
          aria-required={field.required === true}
          aria-describedby={describedBy}
          aria-labelledby={labelledBy}
        />
        <button type="button" data-part="add" onClick={add} disabled={normalizeTag(draft) === ""}>
          Add
        </button>
      </span>
    </div>
  );
}

/**
 * Read-only chips (RFC 0008 item 15). Empty renders the set's em-dash marker
 * (as the dashboard does for a missing value) so a table cell always shows the
 * column exists; order is the entry order, preserved by the input.
 */
export function TagsDisplay({ value }: DisplayProps<TagsField, readonly string[]>): ReactNode {
  const tags = value ?? [];
  if (tags.length === 0) {
    return (
      <span data-yadad="tags" data-part="display" data-empty="true">
        —
      </span>
    );
  }
  return (
    <span data-yadad="tags" data-part="display">
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} data-part="chip">
          {tag}
        </span>
      ))}
    </span>
  );
}
