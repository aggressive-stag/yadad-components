# button

One button for every action: `variant` primary/secondary, `tone` neutral/danger, `disabled`, and `pressed` for the renderer's saved-filter chips (fills from the accent, announces `aria-pressed`).

```tsx
<Button label="Save" type="button" variant="primary" disabled={false} />
```

![the primary button, enabled](../assets/screens/button-primary-enabled-1280-light.png)

*the primary button, enabled (1280px, light).*

```tsx
<Button label="Save" type="button" variant="primary" disabled onPress={() => {}} />
```

![the primary button, disabled](../assets/screens/button-primary-disabled-1280-light.png)

*the primary button, disabled (1280px, light).*

```tsx
<Button label="Delete" type="button" variant="primary" tone="danger" disabled={false} />
```

![the primary button in the danger tone](../assets/screens/button-primary-danger-1280-light.png)

*the primary button in the danger tone (1280px, light).*

```tsx
<Button label="Cancel" type="button" variant="secondary" disabled={false} />
```

![the secondary button, enabled](../assets/screens/button-secondary-enabled-1280-light.png)

*the secondary button, enabled (1280px, light).*

```tsx
<Button label="Cancel" type="button" variant="secondary" disabled onPress={() => {}} />
```

![the secondary button, disabled](../assets/screens/button-secondary-disabled-1280-light.png)

*the secondary button, disabled (1280px, light).*


## Theming

- `--yadad-button-padding` — inner padding; default: `var(--yadad-space-2) var(--yadad-space-4)` (token-derived: `--yadad-space-2`, `--yadad-space-4`)
- `--yadad-button-font-family` — font stack; default: token `--yadad-font-family` (base font stack)
- `--yadad-button-font-size` — font size; default: token `--yadad-font-size-sm` (small text (labels, secondary, table cells))
- `--yadad-button-font-weight` — font weight; default: `600`
- `--yadad-button-border-width` — border width; default: `1px`
- `--yadad-button-border` — border color; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-button-radius` — corner radius; default: token `--yadad-radius-sm` (small corner radius (inputs, buttons, chips))
- `--yadad-button-tap` — minimum tap-target height (phone); default: `var(--yadad-touch-tap, calc(var(--yadad-space-4) * 2 + var(--yadad-space-3)))` (token-derived: `--yadad-space-3`, `--yadad-space-4`)
- `--yadad-button-primary-color` — primary variant text; default: token `--yadad-color-background` (page and control background)
- `--yadad-button-primary-background` — primary variant background; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-button-secondary-color` — secondary variant text; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-button-secondary-background` — secondary variant background; default: token `--yadad-color-background` (page and control background)
- `--yadad-button-danger-border` — primary variant border for tone=danger; default: token `--yadad-color-danger` (error / danger text and borders)
- `--yadad-button-danger-background` — primary variant background for tone=danger (destructive confirm); default: token `--yadad-color-danger` (error / danger text and borders)
- `--yadad-button-focus` — focus-ring color; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-button-danger-focus` — primary variant focus-ring color for tone=danger; default: token `--yadad-color-danger` (error / danger text and borders)
- `--yadad-button-disabled-opacity` — opacity when disabled; default: `0.6`
- `--yadad-button-pressed-color` — pressed (toggled) button text colour — the saved-filter chip lit state (RFC 0009 item 5); default: token `--yadad-color-background` (page and control background)
- `--yadad-button-pressed-background` — pressed (toggled) button background — the selected look is the filled accent; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-button-pressed-border` — pressed (toggled) button border colour; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)

Before (the pictures above) and after one host override:

```css
[data-yadad=button] { --yadad-button-radius: 999px; }
```

![the primary button after a host override raising --yadad-button-radius to a pill](../assets/screens/button-primary-enabled-1280-light-after-radius.png)

*the primary button after a host override raising --yadad-button-radius to a pill (1280px, light).*
