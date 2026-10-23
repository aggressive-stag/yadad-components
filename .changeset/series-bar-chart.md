---
"@yadad/components": minor
---

Series bar chart (card 17b). `display: "bar"` now draws an inline-SVG column chart: nice (1/2/5×10ⁿ) value-axis ticks from zero, group labels under the bars that thin out before they collide, and a chart skeleton while loading. A group with no value draws no bar — a dash at the baseline, never a zero-height bar. Bars are focusable as one roving-tabindex group (arrows/Home/End) and announce `label: text` through their accessible name; the visible tooltip repeats those words and is `aria-hidden` so nothing is announced twice. The data table stays in the tree, visually hidden, and carries every group's label and text verbatim: the chart is never the only way to read the numbers. New parts (`chart`, `bar`, `bar-group`, `gap-group`, `axis`, `tick`, `tooltip`, …) follow the token rules and survive forced colors; `prefers-reduced-motion` kills any future bar transition.
