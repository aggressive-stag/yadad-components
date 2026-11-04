/**
 * Shared layout audit — the DOM-side probe for the UI-polish round, card 34a.
 *
 * One self-contained function, NO imports: a host app can serialize it
 * straight into its own page (Playwright `page.evaluate(auditLayout, opts)` /
 * CDP `Runtime.evaluate`) and get JSON findings back. The type annotations
 * are all erasable, so the function's own text is plain JS once loaded.
 * Generic: nothing in here names an app; components are named only through
 * their public `data-yadad` / `data-part` attributes.
 *
 * What it probes (plan §2 step 4 of the UI-polish standard):
 *   V1  tiny scroll box — an element with its own scrollbar that is under
 *       ~240px tall / ~200px wide, or that sits inside another scrolling
 *       area. `actual` carries the box size; `detail` names the scroller it
 *       is nested in.
 *   V2  scroll where none belongs — any element whose computed
 *       overflow-x/y is auto|scroll AND whose content actually overflows
 *       (scrollHeight > clientHeight + 1, or width), that is not tiny and
 *       not nested. One scroller per axis per screen region is the target;
 *       a deliberate scroller (a table wrapper, a board column, a tab
 *       strip) belongs on the CALLER's allow-list, not in here.
 *   V3  vertical / one-letter text — a text-bearing element rendered
 *       narrower than 3ch while holding >3 characters, or whose own text
 *       lays out in more lines than it has words (words broken letter by
 *       letter; hyphen/slash breaks are normal wrapping, not a defect).
 *   V4  page wider than the screen — documentElement.scrollWidth beyond
 *       innerWidth (+1px tolerance). A table wider than the screen may
 *       scroll inside its own wrapper (V1/V2 territory); the page never does.
 *   V5  clipped text — scrollWidth/clientWidth (or height) overflow under
 *       overflow:hidden/clip with no `title` and no aria-label/labelledby:
 *       text cut off with no way to read the rest.
 *   V6  overlap — pairwise overlap of visible interactive elements (>=3px
 *       on both axes AND >=30% of the smaller box), where neither side is
 *       floating in an overlay (dialogs, listbox popovers and menus are
 *       SUPPOSED to float over content; only two overlays that share a root
 *       are compared with each other). Plus a sticky/fixed element covering
 *       content while painting no background of its own (content smears
 *       through a transparent pinned band).
 *   V7  broken controls — under a coarse pointer (or forced with
 *       `touch: true`): interactive elements under 44x44 CSS px (a control
 *       sized through its <label>, wrapped or via label[for], is measured
 *       on the label — the label is the tap target), and text-entry
 *       controls under 16px computed font (iOS zooms on focus).
 *   V12 zero-size parts — an element that is rendered (`checkVisibility()`),
 *       carries content (own text or a rendered element child), yet paints
 *       a 0-wide or 0-tall box.
 *
 * Not reported, by design:
 *   - sr-only text: position:absolute + ~1px box + overflow:hidden +
 *     clip/clip-path is the accessibility-hidden pattern, not clipped text;
 *   - anything outside a [data-yadad] root (page furniture the component
 *     set does not own), unless you pass `all: true`;
 *   - elements hidden by aria-hidden or checkVisibility().
 *
 * Call shape (documented for host apps):
 *   const findings = await page.evaluate(auditLayout, {
 *     scope: "main",            // CSS selector for the region (default: body)
 *     exclude: "nav.app-chrome" // skip these elements and their subtree
 *                               // (host chrome that is not the component set)
 *     all: true,                // audit every rendered element, not just
 *                               // those inside a [data-yadad] root
 *     touch: true,              // force the V7 touch rules (default:
 *                               // matchMedia("(pointer: coarse)").matches)
 *     minTap: 44, minInputFont: 16, tinyHeight: 240, tinyWidth: 200,
 *     seeds: [],                // regression seeds, see below
 *   });
 * Each finding is {defect, component, part, selector, text, expected,
 * actual, detail}: `component` is the nearest [data-yadad] root's value,
 * `part` the element's data-part (or its role), `selector` a short path a
 * human can find the element with. An empty array means the region is clean;
 * the CALLER decides what to allow-list (each entry should say why).
 *
 * Regression seeds (option `seeds`, for self-testing this probe — every
 * seeded defect must come back as a finding naming the part):
 *   "tiny-scroll"     board columns become a 120px box (V1)
 *   "panel-scrolls"   a panel body overflows its fixed height (V2)
 *   "one-letter-text" a board card title squeezes to one letter per line (V3)
 *   "page-wide"       a 5000px element forces page overflow (V4)
 *   "clip-label"      field labels clip long text with no title (V5)
 *   "overlap"         two buttons stack on top of each other (V6)
 *   "small-target"    buttons collapse to 20px tall (V7 touch)
 *   "small-input"     text inputs drop to 12px font (V7 touch)
 *   "zero-part"       the count value paints a 0-wide box (V12)
 *
 * Seeded styles are injected into <head> and removed again before the call
 * returns, so the same page can be audited again clean.
 */

