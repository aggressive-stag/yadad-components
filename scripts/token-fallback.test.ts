// A host that forgets to write the theme tokens must still get a styled page:
// the pre-built CSS carries a zero-specificity fallback generated from
// @yadad/theme's lightTheme. These checks keep that layer present and complete.
import { execFileSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { TOKEN_NAMES, lightTheme } from "@yadad/theme";
import { fallbackCss } from "./token-fallback.ts";

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Declared custom properties (per-component variables) and var() references.
// A reference with a fallback argument (var(--x, ...)) is an optional host
// override and needs no declaration; a bare var(--x) must be declared or a token.
const sets = globSync("sets/**/*.css").map((f) => stripComments(readFileSync(f, "utf8")));
const declared = new Set(sets.flatMap((c) => [...c.matchAll(/(--yadad-[\w-]+)\s*:/g)].map((m) => m[1]!)));
const referenced = new Set(sets.flatMap((c) => [...c.matchAll(/var\(\s*(--yadad-[\w-]+)\s*\)/g)].map((m) => m[1]!)));
const referencedAny = new Set(sets.flatMap((c) => [...c.matchAll(/var\(\s*(--yadad-[\w-]+)/g)].map((m) => m[1]!)));

describe("token fallback layer", () => {
  test("declares every theme token at the light value, at zero specificity", () => {
    const css = fallbackCss();
    expect(css).toContain(":where(:root)");
    for (const name of TOKEN_NAMES) expect(css).toContain(`--yadad-${name}: ${lightTheme[name]};`);
  });

  test("every --yadad-* the component CSS reads is a theme token or a per-component variable", () => {
    const tokens = new Set(TOKEN_NAMES.map((n) => `--yadad-${n}`));
    const orphans = [...referenced].filter((v) => !tokens.has(v) && !declared.has(v));
    expect(orphans).toEqual([]);
    // and every token actually read is covered by the fallback
    const css = fallbackCss();
    for (const v of referencedAny) if (tokens.has(v)) expect(css).toContain(`${v}:`);
  });

  describe("built stylesheets", () => {
    beforeAll(() => {
      execFileSync("node", ["scripts/build-css.ts"], { stdio: "pipe" });
    });

    test("dist/yadad-components.css and every fragment ship the fallback after the layer order", () => {
      for (const f of ["dist/yadad-components.css", ...globSync("dist/styles/*.css")]) {
        const css = readFileSync(f, "utf8");
        const order = css.indexOf("@layer yadad.tokens, yadad.components;");
        const fallback = css.indexOf(":where(:root)");
        expect(order, f).toBeGreaterThanOrEqual(0);
        expect(fallback, f).toBeGreaterThan(order);
        for (const name of TOKEN_NAMES) expect(css, f).toContain(`--yadad-${name}: ${lightTheme[name]};`);
      }
    });
  });
});
