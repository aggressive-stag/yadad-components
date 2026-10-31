---
"@yadad/components": minor
---

Collapse the phone navigator to a pinned week strip with a grabber (card 32b, D8/D9).

The phone navigator now boots collapsed: a weekday row over the selected day's
one week, `position: sticky` under the host header, opaque so the list scrolls
beneath it. A grabber button (`Show full month` / `Show week only`,
`aria-expanded` + `aria-controls`, on the 44px `calendar-tap` floor) toggles
the full month map, which is `position: static` — it scrolls away with the
list instead of walling the agenda off, and collapsing returns to the
selected day's week. Week mode renders its single row through the same
collapsed contract.

D8 is wired, not decorative: `--yadad-calendar-strip-size` (default = the
strip's composed height, measured at 113px — a first draft that guessed 33px
pinned the day heads *behind* the strip and the audit's new occlusion check
catches that class of drift) drives both the day heads' `inset-block-start`
and the day cells' `scroll-margin-block-start`, and only while the strip is
actually pinned — expanded month returns the heads to the 31e rule. New
`calendar-tap` token for the grabber's floor. Roving-tabindex set rebuilds
when the rows rebuild, so Tab can never land on a hidden day.
