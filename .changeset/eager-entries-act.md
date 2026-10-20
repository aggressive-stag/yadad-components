---
"@yadad/components": minor
---

Record actions on calendar entries (RFC 0007): each entry renders its `RecordActionItem`s next to the entry — the calendar has no entry menu, so the buttons sit where the entry does, under the "Move to day…" control. One action is a plain button, two or more collapse into an "Actions…" menu with the move control's keyboard contract (Enter/Space opens, Tab reaches every action and Cancel, Escape closes to the trigger), `tone: "danger"` gets the danger styling, and an entry with an action in flight (its own or its move) has all its buttons disabled with a "Working..." live region.
