---
"@yadad/components": minor
---

Phone fixes. The board's "Move to…" panel now wraps long unbroken titles, stays inside its column and scrolls inside itself so Cancel is always reachable. Under `pointer: coarse`, text, number, date, datetime, time, select, tags and the board and calendar move inputs render at a font size of at least `--yadad-font-size-md` (no iOS focus zoom) and at least 44px tall, and the tags remove glyph gets a 44px hit area. New variables: `--yadad-<component>-touch-font-size`, `--yadad-<component>-tap` and `--yadad-board-move-panel-max-height` (see THEMING.md).
