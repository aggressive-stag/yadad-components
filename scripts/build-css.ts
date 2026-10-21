// Concatenates every component stylesheet into dist/yadad-components.css, the
// one pre-built file hosts import (or skip). Plain CSS, no tooling (D15).
// Also writes dist/styles/<name>.css per set (card 15b) so a consumer can
// import one component's rules without the whole sheet; each fragment carries
// the same @layer preamble so cascade order survives whichever subset is used.
import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const files = globSync("sets/**/*.css").sort();
const preamble = [
  "/* @yadad/components: pre-built styles. Every rule is in @layer yadad.components; */",
  "/* unlayered host CSS always wins. Tokens come from @yadad/theme (--yadad-*). */",
  "@layer yadad.tokens, yadad.components;",
];

const css = [
  ...preamble,
  ...files.map((f) => `\n/* ${f} */\n${readFileSync(f, "utf8").trim()}`),
].join("\n");
mkdirSync("dist", { recursive: true });
writeFileSync("dist/yadad-components.css", css + "\n");

// Per-component fragments: sets/base/<name>/v1/*.css -> dist/styles/<name>.css
mkdirSync("dist/styles", { recursive: true });
let fragments = 0;
for (const f of files) {
  const m = f.match(/^sets\/base\/([^/]+)\/[^/]+\/.+\.css$/);
  if (!m) continue;
  const out = `dist/styles/${m[1]}.css`;
  const body = [
    `/* @yadad/components: ${f} only. Layered with @yadad.tokens; unlayered host CSS wins. */`,
    "@layer yadad.tokens, yadad.components;",
    readFileSync(f, "utf8").trim(),
  ].join("\n");
  writeFileSync(out, body + "\n");
  fragments++;
}
console.log(`dist/yadad-components.css: ${files.length} stylesheets; dist/styles/: ${fragments} fragments`);
