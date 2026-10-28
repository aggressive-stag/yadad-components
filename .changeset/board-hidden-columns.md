---
"@yadad/components": minor
---

The board honours `BoardProps.hiddenColumns`: the hidden empty no-value column is listed in "Move to…" and shows as a slim drop target (mouse and touch drag) only while a card is dragged, so a card can be moved to "no value" before any card is there. Needs `@yadad/core` 0.17.1 / `@yadad/renderer` 0.18.1; an older engine never passes the prop and nothing changes.
