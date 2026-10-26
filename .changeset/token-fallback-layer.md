---
"@yadad/components": minor
---

The pre-built stylesheet (`styles.css` and every `styles/<name>.css`) now ships the default light token values as a zero-specificity fallback (`:where(:root)` in `@layer yadad.tokens`), generated from `@yadad/theme` at build time. A host that forgets to write the theme's tokens before mount no longer renders a bare, unstyled page; any host-written token still wins.
