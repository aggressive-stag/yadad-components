---
"@yadad/components": minor
---

A text field with `multiline: true` now renders a native `<textarea>` (four rows, vertical resize) with the same label wiring, ARIA, `maxLength` and `data-part="input"` as the single-line input, and its display keeps line breaks (`white-space: pre-line`, `data-multiline`). New variables: `--yadad-text-multiline-min-height`, `--yadad-text-multiline-line-height`.
