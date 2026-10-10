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

Styling is fully configurable by the host (engine DECISIONS D15):

- Read theme tokens — `--yadad-*` CSS variables from `@yadad/theme`. No hard-coded colors, spacing, radii or fonts.
- Expose per-component variables that default to tokens, e.g. `--yadad-text-border` falls back to `var(--yadad-color-border)`.
- Every rendered element gets a stable `data-part` (`input`, `display`, `label`, `error`, …) plus a `data-yadad="<type>"` marker. Hosts style against these; renaming one is a breaking change.
- All CSS lives in a layer (`@layer yadad.components`) so unlayered host CSS always wins.
- Plain CSS only — no Tailwind or build-time CSS tooling. The repo ships pre-built CSS that hosts may import or skip.

## How to add a component

1. Add `sets/base/<name>/v1/` with the component(s) and a `<name>.css`.
2. Register it in `registry/base.ts` (fields get `Input`/`Display`; layout and widgets as appropriate).
3. Add a `UPSTREAM.md` row if anything was copied or adapted.
4. Make the contract kit pass for the entry.
5. One component per PR/commit, scope = the component name.

Versions live side by side: a major upstream change is a new `vN` folder, never an in-place edit. Switching the active version is a one-line change in `registry/base.ts`.
