/**
 * Shared layout audit over the whole gallery (UI-polish round, card 34a).
 *
 * Runs the probe in gallery/check/lib/layout-audit.ts over every gallery
 * section at 1280x800, 390x844 touch and 320x568, in light and dark, and
 * exits non-zero on any finding that is not on the allow-list below. Each
 * allow-list entry says WHY the pattern is intended — a green run with an
 * unexplained allow-list is not a pass.
 *
 * The probe also self-tests: every seeded regression (see the lib header)
 * must come back as a finding naming the component part, and a clean re-run
 * after the seeds must be empty. A probe that silently passes on a broken
 * page is the failure mode this check exists to prevent.
 *
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/layout-audit.ts
 *
 * Exits non-zero on failure. PLAYWRIGHT_EXECUTABLE_PATH points at a
 * different Chromium. Optional: LAYOUT_AUDIT_JSON=<dir> writes the raw
 * findings per run to <dir>/layout-<vp><scheme>[-open].json (the audit
 * trail for the card).
 */
import { chromium, type Page } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { auditLayout, type LayoutFinding } from "./lib/layout-audit.ts";

const url = process.env.GALLERY_URL || "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};
const jsonDir = process.env.LAYOUT_AUDIT_JSON;

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail: string): void => {
  results.push({ name, ok, detail });
};

// The gallery's own chrome (controls, table of contents, the section-heading
// chain) is page furniture, not the component set — the probe audits the
// component demo boxes only. `.gallery > .state`, `section > .state` are the
// demo boxes; `h1/h2/nav/.note` are chrome.
const SCOPE = "div.gallery";
const EXCLUDE = "nav, h1, h2, .note";

/**
 * Allow-list: findings that are the intended design. Every entry states why.
 * Matched as `defect` + `component` + `part` (part "" = any) + text prefix.
 */
const ALLOW: Array<{ defect: string; component: string; part?: string; text?: string; reason: string }> = [
  {
    defect: "V2",
    component: "table",
    part: "root",
    reason: "a table genuinely wider than the screen scrolls sideways inside its own wrapper (plan V4: the page never does) — the deliberate scroller for the table region",
  },
  {
    defect: "V2",
    component: "board",
    part: "columns",
    reason: "the board's column strip is the deliberate horizontal scroller; many-columns is exactly this case and each column scrolls on its own",
  },
  {
    defect: "V2",
    component: "tabs",
    part: "list",
    reason: "a tab list wider than the screen scrolls internally (tabs-keyboard.ts is the contract); the alternative — shrinking tabs — breaks the 44px targets",
  },
  {
    defect: "V2",
    component: "reference",
    part: "listbox",
    reason: "the open combobox list is a bounded, deliberate listbox scroller (64px option rows × up to 40 options) — a listbox scrolls, the page does not",
  },
  {
    defect: "V2",
    component: "dialog",
    part: "body",
    reason: "the dialog body owns overflow at phone width and 200% text (card comment in dialog.css) so the footer buttons stay reachable — one deliberate scroller per dialog",
  },
  {
    defect: "V2",
    component: "calendar",
    part: "day",
    reason: "an agenda day scrolls its own entries past the cap inside the day box; the page never scrolls for it (31e sticky contract)",
  },
  {
    defect: "V1",
    component: "board",
    part: "move-panel",
    reason: "the Move-to panel sits inside a fixed-height board column and scrolls itself so Cancel stays reachable — nested on purpose, board.css owns the contract",
  },
  {
    defect: "V1",
    component: "reference",
    part: "listbox",
    reason: "the combobox listbox is under the 240px tiny-box line on purpose (16 space-4s): an option list that grew past the viewport would cover the field being typed in",
  },
  {
    defect: "V1",
    component: "table",
    part: "root",
    reason: "a wide table's wrapper is narrower than 200px only inside the gallery's 320px phone-frame demos; the scroll is the table's own and intended",
  },
  {
    defect: "V7",
    component: "boolean",
    part: "input",
    reason: "the checklist box is the documented thumb-sized default (RFC 0009 item 6 / 31c: --yadad-boolean-size = 1.5x space-4 = 24px) — a host that needs the full 44px row raises --yadad-boolean-size or wraps the input in a field-frame label; the gallery demo keeps the documented default on purpose",
  },
  {
    defect: "V1",
    component: "board",
    part: "cards",
    reason: "each column's card list owns its vertical scroll under --yadad-board-column-max-height (board.css), nested inside the columns strip's horizontal scroll on purpose — that is the board's pinned-header contract (31), one scroller per axis per region",
  },
  {
    defect: "V2",
    component: "calendar",
    part: "navigator",
    reason: "the phone week-map owns its horizontal scroll by design (calendar.css, card 32a): seven 44px tracks need 308px against a 262px content box at 320, so the map scrolls and every day button keeps the 44px tap floor — the component scrolls, the page never does",
  },
];

const allowed = (f: LayoutFinding): string | null => {
  for (const a of ALLOW) {
    if (a.defect !== f.defect) continue;
    if (a.component !== f.component) continue;
    if (a.part !== undefined && a.part !== "" && a.part !== f.part) continue;
    if (a.text !== undefined && !f.text.startsWith(a.text)) continue;
    return a.reason;
  }
  return null;
};

const runProbe = (page: Page, seeds: string[]): Promise<LayoutFinding[]> =>
  page.evaluate(auditLayout, { scope: SCOPE, exclude: EXCLUDE, seeds });

