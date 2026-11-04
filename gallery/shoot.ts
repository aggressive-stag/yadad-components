/**
 * Docs screenshot capture (card 34b).
 *
 * Drives a real Chromium through `playwright-core` against a running gallery
 * and takes element screenshots into `docs/assets/screens/`, named per the
 * round plan: `<component>-<state>-<width>-<scheme>.png` (an `-<token>` suffix
 * marks a before/after picture where one theming variable is overridden).
 *
 *   pnpm gallery &                                   # serves :5199
 *   GALLERY_URL=http://localhost:5199/ pnpm docs:shots
 *
 * The manifest below is the contract: every picture the docs embed is one
 * entry, and `docs/assets/screens/README.md` is generated from it — image,
 * gallery anchor, viewport, theme and overrides. Rerunning the script
 * reproduces every image byte-for-byte on the same machine: animations are
 * disabled in the page, fonts are awaited, and `pngquant` (when on PATH or at
 * PNGQUANT) runs with a fixed quality window.
 *
 * Like the checks in gallery/check/, this is not part of `pnpm test` and is
 * not published (package.json `files` ships dist/sets/registry only).
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const OUT_DIR = path.join(root, "docs", "assets", "screens");
const GALLERY_URL = process.env.GALLERY_URL ?? "http://localhost:5199/";

/* ---------------------------------------------------------------------- */
/* The manifest                                                            */
/* ---------------------------------------------------------------------- */

interface Shot {
  /** File name under docs/assets/screens/ (plan §5 naming). */
  file: string;
  /** What the docs' caption says the picture shows (also the screens README). */
  what: string;
  /** Viewport width; the height is fixed at 900 (840 below, for modal shots). */
  width: 1280 | 390;
  /** Theme button to press in the gallery's Controls bar. */
  scheme: "light" | "dark" | "brand";
  /**
   * Element to screenshot: `#<state-id>` for a gallery state box, or a
   * component selector scoped inside that box. `viewport: true` captures the
   * whole viewport instead (a modal dialog covers the page; there is no
   * element to crop).
   */
  selector?: string;
  viewport?: boolean;
  /** Click a control inside the box before the shot (open a dialog, a picker). */
  open?: { kind: "button"; text: string } | { kind: "combobox" };
  /** Grow the state box so an absolutely-positioned popup is not clipped. */
  expand?: boolean;
  /** Lift `.gallery`'s page width cap for this shot (the README hero only). */
  wide?: boolean;
  /** Host CSS applied on top for the "after" picture of a theming variable. */
  css?: string;
}

/** The field-group states every field type paints identically. */
const FIELD_STATES: Array<{ state: string; what: string }> = [
  { state: "filled", what: "input with a value" },
  { state: "empty", what: "input with no value" },
  { state: "invalid", what: "input with a validation error" },
  { state: "display-value", what: "read-only display of a value" },
];

const FIELD_TYPES = ["text", "number", "boolean", "select", "date", "datetime", "time", "tags", "reference"] as const;

