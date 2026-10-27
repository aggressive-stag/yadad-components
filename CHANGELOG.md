# @yadad/components

## 0.32.1

### Patch Changes

- 057fab8: Text diff cells carry `data-raw-before` and `data-raw-after` on the display root: the unsplit old and new text, so tests can compare against the source strings.

## 0.32.0

### Minor Changes

- a9a85bf: The tags input commits a non-empty draft on blur through `onChange` (a quick filter and a form both take it), the calendar legend paints each entry's palette `color`, and the datetime input takes its native `min`/`max` from `minLocal`/`maxLocal`.

## 0.31.0

### Minor Changes

- 4879a9f: The text input renders a quick filter's `placeholder`, and the table stylesheet styles the page notice (`[data-yadad-page-notice]`, `data-tone` info and warning) with theme tokens. Unsortable headers stay plain text.

## 0.30.0

### Minor Changes

- 57e6133: Read the option and column colour palette from `@yadad/core`'s `COLOR_PALETTE` and paint the dots with the theme's `--yadad-color-category-0..7` tokens. The `@yadad/core` peer range now includes `^0.16.0`.

## 0.29.1

### Patch Changes

- 9850bc9: Fixes two visible bugs. The tags field and the sub-record add-step no longer push the page sideways on a 320px phone at 200% text (their inputs now shrink instead of keeping their intrinsic width). The option-colour dot on select, reference and board now draws the eight vocabulary hues (blue, red, orange, yellow, green, teal, purple, pink) in light and dark themes; slot 4 (`#107c10`) drew a navy or pale blue because it was a blend of the accent and text colours.

## 0.29.0

### Minor Changes

- d2b3105: A text field with `multiline: true` now renders a native `<textarea>` (four rows, vertical resize) with the same label wiring, ARIA, `maxLength` and `data-part="input"` as the single-line input, and its display keeps line breaks (`white-space: pre-line`, `data-multiline`). New variables: `--yadad-text-multiline-min-height`, `--yadad-text-multiline-line-height`.

### Patch Changes

- 7009ed6: A board column heading now paints the column's `color` hint (RFC 0008 item 5, an option's `#RRGGBB`) as a token-derived dot beside the label, `aria-hidden`, for a colour in the documented 8-hex vocabulary; a colour outside it paints no dot, as on the select.
- 4109390: The calendar now reads each day's `overflow` from the renderer (the view's `maxEntriesPerDay`, RFC 0008 item 7) instead of a fixed three: a day shows `overflow.shown` entries and a "+N more" button for the rest. A day with no `overflow` shows every entry, so an engine that predates the prop no longer caps busy days at three.
- 7ed34d8: The reference display now paints the `color` the renderer passes for a reference field with `colorFrom` (RFC 0008 item 8): a token-derived dot beside the label, `aria-hidden`, drawn only for a found record and only for a colour in the documented 8-hex vocabulary, as the select does. The vocabulary lookup moves to a shared internal helper. New host variables `--yadad-swatch-slot-0` to `-7`, `--yadad-swatch-border`, `--yadad-swatch-radius-full`.
- add9f5d: The count and series widget labels are now `<h2>` headings (RFC 0008 item 12). The dashboard renderer gives a widget no panel title, so these labels are the widget titles and the page had no headings; the visual style is unchanged (UA heading margins and weight are reset in the stylesheets).

## 0.28.1

### Patch Changes

- 4350665: The base text input sets the native `maxlength` attribute from the field's `maxLength`, so the browser stops typing at the limit (RFC 0008 item 13c).

## 0.28.0

### Minor Changes

- 055dbf1: The pre-built stylesheet (`styles.css` and every `styles/<name>.css`) now ships the default light token values as a zero-specificity fallback (`:where(:root)` in `@layer yadad.tokens`), generated from `@yadad/theme` at build time. A host that forgets to write the theme's tokens before mount no longer renders a bare, unstyled page; any host-written token still wins.

## 0.27.0

### Minor Changes

- 2edde03: Board cards and calendar entries now render the completion checkbox the
  renderer asks for (RFC 0008 item 3, `doneField`). When a card or entry carries
  `done`, a native `<input type="checkbox">` named "Done: <label>" sits next to
  the "Move to…" control, honours `checked` and `disabled`, and calls `toggle()`
  once per change. It is a sibling of the open button, so it never opens the
  record, and its pointer-down does not start a touch drag. The label is a 44px
  tap target. New data-parts `done`, `done-input` and `done-label` and
  `--yadad-board-done-*` / `--yadad-calendar-done-*` variables; new strings
  `doneLabel` and `doneAriaLabel`. Without `done` nothing changes.

