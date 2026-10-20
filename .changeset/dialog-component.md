---
"@yadad/components": minor
---

Add layout.Dialog (RFC 0007): a native <dialog> modal the renderer composes
content into. showModal where the browser has it, the open-attribute fallback
where it does not; focus moves in on open and back to the opener on close, an
explicit Tab trap, the background made inert, and Escape, the close control and
a press outside the content all route through onClose. The dialog body owns
overflow so it scrolls at phone width and 200% text.
