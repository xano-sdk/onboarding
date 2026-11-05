import { defineConfig } from "vitest/config";

/**
 * The end-to-end check (`npm run test:e2e`): scaffolds a real project, installs it, deploys it to a Xano Engine
 * and signs up through it. Kept out of `npm test`, which needs no network or backend.
 */
export default defineConfig({
  test: {
    include: ["test/e2e/**/*.e2e.ts"],
    environment: "node",
    testTimeout: 600_000,
    fileParallelism: false,
  },
});
