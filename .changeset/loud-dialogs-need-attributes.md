---
"@yadad/components": patch
---

Dialog: set `aria-modal="true"` on the modal element. The RFC 0007 contract kit requires the explicit attribute — `role="dialog"` does not imply modality for assistive tech, native top-layer blocking notwithstanding. The static (`modal={false}`) demo mode stays unmarked.
