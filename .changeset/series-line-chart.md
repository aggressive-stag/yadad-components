---
"@yadad/components": minor
---

Series widgets draw `display: "line"`: an inline-SVG line chart sharing the bar chart's axes, nice ticks and label thinning. The line breaks at `null` (one segment per run of values), every point carries a dot so a lone point is visible, and the value axis anchors at 0 for sum/count measures and fits the data for min/max/avg. Points are keyboard-focusable as one roving tab stop with the label and text on focus or hover; the visually hidden data table keeps every group's numbers readable. New parts and variables: `line`, `dot`, `point-group`, `x-labels`, `--yadad-series-line`, `--yadad-series-dot`, `--yadad-series-dot-active`.