/** One before/after picture per component: the variable, the override CSS. */
const AFTER: Record<string, { token: string; what: string; state?: string; css: string; width?: 1280 | 390; openPicker?: boolean }> = {
  text: { token: "radius", what: "--yadad-text-radius raised to a pill", css: '[data-yadad="text"][data-part="input"] { --yadad-text-radius: 999px; }' },
  number: { token: "unit", what: "--yadad-number-unit-size enlarged and recoloured", css: '[data-yadad="number"] { --yadad-number-unit-size: 1.25rem; --yadad-number-unit-color: #b3541e; }' },
  boolean: { token: "size", what: "--yadad-boolean-size enlarged to 2rem", css: "[data-yadad=boolean] { --yadad-boolean-size: 2rem; }" },
  select: { token: "radius", what: "--yadad-select-radius raised to a pill", css: '[data-yadad="select"] select { --yadad-select-radius: 999px; }' },
  date: { token: "radius", what: "--yadad-date-radius raised to a pill", css: '[data-yadad="date"] input { --yadad-date-radius: 999px; }' },
  datetime: { token: "radius", what: "--yadad-datetime-radius raised to a pill", css: '[data-yadad="datetime"] input { --yadad-datetime-radius: 999px; }' },
  time: { token: "radius", what: "--yadad-time-radius raised to a pill", css: '[data-yadad="time"] input { --yadad-time-radius: 999px; }' },
  tags: { token: "chip", what: "--yadad-tags-chip-background and chip radius rebranded", css: "[data-yadad=tags] { --yadad-tags-chip-background: #e7effd; --yadad-tags-chip-radius: 999px; }" },
  reference: { token: "option", what: "--yadad-reference-option-background-active rebranded (picker open)", state: "reference-combobox", openPicker: true, css: "[data-yadad=reference] { --yadad-reference-option-background-active: #dbe7f5; --yadad-reference-listbox-radius: 999px; }" },
  "field-frame": { token: "label", what: "--yadad-field-frame-label-size enlarged", css: "[data-yadad=field-frame] { --yadad-field-frame-label-size: 1.35rem; }" },
  section: { token: "background", what: "--yadad-section-background tinted", css: "[data-yadad=section] { --yadad-section-background: #eef5ec; }" },
  button: { token: "radius", what: "--yadad-button-radius raised to a pill", css: "[data-yadad=button] { --yadad-button-radius: 999px; }" },
  table: { token: "header", what: "--yadad-table-header-background tinted", css: "[data-yadad=table] { --yadad-table-header-background: #dbe7f5; }" },
  "error-summary": { token: "bar", what: "--yadad-error-summary-bar recoloured", css: "[data-yadad=error-summary] { --yadad-error-summary-bar: #b3541e; }" },
  tabs: { token: "indicator", what: "--yadad-tabs-indicator recoloured", css: "[data-yadad=tabs] { --yadad-tabs-indicator: #b3541e; --yadad-tabs-indicator-width: 4px; }" },
  panel: { token: "radius", what: "--yadad-panel-radius squared off", css: "[data-yadad=panel] { --yadad-panel-radius: 0px; }" },
  count: { token: "value", what: "--yadad-count-value-size enlarged", css: "[data-yadad=count] { --yadad-count-value-size: 2.5rem; }" },
  series: { token: "bar", what: "--yadad-series-bar recoloured", css: "[data-yadad=series] { --yadad-series-bar: #b3541e; }" },
  pager: { token: "current", what: "--yadad-pager-current-colour recoloured", css: "[data-yadad=pager] { --yadad-pager-current-color: #b3541e; }" },
  calendar: { token: "selected", what: "--yadad-calendar-selected-background recoloured", css: "[data-yadad=calendar] { --yadad-calendar-selected-background: #b3541e; }" },
  board: { token: "radius", what: "--yadad-board-radius squared off", css: "[data-yadad=board] { --yadad-board-radius: 0px; }" },
  dialog: { token: "radius", what: "--yadad-dialog-radius squared off (static dialog)", css: "[data-yadad=dialog] { --yadad-dialog-radius: 0px; }" },
  composer: { token: "chip", what: "--yadad-composer-chip-radius raised to a pill", css: "[data-yadad=chip-row] { --yadad-composer-chip-radius: 999px; }" },
  check: { token: "size", what: "--yadad-check-size enlarged to 28px", css: "[data-yadad-check] { --yadad-check-size: 28px; }" },
};

