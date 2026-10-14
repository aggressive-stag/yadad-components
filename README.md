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

## Keeping up with engine releases

`peerDependencies` declares which `@yadad/core` versions this set works with. Pre-1.0, every new core minor (`0.3 → 0.4`) falls outside a `^0.3.0` range, so until the range is widened, hosts on the newest engine get a peer-dependency conflict and have to force the install. The engine publishes often, so this is a check, not memory:

```sh
corepack pnpm check:engine
```

asks the registry for every published `@yadad/core` and `@yadad/testing` version, reports the newest, and exits non-zero if the declared range does not cover it (or if the newest testing kit cannot run the kit against that core). A CI job runs it on every push with `continue-on-error`, so a stale range shows up as a red check without blocking unrelated work — a new engine minor lands *before* the components can prove themselves against it, and the point of the job is to make that visible, not to hold the line.

One honest caveat: the engine registry is LAN-internal, and GitHub's public CI runners cannot resolve it. From such a network the script cannot answer "is the range stale?", so it skips loudly and exits 0 — the log says `SKIP — cannot reach the engine registry … No staleness verdict was produced. This is NOT a pass.` A skip never masquerades as a pass, and a genuinely reachable-but-stale range still fails. So the GitHub `engine-range` job is a documented no-op; the verdict comes from the `engine-range` job in `.gitlab-ci.yml`. That job runs on the `k8s` runner (which can reach the registry) on default-branch pushes, in the `.post` stage after `release` with `allow_failure: true`, so it never blocks or reorders publishing. It uses only CI variables (`CI_API_V4_URL`, `CI_JOB_TOKEN`, `CI_SERVER_URL`) and runs the full check, `pnpm check:engine --install`. A stale range shows as a warning on the GitLab pipeline. The same command is the standing "is the range current?" check on any homelab machine.

Widening the range requires proof, because the linked `../yadad` source may differ from the newest published version:

```sh
corepack pnpm check:engine --install
```

copies this repo to a temp dir, swaps the `link:../yadad` dev dependencies for the newest published `@yadad/core` and `@yadad/testing`, installs them, and runs the full test gate there. Only a passing run justifies adding the new minor to `peerDependencies` (in the existing `^0.1.0 || ^0.2.0 || …` style) and releasing a patch changeset. If the gate fails against the published engine, the range stays and the failure is recorded: it is either a component bug to fix here or a contract change to report.

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