// Open the interactive surfaces the probe should see: every combobox
// (reference) listbox, every closed table "Actions" overflow, every Earlier
// fold and calendar navigator grabber, every closed dialog. Clicking through
// the DOM is what the gallery checks already do; React sees the events.
const openSurfaces = (page: Page): Promise<number> =>
  page.evaluate(() => {
    let n = 0;
    for (const el of Array.from(document.querySelectorAll('[data-yadad="reference"] [data-part="input"][role="combobox"]'))) {
      (el as HTMLElement).click();
      n++;
    }
    for (const el of Array.from(document.querySelectorAll('[data-part="actions-trigger"]'))) {
      if (el.getAttribute("aria-expanded") !== "true") {
        (el as HTMLElement).click();
        n++;
      }
    }
    for (const el of Array.from(document.querySelectorAll('[data-part="navigator-toggle"], [data-part="earlier-toggle"]'))) {
      (el as HTMLElement).click();
      n++;
    }
    for (const el of Array.from(document.querySelectorAll("#dialog-open button, #dialog-confirm button, #dialog-confirm-subject button"))) {
      if (el.textContent === "Open dialog" || el.textContent === "Open confirmation") {
        (el as HTMLElement).click();
        n++;
      }
    }
    return n;
  });

const browser = await chromium.launch(launch);
if (jsonDir) mkdirSync(jsonDir, { recursive: true });

const VIEWPORTS: Array<{ id: string; width: number; height: number; touch: boolean }> = [
  { id: "1280", width: 1280, height: 800, touch: false },
  { id: "390", width: 390, height: 844, touch: true },
  { id: "320", width: 320, height: 568, touch: true },
];

for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".controls button", { hasText: theme }).click({ force: true });
    await page.waitForTimeout(150);
    const run = `vp${vp.id} ${theme}${vp.touch ? " touch" : ""}`;

    // closed surfaces
    const closed = await runProbe(page, []);
    if (jsonDir) writeFileSync(`${jsonDir}/layout-${vp.id}-${theme}.json`, JSON.stringify(closed, null, 1));
    const closedBad = closed.filter((f) => allowed(f) === null);
    check(
      `${run}: probe clean (closed surfaces)`,
      closedBad.length === 0,
      closedBad.map((f) => `${f.defect} ${f.component}/${f.part} ${f.selector} "${f.text}" — ${f.actual} (${f.detail})`).join("\n     "),
    );

    // opened surfaces (listboxes, actions panels, dialogs, folds)
    const opened = await openSurfaces(page);
    await page.waitForTimeout(150);
    const openedFindings = await runProbe(page, []);
    if (jsonDir) writeFileSync(`${jsonDir}/layout-${vp.id}-${theme}-open.json`, JSON.stringify(openedFindings, null, 1));
    const openedBad = openedFindings.filter((f) => allowed(f) === null);
    check(
      `${run}: probe clean (${opened} surfaces opened)`,
      openedBad.length === 0,
      openedBad.map((f) => `${f.defect} ${f.component}/${f.part} ${f.selector} "${f.text}" — ${f.actual} (${f.detail})`).join("\n     "),
    );
    await ctx.close();
  }
}

// --- the probe must catch each seeded regression (390 touch) ----------------
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const seeds: Array<[string, string, string]> = [
    ["tiny-scroll", "board cards list becomes a 120px scroll box", "V1"],
    ["panel-scrolls", "a panel body overflows its fixed height", "V2"],
    ["one-letter-text", "a section title squeezes to one letter per line", "V3"],
    ["page-wide", "a 5000px element overflows the page", "V4"],
    ["clip-label", "field labels clip long text with no title", "V5"],
    ["overlap", "two buttons stack on top of each other", "V6"],
    ["small-target", "buttons collapse to 20px tall", "V7"],
    ["small-input", "text inputs drop to 12px font", "V7"],
    ["zero-part", "the count value paints a 0-wide box", "V12"],
  ];
  // Baseline first: a seed "passes" only when it ADDS a finding of the
  // expected defect, not when an unrelated pre-existing finding happens to
  // carry the same defect id. Findings are keyed by everything but `actual`.
  const keyOf = (f: LayoutFinding): string =>
    `${f.defect}|${f.component}|${f.part}|${f.selector}|${f.text}`;
  const baseline = await runProbe(page, []);
  const baselineKeys = new Set(baseline.map(keyOf));

  for (const [seed, what, defect] of seeds) {
    const findings = await page.evaluate(auditLayout, { scope: SCOPE, exclude: EXCLUDE, seeds: [seed] });
    const fresh = findings.filter((f) => !baselineKeys.has(keyOf(f)));
    const hits = fresh.filter((f) => f.defect === defect);
    check(`seed ${seed} (${what}) is caught as ${defect} and names a part`,
      hits.length > 0 && hits.some((f) => f.component || f.part || f.selector),
      hits.length === 0 ? `probe passed on a broken page (${fresh.length} fresh findings of other kinds: ${fresh.map((f) => f.defect).join(",")})` : hits.map((f) => `${f.component}/${f.part} ${f.selector}`).join(" | "));
  }
  const after = await runProbe(page, []);
  // Seed styles inject into <head> and must be gone when the call returns:
  // the post-seed run must equal the baseline exactly, allow-list aside.
  const afterLeaked = after.filter((f) => !baselineKeys.has(keyOf(f)));
  check("probe is clean again after the seeds are removed", afterLeaked.length === 0, afterLeaked.map((f) => `${f.defect} ${f.component}/${f.part} ${f.selector}`).join(" | "));
  await ctx.close();
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) {
    failed++;
    console.log(`FAIL ${r.name}\n     ${r.detail}`);
  }
}
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
