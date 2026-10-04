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

1. **Implement the contract, never change it.** Components import `@engine/core` and `@engine/testing`, pinned to a `contract-vN` tag. If the contract is missing something, open an issue on the engine repo and stop.
2. **Every registry entry passes the contract test kit** from `@engine/testing`: renders with fixture options, emits the right JSON type on change, shows an error, passes axe.
3. **Versions live side by side.** A major upstream change means a new `vN` folder. Never edit an older version in place to track upstream. Switching versions is a one-line change in `registry/base.ts`.
4. **Attribution.** Copied or adapted code keeps its upstream license header and a source link, and gets a row in `UPSTREAM.md` (component, source URL, upstream version, date copied, notes).
5. **Accepted dependencies** are Radix (or React Aria / Base UI) for behavior primitives and TanStack Table / Virtual for tables. Anything else needs an engine-repo RFC.
6. **Styling reads theme tokens** (CSS variables from `@engine/theme`). No hard-coded colors or spacing.
7. **One component (one folder) per PR**, plus its registry line and `UPSTREAM.md` row.
8. **Personal and work-specific notes go in `*.private.md` files** (gitignored, never committed). This covers employer or work-app names, clients, sign-off questions, and anything personal. Tracked files describe these generically and must not quote or summarize `*.private.md` content.

## Done when

- Contract kit passes for the entry.
- `registry/base.ts` references it.
- `UPSTREAM.md` row present (if anything was copied).
- Showcase renders the matching fixture without engine changes.
