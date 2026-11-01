---
"@yadad/components": minor
---

The calendar set renders ROLLING N-DAY PERIODS (card 33a, RFC 0004
amendment). A mode like "3day" or "5day" is one row of N day cells: the
row splitter, the keyboard stride (ArrowUp/Down step by the row length,
Home/End clamp to the row's ends), and the grid's column tracks all follow
the row length instead of the hard-coded 7. The column count travels as
`--yadad-calendar-columns` on `[data-part="grid"]` — month and week never
set it, so their DOM and computed layout are byte-identical to before and
the CSS keeps `repeat(var(--yadad-calendar-columns, 7), 1fr)`.

The nav buttons name the period ("Previous 3 days"), and two new
`CalendarStrings` hooks localise it: `modeLabel(mode)` (fallback when the
host's own `modes[].label` is empty) and `periodNoun(mode)`. A mode an
older core never validated renders like `week` — whole form, navigator
included — so a set on this version never dead-ends on an unknown mode.
Rolling periods render no phone navigator (D4: the agenda list already
pages them); the 31a audit learned the rule and now fails a rolling root
that GAINS one. The peer floor stays `@yadad/core >=0.10.0 <1.0.0` — the
new types are additive and the runtime is tolerant, so no raise was forced.

Gallery: 3-day and 5-day states at desktop and in the 390 phone frame,
including a Thursday-anchored 3-day period whose weekday headers follow
the columns.
