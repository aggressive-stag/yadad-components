// Concatenates every component stylesheet into dist/yadad-components.css, the
// one pre-built file hosts import (or skip). Plain CSS, no tooling (D15).
import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const files = globSync("sets/**/*.css").sort();
const css = [
  "/* @yadad/components: pre-built styles. Every rule is in @layer yadad.components; */",
  "/* unlayered host CSS always wins. Tokens come from @yadad/theme (--yadad-*). */",
  "@layer yadad.tokens, yadad.components;",
  ...files.map((f) => `\n/* ${f} */\n${readFileSync(f, "utf8").trim()}`),
].join("\n");
mkdirSync("dist", { recursive: true });
writeFileSync("dist/yadad-components.css", css + "\n");
console.log(`dist/yadad-components.css: ${files.length} stylesheets`);
