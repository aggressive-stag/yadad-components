---
"@yadad/components": minor
---

Touch sizes hold whatever the theme says. Under a coarse pointer every text-entry control now has a font size of at least 16px (the `--yadad-*-touch-font-size` default is the larger of `--yadad-space-4` and `--yadad-font-size-md`), so a theme with a 15px `--yadad-font-size-md` no longer triggers the iOS focus zoom. The calendar's "Move to day..." and "+N more" links and its entry buttons are 44px tall, the calendar and board done checkboxes draw at 20px (`--yadad-calendar-checkbox-size`, `--yadad-board-checkbox-size`), and a text input marked `data-part="search"` gets the same font floor and 44px height. Desktop sizes are unchanged.
