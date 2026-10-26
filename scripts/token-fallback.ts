// The zero-specificity fallback layer for the pre-built stylesheet.
//
// Components read `var(--yadad-*)` and ship no per-use fallbacks. A host that
// forgets to write the theme's tokens before mount would get a bare page with
// no error. So the pre-built CSS also declares the engine's default (light)
// token values under `:where(:root)` in `@layer yadad.tokens`: specificity 0,
// so any host-written token (themeToCss, an unlayered :root rule, a scoped
// theme on any element) wins. The values come from @yadad/theme's lightTheme
// at build time, so they cannot drift from the engine.
import { lightTheme, cssVarName, TOKEN_NAMES } from "@yadad/theme";

export function fallbackCss(): string {
  const body = TOKEN_NAMES.map((name) => `    ${cssVarName(name)}: ${lightTheme[name]};`).join("\n");
  return [
    "/* Fallback tokens: the default light theme, generated from @yadad/theme at build time. */",
    "/* Zero specificity (:where), so host-written tokens always win. */",
    `@layer yadad.tokens {\n  :where(:root) {\n${body}\n  }\n}`,
  ].join("\n");
}
