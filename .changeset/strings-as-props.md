---
"@yadad/components": minor
---

Every word the components speak is now a prop; English is the default. `Table`, `Board` and `Calendar` take a `strings` object (`TableStrings`, `BoardStrings`, `CalendarStrings` — exported); `Dialog` takes `closeLabel`, `SelectInput` `chooseLabel`, `ReferenceInput` a `strings` object (`ReferenceStrings`). Each default is the literal that was hardcoded before, so existing renders are byte-identical. The gallery board gains a `board-strings-german` state proving the set is not English-locked — which also forced a layout fix: `board [data-part="group-by"]` now wraps its select under the label, because translated labels are longer than English and must not overflow a narrow viewport. Also fixes the theming doc generator dropping `data-part`s written after an arrow function in the same tag (`scanParts` is brace-aware now; THEMING.md regains calendar `day` and `mode-button`).
