# @yadad/components

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
