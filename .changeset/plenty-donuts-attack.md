---
"@yadad/components": minor
---

Add the `time` and `tags` components for the RFC 0008 field types: `TimeInput`/`TimeDisplay` (native time control, minute-step scaling, `<time>` display with the em-dash marker) and `TagsInput`/`TagsDisplay` (chip add via Enter or the add button, per-chip and Backspace removal, case-insensitive dedupe, trimmed and space-collapsed tags). Both register in the base registry and ship `@yadad/components/time`, `@yadad/components/tags` plus `styles/time.css` / `styles/tags.css` fragments.
