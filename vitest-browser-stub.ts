/**
 * No-op stand-in for vitest, aliased in for the browser only.
 * @yadad/testing/contract-kit imports vitest at module scope (it is a test
 * kit); the gallery page only reads the kit's exported fixture data, so the
 * describe/test/expect bindings just need to exist. Never loaded by vitest
 * itself — only by the gallery's Vite dev server and its jsdom smoke test,
 * which runs under vitest with its own real module graph.
 */
export const describe = (
  _name: string,
  fn: (suite: { describe: typeof describe; test: typeof test }) => void,
): void => {
  fn({ describe, test });
};
export const test = (_name: string, fn?: () => void): void => {
  fn?.();
};
export const it = test;
export const expect = (value: unknown): { toEqual(expected: unknown): void } => ({
  toEqual: () => {},
});