function manifest(): Shot[] {
  const shots: Shot[] = [];
  const push = (s: Shot): void => {
    shots.push(s);
  };

  // README hero (plan §4: a hero picture of several components together).
  // `wide` lifts the gallery's 46rem reading column for the shot; the hero is
  // a docs-only block that reads at full document width on the README.
  push({ file: "hero-overview-1280-light.png", what: "the set composed together: fields in a panel, a table with its pager and a board", width: 1280, scheme: "light", selector: "#hero-page", wide: true });
  push({ file: "hero-overview-1280-dark.png", what: "the same composition in the dark theme", width: 1280, scheme: "dark", selector: "#hero-page", wide: true });

  // Field types: the four field-group states each, at 1280 light.
  for (const t of FIELD_TYPES) {
    for (const st of FIELD_STATES) {
      push({ file: `${t}-${st.state}-1280-light.png`, what: `${t}: ${st.what}`, width: 1280, scheme: "light", selector: `#${t}-${st.state}` });
    }
  }
  // The states only one type has.
  push({ file: "text-multiline-1280-light.png", what: "text: multiline textarea", width: 1280, scheme: "light", selector: "#text-multiline" });
  push({ file: "text-diff-1280-light.png", what: "text display: word-level compare marks (added/removed runs)", width: 1280, scheme: "light", selector: "#text-diff-short" });
  push({ file: "select-display-labelled-1280-light.png", what: "select display: option label with its vocabulary dot", width: 1280, scheme: "light", selector: "#select-display-labelled" });
  push({ file: "datetime-display-text-1280-light.png", what: "datetime display: the stored instant, renderer-formatted", width: 1280, scheme: "light", selector: "#datetime-display-text" });
  push({ file: "reference-combobox-open-1280-light.png", what: "reference: combobox open over its options, one picked", width: 1280, scheme: "light", selector: "#reference-combobox", open: { kind: "combobox" }, expand: true });
  push({ file: "reference-display-colour-1280-light.png", what: "reference display: label with its colour-hint dot", width: 1280, scheme: "light", selector: "#reference-display-colour" });
  push({ file: "tags-display-many-1280-light.png", what: "tags display: many chips, wrapped", width: 1280, scheme: "light", selector: "#tags-display-many" });

  // Layout + widgets.
  push({ file: "field-frame-clean-1280-light.png", what: "field-frame: label and required marker around a clean input", width: 1280, scheme: "light", selector: "#field-frame-clean" });
  push({ file: "field-frame-errors-1280-light.png", what: "field-frame: label, required marker and errors around an input", width: 1280, scheme: "light", selector: "#field-frame-errors" });
  push({ file: "section-titled-1280-light.png", what: "section: titled group of content", width: 1280, scheme: "light", selector: "#section-titled" });
  push({ file: "section-untitled-1280-light.png", what: "section: without a title", width: 1280, scheme: "light", selector: "#section-untitled" });
  for (const v of ["primary-enabled", "primary-disabled", "primary-danger", "secondary-enabled", "secondary-disabled"]) {
    push({ file: `button-${v}-1280-light.png`, what: `button: ${v.replace("-", ", ")}`, width: 1280, scheme: "light", selector: `#button-${v}` });
  }
  for (const v of ["few-rows", "empty", "loading", "many-rows-long-text", "sort-desc", "actions-several"]) {
    push({ file: `table-${v}-1280-light.png`, what: `table: ${v.replace(/-/g, " ")}`, width: 1280, scheme: "light", selector: `#table-${v}` });
  }
  push({ file: "table-few-rows-390-light.png", what: "table at phone width: rows stack into cards with a label on every cell", width: 390, scheme: "light", selector: "#table-few-rows" });
  push({ file: "table-few-rows-1280-dark.png", what: "table in the dark theme", width: 1280, scheme: "dark", selector: "#table-few-rows" });
  push({ file: "error-summary-many-1280-light.png", what: "error-summary: several errors with hints", width: 1280, scheme: "light", selector: "#error-summary-many" });
  push({ file: "error-summary-one-1280-light.png", what: "error-summary: one error", width: 1280, scheme: "light", selector: "#error-summary-one" });
  push({ file: "tabs-two-1280-light.png", what: "tabs: two tabs, the selected one underlined", width: 1280, scheme: "light", selector: "#tabs-two" });
  push({ file: "tabs-many-1280-light.png", what: "tabs: many tabs in a scrolling list", width: 1280, scheme: "light", selector: "#tabs-many" });
  push({ file: "tabs-two-1280-dark.png", what: "tabs in the dark theme", width: 1280, scheme: "dark", selector: "#tabs-two" });
  push({ file: "panel-titled-1280-light.png", what: "panel: titled", width: 1280, scheme: "light", selector: "#panel-titled" });
  push({ file: "panel-untitled-1280-light.png", what: "panel: without a title", width: 1280, scheme: "light", selector: "#panel-untitled" });
  for (const v of ["small", "large", "loading"]) {
    push({ file: `count-${v}-1280-light.png`, what: `count: ${v}`, width: 1280, scheme: "light", selector: `#count-${v}` });
  }
  push({ file: "series-table-1280-light.png", what: "series: the accessible table display, twelve weekly groups", width: 1280, scheme: "light", selector: "#series-table" });
  push({ file: "series-bar-1280-light.png", what: "series: bar chart, a gap bucket drawn as a dash", width: 1280, scheme: "light", selector: "#series-bar" });
  push({ file: "series-line-1280-light.png", what: "series: line chart over twenty-six weeks, broken at gaps", width: 1280, scheme: "light", selector: "#series-line" });
  push({ file: "series-bar-phone-1280-light.png", what: "series bar chart inside a 320px phone frame (the crop is the frame, not the viewport)", width: 1280, scheme: "light", selector: "#series-bar-phone" });
  for (const v of ["middle", "first", "last"]) {
    push({ file: `pager-${v}-1280-light.png`, what: `pager: ${v === "middle" ? "middle page" : v + " page"}`, width: 1280, scheme: "light", selector: `#pager-${v}` });
  }

  // Calendar.
  push({ file: "calendar-month-1280-light.png", what: "calendar: month grid with entries and the agenda below", width: 1280, scheme: "light", selector: "#calendar-month-busy" });
  push({ file: "calendar-month-empty-1280-light.png", what: "calendar: an empty month", width: 1280, scheme: "light", selector: "#calendar-month-empty" });
  push({ file: "calendar-week-1280-light.png", what: "calendar: week mode", width: 1280, scheme: "light", selector: "#calendar-week" });
  push({ file: "calendar-3day-1280-light.png", what: "calendar: 3-day mode", width: 1280, scheme: "light", selector: "#calendar-3day" });
  push({ file: "calendar-agenda-390-light.png", what: "calendar on a phone: the agenda list under the month", width: 390, scheme: "light", selector: "#calendar-phone-agenda" });
  push({ file: "calendar-3day-390-light.png", what: "calendar on a phone: 3-day mode at 390px", width: 390, scheme: "light", selector: "#calendar-phone-3day" });
  push({ file: "calendar-month-1280-dark.png", what: "calendar month in the dark theme", width: 1280, scheme: "dark", selector: "#calendar-month-busy" });

  // Board.
  push({ file: "board-columns-1280-light.png", what: "board: four status columns of cards with the group-by picker", width: 1280, scheme: "light", selector: "#board-columns" });
  push({ file: "board-empty-column-1280-light.png", what: "board: an empty column", width: 1280, scheme: "light", selector: "#board-empty-column" });
  push({ file: "board-many-cards-1280-light.png", what: "board: many cards, each column scrolls on its own", width: 1280, scheme: "light", selector: "#board-many-cards" });
  push({ file: "board-columns-390-light.png", what: "board on a phone: one column at a time", width: 390, scheme: "light", selector: "#board-columns" });
  push({ file: "board-columns-1280-dark.png", what: "board in the dark theme", width: 1280, scheme: "dark", selector: "#board-columns" });

  // Dialog (the modal ones are viewport shots; the dialog covers the page).
  push({ file: "dialog-static-1280-light.png", what: "dialog rendered static (modal=false): header, body, Cancel and Confirm", width: 1280, scheme: "light", selector: "#dialog-static" });
  push({ file: "dialog-open-1280-light.png", what: "modal dialog over the page: scrim, focus in the dialog, background inert", width: 1280, scheme: "light", viewport: true, open: { kind: "button", text: "Open dialog" }, selector: "#dialog-open" });
  push({ file: "dialog-open-390-light.png", what: "modal dialog at phone width", width: 390, scheme: "light", viewport: true, open: { kind: "button", text: "Open dialog" }, selector: "#dialog-open" });
  push({ file: "dialog-static-1280-dark.png", what: "static dialog in the dark theme", width: 1280, scheme: "dark", selector: "#dialog-static" });

  // Composer chrome + the Check primitive.
  push({ file: "composer-chips-row-1280-light.png", what: "composer: the saved-filter chip row, one chip pressed", width: 1280, scheme: "light", selector: "#chips-row" });
  push({ file: "composer-batch-1280-light.png", what: "composer: batch repeat rows on a hairline with the + another controls", width: 1280, scheme: "light", selector: "#batch-composer" });
  push({ file: "composer-checklist-1280-light.png", what: "composer: sub-record checklist — a ticked row strikes through, a pending row does not", width: 1280, scheme: "light", selector: "#checklist-rows" });
  push({ file: "check-primitive-1280-light.png", what: "the internal Check primitive: square and circle, checked and locked", width: 1280, scheme: "light", selector: "#check-primitive" });

  // THEMING.md: the same section under two token sets (light theme vs the
  // gallery's brand override) — so the effect of the tokens is visible.
  push({ file: "theming-board-columns-1280-light.png", what: "board under the light theme tokens", width: 1280, scheme: "light", selector: "#board-columns" });
  push({ file: "theming-board-columns-1280-brand.png", what: "the same board under the gallery's brand token set", width: 1280, scheme: "brand", selector: "#board-columns" });

  // One before/after picture per component: the "before" is the default
  // picture above it; the "after" overrides one visible variable.
  for (const [comp, a] of Object.entries(AFTER)) {
    const width = a.width ?? 1280;
    const raw = a.state ?? defaultStateFor(comp);
    // State ids already carry the component prefix ("board-columns"); do not
    // double it in the file name (the selector still uses the full id).
    const short = raw.startsWith(`${comp}-`) ? raw.slice(comp.length + 1) : raw;
    push({
      file: `${comp}-${short}-${width}-light-after-${a.token}.png`,
      what: `${comp}: after — ${a.what}`,
      width,
      scheme: "light",
      selector: `#${raw}`,
      css: a.css,
      ...(a.openPicker === true ? { open: { kind: "combobox" as const }, expand: true } : {}),
    });
  }
  return shots;
}

