---
"@yadad/components": minor
---

Subpath exports: `@yadad/components/dialog`, `/table`, `/board`… one entry per set (JS + types, `@yadad/source` for the workspace), plus `@yadad/components/styles/dialog.css` and friends — per-component stylesheets, each wrapped in the same `@layer yadad.tokens, yadad.components` preamble, so a host can take one component's rules without the mega sheet. The root export and `./styles.css` are untouched; the mega stylesheet is byte-identical. The six files that call hooks now open with `"use client"`, so the first Next.js App Router consumer gets a Client Component instead of an afternoon burned on "useState only works in Client Components". Tripwire test `scripts/exports.test.ts` fails if any `exports` entry points at a file `dist/` does not contain.
