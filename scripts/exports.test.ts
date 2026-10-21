// Card 15b tripwire: every `exports` target must exist after a build.
// An export pointing at nothing typechecks and tests green right up until a
// consumer's import explodes, so this asserts the map against real files.
// `dist/` is rebuilt only when HEAD moved (cached via dist/.gate-build) so
// `pnpm test` after `pnpm build` is free and `pnpm test` alone is still right.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  exports: Record<string, string | Record<string, string>>;
};

/** Targets we assert: package-root-relative paths, `@yadad/source` skipped. */
function exportTargets(): { subpath: string; file: string }[] {
  const out: { subpath: string; file: string }[] = [];
  for (const [subpath, spec] of Object.entries(pkg.exports)) {
    if (typeof spec === "string") out.push({ subpath, file: spec });
    else
      for (const [condition, file] of Object.entries(spec)) {
        if (condition === "@yadad/source") continue;
        out.push({ subpath: `${subpath} (${condition})`, file });
      }
  }
  return out;
}

function headStamp(): string {
  const head = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  const exportsHash = createHash("sha256").update(JSON.stringify(pkg.exports)).digest("hex").slice(0, 12);
  return `${head}:${exportsHash}`;
}

const stamp = headStamp();
const marker = resolve(root, "dist/.gate-build");
if (!existsSync(marker) || readFileSync(marker, "utf8").trim() !== stamp) {
  execSync("pnpm build", { cwd: root, stdio: "pipe" });
  writeFileSync(marker, stamp + "\n");
}

describe("package exports map (card 15b)", () => {
  const targets = exportTargets();

  it("has the blessed root and mega-stylesheet entries", () => {
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["./styles.css"]).toBe("./dist/yadad-components.css");
  });

  it("covers every set directory, JS and CSS", () => {
    const sets = execSync("ls sets/base", { cwd: root }).toString().trim().split("\n").filter(Boolean);
    for (const name of sets) {
      expect(pkg.exports[`./${name}`], `missing ./exports entry ./${name}`).toBeDefined();
      expect(pkg.exports[`./styles/${name}.css`], `missing ./exports entry ./styles/${name}.css`).toBeDefined();
    }
  });

  it.each(targets)("exports[$subpath] resolves to a built file", (t) => {
    expect(existsSync(resolve(root, t.file)), `${t.file} missing from dist/`).toBe(true);
  });

  it("every set index.d.ts carries at least one export", () => {
    for (const [subpath, spec] of Object.entries(pkg.exports)) {
      if (subpath === "." || typeof spec === "string" || subpath.startsWith("./styles/")) continue;
      const types = spec.types;
      expect(types, `${subpath} has no types condition`).toBeTruthy();
      const dts = resolve(root, types as string);
      expect(readFileSync(dts, "utf8"), `${subpath} types are empty`).toMatch(/\bexport\s*(\{|\*|declare|type|interface|const|function)/);
    }
  });
});
