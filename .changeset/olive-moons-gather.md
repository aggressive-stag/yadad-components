---
"@yadad/components": minor
---

The RFC 0009 surfaces (build items 3–5): the saved-filter chip row, the batch
composer's repeat-row chrome, and the checklist. `Button` now honours the
engine's `pressed` prop (the saved-filter chip toggle, engine 47f) — a pressed
button draws the filled accent and announces `aria-pressed`; a plain push
button carries neither attribute. The new `composer` set styles what the
renderer draws: chips are the Button read as pills (half-tap-height radius,
wrapping so a full row folds at 320px instead of side-scrolling), batch rows
separate on a token hairline with the "+ another" controls under the last row,
and a ticked checklist row strikes through in muted ink — `:has()` on the set's
own checkbox, scoped to sub-record tables, and never the only signal (the tick
itself stays). The checklist tick box grows to a thumb-sized default
(`--yadad-boolean-size`, 24px at defaults): in a checklist the box IS the row's
tap target. `Chip`/`ChipRow` components draw the renderer's exact saved-filters
markup for tests and galleries; hosts keep rendering the renderer's chips.
