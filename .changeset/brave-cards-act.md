---
"@yadad/components": minor
---

Record actions on board cards (RFC 0007): each card renders its `RecordActionItem`s next to the "Move to…" path — one action is a plain button, two or more collapse into a menu with the same keyboard contract as "Move to…" (Enter/Space opens, Tab reaches every action and Cancel, Escape closes to the trigger), `tone: "danger"` gets the danger styling, and a record with an action in flight (its own or its move) has all its buttons disabled with a "Working..." live region.
