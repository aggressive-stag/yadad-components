---
"@yadad/components": minor
---

The phone agenda gets a designed rhythm instead of an accident. Entry rows
have a height band — `--yadad-calendar-row-min`, default 3rem, the middle of
the 44–56px list band (they were 42px, under it) — and a real gap between
entries, `--yadad-calendar-entry-gap` (0.5rem; the grid keeps its 0.25rem).
Type climbs a three-step ladder, all host-facing tokens: the day head is the
section header (`--yadad-calendar-header-size`, 1.125rem — the pinned band and
the day's scroll-today clearance both derive from it, so a taller head pins
and clears at its own height), the entry line is `--yadad-calendar-entry-size`
(1rem), and the detail line under an entry — the renderer's `<small>` fields,
which rendered at the UA's 0.8em and nothing else — is now
`--yadad-calendar-meta-size` (font-size-sm) in the muted colour. Per D6 the
ladder only steps UP from what those parts rendered before; density comes
from the agenda reflow collapsing context, never from shrinking type. Today's
day number joins its "Today" badge with the accent colour (the grid's 2px
outline reads as a cell border on a list; the non-colour cue stays). Laptop
grid: byte-identical — every rule lives inside the phone container query.
