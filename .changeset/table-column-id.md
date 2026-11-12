---
"@yadad/components": minor
---

Table: every header and body cell now carries `data-column-id`, the id of its column, so a host can style one column (`td[data-column-id="day"] { white-space: nowrap; }`). The record-actions column is `_actions`. New hook only: `data-label`, `data-col` and every `data-part` are unchanged.
