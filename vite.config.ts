import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Builds the configurator into `dist/app`, which `src/server.ts` serves.
 *
 * `base: "./"` matters: the page is served from a loopback origin whose port
 * changes every run, and absolute asset paths would be fine — but relative ones
 * also survive being opened from a file path while developing, and cost
 * nothing.
 */
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./app/src", import.meta.url)) },
  },
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
  },
  server: {
    // `npm run dev` serves the UI with hot reload; the API comes from a
    // separately-run `npm run dev:cli`, whose port it proxies to. Without this
    // the dev UI has no /api/state and renders nothing.
    proxy: {
      "/api": {
        target: process.env.ONBOARD_API ?? "http://127.0.0.1:7777",
        changeOrigin: true,
      },
    },
  },
});
