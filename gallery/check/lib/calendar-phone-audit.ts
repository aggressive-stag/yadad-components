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
 *   "swap-date-parts"  flips day-date/day-number visibility in the agenda
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
  // reflow: the weekday row and the compact day-number hide, the verbose
  // day-date shows. Grid = the 7-column month: the reverse.
  // `showWhenEntries` scopes a must-be-visible rule to days that contain an
  // entry — out-of-month days *without* entries are hidden by the reflow on
  // purpose and are not checked.
  const VISIBILITY: { agenda: VisibilityRow; grid: VisibilityRow } = {
    agenda: {
      agenda: true,
      show: ["day-date", "grid"],
      hide: ["weekday-row", "day-number"],
      showWhenEntries: ["day"],
    },
    grid: {
      agenda: false,
      show: ["weekday-row", "day-number", "grid", "day"],
      hide: ["day-date"],
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
    seed(
      '@container (max-width: 50ch) { [data-yadad="calendar"] [data-part="day-date"] { display: none !important; } ' +
      '[data-yadad="calendar"] [data-part="day-number"] { display: inline !important; } }'
    );
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
