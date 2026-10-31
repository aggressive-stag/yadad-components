---
"@yadad/components": minor
---

Add the internal `Check` primitive (`sets/internal/check/v1`) — one native `<input type="checkbox">` painted by CSS from `--yadad-check-*` variables: a 22px box (default), a visible border at rest, and a checked state that fills with the accent and draws a tick, square or `--yadad-check-radius: 50%` for the circle look, with a forced-colours fallback. The calendar's `done` box is the first consumer, so all three completion controls will share one themeable look once board and boolean adopt it (next release). `--yadad-calendar-checkbox-size` and `--yadad-calendar-done-accent` keep working as aliases of `--yadad-check-size` and `--yadad-check-on`; they are deprecated and will be removed no earlier than the next major.
