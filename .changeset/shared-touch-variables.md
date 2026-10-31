---
"@yadad/components": minor
---

Add the shared touch variables `--yadad-touch-font-size` and `--yadad-touch-tap`. Every per-component `--yadad-*-touch-font-size` and `--yadad-*-tap` now defaults through the matching shared variable before falling back to the old token-derived size, so one `:root` declaration retunes every thumb target and every coarse-pointer input font at once. The per-component variables keep their names and keep winning for their own component, so nothing that sets them today changes.
