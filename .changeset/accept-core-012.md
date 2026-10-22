---
"@yadad/components": patch
---

Accept `@yadad/core` 0.12 in the peer range (`^0.10.0 || ^0.11.0 || ^0.12.0`). Every engine package depends on core 0.12, so the latest set could not be installed together without npm `overrides`. The full gate passes against the published core 0.12.1, testing 0.8.1 and renderer 0.10.1 (`pnpm check:engine --install`).
