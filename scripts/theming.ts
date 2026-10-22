// scripts/theming.ts — the D15 theming gate and the generated reference.
//
// Two jobs, one source of truth (plain Node, no dependencies):
//
//   node scripts/theming.ts check      (default; `pnpm theming:check`)
//     Read every sets/**/*.css and FAIL if any rule below is broken.
//
//   node scripts/theming.ts write      (`pnpm theming:docs`)
//     Regenerate THEMING.md from the component CSS + TSX. Run it after
//     touching a stylesheet. scripts/theming.test.ts re-runs this and fails
//     if the committed THEMING.md has drifted, so the reference cannot go out
//     of date with the CSS.
//
// ---------------------------------------------------------------------------
// RULES (the "decide the exact rule" of card 5). Every component stylesheet
// (sets/**/*.css) is checked on its comment-stripped text (comments are never
// checked — they explain the CSS, and the prose mentions px freely). A value
// that breaks a rule is a violation UNLESS the offending line, or the line
// directly above it, carries an inline `/* theming: <reason> */` exception
// comment. The gate records every exception so it stays visible.
//
//   1. LAYER.  All CSS lives inside ONE top-level `@layer yadad.*` block
//      (yadad.components today). Unlayered host CSS must always win (D15), so
//      nothing may sit outside the layer.
//
//   2. COLORS. No hard-coded color: no hex (#fff/#ffffff), no functional
//      color (rgb/rgba/hsl/hsla/oklch/oklab/lab/lch with parentheses), and no
//      CSS named color on a color property. The only allowed color keywords
//      are `transparent`, `currentColor` and `inherit`. Every real color
//      comes from a token (var(--yadad-*)).
//
//   3. LENGTHS. The only hard-coded length allowed is the `1px` hairline
//      (border/outline weights — the repo-wide convention, also guarded by
//      registry/styles.test.ts). Every other length (px/rem/em) must be a
//      token or a per-component variable default. `0` and percentages
//      (relative sizing, e.g. `inline-size: 100%`) are not lengths and are
//      not flagged.
//
//   4. UNITLESS. Unitless numbers are not lengths — font-weight (600/700),
//      opacity (0.6), line-height, z-index and calc multipliers (* 2, * 0.5)
//      are never flagged.
//
// The exception comment is the escape hatch for a genuine, documented need
// (a length with no token, a value the engine requires). It must state a
// reason; it is recorded by `check` and surfaced in the gate output.
// ---------------------------------------------------------------------------
import { globSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETS = path.join(root, "sets");
const THEMING_MD = path.join(root, "THEMING.md");

// The theme tokens (TOKEN_NAMES in @yadad/theme). Each is --yadad-<name>.
// A component "reads" a token when its CSS references var(--yadad-<name>).
const TOKENS = [
  "color-text", "color-text-muted", "color-background", "color-surface",
  "color-border", "color-accent", "color-danger",
  "space-1", "space-2", "space-3", "space-4",
  "radius-sm", "radius-md",
  "font-family", "font-size-sm", "font-size-md", "focus-ring-width",
  "shadow-sm", "shadow-md",
];

const TOKEN_SET = new Set(TOKENS);

// "What each token is" for the reference.
const TOKEN_DESCRIPTION: Record<string, string> = {
  "color-text": "main text color",
  "color-text-muted": "secondary / muted text (labels, captions, empty states)",
  "color-background": "page and control background",
  "color-surface": "raised surface (sections, panels, table headers)",
  "color-border": "borders and dividers",
  "color-accent": "brand / primary accent — links, focus ring, selected state",
  "color-danger": "error / danger text and borders",
  "space-1": "spacing scale, step 1 (tightest)",
  "space-2": "spacing scale, step 2",
  "space-3": "spacing scale, step 3",
  "space-4": "spacing scale, step 4 (loosest)",
  "radius-sm": "small corner radius (inputs, buttons, chips)",
  "radius-md": "medium corner radius (cards, panels, sections)",
  "font-family": "base font stack",
  "font-size-sm": "small text (labels, secondary, table cells)",
  "font-size-md": "base text (inputs, body, tab labels)",
  "focus-ring-width": "keyboard focus-ring width",
  "shadow-sm": "small elevation shadow (sections); optional, no shadow when unset",
  "shadow-md": "medium elevation shadow (panels, cards); optional, no shadow when unset",
};

// The only color keywords D15 allows without a token.
const COLOR_KEYWORDS = new Set(["transparent", "currentcolor", "inherit"]);

// Property names that take a color in their value (for named-color detection,
// to avoid flagging layout keywords). Hex and functional colors are caught
// regardless of property.
const COLOR_PROPS = new Set([
  "color", "background", "background-color", "background-image",
  "border", "border-color", "border-top", "border-right", "border-bottom", "border-left",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-inline", "border-inline-color", "border-inline-start", "border-inline-end",
  "border-block", "border-block-color", "border-block-start", "border-block-end",
  "outline", "outline-color", "fill", "stroke", "accent-color",
  "box-shadow", "text-shadow", "caret-color", "text-decoration-color", "column-rule-color",
]);

// The 148 CSS named colors (CSS Color Module Level 3) to reject on a color
// property. Hex + functional colors are caught by pattern; named colors need
// an explicit list. Excluded: transparent, currentColor, inherit (allowed).
const NAMED_COLORS = new Set([
  "aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black",
  "blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse",
  "chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue",
  "darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta",
  "darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen",
  "darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink",
  "deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen",
  "fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","green",
  "greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki",
  "lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral",
  "lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightpink",
  "lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue",
  "lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine",
  "mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue",
  "mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream",
  "mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab",
  "orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise",
  "palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue",
  "purple","rebeccapurple","red","rosybrown","royalblue","saddlebrown","salmon",
  "sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue",
  "slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato",
  "turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen",
]);

// --- CSS comment stripping (line-preserving) --------------------------------
// Replace comment characters with spaces but keep newlines, so line numbers of
// the code stay stable. Returns { code, exemptLines } where exemptLines is the
// set of 1-based line numbers that carry (or directly precede) a
// `/* theming: */` exception comment.
function stripComments(css: string): { code: string; exempt: Set<number> } {
  const out = Array.from(css);
  const exempt = new Set<number>();
  let i = 0;
  while (i < out.length) {
    const open = out.join("").slice(i).indexOf("/*");
    if (open === -1) break;
    const start = i + open;
    const closeRel = out.join("").slice(start + 2).indexOf("*/");
    const end = closeRel === -1 ? out.length : start + closeRel + 4; // index just past the closing '/'
    const text = out.slice(start, end).join("");
    const isExempt = /theming:/.test(text);
    for (let k = start; k < end; k++) if (out[k] !== "\n") out[k] = " ";
    if (isExempt) {
      // Mark the line of the closing */ (covers both an inline comment and a
      // standalone comment sitting on the line above the offending rule), and
      // the line of the opening /* for a single-line comment.
      const lastLine = lineOf(out, end - 1);
      const firstLine = lineOf(out, start);
      exempt.add(lastLine);
      exempt.add(firstLine);
    }
    i = end;
  }
  return { code: out.join(""), exempt };
}
function lineOf(arr: string[], idx: number): number {
  let n = 1;
  for (let k = 0; k < idx; k++) if (arr[k] === "\n") n++;
  return n;
}
function lineOfCode(code: string, idx: number): number {
  let n = 1;
  for (let k = 0; k < idx; k++) if (code[k] === "\n") n++;
  return n;
}

// --- rule checks ------------------------------------------------------------
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC_COLOR = /\b(rgba?|hsla?|oklch|oklab|lab|lch)\s*\(/g;
const LENGTH = /(\d*\.?\d+)(px|rem|em)\b/g;

function isExempt(exempt: Set<number>, line: number): boolean {
  return exempt.has(line) || exempt.has(line - 1);
}

export interface Finding {
  kind: string;
  msg: string;
  file: string;
  line: number;
}

export function checkFile(file: string, css: string): { file: string; violations: Finding[]; exceptions: Finding[] } {
  const { code, exempt } = stripComments(css);
  const violations: Finding[] = [];
  const exceptions: Finding[] = [];
  const record = (kind: string, msg: string, line: number): void => {
    const p: Finding = { kind, msg, file, line };
    if (isExempt(exempt, line)) { exceptions.push(p); }
    else { violations.push(p); }
  };

  // 1. layer: the whole file is one top-level `@layer yadad.* { ... }` block.
  // Brace-count from the layer's opening brace (comments are already blanked,
  // so every brace here is a real CSS brace).
  const t = code.trim();
  const lm = t.match(/^@layer\s+yadad\.[a-z0-9.-]+\s*\{/);
  if (!lm) {
    record("layer", "file is not wrapped in a single @layer yadad.* block", 1);
  } else {
    let depth = 0, closeIdx = -1;
    for (let i = (lm.index ?? 0) + lm[0].length - 1; i < t.length; i++) {
      if (t[i] === "{") depth++;
      else if (t[i] === "}") { depth--; if (depth === 0) { closeIdx = i; break; } }
    }
    if (closeIdx === -1) record("layer", "unbalanced braces: the @layer block never closes", 1);
    else if (t.slice(closeIdx + 1).trim() !== "") record("layer", "content found outside the @layer yadad.* block", 1);
  }

  // 2 + 3. per-line color and length checks on the code.
  const lines = code.split("\n");
  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const declMatch = raw.match(/^\s*([a-z-]+)\s*:/);
    const prop = declMatch?.[1] ? declMatch[1].toLowerCase() : null;

    let h: RegExpExecArray | null;
    HEX.lastIndex = 0;
    while ((h = HEX.exec(raw)) !== null) record("color", `hard-coded hex color ${h[0]}`, line);

    let f: RegExpExecArray | null;
    FUNC_COLOR.lastIndex = 0;
    while ((f = FUNC_COLOR.exec(raw)) !== null) record("color", `hard-coded ${f[1]}(...) color`, line);

    if (prop && COLOR_PROPS.has(prop)) {
      for (const word of raw.slice(raw.indexOf(":") + 1).split(/[,\s();()]+/g)) {
        const w = word.toLowerCase();
        if (!w) continue;
        if (COLOR_KEYWORDS.has(w)) continue;
        if (NAMED_COLORS.has(w)) record("color", `named color "${w}" on ${prop}`, line);
      }
    }

    let l: RegExpExecArray | null;
    LENGTH.lastIndex = 0;
    while ((l = LENGTH.exec(raw)) !== null) {
      const num = l[1] ?? "", unit = l[2] ?? "";
      // allowed: zero (any unit) and the 1px hairline
      if (num === "0" || (num === "1" && unit === "px")) continue;
      record("length", `hard-coded length ${num}${unit} (use a token or a per-component variable)`, line);
    }
  });

  // 4. reduced motion (card 15c): any file that animates must say what
  // happens when the user asks not to. One machine-enforced rule so the
  // promise holds from card 15e onward: a file may not contain a
  // `transition:`/`animation:` declaration (other than `none`) unless the
  // same file carries a `@media (prefers-reduced-motion: reduce)` block.
  const MOTION_DECL = /(?:^|[{;])\s*(transition|animation)(-duration|-property|-name)?\s*:\s*([^;{}]+)/gm;
  let motion: RegExpExecArray | null;
  let animates: string | null = null;
  let motionAt = 0;
  MOTION_DECL.lastIndex = 0;
  while ((motion = MOTION_DECL.exec(code)) !== null) {
    const value = (motion[3] ?? "").trim();
    if (value === "none" || value === "") continue;
    animates = `${motion[1]}${motion[2] ?? ""}:`;
    motionAt = motion.index;
    break;
  }
  if (animates && !code.includes("prefers-reduced-motion")) {
    const line = code.slice(0, motionAt).split("\n").length;
    record("motion", `animates (${animates}) without a @media (prefers-reduced-motion: reduce) override in this file`, line);
  }

  return { file, violations, exceptions };
}

export function checkStyles(): { files: string[]; violations: Finding[]; exceptions: Finding[] } {
  const files = globSync(path.join(SETS, "**", "*.css")).sort();
  const allViolations: Finding[] = [];
  const allExceptions: Finding[] = [];
  for (const file of files) {
    const r = checkFile(path.relative(root, file), readFileSync(file, "utf8"));
    allViolations.push(...r.violations);
    allExceptions.push(...r.exceptions);
  }
  return { files: files.map((f) => path.relative(root, f)), violations: allViolations, exceptions: allExceptions };
}

// --- reference generation ---------------------------------------------------
// What each data-part is, per component. Curated prose; the generator FAILS
// if the TSX renders a part not described here (loud, not silent drift).
const PART_DESCRIPTION: Record<string, Record<string, string>> = {
  board: {
    root: "the `<section>` wrapper",
    header: "the title + group-by row",
    title: "the board title (`<h2>`)",
    "group-by": "the group-by picker wrapper (shown with more than one grouping)",
    "group-by-label": "the group-by picker's `<label>`",
    input: "the group-by `<select>` (shares the select component's styling)",
    notice: "the notice above the columns (e.g. an over-cap message)",
    status: "the visible live region that announces changes",
    columns: "the horizontally scrolling row of columns",
    column: "one column (a labelled region)",
    "column-heading": "a column's heading (`<h3>`) with label and count",
    "column-label": "a column's label text",
    "column-count": "a column's card count",
    cards: "a column's card list; scrolls on its own",
    "column-empty": "the placeholder in a column with no cards",
    card: "one card (list item)",
    "card-open": "the button that opens a card (when the view has a row action)",
    "card-static": "a card's content when it cannot be opened",
    "card-content": "a card's title and small card fields",
    "move-trigger": "the \"Move to…\" button on a movable card",
    "move-panel": "the inline form with the column list and confirm/cancel buttons",
    "move-label": "the move list's `<label>`",
    "move-select": "the move list's `<select>` of columns (shares the select component's styling)",
    "move-confirm": "the move form's confirm button",
    "move-cancel": "the move form's cancel button",
    actions: "a card's record-actions cluster (next to the move path)",
    action: "one record-action button on a card",
    "actions-trigger": "the \"Actions…\" button that opens the card's action menu (two or more actions)",
    "actions-panel": "the open card action menu, in flow under the trigger",
    "actions-cancel": "the action menu's cancel button",
    "action-status": "the card's polite \"Working...\" live region",
    "skeleton-card": "a card-shaped placeholder shown while a column's cards load (card 15e)",
    "loading-text": "visually hidden \"Loading cards…\" text — the skeleton bars' alternative",
  },
  boolean: { input: "the checkbox `<input>`", display: "read-only value" },
  calendar: {
    root: "the `<section>` wrapper",
    header: "the title + nav + mode-switch row",
    title: "the current month/week title (`<h2>`)",
    nav: "the previous/today/next button group",
    "nav-previous": "the previous-period button",
    "nav-today": "the jump-to-today button",
    "nav-next": "the next-period button",
    "mode-switch": "the month/week toggle button group",
    "mode-button": "one mode-switch button",
    notice: "the notice shown above the grid (e.g. a result was truncated)",
    status: "the live region announcing the result of a move or a refusal",
    legend: "the colour-slot legend list",
    "legend-item": "one legend entry",
    "legend-swatch": "one legend entry's colour swatch",
    "legend-label": "one legend entry's label text",
    grid: "the `role=\"grid\"` wrapper",
    "weekday-row": "the weekday header row",
    weekday: "one weekday column header",
    "day-row": "one week's row of day cells",
    day: "one day's `role=\"gridcell\"`",
    "day-head": "a day cell's day-number + today-badge row",
    "day-number": "a day cell's day-of-month number",
    "day-date": "a day cell's full-date heading, shown only in the phone agenda reflow",
    "today-badge": "the visible \"Today\" word badge",
    entries: "a day cell's entry list",
    entry: "one entry (list item)",
    "entry-open": "an entry rendered as an open-entry button (when `onOpenEntry` is set)",
    "entry-static": "an entry rendered as plain content (when `onOpenEntry` is not set)",
    "entry-content": "an entry's title + detail fields",
    "entry-color": "an entry's colour-slot swatch",
    overflow: "the \"+N more\" button that reveals entries hidden past the per-day cap",
    "move-trigger": "the \"Move to day…\" button for a movable entry",
    "move-panel": "the inline panel with the date input and confirm/cancel buttons",
    "move-label": "the move panel's date-input `<label>`",
    "move-input": "the move panel's date `<input>`",
    "move-confirm": "the move panel's confirm button",
    "move-cancel": "the move panel's cancel button",
    actions: "the entry's record-actions cluster (RFC 0007), next to the entry",
    action: "one record-action button (`data-tone` = neutral | danger)",
    "actions-trigger": "the \"Actions…\" menu trigger (two or more actions)",
    "actions-panel": "the opened actions menu panel",
    "actions-cancel": "the actions menu's Cancel button",
    "action-status": "the \"Working...\" live-region text while an action is in flight",
  },
  button: { root: "the `<button>`" },
  count: { root: "the widget wrapper", label: "the count label", value: "the counted value (wraps when long)" },
  date: { input: "the date `<input>`", display: "read-only value (`<time>`)" },
  datetime: { input: "the datetime `<input>`", display: "read-only value (`<time>`)" },
  dialog: { root: "the modal `<dialog>`", header: "the header row (title + close)", title: "the accessible name as a heading", close: "the close control", body: "the scrollable content the renderer builds" },
  "error-summary": { root: "the alert region", item: "one error line", message: "the error message", hint: "the error hint" },
  "field-frame": { root: "the field wrapper (label, control, error)", label: "the field `<label>`", required: "the required marker", errors: "the error list region", error: "one error message" },
  number: { root: "the field wrapper (input + unit)", input: "the number `<input>`", unit: "the unit suffix (e.g. kg)", display: "read-only value" },
  panel: { root: "the panel wrapper", title: "the panel title" },
  pager: { root: "the `<nav>` wrapper", info: "the count text between the buttons (polite live text)" },
  skeleton: { skeleton: "a grey placeholder bar (`aria-hidden`; the loading announcement stays the host's text)" },
  section: { root: "the `<fieldset>` wrapper", title: "the `<legend>` title" },
  reference: { input: "the picker `<select>`; it carries `data-yadad=\"select\"`, so style it with the select component's variables and selector, not this component's", status: "the status line under the picker (loading, error, empty, cut short)", combobox: "wrapper of the type-to-filter input and its popup (8 or more records)", listbox: "the combobox popup `<ul role=\"listbox\">`", option: "one `<li role=\"option\">` in the popup (`data-active` = the keyboard-highlighted one, `data-state=\"empty\"` = the No matches row)", display: "read-only label of the referenced record" },
  select: { input: "the `<select>` picker", display: "read-only value" },
  table: { root: "the table wrapper (scroll container)", table: "the `<table>`", caption: "the `<caption>`", header: "a column `<th>`", sort: "a sortable-header button", "sort-indicator": "the sort direction arrow", "sort-status": "visually hidden sort direction text inside the sort button", empty: "the empty-state cell", row: "a data `<tr>`", cell: "a data `<td>`", "skeleton-row": "a placeholder `<tr>` shown while rows load (card 15e)", actions: "the actions cell wrapper (RFC 0007)", "actions-list": "the row's action buttons side by side (desktop)", action: "one record-action button (`data-tone` = neutral | danger)", "actions-trigger": "the phone \"Actions…\" menu trigger", "actions-panel": "the opened phone menu panel", "actions-cancel": "the menu's Cancel button", "action-status": "the \"Working...\" live-region text while an action is in flight" },
  tabs: { root: "the tab component wrapper", list: "the `<tablist>` (scrolls internally for long lists)", tab: "a tab button", panel: "the selected tab's panel" },
  text: { input: "the text `<input>`", display: "read-only value", "diff-same": "a word-diff run present in both versions (compare column, RFC 0007)", "diff-added": "a `<ins>` run only in the new version", "diff-removed": "a `<del>` run only in the old version", "diff-label": "visually hidden \"added:\" / \"removed:\" text prefixing a diff run" },
};

const COMPONENT_INTRO: Record<string, string> = {
  boolean: "A single on/off field, rendered as a checkbox.",
  board: "Cards in columns, one column per value of a field, with a group-by picker; columns scroll sideways and each column scrolls on its own.",
  calendar: "A month/week grid of entries with navigation, a colour-slot legend, and a keyboard/touch move control.",
  button: "A pressable control with primary/secondary variants.",
  count: "A big-number widget with a label (e.g. a total).",
  date: "A date field, rendered as a native date input.",
  datetime: "A date-and-time field, rendered as a native datetime-local input.",
  dialog: "A modal dialog: the renderer builds the content, the component owns the modal behaviour (focus trap, inert background, Escape).",
  "error-summary": "An alert that lists the document's errors up front.",
  "field-frame": "The label + control + error wrapper every field type uses.",
  number: "A numeric field with an optional unit suffix.",
  panel: "A titled or untitled content surface with a scrollable body.",
  section: "A titled or untitled grouping with a border.",
  reference: "A link to a record of another entity, rendered as a native picker with fewer than 8 records and as a type-to-filter combobox from 8 on, both styled by the select component (its `--yadad-select-*` variables apply).",
  select: "A single-choice field, rendered as a native picker.",
  table: "A data table with sortable headers and an empty state.",
  tabs: "A tab list with a single selected tab and its panel.",
  text: "A single-line text field.",
};

// Per-component variable descriptions. Keys are the variable's suffix
// (without the --yadad-<component>- prefix). The generator FAILS if the CSS
// declares a variable whose suffix is not described here.
const VAR_DESCRIPTION: Record<string, string> = {
  // shared vocabulary
  padding: "inner padding", width: "inline size", radius: "corner radius",
  color: "foreground color", background: "background", border: "border color",
  "border-width": "border width", "border-invalid": "border color when invalid",
  "focus": "focus-ring color", "font-family": "font stack", "font-size": "font size",
  "font-weight": "font weight", gap: "gap between parts", spacing: "space after the component",
  size: "control size", accent: "accent color",
  // dialog
  "dialog-max-height": "maximum height before the body scrolls", "dialog-max-width": "maximum inline size on wide screens",
  "dialog-header-gap": "gap between the title and the close control", "dialog-header-padding": "header padding",
  "dialog-header-border": "header separator color", "dialog-header-border-width": "header separator width",
  "dialog-title-font-size": "title font size", "dialog-close-color": "close control colour",
  "dialog-close-focus": "close control focus-ring colour", "dialog-close-font-size": "close control glyph size",
  "dialog-close-radius": "close control corner radius", "dialog-body-padding": "body padding",
  "dialog-backdrop": "backdrop colour (top layer only)", "dialog-backdrop-opacity": "backdrop opacity (top layer only)",
  "dialog-shadow": "drop shadow under the dialog box", "dialog-close-tap": "close control tap target (width and height)",
  // board
  "board-column-width": "inline size of a column",
  "board-column-max-height": "tallest a column's card list gets before it scrolls",
  "board-phone-column-max-height": "tallest a column's card list gets before it scrolls on a phone",
  "board-drop-target": "outline color of the column a dragged card can drop on",
  "board-drop-background": "background of the column a dragged card is over",
  "board-column-background": "column background",
  "board-card-background": "card background",
  "board-card-hover": "background of an openable card under the pointer",
  "board-count-background": "column count badge background",
  "board-count-color": "column count and empty-column text color",
  "board-title-size": "board title font size",
  "board-notice-border": "notice border color",
  "board-notice-background": "notice background",
  "board-status-color": "live-region (status) text color",
  "board-status-accent": "live-region leading bar color",
  "board-status-background": "live-region background",
  "board-tap": "minimum height of the move buttons (the tap target on a phone)",
  "board-link": "move button text color",
  "board-actions-link": "record-action button text color",
  "board-actions-border": "record-action button border color (danger actions use the danger color for both)",
  "board-actions-focus": "record-action button keyboard focus-ring color",
  "board-actions-danger": "record-action button color for tone=danger (text and border)",
  "board-actions-disabled-opacity": "opacity of a record-action button while a record's action is in flight",
  "board-radius-full": "count badge corner radius",
  // calendar
  "calendar-selected-background": "selected mode-switch button background",
  "calendar-selected-color": "selected mode-switch button text color",
  "calendar-notice-border": "notice border color",
  "calendar-notice-background": "notice background",
  "calendar-status-color": "live-region (status) text color",
  "calendar-status-accent": "live-region leading bar color",
  "calendar-status-background": "live-region background",
  "calendar-day-min": "minimum day-cell block size",
  "calendar-outside-color": "text color of a day outside the current month",
  "calendar-outside-background": "background of a day outside the current month",
  today: "today ring and badge color",
  "calendar-link": "move-trigger / overflow button text color",
  "calendar-radius-full": "legend/entry swatch corner radius (circular)",
  "calendar-drop-target": "drag drop-target outline color",
  "calendar-drop-target-background": "drag drop-target background",
  "calendar-actions-link": "record-action / actions-trigger / Cancel text color",
  "calendar-actions-border": "record-action button and actions-panel border color",
  "calendar-actions-focus": "record-action keyboard focus ring color",
  "calendar-actions-danger": "danger-tone record-action text and border color",
  "calendar-actions-disabled-opacity": "disabled (action in flight) record-action opacity",
  "slot-0": "colour slot 0 (categorical entry/legend color)",
  "slot-1": "colour slot 1 (categorical entry/legend color)",
  "slot-2": "colour slot 2 (categorical entry/legend color)",
  "slot-3": "colour slot 3 (categorical entry/legend color)",
  "slot-4": "colour slot 4 (categorical entry/legend color)",
  "slot-5": "colour slot 5 (categorical entry/legend color)",
  "slot-6": "colour slot 6 (categorical entry/legend color)",
  "slot-7": "colour slot 7 (categorical entry/legend color)",
  // boolean
  "boolean-size": "box size",
  // button
  "button-padding": "inner padding", tap: "minimum tap-target height (phone)",
  "primary-color": "primary variant text", "primary-background": "primary variant background",
  "secondary-color": "secondary variant text", "secondary-background": "secondary variant background",
  "disabled-opacity": "opacity when disabled",
  // count
  "count-gap": "gap between label and value",
  "value-size": "value font size", "value-color": "value color",
  // date
  "date-padding": "inner padding",
  // error-summary
  "error-summary-spacing": "space after the summary", "error-summary-padding": "inner padding",
  "error-summary-bar-width": "leading bar width", "error-summary-bar": "leading bar color",
  "error-summary-radius": "corner radius", "error-summary-background": "background",
  "error-summary-color": "message color", "hint-color": "hint color",
  // field-frame
  "field-frame-gap": "gap between label, control and error",
  "field-frame-spacing": "space after the field", "label-size": "label font size",
  "label-color": "label color", "checkbox-tap": "minimum tap-target height of the checkbox label (phone)",
  "required-color": "required-marker color", "error-size": "error font size", "error-color": "error color",
  // number
  "number-gap": "gap between input and unit",
  "unit-size": "unit font size", "unit-color": "unit color",
  // panel
  "panel-padding": "inner padding",
  // pager (card 15e)
  "pager-gap": "gap between the paging buttons and the count text",
  "pager-info-color": "color of the count text between the buttons",
  "pager-font-family": "font family of the whole control",
  // skeleton (card 15e)
  "skeleton-color": "fill of a placeholder bar",
  "skeleton-sheen-color": "colour of the shimmer sweep across a bar",
  "skeleton-radius": "corner radius of a placeholder bar",
  "skeleton-duration": "how long one shimmer sweep takes (removed under reduced motion)",
  // section
  "section-spacing": "space after the section", "section-padding": "inner padding",
  "section-background": "background", "title-size": "title font size",
  "title-weight": "title font weight", "title-color": "title color",
  // reference
  "reference-font-family": "status line font family", "reference-status-gap": "space between the picker and the status line",
  "reference-status-font-size": "status line font size", "reference-status-color": "status line color",
  "reference-status-color-error": "status line color when options failed to load",
  "reference-missing-color": "label color when the record is missing or could not be looked up",
  "reference-listbox-z": "stacking order of the combobox popup", "reference-listbox-gap": "space between the input and the popup",
  "reference-listbox-max-height": "tallest the popup grows before it scrolls", "reference-listbox-background": "popup background",
  "reference-listbox-border": "popup border color", "reference-listbox-border-width": "popup border width", "reference-listbox-radius": "popup corner radius",
  "reference-option-tap": "minimum option height, the tap target on a phone", "reference-option-padding": "option padding",
  "reference-option-font-size": "option font size", "reference-option-color": "option text color",
  "reference-option-background-active": "background of the keyboard-highlighted option", "reference-option-outline-active": "outline color of the keyboard-highlighted option",
  "reference-option-weight-selected": "font weight of the currently selected option",
  // select
  "select-padding": "inner padding", "select-tap": "minimum tap-target height (phone)",
  // table
  "table-spacing": "space after the table", "table-font-size": "cell font size",
  "table-color": "text color", "table-caption-size": "caption font size",
  "cell-padding": "cell padding", "table-border": "row border color",
  "header-background": "header background", "table-card-radius": "corner radius of a stacked row card (phone)", "table-label-color": "stacked cell label color (phone)",
  "sort-tap": "minimum tap-target height of a sortable header (phone)",
  "empty-color": "empty-state text color",
  // tabs
  "tabs-ring-clearance": "clearance around the focus ring (padding + indicator offset)",
  "tabs-gap": "gap between tabs", "tabs-spacing": "space after the tab list",
  "tabs-padding": "tab inner padding", "tabs-color": "unselected tab color",
  "indicator-width": "selected-tab indicator thickness",
  "selected-color": "selected tab color", "indicator": "selected-tab indicator color",
  "tabs-tap": "minimum tap-target height (phone)",
  // text
  "text-padding": "inner padding",
  "text-diff-added-color": "underline colour of an added word-diff run (compare column; never the only signal)",
  "text-diff-added-background": "background of an added word-diff run",
  "text-diff-removed-color": "strike-through colour of a removed word-diff run",
  "text-diff-removed-background": "background of a removed word-diff run",
  // table record actions (RFC 0007)
  "table-actions-link": "record-action button text colour",
  "table-actions-border": "record-action button border colour",
  "table-actions-focus": "record-action button focus-ring colour",
  "table-actions-danger": "danger-tone action text and border colour",
  "table-disabled-opacity": "opacity of a disabled (pending) action button",
};

function tokensIn(value: string): string[] {
  const found = new Set<string>();
  const re = /--yadad-([a-z0-9-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) if (m[1] !== undefined && TOKEN_SET.has(m[1])) found.add(m[1]);
  return [...found].sort();
}

function describeDefault(def: string | undefined): string {
  if (def === undefined || def === "") return "no default — the host must set it";
  const d = def.trim();
  // exact single-token fallback
  const t = d.match(/^var\((--yadad-([a-z0-9-]+))\)$/);
  if (t && t[1] !== undefined && t[2] !== undefined && TOKEN_SET.has(t[2])) return `token \`${t[1]}\` (${TOKEN_DESCRIPTION[t[2]] ?? t[2]})`;
  const toks = tokensIn(d);
  if (toks.length) return `\`${d}\` (token-derived: ${toks.map((x) => `\`--yadad-${x}\``).join(", ")}${/\d+\s*(px|rem|em)/.test(d) ? "" : ""})`;
  return `\`${d}\``;
}

