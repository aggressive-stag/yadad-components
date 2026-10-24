---
"@yadad/components": minor
---

The Button now renders the `tone` prop the engine already sends (RFC 0007): `tone="danger"` — an action confirm's destructive button — paints its primary fill, border and focus ring from the danger token instead of rendering identical to "Save". New host variables `--yadad-button-danger-background`, `--yadad-button-danger-border`, `--yadad-button-danger-focus` default to `--yadad-color-danger`.
