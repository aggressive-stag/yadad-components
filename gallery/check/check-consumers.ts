/**
 * Card 31c: board and boolean adopt the shared `Check` primitive, measured in
 * Chromium at 390 touch. The gallery story `#check-consumers` renders the
 * calendar done box, the board done box and a boolean field under ONE
 * `--yadad-check-*` surface (the story itself sets the circle look).
 *
 * 1. One surface, one box: the calendar and board boxes measure the same to
 *    0.01px and both are drawn by the primitive (appearance:none).
 * 2. Markers survived the swap: board keeps data-part="done-input", boolean
 *    keeps the documented [data-yadad="boolean"][data-part="input"] contract
 *    selector (field-frame's :has floor depends on it), and all three carry
 *    the primitive's data-yadad-check marker.
 * 3. Keyboard: Space toggles each box (native input behaviour kept).
 * 4. --yadad-check-size reaches all three; the boolean keeps its documented
 *    thumb-sized default when neither variable is set.
 * 5. The deprecated --yadad-board-* aliases still work on the board box only.
 * 6. The board done label stays the 44px tap target.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/check-consumers.ts
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};
const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " - " + extra : ""}`);
};

type Probe = {
  cal: { w: number; h: number; radius: string; appearance: string; bg: string };
  board: { w: number; h: number; radius: string; appearance: string; bg: string };
  flag: { w: number; h: number; radius: string; appearance: string; bg: string };
  calMarker: string;
  boardMarker: string;
  flagMarker: string;
};

const probe = (page: import("playwright-core").Page): Promise<Probe> =>
  page.evaluate(() => {
    const q = (sel: string): HTMLElement => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`no element for ${sel}`);
      return el as HTMLElement;
    };
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: r.width, h: r.height, radius: cs.borderTopLeftRadius, appearance: cs.appearance, bg: cs.backgroundSize };
    };
    const marker = (el: Element): string => `${el.getAttribute("data-yadad")}|${el.getAttribute("data-part")}|${el.getAttribute("data-yadad-check") !== null}`;
    const cal = q('#check-consumers [data-yadad="calendar"] [data-part="done-input"]');
    const board = q('#check-consumers [data-yadad="board"] [data-part="done-input"]');
    const flag = q("#g-check-consumers-flag");
    return { cal: box(cal), board: box(board), flag: box(flag), calMarker: marker(cal), boardMarker: marker(board), flagMarker: marker(flag) };
  });

const browser = await chromium.launch(launch);
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#check-consumers [data-part="done-input"]');
  const story = page.locator("#check-consumers");
  await story.scrollIntoViewIfNeeded();

  const m = await probe(page);
  check("calendar and board draw the same box", Math.abs(m.cal.w - m.board.w) < 0.01 && Math.abs(m.cal.h - m.board.h) < 0.01, `cal ${m.cal.w}x${m.cal.h} board ${m.board.w}x${m.board.h}`);
  check("drawn by the primitive (appearance:none)", m.cal.appearance === "none" && m.board.appearance === "none" && m.flag.appearance === "none", `${m.cal.appearance}/${m.board.appearance}/${m.flag.appearance}`);
  check("the story's --yadad-check-radius reaches all three", m.cal.radius !== "0px" && m.board.radius === m.cal.radius && m.flag.radius === m.cal.radius, `${m.cal.radius} / ${m.board.radius} / ${m.flag.radius}`);
  check("calendar box keeps its markers (primitive marker, no component bleed)", m.calMarker === "check|done-input|true", m.calMarker);
  check("board box keeps its markers (primitive marker, no component bleed)", m.boardMarker === "check|done-input|true", m.boardMarker);
  check("boolean keeps its contract markers + the primitive marker", m.flagMarker === "boolean|input|true", m.flagMarker);
  check("boolean keeps its thumb-sized default (24px at defaults)", Math.abs(m.flag.w - 24) < 0.01, `${m.flag.w}`);
  check("component boxes are the primitive default (22px)", Math.abs(m.cal.w - 22) < 0.01 && Math.abs(m.board.w - 22) < 0.01, `cal ${m.cal.w} board ${m.board.w}`);

  // Space toggles each box.
  const calBox = page.locator('#check-consumers [data-yadad="calendar"] [data-part="done-input"]');
  const boardBox = page.locator('#check-consumers [data-yadad="board"] [data-part="done-input"]');
  const flagBox = page.locator("#g-check-consumers-flag");
  const before = { cal: await calBox.isChecked(), board: await boardBox.isChecked(), flag: await flagBox.isChecked() };
  for (const el of [calBox, boardBox, flagBox]) {
    await el.focus();
    await page.keyboard.press("Space");
  }
  const after = { cal: await calBox.isChecked(), board: await boardBox.isChecked(), flag: await flagBox.isChecked() };
  check("Space toggles all three", after.cal !== before.cal && after.board !== before.board && after.flag !== before.flag, JSON.stringify({ before, after }));

  // One --yadad-check-size reaches all three.
  await page.addStyleTag({ content: "#check-consumers { --yadad-check-size: 28px; }" });
  const sized = await probe(page);
  check("one --yadad-check-size reaches calendar, board and boolean", Math.abs(sized.cal.w - 28) < 0.01 && Math.abs(sized.board.w - 28) < 0.01 && Math.abs(sized.flag.w - 28) < 0.01, `cal ${sized.cal.w} board ${sized.board.w} flag ${sized.flag.w}`);
  const tickPainted = await boardBox.evaluate((el) => getComputedStyle(el).backgroundSize !== "0px 0px, 0px 0px" && getComputedStyle(el).backgroundSize !== "0px 0px");
  check("tick paints only when checked", tickPainted === after.board, `checked=${after.board} bg=${sized.board.bg}`);

  // Deprecated board aliases still work on the board box only (no bleed).
  // The box is checked so the accent actually paints (:checked fill+border).
  // Toggled through a click (a real user event, so React's controlled state
  // follows), and read only after the sheet's 120ms colour transition settles.
  if (!(await boardBox.isChecked())) {
    await boardBox.click();
  }
  await page.waitForTimeout(200);
  await page.addStyleTag({ content: '[data-yadad="board"] { --yadad-board-checkbox-size: 30px; --yadad-board-done-accent: rgb(255, 0, 0); }' });
  await page.waitForTimeout(250);
  const aliased = await page.evaluate(() => {
    const cal = document.querySelector('#check-consumers [data-yadad="calendar"] [data-part="done-input"]') as HTMLElement;
    const board = document.querySelector('#check-consumers [data-yadad="board"] [data-part="done-input"]') as HTMLInputElement;
    const flag = document.querySelector("#g-check-consumers-flag") as HTMLElement;
    return {
      cal: cal.getBoundingClientRect().width,
      board: board.getBoundingClientRect().width,
      flag: flag.getBoundingClientRect().width,
      boardBorder: getComputedStyle(board).borderTopColor,
      boardChecked: board.checked,
      calBorder: getComputedStyle(cal).borderTopColor,
    };
  });
  check("deprecated --yadad-board-checkbox-size sizes the board box only", Math.abs(aliased.board - 30) < 0.01 && Math.abs(aliased.cal - 28) < 0.01 && Math.abs(aliased.flag - 28) < 0.01, JSON.stringify(aliased));
  check("deprecated --yadad-board-done-accent colours the checked board box only", aliased.boardChecked && aliased.boardBorder === "rgb(255, 0, 0)" && aliased.calBorder !== "rgb(255, 0, 0)", JSON.stringify(aliased));

  // The board done label is still the 44px target.
  const labelH = await page.locator('#check-consumers [data-yadad="board"] [data-part="done"]').evaluate((el) => el.getBoundingClientRect().height);
  check("board done label stays a 44px tap target", labelH >= 44, `${labelH}`);
} finally {
  await browser.close();
}

for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(failed === 0 ? `ALL PASS (${results.length})` : `${failed} FAILED of ${results.length}`);
process.exit(failed === 0 ? 0 : 1);