function componentOf(fileRel: string): string {
  // sets/base/<component>/vN/<component>.css
  const parts = fileRel.split(path.sep);
  return parts[2] ?? "";
}

export interface ComponentDoc {
  comp: string;
  intro: string | undefined;
  parts: string[];
  marked: Set<string>;
  vars: { order: string[]; map: Map<string, { def: string | undefined; fromDef: boolean }> };
  tokens: string[];
}

export function loadSources(): ComponentDoc[] {
  const cssFiles = globSync(path.join(SETS, "**", "*.css")).sort();
  const components = [...new Set(cssFiles.map((f) => componentOf(path.relative(root, f))))].sort();
  const data: ComponentDoc[] = [];
  for (const comp of components) {
    const cssFile = cssFiles.find((f) => path.basename(f) === `${comp}.css` && f.includes(`/${comp}/`));
    if (cssFile === undefined) throw new Error(`THEMING.md: no ${comp}.css found`);
    const css = readFileSync(cssFile, "utf8");
    const { code } = stripComments(css);
    const tsxFile = path.join(path.dirname(cssFile), `${toPascal(comp)}.tsx`);
    const tsx = existsSafe(tsxFile);

    // data-parts from the TSX (the rendered surface), in first-seen order.
    // Also record which parts carry the data-yadad marker on their own tag
    // (targetable in the compound form) and which are nested inside the
    // component root (descendant form only) — a host that styles a nested
    // part with the compound form silently matches nothing.
    const parts: string[] = [];
    const marked = new Set<string>();
    if (tsx) {
      scanParts(tsx).forEach((isMarked, part) => {
        parts.push(part);
        if (isMarked) marked.add(part);
      });
    }

    // Per-component variables: custom-property definitions inside the layer
    // (value wins as the documented default) and `var(--yadad-<comp>-x,
    // fallback)` references (fallback becomes the default when no definition
    // exists). Unique by suffix, first-seen order.
    const defs = parseLayerBody(code);
    const vars = new Map<string, { def: string | undefined; fromDef: boolean }>();
    const order: string[] = [];
    const note = (name: string, def: string | undefined, fromDef: boolean): void => {
      const prev = vars.get(name);
      if (prev === undefined) { order.push(name); vars.set(name, { def, fromDef }); }
      else if (fromDef) prev.def = def; // definition overrides inline default
    };
    for (const [name, def] of defs) if (name.startsWith(comp + "-")) note(name.slice(comp.length + 1), def, true);
    for (let i = code.indexOf("var("); i !== -1; ) {
      const ref = scanVarRef(code, i);
      if (ref.name.startsWith(`--yadad-${comp}-`)) note(ref.name.slice(`--yadad-${comp}-`.length), ref.fallback, false);
      i = code.indexOf("var(", ref.close + 1);
    }

    // theme tokens read anywhere in the CSS.
    const tokens = new Set<string>();
    const reTok = /--yadad-([a-z0-9-]+)/g;
    let mk: RegExpExecArray | null;
    while ((mk = reTok.exec(code)) !== null) if (mk[1] !== undefined && TOKEN_SET.has(mk[1])) tokens.add(mk[1]);

    data.push({ comp, intro: COMPONENT_INTRO[comp], parts, marked, vars: { order, map: vars }, tokens: [...tokens].sort() });
  }
  return data;
}
function toPascal(s: string): string { return s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(""); }
function existsSafe(p: string): string | null { try { return readFileSync(p, "utf8"); } catch { return null; } }

