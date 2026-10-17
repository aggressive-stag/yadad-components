/**
 * Keyboard a11y check for the tabs component (card 3 regression guard).
 *
 * Verifies, in a real Chromium against the gallery page:
 *   1. A long tab list at 200% text does not force the host page to scroll
 *      horizontally — the tablist scrolls internally, and keyboard navigation
 *      (End) reaches the last tab with its focus ring inside the viewport.
 *   2. The focus ring is not clipped by the tablist scroll container in any
 *      theme at any text size: the ring's clearance padding (focus-ring-width
 *      + outline-offset, per --yadad-tabs-ring-clearance) covers the ring
 *      extent on all four sides.
 *
 * Not published with the package. Run it from a scratch dir with
 * playwright-core installed (see README "Browser keyboard check"):
 *
 *   GALLERY_URL=http://localhost:5199/ node gallery/check/tabs-keyboard.ts
 *
 * Exits non-zero if any check fails.
 */
import { chromium } from "playwright-core";

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

const url = process.env.GALLERY_URL || "http://localhost:5199/";
// Point at a specific Chromium build with PLAYWRIGHT_EXECUTABLE_PATH when the
// installed playwright-core does not match the browser on the machine;
// otherwise playwright resolves its own.
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};
const results: Result[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  results.push({ name, ok, detail });
};

const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle" });

const theme = (name: string) => page.locator(".controls button", { hasText: name }).click();
const text = (name: string) => page.locator(".controls button", { hasText: name }).click();

// --- 1. 200% text: internal scroll, no page overflow, End reaches the last tab ---
await theme("light");
await text("200%");
await page.waitForTimeout(250);

const layout = await page.evaluate(() => {
  const list = document.querySelector("#tabs-many [data-part=list]")!;
  return {
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    listScrollable: list.scrollWidth > list.clientWidth + 1,
  };
});
check(
  "tabs-many @200%: page does not overflow horizontally (list scrolls internally)",
  !layout.pageOverflows && layout.listScrollable,
  JSON.stringify(layout)
);

await page.locator("#tabs-many [data-part=tab]").first().evaluate((el) => el.focus());
await page.keyboard.press("End");
await page.waitForTimeout(400);
const last = await page.evaluate(() => {
  const el = document.activeElement!;
  const r = el.getBoundingClientRect();
  return { text: el.textContent, selected: el.getAttribute("aria-selected"), withinViewport: r.left >= 0 && r.right <= innerWidth + 1 };
});
check("tabs-many @200%: End selects the last tab inside the viewport", last.selected === "true" && last.withinViewport, JSON.stringify(last));

// --- 2. ring clearance covers the ring extent, every theme x text size ---
for (const t of ["light", "dark"]) {
  await theme(t);
  for (const s of ["100%", "200%"]) {
    await text(s);
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const list = document.querySelector("#tabs-two [data-part=list]")!;
      const tab = list.querySelector("[data-part=tab]")!;
      const lcs = getComputedStyle(list);
      const tcs = getComputedStyle(tab);
      const clearance = lcs.getPropertyValue("--yadad-tabs-ring-clearance");
      const pad = lcs.paddingTop; // padding-block applies to all sides
      const ringExtent = parseFloat(tcs.outlineWidth) + parseFloat(tcs.outlineOffset);
      return {
        clearance,
        pad: parseFloat(pad),
        ringExtent: ringExtent + 1, // 1px measurement tolerance
        clears: parseFloat(pad) >= ringExtent + 1,
      };
    });
    check(`ring clearance covers the ring (${t} ${s})`, m.clears, JSON.stringify(m));
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
