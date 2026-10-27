/**
 * Real-browser check for the RFC 0010 table markup: a quick filter's
 * placeholder (item 5), unsortable headers as plain text (item 6), the page
 * notice style (item 7), and the colour dots on the --yadad-color-category-N
 * tokens in light and dark, at desktop and 390x844 with touch.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/table-markup.ts
 * Set SHOT_DIR to save screenshots.
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};
const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " - " + extra : ""}`);
};

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};
// The engine's category tokens (slot 1 red, 3 yellow, 7 magenta ...), light and dark.
const LIGHT = ["#464ea9", "#d13438", "#f7630c", "#bc8900", "#107c10", "#038387", "#8764b8", "#c239b3"];
const DARK = ["#8f96e8", "#ff7b80", "#ff9a57", "#ffd23f", "#5ec25e", "#3fc4c8", "#b79ae0", "#e676d8"];

const lum = (c: string): number => {
  const [r, g, b] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const s = Number(v) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
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

    for (const mode of ["light", "dark"] as const) {
      const palette = mode === "light" ? LIGHT : DARK;
      await page.getByRole("button", { name: new RegExp(`^${mode}$`, "i") }).first().click();
      const tag = `${label} ${mode}`;

      check(`${tag}: text filter shows its placeholder`, (await page.locator("#text-placeholder input").getAttribute("placeholder")) === "Contains...");

      const unsort = await page.locator("#table-unsortable").evaluate((root) => ({
        buttons: root.querySelectorAll('[data-part="header"] button').length,
        arrows: root.querySelectorAll('[data-part="sort-indicator"]').length,
        cursor: getComputedStyle(root.querySelector('[data-part="header"]') as Element).cursor,
        labels: [...root.querySelectorAll('[data-part="header"]')].map((h) => h.textContent),
      }));
      check(`${tag}: unsortable headers are plain text`, unsort.buttons === 0 && unsort.arrows === 0 && unsort.cursor !== "pointer" && unsort.labels.slice(0, 2).join() === "Day,Weight", JSON.stringify(unsort));

      for (const tone of ["info", "warning"]) {
        const n = await page.locator(`#page-notice-${tone} [data-yadad-page-notice]`).evaluate((el) => {
          const cs = getComputedStyle(el);
          return { role: el.getAttribute("role"), bg: cs.backgroundColor, fg: cs.color, bar: cs.borderInlineStartColor, barW: parseFloat(cs.borderInlineStartWidth), w: el.getBoundingClientRect().width, vw: document.documentElement.clientWidth };
        });
        const page_bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        check(`${tag}: ${tone} notice is a status region with bar, readable text`, n.role === "status" && n.barW > 0 && contrast(n.fg, n.bg) >= 4.5 && contrast(n.bar, page_bg) >= 3, JSON.stringify({ ...n, c: contrast(n.fg, n.bg).toFixed(1), bar3: contrast(n.bar, page_bg).toFixed(1) }));
        check(`${tag}: ${tone} notice fits the viewport`, n.w <= n.vw);
        if (tone === "warning") check(`${tag}: warning bar is the yellow category hue`, n.bar === rgb(palette[3] as string), n.bar);
      }

      const bgs = async (sel: string): Promise<string[]> => page.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
      const sel = await bgs('#select-display-all-colours [data-part="swatch"]');
      check(`${tag}: the eight select dots are the eight category tokens, yellow included`, JSON.stringify(sel) === JSON.stringify(palette.map(rgb)), JSON.stringify(sel));
      const ref = await bgs('#reference-display-colour [data-part="swatch"]');
      check(`${tag}: reference dot is category 1`, ref.length === 1 && ref[0] === rgb(palette[1] as string), JSON.stringify(ref));
      const board = await bgs('#board-column-colours [data-part="swatch"]');
      check(`${tag}: board dots are category tokens`, board.length === 3 && board.every((b) => palette.map(rgb).includes(b)), JSON.stringify(board));
      if (process.env.SHOT_DIR) {
        for (const id of ["page-notice-info", "page-notice-warning", "table-unsortable", "text-placeholder", "select-display-all-colours", "reference-display-colour", "board-column-colours"]) {
          await page.locator(`#${id}`).scrollIntoViewIfNeeded();
          await page.locator(`#${id}`).screenshot({ path: `${process.env.SHOT_DIR}/${label.replace(/ /g, "-")}-${mode}-${id}.png` });
        }
      }
    }
    check(`${label}: no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
