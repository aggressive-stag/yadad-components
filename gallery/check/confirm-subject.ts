/**
 * Real-browser check for RFC 0011 surfaces: the confirm dialog's subject line
 * and the select used as a reference quick filter. Desktop and 390x844 touch,
 * light and dark.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/confirm-subject.ts
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
    for (const theme of ["light", "dark"]) {
      const run = `[${vp.id} ${theme}]`;
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.hasTouch });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.locator(".controls button", { hasText: theme }).first().click({ force: true });

      const demo = page.locator("#dialog-confirm-subject");
      await demo.scrollIntoViewIfNeeded();
      await demo.getByRole("button", { name: "Open confirmation" }).click();
      const subject = page.locator("dialog [data-yadad-confirm-subject]");
      check(`${run} subject line renders in the dialog`, (await subject.count()) === 1);
      const m = await subject.evaluate((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const d = el.closest("dialog")!.getBoundingClientRect();
        return { weight: Number(cs.fontWeight), color: cs.color, overflowWrap: cs.overflowWrap, left: r.left, right: r.right, dl: d.left, dr: d.right, scrollW: el.scrollWidth, clientW: el.clientWidth };
      });
      check(`${run} emphasised`, m.weight >= 600, `weight ${m.weight}`);
      check(`${run} wraps within the dialog`, m.overflowWrap === "anywhere" && m.left >= m.dl - 0.5 && m.right <= m.dr + 0.5 && m.scrollW <= m.clientW + 1, `${m.left}-${m.right} in ${m.dl}-${m.dr}`);
      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      check(`${run} no sideways page scroll`, !pageOverflow);
      await page.screenshot({ path: `${process.env.SHOTS ?? "."}/subject-${vp.id}-${theme}.png` });
      await page.keyboard.press("Escape");

      const sel = page.locator("#select-quick-filter select");
      await sel.scrollIntoViewIfNeeded();
      const labels = await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.textContent));
      check(`${run} quick filter shows reference labels`, labels.includes("Squat") && labels.includes("Bench press"), labels.join("|").slice(0, 60));
      const box = await sel.boundingBox();
      check(`${run} quick filter inside viewport`, box !== null && box.x >= 0 && box.x + box.width <= vp.width + 0.5);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
