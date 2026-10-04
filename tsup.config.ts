import { defineConfig } from "tsup";

export default defineConfig({
  entry: { bin: "src/bin.ts", index: "src/index.ts" },
  format: ["esm"],
  dts: false,
  // Wipes dist/ on every build. It used to be false so the CLI build would not
  // destroy dist/app — which meant stale chunks accumulated and SHIPPED: the
  // first published tarball carried 8 chunks where 1 was live, plus their
  // source maps. The build order is now cli-then-app, so cleaning here is safe
  // and dist contains only what this build produced.
  clean: true,
  sourcemap: true,
  target: "es2022",
  // The scaffolding itself is the SDK's job — see src/scaffold.ts. Bundling a
  // copy of it here would give a project two compilers that can disagree about
  // what `init` writes.
  external: ["@xano/sdk", "@xano/sdk/node", "@xano/sdk/scaffold"],
});
