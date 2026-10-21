// The card 5 gate: the D15 theming rules are enforced (not just documented),
// and the generated reference cannot drift from the CSS.
//
//   1. `scripts/theming.ts check` fails on hard-coded colors/lengths,
//      unlayered CSS, or an unexplained exception.
//   2. `THEMING.md` must be byte-identical to what `scripts/theming.ts write`
//      produces from the current CSS + TSX. Regenerate with
//      `pnpm theming:docs` after touching a stylesheet.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkFile, checkStyles, generateThemingDoc, scanParts } from "./theming.ts";

const THEMING_MD = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "THEMING.md");

describe("D15 theming rules (scripts/theming.ts)", () => {
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

describe("reduced-motion guard rail (card 15c)", () => {
  const wrap = (body: string) => `@layer yadad.components {\n${body}\n}\n`;

  test("a transition without a reduced-motion override fails the check", () => {
    const { violations } = checkFile("fixture.css", wrap('  :where([data-yadad="x"]) { transition: opacity 120ms; }'));
    expect(violations.map((v) => v.kind)).toContain("motion");
  });

  test("an animation without a reduced-motion override fails the check", () => {
    const { violations } = checkFile("fixture.css", wrap('  :where([data-yadad="x"]) { animation: shimmer 1s infinite; }'));
    expect(violations.map((v) => v.kind)).toContain("motion");
  });

  test("motion with a reduced-motion media block in the same file passes", () => {
    const css = wrap(
      '  :where([data-yadad="x"]) { transition: opacity 120ms; }\n' +
        "  @media (prefers-reduced-motion: reduce) {\n    :where([data-yadad=\"x\"]) { transition: none; }\n  }",
    );
    const { violations } = checkFile("fixture.css", css);
    expect(violations.filter((v) => v.kind === "motion")).toEqual([]);
  });

  test("transition: none / animation: none need no guard", () => {
    const { violations } = checkFile("fixture.css", wrap('  :where([data-yadad="x"]) { transition: none; animation: none; }'));
    expect(violations.filter((v) => v.kind === "motion")).toEqual([]);
  });

  test("no stylesheet in sets/ trips the guard (and none animates yet)", () => {
    const { violations } = checkStyles();
    expect(violations.filter((v) => v.kind === "motion")).toEqual([]);
  });
});

describe("scanParts (data-part extraction)", () => {
  test("a data-part after an arrow function in the same tag is not dropped", () => {
    // Regression: the old `[^>]*` tag scan stopped at the `>` of `(x) => ...`
    // inside an attribute expression, silently losing parts that came after.
    const tsx = `
      <div role="group" aria-label={(label: string) => \`\${label} navigation\`} data-part="nav">
        <button data-part="nav-previous">Previous</button>
      </div>`;
    expect([...scanParts(tsx).keys()]).toEqual(["nav", "nav-previous"]);
  });

  test("a `>` inside a quoted attribute cannot end the tag", () => {
    const tsx = `<span title="a > b" data-part="tip" data-yadad="badge">x</span>`;
    expect([...scanParts(tsx).entries()]).toEqual([["tip", true]]);
  });

  test("marker detection stays per-tag (compound vs descendant form)", () => {
    const tsx = `<section data-yadad="board"><ul data-part="cards"></ul></section>`;
    expect([...scanParts(tsx).entries()]).toEqual([["cards", false]]);
  });
});
