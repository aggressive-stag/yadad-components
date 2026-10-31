---
"@yadad/components": minor
---

feat(board,boolean): the board's done box and the boolean field adopt the shared Check primitive

`Board`'s completion checkbox and `Boolean`'s tick box are now the internal
`Check` primitive (card 31b), so one `--yadad-check-*` surface paints every
completion box in the set. Markup, names and hit targets are unchanged: both
stay native `<input type="checkbox">` elements, the board box keeps
`data-part="done-input"` and its 44px label, and the boolean keeps the
documented `[data-yadad="boolean"][data-part="input"]` contract markers
(field-frame's `:has([data-yadad="boolean"])` label floor still matches).

Theming:

- `--yadad-board-checkbox-size` and `--yadad-board-done-accent` are DEPRECATED
  — aliases of `--yadad-check-size` / `--yadad-check-on` on the board box
  (removal no earlier than the next major). Set the `--yadad-check-*`
  variables instead.
- `--yadad-boolean-size` now falls back to `--yadad-check-size` before its own
  thumb-sized default (a checklist's box is the row's tap target, so the
  default stays 24px).
- The primitive's `:checked` / `:hover` / `:focus-visible` rules now read
  through the same private aliases as its base rule, so a consumer set's
  deprecated aliases reach the checked fill and focus ring too.
