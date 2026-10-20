import type { DiffSegment, DisplayProps, InputProps, TextField } from "@yadad/core";
import type { ReactNode } from "react";

/** Single-line text input. Emits undefined when emptied (no value). */
export function TextInput({ inputId, field, value, onChange, invalid, describedBy, labelledBy }: InputProps<TextField, string>): ReactNode {
  return (
    <input
      id={inputId}
      name={field.id}
      type="text"
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
 * Read-only text, for table cells and summaries. With `diff` (the word diff of
 * a `compare` column, RFC 0007) it draws `removed` runs in `<del>` and `added`
 * runs in `<ins>`, each prefixed by visually hidden "removed:" / "added:" text
 * so the change never relies on colour alone (text.css: strike-through and
 * underline carry the marks, colours come from theme tokens). Runs of one kind
 * are already merged by the engine. Without `diff` the markup is unchanged.
 */
export function TextDisplay({ value, diff }: DisplayProps<TextField, string> & { diff?: readonly DiffSegment[] }): ReactNode {
  if (diff === undefined) {
    return (
      <span data-yadad="text" data-part="display">
        {value ?? ""}
      </span>
    );
  }
  return (
    <span data-yadad="text" data-part="display" data-diff="words">
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
