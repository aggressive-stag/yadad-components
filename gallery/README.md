# Gallery checks

Deterministic browser checks against the gallery (`gallery/check/*.ts`). They
run a real Chromium from `playwright-core` — pin the executable with
`PLAYWRIGHT_EXECUTABLE_PATH` if the managed download is not present.

Start the gallery, then from the **repo root**:

```bash
pnpm gallery &   # serves on port 5199
# or: (cd gallery && npx vite --port 5151) &
GALLERY_URL=http://localhost:5151/ node --experimental-strip-types gallery/check/<name>.ts
```

| check | what it proves |
| --- | --- |
| `phone-touch.ts` | 44px targets, no sideways scroll at 390/320, both themes, 200% text (card 4) |
| `shared-touch-vars.ts` | one shared `--yadad-touch-font-size`/`--yadad-touch-tap` moves every text-entry control at 390 touch; per-component override still wins; desktop unchanged (card 30a) |
| `calendar-phone.ts` | calendar 390/320 touch audit in both themes: no rendered part at zero size, the per-mode visibility table, entries fill the root, 44px hit targets; seeded regressions must be caught (card 31a, audit in `lib/calendar-phone-audit.ts`) |
| `check-phone.ts` | the shared `Check` primitive at 390 touch: the calendar's done box draws ≥22px inside its ≥44px label, the tick paints only when checked, and the `--yadad-check-*` / deprecated `--yadad-calendar-checkbox-size` theming contract holds (card 31b) |
| `tabs-keyboard.ts` | tab keyboard nav + focus-ring clipping at 200% text (card 3) |
| `contrast.ts` | forced-colors paint + reduced-motion guard (card 15c) |

The table lists the original checks; every `gallery/check/*.ts` file states what
it proves in its header comment. `token-fallback.ts` needs `pnpm build` and no
dev server. The gallery and its checks are drawn in
[ARCHITECTURE.md](../ARCHITECTURE.md#3-gallery-and-browser-checks); the
gallery is dev tooling and is never published.

## Forced-colors (High Contrast) procedure

`contrast.ts` does both paths and prints which verified what:

1. **Emulation (preferred):** CDP `Emulation.setEmulatedMedia` with
   `forced-colors: active` on a live page, then measured computed styles —
   the dialog frame keeps `border`+`outline`, the `::backdrop` stays painted
   (`background: Canvas` at α 0.85 + outline), menus keep a CanvasText frame.
2. **Static (always run):** the authored CSS must carry
   `@media (forced-colors: active)` blocks with system colors — this is the
   contract the browser enforces on real WC users; the emulation only proves
   Chromium honors it.

Manually, in Windows: Settings → Accessibility → Contrast themes, or Edge
DevTools → Rendering → "Emulate CSS media feature forced-colors". Nothing in
`sets/` should rely on token *colors* for meaning there — only borders,
outlines and text decoration survive the palette.
