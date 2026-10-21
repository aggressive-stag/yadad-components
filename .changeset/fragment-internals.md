---
"@yadad/components": patch
---

Per-component style fragments now carry the internal sheets they depend on:
`styles/table.css` and `styles/board.css` include the skeleton bars (and the
menu rules for menu-bearing views), so importing one component's fragment no
longer yields skeleton-card geometry with invisible bars.