/**
 * data-parts in first-seen order, with whether the part's own tag carries the
 * data-yadad marker (true = compound selector, false = descendant form).
 *
 * A tag ends at `>` OUTSIDE braces and quotes: `{...}` attribute expressions
 * legitimately contain `>` (arrow functions: `aria-label={(x) => ...}`), and
 * a naive `[^>]*` scan truncates the tag there, silently dropping any
 * data-part written after an arrow in the same opening tag.
 */
export function scanParts(tsx: string): Map<string, boolean> {
  const found = new Map<string, boolean>();
  const tagStart = /<([a-zA-Z][a-zA-Z0-9.]*)\b/g;
  let mt: RegExpExecArray | null;
  while ((mt = tagStart.exec(tsx)) !== null) {
    const end = findTagEnd(tsx, mt.index + 1);
    if (end === -1) break;
    const tag = tsx.slice(mt.index, end + 1);
    tagStart.lastIndex = end + 1;
    const partM = tag.match(/data-part="([a-z0-9-]+)"/);
    if (!partM || partM[1] === undefined) continue;
    const part = partM[1];
    const isMarked = /data-yadad="[^"]+"/.test(tag);
    if (!found.has(part)) found.set(part, isMarked);
    else if (isMarked) found.set(part, true);
  }
  return found;
}

