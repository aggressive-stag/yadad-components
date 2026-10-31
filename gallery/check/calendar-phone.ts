/**
 * Calendar phone audit (card 31a).
 *
 * At 390x844 and 320x568 with touch, in light and dark, against the
 * calendar states in the gallery: the DOM-side assertions in
 * gallery/check/lib/calendar-phone-audit.ts (no rendered [data-part] at
 * zero size, the per-mode visibility table, the entries list filling the
 * root, 44x44 hit targets) must produce no failures. A 1280-wide desktop
 * pass runs the same audit with pointer: fine so the grid-mode rows of the
 * table are covered too.
 *
 * The audit is self-tested afterwards: each seeded regression — the done
 * label's 44px floor removed, a visible part forced to width: 0, the phone
 * day-date/day-number visibility swapped — must produce a failure naming the
 * part. A run that silently passes on a broken calendar is the failure mode
 * this card exists to prevent.
 *
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/calendar-phone.ts
 *
 * Exits non-zero on failure. PLAYWRIGHT_EXECUTABLE_PATH points at a different Chromium.
 */
import { chromium, type Page } from "playwright-core";
import { auditCalendarPhone } from "./lib/calendar-phone-audit.ts";

const url = process.env.GALLERY_URL || "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail: string): void => {
  results.push({ name, ok, detail });
};

/** The lib function is self-contained by contract: Playwright serializes it
 *  into the page verbatim, so what runs in the browser is this exact code. */
const runAudit = (page: Page, seeds: string[]) =>
  page.evaluate(auditCalendarPhone, { seeds });

const browser = await chromium.launch(launch);

// --- phone viewports, both themes --------------------------------------------
for (const vp of [
  { id: "390", width: 390, height: 844 },
  { id: "320", width: 320, height: 568 },
]) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".controls button", { hasText: theme }).click({ force: true });
    await page.waitForTimeout(200);
    const run = `vp${vp.id} ${theme}`;
    check(`${run}: pointer: coarse matches`, await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "");
    const failures = await runAudit(page, []);
    check(`${run}: calendar audit clean`, failures.length === 0, failures.map((f) => `${f.name} (expected ${f.expected}, got ${f.actual}) ${f.detail}`).join(" | "));
    await ctx.close();
  }
}

// --- desktop (grid mode rows of the visibility table) --------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const failures = await runAudit(page, []);
  check("vp1280 desktop audit clean (grid mode)", failures.length === 0, failures.map((f) => `${f.name} (expected ${f.expected}, got ${f.actual}) ${f.detail}`).join(" | "));
  await ctx.close();
}

// --- the check must catch seeded regressions (at 390 touch) --------------------
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const seeds: Array<[string, string, string]> = [
    ["drop-done-floor", "done label 44px floor", "tap target done"],
    ["zero-part", "entries forced to width 0", "entries"],
    ["swap-date-parts", "agenda date parts swapped", "day-date"],
  ];
  for (const [seed, what, mustMention] of seeds) {
    const failures = await runAudit(page, [seed]);
    const named = failures.filter((f) => f.name.includes(mustMention) || f.detail.includes(mustMention));
    check(`seed ${seed} (${what}) is caught and names the part`,
      failures.length > 0 && named.length > 0,
      failures.length === 0 ? "audit passed on a broken calendar" : failures.map((f) => f.name).join(" | "));
  }
  // The seeds removed themselves: a clean re-run still passes.
  const after = await runAudit(page, []);
  check("audit is clean again after the seeds are removed", after.length === 0, after.map((f) => f.name).join(" | "));
  await ctx.close();
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) { failed++; console.log(`FAIL ${r.name}\n     ${r.detail}`); }
}
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
