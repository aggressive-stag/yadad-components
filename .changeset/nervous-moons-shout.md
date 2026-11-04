---
"@yadad/components": patch
---

Phone week-map keeps the 44px tap floor at 320px: the navigator day tracks are now `minmax(44px, 1fr)` instead of `1fr`, so seven days can no longer squeeze under the documented touch target inside a 320px card. The map scrolls itself when the tracks overflow (the page never does), matching the calendar's own scroll contract. Found by the new layout audit probe (card 34a).
