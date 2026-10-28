/**
 * Board "Move to…" panel and coarse-pointer input sizes (card 28a guard).
 *
 * At 390x844 with touch, against the gallery:
 *   1. The "Move to…" panel of a card with a very long unbroken title stays
 *      inside its column (no sideways overflow of the panel or the page),
 *      the title wraps, and Cancel can be reached and tapped.
 *   2. Under `pointer: coarse`, the board's move select and the text, number,
 *      date and select inputs render at 16px or larger and at least 44px tall.
 *
 *   GALLERY_URL=http://localhost:5199/ node gallery/check/move-panel-touch.ts
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

const browser = await chromium.launch(launch);
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });

check("pointer: coarse matches", await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "");

// 1. long-title move panel
const root = page.locator("#board-move-long-title");
await root.scrollIntoViewIfNeeded();
await root.locator("[data-part=move-trigger]").first().tap();
const panel = root.locator("[data-part=move-panel]").first();
await panel.waitFor({ state: "visible" });
const m = await page.evaluate(() => {
  const r = document.querySelector("#board-move-long-title")!;
  const p = r.querySelector("[data-part=move-panel]") as HTMLElement;
  const col = p.closest("[data-part=column]") as HTMLElement;
  const pr = p.getBoundingClientRect();
  const cr = col.getBoundingClientRect();
  const d = document.documentElement;
  const sel = p.querySelector("[data-part=move-select]") as HTMLElement;
  const sr = sel.getBoundingClientRect();
  const cs = getComputedStyle(sel);
  return {
    panelInsideColumn: pr.left >= cr.left - 1 && pr.right <= cr.right + 1,
    panelNoHScroll: p.scrollWidth <= p.clientWidth + 1,
    pageNoHScroll: d.scrollWidth <= d.clientWidth + 1,
    selectInsidePanel: sr.right <= pr.right + 1,
    selFont: parseFloat(cs.fontSize),
    selHeight: sr.height,
    panelW: Math.round(pr.width),
    colW: Math.round(cr.width),
  };
});
check("panel inside its column", m.panelInsideColumn, `panel ${m.panelW}px, column ${m.colW}px`);
check("panel has no sideways scroll", m.panelNoHScroll, "");
check("page has no sideways scroll", m.pageNoHScroll, "");
check("move select inside panel", m.selectInsidePanel, "");
check("move select font >=16px", m.selFont >= 16, `${m.selFont}px`);
check("move select >=44px tall", m.selHeight >= 44, `${Math.round(m.selHeight)}px`);
const cancel = panel.locator("[data-part=move-cancel]");
await cancel.scrollIntoViewIfNeeded();
const inView = await cancel.evaluate((el) => {
  const b = el.getBoundingClientRect();
  const p = el.closest("[data-part=move-panel]")!.getBoundingClientRect();
  return b.bottom <= p.bottom + 1 && b.top >= p.top - 1 && b.right <= window.innerWidth;
});
check("Cancel is inside the panel and the viewport", inView, "");
await cancel.tap({ timeout: 3000 });
check("tapping Cancel closes the panel", (await root.locator("[data-part=move-panel]").count()) === 0, "");

// 2. coarse-pointer input sizes
for (const [name, sel] of [
  ["text", "#text-filled input"],
  ["number", "#number-filled input"],
  ["date", "#date-filled input"],
  ["select", "#select-filled select"],
] as const) {
  const loc = page.locator(sel).first();
  if ((await loc.count()) === 0) { check(`${name} present`, false, "missing"); continue; }
  const v = await loc.evaluate((el) => ({ f: parseFloat(getComputedStyle(el).fontSize), h: el.getBoundingClientRect().height }));
  check(`${name} font >=16px`, v.f >= 16, `${v.f}px`);
  check(`${name} >=44px tall`, v.h >= 44, `${Math.round(v.h)}px`);
}

await page.screenshot({ path: process.env.SHOT || "/tmp/claude-1000/pw/move-panel.png" });
await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
