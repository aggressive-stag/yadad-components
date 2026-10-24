---
"@yadad/components": patch
---

Removed dead menu state from the table's `RowActions`: an outer `open`/`setOpen`, its `triggerRef`/`panelRef` and the focus effect reading them were shadowed in full by the `Menu` render prop and never fired. Focus movement was always `Menu`'s own contract — pinned non-vacuously by `registry/table.test.tsx` (card 21's repro and mutation check carry the evidence). No behaviour change.
