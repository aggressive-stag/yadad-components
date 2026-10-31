/**
 * Shared touch variables (card 30a) against the gallery.
 *
 * At 390x844 with touch:
 *   1. Baseline: every text-entry control computes its coarse-pointer font
 *      size from the shared fallback chain (16px at the default tokens).
 *   2. Setting the ONE shared variable `--yadad-touch-font-size: 18px` on the
 *      root moves every text-entry control to 18px — text, number, date,
 *      datetime, time, select and tags — without touching any per-component
 *      variable.
 *   3. A per-component variable still overrides the shared one: with the
 *      shared variable at 18px, `--yadad-text-touch-font-size: 20px` moves
 *      only the text input.
 *   4. The shared tap variable works the same way: `--yadad-touch-tap: 52px`
 *      raises the input height floor above 44px.
 * At 1280 (desktop, fine pointer) the same shared variable is inert for the
 * coarse-pointer rules: the text input keeps the desktop font size.
 *
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/shared-touch-vars.ts
 *
 * Exits non-zero on failure. PLAYWRIGHT_EXECUTABLE_PATH points at a different Chromium.
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL || "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail: string): void => {
  results.push({ name, ok, detail });
};

// Every text-entry control whose coarse-pointer font/tap size runs through a
// per-component touch variable (28a/29a); card 30a chained each default
// through the two shared variables.
const ENTRIES: Array<[string, string]> = [
  ["text", "#text-filled input"],
  ["number", "#number-filled input"],
  ["date", "#date-filled input"],
  ["datetime", "#datetime-filled input"],
  ["time", "#time-filled input"],
  ["select", "#select-filled select"],
  ["tags", "#tags-filled input"],
];

const measureFonts = (sels: Record<string, string>) =>
  // Runs in the page: computed font sizes and input heights, rounded to .5px.
  ((selectors: Record<string, string>) => {
    const out: Record<string, { font: number | null; h: number | null }> = {};
    for (const [k, s] of Object.entries(selectors)) {
      const el = document.querySelector(s);
      if (!el) { out[k] = { font: null, h: null }; continue; }
      const cs = getComputedStyle(el);
      out[k] = {
        font: Math.round(parseFloat(cs.fontSize) * 2) / 2,
        h: Math.round(el.getBoundingClientRect().height * 2) / 2,
      };
    }
    return out;
  })(sels);

const selMap: Record<string, string> = Object.fromEntries(ENTRIES);

const browser = await chromium.launch(launch);

// --- phone (390x844, touch) --------------------------------------------------
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  check("pointer: coarse matches", await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "");

  // 1. baseline
  const base = await page.evaluate(measureFonts, selMap);
  for (const [name, m] of Object.entries(base)) {
    check(`baseline ${name} renders`, m.font !== null && m.h !== null, JSON.stringify(m));
    check(`baseline ${name} font >=16px`, m.font !== null && m.font >= 16, `${m.font}px`);
    check(`baseline ${name} height >=44px`, m.h !== null && m.h >= 44, `${m.h}px`);
  }

  // 2. one shared font variable moves every control
  await page.evaluate(() => document.documentElement.style.setProperty("--yadad-touch-font-size", "18px"));
  const shared = await page.evaluate(measureFonts, selMap);
  for (const [name, m] of Object.entries(shared)) {
    check(`shared --yadad-touch-font-size:18px -> ${name} is 18px`, m.font === 18, `${m.font}px`);
  }

  // 3. the per-component variable still wins
  await page.evaluate(() =>
    document.getElementById("text-filled")!.querySelector("input")!.style.setProperty("--yadad-text-touch-font-size", "20px"));
  const override = await page.evaluate(measureFonts, { text: "#text-filled input", number: "#number-filled input" });
  check("per-component override wins over the shared variable (text 20px)",
    override.text?.font === 20, JSON.stringify(override.text));
  check("the override touches only its component (number stays 18px)",
    override.number?.font === 18, JSON.stringify(override.number));

  // 4. the shared tap variable raises the height floor
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--yadad-touch-tap", "52px");
    const el = document.getElementById("text-filled")!.querySelector("input")!;
    el.style.removeProperty("--yadad-text-touch-font-size");
  });
  const tapped = await page.evaluate(measureFonts, selMap);
  for (const [name, m] of Object.entries(tapped)) {
    check(`shared --yadad-touch-tap:52px -> ${name} height >=52px`, m.h !== null && m.h >= 52, `${m.h}px`);
  }
  await ctx.close();
}

// --- desktop (1280, fine pointer) --------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const base = await page.evaluate(measureFonts, { text: "#text-filled input" });
  await page.evaluate(() => document.documentElement.style.setProperty("--yadad-touch-font-size", "18px"));
  const after = await page.evaluate(measureFonts, { text: "#text-filled input" });
  check("desktop text input keeps its computed font size with the shared variable set",
    base.text?.font === after.text?.font, `base ${base.text?.font}px vs set ${after.text?.font}px`);
  await ctx.close();
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) { failed++; console.log(`FAIL ${r.name}  ${r.detail}`); }
}
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
