/**
 * `npx @xano-sdk/onboard [<dir>]` — the visual front door to `xanosdk init`.
 *
 * The flow is deliberately one-way and short-lived: start a loopback server,
 * open a browser, wait for exactly one answer, shut the server down, and finish
 * in the terminal. Nothing stays running, and nothing is left listening.
 *
 * It does not replace `xanosdk init`. Everything it can produce, `init` can
 * produce from flags — that is not a coincidence but the design constraint,
 * because a configuration you cannot express as a command is one you cannot
 * put in a script, a README, or a bug report. Onboarding is a nicer way to
 * arrive at those flags, not a second scaffolder.
 */
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fetchCatalogue } from "./catalogue.js";
import { serveConfigurator } from "./server.js";
import { collectRequirements, createProject, initArgs, type Reporter } from "./scaffold.js";
import type { OnboardConfig, OnboardState } from "./protocol.js";

const colorOn = (): boolean =>
  process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== "0" : !process.env.NO_COLOR && process.stderr.isTTY === true;

const paint = (code: string, s: string): string => (colorOn() ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s: string) => paint("1", s);
const dim = (s: string) => paint("2", s);
const cyan = (s: string) => paint("36", s);
const yellow = (s: string) => paint("33", s);
const red = (s: string) => paint("31", s);

/** Progress goes to stderr, so stdout stays clean for anything piping this. */
const report: Reporter = {
  step: (m) => process.stderr.write(`${cyan("→")} ${m}\n`),
  warn: (m) => process.stderr.write(`${yellow("!")} ${m}\n`),
};

const HELP = `${bold("npx @xano-sdk/onboard")} — configure a Xano SDK project in your browser

${bold("Usage")}
  npx @xano-sdk/onboard [dir] [options]

${bold("Options")}
  --name <n>       Project name (default: the target directory's basename)
  --port <n>       Fixed loopback port (default: an ephemeral one)
  --no-open        Print the URL instead of opening a browser
  --help, -h       Show this and exit

${bold("What it does")}
  Opens a local page to pick your framework, theme, fonts, icons and backend
  modules, then scaffolds the project here in your terminal. Everything it can
  produce, ${bold("xanosdk init")} can produce from flags — onboarding prints the
  equivalent command when it is done.
`;

interface Args {
  readonly dir: string;
  readonly name: string | undefined;
  readonly port: number | undefined;
  readonly open: boolean;
  readonly help: boolean;
}

export function parseArgs(argv: readonly string[]): Args {
  let dir = ".";
  let name: string | undefined;
  let port: number | undefined;
  let open = true;
  let help = false;
  let seenPositional = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--no-open") open = false;
    else if (arg === "--name") name = argv[++i];
    else if (arg.startsWith("--name=")) name = arg.slice("--name=".length);
    else if (arg === "--port") port = Number.parseInt(argv[++i] ?? "", 10);
    else if (arg.startsWith("--port=")) port = Number.parseInt(arg.slice("--port=".length), 10);
    else if (!arg.startsWith("-") && !seenPositional) {
      dir = arg;
      seenPositional = true;
    }
  }
  if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    throw new Error(`--port must be a port number, not "${String(port)}".`);
  }
  return { dir, name, port, open, help };
}

/**
 * Open a URL in the default browser.
 *
 * Best-effort by design. A headless box, a remote shell, or a locked-down
 * desktop all fail here, and none of them is a reason to stop — the URL is
 * printed either way, and that is the actual contract.
 */
function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    const child = spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Printed above regardless — see run().
  }
}

/** Where the built client lives, relative to this module at runtime. */
function appDir(): string {
  // dist/bin.js → dist/app. Resolved from import.meta.url rather than cwd,
  // because `npx` runs this from wherever the user happens to be standing.
  return fileURLToPath(new URL("./app", import.meta.url));
}

/** The `xanosdk init …` line that reproduces a config, for the closing summary. */
export function equivalentCommand(config: OnboardConfig): string {
  const args = initArgs(config, null);
  const quoted = args.map((a) => (/[^\w@./:=,-]/.test(a) ? JSON.stringify(a) : a));
  const base = `npx xanosdk ${quoted.join(" ")}`;
  if (config.theme.kind === "custom") {
    // A custom palette has no name, so the command cannot round-trip it. Say so
    // rather than print a line that silently scaffolds a different theme.
    return `${base}\n  ${dim("# --theme above is a placeholder: your edited palette lives in frontend/src/index.css")}`;
  }
  return base;
}

export async function run(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const targetDir = resolve(args.dir);
  const suggestedName = args.name ?? basename(targetDir);

  report.step("Fetching the module catalogue");
  const { entries, error } = await fetchCatalogue();
  if (error !== null) report.warn(error);

  const state: OnboardState = {
    cwd: process.cwd(),
    suggestedName,
    catalogue: entries,
    catalogueError: error,
  };

  const dir = appDir();
  if (!existsSync(dir)) {
    process.stderr.write(
      `${red("✗")} The configurator UI is missing from this install (expected ${dir}).\n` +
        `  Run \`npm run build\` if you are working on @xano-sdk/onboard itself.\n`,
    );
    return 1;
  }

  const server = await serveConfigurator({
    appDir: dir,
    state,
    ...(args.port === undefined ? {} : { port: args.port }),
  });

  process.stderr.write(
    `\n${bold("Configure your project in the browser:")}\n  ${cyan(server.url)}\n\n` +
      `${dim("Waiting for you to finish… (Ctrl+C to cancel)")}\n`,
  );
  if (args.open) openBrowser(server.url);

  let config: OnboardConfig;
  try {
    config = await server.config;
  } catch (err) {
    await server.close();
    process.stderr.write(`${yellow("!")} ${err instanceof Error ? err.message : String(err)}\n`);
    return 130;
  }
  // Closed before any scaffolding: the answer is in, and a server still
  // listening while npm runs is a port held open for no reason.
  await server.close();

  // Imported here rather than at module scope so `--help` and the catalogue
  // fetch never pay for loading the compiler.
  const { run: runXanoSdk } = await import("@xano/sdk/node");

  let outcome;
  try {
    outcome = await createProject(config, report, (a) => runXanoSdk(a) as Promise<unknown>);
  } catch (err) {
    process.stderr.write(`${red("✗")} ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  outcome = collectRequirements(outcome, entries);

  /*
   * `init` has already reported the scaffold, every module it installed, and
   * every one it could not register — it did that work, so it owns those lines.
   * What is left for onboarding to add is the part only the CATALOGUE knows.
   */
  const lines: string[] = [];
  if (outcome.requirements.length > 0) {
    lines.push("", bold("Before you deploy:"));
    for (const r of outcome.requirements) lines.push(`  • ${r}`);
  }
  lines.push("", dim("The same project, from flags:"), `  ${equivalentCommand(config)}`);
  process.stderr.write(lines.join("\n") + "\n");
  return 0;
}
