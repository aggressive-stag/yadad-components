---
"@yadad/components": patch
---

Table: a button or tag chip in a table cell no longer breaks to one letter per line in a narrow column ("Edit" rendering as "Ed/it"). Their `overflow-wrap: anywhere` (added so a 40-character word cannot widen a dialog) lowered the column's minimum width to one character; inside a table cell they now use `break-word`, so the whole word is the minimum. Hosts that added a rule such as `td[data-part="cell"] button[data-yadad="button"] { overflow-wrap: normal; white-space: nowrap; }` to undo this can remove it. Outside tables nothing changes.
