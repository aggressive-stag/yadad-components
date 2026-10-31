/**
 * Card 31b (plan M01): the internal Check primitive, measured in Chromium.
 *
 * 1. Drawn size: the calendar's done box draws at >=22x22 px (the SPA look)
 *    while its label stays the >=44x44 hit target at 390 touch (31a's audit
 *    covers the label; this pins the box the primitive now paints).
 * 2. The tick is painted only when checked: background-size is 0 0 unchecked
 *    and non-zero checked (the shrink-in recipe; never a display:none pop).
 * 3. Theming contract: --yadad-check-radius: 50% rounds the box (the circle
 *    story); --yadad-check-on changes the checked fill; the deprecated
 *    --yadad-calendar-checkbox-size still sizes the calendar's box (alias,
 *    one minor), and --yadad-check-size wins over it when both are set.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/check-phone.ts
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
  // --- 1+2: the calendar done box at 390 touch ------------------------------
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const box = page.locator("#calendar-done [data-part=\"done-input\"]").first();
  await box.scrollIntoViewIfNeeded();
  const drawn = await box.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      w: r.width, h: r.height,
      appearance: s.appearance,
      bgSizeUnchecked: s.backgroundSize,
      radius: s.borderTopLeftRadius,
    };
  });
  check("done box draws >=22x22 (SPA look)", drawn.w >= 22 && drawn.h >= 22, `${drawn.w}x${drawn.h}`);
  check("appearance:none paints our box", drawn.appearance === "none", drawn.appearance);
  // The tick is two background layers; unchecked both measure 0 ("0px 0px, 0px 0px").
  check("unchecked tick is not painted", /^0px 0px(, 0px 0px)?$/.test(drawn.bgSizeUnchecked), drawn.bgSizeUnchecked);
  const label = await box.evaluate((el) => {
    const r = (el.closest("label") ?? el).getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  check("done label stays the >=44x44 hit target", label.w >= 43.5 && label.h >= 43.5, `${label.w}x${label.h}`);

  // Checked: the tick appears (background-size non-zero on both tick layers)
  // and, once the 120ms fill transition settles, the background is the accent.
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("#check-primitive [data-part=\"check-input\"]");
    el?.scrollIntoView();
  });
  const circle = page.locator("#check-primitive [data-testid=\"check-circle\"]");
  const tickOff = /^0px 0px, 0px 0px$/;
  const unchecked = await circle.evaluate((el) => getComputedStyle(el).backgroundSize);
  check("circle unchecked tick stayed hidden", tickOff.test(unchecked), unchecked);
  await circle.click();
  await page.waitForTimeout(250); // the fill transition is 120ms; measure the settled paint
  const checked = await circle.evaluate((el) => {
    const s = getComputedStyle(el);
    return { size: s.backgroundSize, bg: s.backgroundColor, radius: s.borderTopLeftRadius, border: s.borderTopColor };
  });
  check("circle tick paints when checked", !tickOff.test(checked.size), checked.size);
  const circleRounded = checked.radius;
  check("--yadad-check-radius: 50% rounds the box", parseFloat(circleRounded) >= 100 || circleRounded === "50%", circleRounded);
  const fill = await circle.evaluate((el) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue("--yadad-color-accent").trim();
    // compare in the same space the computed style uses (rgb())
    const probe = document.createElement("span");
    probe.style.color = hex;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return { bg: getComputedStyle(el).backgroundColor, accentRgb: rgb, border: getComputedStyle(el).borderTopColor };
  });
  check("checked fill is the accent (--yadad-check-on default)", fill.bg === fill.accentRgb && fill.border === fill.accentRgb, JSON.stringify(fill));

  // --- 3: the theming contract on a fresh page ------------------------------
  // Unlayered host CSS (the build's own layering contract, build-css.ts): added
  // after load with addStyleTag, which is also how a host would override.
  const themed = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await themed.goto(url, { waitUntil: "domcontentloaded" });
  await themed.addStyleTag({
    content:
      ":root{ --yadad-check-size: 28px; } " +
      "#calendar-done [data-part=\"done\"] { --yadad-calendar-checkbox-size: 30px; } " +
      "#check-primitive [data-part=\"check-input\"] { --yadad-calendar-checkbox-size: 24px; }", // ignored: no such alias outside the calendar rule
  });
  await themed.waitForTimeout(100);
  const dCal = await themed.locator("#calendar-done [data-part=\"done-input\"]").first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  // Calendar rule (deprecated alias) re-points the private size: 30px wins over the root --yadad-check-size.
  check("deprecated --yadad-calendar-checkbox-size still sizes the calendar box", Math.abs(dCal.w - 30) < 0.5 && Math.abs(dCal.h - 30) < 0.5, `${dCal.w}x${dCal.h}`);
  const dSq = await themed.locator("#check-primitive [data-testid=\"check-square\"]").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width };
  });
  // The primitive's own box follows the public variable, not the calendar alias.
  check("--yadad-check-size sizes the primitive box", Math.abs(dSq.w - 28) < 0.5, `${dSq.w}`);

  await page.close();
  await themed.close();
} finally {
  await browser.close();
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
