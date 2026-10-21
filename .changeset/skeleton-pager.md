---
"@yadad/components": minor
---

Loading states hold the shape (card 15e): `Table` takes `loading` + `skeletonRows`
and renders placeholder rows inside the real table (real column geometry, no
layout jump); empty loading columns take card-shaped bars with a visually hidden
announcement. A new cursor `Pager` set (`@yadad/components/pager` +
`@yadad/components/styles/pager.css`) — First/Previous/Next per the engine's
35e cursor model, label props as always, no registry key until the engine asks.
