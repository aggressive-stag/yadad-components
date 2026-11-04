# pager

The paged table's Previous/Next (the engine's `layout.Pager` key): the current page is marked typographically, never by colour alone. `hasPrev` / `hasNext` disable the ends.

```tsx
<Pager hasPrev hasNext info="32–63 of 148"
  onFirst={() => {}} onPrev={() => {}} onNext={() => {}}
/>
```

![the pager on a middle page: First, Previous and Next live, the count between them](../assets/screens/pager-middle-1280-light.png)

*the pager on a middle page: First, Previous and Next live, the count between them (1280px, light).*

```tsx
<Pager hasPrev={false} hasNext info="1–31 of 148" onPrev={() => {}} onNext={() => {}} />
```

![the pager on the first page: First and Previous disabled](../assets/screens/pager-first-1280-light.png)

*the pager on the first page: First and Previous disabled (1280px, light).*

```tsx
<Pager hasPrev hasNext={false} info="124–148 of 148" onFirst={() => {}} onPrev={() => {}} />
```

![the pager on the last page: Next disabled](../assets/screens/pager-last-1280-light.png)

*the pager on the last page: Next disabled (1280px, light).*


## Theming

- `--yadad-pager-gap` — gap between the paging buttons and the count text; default: token `--yadad-space-2` (spacing scale, step 2)
- `--yadad-pager-font-family` — font family of the whole control; default: token `--yadad-font-family` (base font stack)
- `--yadad-pager-info-color` — color of the count text between the buttons; default: token `--yadad-color-text-muted` (secondary / muted text (labels, captions, empty states))
- `--yadad-pager-current-font-weight` — weight of the current-page marker in the registry pager (typographic, never colour alone); default: `600`
- `--yadad-pager-current-color` — color of the current-page marker in the registry pager; default: token `--yadad-color-text` (main text color)

Before (the pictures above) and after one host override:

```css
[data-yadad=pager] { --yadad-pager-current-color: #b3541e; }
```

![the pager after a host override recolouring the current-page marker](../assets/screens/pager-middle-1280-light-after-current.png)

*the pager after a host override recolouring the current-page marker (1280px, light).*
