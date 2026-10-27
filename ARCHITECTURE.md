# Architecture

How `@yadad/components` is put together and how a host wires it in. The engine's own architecture (the document model, the `Registry` contract in section 9) lives in the [yadad repo](https://github.com/aggressive-stag/yadad/blob/main/ARCHITECTURE.md); this file covers only the component set. Security is in [docs/security.md](./docs/security.md).

All diagrams are Mermaid, so they render on GitHub and GitLab and diff in review. Each was checked against the source at commit `bbfc51e` on 2026-10-27.

## 1. How a host wires the set

The engine's registry keys come from `@yadad/core`. `registry/base.ts` maps every key to exactly one component version under `sets/base/<name>/v1/`. The host hands that registry to a renderer; the renderer decides what to draw and passes each component its slot props.

```mermaid
flowchart LR
  subgraph Host["Host app"]
    Docs["entity + view documents"]
    Mount["renderer element, registry prop"]
    Css["import styles.css, optional"]
  end
  subgraph Engine["yadad engine packages"]
    Core["@yadad/core: Registry type, registry keys"]
    Theme["@yadad/theme: tokens"]
    Renderer["@yadad/renderer"]
  end
  subgraph Set["@yadad/components"]
    Base["registry/base.ts: baseRegistry"]
    Fields["fields: text number boolean select date datetime time tags reference"]
    Layout["layout: FieldFrame Section Button Table ErrorSummary Tabs Panel Calendar Board Dialog Pager"]
    Widgets["widgets: count series"]
    V1["sets/base/name/v1/"]
    Internal["sets/internal: menu skeleton swatch touch-drag"]
  end
  Core -->|"keys and prop types"| Base
  Base --> Fields
  Base --> Layout
  Base --> Widgets
  Fields --> V1
  Layout --> V1
  Widgets --> V1
  V1 --> Internal
  Docs --> Mount
  Mount --> Renderer
  Base -->|"registry"| Mount
  Renderer -->|"slot props: value, onChange, invalid, disabled, actions"| V1
  Theme -->|"themeToCss"| Css
```

*How a host injects `baseRegistry` into the renderer and where slot props flow back to the version-1 components (checked against `registry/base.ts` at `bbfc51e`, 2026-10-27).*

The set imports only `react` and `@yadad/core`; there are no other runtime imports (`git grep` over `sets/` and `registry/`). `@yadad/core` is a peer dependency. `@yadad/renderer`, `@yadad/theme` and `@yadad/testing` are linked dev dependencies, used by tests and the gallery.

Versions sit side by side: a breaking change to a component arrives as a new `v2` folder, and switching is a one-line change in `registry/base.ts`.

## 2. Theming layers

Components read tokens and never hard-code a colour, length, radius or font (enforced by `scripts/theming.ts`, run as `scripts/theming.test.ts`). The pre-built CSS declares the layer order `yadad.tokens, yadad.components`, so unlayered host CSS always wins. [THEMING.md](./THEMING.md) is generated from the CSS; never hand-edit it.

```mermaid
flowchart TB
  T["@yadad/theme: lightTheme, darkTheme, themeToCss()"]
  F["Fallback: light theme under :where(:root), zero specificity, in @layer yadad.tokens"]
  H["Host tokens: --yadad-* on :root or any scope"]
  C["Component variables: --yadad-component-name, default to a token"]
  P["Component CSS in @layer yadad.components, styled by data-part"]
  O["Host overrides: unlayered CSS, data-part selectors"]
  T -->|"values generated at build time"| F
  T -->|"host writes the theme"| H
  F -->|"loses to any host token"| H
  H --> C
  C --> P
  O -->|"always wins over layered CSS"| P
```

*The token layers from `@yadad/theme` to host overrides (checked against `THEMING.md`, `scripts/theming.ts` and `scripts/token-fallback.ts` at `bbfc51e`, 2026-10-27).*

`scripts/token-fallback.ts` generates the fallback from `lightTheme`; `scripts/build-css.ts` emits `dist/yadad-components.css` plus one fragment per component in `dist/styles/`. Colour hints from documents are not applied as CSS: `paletteSlot()` maps a `#RRGGBB` value to a palette slot 0-7 and the component renders `data-slot`, which the CSS maps to a `--yadad-color-category-N` token.

## 3. Gallery and browser checks

`pnpm gallery` serves a page that renders every registry entry in every state (`gallery/src/App.tsx`, fixtures in `gallery/src/fixtures.ts`). The checks in `gallery/check/` drive Chromium through `playwright-core` against that page, or against the built CSS, and exit non-zero on failure. They are not part of `pnpm test` and are not published.

```mermaid
flowchart LR
  Dev["pnpm gallery, vite on port 5199"]
  App["gallery/src/App.tsx: every entry, themes light dark stress brand, 100% and 200% text"]
  Fix["gallery/src/fixtures.ts"]
  Chk["gallery/check/*.ts: playwright-core and Chromium"]
  Css["dist/yadad-components.css, from pnpm build"]
  Dev --> App
  Fix --> App
  App -->|"GALLERY_URL"| Chk
  Css -->|"token-fallback.ts, no server"| Chk
  Chk --> Out["PASS or FAIL lines, exit code"]
```

*The gallery and the browser checks that drive it (checked against `gallery/` and `gallery/check/` at `bbfc51e`, 2026-10-27).*

The checks are `composer-surfaces`, `contrast`, `done-toggle`, `pager-registry`, `phone-touch`, `select-labels-axe`, `slot-props`, `table-markup`, `tabs-keyboard`, `text-maxlength`, `text-multiline`, `time-tags-phone` and `token-fallback`; see [gallery/README.md](./gallery/README.md).

## 4. Release and peer-range policy

`peerDependencies["@yadad/core"]` is `>=0.10.0 <1.0.0`. A new core minor therefore needs no components release unless a feature needs it; the README Compatibility section lists the per-feature minimums. A core 1.0 is outside the range and needs a deliberate change here.

```mermaid
flowchart LR
  Dev["Commit with a changeset"] -->|"git push origin main"| GH["GitHub: ci.yml, typecheck, test, build:css"]
  Dev -->|"push mirror"| GL["GitLab mirror"]
  GL --> Rel["release job: scripts/release/publish.sh"]
  Rel -->|"pending changesets"| Skip["publish nothing"]
  Rel -->|"version not in registry"| Gate["install, typecheck, test, build"]
  Gate --> Pub["pnpm publish to the GitLab npm registry"]
  GL --> ER["engine-range job, after release, allow_failure"]
  ER -->|"newest core outside the range"| Warn["pipeline warning"]
  Eng["New @yadad/core minor"] --> ER
```

*From commit to published package, and the engine-range watchdog (checked against `.github/workflows/ci.yml`, `.gitlab-ci.yml` and `scripts/release/publish.sh` at `bbfc51e`, 2026-10-27).*

`pnpm changeset version` writes the version and `CHANGELOG.md`; the mirror's CI publishes any version the registry does not have yet, and publishes nothing while changesets are pending. The `engine-range` job runs `check:engine --install`, which proves the full gate against the newest published engine. On GitHub's public runners the registry is unreachable, so `check:engine` skips loudly there.
