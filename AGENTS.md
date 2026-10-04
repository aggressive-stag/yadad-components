# AGENTS.md (components repo)

Rules for any AI coding agent working in the components repository. This repo holds the reference component set for the engine. Read the engine's `ARCHITECTURE.md` in the `yadad` repo (§9 Registry contract and ownership) first.

## Layout

```
components/
  sets/
    base/
      text/v1/
      number/v1/
      date/v1/
      select/v1/
      boolean/v1/
      data-table/v1/
      grid-widget/v1/
  registry/
    base.ts          maps each field type to exactly one component version
  UPSTREAM.md        source, upstream version and date copied, per component
```

## Hard rules

1. **Implement the contract, never change it.** Components import `@yadad/core` and `@yadad/testing`, pinned to a `contract-vN` tag. If the contract is missing something, open an issue on the engine repo and stop.
2. **Every registry entry passes the contract test kit** from `@yadad/testing`: renders with fixture options, emits the right JSON type on change, shows an error, passes axe.
3. **Versions live side by side.** A major upstream change means a new `vN` folder. Never edit an older version in place to track upstream. Switching versions is a one-line change in `registry/base.ts`.
4. **Attribution.** Copied or adapted code keeps its upstream license header and a source link, and gets a row in `UPSTREAM.md` (component, source URL, upstream version, date copied, notes).
5. **Accepted dependencies** are Radix (or React Aria / Base UI) for behavior primitives and TanStack Table / Virtual for tables. Anything else needs an engine-repo RFC.
6. **Styling is configurable by the host** (engine DECISIONS.md D15):
   - Read theme tokens (`--yadad-*` CSS variables from `@yadad/theme`). No hard-coded colors, spacing, radii or fonts.
   - Expose per-component variables that default to tokens, e.g. `--yadad-input-border: var(--yadad-color-border)`.
   - Give every rendered element a stable `data-part` (`data-part="input"`, `"label"`, `"error"`); hosts style against these, so renaming one is a breaking change.
   - Put all CSS in `@layer yadad` so unlayered host CSS always wins.
   - Plain CSS only: no Tailwind or other build-time CSS tooling. The repo ships pre-built CSS that hosts may import or skip.
7. **One component (one folder) per PR**, plus its registry line and `UPSTREAM.md` row.
8. **Personal and work-specific notes go in `*.private.md` files** (gitignored, never committed). This covers employer or work-app names, clients, sign-off questions, and anything personal. Tracked files describe these generically and must not quote or summarize `*.private.md` content.

## Commit messages

[Angular format](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md), enforced by `.githooks/commit-msg` (enable with `git config core.hooksPath .githooks`). Same rules as the engine repo's `AGENTS.md`, except the scope is the component name (`text`, `data-table`), `registry`, `dev-infra` or `deps`. Commit early and often: one logical step per commit.

## Done when

- Contract kit passes for the entry.
- `registry/base.ts` references it.
- `UPSTREAM.md` row present (if anything was copied).
- Showcase renders the matching fixture without engine changes.
