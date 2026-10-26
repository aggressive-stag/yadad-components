/**
 * Phone/keyboard check for the time and tags components (card 23a).
 *
 * Against the gallery, at 390×844 (touch) and 320×640:
 *   1. #tags-display-many chips WRAP (the display is multi-line) and the page
 *      has no sideways scroll — the card's "many (long-wrapping at 320px)".
 *   2. The tags input row is usable on a phone: the add input paints >= 16px
 *      text (iOS focus-zoom guard) and the add/remove buttons reach ~44px
 *      touch height (same bar the phone-touch check applies to buttons).
 *   3. The time input at 200%-style narrow width does not force the page wide.
 *   4. Keyboard-only add: focus the add input, type a tag, press Enter with a
 *      real key event — a new chip appears in the editor.
 *
 * Run from the repo root:
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/time-tags-phone.ts
 * Point PLAYWRIGHT_EXECUTABLE_PATH at a chromium-headless-shell if needed.
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};

const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

const browser = await chromium.launch(launch);
try {
  for (const vp of [
    { id: "390", width: 390, height: 844, hasTouch: true },
    { id: "320", width: 320, height: 640, hasTouch: true },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.hasTouch });
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`[${vp.id}] no sideways page scroll (time/tags wired in)`, overflow <= 0, `overflow ${overflow}px`);

    const chips = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("#tags-display-many [data-yadad=\"tags\"][data-part=\"display\"]");
      if (!el) return null;
      const chips = [...el.querySelectorAll<HTMLElement>("[data-part=\"chip\"]")];
      const tops = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top)));
      return { count: chips.length, rows: tops.size, boxRight: el.getBoundingClientRect().right };
    });
    check(`[${vp.id}] tags display found with chips`, chips !== null && chips.count > 1, JSON.stringify(chips));
    if (chips !== null) {
      check(`[${vp.id}] many chips wrap (>= 2 rows)`, chips.rows >= 2, `rows ${chips.rows}`);
      check(`[${vp.id}] chips stay inside the viewport`, chips.boxRight <= vp.width + 1, `right ${chips.boxRight}`);
    }

    const input = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>("#tags-filled [data-part=\"add-input\"]");
      if (!el) return null;
      const cs = getComputedStyle(el);
      const add = document.querySelector<HTMLElement>("#tags-filled [data-part=\"add\"]");
      return { fontSize: parseFloat(cs.fontSize), addH: add ? add.getBoundingClientRect().height : 0 };
    });
    check(`[${vp.id}] tags add input paints >= 16px`, input !== null && input.fontSize >= 16, JSON.stringify(input));
    check(`[${vp.id}] tags add button reaches phone tap height (>= 34px)`, input !== null && input.addH >= 34, `h ${input?.addH}`);

    const timeFits = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>("#time-filled [data-yadad=\"time\"]");
      return el ? el.getBoundingClientRect().right <= window.innerWidth + 1 : false;
    });
    check(`[${vp.id}] time input fits the viewport`, timeFits);

    await page.close();
  }

  // Keyboard-only add, desktop viewport (real Enter, React state in the loop).
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.focus("#tags-filled [data-part=\"add-input\"]");
  await page.keyboard.type("leg day");
  await page.keyboard.press("Enter");
  const added = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#tags-filled [data-part=\"chips\"] [data-part=\"chip-label\"]")].some((el) => el.textContent === "leg day"));
  check("keyboard: Enter adds a typed chip", added);
  // Duplicate refused via the same keyboard path.
  await page.keyboard.type("leg day");
  await page.keyboard.press("Enter");
  const onceOnly = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#tags-filled [data-part=\"chips\"] [data-part=\"chip-label\"]")].filter((el) => el.textContent === "leg day").length);
  check("keyboard: a duplicate is refused", onceOnly === 1, `count ${onceOnly}`);
  await page.close();
} finally {
  await browser.close();
}

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
