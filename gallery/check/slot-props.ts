/**
 * Real-browser check for the slot-prop audit fixes: the calendar's per-day
 * cutoff (RFC 0008 item 7), the reference colorFrom dot and the board column
 * colour dot (items 8 and 5), and the count/series labels as headings (item
 * 12), at desktop and 390x844 with touch. Each dot must be visible (non-zero
 * size, painted), and a heading must keep the look of the label it replaced.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/slot-props.ts
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};
const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " - " + extra : ""}`);
};

const browser = await chromium.launch(launch);
try {
  for (const [label, opts] of [
    ["desktop", { viewport: { width: 1280, height: 900 } }],
    ["390px touch", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ] as const) {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Calendar: the default cutoff of 3 hides 2 of the 5-entry day; a cutoff of 4 hides 1.
    const entriesOnBusyDay = async (id: string): Promise<{ shown: number; button: string | null }> =>
      page.locator(`#${id}`).evaluate((root) => {
        const day = [...root.querySelectorAll('[data-part="day"]')].find((d) => d.querySelector('[data-part="overflow"]'));
        return { shown: day?.querySelectorAll('[data-part="entry"]').length ?? -1, button: day?.querySelector('[data-part="overflow"]')?.textContent ?? null };
      });
    const dflt = await entriesOnBusyDay("calendar-month-busy");
    check(`${label}: calendar cutoff 3 shows 3 and "+2 more"`, dflt.shown === 3 && dflt.button === "+2 more", JSON.stringify(dflt));
    const cap4 = await entriesOnBusyDay("calendar-month-cap-4");
    check(`${label}: calendar cutoff 4 shows 4 and "+1 more"`, cap4.shown === 4 && cap4.button === "+1 more", JSON.stringify(cap4));

    const dot = async (sel: string): Promise<{ w: number; h: number; bg: string }[]> =>
      page.locator(sel).evaluateAll((els) => els.map((e) => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, bg: getComputedStyle(e).backgroundColor })));
    const painted = (d: { w: number; h: number; bg: string }[]): boolean => d.every((x) => x.w >= 6 && x.h >= 6 && x.bg !== "rgba(0, 0, 0, 0)");

    const ref = await dot('#reference-display-colour [data-part="swatch"]');
    check(`${label}: reference colorFrom dot is drawn`, ref.length === 1 && painted(ref), JSON.stringify(ref));
    check(`${label}: no dot for a colour outside the vocabulary`, (await page.locator('#reference-display-colour-outside [data-part="swatch"]').count()) === 0);

    const board = await dot('#board-column-colours [data-part="swatch"]');
    check(`${label}: board shows 3 column dots (4th colour is off-vocabulary)`, board.length === 3 && painted(board), JSON.stringify(board));
    check(`${label}: board dots differ by colour`, new Set(board.map((b) => b.bg)).size === 3);

    const heads = await page.locator('#count-small [data-part="label"], #count-large [data-part="label"]').evaluateAll((els) => els.map((e) => ({ tag: e.tagName, margin: getComputedStyle(e).margin, weight: getComputedStyle(e).fontWeight, size: getComputedStyle(e).fontSize })));
    check(`${label}: count labels are h2 with no margin, normal weight, small size`, heads.length === 2 && heads.every((h) => h.tag === "H2" && h.margin === "0px" && h.weight === "400" && parseFloat(h.size) < 16), JSON.stringify(heads[0]));
    const series = await page.locator('[data-yadad="series"] [data-part="label"]').evaluateAll((els) => els.map((e) => ({ tag: e.tagName, mt: getComputedStyle(e).marginTop })));
    check(`${label}: series labels are h2 with no top margin`, series.length > 0 && series.every((s) => s.tag === "H2" && s.mt === "0px"), `${series.length} widgets`);
    check(`${label}: no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    if (process.env.SHOT_DIR) {
      for (const id of ["calendar-month-cap-4", "reference-display-colour", "board-column-colours", "count-small"]) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await page.locator(`#${id}`).screenshot({ path: `${process.env.SHOT_DIR}/${id}-${label.split(" ")[0]}.png` });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
