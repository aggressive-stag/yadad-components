---
"@yadad/components": minor
---

The series widget's axis now reads `SeriesWidgetProps.aggregation` (the op, new in `@yadad/core` 0.14) to decide whether a line may start above its data, instead of reading the first word of the engine's `measureLabel` prose — a copy edit or translation can no longer silently flip chart behaviour. The label sniff survives only as the fallback for an engine older than 0.14 (RFC 0008 §3, card 19). `peerDependencies` accepts `@yadad/core` ^0.14.0.
