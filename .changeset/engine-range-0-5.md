---
"@yadad/components": patch
---

Accept `@yadad/core` 0.5.x in `peerDependencies`. Proved with
`pnpm check:engine --install`: a temp copy of the repo with the
published `@yadad/core@0.5.0` and `@yadad/testing@0.1.5` passes the
full gate (5 files, 168 tests).