## 0.26.0

### Minor Changes

- 8705841: The `layout.Pager` registry component (RFC 0008 item 11, engine 47e): the base
  set now supplies a styled pager, so hosts get it without writing markup. The
  `TablePager` component matches the renderer's built-in shape — a labelled
  `<nav>` carrying `data-yadad-pager`, the same secondary Previous/Next pair,
  the same "Page N [of M]" text (cursor mode: "Page N") — and adds the base
  styling: the current page is marked typographically (bold via
  `--yadad-pager-current-font-weight`, `aria-current` for assistive tech, never
  colour alone), disabled ends and focus rings come from the Button. The
  existing cursor `Pager` is unchanged and still not a registry key; its props
  type is now `PagerCursorProps` so the core `PagerProps` name stays free for
  the registry contract.
- 386f11d: The RFC 0009 surfaces (build items 3–5): the saved-filter chip row, the batch
  composer's repeat-row chrome, and the checklist. `Button` now honours the
  engine's `pressed` prop (the saved-filter chip toggle, engine 47f) — a pressed
  button draws the filled accent and announces `aria-pressed`; a plain push
  button carries neither attribute. The new `composer` set styles what the
  renderer draws: chips are the Button read as pills (half-tap-height radius,
  wrapping so a full row folds at 320px instead of side-scrolling), batch rows
  separate on a token hairline with the "+ another" controls under the last row,
  and a ticked checklist row strikes through in muted ink — `:has()` on the set's
  own checkbox, scoped to sub-record tables, and never the only signal (the tick
  itself stays). The checklist tick box grows to a thumb-sized default
  (`--yadad-boolean-size`, 24px at defaults): in a checklist the box IS the row's
  tap target. `Chip`/`ChipRow` components draw the renderer's exact saved-filters
  markup for tests and galleries; hosts keep rendering the renderer's chips.
- a32a52b: Add the `time` and `tags` components for the RFC 0008 field types: `TimeInput`/`TimeDisplay` (native time control, minute-step scaling, `<time>` display with the em-dash marker) and `TagsInput`/`TagsDisplay` (chip add via Enter or the add button, per-chip and Backspace removal, case-insensitive dedupe, trimmed and space-collapsed tags). Both register in the base registry and ship `@yadad/components/time`, `@yadad/components/tags` plus `styles/time.css` / `styles/tags.css` fragments.
- 0e8c631: RFC 0008 items 5–6 and 12 on the base select and layout: options may be
  `{ value, label?, color? }` and every surface shows `label ?? value` (the
  stored value never changes); a colour inside the documented 8-hex todo-app
  vocabulary paints a token-derived dot beside the read-only label — `aria-hidden`,
  never the only signal — and anything outside the vocabulary paints no dot.
  Panel titles and board column headings render `h2` (item 12). The form-item
  label override rides the renderer's `item.label ?? field.label` through the
  frame as display text; no set change was needed and nothing writes it back.

## 0.25.0

### Minor Changes

- 30318d6: The Button now renders the `tone` prop the engine already sends (RFC 0007): `tone="danger"` — an action confirm's destructive button — paints its primary fill, border and focus ring from the danger token instead of rendering identical to "Save". New host variables `--yadad-button-danger-background`, `--yadad-button-danger-border`, `--yadad-button-danger-focus` default to `--yadad-color-danger`.
- eb5e0d2: The series widget's axis now reads `SeriesWidgetProps.aggregation` (the op, new in `@yadad/core` 0.14) to decide whether a line may start above its data, instead of reading the first word of the engine's `measureLabel` prose — a copy edit or translation can no longer silently flip chart behaviour. The label sniff survives only as the fallback for an engine older than 0.14 (RFC 0008 §3, card 19). `peerDependencies` accepts `@yadad/core` ^0.14.0.

### Patch Changes