function defaultStateFor(comp: string): string {
  switch (comp) {
    case "field-frame": return "field-frame-clean";
    case "section": return "section-titled";
    case "button": return "button-primary-enabled";
    case "table": return "table-few-rows";
    case "error-summary": return "error-summary-many";
    case "tabs": return "tabs-two";
    case "panel": return "panel-titled";
    case "count": return "count-large";
    case "series": return "series-bar";
    case "pager": return "pager-middle";
    case "calendar": return "calendar-month-busy";
    case "board": return "board-columns";
    case "dialog": return "dialog-static";
    case "composer": return "chips-row";
    case "check": return "check-primitive";
    default: return `${comp}-filled`; // field types
  }
}

/* ---------------------------------------------------------------------- */
/* Capture                                                                 */
/* ---------------------------------------------------------------------- */

/** Keep the page still: no shimmer/pulse, so reruns land on the same pixels. */
const FREEZE_CSS = "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }";

/** Grow a state box so an absolutely-positioned popup stays inside the crop. */
async function expandForPopups(page: Page, stateId: string): Promise<void> {
  await page.evaluate((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const box = el.getBoundingClientRect();
    let bottom = box.bottom;
    let right = box.right;
    for (const node of Array.from(el.querySelectorAll("*"))) {
      const cs = getComputedStyle(node);
      if (cs.position === "absolute" || cs.position === "fixed") {
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          bottom = Math.max(bottom, r.bottom);
          right = Math.max(right, r.right);
        }
      }
    }
    el.style.paddingBottom = `${Math.max(0, Math.ceil(bottom - box.bottom) + 12)}px`;
    el.style.paddingRight = `${Math.max(0, Math.ceil(right - box.right) + 12)}px`;
  }, stateId);
}

