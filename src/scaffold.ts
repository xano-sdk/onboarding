/**
 * Turning a browser's answer into a project.
 *
 * The scaffold itself is NOT reimplemented here. `@xano/sdk/node` exports
 * `run(argv)` — the CLI's own dispatcher — so onboarding builds the argument
 * list `xanosdk init` would have received and calls it. Everything the SDK
 * guarantees about a scaffold (the lock, the agent files, the one contract
 * between `xano/` and `frontend/`) therefore holds here for free, and a change
 * to `init` reaches onboarding without a release of onboarding.
 *
 * The custom-theme path is the reason this is possible at all: `--theme` takes
 * a path to a shadcn registry item, so an arbitrary token map edited in the
 * browser needs no new SDK surface. It is written to a temp file, passed by
 * path, and deleted.
 *
 * Marketplace add-ons are not onboarding's work either. `init
 * --marketplace <a,b>` installs each package and registers it in
 * `xano/index.ts`, so the argv this module builds is a COMPLETE description of
 * the project, and the CLI reads each installed package's own `xanosdk` block
 * to wire it.
 *
 * What stays is the part the CLI cannot know — the catalogue's `requirements`,
 * the API keys and accounts a module needs before it will deploy. Those come
 * from the marketplace record, not from the package.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CatalogueEntry, OnboardConfig } from "./protocol.js";
import { initArgs } from "./init-args.js";

// Re-exported so the CLI and the tests keep one import site for it.
export { initArgs } from "./init-args.js";

/** What the terminal reports once everything has run. */
export interface ScaffoldOutcome {
  readonly directory: string;
  /** The packages asked for. `init` reports what it did with each of them. */
  readonly modules: readonly string[];
  /** Deduplicated requirements from every selected module — API keys and the like. */
  readonly requirements: readonly string[];
}

/** Progress, so the CLI owns every line printed and this module owns none. */
export interface Reporter {
  step(message: string): void;
  warn(message: string): void;
}


/**
 * A custom theme, as a shadcn registry item.
 *
 * The same JSON shape `npx shadcn add <url>` consumes, so the file onboarding
 * writes is a legitimate registry theme — it could be published as one, and
 * `xanosdk init --theme <that file>` outside onboarding produces the same
 * project.
 */
function writeThemeFile(config: OnboardConfig): string | null {
  if (config.theme.kind !== "custom") return null;
  const dir = mkdtempSync(join(tmpdir(), "xanosdk-onboard-theme-"));
  const path = join(dir, "theme.json");
  writeFileSync(
    path,
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: config.theme.label,
        title: config.theme.label,
        type: "registry:theme",
        cssVars: { light: config.theme.light, dark: config.theme.dark },
      },
      null,
      2,
    ),
    "utf8",
  );
  return path;
}

export async function createProject(
  config: OnboardConfig,
  report: Reporter,
  run: (argv: string[]) => Promise<unknown>,
): Promise<ScaffoldOutcome> {
  const directory = resolve(config.directory);
  const themePath = writeThemeFile(config);
  try {
    report.step(`Scaffolding ${config.name} in ${directory}`);
    // One call. `initArgs` carries the add-ons as `--marketplace`, so `init`
    // installs and registers them itself and prints its own progress for both.
    await run(initArgs(config, themePath));
  } finally {
    // The temp theme has served its purpose the moment init has read it.
    if (themePath !== null) rmSync(join(themePath, ".."), { recursive: true, force: true });
  }

  return { directory, modules: config.modules, requirements: [] };
}

/**
 * The one thing about a module the CLI cannot tell you: what it needs from YOU.
 *
 * `requirements` is a catalogue field — "a Gemini API key", "an SMTP account" —
 * and it describes the world outside the project, so it is not in the package
 * and `init` never sees it. Collected here and printed after the scaffold,
 * where it is a to-do list rather than a footnote on a card you have scrolled
 * past.
 */
export function collectRequirements(
  outcome: ScaffoldOutcome,
  entries: readonly CatalogueEntry[],
): ScaffoldOutcome {
  const selected = entries.filter((e) => outcome.modules.includes(e.npmPackage));
  const requirements = [...new Set(selected.flatMap((e) => e.requirements))].filter(
    // "Nothing — it deploys as-is." is a real catalogue value and printing it as
    // a to-do is worse than printing nothing.
    (text) => !/^nothing\b/i.test(text.trim()),
  );
  return { ...outcome, requirements };
}

