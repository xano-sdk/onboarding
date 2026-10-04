/**
 * The argument list `xanosdk init` would have been given.
 *
 * Its own module, with no imports beyond the wire types, because BOTH halves
 * need it: the CLI runs it, and the browser's review step shows it. Anything
 * that reaches the client cannot touch `node:*`, and `scaffold.ts` pulls in
 * `node:fs` and `node:child_process`.
 *
 * Keeping it in one place matters more than the file count. The command shown
 * in the browser is a promise that running it reproduces the project, and a
 * second implementation of the same argv is a promise that silently stops being
 * true.
 */
import type { OnboardConfig } from "./protocol.js";

/**
 * The argv `xanosdk init` would have been given.
 *
 * Exported for the tests: the argument list is the whole contract with the SDK,
 * and asserting on it is how this stays honest without scaffolding a project
 * per case.
 */
export function initArgs(config: OnboardConfig, themePath: string | null): string[] {
  const args = [
    "init",
    config.directory,
    "--name",
    config.name,
    "--framework",
    config.framework,
    "--theme",
    themePath ?? (config.theme.kind === "preset" ? config.theme.id : "neutral"),
    "--radius",
    config.radius,
    "--dark",
    config.dark,
    "--icons",
    config.icons,
  ];
  if (config.fonts.sans !== undefined) args.push("--font", config.fonts.sans);
  if (config.fonts.mono !== undefined) args.push("--font-mono", config.fonts.mono);
  if (config.fonts.heading !== undefined) args.push("--font-heading", config.fonts.heading);
  // `init` writes AGENTS.md by default, so only the opt-out is spelled. It is
  // `--ai none` rather than `--no-agents-md` so every flag stays a name/value
  // pair, which is how the review screen wraps the command.
  if (!config.agentsMd) args.push("--ai", "none");
  /*
   * Add-ons ride on the same command rather than a loop afterwards.
   *
   * `init --marketplace` installs each package AND registers it in
   * `xano/index.ts`, which is what makes the command this module builds a
   * complete description of the project: the command printed on the review
   * screen produces the dependencies and the wiring both. A name the
   * marketplace does not list makes `init` exit before anything is written.
   */
  if (config.modules.length > 0) args.push("--marketplace", config.modules.join(","));
  return args;
}
