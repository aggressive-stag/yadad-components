---
"@yadad/components": minor
---

Calendar: drag entries by touch. A long-press (350 ms, under 8 px of movement) lifts a movable entry, a copy follows the finger, the day cell under it takes the drop-target outline, the page scrolls near the top and bottom edges so days off-screen (the phone agenda layout) can be reached, and releasing over another day calls the same `onMove` as a mouse drop. The click the browser sends after a lifted drag no longer opens the entry. "Move to day…" is unchanged.
