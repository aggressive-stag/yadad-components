# yadad-components

The reference component set for [yadad](https://github.com/aggressive-stag/yadad): themeable, accessible field and layout components that implement the engine's `Registry` contract. The engine renderer never imports these directly — a host app injects this registry, and the same engine then renders forms, tables and dashboards with it.

You do not have to use this set. Anything that satisfies the engine's `Registry` type works. This repo is the maintained, contract-tested baseline.

Status (October 2026): a `v1` of every base component exists and passes the contract kit. The engine contract is still `specVersion: 0` / pre-`contract-v0`, so `@yadad/core` and `@yadad/testing` are linked from a sibling `../yadad` checkout until `contract-v0` is tagged.

## Repo layout

```
sets/
  base/
    <component>/v1/     one folder per component version (Input/Display + *.css)
registry/
  base.ts               maps each field type to exactly one component version
UPSTREAM.md             attribution: source, upstream version, date copied, per component
```

Components in the base set today: field types `text`, `number`, `boolean`, `select`, `date`; layout `field-frame`, `section`, `button`, `table`, `error-summary`, `tabs`, `panel`; widget `count`.

The engine's `ARCHITECTURE.md` §9 (Registry contract and ownership) is the source of truth for the contract. This repo implements it and never changes it.

## Getting started

`pnpm` is not on `PATH`; use `corepack pnpm`. Requires Node >= 22.12.

Because the engine is not yet published under a contract tag, check out `yadad` as a sibling of this repo and install both, then:

```sh
corepack pnpm install          # in ../yadad
corepack pnpm install          # here

corepack pnpm typecheck
corepack pnpm test             # contract kit + axe + stylesheet guardrails
corepack pnpm build:css        # emits dist/yadad-components.css
```

`pnpm build` runs `typecheck`-equivalent `tsc -p tsconfig.build.json` plus the stylesheet build.

## Releasing

This repo uses [changesets](https://github.com/changesets/changesets): a change that users can see gets a changeset (`pnpm changeset` — patch for fixes, minor for features while pre-1.0), and `pnpm changeset version` bumps the version and writes `CHANGELOG.md`. Commit both and push; the GitLab mirror publishes any version that is not in the registry yet and skips publishing while changesets are pending. `CHANGELOG.md` covers every published version and ships in the package.

## The contract every entry must pass

Each registry entry is checked by the contract test kit from `@yadad/testing`:

1. Renders with fixture options.
2. Emits the right JSON type on change.
3. Shows a given error.
4. Passes axe.

## Styling contract

Styling is fully configurable by the host (engine DECISIONS D15). **[THEMING.md](./THEMING.md) is the canonical, generated reference for everything a host can change** — the theme tokens, every component's `data-part` names and per-component variables (with their token defaults), and how `@layer yadad` lets host CSS win. It is generated from the CSS and TSX by `scripts/theming.mjs` and the test suite fails if it drifts, so it cannot go out of date.

The rules it documents:

- Read theme tokens — `--yadad-*` CSS variables from `@yadad/theme`. No hard-coded colors, spacing, radii or fonts.
- Expose per-component variables that default to tokens, e.g. `--yadad-text-border` falls back to `var(--yadad-color-border)`.
- Every rendered element gets a stable `data-part` (`input`, `display`, `label`, `error`, …) plus a `data-yadad="<type>"` marker. Hosts style against these; renaming one is a breaking change.
- All CSS lives in a layer (`@layer yadad.components`) so unlayered host CSS always wins.
- Plain CSS only — no Tailwind or build-time CSS tooling. The repo ships pre-built CSS that hosts may import or skip.

The rules above are enforced by the test gate (`scripts/theming.test.mjs` → `scripts/theming.mjs check`), not just documented: a hard-coded color, a stray length, or CSS outside the layer fails the build. Regenerate the reference with `corepack pnpm theming:docs`.

## Real-browser checks

`pnpm gallery` serves a page that renders every registry entry in all of its states, with light/dark and 100%/200% text toggles. Use it for any UI change (desktop and 390×844 with touch, keyboard-only).

`gallery/check/` holds rerunnable checks that are not published:

```sh
GALLERY_URL=http://localhost:5199/ node gallery/check/tabs-keyboard.mjs
GALLERY_URL=http://localhost:5199/ node gallery/check/phone-touch.mjs
```

Both exit non-zero on any failure. If the machine's Chromium differs from the one `playwright-core` ships, point at it with `PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome-headless-shell`.

`tabs-keyboard.mjs` drives a real Chromium through the gallery and asserts that at 200% text the long tab list scrolls internally instead of forcing page-level horizontal overflow, that `End` reaches the last tab with its focus ring inside the viewport, and that the tablist's ring-clearance padding covers the focus-ring extent in both themes at both sizes.

`phone-touch.mjs` drives the gallery at 390×844 and 320 px wide with touch enabled, in both themes and at 200% text, and asserts that the tap targets (buttons, the checkbox label, sortable headers, tabs and pickers) are at least 44×44 CSS px, that nothing forces the host page to scroll sideways (the table scrolls inside its own container and long text wraps), that inputs render at 16 px or larger so iOS Safari does not zoom on focus, that the long tab list stays scrollable with the selected tab visible, and that a real touch tap activates the button. The one exception it reports instead of failing on is a native date control's intrinsic minimum width, which a browser does not let CSS shrink: if the date input is the only thing pushing the page wide, it is reported as a documented limitation.

## Phone touch variables

On a phone a thumb needs at least a 44×44 CSS px target. 44 px cannot be written as a literal (the length guardrail) and is not one of the theme's length tokens, so the tap-target components each declare a variable whose default is token-derived — two `space-4` plus `space-3`, which is 44 px at the default tokens and doubles to 88 px at 200% text (and rescales with any host token override). Override the variable on the element or any ancestor:

| Variable | Applies to | Default |
| --- | --- | --- |
| `--yadad-button-tap` | the button (`data-part="root"`) | `calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))` |
| `--yadad-field-frame-checkbox-tap` | the label of a checkbox field only (scoped with `:has()`, so other field labels are untouched) | `calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))` |
| `--yadad-table-sort-tap` | a sortable column header (`data-part="sort"`, which fills its header cell) | `calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))` |
| `--yadad-tabs-tap` | a tab (`data-part="tab"`) | `calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))` |
| `--yadad-select-tap` | the picker (`data-part="input"`) | `calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))` |

## How to add a component

1. Add `sets/base/<name>/v1/` with the component(s) and a `<name>.css`.
2. Register it in `registry/base.ts` (fields get `Input`/`Display`; layout and widgets as appropriate).
3. Add a `UPSTREAM.md` row if anything was copied or adapted.
4. Make the contract kit pass for the entry.
5. One component per PR/commit, scope = the component name.

Versions live side by side: a major upstream change is a new `vN` folder, never an in-place edit. Switching the active version is a one-line change in `registry/base.ts`.
