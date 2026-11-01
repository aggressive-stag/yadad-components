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
      show: ["day-weekday", "day-number", "grid", "navigator", "navigator-toggle"],
      hide: ["weekday-row", "day-date"],
      showWhenEntries: ["day"],
    },
    grid: {
      agenda: false,
      show: ["weekday-row", "day-number", "grid", "day"],
      hide: ["day-date", "day-weekday", "navigator", "navigator-toggle"],
    },
  };

  // Parts that must offer a 44x44 hit target under a coarse pointer.
  const INTERACTIVE_PARTS: string[] = [
    "nav-previous", "nav-today", "nav-next", "mode-button",
    "entry-open", "move-trigger", "overflow",
    "move-confirm", "move-cancel", "action", "actions-trigger", "actions-cancel",
    "navigator-toggle",
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
  if (seeds.includes("hide-navigator")) {
    // The pre-32a phone restored: the map never shows, the list is alone.
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="navigator"] { display: none !important; } }');
  }
  if (seeds.includes("no-nav-dots")) {
    // The busy-day dots vanish: the map no longer says where things are,
    // and nothing else in the navigator carries that (the count is only
    // in the accessible name).
    seed('[data-yadad="calendar"] [data-part="navigator-dot"] { display: none !important; }');
  }
  if (seeds.includes("nav-flat-today")) {
    // Today loses its weight (G23's non-colour cue); the accent circle
    // alone would leave colour-blind users with no way to find today.
    seed('[data-yadad="calendar"] [data-part="navigator-day"][data-today="true"] [data-part="navigator-day-number"] { font-weight: 400 !important; }');
  }

  if (seeds.includes("nav-ragged-box")) {
    // The regression the one-footprint check exists for: content-box puts
    // today's ring *outside* its box, so the same day is 2px larger when
    // it is today than when it is not — subtle enough that a glance at a
    // screenshot never catches it.
    seed('[data-yadad="calendar"] [data-part="navigator-day-number"] { box-sizing: content-box !important; }');
  }
  if (seeds.includes("strip-unpinned")) {
    // The pre-32b navigator restored: the strip scrolls away with the list
    // and you lose your place by the third day of the agenda.
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="navigator"][data-expanded="false"] { position: static !important; } }');
  }
  if (seeds.includes("strip-translucent")) {
    // The pinned strip stops occluding: entries smear through the strip
    // exactly as the pre-31e translucent head band did.
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="navigator"][data-expanded="false"] { background: transparent !important; } }');
  }
  if (seeds.includes("grabber-hidden")) {
    // The grabber disappears: with it gone, collapsed is a dead end — no
    // keyboard or touch route to the month (the reference's affordance).
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="navigator-toggle"] { display: none !important; } }');
  }
  if (seeds.includes("head-under-strip")) {
    // D8 broken the classic way: the heads pin at the host header's offset
    // only, so the pinned strip covers them mid-scroll. The check compares
    // the two computed offsets (head must pin strictly below the strip).
    seed('@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day-head"] { inset-block-start: 0 !important; } }');
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
      // (g) card 32a: the phone navigator — a compact period map above the
      // list. Dots iff busy, single-letter headers with full names, today
      // distinguishable without colour, one tab stop, out-of-month muted
      // but tappable. DOM/contract checks; the column math is (c)'s job.
      // Card 33a Do 5 (D4): a rolling "<n>day" period renders NO navigator
      // — the list already pages n days at a time — so the whole block is
      // month/week only. The mode is read from the root's own data-mode.
      const rolling = /^[1-6]day$/.test(root.getAttribute("data-mode") ?? "");
      const nav = root.querySelector('[data-part="navigator"]');
      if (rolling) {
        if (nav) {
          failures.push({ name: `${tag} rolling period has no navigator (33a Do 5)`, expected: "not rendered", actual: "present", detail: labelOf(nav) });
        }
      } else if (!nav || !rendered(nav)) {
        failures.push({ name: `${tag} agenda shows the navigator`, expected: "rendered (32a)", actual: nav ? "hidden" : "missing", detail: labelOf(nav ?? root) });
      } else {
        const navButtons = Array.from(nav.querySelectorAll('[data-part="navigator-day"]')).filter(rendered);
        if (navButtons.length === 0) {
          failures.push({ name: `${tag} navigator has day buttons`, expected: ">= 1", actual: "0", detail: labelOf(nav) });
        }
        let tabStops = 0;
        for (const btn of navButtons) {
          if (btn.tagName !== "BUTTON") {
            failures.push({ name: `${tag} navigator day is a real button`, expected: "BUTTON", actual: btn.tagName, detail: labelOf(btn) });
          }
          if (btn.getAttribute("tabindex") === "0") tabStops++;
          const date = btn.getAttribute("data-date") || "";
          const dayInList = root.querySelector(`[data-part="day"][data-date="${date}"]`);
          // Full entry count, not just the rendered ones: a capped day
          // renders shown entries + a "+N more" overflow button (RFC 0008
          // item 7); the navigator names the *total* the set received.
          const shown = dayInList ? dayInList.querySelectorAll('[data-part="entry"]').length : 0;
          const overflow = dayInList?.querySelector('[data-part="overflow"]');
          const hidden = overflow ? parseInt((overflow.textContent || "").match(/\d+/)?.[0] ?? "0", 10) : 0;
          const count = shown + hidden;
          const name = btn.getAttribute("aria-label") || "";
          if (!name || !name.includes(`${count} entr`)) {
            failures.push({ name: `${tag} navigator day named with its entry count`, expected: "aria-label like `label, N entries` (navigatorDayAriaLabel)", actual: name || "(none)", detail: labelOf(btn) });
          }
          const dot = btn.querySelector('[data-part="navigator-dot"]');
          // rendered, not merely present: a dot hidden by display:none is
          // exactly the regression (a map that no longer says where things
          // are), and it would still be in the DOM.
          if ((count > 0) !== !!dot) {
            failures.push({ name: `${tag} navigator dot iff the day has entries`, expected: count > 0 ? "one dot" : "no dot", actual: dot ? "dot present" : "no dot", detail: labelOf(btn) });
          } else if (dot && !dot.checkVisibility()) {
            failures.push({ name: `${tag} navigator dot actually paints`, expected: "visible", actual: "hidden", detail: labelOf(btn) });
          }
          if (btn.getAttribute("data-in-month") === "false") {
            // Compare the BUTTON's colour (its number may own its own paint:
            // today's accent, the selected pill's surface — comparing the
            // numbers would false-positive on those). Muted = distinct from
            // an in-month sibling button's colour; measured, not literal.
            const sibling = navButtons.find((b) => b.getAttribute("data-in-month") === "true");
            if (sibling && getComputedStyle(btn).color === getComputedStyle(sibling).color) {
              failures.push({ name: `${tag} out-of-month navigator day is muted`, expected: "a colour distinct from in-month days (still tappable)", actual: getComputedStyle(btn).color, detail: labelOf(btn) });
            }
          }
        }
        if (tabStops !== 1) {
          failures.push({ name: `${tag} navigator roving tabindex (own group)`, expected: "exactly 1 button at tabIndex 0", actual: String(tabStops), detail: labelOf(nav) });
        }
        const weekdayRow = nav.querySelector('[data-part="navigator-weekday-row"]');
        const weekdayCells = weekdayRow ? Array.from(weekdayRow.querySelectorAll('[data-part="navigator-weekday"]')) : [];
        if (weekdayCells.length !== (navButtons.length > 0 ? 7 : 0)) {
          failures.push({ name: `${tag} navigator weekday header columns`, expected: "7 cells", actual: String(weekdayCells.length), detail: labelOf(weekdayRow ?? nav) });
        }
        for (const cell of weekdayCells) {
          const text = (cell.textContent || "").trim();
          if (Array.from(text).length !== 1) {
            failures.push({ name: `${tag} navigator weekday is a single letter (derived, G18)`, expected: "1 grapheme from weekdays[i].short", actual: `"${text}"`, detail: labelOf(cell) });
          }
          if (!(cell.getAttribute("aria-label") || "").trim()) {
            failures.push({ name: `${tag} navigator weekday full aria-label`, expected: "weekdays[i].long", actual: "(none)", detail: labelOf(cell) });
          }
        }
        const todayBtn = navButtons.find((b) => b.getAttribute("data-today") === "true");
        if (todayBtn) {
          const num = todayBtn.querySelector('[data-part="navigator-day-number"]');
          const weight = num ? parseInt(getComputedStyle(num).fontWeight, 10) : 0;
          if (weight < 600) {
            failures.push({ name: `${tag} navigator today carries weight (non-colour cue, G23)`, expected: "bold (>= 600) besides the circle", actual: String(weight || getComputedStyle(num ?? todayBtn).fontWeight), detail: labelOf(todayBtn) });
          }
          // The two states must be distinguishable WITHOUT colour, which
          // means by structure: today is a ring (border), selection is a
          // fill (background). Checking the cue *type* rather than a
          // screenshot means it holds even when today and selected coincide
          // in a fixture — which they do here, and which is exactly why a
          // shape-only review could never have caught a regression here.
          if (num) {
            const csNum = getComputedStyle(num);
            const ringW = parseFloat(csNum.borderInlineStartWidth) || 0;
            if (ringW <= 0) {
              failures.push({ name: `${tag} navigator today cue is a ring`, expected: "border on the number (circle)", actual: `border-width ${csNum.borderInlineStartWidth}`, detail: labelOf(todayBtn) });
            }
            const pressedBtn = navButtons.find((b) => b.getAttribute("aria-pressed") === "true");
            const pressedNum = pressedBtn?.querySelector('[data-part="navigator-day-number"]');
            if (pressedNum) {
              const csPressed = getComputedStyle(pressedNum);
              const fills = csPressed.backgroundColor !== "rgba(0, 0, 0, 0)" && csPressed.backgroundColor !== "transparent";
              if (!fills) {
                failures.push({ name: `${tag} navigator selected cue is a fill`, expected: "background on the number (pill), structurally unlike today's ring", actual: `background ${csPressed.backgroundColor}`, detail: labelOf(pressedBtn ?? nav) });
              }
              if (num === pressedNum) {
                // same day: both cues must coexist (ring AND fill) or the
                // two states collapse into one when they coincide
                const csBoth = getComputedStyle(num);
                if ((parseFloat(csBoth.borderInlineStartWidth) || 0) <= 0 || csBoth.backgroundColor === "rgba(0, 0, 0, 0)") {
                  failures.push({ name: `${tag} today+selected keeps both cues`, expected: "ring and fill together", actual: `border ${csBoth.borderInlineStartWidth} / bg ${csBoth.backgroundColor}`, detail: labelOf(todayBtn) });
                }
              }
            }
          }
        }
        // One footprint in every state: the ring and the fill paint ON the
        // number box (border-box), so a day does not change size when it
        // becomes today or selected, and every dot band measures the same
        // (measured: 24/24/44, dot 4.5 from the box / 7 from the rule).
        const footprints = new Map<string, string[]>();
        for (const btn of navButtons) {
          const num = btn.querySelector('[data-part="navigator-day-number"]');
          if (!num) continue;
          const r = num.getBoundingClientRect();
          const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
          const bucket = footprints.get(key) ?? [];
          if (bucket.length < 2) bucket.push(labelOf(btn));
          footprints.set(key, bucket);
        }
        if (footprints.size > 1) {
          failures.push({
            name: `${tag} navigator day number keeps one box in every state`,
            expected: "one size for plain/today/selected/busy (ring is border-box, fill is inside)",
            actual: [...footprints.entries()].map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | "),
            detail: labelOf(nav),
          });
        }
        const pressed = navButtons.filter((b) => b.getAttribute("aria-pressed") === "true");
        if (pressed.length !== 1) {
          failures.push({ name: `${tag} navigator has one selected day`, expected: "exactly 1 aria-pressed=true", actual: String(pressed.length), detail: labelOf(nav) });
        }

        // (g2) card 32b — the strip form. Collapsed pins, expanded does not
        // (D9), the grabber announces and controls exactly the rows that
        // render, and the pinned day heads clear the strip (D8). Measured
        // against the state the component declares, so the same audit runs
        // collapsed and expanded (the runner toggles the grabber between).
        const rootMode = root.getAttribute("data-mode");
        const navRows = Array.from(nav.querySelectorAll('[data-part="navigator-row"]')).filter(rendered);
        const toggle = root.querySelector('[data-part="navigator-toggle"]');
        // The pinned strip form: a collapsed month, or week mode's single
        // row (no grabber there per the card — one row is already a strip).
        const stripMode = rootMode === "week" || nav.getAttribute("data-expanded") === "false";
        if (stripMode) {
          const ns = getComputedStyle(nav);
          if (ns.position !== "sticky") {
            failures.push({ name: `${tag} collapsed strip pins`, expected: "position: sticky", actual: ns.position, detail: labelOf(nav) });
          }
          if (parseFloat(ns.insetBlockStart) < 0) {
            failures.push({ name: `${tag} collapsed strip offset`, expected: ">= 0 (var(--yadad-calendar-sticky-top))", actual: ns.insetBlockStart, detail: labelOf(nav) });
          }
          const opaque = ns.backgroundColor !== "rgba(0, 0, 0, 0)" && ns.backgroundColor !== "transparent";
          if (!opaque) {
            failures.push({ name: `${tag} strip band is opaque`, expected: "a surface colour (scrolled text must not smear through)", actual: ns.backgroundColor, detail: labelOf(nav) });
          }
          if (navRows.length !== 1) {
            failures.push({ name: `${tag} collapsed strip is one week`, expected: "1 rendered navigator-row", actual: String(navRows.length), detail: labelOf(nav) });
          }
          // D8: with the strip pinned, the heads must pin BELOW it and the
          // scroll clearance must include it — both read greater than the
          // strip-less 31e values, derived not hard-coded.
          const head = root.querySelector('[data-part="day-head"]');
          if (head) {
            const hs = getComputedStyle(head);
            if (hs.position !== "sticky") {
              failures.push({ name: `${tag} day head still pins under the strip`, expected: "sticky", actual: hs.position, detail: labelOf(head) });
            }
            if (parseFloat(hs.insetBlockStart) <= parseFloat(ns.insetBlockStart)) {
              failures.push({ name: `${tag} day head pins below the strip (D8)`, expected: `> strip offset ${ns.insetBlockStart}`, actual: hs.insetBlockStart, detail: labelOf(head) });
            }
            // Occlusion, not just ordering: a head pinned inside the strip's
            // band hides behind it mid-scroll. The offsets must be composed
            // (sticky-top + the strip's REAL height), so any pinned head's
            // offset clears the strip's bottom edge. (This is the check the
            // first 32b draft failed: a 33px strip-size default vs a 113px
            // strip — the heads' inset beat the strip's, yet sat inside it.)
            const stripHeight = nav.getBoundingClientRect().height;
            if (parseFloat(hs.insetBlockStart) < parseFloat(ns.insetBlockStart) + stripHeight - 1) {
              failures.push({ name: `${tag} pinned head clears the strip's band (D8)`, expected: `>= ${Math.round(parseFloat(ns.insetBlockStart) + stripHeight)}px (strip ${Math.round(stripHeight)} tall)`, actual: hs.insetBlockStart, detail: labelOf(head) });
            }
          }
        } else {
          const ns = getComputedStyle(nav);
          if (ns.position !== "static") {
            failures.push({ name: `${tag} expanded month does not pin (D9)`, expected: "static (scrolls away)", actual: ns.position, detail: labelOf(nav) });
          }
        }
        if (toggle) {
          const expandedAttr = toggle.getAttribute("aria-expanded");
          if (expandedAttr !== String(!stripMode)) {
            failures.push({ name: `${tag} grabber announces its state`, expected: `aria-expanded=${String(!stripMode)}`, actual: String(expandedAttr), detail: labelOf(toggle) });
          }
          const ctrl = (toggle.getAttribute("aria-controls") || "").split(/\s+/).filter(Boolean);
          const ctrlEls = ctrl.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
          if (ctrl.length === 0 || ctrlEls.length !== ctrl.length) {
            failures.push({ name: `${tag} grabber controls the rendered rows`, expected: `${navRows.length} live row ids`, actual: `${ctrlEls.length}/${ctrl.length} resolve`, detail: labelOf(toggle) });
          } else if (ctrlEls.length !== navRows.length) {
            failures.push({ name: `${tag} grabber controls exactly the rendered rows`, expected: String(navRows.length), actual: String(ctrlEls.length), detail: labelOf(toggle) });
          }
          if (!rendered(toggle)) {
            failures.push({ name: `${tag} grabber is visible`, expected: "visible", actual: "hidden", detail: labelOf(toggle) });
          }
        }
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
      // Card 32a / plan Q5, measured: seven 44px columns need 308px of
      // navigator, and a 320 viewport's root is 262 — so at narrow widths a
      // day's *width* is its 1fr column, nothing more. That is the only
      // axis the column math constrains. Height is never column-constrained,
      // so the 44px floor holds at every width and is checked unconditionally.
      const navEl = root.querySelector('[data-part="navigator"]');
      // Read the tracks off the navigator itself: the rows are subgrids
      // now, and a subgrid row's computed gridTemplateColumns is "subgrid",
      // not px — reading the row would yield 0 and silently pass any width.
      const navTrack = navEl && rendered(navEl)
        ? Math.max(...getComputedStyle(navEl).gridTemplateColumns.split(" ").map((v) => parseFloat(v) || 0))
        : 0;
      const navColsFit = navTrack >= minTap;
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
        const navColumnBound = part === "navigator-day" && !navColsFit;
        const widthFloor = navColumnBound ? navTrack : minTap;
        const heightFloor = minTap;
        if (box.width < widthFloor - 1 || box.height < heightFloor - 1) {
          failures.push({
            name: `${tag} tap target ${part}`,
            expected: `>= ${Math.round(widthFloor)}x${heightFloor}${navColumnBound ? " (column-bound width; height is not)" : ""}`,
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
