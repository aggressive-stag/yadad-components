/**
 * Calendar phone audit — the DOM-side assertions, self-contained.
 *
 * No imports; every constant lives INSIDE the exported function so a host
 * app can serialize just this function into its own page (Playwright
 * page.evaluate / CDP Runtime.evaluate). It returns an array of failures
 * ({name, expected, actual, detail}); an empty array means every calendar on
 * the page rendered clean. The type annotations are all erasable, so the
 * function's own text is plain JS once loaded.
 *
 * What it asserts, for every [data-yadad="calendar"] root matching
 * `rootSelector` (default: all of them):
 *   (a)  No *rendered* [data-part] element inside the root is 0 wide or 0
 *        tall. "Rendered" = checkVisibility() (skips anything hidden by
 *        display:none / visibility:hidden on itself or an ancestor), not
 *        inside an aria-hidden subtree (the drag ghost), and *has content*
 *        (text or a rendered element child) — the empty live-region span
 *        and an entries list on a day with no entries draw nothing and are
 *        not layout bugs. There is deliberately no deny-list of part names:
 *        whatever the set shows is checked, including out-of-month days
 *        that carry entries (those are shown on purpose).
 *   (a') A per-mode visibility table: parts that must be visible and parts
 *        that must be hidden. The mode (agenda vs grid) is decided per root
 *        from the root's own inline size against the same 50ch threshold the
 *        set's @container rule uses — not from the viewport, because hosts
 *        legitimately pad or frame the calendar. Cards edit this table (31d
 *        flips the date parts, 32a adds the navigator); keep it in sync.
 *   (b)  In agenda mode, each rendered content-bearing [data-part="entries"]
 *        fills >= 90% of its root's inline size. Root-relative, not
 *        viewport-relative: hosts may wrap the calendar in page padding.
 *   (c)  Every interactive control's hit target is >= 44x44 CSS px under a
 *        coarse pointer. A control inside a <label> is measured on the
 *        label: the whole label is the tap target (D5 of the plan). Day
 *        gridcells are cells, not tap targets, and are excluded.
 *
 * Regression seeds (option `seeds`, for self-testing this check):
 *   "drop-done-floor"  removes the done label's 44px floor
 *   "zero-part"        forces every entries list to width: 0
 *   "swap-date-parts"  puts the agenda back on the pre-31d date parts
 *                      (day-date shown, day-number hidden, weekday hidden)
 *   "clip-grid"        restores the grid's overflow:hidden — the 31e
 *                      sticky-killer: sticky inside a non-scroll overflow:
 *                      hidden ancestor silently never sticks
 *   "clear-band"       makes the pinned head's background transparent, so
 *                      scrolled entries smear through the band
 *   "flat-ladder"      the pre-31f agenda restored: one flat 0.875rem size
 *                      for head and entry, no row floor, no entry gap
 *   "mute-today"       today's day number loses its accent colour
 *
 * Usage (Playwright):
 *   const failures = await page.evaluate(auditCalendarPhone, { seeds: [] });
 */

export type CalendarPhoneFailure = { name: string; expected: string; actual: string; detail: string };

type VisibilityRow = { agenda: boolean; show: string[]; hide: string[]; showWhenEntries?: string[] };

export type CalendarPhoneAuditOptions = { minTap?: number; seeds?: string[]; rootSelector?: string };

