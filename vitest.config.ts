import { fileURLToPath } from "node:url";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

const local = (pkg: string) => fileURLToPath(new URL(`./node_modules/${pkg}`, import.meta.url));

export default defineConfig({
  resolve: {
    // @yadad/testing is linked from ../yadad (until contract-v0 is published)
    // and would load its own React. Point it at this repo's Testing Library,
    // whose react-dom then shares this repo's React, so hooks work.
    alias: { "@testing-library/react": local("@testing-library/react") },
    dedupe: ["react", "react-dom"],
    // Linked @yadad/* packages resolve to their TypeScript source, so this repo
    // never depends on the engine having been built.
    conditions: ["@yadad/source", ...defaultClientConditions],
  },
  ssr: { resolve: { conditions: ["@yadad/source", ...defaultServerConditions] } },
  test: {
    include: ["{sets,registry}/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
