---
"@yadad/components": minor
---

The phone agenda pins the day you are reading. Each day's head
(`data-part="day-head"`) becomes a sticky band inside the agenda reflow —
weekday + day number on an opaque surface with the list's hairline under it —
so "Thu 29" stays at the top of the scroll while the entries move under it.
The per-day box borders are gone; rows are separated by the head's own rule,
which is also the band's rule when pinned, so nothing doubles up. Hosts with
their own pinned header set `--yadad-calendar-sticky-top` to its height and
the band parks below it; day cells carry the matching scroll-margin so the
renderer's scroll-today-into-view on load never lands today behind the band.
The agenda's grid clip goes to `overflow: visible` (sticky inside a
non-scroll `overflow: hidden` ancestor silently never sticks); at laptop
width nothing changes — the grid keeps its clipped rounded corners and the
base sheet's pixels are byte-identical.