function pngquant(file: string): void {
  const bin = process.env.PNGQUANT ?? "pngquant";
  const r = spawnSync(bin, ["--quality=70-90", "--speed", "1", "--ext", ".png", "--force", "--skip-if-larger", file], { stdio: "ignore" });
  if (r.error && (r.error as NodeJS.ErrnoException).code !== "ENOENT") throw r.error;
  // ENOENT is fine: the plan says Playwright's PNG as is when pngquant is absent.
}

const shots = manifest();
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
let failures = 0;
try {
  for (const shot of shots) {
    const ctx = await browser.newContext({ viewport: { width: shot.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await ctx.addInitScript((css: string) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.documentElement.appendChild(style);
    }, FREEZE_CSS);
    const page = await ctx.newPage();
    await page.goto(GALLERY_URL, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    // Theme, exactly as a visitor switches it.
    await page.locator(".controls button", { hasText: new RegExp(`^${shot.scheme}$`) }).first().click();
    if (shot.css !== undefined) await page.addStyleTag({ content: shot.css });
    if (shot.wide !== undefined) await page.addStyleTag({ content: ".gallery { max-inline-size: none !important; }" });

    if (shot.selector !== undefined && !shot.viewport) {
      const box = page.locator(shot.selector);
      await box.scrollIntoViewIfNeeded();
      if (shot.open !== undefined) {
        if (shot.open.kind === "combobox") await box.locator("[role=combobox]").first().click();
        else await box.getByRole("button", { name: shot.open.text }).first().click();
        await page.waitForTimeout(150);
      }
      if (shot.expand !== undefined && shot.selector.startsWith("#")) await expandForPopups(page, shot.selector.slice(1));
      await box.screenshot({ path: path.join(OUT_DIR, shot.file) });
    } else if (shot.viewport !== undefined && shot.open !== undefined && shot.open.kind === "button") {
      const box = page.locator(shot.selector ?? "");
      await box.scrollIntoViewIfNeeded();
      // The gallery also renders the static (modal=false) dialog demo, which
      // paints over the page and would intercept the opener click; hide it.
      await page.addStyleTag({ content: 'dialog[data-modal="static"] { visibility: hidden !important; }' });
      await box.getByRole("button", { name: shot.open.text }).first().click();
      await page.waitForSelector('dialog[data-modal="true"], dialog[data-modal="fallback"]', { state: "visible" });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
      // Reset the page state for any later reuse of this context: close it.
      await page.keyboard.press("Escape");
    } else {
      console.error(`FAIL ${shot.file}: no capture mode matched`);
      failures += 1;
      await ctx.close();
      continue;
    }
    const out = path.join(OUT_DIR, shot.file);
    if (!existsSync(out)) {
      console.error(`FAIL ${shot.file}: not written`);
      failures += 1;
    } else {
      pngquant(out);
      console.log(`ok  ${shot.file}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

/* ---------------------------------------------------------------------- */
/* docs/assets/screens/README.md, generated from the manifest              */
/* ---------------------------------------------------------------------- */

const rows = shots
  .map((s) => `| \`${s.file}\` | ${s.what} | \`${s.selector ?? "viewport"}\` | ${s.width}×900 | ${s.scheme}${s.css !== undefined ? " + host CSS override" : ""} |`)
  .join("\n");
writeFileSync(
  path.join(OUT_DIR, "README.md"),
  `# Screenshots

Every picture in the docs lives here. They are **generated** — do not hand-edit
or add images by other means. Regenerate all of them from the repo root:

\`\`\`bash
pnpm gallery &   # vite on :5199 (any port: set GALLERY_URL to match)
GALLERY_URL=http://localhost:5199/ pnpm docs:shots
\`\`\`

\`gallery/shoot.ts\` holds the manifest below; each row is one file, captured at
device scale factor 1 from the running gallery with the state id, viewport and
theme listed. Names follow \`<component>-<state>-<width>-<scheme>.png\`; an
\`-after-<token>\` suffix marks a before/after picture where one theming variable
is overridden by host CSS. Compressed with \`pngquant\` when installed. The data
on screen is the gallery's fictional fixtures (\`gallery/src/fixtures.ts\`).

| image | shows | gallery anchor | viewport | theme |
| --- | --- | --- | --- | --- |
${rows}
`,
);

if (failures > 0) {
  console.error(`${failures} shot(s) failed`);
  process.exit(1);
}
console.log(`${shots.length} images written to docs/assets/screens`);