export type LayoutFinding = {
  defect: string;
  component: string;
  part: string;
  selector: string;
  text: string;
  expected: string;
  actual: string;
  detail: string;
};

export type LayoutAuditOptions = {
  scope?: string;
  exclude?: string;
  all?: boolean;
  touch?: boolean;
  minTap?: number;
  minInputFont?: number;
  tinyHeight?: number;
  tinyWidth?: number;
  seeds?: string[];
};

function auditLayout(options?: LayoutAuditOptions): LayoutFinding[] {
  const opts = options || {};
  const findings: LayoutFinding[] = [];
  const minTap = opts.minTap !== undefined ? opts.minTap : 44;
  const minInputFont = opts.minInputFont !== undefined ? opts.minInputFont : 16;
  const tinyHeight = opts.tinyHeight !== undefined ? opts.tinyHeight : 240;
  const tinyWidth = opts.tinyWidth !== undefined ? opts.tinyWidth : 200;
  const seeds = opts.seeds || [];

  const scopeEl: HTMLElement = opts.scope
    ? (document.querySelector(opts.scope) as HTMLElement | null) || document.body
    : document.body;

  const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [role="checkbox"], [role="menuitem"], [role="option"], [role="combobox"]';

  const isSrOnly = (el: Element, cs: CSSStyleDeclaration): boolean => {
    const b = el.getBoundingClientRect();
    if (b.width > 2 || b.height > 2) return false;
    if (cs.position !== "absolute" && cs.position !== "fixed") return false;
    return cs.clipPath !== "none" || (cs.clip !== "auto" && cs.overflow === "hidden");
  };

  const excluded = (el: Element): boolean => {
    if (el === scopeEl) return true;
    const tag = el.tagName;
    if (tag === "STYLE" || tag === "SCRIPT" || tag === "LINK" || tag === "META" || tag === "TEMPLATE" || tag === "NOSCRIPT") return true;
    if (el.closest('[aria-hidden="true"]')) return true;
    if (opts.exclude && el.closest(opts.exclude)) return true;
    if (opts.all !== true && !el.closest("[data-yadad]")) return true; // page furniture
    return false;
  };

  const rendered = (el: Element): boolean => {
    try {
      return el.checkVisibility();
    } catch {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    }
  };

  // A human-locatable name: [data-yadad="x"][data-part="y"] plus the id or a
  // short ancestor chain, plus the element's own text.
  const nameOf = (el: Element): { component: string; part: string; selector: string; text: string } => {
    const root = el.closest("[data-yadad]");
    const component = root ? root.getAttribute("data-yadad") || "" : "";
    const part = el.getAttribute("data-part") || el.getAttribute("role") || "";
    let selector: string;
    if (el.id) {
      selector = `#${el.id}`;
    } else {
      const bits: string[] = [];
      let cur: Element | null = el;
      for (let depth = 0; cur && depth < 3 && bits.length < 3; cur = cur.parentElement) {
        const dp = cur.getAttribute("data-part");
        const dy = cur.getAttribute("data-yadad");
        bits.unshift(cur.tagName.toLowerCase() + (dy ? `[data-yadad="${dy}"]` : "") + (dp ? `[data-part="${dp}"]` : ""));
        if (cur.id) {
          bits[0] = `#${cur.id}`; // the id belongs to this ancestor, the outermost bit
          break;
        }
      }
      selector = bits.join(" > ");
    }
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
    return { component, part, selector, text };
  };

  const push = (defect: string, el: Element, expected: string, actual: string, detail: string): void => {
    const n = nameOf(el);
    findings.push({ defect, ...n, expected, actual, detail });
  };

  const px = (v: string): number => parseFloat(v) || 0;

  /* ---- regression seeds (removed again at the end of this call) ---------- */
  const seedSheets: HTMLStyleElement[] = [];
  const seed = (css: string): void => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    seedSheets.push(style);
  };
  if (seeds.includes("tiny-scroll"))
    seed('[data-yadad="board"] [data-part="cards"] { max-block-size: 120px !important; overflow-y: auto !important; }');
  if (seeds.includes("panel-scrolls"))
    seed('[data-yadad="panel"][data-part="root"] { max-block-size: 300px !important; overflow: auto !important; } [data-yadad="panel"][data-part="root"]::after { content: ""; display: block; block-size: 400px; }');
  if (seeds.includes("one-letter-text"))
    seed('[data-yadad="section"] [data-part="title"] { max-inline-size: 1ch !important; min-inline-size: 0 !important; overflow-wrap: anywhere !important; }');
  if (seeds.includes("page-wide"))
    seed("body::before { content: ''; display: block; inline-size: 5000px; block-size: 1px; }");
  if (seeds.includes("clip-label"))
    seed('[data-yadad="field-frame"] [data-part="label"] { overflow: hidden !important; inline-size: 40px !important; white-space: nowrap !important; }');
  if (seeds.includes("overlap"))
    seed(
      // transform, not margin: margins shift layout (and the gallery's only
      // in-scope adjacent [data-yadad=button] pairs sit in column footers or
      // the excluded table-pagination nav), while translateX(-100%) slides
      // every tab fully over its predecessor — the probe reads painted
      // boxes, and this is exactly the stacked-controls defect V6 names.
      '[data-yadad="tabs"] [data-part="tab"] + [data-part="tab"] { transform: translateX(-100%); }',
    );
  if (seeds.includes("small-target"))
    seed('[data-yadad="button"] { min-block-size: 20px !important; min-inline-size: 20px !important; padding: 0 2px !important; }');
  if (seeds.includes("small-input"))
    seed('[data-yadad] input:not([type="checkbox"]):not([type="radio"]), [data-yadad] select, [data-yadad] textarea { font-size: 12px !important; }');
  if (seeds.includes("zero-part"))
    seed('[data-yadad="count"] [data-part="value"] { inline-size: 0 !important; overflow: hidden !important; }');
  // Card 34a regressions: each undoes one stress fix, so the probe must
  // re-find the defect the fixed CSS prevents.
  if (seeds.includes("button-word-overflow"))
    seed('[data-yadad="button"][data-part="root"] { overflow-wrap: normal !important; }');
  if (seeds.includes("panel-title-word"))
    seed('[data-yadad="panel"] [data-part="title"] { overflow-wrap: normal !important; }');
  if (seeds.includes("dialog-body-word"))
    seed('[data-yadad="dialog"] [data-part="body"] { overflow-wrap: normal !important; }');

  /* ---- collect rendered, non-sr-only elements in scope -------------------- */
  const all: Element[] = [];
  for (const el of scopeEl.querySelectorAll("*")) {
    if (excluded(el) || !rendered(el)) continue;
    if (isSrOnly(el, getComputedStyle(el))) continue;
    all.push(el);
  }

  /* ---- V4: page wider than the screen ------------------------------------- */
  {
    const doc = document.documentElement;
    // Under mobile emulation `window.innerWidth` inflates to the overflowing
    // content width and the check never fires (measured on card 34a:
    // innerWidth 459 at a 320 viewport). clientWidth is the layout viewport —
    // the screen the component was given — so compare against both.
    const screen = Math.min(window.innerWidth, doc.clientWidth);
    if (doc.scrollWidth > screen + 1) {
      findings.push({
        defect: "V4",
        component: "",
        part: "document",
        selector: "html",
        text: "",
        expected: `scrollWidth <= ${screen}`,
        actual: `scrollWidth ${doc.scrollWidth}`,
        detail: "the page itself scrolls sideways; a wide table must scroll inside its own wrapper instead",
      });
    }
  }

  /* ---- V1 / V2: real scroll containers ------------------------------------ */
  const scrollers: Element[] = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const canX = cs.overflowX === "auto" || cs.overflowX === "scroll";
    const canY = cs.overflowY === "auto" || cs.overflowY === "scroll";
    const overY = canY && el.scrollHeight > el.clientHeight + 1;
    const overX = canX && el.scrollWidth > el.clientWidth + 1;
    if (!overX && !overY) continue;
    scrollers.push(el);
  }
  for (const el of scrollers) {
    const box = el.getBoundingClientRect();
    const nested = scrollers.find((a) => a !== el && a.contains(el));
    // Judge "tiny" on the scrolling axis only: a horizontal strip that is
    // legitimately short (a tab list) is not a tiny box, and a tall column
    // that is legitimately narrow on a phone is judged by its width.
    const scrollsY = el.scrollHeight > el.clientHeight + 1;
    const scrollsX = el.scrollWidth > el.clientWidth + 1;
    const tiny = (scrollsY && box.height < tinyHeight) || (scrollsX && box.width < tinyWidth);
    const axes: string[] = [];
    if (el.scrollHeight > el.clientHeight + 1) axes.push(`y ${el.scrollHeight}>${el.clientHeight}`);
    if (el.scrollWidth > el.clientWidth + 1) axes.push(`x ${el.scrollWidth}>${el.clientWidth}`);
    const defect = tiny || nested ? "V1" : "V2";
    push(
      defect,
      el,
      tiny ? `no own scrollbar under ${tinyHeight}px tall / ${tinyWidth}px wide` : "one scroller per region, or an allow-listed deliberate scroller",
      `scrolls ${axes.join(" and ")}, box ${Math.round(box.width)}x${Math.round(box.height)}`,
      nested ? `nested inside the scroller ${nameOf(nested).selector}` : "top-level scroller",
    );
  }

  /* ---- V3: vertical / one-letter text -------------------------------------- */
  const chWidth = (el: Element): number => {
    const probe = document.createElement("span");
    const cs = getComputedStyle(el);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
    probe.textContent = "000";
    (el.parentElement || document.body).appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };
  for (const el of all) {
    if (el.closest("svg")) continue;
    const ownNodes: Text[] = [];
    let own = "";
    for (const t of Array.from(el.childNodes)) {
      if (t.nodeType === 3 && (t.textContent || "").trim()) {
        ownNodes.push(t as Text);
        own += t.textContent || " ";
      }
    }
    own = own.trim();
    if (own.length <= 3) continue;
    const tag = el.tagName;
    if (tag === "CODE" || tag === "PRE") continue;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const threeCh = chWidth(el);
    if (box.width < threeCh - 1) {
      push("V3", el, `text "${own.slice(0, 24)}" needs > 3ch of width`, `${Math.round(box.width)}px < ${Math.round(threeCh)}px (3ch)`, "text squeezed to less than three characters per line");
      continue;
    }
    // Line count of the element's OWN text only (child elements can add
    // lines legitimately). Break opportunities: whitespace, hyphens, slashes.
    const tops: number[] = [];
    for (const t of ownNodes) {
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const r of Array.from(range.getClientRects())) {
        if (r.height < 1 || r.width < 1) continue;
        if (!tops.some((x) => Math.abs(x - r.top) < 2)) tops.push(r.top);
      }
    }
    const breaks = own.split(/[\s/\u2010-\u2015\u2026-]+/).filter(Boolean).length;
    // Flag only when text lays out ~one character per line (a squeezed
    // column), not when a single over-long word is legitimately broken by
    // `overflow-wrap`. A word wider than its box wrapping across N lines is
    // intended; a word losing letters one at a time is the defect.
    if (tops.length > breaks && tops.length >= own.length * 0.6) {
      push("V3", el, `at most ${breaks} line(s) for "${own.slice(0, 24)}"`, `${tops.length} lines`, "more lines than words — a word is broken mid-word, letter by letter");
    }
  }

  /* ---- V5: clipped text with no way to read the rest ------------------------ */
  for (const el of all) {
    if (el.closest("svg")) continue;
    const cs = getComputedStyle(el);
    const clipX = (cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1;
    const clipY = (cs.overflowY === "hidden" || cs.overflowY === "clip") && el.scrollHeight > el.clientHeight + 1;
    if (!clipX && !clipY) continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    if (el.getAttribute("title") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) continue;
    const clipped: string[] = [];
    if (clipX) clipped.push(`x ${el.scrollWidth}>${el.clientWidth}`);
    if (clipY) clipped.push(`y ${el.scrollHeight}>${el.clientHeight}`);
    push("V5", el, "clip needs title/aria-label (or must not clip)", `clipped ${clipped.join(" and ")}`, "text cut off with no title, aria-label or way to read the rest");
  }

  /* ---- V6: overlap ----------------------------------------------------------- */
  {
    // The box a human can actually see: getBoundingClientRect is viewport
    // geometry and knows nothing about clipping, so two demos stacked 60k px
    // apart in a long page — or a card scrolled out of its column and a
    // header above another demo — share coordinates without ever visually
    // overlapping. Clip the box by hand: start from the viewport rect and
    // intersect with every scroll container's padding box up the tree. Two
    // elements "overlap" only when BOTH clipped boxes still exist AND
    // intersect; a box clipped away is not visible content and is skipped.
    const clippedBox = (el: Element): DOMRect | null => {
      const box = el.getBoundingClientRect();
      // NOTE: no viewport clipping. The gallery is one very long page and
      // the probe runs once per viewport WITHOUT scrolling; clipping to the
      // visible window would hide every demo below the fold (and every
      // seeded regression with it). Two elements 60k px apart never share
      // coordinates anyway; what DOES falsely overlap are siblings scrolled
      // out of a shared scroller, and the per-ancestor clip below removes
      // exactly those.
      let l = box.left, t = box.top;
      let r = box.right, b = box.bottom;
      for (let n: Element | null = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const nb = n.getBoundingClientRect();
        if (cs.overflowX !== "visible") { l = Math.max(l, nb.left); r = Math.min(r, nb.right); }
        if (cs.overflowY !== "visible") { t = Math.max(t, nb.top); b = Math.min(b, nb.bottom); }
        if (r - l < 1 || b - t < 1) return null; // fully clipped out: not visible
      }
      return new DOMRect(l, t, r - l, b - t);
    };

    // The overlay root of an element: a dialog/menu/listbox/fixed or
    // z-stacked absolute band. Popovers SHOULD float over page content —
    // only two overlays sharing one root are compared with each other.
    const overlayRoot = (el: Element): Element | null => {
      for (let n: Element | null = el; n && n !== scopeEl.parentElement; n = n.parentElement) {
        if (n.matches('dialog, [role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [role="menuitem"], [role="tooltip"], [popover]')) return n;
        if (n === scopeEl) return null;
        const cs = getComputedStyle(n);
        if (cs.position === "fixed") return n;
        if (cs.position === "absolute" && cs.zIndex !== "auto" && parseFloat(cs.zIndex) >= 1) return n;
      }
      return null;
    };
    const boxes: Array<{ el: Element; x: number; y: number; w: number; h: number; overlay: Element | null }> = [];
    for (const el of all) {
      if (!el.matches(INTERACTIVE)) continue;
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === "none") continue;
      if (el.hasAttribute("disabled")) continue;
      const b = clippedBox(el); // scroll-clipped, viewport-clipped; null = invisible
      if (!b || b.width < 1 || b.height < 1) continue;
      boxes.push({ el, x: b.left, y: b.top, w: b.width, h: b.height, overlay: overlayRoot(el) });
    }
    boxes.sort((a, b) => a.y - b.y);
    const seen = new Set<string>();
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i]!;
      for (let j = i + 1; j < boxes.length; j++) {
        const b = boxes[j]!;
        if (b.y >= a.y + a.h) break;
        if (a.overlay !== b.overlay) continue; // one floats, or two unrelated popovers
        const ow = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ow < 3 || oh < 3) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.el.closest("label") && a.el.closest("label") === b.el.closest("label")) continue;
        const smaller = Math.min(a.w * a.h, b.w * b.h);
        if (ow * oh < smaller * 0.3) continue;
        const key = nameOf(a.el).selector + "~" + nameOf(b.el).selector;
        if (seen.has(key)) continue;
        seen.add(key);
        const whole = ow * oh >= a.w * a.h;
        push("V6", whole ? b.el : a.el, "no overlap with a sibling control", `overlaps ${nameOf(whole ? a.el : b.el).selector} by ${Math.round(ow)}x${Math.round(oh)}`, "two interactive elements stacked on top of each other");
      }
    }
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.position !== "sticky" && cs.position !== "fixed") continue;
      const opaque = (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || cs.backgroundImage !== "none";
      if (opaque) continue;
      const band = el.getBoundingClientRect();
      if (band.width < 2 || band.height < 2) continue;
      for (const other of all) {
        if (other === el || el.contains(other) || other.contains(el)) continue;
        if (!(other.matches(INTERACTIVE) || other.tagName === "P" || other.tagName === "SPAN" || other.tagName === "TD")) continue;
        const ob = other.getBoundingClientRect();
        const ow = Math.min(band.right, ob.right) - Math.max(band.left, ob.left);
        const oh = Math.min(band.bottom, ob.bottom) - Math.max(band.top, ob.top);
        if (ow >= 8 && oh >= 8 && oh >= Math.min(band.height, ob.height) * 0.3) {
          push("V6", el, "a pinned band must paint an opaque background", `transparent ${cs.position} band over ${nameOf(other).selector}`, "sticky/fixed element with no background lets content smear through it");
          break;
        }
      }
    }
  }

  /* ---- V7: tap targets and input font size (touch) -------------------------- */
  if (opts.touch === true || (opts.touch === undefined && matchMedia("(pointer: coarse)").matches)) {
    const controls: Element[] = [];
    for (const el of all) {
      if (!el.matches(INTERACTIVE)) continue;
      if (el instanceof HTMLInputElement && (el.type === "hidden" || el.type === "file")) continue;
      controls.push(el);
    }
    const measured = new Set<Element>();
    // Effective hit area: a control's own box unioned with its ::before/
    // ::after overlay boxes (the standard way a small glyph grows its tap
    // target — position:absolute + inset + min sizes, sometimes centred
    // with a transform). The probe measures boxes, not paint order, so a
    // component that hits 44x44 through a pseudo-element passes on
    // hit-area, not on the glyph's painted size.
    const hitBox = (el: Element): DOMRect => {
      const host = el.getBoundingClientRect();
      let box = host;
      const num = (v: string | null, base: number): number | null => {
        if (v === null || v === "auto") return null;
        if (v.endsWith("%")) return (parseFloat(v) / 100) * base;
        if (/^-?[\d.]+px$/.test(v)) return parseFloat(v);
        return null;
      };
      for (const pseudo of ["::before", "::after"] as const) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content === "none" || cs.content === "normal") continue; // nothing painted
        if (cs.position !== "absolute" && cs.position !== "fixed") continue;
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const insL = num(cs.insetInlineStart, host.width) ?? num(cs.left, host.width);
        const insR = num(cs.insetInlineEnd, host.width) ?? num(cs.right, host.width);
        const insT = num(cs.insetBlockStart, host.height) ?? num(cs.top, host.height);
        const insB = num(cs.insetBlockEnd, host.height) ?? num(cs.bottom, host.height);
        // getComputedStyle reports *used* widths/heights in px, so an
        // auto-sized pseudo already carries its laid-out size; min-* lifts
        // a 0-size one to its floor.
        let w = Math.max(px(cs.width), px(cs.minInlineSize));
        let h = Math.max(px(cs.height), px(cs.minBlockSize));
        let l = insL !== null ? host.left + insL : insR !== null ? host.right - insR - w : host.left;
        let t = insT !== null ? host.top + insT : insB !== null ? host.bottom - insB - h : host.top;
        const m = /matrix\(([^)]+)\)/.exec(cs.transform);
        if (m && m[1]) {
          const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
          const dx = parts[4];
          const dy = parts[5];
          if (parts.length >= 6 && dx !== undefined && dy !== undefined && Number.isFinite(dx) && Number.isFinite(dy)) {
            l += dx;
            t += dy;
          }
        }
        if (w > 1 && h > 1) {
          const pb = new DOMRect(l, t, w, h);
          const nl = Math.min(box.left, pb.left), nt = Math.min(box.top, pb.top);
          const nr = Math.max(box.right, pb.right), nb = Math.max(box.bottom, pb.bottom);
          box = new DOMRect(nl, nt, nr - nl, nb - nt);
        }
      }
      return box;
    };
    for (const el of controls) {
      const labelFor = el.id ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`) as HTMLElement | null) : null;
      const label = el.closest("label") || labelFor;
      // Measure the union of the control and its label: for a checkbox the
      // label IS the tap target (the contract in 31b/31c), and a text input
      // that already has a 44px box passes even while its 16px caption sits
      // above it. Reporting the label alone would fail compliant fields.
      const target = label || el;
      // The probe names only what the component set owns (see `excluded`):
      // a demo's own wrapper <label> around a bare Check/BooleanInput is
      // app glue, not the library's tap target — the library's contract is
      // the 44px label inside field-frame/board/calendar. Skip those.
      if (opts.all !== true && !target.closest("[data-yadad]")) continue;
      if (measured.has(target)) continue;
      measured.add(target);
      if (!rendered(target)) continue;
      let box = hitBox(target);
      if (label && label !== el) {
        const own = hitBox(el);
        const l = Math.min(box.left, own.left), t = Math.min(box.top, own.top);
        const r = Math.max(box.right, own.right), b = Math.max(box.bottom, own.bottom);
        box = new DOMRect(l, t, r - l, b - t);
      }
      if (box.width < 1 && box.height < 1) continue; // 0x0 is V12's finding
      if (box.width < minTap - 1 || box.height < minTap - 1) {
        push("V7", target, `tap target >= ${minTap}x${minTap}`, `${Math.round(box.width)}x${Math.round(box.height)}`, "tap target under the 44px floor on touch");
      }
    }
    for (const el of controls) {
      const tag = el.tagName;
      const isTextInput =
        tag === "TEXTAREA" ||
        el.getAttribute("role") === "combobox" ||
        (tag === "INPUT" && !["checkbox", "radio", "range", "hidden", "file"].includes((el as HTMLInputElement).type)) ||
        tag === "SELECT";
      if (!isTextInput) continue;
      const fs = px(getComputedStyle(el).fontSize);
      if (fs < minInputFont - 0.1) {
        push("V7", el, `input font >= ${minInputFont}px`, `${fs}px`, "input under 16px — iOS Safari zooms the page on focus");
      }
    }
  }

  /* ---- V12: rendered elements painting a zero box ---------------------------- */
  for (const el of all) {
    if (el.closest("svg")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "contents" || cs.display === "inline") continue;
    const box = el.getBoundingClientRect();
    if (box.width >= 1 && box.height >= 1) continue;
    let hasText = false;
    for (const t of Array.from(el.childNodes)) {
      if (t.nodeType === 3 && (t.textContent || "").trim()) hasText = true;
    }
    // "Content" = something a human would expect to paint here: in-flow
    // children with a real box, or absolutely-positioned children that are
    // themselves large (an sr-only 1px child is deliberately invisible and
    // collapses its parent legitimately — a header row of only-hidden cells
    // is the pattern, not a defect).
    let hasRenderedChild = false;
    for (const c of Array.from(el.children)) {
      const ccs = getComputedStyle(c);
      if (ccs.display === "none" || ccs.visibility === "hidden") continue;
      const cb = c.getBoundingClientRect();
      const outOfFlow = ccs.position === "absolute" || ccs.position === "fixed";
      if (outOfFlow ? cb.width * cb.height >= 16 : cb.width >= 2 && cb.height >= 2) {
        hasRenderedChild = true;
        break;
      }
    }
    if (!hasText && !hasRenderedChild) continue;
    if (el.parentElement && el.parentElement.getBoundingClientRect().width < 1 && el.parentElement.getBoundingClientRect().height < 1) continue; // report the outermost zero box
    push("V12", el, "a rendered, content-bearing box must have width and height", `${Math.round(box.width)}x${Math.round(box.height)}`, "element should be visible but paints a zero box");
  }

  for (const style of seedSheets) style.remove();
  return findings;
}

export { auditLayout };
