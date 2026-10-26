// Card 23d: the RFC 0009 surfaces at phone width — chip row wraps (never
// side-scrolls), the lit chip reads as selected (fill differs from unlit),
// batch rows sit on a hairline, a ticked checklist row strikes through and a
// pending one does not, the tick box is thumb-sized, axe stays clean.
// Run from the repo root:
//   GALLERY_URL=http://localhost:5178/ node --experimental-strip-types --disable-warning=ExperimentalWarning gallery/check/composer-surfaces.ts
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

// 1. Chip row at phone width: wraps, never side-scrolls.
const chips = await page.evaluate(() => {
  const frame = document.querySelector<HTMLElement>("#chips-row-phone .phone-frame")!;
  const nav = frame.querySelector<HTMLElement>("[data-yadad-saved-filters]")!;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  const tops = new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top)));
  const f = frame.getBoundingClientRect();
  const widest = Math.max(...buttons.map((b) => b.getBoundingClientRect().right));
  return {
    rows: tops.size,
    buttons: buttons.length,
    overflows: widest > f.right + 1,
    docScroll: document.documentElement.scrollWidth,
    radius: getComputedStyle(buttons[0]!).borderTopLeftRadius,
    pressed: buttons[0]!.getAttribute("aria-pressed"),
  };
});
check("phone chip row wraps to >1 row without overflowing the frame", chips.rows > 1 && !chips.overflows && chips.docScroll <= 392, JSON.stringify(chips));
check("chips are pill-shaped and announced as toggles", parseFloat(chips.radius) >= 16 && chips.pressed === "true", JSON.stringify([chips.radius, chips.pressed]));

// 2. The lit chip looks different from the unlit ones (fill, not colour-only nuance).
const lit = await page.evaluate(() => {
  const nav = document.querySelector<HTMLElement>("#chips-row [data-yadad-saved-filters]")!;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  const style = (b: HTMLButtonElement) => {
    const s = getComputedStyle(b);
    return { bg: s.backgroundColor, pressed: b.getAttribute("aria-pressed") };
  };
  const on = buttons.find((b) => b.getAttribute("aria-pressed") === "true")!;
  const off = buttons.find((b) => b.getAttribute("aria-pressed") === "false")!;
  return { on: style(on), off: style(off), label: nav.getAttribute("aria-label") };
});
check("lit chip fills; unlit chip does not", lit.on.bg !== lit.off.bg && lit.label === "Saved filters", JSON.stringify(lit));

// 3. Batch composer: hairline between rows, controls present, keyboard order top-to-bottom.
const batch = await page.evaluate(() => {
  const state = document.querySelector<HTMLElement>("#batch-composer")!;
  const rows = [...state.querySelectorAll<HTMLElement>("[data-yadad-batch-row]")];
  const second = getComputedStyle(rows[1]!);
  const focusables = [...state.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")];
  const tops = focusables.map((el) => el.getBoundingClientRect().top + el.getBoundingClientRect().left * 1e-6);
  const sorted = [...tops].sort((a, b) => a - b);
  return {
    rows: rows.length,
    hairline: `${second.borderTopWidth} ${second.borderTopStyle}`,
    hairlineColor: second.borderTopColor,
    hasAdd: state.querySelector('[data-yadad-batch-controls] button')?.textContent,
    count: state.querySelector("[data-yadad-batch-count]")?.textContent,
    tabOrderOk: tops.every((t, i) => t === sorted[i]),
  };
});
check("two batch rows on a token hairline", batch.rows === 2 && batch.hairline === "1px solid", JSON.stringify([batch.hairline, batch.hairlineColor]));
check("“+ another” and the row count render", batch.hasAdd === "+ another" && batch.count === "2 rows", JSON.stringify([batch.hasAdd, batch.count]));
check("keyboard order runs top-to-bottom", batch.tabOrderOk);

// 4. Checklist: ticked row strikes through; pending row does not; box thumb-sized.
const checklist = await page.evaluate(() => {
  const root = document.querySelector<HTMLElement>("#checklist-rows [data-yadad-sub-records]")!;
  const rows = [...root.querySelectorAll<HTMLElement>("tr[data-part='row']")];
  const deco = rows.map((r) => getComputedStyle(r).textDecorationLine);
  const box = root.querySelector<HTMLInputElement>("input[type=checkbox]")!;
  const s = getComputedStyle(box);
  return {
    deco,
    boxW: parseFloat(s.inlineSize) || parseFloat(s.width),
    status: root.querySelector("[data-yadad-sub-records-status]")?.getAttribute("role"),
    add: !!root.querySelector('[data-yadad-sub-record-add] input') && !!root.querySelector('[data-yadad-sub-record-add] button'),
  };
});
check("ticked row strikes through, pending row does not", JSON.stringify(checklist.deco) === JSON.stringify(["line-through", "none"]), JSON.stringify(checklist.deco));
check("tick box is thumb-sized (>=20px)", checklist.boxW >= 20, `${checklist.boxW}px`);
check("status line is a live region and the add-step has input + button", checklist.status === "status" && checklist.add, JSON.stringify([checklist.status, checklist.add]));

// 5. axe, scoped to the new states.
await page.addScriptTag({ content: axeSource });
const scoped = ["#chips-row", "#chips-row-all-lit", "#chips-row-phone", "#batch-composer", "#checklist-rows"];
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
