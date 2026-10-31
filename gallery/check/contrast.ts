// Card 15c: forced-colors + reduced-motion check.
// Path A (preferred): CDP Emulation.setEmulatedMedia forced-colors:active, then
// assert the painted boundaries survive in computed style (dialog ::backdrop,
// dialog frame, open menu panel).
// Path B (fallback where emulation is not honored): parse the authored CSS and
// assert the @media (forced-colors: active) blocks exist with system colors.
// The script prints which path verified what. Run from the repo root:
//   GALLERY_URL=http://localhost:5151/ node --experimental-strip-types gallery/check/contrast.ts
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "playwright-core";

const GALLERY = process.env.GALLERY_URL ?? "http://localhost:5151/";
const results: string[] = [];
const check = (name: string, ok: boolean, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);

const CSS = {
  dialog: "sets/base/dialog/v1/dialog.css",
  board: "sets/base/board/v1/board.css",
  table: "sets/base/table/v1/table.css",
  calendar: "sets/base/calendar/v1/calendar.css",
  panel: "sets/base/panel/v1/panel.css",
  text: "sets/base/text/v1/text.css",
  check: "sets/internal/check/v1/check.css",
};

function forcedBlocks(file: string): string {
  const css = readFileSync(file, "utf8");
  const blocks: string[] = [];
  const re = /@media\s*\(\s*forced-colors:\s*active\s*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") { depth--; if (depth === 0) break; }
    }
    blocks.push(css.slice(m.index, i + 1));
  }
  return blocks.join("\n");
}

async function main() {
  const browser = await chromium.launch({
    args: ["--no-sandbox"],
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);

  await page.goto(GALLERY, { waitUntil: "networkidle" });
  let emulated = false;
  try {
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "forced-colors", value: "active" }],
      ...(process.env.FORCED_COLORS_ALSO ? { forcedColors: "active" } : {}),
    });
    emulated = true;
  } catch (e) {
    console.log("emulation refused:", (e as Error).message);
  }
  await page.waitForTimeout(300);
  const reported = await page.evaluate(() => matchMedia("(forced-colors: active)").matches);
  check("emulated forced-colors is reported by matchMedia", emulated && reported, `matchMedia=${reported}`);

  // Open a dialog and a board menu, then measure the painted boundaries.
  await page.evaluate(() => {
    const anchor = document.getElementById("dialog-basic") ?? document.querySelector("[data-state='dialog-basic']");
    anchor?.scrollIntoView();
  });
  const openDialog = page.locator("button", { hasText: /open dialog/i }).first();
  if (await openDialog.count()) {
    await openDialog.click();
    await page.waitForTimeout(250);
  }
  const dialog = page.locator("[data-yadad='dialog'][open]").first();
  if (await dialog.count()) {
    const frame = await dialog.evaluate((el) => {
      const s = getComputedStyle(el);
      const b = getComputedStyle(el, "::backdrop");
      return {
        borderW: parseFloat(s.borderTopWidth) || 0,
        outlineW: parseFloat(s.outlineWidth) || 0,
        backdropOutlineW: parseFloat(b.outlineWidth) || 0,
        backdropVisible: b.display !== "none" && (parseFloat(b.opacity) > 0 || parseFloat(b.borderTopWidth) > 0 || parseFloat(b.outlineWidth) > 0),
      };
    });
    if (emulated && reported) {
      check("dialog keeps a border under forced-colors", frame.borderW > 0, `borderW=${frame.borderW}`);
      check("dialog keeps an outline under forced-colors", frame.outlineW > 0, `outlineW=${frame.outlineW}`);
      check("backdrop stays painted (opacity/outline) under forced-colors", frame.backdropVisible, JSON.stringify(frame));
    }
  } else if (emulated && reported) {
    check("dialog found on page for forced-colors measurement", false, "no open dialog found");
  }

  // The Check primitive (card 31b): with forced-color-adjust:none the box
  // must keep a CanvasText border and, when checked, a painted fill that is
  // visibly different from the unchecked one (Highlight vs Canvas).
  const boxes = page.locator("#check-primitive [data-part=\"check-input\"]");
  if ((await boxes.count()) >= 2) {
    const paints = await boxes.evaluateAll((els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        return {
          borderW: parseFloat(s.borderTopWidth) || 0,
          borderStyle: s.borderTopStyle,
          bg: s.backgroundColor,
          checked: (e as HTMLInputElement).checked,
        };
      }),
    );
    if (emulated && reported) {
      const off = paints.find((p) => !p.checked);
      const on = paints.find((p) => p.checked);
      check("check keeps a border under forced-colors", paints.every((p) => p.borderW > 0 && p.borderStyle !== "none"), JSON.stringify(paints));
      check("checked check paints a fill different from the unchecked one", !!off && !!on && off.bg !== on.bg, `off=${off?.bg} on=${on?.bg}`);
    }
  } else if (emulated && reported) {
    check("check primitive found for forced-colors measurement", false, "no #check-primitive boxes");
  }

  await browser.close();

  // Path B is always run: the authored CSS must carry the blocks regardless of
  // whether this Chromium honored the emulation.
  const expectations: [string, RegExp[]][] = [
    [CSS.dialog, [/::backdrop/, /background:\s*Canvas/, /opacity:\s*0\.8\d/, /border:\s*1px solid CanvasText/, /outline:\s*1px solid CanvasText/, /outline:\s*var\(--yadad-focus-ring-width\)\s+solid\s+Highlight/]],
    [CSS.board, [/data-part="actions-panel"\], \[data-part="move-panel"/, /outline:\s*1px solid CanvasText/]],
    [CSS.table, [/data-part="actions-panel"/, /outline:\s*1px solid CanvasText/]],
    [CSS.calendar, [/data-part="actions-panel"\], \[data-part="move-panel"/, /outline:\s*1px solid CanvasText/]],
    [CSS.panel, [/border:\s*1px solid CanvasText/]],
    [CSS.text, [/diff-added[\s\S]*text-decoration:\s*underline/, /diff-removed[\s\S]*text-decoration:\s*line-through/, /background:\s*transparent/]],
    [CSS.check, [/background-color:\s*Canvas/, /border-color:\s*CanvasText/, /background-color:\s*Highlight/]],
  ];
  for (const [file, expects] of expectations) {
    const blocks = forcedBlocks(file);
    check(`${file} has a forced-colors block`, blocks.length > 0);
    for (const re of expects) check(`${file} matches ${re}`, re.test(blocks));
  }

  // Reduced motion: nothing animates today; any file that ever does must guard.
  const cssFiles = readdirSync("sets/base", { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".css"))
    .map((f) => `sets/base/${f}`);
  const offenders = cssFiles.filter((f) => {
    const css = readFileSync(f, "utf8");
    const decls = [...css.matchAll(/(?:^|[{;])\s*(?:transition|animation)(?:-duration|-property|-name)?\s*:\s*([^;{}]+)/gm)];
    const animates = decls.some((d) => {
      const v = (d[1] ?? "").trim();
      return v !== "" && v !== "none";
    });
    return animates && !css.includes("prefers-reduced-motion");
  });
  check("no stylesheet animates without a guard (the gate's theming check is authoritative)", offenders.length === 0, offenders.join(", ") || "clean");

  const fails = results.filter((r) => r.startsWith("FAIL"));
  console.log(results.join("\n"));
  console.log(`\n${results.length - fails.length}/${results.length} passed (${emulated && reported ? "CDP emulation verified" : "CSS-parse asserted"} for forced-colors paint)`);
  process.exit(fails.length ? 1 : 0);
}

main();
