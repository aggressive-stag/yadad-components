import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const local = (pkg: string) => fileURLToPath(new URL(`./node_modules/${pkg}`, import.meta.url));

export default defineConfig({
  resolve: {
    // @yadad/testing is linked from ../yadad (until contract-v0 is published)
    // and would load its own React. Point it at this repo's Testing Library,
    // whose react-dom then shares this repo's React, so hooks work.
    alias: { "@testing-library/react": local("@testing-library/react") },
    dedupe: ["react", "react-dom"],
  },
  test: {
    include: ["{sets,registry}/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