/** Index of the `>` that closes the tag starting at the `<` before `from`, or -1. */
function findTagEnd(tsx: string, from: number): number {
  let brace = 0;
  let quote: string | undefined;
  for (let i = from; i < tsx.length; i++) {
    const c = tsx[i];
    if (quote !== undefined) {
      if (c === quote) quote = undefined;
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
    } else if (c === "{") {
      brace++;
    } else if (c === "}") {
      if (brace > 0) brace--;
    } else if (c === ">" && brace === 0) {
      return i;
    }
  }
  return -1;
}

// Balanced scanner for a `var(...)` reference starting at the "v" of `var`.
// Returns { name, fallback, close } — fallback is the full default expression
// (itself possibly a var() or calc(...)), or undefined when there is none.
// Balanced because defaults nest: var(--a, var(--b)) or var(--x, calc(...)).
function scanVarRef(code: string, start: number): { name: string; fallback: string | undefined; close: number } {
  const open = code.indexOf("(", start);
  let depth = 0, idx = -1;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) { idx = i; break; } }
  }
  const inner = code.slice(open + 1, idx);
  const comma = inner.indexOf(",");
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
  return { name, fallback, close: idx };
}

// Parse custom-property declarations in the file's single `@layer` body.
// Comments are already blanked, so the braces scanned here are real CSS
// braces. Returns a Map of `--yadad-<name>` -> raw value at any nesting depth.
function parseLayerBody(code: string): Map<string, string> {
  const lm = code.match(/^@layer\s+yadad\.[a-z0-9.-]+\s*\{/);
  if (!lm) return new Map();
  const openBrace = (lm.index ?? 0) + lm[0].length - 1;
  let depth = 0, bodyEnd = -1;
  for (let i = openBrace; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") { depth--; if (depth === 0) { bodyEnd = i; break; } }
  }
  if (bodyEnd === -1) return new Map();
  const body = code.slice(openBrace + 1, bodyEnd);
  const props = new Map<string, string>();
  // Declarations split on top-level semicolons (depth 0 relative to the body).
  const decls: string[] = [];
  let buf = "", d = 0;
  for (const c of body) {
    if (c === "{") d++;
    else if (c === "}") d--;
    if (c === ";" && d === 0) { decls.push(buf); buf = ""; } else buf += c;
  }
  if (buf.trim()) decls.push(buf);
  for (const decl of decls) {
    const m = decl.match(/--yadad-([a-z0-9-]+)\s*:\s*([\s\S]*)$/);
    if (m && m[1] !== undefined && m[2] !== undefined) props.set(m[1], m[2].trim());
  }
  return props;
}

export function generateThemingDoc(): string {
  const src = loadSources();
  const L: string[] = [];
  const push = (s = ""): void => { L.push(s); };
  // Silent-drift guard: the description tables are hand-curated; if the CSS or
  // TSX declares a part or variable suffix that is not described here, fail
  // loudly instead of emitting a "component variable" placeholder.
  for (const c of src) {
    for (const p of c.parts) if (!PART_DESCRIPTION[c.comp]?.[p]) throw new Error(`THEMING.md: ${c.comp} data-part "${p}" has no description in PART_DESCRIPTION`);
    for (const name of c.vars.order) {
      const key = `${c.comp}-${name}`;
      if (!VAR_DESCRIPTION[key] && !VAR_DESCRIPTION[name]) throw new Error(`THEMING.md: --yadad-${key} has no description in VAR_DESCRIPTION`);
    }
  }
  push("# Theming reference");
  push();
  push("> Generated by `scripts/theming.ts` from the component CSS and TSX. Do not");
  push("> edit by hand — run `pnpm theming:docs` to regenerate. The gate fails if this");
  push("> file drifts from the CSS (`scripts/theming.test.ts`).");
  push();
  push("## How to theme yadad");
  push();
  push("Every component styles itself through a public, host-configurable surface (engine DECISIONS D15). You theme yadad three ways, in order of preference:");
  push();
  push("1. **Theme tokens** — set the `--yadad-*` tokens on `:root` (or any scope). This restyles the *whole* set at once and is the right tool for a new color scheme, a different spacing scale, a new font, or a different radius. Components read tokens only; they never hard-code a color, length, radius or font, so a token override reaches every component.");
  push("2. **Per-component variables** — set a `--yadad-<component>-<name>` on a component (or any ancestor) to override just that part. Each defaults to a token, so you inherit the theme and override one value. Use these to nudge a single component without touching the rest (a different button radius, a custom table header background).");
  push("3. **`data-part` selectors** — target a part directly with the `data-part` attribute for anything the variables don't expose. Parts that carry the `data-yadad=\"<component>\"` marker on their own tag take the compound form `[data-yadad=\"text\"][data-part=\"input\"]`; parts nested inside the component root take the descendant form `[data-yadad=\"table\"] [data-part=\"header\"]`. Stable names; renaming one is a breaking change.");
  push();
  push("**Why host CSS wins.** All component CSS lives in `@layer yadad.components` (tokens in `@layer yadad.tokens`, ordered before it). Unlayered host CSS always beats layered CSS, and an earlier layer beats a later one — so your unlayered rules win, and you can also override the tokens by writing your own `@layer yadad.tokens` *before* importing the component styles, or by unlayered `:root` custom properties.");
  push();
  push("### Restyling one component");
  push();
  push("Give every input a pill shape and a thicker focus ring, in just your host CSS — no component edits:");
  push();
  push("```css");
  push("/* unlayered, so it wins over @layer yadad.components */");
  push(":root {");
  push("  --yadad-radius-sm: 999px;              /* token: rounds every small-radius surface */");
  push("}");
  push("/* 'input' is nested inside the field root, so this is the descendant form */");
  push("[data-yadad=\"text\"] [data-part=\"input\"] {");
  push("  --yadad-text-border: var(--yadad-color-accent);  /* per-component variable */");
  push("  padding-inline-start: var(--yadad-space-4);     /* data-part selector */");
  push("}");
  push("```");
  push();
  push("A full, clearly-different look (rounded, high-contrast, a brand color) is exactly what the gallery's third theme demonstrates — it is built only from the tokens and variables documented below.");
  push();
  push("## Theme tokens");
  push();
  push("Set these on `:root` (or any scope). Each is `--yadad-<name>`.");
  push();
  push("| Token | Purpose |");
  push("| --- | --- |");
  for (const name of TOKENS) push(`| \`--yadad-${name}\` | ${TOKEN_DESCRIPTION[name]} |`);
  push();
  push("## Components");
  for (const c of src) {
    push();
    push(`### ${c.comp}`);
    push();
    push(c.intro);
    push();
    push(`**\`data-part\` names** (marked parts carry the component marker and take \`[data-yadad="<component>"][data-part="<name>"]\`; nested parts are inside the component root and take the descendant form \`[data-yadad="<component>"] [data-part="<name>"]\` — the compound form on a nested part matches nothing):`);
    push();
    for (const p of c.parts) {
      const d = PART_DESCRIPTION[c.comp]?.[p];
      if (!d) throw new Error(`THEMING.md: ${c.comp} data-part "${p}" has no description`);
      const form = c.marked.has(p)
        ? `[data-yadad="${c.comp}"][data-part="${p}"]`
        : `[data-yadad="${c.comp}"] [data-part="${p}"]`;
      push(`- \`${p}\` — ${d} (target with \`${form}\`)`);
    }
    push();
    push("**Per-component variables** (set on the component or an ancestor; the default is shown):");
    push();
    for (const name of c.vars.order) {
      const def = c.vars.map.get(name)?.def;
      push(`- \`--yadad-${c.comp}-${name}\` — ${VAR_DESCRIPTION[`${c.comp}-${name}`] ?? VAR_DESCRIPTION[name] ?? "component variable"}; default: ${describeDefault(def)}`);
    }
    push();
    push(`**Theme tokens it reads:** ${c.tokens.length ? c.tokens.map((t) => `\`--yadad-${t}\``).join(", ") : "none"}`);
  }
  push();
  return L.join("\n");
}

// --- CLI --------------------------------------------------------------------
const cmd = process.argv[2] ?? "check";
if (cmd === "write") {
  const doc = generateThemingDoc();
  writeFileSync(THEMING_MD, doc + "\n");
  console.log(`THEMING.md written (${doc.split("\n").length} lines)`);
} else if (cmd === "check") {
  const { files, violations, exceptions } = checkStyles();
  for (const e of exceptions) console.log(`EXCEPT ${e.file}:${e.line}  [${e.kind}] ${e.msg}  (theming: exception)`);
  for (const v of violations) console.log(`FAIL   ${v.file}:${v.line}  [${v.kind}] ${v.msg}`);
  console.log(`\n${files.length} files checked, ${violations.length} violations, ${exceptions.length} exceptions`);
  if (violations.length) process.exit(1);
} else {
  console.error(`unknown command: ${cmd} (use check or write)`);
  process.exit(2);
}
