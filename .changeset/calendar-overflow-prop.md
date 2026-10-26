---
"@yadad/components": patch
---

The calendar now reads each day's `overflow` from the renderer (the view's `maxEntriesPerDay`, RFC 0008 item 7) instead of a fixed three: a day shows `overflow.shown` entries and a "+N more" button for the rest. A day with no `overflow` shows every entry, so an engine that predates the prop no longer caps busy days at three.
