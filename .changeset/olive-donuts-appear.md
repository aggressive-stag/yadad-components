---
"@yadad/components": minor
---

The `layout.Pager` registry component (RFC 0008 item 11, engine 47e): the base
set now supplies a styled pager, so hosts get it without writing markup. The
`TablePager` component matches the renderer's built-in shape — a labelled
`<nav>` carrying `data-yadad-pager`, the same secondary Previous/Next pair,
the same "Page N [of M]" text (cursor mode: "Page N") — and adds the base
styling: the current page is marked typographically (bold via
`--yadad-pager-current-font-weight`, `aria-current` for assistive tech, never
colour alone), disabled ends and focus rings come from the Button. The
existing cursor `Pager` is unchanged and still not a registry key; its props
type is now `PagerCursorProps` so the core `PagerProps` name stays free for
the registry contract.
