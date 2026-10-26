---
"@yadad/components": minor
---

RFC 0008 items 5–6 and 12 on the base select and layout: options may be
`{ value, label?, color? }` and every surface shows `label ?? value` (the
stored value never changes); a colour inside the documented 8-hex todo-app
vocabulary paints a token-derived dot beside the read-only label — `aria-hidden`,
never the only signal — and anything outside the vocabulary paints no dot.
Panel titles and board column headings render `h2` (item 12). The form-item
label override rides the renderer's `item.label ?? field.label` through the
frame as display text; no set change was needed and nothing writes it back.