- 67e7cdf: Removed dead menu state from the table's `RowActions`: an outer `open`/`setOpen`, its `triggerRef`/`panelRef` and the focus effect reading them were shadowed in full by the `Menu` render prop and never fired. Focus movement was always `Menu`'s own contract — pinned non-vacuously by `registry/table.test.tsx` (card 21's repro and mutation check carry the evidence). No behaviour change.

## 0.24.0

### Minor Changes

- 8d8d9d3: Series widgets draw `display: "line"`: an inline-SVG line chart sharing the bar chart's axes, nice ticks and label thinning. The line breaks at `null` (one segment per run of values), every point carries a dot so a lone point is visible, and the value axis anchors at 0 for sum/count measures and fits the data for min/max/avg. Points are keyboard-focusable as one roving tab stop with the label and text on focus or hover; the visually hidden data table keeps every group's numbers readable. New parts and variables: `line`, `dot`, `point-group`, `x-labels`, `--yadad-series-line`, `--yadad-series-dot`, `--yadad-series-dot-active`.

## 0.23.0

### Minor Changes

- db02932: Series bar chart (card 17b). `display: "bar"` now draws an inline-SVG column chart: nice (1/2/5×10ⁿ) value-axis ticks from zero, group labels under the bars that thin out before they collide, and a chart skeleton while loading. A group with no value draws no bar — a dash at the baseline, never a zero-height bar. Bars are focusable as one roving-tabindex group (arrows/Home/End) and announce `label: text` through their accessible name; the visible tooltip repeats those words and is `aria-hidden` so nothing is announced twice. The data table stays in the tree, visually hidden, and carries every group's label and text verbatim: the chart is never the only way to read the numbers. New parts (`chart`, `bar`, `bar-group`, `gap-group`, `axis`, `tick`, `tooltip`, …) follow the token rules and survive forced colors; `prefers-reduced-motion` kills any future bar transition.

## 0.22.0

### Minor Changes

- cc7b7aa: Series widget (RFC 0001 slice 2): `baseRegistry.widgets.series` draws the engine's grouped values as a compact, captioned two-column table — group label and preformatted text per row, `measureLabel` as the value header, skeleton rows while loading, "Nothing to show yet" when loaded empty, and notes for skipped records and a partial read. Every word is a `strings` prop. `display: "bar"` and `"line"` draw the same table until the chart cards land. `@yadad/core` `^0.13.0` joins the peer range. Import from `@yadad/components/series`; styles from `@yadad/components/styles/series.css`.

## 0.21.0

### Minor Changes

- 151e9f1: Calendar: drag entries by touch. A long-press (350 ms, under 8 px of movement) lifts a movable entry, a copy follows the finger, the day cell under it takes the drop-target outline, the page scrolls near the top and bottom edges so days off-screen (the phone agenda layout) can be reached, and releasing over another day calls the same `onMove` as a mouse drop. The click the browser sends after a lifted drag no longer opens the entry. "Move to day…" is unchanged.

## 0.20.0

### Minor Changes

- ad13ec7: Board: drag cards by touch. A long-press (350 ms, under 8 px of movement) lifts a movable card, a copy follows the finger, the column under it takes the drop-target outline, the column rail auto-scrolls near its edges, and releasing over a droppable column calls the same `onMove` as a mouse drop. Swiping still scrolls and snaps columns; "Move to…" is unchanged.
- 8d39d08: The reference picker is now a type-to-filter combobox once 8 or more records are loaded: type to narrow the list (case- and accent-insensitive), ArrowUp/ArrowDown and Enter to pick, Escape to restore. Fewer records keep the native select. Filtering is client-side over the loaded records only. New strings `noMatchLabel` and `moreFilterLabel`.

## 0.19.2

### Patch Changes

- 5af3437: Accept `@yadad/core` 0.12 in the peer range (`^0.10.0 || ^0.11.0 || ^0.12.0`). Every engine package depends on core 0.12, so the latest set could not be installed together without npm `overrides`. The full gate passes against the published core 0.12.1, testing 0.8.1 and renderer 0.10.1 (`pnpm check:engine --install`).

## 0.19.1

### Patch Changes

- d3fa8e7: Per-component style fragments now carry the internal sheets they depend on:
  `styles/table.css` and `styles/board.css` include the skeleton bars (and the
  menu rules for menu-bearing views), so importing one component's fragment no
  longer yields skeleton-card geometry with invisible bars.

## 0.19.0

### Minor Changes

- e0c5587: Loading states hold the shape (card 15e): `Table` takes `loading` + `skeletonRows`
  and renders placeholder rows inside the real table (real column geometry, no
  layout jump); empty loading columns take card-shaped bars with a visually hidden
  announcement. A new cursor `Pager` set (`@yadad/components/pager` +
  `@yadad/components/styles/pager.css`) — First/Previous/Next per the engine's
  35e cursor model, label props as always, no registry key until the engine asks.

## 0.18.2

### Patch Changes

- afd9df0: Extract the duplicated trigger/panel/Escape/focus-return popup contract into one internal primitive (`sets/internal/menu/v1`), used by the table row actions, the board card actions and move controls, and the calendar entry actions and move-to-day controls. Same markup, same `data-part` names, same keyboard behavior — no public API change.

## 0.18.1

### Patch Changes

- 69656fd: Forced-colors (Windows High Contrast) blocks for the dialog scrim and frame, table/board/calendar menu panels, panel frame and the diff marks; a build check now fails any stylesheet that animates without a `@media (prefers-reduced-motion: reduce)` override.

## 0.18.0

### Minor Changes

- 014f15e: Subpath exports: `@yadad/components/dialog`, `/table`, `/board`… one entry per set (JS + types, `@yadad/source` for the workspace), plus `@yadad/components/styles/dialog.css` and friends — per-component stylesheets, each wrapped in the same `@layer yadad.tokens, yadad.components` preamble, so a host can take one component's rules without the mega sheet. The root export and `./styles.css` are untouched; the mega stylesheet is byte-identical. The six files that call hooks now open with `"use client"`, so the first Next.js App Router consumer gets a Client Component instead of an afternoon burned on "useState only works in Client Components". Tripwire test `scripts/exports.test.ts` fails if any `exports` entry points at a file `dist/` does not contain.

## 0.17.0

### Minor Changes

- 22ab6ee: Every word the components speak is now a prop; English is the default. `Table`, `Board` and `Calendar` take a `strings` object (`TableStrings`, `BoardStrings`, `CalendarStrings` — exported); `Dialog` takes `closeLabel`, `SelectInput` `chooseLabel`, `ReferenceInput` a `strings` object (`ReferenceStrings`). Each default is the literal that was hardcoded before, so existing renders are byte-identical. The gallery board gains a `board-strings-german` state proving the set is not English-locked — which also forced a layout fix: `board [data-part="group-by"]` now wraps its select under the label, because translated labels are longer than English and must not overflow a narrow viewport. Also fixes the theming doc generator dropping `data-part`s written after an arrow function in the same tag (`scanParts` is brace-aware now; THEMING.md regains calendar `day` and `mode-button`).

### Patch Changes

- 8a19c2c: Docs: the README's "What is included" now lists the review-lane components — the `datetime` field, the `text` Display's diff marks, `layout.Dialog`, and record actions on table, board and calendar — and the Compatibility section states the actual peer range (`^0.10.0 || ^0.11.0`).

## 0.16.1

### Patch Changes

- bd31401: Dialog: set `aria-modal="true"` on the modal element. The RFC 0007 contract kit requires the explicit attribute — `role="dialog"` does not imply modality for assistive tech, native top-layer blocking notwithstanding. The static (`modal={false}`) demo mode stays unmarked.

## 0.16.0

### Minor Changes

- c35287b: Record actions on calendar entries (RFC 0007): each entry renders its `RecordActionItem`s next to the entry — the calendar has no entry menu, so the buttons sit where the entry does, under the "Move to day…" control. One action is a plain button, two or more collapse into an "Actions…" menu with the move control's keyboard contract (Enter/Space opens, Tab reaches every action and Cancel, Escape closes to the trigger), `tone: "danger"` gets the danger styling, and an entry with an action in flight (its own or its move) has all its buttons disabled with a "Working..." live region.

## 0.15.0

### Minor Changes

- 0cbd5ec: Record actions on board cards (RFC 0007): each card renders its `RecordActionItem`s next to the "Move to…" path — one action is a plain button, two or more collapse into a menu with the same keyboard contract as "Move to…" (Enter/Space opens, Tab reaches every action and Cancel, Escape closes to the trigger), `tone: "danger"` gets the danger styling, and a record with an action in flight (its own or its move) has all its buttons disabled with a "Working..." live region.

## 0.14.0

### Minor Changes

- c3d0c12: Record actions in table rows (RFC 0007): each row renders its `RecordActionItem`s as labelled buttons in a trailing `actionsLabel` column, danger tone styled, pending rows disabled with a "Working..." live region, and on phone two or more actions collapse into a keyboard-reachable menu like the board's "Move to…".

## 0.13.0

### Minor Changes

- ac082bf: The text Display renders the RFC 0007 word diff: removed runs in <del>, added runs in <ins>, each with visually hidden "removed:"/"added:" text, marks that never rely on colour alone.

## 0.12.0

### Minor Changes

- b190e53: Add layout.Dialog (RFC 0007): a native <dialog> modal the renderer composes
  content into. showModal where the browser has it, the open-attribute fallback
  where it does not; focus moves in on open and back to the opener on close, an
  explicit Tab trap, the background made inert, and Escape, the close control and
  a press outside the content all route through onClose. The dialog body owns
  overflow so it scrolls at phone width and 200% text.

## 0.11.0

### Minor Changes

- af45438: add the datetime field: a native datetime-local Input that shows and returns the local value the renderer gives it, and a `<time>` Display that shows the renderer's formatted text while keeping the stored UTC instant in `dateTime` (RFC 0007)

## 0.10.4

### Patch Changes

- 892577f: accepts @yadad/core 0.11.0

## 0.10.3

### Patch Changes

- 83a4fd9: Update the README for the calendar and board layouts, the `reference` field, the registry scope setup and the current peer range.

## 0.10.2

### Patch Changes

- a34557a: The board's columns are now named "<label>, <count> cards" ("1 card" for one) so a screen reader no longer runs the label and the count together. The board and its columns no longer carry `data-testid` attributes.

## 0.10.1

### Patch Changes

- b822af2: THEMING.md now names `scripts/theming.ts` as its generator (the build scripts moved to TypeScript). No change to components, styles or the registry.

## 0.10.0

### Minor Changes

- 72075a9: Board: drag a movable card onto another column (calls `onMove`; the engine reverts refusals), and one column at a time with scroll snap on phone widths. The calendar's live region no longer shows its accent bar while empty.

## 0.9.0

### Minor Changes

- 184a020: Board: the `layout.Board` component (RFC 0005 slice 1). Columns with a label and count scroll sideways, each column scrolls on its own, cards open on click or Enter, a group-by picker switches the grouping, and a "Move to…" action moves a card by keyboard or touch. The `@yadad/core` peer range is now `^0.10.0` (the version that has the board key).

## 0.8.0

### Minor Changes

- 4de24d1: Calendar: drag-and-drop move (native HTML5 DnD onto any day cell, with a
  drop-target highlight) alongside the existing keyboard MoveControl panel,
  and a live region that re-announces repeated refusal text (keyed on
  `announcement.seq`). Addresses card-11's open question about announcing
  a refused move.

## 0.7.0

### Minor Changes

- fe95f32: Calendar: phone agenda reflow (below a 50ch container width, grid reflows
  to a vertical day-by-day agenda with a visible date heading) and grid
  keyboard navigation (roving tabindex, arrow keys, Home/End, PageUp/
  PageDown, `aria-live` title) — addresses card-11 showcase issue 4
  (no mobile reflow).

## 0.6.0

### Minor Changes

- bfbf16a: Add the `Calendar` layout entry: a themed month/week grid against the
  engine's calendar contract (core registry.ts `CalendarProps`). Addresses
  several card-11 showcase findings (detail-field spacing, legend colour
  swatches, a "+N more" busy-day affordance, a more visible Today marker,
  and a visible — not sr-only — move/refusal live region).

## 0.5.0

### Minor Changes

- 2c0dea2: Count shows the engine's preformatted `text` when a `stat` widget passes one (a grouped, rounded number or a dash), instead of the raw value.
- ac74b2e: Require `@yadad/core` ^0.6.0: the set now implements the `reference`
  field key and shows the `stat` widget's preformatted `text`, which older
  cores don't have. Proved with `pnpm check:engine --install` against the
  published core 0.6.0 and testing 0.2.0 (187 tests).
- 747dc8d: Add the `reference` field (a link to a record of another entity): an accessible native picker that reuses the select styling and tap target, with loading, error, empty and "more records" states, and a display component for the referenced record's label. Needs an engine whose `@yadad/core` has the `reference` field type.

## 0.4.0

### Minor Changes

- ae398fa: Table stacks its rows as cards under a narrow container (cells labelled by column), sort buttons name their direction, and section/panel read optional `--yadad-shadow-sm` / `--yadad-shadow-md` tokens (no shadow when unset).

### Patch Changes

- 9480af4: Accept `@yadad/core` 0.5.x in `peerDependencies`. Proved with
  `pnpm check:engine --install`: a temp copy of the repo with the
  published `@yadad/core@0.5.0` and `@yadad/testing@0.1.5` passes the
  full gate (5 files, 168 tests).
- b5ffb71: Table: the sort button no longer overflows its header cell in the stacked phone layout.

## 0.3.1

### Patch Changes

- 39617ab: Accept `@yadad/core` 0.4.x in `peerDependencies`. Proved with
  `pnpm check:engine --install`: a temp copy of the repo with the
  `link:../yadad` dev dependencies replaced by the published
  `@yadad/core@0.4.0` and `@yadad/testing@0.1.4` passes the full gate
  (4 files, 153 tests). The CI `engine-range` job (`continue-on-error`)
  now reports the range as current.

## 0.3.0

### Minor Changes

- 5aeec13: Add the theming reference. `THEMING.md` now lists, for every component, its
  `data-part` names (with which form to target each one in), its per-component
  CSS variables and the token each defaults to, and the theme tokens it reads.
  It is generated from the component source by `scripts/theming.mjs`, so the
  freshness test in the suite fails if it drifts, and it ships in the package.
  
  The same script adds the token gate (`theming:check`, run from the test
  suite): component stylesheets must live in `@layer yadad.components`, may not
  hard-code colors, spacing, radii or fonts, and may use literals only for
  `0`, `0.5`, `1`, `2` or powers of two, with exceptions only via an inline
  `theming-exception:` comment. The gallery's third "brand" theme is the proof:
  a clearly different look built only from names the reference documents.

## 0.2.0

### Minor Changes

- Add documented `--yadad-<component>-tap` variables so the thumb targets meet the 44px phone minimum: the button, the label of a checkbox field, a sortable table header, a tab and the select picker each get a `min-block-size` that defaults to two `space-4` plus `space-3` (44px at the default tokens, doubling at 200% text and tracking any host token override). The sortable header also fills its column cell so the whole header is the target. Long count values wrap instead of running the page sideways, and the date input can now shrink below its intrinsic width so a narrow screen truncates the control's own fields instead of forcing a horizontal page scroll. Guarded in `registry/styles.test.ts` and by a rerunnable real-browser check, `gallery/check/phone-touch.mjs` (documented in the README, along with the new variables).

## 0.1.4

### Patch Changes

- Fix the tabs list overflowing the host page horizontally at large text sizes: the tablist now scrolls internally, and its ring-clearance padding (focus-ring-width plus spacing) keeps the keyboard focus ring fully visible instead of clipped by the scroll container.

## 0.1.3

### Patch Changes

- befe671: Add the changesets flow: `pnpm changeset` records a change, `pnpm changeset version` bumps the version and writes `CHANGELOG.md`. The changelog now covers every published version (backfilled from the git history), ships in the package, and the GitLab publish job skips while changesets are pending so a half-released state can never publish.

## 0.1.2

### Patch Changes

- Widen the `@yadad/core` peer range to `^0.1.0 || ^0.2.0 || ^0.3.0`. Core 0.3.0 renamed a table's quick filters and added validation warnings; neither touches the component contract, and the kit passes against it, so hosts on the current engine install cleanly without an `overrides` entry.

## 0.1.1

### Patch Changes

- Widen the `@yadad/core` peer range to `^0.1.0 || ^0.2.0`. The `^0.1.0` range excludes core 0.2.0 on 0.x semver, so hosts on the current engine had to force it with an `overrides` entry. The kit already runs against core 0.2 and passes, so the range is widened.

## 0.1.0

### Minor Changes

- First release of the reference base component set for the yadad engine: every base field type (`text`, `number`, `boolean`, `select`, `date`) and layout (`field-frame`, `section`, `button`, `table`, `error-summary`, `tabs`, `panel`) plus the `count` widget, each as `v1` under `sets/base/`, all registered in `registry/base.ts` and passing the `@yadad/testing` contract kit (fixture render, JSON output, error display, axe).
- Inputs can be labelled by an external element when the host asks, and field errors are linked to their inputs with `aria-describedby`.
- Styling follows the engine's host-configurable contract (DECISIONS D15): `--yadad-*` theme tokens only, per-component variables that default to tokens, stable `data-part` names, all CSS in `@layer yadad.components`, shipped pre-built as `./styles.css`.
- Publishes from the GitLab mirror's npm registry with the full gate (typecheck, contract kit, build) run before the upload.
