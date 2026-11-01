---
"@yadad/components": minor
---

The phone month navigator now FOLLOWS THE READING instead of sitting on
whatever week it was left on. In the collapsed strip, an IntersectionObserver
watches the list's day cells through a slit at the day-head reading line and
anchors the strip on the week being read — one day, not a row average, because
a month row is 390px wide and a half-scrolled row still has three days worth
of reading time. Tapping a navigator day wins: its `scrollIntoView` owns the
strip until scrolling settles, including the clamp the collapse itself causes
when rows above the list disappear (the measured bug: tapping the 28th, then
collapsing, yanked the pill to the 29th; now the strip keeps the 28th).
Arrow-key movement inside the strip is NOT follow — a selection may sit on a
week above the reading line, and the pill must not teleport off it. A tap in
an empty cell selects nothing and moves nothing. The observer exists only
while the strip is collapsed — expanded, there is nothing to follow — and one
follows per calendar, the scroll host being a prop, not an ancestor.
