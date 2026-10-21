---
"@yadad/components": patch
---

Extract the duplicated trigger/panel/Escape/focus-return popup contract into one internal primitive (`sets/internal/menu/v1`), used by the table row actions, the board card actions and move controls, and the calendar entry actions and move-to-day controls. Same markup, same `data-part` names, same keyboard behavior — no public API change.
