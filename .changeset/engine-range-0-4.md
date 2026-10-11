---
"@yadad/components": patch
---

Accept `@yadad/core` 0.4.x in `peerDependencies`. Proved with
`pnpm check:engine --install`: a temp copy of the repo with the
`link:../yadad` dev dependencies replaced by the published
`@yadad/core@0.4.0` and `@yadad/testing@0.1.4` passes the full gate
(4 files, 153 tests). The CI `engine-range` job (`continue-on-error`)
now reports the range as current.
