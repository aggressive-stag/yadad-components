/**
 * Token fallback check: the pre-built stylesheet (dist/yadad-components.css,
 * run `pnpm build` first) must render styled when the host wrote no theme
 * tokens, and a host theme (the engine's darkTheme, via themeToCss) must still
 * win over the fallback. Checked at desktop width and 390x844 with touch.
 * Needs no dev server:
 *
 *   node gallery/check/token-fallback.ts
 *
 * Exits non-zero on failure. Set PLAYWRIGHT_EXECUTABLE_PATH to use another
 * Chromium.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { darkTheme, lightTheme, themeToCss } from "@yadad/theme";

const css = readFileSync("dist/yadad-components.css", "utf8");
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};

const markup = `<div id="app"><div data-yadad="section" data-part="root"><div data-part="title">Title</div>
<button data-yadad="button" data-part="root" data-variant="primary">Save</button></div></div>`;

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const cases = [
  { name: "no host tokens", tokens: "", theme: lightTheme, selector: "" },
  { name: "host dark theme on :root", tokens: themeToCss(darkTheme), theme: darkTheme, selector: "" },
  { name: "host dark theme scoped to #app", tokens: themeToCss(darkTheme, "#app"), theme: darkTheme, selector: "" },
] as const;
const viewports = [
  { name: "desktop", width: 1280, height: 800, touch: false },
  { name: "390x844 touch", width: 390, height: 844, touch: true },
];

let failed = 0;
const browser = await chromium.launch(launch);
for (const vp of viewports) {
  for (const c of cases) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body>${markup}</body>`);
    if (c.tokens) await page.addStyleTag({ content: c.tokens });
    await page.addStyleTag({ content: css });
    const got = await page.evaluate(() => {
      const btn = document.querySelector("button")!;
      const sec = document.querySelector('[data-yadad="section"]')!;
      const b = getComputedStyle(btn);
      const s = getComputedStyle(sec);
      return {
        btnBg: b.backgroundColor,
        btnH: btn.getBoundingClientRect().height,
        secBg: s.backgroundColor,
        secPad: s.paddingTop,
        secBorder: s.borderTopColor,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const t = c.theme;
    const problems: string[] = [];
    if (got.btnBg !== rgb(t["color-accent"])) problems.push(`button bg ${got.btnBg}`);
    if (got.secBg !== rgb(t["color-surface"])) problems.push(`section bg ${got.secBg}`);
    if (got.secBorder !== rgb(t["color-border"])) problems.push(`section border ${got.secBorder}`);
    if (got.secPad !== "16px") problems.push(`section padding ${got.secPad}`);
    if (got.btnH < 44) problems.push(`button height ${got.btnH}`);
    if (got.overflow) problems.push("page scrolls sideways");
    const ok = problems.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} [${vp.name}] ${c.name}${ok ? "" : ": " + problems.join("; ")}`);
    await ctx.close();
  }
}
await browser.close();
if (failed) process.exit(1);
