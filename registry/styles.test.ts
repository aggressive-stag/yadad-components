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
});
