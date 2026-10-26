// Card 23b: option labels, the colour vocabulary dot, h2 titles, and an axe
// run scoped to the affected gallery states (house rule: scope selectors to
// the exact rows; the rest of the gallery has deliberately odd states).
// Run from the repo root:
//   GALLERY_URL=http://localhost:5177/ node --experimental-strip-types --disable-warning=ExperimentalWarning gallery/check/select-labels-axe.ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const GALLERY = process.env.GALLERY_URL ?? "http://localhost:5177/";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(GALLERY, { waitUntil: "domcontentloaded" });

// 1. Picker shows labels, values stay the stored hex.
const picker = await page.evaluate(() => {
  const sel = document.querySelector<HTMLSelectElement>("#select-options-labelled select")!;
  return [...sel.options].slice(1).map((o) => [o.value, o.textContent]);
});
check("picker option text is the label", JSON.stringify(picker[1]) === JSON.stringify(["#D13438", "Work"]), JSON.stringify(picker.slice(0, 2)));

// 2. The display dot: label + slot, aria-hidden.
const dot = await page.evaluate(() => {
  const el = document.querySelector<HTMLElement>("#select-display-labelled [data-part='display']")!;
  const sw = el.querySelector<HTMLElement>("[data-part='swatch']");
  return { text: el.textContent, slot: sw?.getAttribute("data-slot") ?? null, hidden: sw?.getAttribute("aria-hidden") ?? null, bg: sw ? getComputedStyle(sw).backgroundColor : null };
});
check("display shows the label with its vocabulary dot", dot.text === "Work" && dot.slot === "1" && dot.hidden === "true", JSON.stringify(dot));
check("the dot actually paints a token-derived colour", dot.bg !== null && dot.bg !== "rgba(0, 0, 0, 0)", `bg ${dot.bg}`);

// 3. Full vocabulary: eight dots, slots 0..7, all distinct.
const allSlots = await page.evaluate(() => {
  const sws = [...document.querySelectorAll<HTMLElement>("#select-display-all-colours [data-part='swatch']")];
  return { slots: sws.map((s) => s.getAttribute("data-slot")).sort(), bgs: [...new Set(sws.map((s) => getComputedStyle(s).backgroundColor))] };
});
check("all eight vocabulary slots render", JSON.stringify(allSlots.slots) === JSON.stringify(["0", "1", "2", "3", "4", "5", "6", "7"]), JSON.stringify(allSlots.slots));
check("the slots paint distinct colours", allSlots.bgs.length === 8, `${allSlots.bgs.length} distinct`);

// 4. Off-vocabulary colour paints no dot.
const noDot = await page.evaluate(() => ({
  sw: document.querySelector("#select-display-no-dot [data-part='swatch']") === null,
  text: document.querySelector<HTMLElement>("#select-display-no-dot [data-part='display']")?.textContent,
}));
check("a colour outside the vocabulary paints no dot", noDot.sw && noDot.text === "Hot", JSON.stringify(noDot));

// 5. RFC 0008 item 12: titles are h2.
const h2 = await page.evaluate(() => ({
  panel: document.querySelector("#panel-titled [data-part='title']")?.tagName ?? null,
  board: document.querySelector('[data-part="column-heading"]')?.tagName ?? null,
}));
check("panel title renders h2", h2.panel === "H2", String(h2.panel));
check("board column heading renders h2", h2.board === "H2", String(h2.board));

// 6. FormItem.label override: the frame label is the item label, bound to the control.
const frame = await page.evaluate(() => {
  const label = document.querySelector<HTMLLabelElement>("#select-formitem-label [data-part='label']");
  const control = document.querySelector<HTMLSelectElement>("#select-formitem-label select");
  return { text: label?.textContent ?? null, for: label?.htmlFor ?? null, id: control?.id ?? null, fieldLabelStill: "List" };
});
check("form-item label replaces the field label, still bound", frame.text === "Important" && frame.for === frame.id && frame.for === "g-select-formitem", JSON.stringify(frame));

// 7. axe, scoped to the affected rows.
await page.addScriptTag({ content: axeSource });
const scoped = ["#select-options-labelled", "#select-display-labelled", "#select-display-all-colours", "#select-display-no-dot", "#select-display-plain-value", "#select-formitem-label", "#panel-titled", "#board-columns", "#tags-filled"];
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
