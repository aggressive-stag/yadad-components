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
});
