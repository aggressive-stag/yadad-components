---
"@yadad/components": minor
---

Board cards and calendar entries now render the completion checkbox the
renderer asks for (RFC 0008 item 3, `doneField`). When a card or entry carries
`done`, a native `<input type="checkbox">` named "Done: <label>" sits next to
the "Move to…" control, honours `checked` and `disabled`, and calls `toggle()`
once per change. It is a sibling of the open button, so it never opens the
record, and its pointer-down does not start a touch drag. The label is a 44px
tap target. New data-parts `done`, `done-input` and `done-label` and
`--yadad-board-done-*` / `--yadad-calendar-done-*` variables; new strings
`doneLabel` and `doneAriaLabel`. Without `done` nothing changes.
