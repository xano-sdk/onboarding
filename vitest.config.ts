import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Two kinds of test in one run.
 *
 * The CLI half is plain Node. The preview pane is React, and the only way to
 * check that it is genuinely interactive — that a click sorts, that typing
 * filters — is to render it and drive it. Those files opt into jsdom with a
 * `@vitest-environment` docblock, so the Node suites keep starting instantly.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/src", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    environment: "node",
  },
});
