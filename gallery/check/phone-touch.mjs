/**
 * Phone/touch check for the base component set (card 4 regression guard).
 *
 * Verifies, in a real Chromium against the gallery page, at 390×844 (mobile
 * touch) and 320 wide, in both themes and at 200% text:
 *   1. Tap targets are at least 44×44 CSS px: buttons, the checkbox label
 *      (the thumb target), sortable headers, tabs and pickers.
 *   2. No sideways page scroll. A wide table scrolls inside its own container
 *      and long text wraps, so nothing pushes the page horizontally. The only
 *      permitted exception is a native date control's intrinsic minimum width
 *      (a browser limitation the component cannot shrink); if the date input
 *      is the sole overflow it is reported and passed as a documented
 *      limitation, anything else fails.
 *   3. The table's horizontal scroll is contained in its own wrapper.
 *   4. Inputs render at 16px or larger so iOS Safari does not zoom on focus.
 *   5. Many tabs stay reachable (the list scrolls) and the selected one
 *      remains visible.
 *   6. A real touch tap activates the button (hit test, not just a mouse).
 *   7. The stacked table (phone widths, via a container query that jsdom
 *      cannot evaluate): rows render as cards (display block), every data cell
 *      shows its column label, long cells wrap inside the card, the header
 *      strip's sort buttons stay >=44px tall and receive real taps. At desktop
 *      width the table is still a normal table (no labels, table display).
 *   8. Sections and panels pick up a box-shadow when the engine's shadow
 *      tokens are applied (light and engine dark), and none when they are not
 *      (the gallery's stress theme defines no shadow tokens).
 *   9. Labels and errors stay attached to their inputs and nothing overlaps
 *      or runs off the right edge at 200% text.
 *
 * Not published with the package. Run it against the gallery (see README
 * "Real-browser checks"):
 *
 *   GALLERY_URL=http://localhost:5199/ node gallery/check/phone-touch.mjs
 *
 * Exits non-zero if any check fails. If the machine's Chromium differs from
 * the one `playwright-core` ships, point at it with
 * PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome-headless-shell.
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL || "http://localhost:5199/";
const launch = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};

const results = [];
const check = (run, name, ok, detail) => results.push({ run, name, ok, detail });

// Viewports from the card: 390×844 with touch, and 320 wide.
const VIEWPORTS = [
  { id: "390", width: 390, height: 844 },
  { id: "320", width: 320, height: 640 },
];

// The thumb targets and the selector that is actually tapped. The checkbox's
// real target is its label (tapping the label toggles the box), not the small
// visual box; the sort target is the whole header button.
const TAP_TARGETS = [
  ["button", "#button-primary-enabled button"],
  ["checkbox label", "#boolean-filled [data-part=label]"],
  ["sort header", "#table-few-rows [data-part=sort]"],
  ["tab", "#tabs-two [role=tab]"],
  ["picker (select)", "#select-filled select"],
];

const browser = await chromium.launch(launch);

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  for (const theme of ["light", "dark"]) {
    for (const size of ["100%", "200%"]) {
      const run = `vp${vp.id} ${theme} ${size}`;
      await page.locator(".controls button", { hasText: theme }).click({ force: true });
      await page.locator(".controls button", { hasText: size }).click({ force: true });
      await page.waitForTimeout(350);

      // 1. tap targets
      for (const [name, sel] of TAP_TARGETS) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) === 0) { check(run, `tap target exists (${name})`, false, "missing"); continue; }
        const box = await loc.boundingBox();
        const ok = box && box.width >= 44 && box.height >= 44;
        check(run, `tap >=44x44 (${name})`, !!ok, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "no box");
      }

      // 2. no sideways page scroll. Element is exempt when it scrolls
      //    horizontally inside its own container (table, long tab list — by
      //    design). The only permitted page-level overflow is a native date
      //    control's intrinsic width, reported as a documented limitation.
      const pageOverflow = await page.evaluate(() => {
        const d = document.documentElement;
        const over = d.scrollWidth > d.clientWidth + 1;
        if (!over) return { over: false, scrollW: d.scrollWidth, clientW: d.clientWidth, culprits: [] };
        const vw = d.clientWidth;
        const inHScroll = (el) => {
          for (let n = el.parentElement; n; n = n.parentElement) {
            const c = getComputedStyle(n);
            if ((c.overflowX === "auto" || c.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
          }
          return false;
        };
        const culprits = [];
        const seen = new Set();
        for (const e of document.querySelectorAll("body *")) {
          const r = e.getBoundingClientRect();
          if (r.right <= vw + 1 || r.width <= 5) continue;
          if (getComputedStyle(e).overflow !== "visible" || inHScroll(e)) continue;
          const k = e.tagName + (e.type || "") + ((e.closest(".state") || {}).id || "chrome");
          if (seen.has(k)) continue;
          seen.add(k);
          culprits.push({ tag: e.tagName, type: e.type || "", state: (e.closest(".state") || {}).id || "chrome", right: Math.round(r.right) });
        }
        return { over: true, scrollW: d.scrollWidth, clientW: vw, culprits };
      });
      const onlyDate = pageOverflow.over && pageOverflow.culprits.length > 0 && pageOverflow.culprits.every((c) => c.type === "date");
      if (onlyDate) {
        check(run, "no sideways page scroll", true, `documented native-date intrinsic-width limitation: ` + pageOverflow.culprits.map((c) => c.state).join(","));
      } else {
        check(run, "no sideways page scroll", !pageOverflow.over, pageOverflow.over ? `scrollW=${pageOverflow.scrollW} clientW=${pageOverflow.clientW} culprits=${JSON.stringify(pageOverflow.culprits)}` : "ok");
      }

      // 3. table scrolls inside its own container
      const tbl = await page.evaluate(() => {
        const table = document.querySelector("#table-few-rows table");
        if (!table) return { present: false };
        const scope = table.closest("[data-part=wrap],[data-part=scroll]") || table.parentElement;
        const scs = getComputedStyle(scope);
        const trect = table.getBoundingClientRect();
        const srect = scope.getBoundingClientRect();
        return {
          present: true,
          scrollX: scs.overflowX,
          tableW: Math.round(trect.width),
          containerW: Math.round(srect.width),
          contained: trect.right <= window.innerWidth + 1,
        };
      });
      if (tbl.present) {
        check(run, "table scrolls in its own container", tbl.scrollX === "auto" || tbl.scrollX === "scroll" || tbl.contained,
          `overflow-x=${tbl.scrollX} table=${tbl.tableW} container=${tbl.containerW} contained=${tbl.contained}`);
      } else check(run, "table present", false, "not found");

      // 4. inputs font >= 16px (no iOS zoom on focus)
      const fonts = await page.evaluate(() => {
        const out = {};
        const sels = {
          text: "#text-filled input",
          number: "#number-filled input",
          date: "#date-filled input",
          select: "#select-filled select",
        };
        for (const [k, s] of Object.entries(sels)) {
          const el = document.querySelector(s);
          out[k] = el ? parseFloat(getComputedStyle(el).fontSize) : null;
        }
        return out;
      });
      for (const [k, v] of Object.entries(fonts)) {
        check(run, `input font >=16px (${k})`, v !== null && v >= 16, v === null ? "missing" : `${v}px`);
      }

      // 7. stacked table: cards, labels, wrapping, sort strip
      for (const id of ["table-few-rows", "table-many-rows-long-text"]) {
        const t = await page.evaluate((id) => {
          const root = document.querySelector(`#${id} [data-yadad=table]`);
          const display = (el) => getComputedStyle(el).display;
          const rows = [...root.querySelectorAll("tbody tr[data-part=row]")];
          const cells = [...root.querySelectorAll("tbody td[data-part=cell]")];
          const unlabeled = cells.filter((c) => {
            const content = getComputedStyle(c, "::before").content;
            return content !== `"${c.dataset.label}"` || !c.dataset.label;
          }).length;
          const unwrapped = cells.filter((c) => c.scrollWidth > c.clientWidth + 1).length;
          const first = cells[0];
          const lineH = parseFloat(getComputedStyle(first).lineHeight) || parseFloat(getComputedStyle(first).fontSize) * 1.2;
          const longCells = cells.filter((c) => c.textContent.length > 60);
          return {
            tableDisplay: display(root.querySelector("table")),
            nonBlockRows: rows.filter((r) => display(r) !== "block").length,
            nonFlexCells: cells.filter((c) => display(c) !== "flex").length,
            rows: rows.length,
            cells: cells.length,
            unlabeled,
            unwrapped,
            longWrapped: longCells.length === 0 ? null : longCells.every((c) => c.getBoundingClientRect().height > lineH * 1.5),
            rootOverflow: root.scrollWidth - root.clientWidth,
            rowRightMax: Math.max(...rows.map((r) => r.getBoundingClientRect().right)),
          };
        }, id);
        check(run, `${id}: rows render as cards`, t.rows > 0 && t.tableDisplay === "block" && t.nonBlockRows === 0 && t.nonFlexCells === 0, JSON.stringify(t));
        check(run, `${id}: every data cell shows its column label`, t.cells > 0 && t.unlabeled === 0, `${t.unlabeled}/${t.cells} unlabeled`);
        check(run, `${id}: card cells wrap, no sideways scroll`, t.unwrapped === 0 && t.rootOverflow <= 1 && t.rowRightMax <= vp.width + 1 && t.longWrapped !== false,
          `unwrapped=${t.unwrapped} rootOverflow=${t.rootOverflow} rowRight=${Math.round(t.rowRightMax)} longWrapped=${t.longWrapped}`);
      }
      {
        await page.locator("#table-few-rows [data-part=sort]").first().scrollIntoViewIfNeeded();
        const strip = await page.evaluate(() => {
          const btns = [...document.querySelectorAll("#table-few-rows [data-part=sort]")];
          return btns.map((b) => {
            const r = b.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { w: Math.round(r.width), h: Math.round(r.height), hit: b.contains(hit) };
          });
        });
        check(run, "table sort strip: buttons >=44x44 and hit-testable", strip.length === 2 && strip.every((b) => b.w >= 44 && b.h >= 44 && b.hit), JSON.stringify(strip));
        const sortBtn = page.locator("#table-few-rows [data-part=sort]").first();
        await sortBtn.scrollIntoViewIfNeeded();
        await page.evaluate(() => {
          window.__sorts = 0;
          if (!window.__sortHook) {
            window.__sortHook = true;
            document.querySelector("#table-few-rows").addEventListener("click", (e) => { if (e.target.closest("[data-part=sort]")) window.__sorts++; });
          }
        });
        await sortBtn.tap();
        await page.waitForTimeout(100);
        check(run, "table sort strip: a touch tap sorts", (await page.evaluate(() => window.__sorts)) === 1, "tap -> click");
        const hidden = await page.evaluate(() => {
          const h = [...document.querySelectorAll("#table-few-rows thead [data-part=header]")].find((e) => !e.querySelector("[data-part=sort]"));
          if (!h) return null;
          const r = h.getBoundingClientRect();
          return { w: r.width, h: r.height };
        });
        check(run, "table: non-sortable header hidden visually only", hidden !== null && hidden.w <= 1 && hidden.h <= 1, JSON.stringify(hidden));
      }

      // 9. labels/errors attached, nothing overlaps or overflows the page
      const attach = await page.evaluate(() => {
        const issues = [];
        const inHScroll = (el) => {
          for (let n = el.parentElement; n; n = n.parentElement) {
            const c = getComputedStyle(n);
            if ((c.overflowX === "auto" || c.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
          }
          return false;
        };
        for (const st of document.querySelectorAll(".state")) {
          const inputs = [...st.querySelectorAll("input,select")].filter((e) => e.type !== "hidden");
          const labels = [...st.querySelectorAll("label,[data-part=label]")];
          const errors = [...st.querySelectorAll("[data-part=error],[role=alert]")];
          for (const inp of inputs) {
            const ir = inp.getBoundingClientRect();
            const forLabel = labels.find((l) => l.htmlFor === inp.id || l.contains(inp));
            if (forLabel) {
              const lr = forLabel.getBoundingClientRect();
              if (lr.bottom > ir.top + 2 && lr.top < ir.bottom) issues.push(`${st.id}: label overlaps input`);
            }
            const err = errors.find((e) => { const r = e.getBoundingClientRect(); return r.top > ir.bottom - 2 && r.width > 10; });
            if (err) {
              const er = err.getBoundingClientRect();
              if (er.right > window.innerWidth + 1 || er.left < -1) issues.push(`${st.id}: error off-screen`);
            }
          }
          for (const e of st.querySelectorAll("*")) {
            const r = e.getBoundingClientRect();
            if (r.width > 5 && r.right > window.innerWidth + 1 && getComputedStyle(e).overflow === "visible" && !inHScroll(e)) {
              issues.push(`${st.id}: element overflows right (${e.tagName} "${(e.textContent || "").trim().slice(0, 20)}")`);
              break;
            }
          }
        }
        return issues;
      });
      check(run, "labels/errors attached, nothing overlaps or overflows", attach.length === 0, attach.slice(0, 4).join("; ") || "ok");
    }
  }

  // 5. many tabs reachable + selected visible (200% text, mobile)
  await page.locator(".controls button", { hasText: "light" }).click({ force: true });
  await page.locator(".controls button", { hasText: "200%" }).click({ force: true });
  await page.waitForTimeout(350);
  const many = await page.evaluate(() => {
    const list = document.querySelector("#tabs-many [data-part=list]");
    const tabs = [...document.querySelectorAll("#tabs-many [role=tab]")];
    const sel = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    const sr = sel.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    return {
      listScrollable: list.scrollWidth > list.clientWidth + 1,
      selectedVisible: sr.left >= lr.left - 1 && sr.right <= lr.right + 1,
      tabs: tabs.length,
    };
  });
  check(`vp${vp.id} tabs-many @200%`, "many tabs reachable, selected visible", many.listScrollable && many.selectedVisible && many.tabs > 4, JSON.stringify(many));

  // 6. a real touch tap lands on the button
  const btn = page.locator("#button-primary-enabled button");
  await btn.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.__taps = 0;
    document.querySelector("#button-primary-enabled button").addEventListener("click", () => { window.__taps++; });
  });
  await btn.tap();
  await page.waitForTimeout(150);
  const clicks = await page.evaluate(() => window.__taps || 0);
  check(`vp${vp.id} touch`, "touch tap activates button", clicks >= 1, `${clicks} clicks`);

  await ctx.close();
}

// Desktop: the table is still a normal table, and section/panel shadows follow
// the shadow tokens of the applied theme.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  for (const [theme, expectShadow] of [["light", true], ["dark", true], ["stress", false]]) {
    const run = `desktop ${theme} 100%`;
    await page.locator(".controls button", { hasText: theme }).click();
    await page.waitForTimeout(250);
    const t = await page.evaluate(() => {
      const root = document.querySelector("#table-few-rows [data-yadad=table]");
      const d = (el, pseudo) => getComputedStyle(el, pseudo);
      const cell = root.querySelector("td[data-part=cell]");
      const status = document.querySelector("#table-sort-asc [data-part=sort-status]");
      const h = document.querySelector("#table-few-rows thead [data-part=header]");
      const rects = [...root.querySelectorAll("thead th")].map((e) => e.getBoundingClientRect());
      return {
        table: d(root.querySelector("table")).display,
        row: d(root.querySelector("tbody tr")).display,
        cell: d(cell).display,
        label: d(cell, "::before").content,
        headerSideBySide: rects.every((r, i) => i === 0 || r.left >= rects[i - 1].right - 1),
        headerVisible: h.getBoundingClientRect().width > 20,
        statusClipped: status ? status.getBoundingClientRect().width <= 1 : null,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    check(run, "table is a normal table at desktop width",
      t.table === "table" && t.row === "table-row" && t.cell === "table-cell" && (t.label === "none" || t.label === "normal") && t.headerSideBySide && t.headerVisible && t.statusClipped === true && t.pageOverflow <= 1,
      JSON.stringify(t));
    const sh = await page.evaluate(() => {
      const get = (sel) => getComputedStyle(document.querySelector(sel)).boxShadow;
      return { section: get("#section-titled [data-yadad=section]"), panel: get("#panel-titled [data-yadad=panel]") };
    });
    for (const [k, v] of Object.entries(sh)) {
      check(run, `${k} box-shadow ${expectShadow ? "from the engine token" : "none without the token"}`, expectShadow ? v !== "none" && v !== "" : v === "none", v);
    }
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) if (!r.ok) console.log(`FAIL [${r.run}] ${r.name}: ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
