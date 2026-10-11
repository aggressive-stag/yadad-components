import { globSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

// D15 guardrails: every stylesheet is layered, and values come from tokens.
const files = globSync("sets/**/*.css");

describe.each(files)("%s", (file) => {
  const css = readFileSync(file, "utf8");
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");

  test("everything is inside @layer yadad.components", () => {
    expect(body.trim().startsWith("@layer yadad.components {")).toBe(true);
    expect(body.trim().endsWith("}")).toBe(true);
  });

  test("no hard-coded colors", () => {
    expect(body.match(/#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|lab|lch)\(/gi) ?? []).toEqual([]);
  });

  test("lengths other than hairlines come from tokens", () => {
    expect(body.match(/\b(?!1px\b)\d*\.?\d+(px|rem|em)\b/g) ?? []).toEqual([]);
  });

  test("the tabs list scrolls internally and clears the focus ring", () => {
    // Regression guard for card 3: a long tab list used to force the host
    // page to scroll horizontally (overflow-x:visible), and the scroll
    // container that fixes that clips the focus ring at its padding box.
    if (!file.includes("/tabs/")) return;
    const listRule = body.match(
      /:where\(\[data-yadad="tabs"\]\)\s*:where\(\[data-part="list"\]\)(?:::after)?\s*\{([^}]*)\}/
    );
    expect(listRule, "tabs list rule").toBeTruthy();
    if (!listRule) throw new Error("tabs list rule missing");
    const rule = listRule[1];
    // Long lists must scroll within the tablist, not the host page, so a
    // keyboard user can reach a far tab with arrow keys.
    expect(rule).toMatch(/overflow-x:\s*auto/);
    // The ring extends focus-ring-width + outline-offset past the tab, so the
    // clip region needs that much clearance on every side.
    expect(rule).toMatch(/--yadad-tabs-ring-clearance:\s*calc\(var\(--yadad-focus-ring-width\)\s*\+\s*var\(--yadad-space-1\)\)/);
    expect(rule).toMatch(/padding-block:\s*var\(--yadad-tabs-ring-clearance\)/);
    expect(rule).toMatch(/padding-inline:\s*var\(--yadad-tabs-ring-clearance\)/);
  });

  test("phone tap targets carry a documented, token-derived minimum size", () => {
    // Regression guard for card 4: buttons, checkboxes, sortable headers,
    // tabs and pickers are thumb targets and need a 44px minimum. 44px cannot
    // be written as a literal (the length guard above) nor composed from the
    // theme's length tokens (the largest is space-4), so each component
    // declares a --yadad-<component>-tap variable whose default is a
    // token-derived calc: two space-4 plus space-3 is 44px at the default
    // tokens, and it doubles with any host token rescale.
    const tapDefault = "calc(var(--yadad-space-4) * 2 + var(--yadad-space-3))";
    const byComponent: Record<string, { var: string; sel: string }> = {
      "/button/": { var: "--yadad-button-tap", sel: ':where([data-yadad="button"][data-part="root"])' },
      "/field-frame/": { var: "--yadad-field-frame-checkbox-tap", sel: ':has([data-yadad="boolean"])' },
      "/table/": { var: "--yadad-table-sort-tap", sel: ':where([data-part="sort"])' },
      "/tabs/": { var: "--yadad-tabs-tap", sel: ':where([data-part="tab"])' },
      "/select/": { var: "--yadad-select-tap", sel: ':where([data-yadad="select"][data-part="input"])' },
    };
    const spec = Object.entries(byComponent).find(([part]) => file.includes(part));
    if (!spec) return; // only the five tap-target components are guarded
    const [, { var: tapVar, sel }] = spec;
    // The rule that the variable is applied to exists and references the
    // component's variable with the token-derived default.
    expect(body, `${tapVar} declaration`).toContain(
      `min-block-size: var(${tapVar}, ${tapDefault});`
    );
    // It is scoped to the control itself, not the whole component.
    expect(body, "scoped selector").toContain(sel);
    if (file.includes("/field-frame/")) {
      // The floor applies to the label of checkbox fields only; a
      // non-checkbox field's label must not be affected.
      expect(body, "checkbox-only scoping").toContain(":has([data-yadad=\"boolean\"])");
    }
  });

  test("wide content wraps or truncates instead of pushing the page sideways", () => {
    // Regression guard for card 4: on a narrow screen a long count value and a
    // native date control used to force the host page to scroll horizontally.
    // The count value must be allowed to break (an unbroken number at 200%
    // text is wider than any phone), and the date input must be able to
    // shrink below its intrinsic width (min-inline-size: 0) so it truncates
    // its own fields rather than growing the track.
    if (!file.includes("/count/")) return;
    const valueRule = body.match(/:where\(\[data-yadad="count"\]\)\s*:where\(\[data-part="value"\]\)\s*\{([^}]*)\}/);
    expect(valueRule, "count value rule").toBeTruthy();
    if (valueRule) {
      expect(valueRule[1]).toMatch(/overflow-wrap:\s*break-word/);
      expect(valueRule[1]).toMatch(/min-inline-size:\s*0/);
    }
  });

  test("the date input can shrink below its intrinsic width", () => {
    // Regression guard for card 4: a native date control has a minimum width
    // (its fields must be visible). Without min-inline-size: 0 that minimum
    // grows a grid track past the available space at 320px + 200% text and
    // forces the host page to scroll sideways.
    if (!file.includes("/date/")) return;
    const inputRule = body.match(/:where\(\[data-yadad="date"\]\[data-part="input"\]\)\s*\{([^}]*)\}/);
    expect(inputRule, "date input rule").toBeTruthy();
    if (inputRule) expect(inputRule[1]).toMatch(/min-inline-size:\s*0/);
  });
});
