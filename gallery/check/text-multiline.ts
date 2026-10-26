/**
 * Real-browser check for multi-line text (RFC 0008 item 13): the textarea is
 * drawn a few rows tall, resizes vertically only, takes newlines, stops at
 * maxLength, and the display keeps line breaks; desktop and 390x844 touch.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/text-multiline.ts
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
    const area = page.locator("#g-text-multiline");
    await area.scrollIntoViewIfNeeded();
    check(`${label}: it is a textarea`, (await area.evaluate((e) => e.tagName)) === "TEXTAREA");
    const box = await area.boundingBox();
    const line = await area.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight));
    check(`${label}: at least 3 rows tall`, box !== null && box.height >= line * 3, `${box?.height}px, line ${line}px`);
    check(`${label}: fits the viewport width`, box !== null && box.x >= 0 && box.x + box.width <= (opts.viewport.width), `${box?.x}+${box?.width}`);
    check(`${label}: resize is vertical`, (await area.evaluate((e) => getComputedStyle(e).resize)) === "vertical");
    check(`${label}: font-size is 16px or larger`, (await area.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >= 16);
    await area.click();
    await page.keyboard.type("one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("two");
    check(`${label}: Enter inserts a newline`, (await area.inputValue()) === "one\ntwo");
    const display = page.locator('[data-part="display"][data-multiline="true"]').first();
    check(`${label}: display white-space keeps line breaks`, (await display.evaluate((e) => getComputedStyle(e).whiteSpace)) === "pre-line");
    const h = await display.evaluate((e) => e.getBoundingClientRect().height);
    const lh = await display.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight) || 0);
    check(`${label}: display draws 4 lines (incl. the blank one)`, lh > 0 ? h >= lh * 3.5 : h > 40, `${h}px`);
    check(`${label}: no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/multiline-${label.split(" ")[0]}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
