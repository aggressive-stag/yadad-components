# Screenshots

Every picture in the docs lives here. They are **generated** — do not hand-edit
or add images by other means. Regenerate all of them from the repo root:

```bash
pnpm gallery &   # vite on :5199 (any port: set GALLERY_URL to match)
GALLERY_URL=http://localhost:5199/ pnpm docs:shots
```

`gallery/shoot.ts` holds the manifest below; each row is one file, captured at
device scale factor 1 from the running gallery with the state id, viewport and
theme listed. Names follow `<component>-<state>-<width>-<scheme>.png`; an
`-after-<token>` suffix marks a before/after picture where one theming variable
is overridden by host CSS. Compressed with `pngquant` when installed. The data
on screen is the gallery's fictional fixtures (`gallery/src/fixtures.ts`).

| image | shows | gallery anchor | viewport | theme |
| --- | --- | --- | --- | --- |
| `hero-overview-1280-light.png` | the set composed together: fields in a panel, a table with its pager and a board | `#hero-page` | 1280×900 | light |
| `hero-overview-1280-dark.png` | the same composition in the dark theme | `#hero-page` | 1280×900 | dark |
| `text-filled-1280-light.png` | text: input with a value | `#text-filled` | 1280×900 | light |
| `text-empty-1280-light.png` | text: input with no value | `#text-empty` | 1280×900 | light |
| `text-invalid-1280-light.png` | text: input with a validation error | `#text-invalid` | 1280×900 | light |
| `text-display-value-1280-light.png` | text: read-only display of a value | `#text-display-value` | 1280×900 | light |
| `number-filled-1280-light.png` | number: input with a value | `#number-filled` | 1280×900 | light |
| `number-empty-1280-light.png` | number: input with no value | `#number-empty` | 1280×900 | light |
| `number-invalid-1280-light.png` | number: input with a validation error | `#number-invalid` | 1280×900 | light |
| `number-display-value-1280-light.png` | number: read-only display of a value | `#number-display-value` | 1280×900 | light |
| `boolean-filled-1280-light.png` | boolean: input with a value | `#boolean-filled` | 1280×900 | light |
| `boolean-empty-1280-light.png` | boolean: input with no value | `#boolean-empty` | 1280×900 | light |
| `boolean-invalid-1280-light.png` | boolean: input with a validation error | `#boolean-invalid` | 1280×900 | light |
| `boolean-display-value-1280-light.png` | boolean: read-only display of a value | `#boolean-display-value` | 1280×900 | light |
| `select-filled-1280-light.png` | select: input with a value | `#select-filled` | 1280×900 | light |
| `select-empty-1280-light.png` | select: input with no value | `#select-empty` | 1280×900 | light |
| `select-invalid-1280-light.png` | select: input with a validation error | `#select-invalid` | 1280×900 | light |
| `select-display-value-1280-light.png` | select: read-only display of a value | `#select-display-value` | 1280×900 | light |
| `date-filled-1280-light.png` | date: input with a value | `#date-filled` | 1280×900 | light |
| `date-empty-1280-light.png` | date: input with no value | `#date-empty` | 1280×900 | light |
| `date-invalid-1280-light.png` | date: input with a validation error | `#date-invalid` | 1280×900 | light |
| `date-display-value-1280-light.png` | date: read-only display of a value | `#date-display-value` | 1280×900 | light |
| `datetime-filled-1280-light.png` | datetime: input with a value | `#datetime-filled` | 1280×900 | light |
| `datetime-empty-1280-light.png` | datetime: input with no value | `#datetime-empty` | 1280×900 | light |
| `datetime-invalid-1280-light.png` | datetime: input with a validation error | `#datetime-invalid` | 1280×900 | light |
| `datetime-display-value-1280-light.png` | datetime: read-only display of a value | `#datetime-display-value` | 1280×900 | light |
| `time-filled-1280-light.png` | time: input with a value | `#time-filled` | 1280×900 | light |
| `time-empty-1280-light.png` | time: input with no value | `#time-empty` | 1280×900 | light |
| `time-invalid-1280-light.png` | time: input with a validation error | `#time-invalid` | 1280×900 | light |
| `time-display-value-1280-light.png` | time: read-only display of a value | `#time-display-value` | 1280×900 | light |
| `tags-filled-1280-light.png` | tags: input with a value | `#tags-filled` | 1280×900 | light |
| `tags-empty-1280-light.png` | tags: input with no value | `#tags-empty` | 1280×900 | light |
| `tags-invalid-1280-light.png` | tags: input with a validation error | `#tags-invalid` | 1280×900 | light |
| `tags-display-value-1280-light.png` | tags: read-only display of a value | `#tags-display-value` | 1280×900 | light |
| `reference-filled-1280-light.png` | reference: input with a value | `#reference-filled` | 1280×900 | light |
| `reference-empty-1280-light.png` | reference: input with no value | `#reference-empty` | 1280×900 | light |
| `reference-invalid-1280-light.png` | reference: input with a validation error | `#reference-invalid` | 1280×900 | light |
| `reference-display-value-1280-light.png` | reference: read-only display of a value | `#reference-display-value` | 1280×900 | light |
| `text-multiline-1280-light.png` | text: multiline textarea | `#text-multiline` | 1280×900 | light |
| `text-diff-1280-light.png` | text display: word-level compare marks (added/removed runs) | `#text-diff-short` | 1280×900 | light |
| `select-display-labelled-1280-light.png` | select display: option label with its vocabulary dot | `#select-display-labelled` | 1280×900 | light |
| `datetime-display-text-1280-light.png` | datetime display: the stored instant, renderer-formatted | `#datetime-display-text` | 1280×900 | light |
| `reference-combobox-open-1280-light.png` | reference: combobox open over its options, one picked | `#reference-combobox` | 1280×900 | light |
| `reference-display-colour-1280-light.png` | reference display: label with its colour-hint dot | `#reference-display-colour` | 1280×900 | light |
| `tags-display-many-1280-light.png` | tags display: many chips, wrapped | `#tags-display-many` | 1280×900 | light |
| `field-frame-clean-1280-light.png` | field-frame: label and required marker around a clean input | `#field-frame-clean` | 1280×900 | light |
| `field-frame-errors-1280-light.png` | field-frame: label, required marker and errors around an input | `#field-frame-errors` | 1280×900 | light |
| `section-titled-1280-light.png` | section: titled group of content | `#section-titled` | 1280×900 | light |
| `section-untitled-1280-light.png` | section: without a title | `#section-untitled` | 1280×900 | light |
| `button-primary-enabled-1280-light.png` | button: primary, enabled | `#button-primary-enabled` | 1280×900 | light |
| `button-primary-disabled-1280-light.png` | button: primary, disabled | `#button-primary-disabled` | 1280×900 | light |
| `button-primary-danger-1280-light.png` | button: primary, danger | `#button-primary-danger` | 1280×900 | light |
| `button-secondary-enabled-1280-light.png` | button: secondary, enabled | `#button-secondary-enabled` | 1280×900 | light |
| `button-secondary-disabled-1280-light.png` | button: secondary, disabled | `#button-secondary-disabled` | 1280×900 | light |
| `table-few-rows-1280-light.png` | table: few rows | `#table-few-rows` | 1280×900 | light |
| `table-empty-1280-light.png` | table: empty | `#table-empty` | 1280×900 | light |
| `table-loading-1280-light.png` | table: loading | `#table-loading` | 1280×900 | light |
| `table-many-rows-long-text-1280-light.png` | table: many rows long text | `#table-many-rows-long-text` | 1280×900 | light |
| `table-sort-desc-1280-light.png` | table: sort desc | `#table-sort-desc` | 1280×900 | light |
| `table-actions-several-1280-light.png` | table: actions several | `#table-actions-several` | 1280×900 | light |
| `table-few-rows-390-light.png` | table at phone width: rows stack into cards with a label on every cell | `#table-few-rows` | 390×900 | light |
| `table-few-rows-1280-dark.png` | table in the dark theme | `#table-few-rows` | 1280×900 | dark |
| `error-summary-many-1280-light.png` | error-summary: several errors with hints | `#error-summary-many` | 1280×900 | light |
| `error-summary-one-1280-light.png` | error-summary: one error | `#error-summary-one` | 1280×900 | light |
| `tabs-two-1280-light.png` | tabs: two tabs, the selected one underlined | `#tabs-two` | 1280×900 | light |
| `tabs-many-1280-light.png` | tabs: many tabs in a scrolling list | `#tabs-many` | 1280×900 | light |
| `tabs-two-1280-dark.png` | tabs in the dark theme | `#tabs-two` | 1280×900 | dark |
| `panel-titled-1280-light.png` | panel: titled | `#panel-titled` | 1280×900 | light |
| `panel-untitled-1280-light.png` | panel: without a title | `#panel-untitled` | 1280×900 | light |
| `count-small-1280-light.png` | count: small | `#count-small` | 1280×900 | light |
| `count-large-1280-light.png` | count: large | `#count-large` | 1280×900 | light |
| `count-loading-1280-light.png` | count: loading | `#count-loading` | 1280×900 | light |
| `series-table-1280-light.png` | series: the accessible table display, twelve weekly groups | `#series-table` | 1280×900 | light |
| `series-bar-1280-light.png` | series: bar chart, a gap bucket drawn as a dash | `#series-bar` | 1280×900 | light |
| `series-line-1280-light.png` | series: line chart over twenty-six weeks, broken at gaps | `#series-line` | 1280×900 | light |
| `series-bar-phone-1280-light.png` | series bar chart inside a 320px phone frame (the crop is the frame, not the viewport) | `#series-bar-phone` | 1280×900 | light |
| `pager-middle-1280-light.png` | pager: middle page | `#pager-middle` | 1280×900 | light |
| `pager-first-1280-light.png` | pager: first page | `#pager-first` | 1280×900 | light |
| `pager-last-1280-light.png` | pager: last page | `#pager-last` | 1280×900 | light |
| `calendar-month-1280-light.png` | calendar: month grid with entries and the agenda below | `#calendar-month-busy` | 1280×900 | light |
| `calendar-month-empty-1280-light.png` | calendar: an empty month | `#calendar-month-empty` | 1280×900 | light |
| `calendar-week-1280-light.png` | calendar: week mode | `#calendar-week` | 1280×900 | light |
| `calendar-3day-1280-light.png` | calendar: 3-day mode | `#calendar-3day` | 1280×900 | light |
| `calendar-agenda-390-light.png` | calendar on a phone: the agenda list under the month | `#calendar-phone-agenda` | 390×900 | light |
| `calendar-3day-390-light.png` | calendar on a phone: 3-day mode at 390px | `#calendar-phone-3day` | 390×900 | light |
| `calendar-month-1280-dark.png` | calendar month in the dark theme | `#calendar-month-busy` | 1280×900 | dark |
| `board-columns-1280-light.png` | board: four status columns of cards with the group-by picker | `#board-columns` | 1280×900 | light |
| `board-empty-column-1280-light.png` | board: an empty column | `#board-empty-column` | 1280×900 | light |
| `board-many-cards-1280-light.png` | board: many cards, each column scrolls on its own | `#board-many-cards` | 1280×900 | light |
| `board-columns-390-light.png` | board on a phone: one column at a time | `#board-columns` | 390×900 | light |
| `board-columns-1280-dark.png` | board in the dark theme | `#board-columns` | 1280×900 | dark |
| `dialog-static-1280-light.png` | dialog rendered static (modal=false): header, body, Cancel and Confirm | `#dialog-static` | 1280×900 | light |
| `dialog-open-1280-light.png` | modal dialog over the page: scrim, focus in the dialog, background inert | `#dialog-open` | 1280×900 | light |
| `dialog-open-390-light.png` | modal dialog at phone width | `#dialog-open` | 390×900 | light |
| `dialog-static-1280-dark.png` | static dialog in the dark theme | `#dialog-static` | 1280×900 | dark |
| `composer-chips-row-1280-light.png` | composer: the saved-filter chip row, one chip pressed | `#chips-row` | 1280×900 | light |
| `composer-batch-1280-light.png` | composer: batch repeat rows on a hairline with the + another controls | `#batch-composer` | 1280×900 | light |
| `composer-checklist-1280-light.png` | composer: sub-record checklist — a ticked row strikes through, a pending row does not | `#checklist-rows` | 1280×900 | light |
| `check-primitive-1280-light.png` | the internal Check primitive: square and circle, checked and locked | `#check-primitive` | 1280×900 | light |
| `theming-board-columns-1280-light.png` | board under the light theme tokens | `#board-columns` | 1280×900 | light |
| `theming-board-columns-1280-brand.png` | the same board under the gallery's brand token set | `#board-columns` | 1280×900 | brand |
| `text-filled-1280-light-after-radius.png` | text: after — --yadad-text-radius raised to a pill | `#text-filled` | 1280×900 | light + host CSS override |
| `number-filled-1280-light-after-unit.png` | number: after — --yadad-number-unit-size enlarged and recoloured | `#number-filled` | 1280×900 | light + host CSS override |
| `boolean-filled-1280-light-after-size.png` | boolean: after — --yadad-boolean-size enlarged to 2rem | `#boolean-filled` | 1280×900 | light + host CSS override |
| `select-filled-1280-light-after-radius.png` | select: after — --yadad-select-radius raised to a pill | `#select-filled` | 1280×900 | light + host CSS override |
| `date-filled-1280-light-after-radius.png` | date: after — --yadad-date-radius raised to a pill | `#date-filled` | 1280×900 | light + host CSS override |
| `datetime-filled-1280-light-after-radius.png` | datetime: after — --yadad-datetime-radius raised to a pill | `#datetime-filled` | 1280×900 | light + host CSS override |
| `time-filled-1280-light-after-radius.png` | time: after — --yadad-time-radius raised to a pill | `#time-filled` | 1280×900 | light + host CSS override |
| `tags-filled-1280-light-after-chip.png` | tags: after — --yadad-tags-chip-background and chip radius rebranded | `#tags-filled` | 1280×900 | light + host CSS override |
| `reference-combobox-1280-light-after-option.png` | reference: after — --yadad-reference-option-background-active rebranded (picker open) | `#reference-combobox` | 1280×900 | light + host CSS override |
| `field-frame-clean-1280-light-after-label.png` | field-frame: after — --yadad-field-frame-label-size enlarged | `#field-frame-clean` | 1280×900 | light + host CSS override |
| `section-titled-1280-light-after-background.png` | section: after — --yadad-section-background tinted | `#section-titled` | 1280×900 | light + host CSS override |
| `button-primary-enabled-1280-light-after-radius.png` | button: after — --yadad-button-radius raised to a pill | `#button-primary-enabled` | 1280×900 | light + host CSS override |
| `table-few-rows-1280-light-after-header.png` | table: after — --yadad-table-header-background tinted | `#table-few-rows` | 1280×900 | light + host CSS override |
| `error-summary-many-1280-light-after-bar.png` | error-summary: after — --yadad-error-summary-bar recoloured | `#error-summary-many` | 1280×900 | light + host CSS override |
| `tabs-two-1280-light-after-indicator.png` | tabs: after — --yadad-tabs-indicator recoloured | `#tabs-two` | 1280×900 | light + host CSS override |
| `panel-titled-1280-light-after-radius.png` | panel: after — --yadad-panel-radius squared off | `#panel-titled` | 1280×900 | light + host CSS override |
| `count-large-1280-light-after-value.png` | count: after — --yadad-count-value-size enlarged | `#count-large` | 1280×900 | light + host CSS override |
| `series-bar-1280-light-after-bar.png` | series: after — --yadad-series-bar recoloured | `#series-bar` | 1280×900 | light + host CSS override |
| `pager-middle-1280-light-after-current.png` | pager: after — --yadad-pager-current-colour recoloured | `#pager-middle` | 1280×900 | light + host CSS override |
| `calendar-month-busy-1280-light-after-selected.png` | calendar: after — --yadad-calendar-selected-background recoloured | `#calendar-month-busy` | 1280×900 | light + host CSS override |
| `board-columns-1280-light-after-radius.png` | board: after — --yadad-board-radius squared off | `#board-columns` | 1280×900 | light + host CSS override |
| `dialog-static-1280-light-after-radius.png` | dialog: after — --yadad-dialog-radius squared off (static dialog) | `#dialog-static` | 1280×900 | light + host CSS override |
| `composer-chips-row-1280-light-after-chip.png` | composer: after — --yadad-composer-chip-radius raised to a pill | `#chips-row` | 1280×900 | light + host CSS override |
| `check-primitive-1280-light-after-size.png` | check: after — --yadad-check-size enlarged to 28px | `#check-primitive` | 1280×900 | light + host CSS override |
