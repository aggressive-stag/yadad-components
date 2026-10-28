---
"@yadad/components": patch
---

Board: after a card is moved, focus returns to its "Move to…" trigger inside the board that moved it. The lookup used to search the whole page, so with two boards showing the same card a move in the second board focused the first board's copy.
