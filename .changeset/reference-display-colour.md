---
"@yadad/components": patch
---

The reference display now paints the `color` the renderer passes for a reference field with `colorFrom` (RFC 0008 item 8): a token-derived dot beside the label, `aria-hidden`, drawn only for a found record and only for a colour in the documented 8-hex vocabulary, as the select does. The vocabulary lookup moves to a shared internal helper. New host variables `--yadad-swatch-slot-0` to `-7`, `--yadad-swatch-border`, `--yadad-swatch-radius-full`.
