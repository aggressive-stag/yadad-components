import { defineConfig } from "vite";

/**
 * Gallery dev server (run with `pnpm gallery`). The @yadad/* packages are
 * linked from ../yadad and resolve to their TypeScript source (the
 * @yadad/source condition), so the engine does not need to be built. The
 * page itself only imports @yadad/core and @yadad/theme; the smoke test runs
 * under the root vitest config instead, so no test-runner code reaches the
 * browser bundle.
 */
export default defineConfig({
  root: "gallery",
  resolve: {
    dedupe: ["react", "react-dom"],
    conditions: ["@yadad/source", "module", "browser", "development|production"],
  },
  server: { port: 5199, strictPort: true },
});
