/**
 * Real-browser check: two boards on one page show the same cards. Using only
 * the keyboard, "Move to…" a card in the SECOND board; focus must land on that
 * card's trigger in the second board, never on the first board's copy.
 * Desktop and 390x844 with touch.
 *
 * Run from the repo root (gallery running):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/board-scoped-refocus.ts
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
    const boards = page.locator("#board-two-boards [data-yadad='board']");
    check(`[${vp.id}] two boards on the page`, (await boards.count()) === 2);
    const second = boards.nth(1);
    // Card Task 1 sits in the first column of both boards.
    const trigger = second.locator('[data-card-id="r1"] [data-part="move-trigger"]');
    await trigger.focus();
    await page.keyboard.press("Enter");
    const select = second.locator('[data-part="move-select"]');
    check(`[${vp.id}] the move panel focuses its select`, await select.evaluate((el) => el === document.activeElement));
    await page.keyboard.press("ArrowDown"); // first real option
    await page.keyboard.press("Tab"); // Move
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const where = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      const board = a?.closest("[data-yadad='board']");
      const all = [...document.querySelectorAll("#board-two-boards [data-yadad='board']")];
      return {
        part: a?.getAttribute("data-part") ?? null,
        card: a?.closest("[data-card-id]")?.getAttribute("data-card-id") ?? null,
        boardIndex: board ? all.indexOf(board) : -1,
      };
    });
    check(`[${vp.id}] focus is on a move trigger of card r1`, where.part === "move-trigger" && where.card === "r1", JSON.stringify(where));
    check(`[${vp.id}] and it is in the second board`, where.boardIndex === 1, `board ${where.boardIndex}`);
    const moved = await second.locator('[data-card-id="r1"]').evaluate((el) => el.closest("[data-column-id]")?.getAttribute("data-column-id"));
    check(`[${vp.id}] the card moved out of the first column in the second board`, moved !== null && moved !== (await boards.nth(0).locator('[data-card-id="r1"]').evaluate((el) => el.closest("[data-column-id]")?.getAttribute("data-column-id"))), String(moved));
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
