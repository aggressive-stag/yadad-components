// Card 23c: the layout.Pager registry component at phone width — the pager
// must not overflow 320px, the current-page marker must read, disabled ends
// must be actually disabled, and axe must stay clean on the pager states.
// Run from the repo root:
//   GALLERY_URL=http://localhost:5178/ node --experimental-strip-types --disable-warning=ExperimentalWarning gallery/check/pager-registry.ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const GALLERY = process.env.GALLERY_URL ?? "http://localhost:5178/";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(GALLERY, { waitUntil: "domcontentloaded" });

// 1. The registry pager carries the built-in's selector and shape.
const shape = await page.evaluate(() => {
  const nav = document.querySelector<HTMLElement>("#pager-registry-middle [data-yadad-pager]");
  if (!nav) return null;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  return {
    tag: nav.tagName,
    label: nav.getAttribute("aria-label"),
    buttons: buttons.map((b) => [b.textContent, b.disabled]),
    info: nav.querySelector<HTMLElement>("[data-part='info']")?.textContent,
    current: nav.querySelector<HTMLElement>("[data-part='info']")?.getAttribute("aria-current"),
  };
});
check("registry pager renders as a labelled nav with data-yadad-pager", shape?.tag === "NAV" && shape.label === "Sessions pages", JSON.stringify(shape?.tag));
check("Previous and Next are the built-in's button pair, both live mid-document", JSON.stringify(shape?.buttons) === JSON.stringify([["Previous", false], ["Next", false]]), JSON.stringify(shape?.buttons));
check("middle page reads “Page 3 of 5” with aria-current", shape?.info === "Page 3 of 5" && shape.current === "true", JSON.stringify([shape?.info, shape?.current]));

// 2. The current-page marker is typographic, not colour-only.
const marker = await page.evaluate(() => {
  const info = document.querySelector<HTMLElement>("#pager-registry-middle [data-part='info'][aria-current]")!;
  const s = getComputedStyle(info);
  return { weight: s.fontWeight, color: s.color };
});
check("current page is bold (typographic marker)", Number(marker.weight) >= 600, `weight ${marker.weight}`);

// 3. Disabled ends at the edges.
const ends = await page.evaluate(() => {
  const rows = [...document.querySelectorAll<HTMLElement>("#pager-registry-ends [data-yadad-pager]")];
  return rows.map((nav) => [...nav.querySelectorAll<HTMLButtonElement>("button")].map((b) => [b.textContent, b.disabled]));
});
check("first page disables Previous only", JSON.stringify(ends[0]) === JSON.stringify([["Previous", true], ["Next", false]]), JSON.stringify(ends[0]));
check("last page disables Next only", JSON.stringify(ends[1]) === JSON.stringify([["Previous", false], ["Next", true]]), JSON.stringify(ends[1]));

// 4. Cursor mode.
const cursor = await page.evaluate(() => document.querySelector<HTMLElement>("#pager-registry-cursor [data-part='info']")?.textContent);
check("cursor mode reads “Page 4” (no total)", cursor === "Page 4", String(cursor));

// 5. The phone state: pager inside a 320px frame must not overflow the frame.
const overflow = await page.evaluate(() => {
  const frame = document.querySelector<HTMLElement>("#pager-registry-phone .phone-frame")!;
  const nav = frame.querySelector<HTMLElement>("[data-yadad-pager]")!;
  const f = frame.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  return { frameRight: Math.round(f.right), navRight: Math.round(n.right), frameW: Math.round(f.width), navW: Math.round(n.width), docScroll: document.documentElement.scrollWidth };
});
check("pager fits the 320px frame (no horizontal overflow)", overflow.navRight <= overflow.frameRight + 1 && overflow.docScroll <= 390 + 2, JSON.stringify(overflow));

// 6. axe, scoped to the pager rows.
await page.addScriptTag({ content: axeSource });
const scoped = ["#pager-registry-middle", "#pager-registry-ends", "#pager-registry-cursor", "#pager-registry-phone"];
const ax = await page.evaluate(async (sels: string[]) => {
  const wins: unknown[] = [];
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) { wins.push({ sel, skipped: "missing" }); continue; }
    const r = await (window as unknown as { axe: { run: (e: unknown, o: unknown) => Promise<{ violations: { id: string; impact?: string; nodes: unknown[] }[] }> } }).axe.run(el, { resultTypes: ["violations"] });
    wins.push({ sel, violations: r.violations.map((v) => `${v.id}(${v.impact ?? "?"})x${v.nodes.length}`) });
  }
  return wins;
}, scoped);
for (const w of ax as { sel: string; violations?: string[]; skipped?: string }[]) {
  if (w.skipped) { check(`axe ${w.sel} present`, false, "state missing"); continue; }
  check(`axe clean: ${w.sel}`, (w.violations ?? []).length === 0, (w.violations ?? []).join(", "));
}

await browser.close();
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
