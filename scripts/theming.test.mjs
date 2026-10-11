// The card 5 gate: the D15 theming rules are enforced (not just documented),
// and the generated reference cannot drift from the CSS.
//
//   1. `scripts/theming.mjs check` fails on hard-coded colors/lengths,
//      unlayered CSS, or an unexplained exception.
//   2. `THEMING.md` must be byte-identical to what `scripts/theming.mjs write`
//      produces from the current CSS + TSX. Regenerate with
//      `pnpm theming:docs` after touching a stylesheet.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkStyles, generateThemingDoc } from "./theming.mjs";

const THEMING_MD = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "THEMING.md");

describe("D15 theming rules (scripts/theming.mjs)", () => {
  test("every component stylesheet is layered, token-sourced, and exception-free", () => {
    const { files, violations, exceptions } = checkStyles();
    expect(files.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
    expect(exceptions).toEqual([]);
  });
});

describe("THEMING.md freshness", () => {
  test("THEMING.md matches the generated reference (run `pnpm theming:docs` after CSS changes)", () => {
    const committed = readFileSync(THEMING_MD, "utf8");
    const fresh = generateThemingDoc() + "\n";
    expect(committed).toBe(fresh);
  });

  test("the reference documents every component in sets/", () => {
    const { files } = checkStyles();
    const doc = readFileSync(THEMING_MD, "utf8");
    const components = [...new Set(files.map((f) => f.split("/")[2]))];
    for (const comp of components) {
      expect(doc, `section for ${comp}`).toContain(`### ${comp}\n`);
    }
  });
});
