# time

A native time input (`HH:MM` in and out) with the field's bounds and step. The Display is a `<time>` element.

Registry entry `fields.time` in `registry/base.ts` pairs an `Input` with a read-only `Display`.

## Input

The renderer wraps each Input in [FieldFrame](./field-frame.md) (label, required marker, errors):

```tsx
<TimeInput
  inputId="g-x"
  field={{ id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 }}
  value={"09:30"}
  onChange={() => {}}
  invalid={false}
/>
```

![the time input with a value](../assets/screens/time-filled-1280-light.png)

*the time input with a value (1280px, light).*

```tsx
<TimeInput
  inputId="g-x"
  field={{ id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 }}
  value={undefined}
  onChange={() => {}}
  invalid={false}
/>
```

![the time input with no value](../assets/screens/time-empty-1280-light.png)

*the time input with no value (1280px, light).*

```tsx
<TimeInput
  inputId="g-x"
  field={{ id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 }}
  value={"09:30"}
  onChange={() => {}}
  invalid={true}
  describedBy="g-x-errors"  // only when invalid
/>
// and FieldFrame errors={[requiredError("/start")]}
```

![the time input with a validation error](../assets/screens/time-invalid-1280-light.png)

*the time input with a validation error (1280px, light).*

## Display

```tsx
<TimeDisplay field={{ id: "start", type: "time", label: "Start", min: "09:00", max: "17:00", step: 15 }}
  value={"09:30"}
/>
```

![the time Display with a value](../assets/screens/time-display-value-1280-light.png)

*the time Display with a value (1280px, light).*


## Theming

- `--yadad-time-width` — inline size; default: `100%`
- `--yadad-time-padding` — inner padding; default: `var(--yadad-space-2) var(--yadad-space-3)` (token-derived: `--yadad-space-2`, `--yadad-space-3`)
- `--yadad-time-font-family` — font stack; default: token `--yadad-font-family` (base font stack)
- `--yadad-time-font-size` — font size; default: token `--yadad-font-size-md` (base text (inputs, body, tab labels))
- `--yadad-time-color` — foreground color; default: token `--yadad-color-text` (main text color)
- `--yadad-time-background` — background; default: token `--yadad-color-background` (page and control background)
- `--yadad-time-border-width` — border width; default: `1px`
- `--yadad-time-border` — border color; default: token `--yadad-color-border` (borders and dividers)
- `--yadad-time-radius` — corner radius; default: token `--yadad-radius-sm` (small corner radius (inputs, buttons, chips))
- `--yadad-time-focus` — focus-ring color; default: token `--yadad-color-accent` (brand / primary accent — links, focus ring, selected state)
- `--yadad-time-border-invalid` — border color when invalid; default: token `--yadad-color-danger` (error / danger text and borders)
- `--yadad-time-display-color-empty` — colour of the empty marker (em-dash) in the read-only display; default: token `--yadad-color-text-muted` (secondary / muted text (labels, captions, empty states))
- `--yadad-time-touch-font-size` — input font size under a coarse pointer; defaults to the larger of 1rem and the theme's font-size-md, so it never drops below 16px. Set it smaller only on purpose: iOS then zooms on focus; default: `var(--yadad-touch-font-size, max(var(--yadad-space-4), var(--yadad-font-size-md)))` (token-derived: `--yadad-font-size-md`, `--yadad-space-4`)
- `--yadad-time-tap` — minimum input height under a coarse pointer (the tap target on a phone); default: `var(--yadad-touch-tap, calc(var(--yadad-space-4) * 2 + var(--yadad-space-3)))` (token-derived: `--yadad-space-3`, `--yadad-space-4`)

Before (the picture above) and after one host override. Host CSS is unlayered, so it wins over the component layer without `!important`:

```css
[data-yadad="time"] input { --yadad-time-radius: 999px; }
```

![the time input after a host override of its radius variables](../assets/screens/time-filled-1280-light-after-radius.png)

*the time input after a host override of its radius variables (1280px, light).*
