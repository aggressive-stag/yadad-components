---
"@yadad/components": minor
---

Calendar: phone month navigator (card 32a).

On a coarse pointer the agenda grows a compact month map above the list: seven
columns under single-letter weekday headers, one dot on every day that has
entries (the count is in the button's accessible name, not in dots), today as an
accent ring plus weight, the selected day as an accent pill — ring and pill are
structurally distinct, so the two states read without colour, and they share one
border-box footprint so a day does not change size when it becomes today or
selected. Out-of-month days are muted but tappable. It is a `role="group"` with
its own roving tabindex, separate from the list grid's arrow-key model; arrows
move days, PageUp/PageDown move periods, Home/End jump to the period edges, and
none of them are swallowed at the boundaries. Selecting a day scrolls the list
to that day under the pinned chrome. The map is phone-only (`display: none` at
base), laid out with subgrid so columns cannot wobble apart when the host raises
the text size, and it scrolls inside its own box rather than pushing the page
sideways. New token: `--yadad-calendar-nav-tap` (day-button height floor,
default 44px — width is the axis the seven columns constrain, height never is).
Navigator days are hidden from the base/desktop tree; the week form and the
collapsing/pinning control are cards 32b/32c.
