---
"@yadad/components": minor
---

The reference picker is now a type-to-filter combobox once 8 or more records are loaded: type to narrow the list (case- and accent-insensitive), ArrowUp/ArrowDown and Enter to pick, Escape to restore. Fewer records keep the native select. Filtering is client-side over the loaded records only. New strings `noMatchLabel` and `moreFilterLabel`.