function auditCalendarPhone(options?: CalendarPhoneAuditOptions): CalendarPhoneFailure[] {
  const failures: CalendarPhoneFailure[] = [];
  const minTap = options && options.minTap ? options.minTap : 44;
  const seeds = (options && options.seeds) || [];
  const rootSelector = (options && options.rootSelector) || '[data-yadad="calendar"]';

  // Which parts must be visible / hidden per mode. Agenda = the phone
  // reflow: the weekday row and the verbose full-date hide, the short
  // weekday + the bold day number show — the head reads "Thu 29" (card 31d;
  // before it, the agenda showed day-date and hid day-number). Grid = the
  // 7-column month: the reverse.
  // `showWhenEntries` scopes a must-be-visible rule to days that contain an
  // entry — out-of-month days *without* entries are hidden by the reflow on
  // purpose and are not checked.
  const VISIBILITY: { agenda: VisibilityRow; grid: VisibilityRow } = {
    agenda: {
      agenda: true,
      show: ["day-weekday", "day-number", "grid"],
      hide: ["weekday-row", "day-date"],
      showWhenEntries: ["day"],
    },
    grid: {
      agenda: false,
      show: ["weekday-row", "day-number", "grid", "day"],
      hide: ["day-date", "day-weekday"],
    },
  };

  // Parts that must offer a 44x44 hit target under a coarse pointer.
  const INTERACTIVE_PARTS: string[] = [
    "nav-previous", "nav-today", "nav-next", "mode-button",
    "entry-open", "move-trigger", "overflow",
    "move-confirm", "move-cancel", "action", "actions-trigger", "actions-cancel",
  ];

  // A short human label for a failing element: nearest day/date + text.
  const labelOf = (el: Element): string => {
    const day = el.closest('[data-part="day"]');
    const date = day ? ` day=${day.getAttribute("data-date")}` : "";
    const text = (el.textContent || "").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}[data-part=${el.getAttribute("data-part")}]${date}${text ? ` "${text}"` : ""}`;
  };

  // Regression seeds: injected style tags, removed again after the audit so
  // the same page can be audited again clean.
  const seedSheets: HTMLStyleElement[] = [];
  const seed = (css: string): void => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    seedSheets.push(style);
  };
  if (seeds.includes("drop-done-floor")) {
    seed('[data-yadad="calendar"] [data-part="done"] { min-block-size: 0 !important; min-inline-size: 0 !important; }');
  }
  if (seeds.includes("zero-part")) {
    seed('[data-yadad="calendar"] [data-part="entries"] { width: 0 !important; }');
  }
  if (seeds.includes("swap-date-parts")) {
    // The pre-31d agenda restored: the verbose full-date shown, the compact
    // number and the short weekday hidden. Every one of the three is wrong
    // now — the agenda reads "Thu 29" from day-weekday + day-number and the
    // full form lives only in the aria-label / entries list.
    seed(
      '@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day-date"] { display: inline !important; } ' +
      '[data-yadad="calendar"] [data-part="day-number"], [data-yadad="calendar"] [data-part="day-weekday"] { display: none !important; } }'
    );
  }

  if (seeds.includes("clip-grid")) {
    // The pre-31e grid restored: the agenda's sticky head inside an
    // overflow:hidden grid silently never sticks (premise 1).
    seed('[data-yadad="calendar"] [data-part="grid"] { overflow: hidden !important; }');
  }
  if (seeds.includes("clear-band")) {
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day-head"] { background: transparent !important; } }');
  }
  if (seeds.includes("flat-ladder")) {
    // The pre-31f agenda restored: one flat 14px size everywhere and no
    // row floor — the list has no header/entry/meta ladder and rows sit
    // below the 44px band (M11's failure mode).
    seed(
      '@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day-head"], ' +
      '[data-yadad="calendar"] [data-part="entry-content"] { font-size: 0.875rem !important; } ' +
      '[data-yadad="calendar"] [data-part="entry-open"], [data-yadad="calendar"] [data-part="entry-static"] { min-block-size: 0 !important; } ' +
      '[data-yadad="calendar"] [data-part="entries"] { gap: 0 !important; } }'
    );
  }
  if (seeds.includes("mute-today")) {
    // Today's accent treatment gone: the day number renders in the plain
    // text colour again (the badge alone is not what the card asked for).
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day"][data-today="true"] [data-part="day-number"] { color: inherit !important; } }');
  }

  const roots = Array.from(document.querySelectorAll(rootSelector));

  for (let i = 0; i < roots.length; i++) {
    const root = roots[i] as HTMLElement;
    const title = root.querySelector('[data-part="title"]');
    const tag = `${i}[${title ? title.textContent.trim() : "calendar"}]`;

    if (!root.checkVisibility()) continue; // the whole root is hidden: nothing rendered
    const rendered = (el: Element): boolean =>
      el.checkVisibility() && !el.closest('[aria-hidden="true"]') && !el.closest('[hidden]');
    // An element draws something when it has its own direct text (a text
    // node child) or a *rendered* descendant that does: the empty
    // live-region span, a day's empty entries list, and a week row whose
    // every day the reflow hid (the hidden cells still carry textContent!)
    // draw nothing and are not layout bugs, so zero-size checks skip them.
    const hasContent = (el: Element): boolean => {
      for (const n of Array.from(el.childNodes)) {
        if (n.nodeType === 3 && (n.textContent || "").trim().length > 0) return true; // TEXT_NODE
      }
      return Array.from(el.children).some((c) => rendered(c) && hasContent(c));
    };

    // Mode is decided from the root's own width against the same 50ch
    // threshold the set's @container rule uses (the probe inherits the
    // root's font, exactly like the container query's ch unit).
    const rootBox = root.getBoundingClientRect();
    const probe = document.createElement("span");
    probe.textContent = "0000000000";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;";
    root.appendChild(probe);
    const chWidth = probe.getBoundingClientRect().width / 10 || 8;
    probe.remove();
    const inAgenda = rootBox.width <= chWidth * 50;
    const table = inAgenda ? VISIBILITY.agenda : VISIBILITY.grid;
    const mode = inAgenda ? "agenda" : "grid";

    // (a) no rendered, content-bearing [data-part] is zero-size
    for (const el of root.querySelectorAll("[data-part]")) {
      if (!rendered(el) || !hasContent(el)) continue;
      const box = el.getBoundingClientRect();
      const part = el.getAttribute("data-part");
      if (box.width < 1) {
        failures.push({ name: `${tag} ${part} has zero width`, expected: ">= 1px", actual: `${box.width}px`, detail: labelOf(el) });
      }
      if (box.height < 1) {
        failures.push({ name: `${tag} ${part} has zero height`, expected: ">= 1px", actual: `${box.height}px`, detail: labelOf(el) });
      }
    }

    // (a') per-mode visibility table. A part inside a hidden out-of-month
    // day (hidden without entries) inherits its day's visibility on purpose.
    const inHiddenEmptyDay = (el: Element): boolean => {
      const day = el.closest('[data-part="day"]');
      return !!day && !day.checkVisibility() && !day.querySelector('[data-part="entry"]');
    };
    for (const part of table.show) {
      for (const el of root.querySelectorAll(`[data-part="${part}"]`)) {
        if (el.closest('[aria-hidden="true"]') || inHiddenEmptyDay(el)) continue;
        if (!el.checkVisibility()) {
          failures.push({ name: `${tag} ${part} must be visible (${mode} mode)`, expected: "visible", actual: "hidden", detail: labelOf(el) });
        }
      }
    }
    for (const part of table.hide) {
      for (const el of root.querySelectorAll(`[data-part="${part}"]`)) {
        if (el.closest('[aria-hidden="true"]') || inHiddenEmptyDay(el)) continue;
        if (el.checkVisibility()) {
          failures.push({ name: `${tag} ${part} must be hidden (${mode} mode)`, expected: "hidden", actual: "visible", detail: labelOf(el) });
        }
      }
    }
    if (table.showWhenEntries && table.showWhenEntries.includes("day")) {
      for (const day of root.querySelectorAll('[data-part="day"]')) {
        if (!day.querySelector('[data-part="entry"]')) continue;
        if (!day.checkVisibility()) {
          failures.push({
            name: `${tag} day with entries must be visible (${mode} mode)`,
            expected: "visible",
            actual: "hidden",
            detail: day.getAttribute("data-date") || "",
          });
        }
      }
    }

    // (b) in agenda mode the entries list fills the root's inline size
    if (inAgenda) {
      // (e) card 31e: the pinned day head. position:sticky alone is not
      // enough — inside a non-scroll overflow:hidden ancestor it never
      // sticks, so the grid's own clip must be gone; and the band must be
      // opaque or scrolled entries smear through it.
      const grid = root.querySelector('[data-part="grid"]');
      if (grid) {
        const gs = getComputedStyle(grid);
        if (gs.overflowX !== "visible" || gs.overflowY !== "visible") {
          failures.push({ name: `${tag} agenda grid must not clip (sticky needs it)`, expected: "overflow visible", actual: `${gs.overflowX}/${gs.overflowY}`, detail: labelOf(grid) });
        }
      }
      let headChecked = 0;
      for (const head of root.querySelectorAll('[data-part="day-head"]')) {
        if (!rendered(head)) continue;
        headChecked++;
        const hs = getComputedStyle(head);
        if (hs.position !== "sticky") {
          failures.push({ name: `${tag} day-head must pin in the agenda`, expected: "sticky", actual: hs.position, detail: labelOf(head) });
        }
        if (parseFloat(hs.insetBlockStart) < 0 || Number.isNaN(parseFloat(hs.insetBlockStart))) {
          failures.push({ name: `${tag} day-head inset-block-start`, expected: ">= 0 (var(--yadad-calendar-sticky-top, 0px))", actual: hs.insetBlockStart, detail: labelOf(head) });
        }
        const bg = hs.backgroundColor;
        const alpha = bg.startsWith("rgba") ? parseFloat(bg.slice(bg.lastIndexOf(",") + 1, bg.lastIndexOf(")"))) : 1;
        if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || alpha < 1) {
          failures.push({ name: `${tag} day-head band must be opaque`, expected: "surface background", actual: bg, detail: labelOf(head) });
        }
        if (parseFloat(hs.borderBottomWidth) < 1) {
          failures.push({ name: `${tag} day-head carries the row hairline`, expected: ">= 1px bottom rule", actual: hs.borderBottomWidth, detail: labelOf(head) });
        }
      }
      if (headChecked === 0) {
        failures.push({ name: `${tag} agenda has no rendered day-head`, expected: ">= 1", actual: "0", detail: labelOf(grid ?? root) });
      }
      const anyDay = root.querySelector('[data-part="day"]');
      if (anyDay && parseFloat(getComputedStyle(anyDay).scrollMarginBlockStart) <= 0) {
        failures.push({ name: `${tag} day scroll-margin for the band`, expected: "> 0 (scroll-today clears the band)", actual: getComputedStyle(anyDay).scrollMarginBlockStart, detail: labelOf(anyDay) });
      }
      // (f) card 31f: the list rhythm — row band, entry gap, three-step
      // ladder, today's accent number. All computed-style checks, so a
      // host that re-tokens deliberately still passes; what fails is the
      // pre-31f flat layout and anything that fell under the band.
      const px = (v: string): number => parseFloat(v) || 0;
      let rhythmChecked = 0;
      for (const ulEl of root.querySelectorAll('[data-part="entries"]')) {
        if (!rendered(ulEl) || !hasContent(ulEl)) continue;
        if (px(getComputedStyle(ulEl).rowGap) < 4) {
          failures.push({ name: `${tag} entries gap in the agenda`, expected: ">= 4px (var(--yadad-calendar-entry-gap))", actual: getComputedStyle(ulEl).rowGap, detail: labelOf(ulEl) });
        }
        for (const row of ulEl.querySelectorAll(':scope > [data-part="entry"] [data-part="entry-open"], :scope > [data-part="entry"] [data-part="entry-static"]')) {
          if (!rendered(row)) continue;
          rhythmChecked++;
          const h = row.getBoundingClientRect().height;
          // The band constrains the token floor, not the text volume: a
          // row whose content wraps past title+meta is legitimately taller
          // (the card's no-wrap guarantee is for a typical title at the
          // 334px root, which the ladder run asserts separately).
          const contentEl = row.querySelector('[data-part="entry-content"]');
          const lines = contentEl
            ? Array.from(contentEl.children).reduce((n, k) => {
                const klh = parseFloat(getComputedStyle(k).lineHeight) || parseFloat(getComputedStyle(k).fontSize) * 1.2;
                return n + Math.max(1, Math.round(k.getBoundingClientRect().height / klh));
              }, 0)
            : 0;
          if (h < 44) {
            failures.push({ name: `${tag} entry row height band`, expected: ">= 44px (var(--yadad-calendar-row-min))", actual: `${Math.round(h)}px`, detail: labelOf(ulEl) });
          } else if (lines <= 2 && h > 56) {
            failures.push({ name: `${tag} entry row height band`, expected: "<= 56px for a title+meta row", actual: `${Math.round(h)}px (${lines} lines)`, detail: labelOf(ulEl) });
          }
        }
        const content = ulEl.querySelector('[data-part="entry-content"]');
        if (content) {
          const entryFs = px(getComputedStyle(content).fontSize);
          if (entryFs < 16) {
            failures.push({ name: `${tag} entry size (ladder step 2)`, expected: ">= 16px (var(--yadad-calendar-entry-size); D6 bars shrinking type)", actual: getComputedStyle(content).fontSize, detail: labelOf(content) });
          }
          const metas = content.querySelectorAll(':scope > small, :scope > span:not(:first-child)');
          for (const meta of metas) {
            if (!rendered(meta)) continue;
            const mfs = px(getComputedStyle(meta).fontSize);
            if (mfs < 14 || mfs >= entryFs) {
              failures.push({ name: `${tag} meta size (ladder step 3)`, expected: "14px..entry-size (var(--yadad-calendar-meta-size))", actual: getComputedStyle(meta).fontSize, detail: labelOf(meta) });
            }
          }
        }
      }
      // An empty calendar legitimately has no rows; the rhythm only applies
      // where entries exist.
      const anyEntry = Array.from(root.querySelectorAll('[data-part="entry"]')).some(rendered);
      if (anyEntry && rhythmChecked === 0) {
        failures.push({ name: `${tag} agenda has no rendered entry row`, expected: ">= 1", actual: "0", detail: labelOf(root) });
      }
      const headEls = Array.from(root.querySelectorAll('[data-part="day-head"]')).filter(rendered);
      const headEl = headEls[0]; // non-empty whenever the 31e headChecked check passed
      if (headEl) {
        const headFs = px(getComputedStyle(headEl).fontSize);
        const contentEl = root.querySelector('[data-part="entry-content"]');
        const entryFs = contentEl ? px(getComputedStyle(contentEl).fontSize) : 0;
        if (headFs < 18 || (entryFs > 0 && headFs <= entryFs)) {
          failures.push({ name: `${tag} day-head size (ladder step 1)`, expected: ">= 18px and > entry-size (var(--yadad-calendar-header-size))", actual: `${getComputedStyle(headEl).fontSize} vs entry ${entryFs}px`, detail: labelOf(headEl) });
        }
      }
      const todayCell = root.querySelector('[data-part="day"][data-today="true"]');
      if (todayCell && rendered(todayCell)) {
        const badge = todayCell.querySelector('[data-part="today-badge"]');
        if (!badge || !rendered(badge) || !badge.textContent?.trim()) {
          failures.push({ name: `${tag} today keeps its word badge (G23)`, expected: "rendered non-empty", actual: badge ? "empty/hidden" : "missing", detail: labelOf(todayCell) });
        }
        const num = todayCell.querySelector('[data-part="day-number"]');
        const weekday = todayCell.querySelector('[data-part="day-weekday"]');
        if (num && weekday && rendered(num) && rendered(weekday)) {
          // The accent must differ from both the plain text colour and the
          // weekday beside it (measured, not literal: holds in light and dark).
          const nc = getComputedStyle(num).color;
          if (nc === getComputedStyle(todayCell).color || nc === getComputedStyle(weekday).color) {
            failures.push({ name: `${tag} today's number carries the accent`, expected: "a colour distinct from the text/weekday colour (var(--yadad-calendar-today))", actual: nc, detail: labelOf(num) });
          }
        }
      }
      for (const entries of root.querySelectorAll('[data-part="entries"]')) {
        if (!rendered(entries) || !hasContent(entries)) continue;
        const eb = entries.getBoundingClientRect();
        const ratio = rootBox.width > 0 ? eb.width / rootBox.width : 0;
        if (ratio < 0.9) {
          failures.push({
            name: `${tag} entries fill of root width`,
            expected: ">= 90%",
            actual: `${Math.round(ratio * 100)}%`,
            detail: labelOf(entries),
          });
        }
      }
    }

    // (c) 44x44 hit targets under a coarse pointer
    if (window.matchMedia("(pointer: coarse)").matches) {
      const controls: Element[] = [];
      for (const part of INTERACTIVE_PARTS) {
        for (const el of root.querySelectorAll(`[data-part="${part}"]`)) {
          if (rendered(el)) controls.push(el);
        }
      }
      for (const el of root.querySelectorAll("button, input, select, textarea, a[href]")) {
        if (el.getAttribute("data-part") === "day") continue; // gridcells are cells, not tap targets
        if (rendered(el) && !controls.includes(el)) controls.push(el);
      }
      for (const el of controls) {
        const target = el.closest("label") || el;
        if (!rendered(target)) continue;
        const box = target.getBoundingClientRect();
        const part = el.getAttribute("data-part") || el.tagName.toLowerCase();
        if (box.width < minTap - 1 || box.height < minTap - 1) {
          failures.push({
            name: `${tag} tap target ${part}`,
            expected: `>= ${minTap}x${minTap}`,
            actual: `${Math.round(box.width)}x${Math.round(box.height)}`,
            detail: labelOf(target),
          });
        }
      }
    }
  }

  for (const style of seedSheets) style.remove();
  return failures;
}

export { auditCalendarPhone };
