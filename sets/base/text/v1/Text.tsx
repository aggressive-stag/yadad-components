import type { DiffSegment, DisplayProps, InputProps, TextField } from "@yadad/core";
import type { ReactNode } from "react";

/**
 * Text input: a single-line `<input>`, or a `<textarea>` when the field is
 * `multiline` (RFC 0008 item 13a). Both emit undefined when emptied (no value)
 * and carry the same label wiring, ARIA and `data-part="input"`. A field's
 * `maxLength` (13c) is set as the native attribute so the browser stops typing
 * at the limit; absent when the field declares none. The contract has no
 * disabled or read-only input state, so neither control draws one.
 */
export function TextInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<TextField, string>): ReactNode {
  if (field.multiline === true) {
    return (
      <textarea
        id={inputId}
        name={field.id}
        rows={4}
        maxLength={field.maxLength}
        data-yadad="text"
        data-part="input"
        data-multiline="true"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        aria-invalid={invalid}
        aria-required={field.required === true}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
      />
    );
  }
  return (
    <input
      id={inputId}
      name={field.id}
      type="text"
      maxLength={field.maxLength}
      data-yadad="text"
      data-part="input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      aria-invalid={invalid}
      aria-required={field.required === true}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
    />
  );
}

/**
 * Read-only text, for table cells and summaries. A multiline field's display
 * keeps its line breaks (text.css, `white-space: pre-line`; the value is text, never markup). With `diff` (the word diff of
 * a `compare` column, RFC 0007) it draws `removed` runs in `<del>` and `added`
 * runs in `<ins>`, each prefixed by visually hidden "removed:" / "added:" text
 * so the change never relies on colour alone (text.css: strike-through and
 * underline carry the marks, colours come from theme tokens). Runs of one kind
 * are already merged by the engine. Without `diff` the markup is unchanged.
 */
export function TextDisplay({ field, value, diff }: DisplayProps<TextField, string> & { diff?: readonly DiffSegment[] }): ReactNode {
  const multiline = field.multiline === true ? "true" : undefined;
  if (diff === undefined) {
    return (
      <span data-yadad="text" data-part="display" data-multiline={multiline}>
        {value ?? ""}
      </span>
    );
  }
  return (
    <span data-yadad="text" data-part="display" data-diff="words" data-multiline={multiline}>
      {diff.map((segment, i) =>
        segment.kind === "same" ? (
          <span key={i} data-part="diff-same">
            {segment.text}
          </span>
        ) : segment.kind === "added" ? (
          <ins key={i} data-part="diff-added">
            <span data-part="diff-label">{`added: `}</span>
            {segment.text}
          </ins>
        ) : (
          <del key={i} data-part="diff-removed">
            <span data-part="diff-label">{`removed: `}</span>
            {segment.text}
          </del>
        ),
      )}
    </span>
  );
}
