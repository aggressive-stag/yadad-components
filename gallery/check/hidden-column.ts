/**
 * Board hiddenColumns (card 28b guard).
 *
 * Against the gallery's "board-hidden-column" stories, at desktop and at 390x844 with touch:
 *   1. At rest no hidden-column target is rendered, and "Move to…" lists "No status".
 *   2. While a card is dragged (mouse on desktop, long-press and finger on the phone) a slim "No status"
 *      drop target appears; dropping on it moves the card there; the target is gone afterwards.
 *   3. A drag cancelled (Escape or release elsewhere) removes the target again.
 *   4. "Move to…" reaches "No status" by keyboard/tap.
 *
 *   GALLERY_URL=http://localhost:5199/ node gallery/check/hidden-column.ts
 *
 * Exits non-zero on failure. PLAYWRIGHT_EXECUTABLE_PATH points at a different Chromium.
 */
import { chromium } from "playwright-core";
import type { Page } from "playwright-core";

const url = process.env.GALLERY_URL || "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};
const shots = process.env.SHOTS || "/tmp/claude-1000/pw";

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail = ""): void => void results.push({ name, ok, detail });

const browser = await chromium.launch(launch);

const targetCount = (page: Page, root: string): Promise<number> => page.locator(`${root} [data-hidden-target=true]`).count();
const cardColumn = (page: Page, root: string, card: string): Promise<string | null> =>
  page.locator(`${root} [data-card-id="${card}"]`).evaluate((el) => el.closest("[data-part=column]")?.getAttribute("data-column-id") ?? null);

// ---------- desktop, mouse ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const root = "#board-hidden-column";
  const board = page.locator(root);
  await board.scrollIntoViewIfNeeded();
  check("desktop: no target at rest", (await targetCount(page, root)) === 0);

  // Move to… lists No status
  await board.locator('[data-part=move-trigger]').first().click();
  const opts = await board.locator("[data-part=move-select] option").allTextContents();
  check("desktop: Move to… lists No status", opts.includes("No status"), opts.join("|"));
  await board.locator("[data-part=move-cancel]").click();

  const card = board.locator('[data-part=card][data-movable=true]').first();
  const cardId = (await card.getAttribute("data-card-id")) as string;
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 });
  await page.waitForTimeout(100);
  check("desktop: target appears while dragging", (await targetCount(page, root)) === 1);
  await page.screenshot({ path: `${shots}/hidden-desktop-drag.png` });
  const tgt = board.locator("[data-hidden-target=true]");
  // The target sits at the end of the row; the browser's edge autoscroll is not simulated, so scroll the row there.
  await board.locator("[data-part=columns]").evaluate((el) => void (el.scrollLeft = el.scrollWidth));
  await page.waitForTimeout(100);
  const tb = (await tgt.boundingBox())!;
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  check("desktop: target highlights on hover", (await tgt.getAttribute("data-drag-over")) === "true");
  await page.mouse.up();
  await page.waitForTimeout(150);
  check("desktop: card landed in No status", (await cardColumn(page, root, cardId)) === "v:", String(await cardColumn(page, root, cardId)));
  check("desktop: target gone after drop", (await targetCount(page, root)) === 0);
  check("desktop: No status is now an ordinary column", (await board.locator('[data-column-id="v:"] [data-part=column-count]').count()) === 1);

  // Move via menu from the other fresh board (phone story reused at desktop width): menu path
  const b2 = page.locator("#board-hidden-column-phone");
  await b2.scrollIntoViewIfNeeded();
  await b2.locator("[data-part=move-trigger]").first().click();
  await b2.locator("[data-part=move-select]").selectOption({ label: "No status" });
  const moved = await b2.locator("[data-part=move-panel]").evaluate((f) => (f.closest("[data-part=card]") as HTMLElement).dataset.cardId);
  await b2.locator("[data-part=move-confirm]").click();
  await page.waitForTimeout(100);
  check("desktop: Move to… moved the card to No status", (await cardColumn(page, "#board-hidden-column-phone", moved as string)) === "v:", String(moved));

  // cancelled drag: release over the board header
  const card3 = board.locator('[data-part=card][data-movable=true]').first();
  const b3 = (await card3.boundingBox())!;
  await page.mouse.move(b3.x + 20, b3.y + 20);
  await page.mouse.down();
  await page.mouse.move(b3.x + 60, b3.y + 40, { steps: 5 });
  await page.waitForTimeout(100);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(150);
  check("desktop: target gone after a cancelled drag", (await targetCount(page, root)) === 0);
  await ctx.close();
}

// ---------- phone, touch ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const root = "#board-hidden-column-phone";
  const board = page.locator(root);
  await board.scrollIntoViewIfNeeded();
  check("phone: no target at rest", (await targetCount(page, root)) === 0);

  await board.locator("[data-part=move-trigger]").first().tap();
  const opts = await board.locator("[data-part=move-select] option").allTextContents();
  check("phone: Move to… lists No status", opts.includes("No status"), opts.join("|"));
  await board.locator("[data-part=move-cancel]").tap();

  const card = board.locator("[data-part=card][data-movable=true]").first();
  const cardId = (await card.getAttribute("data-card-id")) as string;
  const cb = (await card.boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number): Promise<unknown> =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const sx = cb.x + cb.width / 2;
  const sy = cb.y + 12;
  await touch("touchStart", sx, sy);
  await page.waitForTimeout(600); // long-press lift
  check("phone: card lifted", (await card.getAttribute("data-dragging")) === "true");
  await touch("touchMove", sx + 4, sy + 4);
  await page.waitForTimeout(150);
  check("phone: target appears during a touch drag", (await targetCount(page, root)) === 1);
  const tgt = board.locator("[data-hidden-target=true]");
  await page.screenshot({ path: `${shots}/hidden-phone-drag.png` });
  // drag toward the right edge so the rail scrolls to the target, then over it
  let over = false;
  for (let i = 0; i < 40 && !over; i++) {
    const tb = await tgt.boundingBox();
    if (tb && tb.x >= 0 && tb.x + tb.width <= 390 && tb.y >= 0 && tb.y + tb.height <= 844) {
      await touch("touchMove", tb.x + tb.width / 2, tb.y + tb.height / 2);
      await page.waitForTimeout(80);
      over = (await tgt.getAttribute("data-drag-over")) === "true";
    } else {
      await touch("touchMove", 385, sy);
      await page.waitForTimeout(120);
    }
  }
  check("phone: target reachable and highlighted under the finger", over);
  await page.screenshot({ path: `${shots}/hidden-phone-over.png` });
  await touch("touchEnd", 0, 0);
  await page.waitForTimeout(250);
  check("phone: card landed in No status", (await cardColumn(page, root, cardId)) === "v:", String(await cardColumn(page, root, cardId)));
  check("phone: target gone after drop", (await targetCount(page, root)) === 0);
  const d = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  check("phone: page has no sideways scroll", d);
  await ctx.close();
}

await browser.close();
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
