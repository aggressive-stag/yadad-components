# @yadad/components

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
