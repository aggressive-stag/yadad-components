# @yadad/components

The reference component set for [yadad](https://github.com/aggressive-stag/yadad), a schema-driven React engine for forms, tables and dashboards. It is a styled, themeable, accessible implementation of the engine's `Registry` contract: install it, hand it to the renderer, and your entity and view documents render with real inputs, a sortable table, tabs and panels.

You do not have to use it. The engine only asks for something that satisfies its `Registry` type, so you can swap this set for your own, or replace individual entries.

## Install

Packages are published to the project's GitLab npm registry. Point the `@yadad` scope at it:

```ini
# .npmrc
@yadad:registry=<registry URL>
```

```sh
pnpm add @yadad/components @yadad/core @yadad/renderer @yadad/theme
```

Peer dependencies: `react` `^19.3.0` and `@yadad/core` (see [Compatibility](#compatibility)).

## Usage

Import the registry and the stylesheet, then pass the registry to a renderer:

```tsx
import { FormRenderer } from "@yadad/renderer";
import { baseRegistry } from "@yadad/components";
import "@yadad/components/styles.css";

export function CustomerForm({ entity, view, dataSources }) {
  return (
    <FormRenderer
      entity={entity}
      view={view}
      registry={baseRegistry}
      dataSources={dataSources}
    />
  );
}
```

`baseRegistry` is a `Registry<ReactNode>`. The same registry works with `TableRenderer` and `DashboardRenderer`. The stylesheet is optional: skip it and style the `data-part` hooks yourself.

## What is included

- **Field types** (each an `Input` and a read-only `Display`): `text`, `number`, `boolean`, `select`, `date`.
- **Layout:** `FieldFrame` (label, required marker and errors around any input), `Section`, `Panel`, `Tabs`, `Button`, `ErrorSummary`, and `Table`.
- **Table:** sortable column headers, and on a narrow container it switches to a stacked layout where each row becomes a card with a label on every cell.
- **Widgets:** `count`.

Each component lives under `sets/base/<name>/v1/`. Versions sit side by side, so a future breaking change arrives as a new `v2` rather than an in-place edit.

## Theming

Everything is styled through a public surface, so you never fork a component to change its look:

1. **Tokens.** Set the `--yadad-*` custom properties from `@yadad/theme` (colors, spacing, radii, fonts, and the optional `--yadad-shadow-sm` / `--yadad-shadow-md`) on `:root` or any scope. `lightTheme`, `darkTheme` and `themeToCss()` are exported by `@yadad/theme`.
2. **Per-component variables.** Each component exposes variables such as `--yadad-text-border` that default to a token, so you can change one thing and inherit the rest.
3. **`data-part` hooks.** Every rendered element has a stable `data-part` (`input`, `label`, `error`, `header`, ...) and each component root a `data-yadad="<type>"` marker. Renaming a part is a breaking change.

All component CSS is in `@layer yadad.components`, so unlayered host CSS always wins without `!important`. Components contain no hard-coded colors, lengths, radii or fonts. The complete list of tokens, parts and variables is in [THEMING.md](./THEMING.md), which is generated from the CSS and kept in sync by the test suite.

## Accessibility and touch

- Every interactive element has a visible `:focus-visible` ring.
- Each registry entry is checked with axe and the engine's contract test kit (renders with fixture options, emits the correct JSON type on change, shows its error).
- Tabs are keyboard operable, and a long tab list scrolls inside its own container.
- On a phone, buttons, the checkbox label, sortable headers, tabs and pickers have a tap target of at least 44x44 CSS px, tied to your spacing tokens so it scales with text size. Each has a `--yadad-*-tap` variable you can override.
- Inputs render at 16px or larger so iOS Safari does not zoom on focus.
- The page does not scroll sideways: tables scroll or stack inside their container and long text wraps. The one exception is a browser's native date control, whose minimum width CSS cannot shrink.

## Gallery

```sh
pnpm gallery
```

serves a page that renders every component in every state, with light, dark, stress and brand themes and 100% / 200% text toggles. It is the quickest way to see what you are getting and to try a theme.

## Compatibility

Works with the `@yadad/core` versions in the package's `peerDependencies` range, which is widened as the engine releases new minors. React 19 is required. Node 22.12 or newer is needed to build from source.

## Development

```sh
pnpm install
pnpm gallery     # see every component
pnpm test        # contract kit, axe, theming guardrails
pnpm build       # type declarations and dist/yadad-components.css
```

Contribution rules, releasing and the browser checks are in [AGENTS.md](./AGENTS.md); attribution for adapted code is in [UPSTREAM.md](./UPSTREAM.md); versions are listed in [CHANGELOG.md](./CHANGELOG.md).

## Links

- Engine: [yadad](https://github.com/aggressive-stag/yadad) and its [ARCHITECTURE.md](https://github.com/aggressive-stag/yadad/blob/main/ARCHITECTURE.md) (the Registry contract is section 9)
- Theme tokens: `@yadad/theme`
