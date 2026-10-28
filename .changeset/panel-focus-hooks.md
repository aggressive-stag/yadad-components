---
"@yadad/components": minor
---

Record panels name their way back and the move panel takes focus on open. The board's and calendar's "Move to…" / "Move to day…" panels now focus their select / date input as they open (the trigger unmounts, so focus used to fall to the page). The Actions and Move triggers and their panels carry `data-yadad-focus-return` ("actions" or "move"; the table's Actions menu "actions") so the renderer (0.18.4 and newer) returns focus to the right trigger after a panel action or a move.
