---
"@yadad/components": minor
---

feat(calendar): listStart:"today" folds past days behind an "Earlier (N)" toggle

With listStart:"today" and today inside the period, days strictly before
today carry data-earlier="true"; the phone agenda hides them behind a
collapsed Earlier (N) button (N counts the past days with entries) and
hides past days without entries outright. Expanding shows them in place,
in date order. The laptop ignores the fold entirely (no toggle, grid
unchanged); with "period" or no listStart the output is byte-identical.
The roving tabindex skips the hidden days while the fold is collapsed,
and a past-day tap in the 32a navigator opens the fold before scrolling.
