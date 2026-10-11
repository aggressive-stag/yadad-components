---
"@yadad/components": minor
---

Add the theming reference. `THEMING.md` now lists, for every component, its
`data-part` names (with which form to target each one in), its per-component
CSS variables and the token each defaults to, and the theme tokens it reads.
It is generated from the component source by `scripts/theming.mjs`, so the
freshness test in the suite fails if it drifts, and it ships in the package.

The same script adds the token gate (`theming:check`, run from the test
suite): component stylesheets must live in `@layer yadad.components`, may not
hard-code colors, spacing, radii or fonts, and may use literals only for
`0`, `0.5`, `1`, `2` or powers of two, with exceptions only via an inline
`theming-exception:` comment. The gallery's third "brand" theme is the proof:
a clearly different look built only from names the reference documents.
