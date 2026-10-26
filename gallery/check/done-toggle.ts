/**
 * Real-browser check for the completion checkbox (RFC 0008 item 3) on the
 * board and the calendar, at desktop width and at 390x844 with touch.
 *
 * For each of #board-done and #calendar-done: a labelled native checkbox is
 * on every card/entry; it is at least 44x44 in its label; clicking it checks
 * it and does not open the card/entry; a locked (disabled) one cannot be
 * checked; Space on the focused box toggles it; no sideways page scroll.
 * The calendar is also checked in the agenda reflow (390px).
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/done-toggle.ts
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
  for (const vp of [
    { id: "desktop", width: 1280, height: 900, hasTouch: false },
    { id: "390", width: 390, height: 844, hasTouch: true },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.hasTouch });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    for (const [state, item] of [
      ["board-done", '[data-part="card"]'],
      ["calendar-done", '[data-part="entry"]'],
    ] as const) {
      const root = page.locator(`#${state}`);
      const boxes = root.locator('[data-part="done-input"]');
      const n = await boxes.count();
      check(`[${vp.id}] ${state}: a checkbox on every ${item}`, n > 0 && n === (await root.locator(item).count()), `${n} boxes`);
      const named = await boxes.evaluateAll((els) => els.every((e) => /^Done: .+/.test(e.getAttribute("aria-label") ?? "")));
      check(`[${vp.id}] ${state}: each is named "Done: <label>"`, named);
      const enabled = root.locator('[data-part="done-input"]:not(:disabled)').first();
      await enabled.scrollIntoViewIfNeeded();
      const size = await enabled.evaluate((e) => {
        const r = (e.closest("label") as HTMLElement).getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
      check(`[${vp.id}] ${state}: tap target >= 44x44`, size.w >= 43.5 && size.h >= 43.5, `${size.w}x${size.h}`);
      await enabled.click();
      check(`[${vp.id}] ${state}: click checks it`, await enabled.isChecked());
      const opened = await page.locator(".note", { hasText: "Opened entry" }).count();
      check(`[${vp.id}] ${state}: click does not open the entry`, opened === 0);
      await enabled.focus();
      await page.keyboard.press("Space");
      check(`[${vp.id}] ${state}: Space unchecks it`, !(await enabled.isChecked()));
      const locked = root.locator('[data-part="done-input"]:disabled').first();
      if ((await locked.count()) > 0) {
        await locked.scrollIntoViewIfNeeded();
        await locked.click({ force: true });
        check(`[${vp.id}] ${state}: a locked one stays unchecked`, !(await locked.isChecked()));
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`[${vp.id}] no sideways page scroll`, overflow <= 0, `overflow ${overflow}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
