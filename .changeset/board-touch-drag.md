---
"@yadad/components": minor
---

Board: drag cards by touch. A long-press (350 ms, under 8 px of movement) lifts a movable card, a copy follows the finger, the column under it takes the drop-target outline, the column rail auto-scrolls near its edges, and releasing over a droppable column calls the same `onMove` as a mouse drop. Swiping still scrolls and snaps columns; "Move to…" is unchanged.
