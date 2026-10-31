---
"@yadad/components": minor
---

feat(calendar): the phone agenda heads each day "Thu 29", not "Thursday 29 October 2026"

The phone agenda printed the full date on every day, so the month and year
repeated 31 times down the list. The day head now carries a short weekday —
`<span data-part="day-weekday">` with the set's own `weekdays[column].short`,
the same names the grid's weekday column headers use, so no new localisation
surface — hidden everywhere except the agenda reflow, where the column headers
are gone and something has to carry the weekday.

In the phone container the head is now the short weekday plus the bold day
number, and the verbose `day-date` is hidden. Nothing is lost: the full form
still reaches assistive tech verbatim through the gridcell's `aria-label`
(`day.label`, unchanged) and the entries list. On laptop the pixels are
unchanged — the DOM differs only by the hidden span, and the short weekday
never doubles up with the weekday row.

The agenda's day head is a heading, not a toolbar, so weekday + number hug the
start and the "Today" badge is pushed to the trailing edge; previously the
`space-between` head centred the number on the today row only, the one row
that has a badge.

`gallery/check/lib/calendar-phone-audit.ts`'s visibility table now pins the new
contract (agenda: `day-weekday` + `day-number` shown, `day-date` hidden; grid:
the reverse) and its `swap-date-parts` seed restores the pre-31d agenda, so the
check fails if the swap is ever reverted.
