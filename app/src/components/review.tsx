/**
 * The last step: where it goes, whether it gets an agent brief, and what will be written.
 *
 * Deliberately the only screen that can write anything, and it says so. The two
 * decisions that live here — the directory and the agent brief — are
 * the ones you want in front of you at the moment you commit, not settings you
 * set twenty clicks ago and have to trust you got right.
 *
 * The `xanosdk init` command is shown rather than summarised. It is the same
 * argv the CLI is about to run (one module, imported by both halves), so it is
 * a reproducible record of this project rather than a description of one — and
 * seeing it is how anyone learns the flags exist.
 *
 * It is shown in the terminal that has been following you since step one, which
 * is where that thread ends: the command was a stub being typed on the first
 * screen, it grew an install line while you picked modules, and here it is the
 * whole sequence about to run. Same split as step one, too — what you decide on
 * the left, what it does on the right — because the last screen before writing
 * to somebody's filesystem should show the consequence next to the decision.
 *
 * The argv is wrapped one flag per line rather than printed as one long row.
 * Identical text, and the difference matters twice: a column narrow enough to
 * sit beside the form cannot scroll horizontally without hiding the end of the
 * command, and a wrapped command is what anybody would actually have typed.
 */
import { initArgs } from "../../../src/init-args.js";
import type { CatalogueEntry, OnboardConfig } from "../../../src/protocol.js";
import { Cmd, Cont, Out, Terminal } from "@/components/terminal";
import { BrandGlow, Field } from "@/components/ui";

/** One label→value row in the summary. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function Review({
  config,
  cwd,
  themeLabel,
  fontsLabel,
  selectedModules,
  onDirectory,
  onName,
  onAgentsMd,
}: {
  config: OnboardConfig;
  cwd: string;
  themeLabel: string;
  fontsLabel: string;
  selectedModules: readonly CatalogueEntry[];
  onDirectory: (value: string) => void;
  onName: (value: string) => void;
  onAgentsMd: (next: boolean) => void;
}) {
  // The flags the CLI will actually receive, minus the temp-file path a custom
  // palette travels by — that one cannot be typed back in, and the note below
  // says so rather than printing a command that scaffolds a different theme.
  const argv = initArgs(config, null).map((a) =>
    // The comma is in the safe set because `--marketplace @a,@b` takes a
    // list, and no shell needs it quoted.
    // Quoting it anyway printed a command that worked but looked like it had
    // been escaped for a reason nobody could see.
    /[^\w@./:=,-]/.test(a) ? JSON.stringify(a) : a,
  );
  /**
   * The argv as a person would have typed it: the subcommand and its target on
   * the first line, then one `--flag value` pair per line after it.
   *
   * Pairing is positional because that is what `initArgs` emits — a flag is
   * always followed by its value, and anything not starting with `--` after the
   * first two entries would be a bug in that module rather than something to
   * paper over here.
   */
  const flagLines: string[] = [];
  for (let i = 2; i < argv.length; i += 2) {
    flagLines.push(`${argv[i]} ${argv[i + 1] ?? ""}`.trimEnd());
  }
  const head = `xanosdk ${argv[0]} ${argv[1]}`;
  const installs = selectedModules.map((m) => m.npmPackage);

  return (
    <div className="xo-brand xo-rise relative isolate mx-auto flex w-full max-w-6xl flex-col gap-8">
      <BrandGlow />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Review and create</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nothing has been written yet. This is the last step.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-6">

      <section className="flex flex-col gap-4 rounded-xl border p-5">
        <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">Project</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="review-name">
            <input
              id="review-name"
              value={config.name}
              onChange={(e) => onName(e.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            />
          </Field>
          <Field label="Directory" htmlFor="review-directory">
            <input
              id="review-directory"
              value={config.directory}
              onChange={(e) => onDirectory(e.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 font-mono text-sm"
            />
          </Field>
        </div>
        <p className="text-muted-foreground text-xs">
          Relative to <code className="bg-muted rounded px-1.5 py-0.5 font-mono">{cwd}</code>
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <div>
          <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">
            Agent brief
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            One file that any coding agent can read: how this SDK works, what the theme tokens
            are, and what not to invent.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.agentsMd}
            onChange={() => onAgentsMd(!config.agentsMd)}
          />
          Write AGENTS.md
        </label>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">Summary</h2>
        <div className="divide-border mt-2 divide-y">
          <Row label="Framework">{config.framework === "react" ? "React + Vite" : "SvelteKit"}</Row>
          <Row label="Theme">
            {themeLabel}
            {config.theme.kind === "custom" && (
              <span className="text-muted-foreground"> (edited)</span>
            )}
          </Row>
          <Row label="Radius">
            <code className="font-mono text-xs">{config.radius}</code>
          </Row>
          <Row label="Dark mode">{config.dark}</Row>
          <Row label="Typography">{fontsLabel}</Row>
          <Row label="Icons">{config.icons}</Row>
          <Row label="Modules">
            {selectedModules.length === 0 ? (
              <span className="text-muted-foreground">none</span>
            ) : (
              selectedModules.map((m) => m.title).join(", ")
            )}
          </Row>
        </div>
      </section>

      {selectedModules.some((m) => m.requirements.length > 0) && (
        <section className="rounded-xl border p-5">
          <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">
            You will need, before deploying
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[...new Set(selectedModules.flatMap((m) => m.requirements))]
              // "Nothing — it deploys as-is." is a real catalogue value, and
              // listing it as a to-do is worse than listing nothing.
              .filter((r) => !/^nothing\b/i.test(r.trim()))
              .map((req) => (
                <li key={req} className="text-muted-foreground flex gap-2 text-sm">
                  <span aria-hidden>·</span>
                  <span>{req}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

        </div>

        {/* Sticky: the recap is the reason to scroll the left column, and
            losing sight of it while checking a directory defeats the point. */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">
            What runs when you press Create
          </h2>
          <Terminal title={`${cwd} — zsh`} className="max-h-[26rem]">
            <Cmd>
              {head}
              {flagLines.length > 0 ? " \\" : ""}
            </Cmd>
            {flagLines.map((line, i) => (
              <Cont key={line}>
                {"  "}
                {line}
                {i < flagLines.length - 1 ? " \\" : ""}
              </Cont>
            ))}
            {installs.length > 0 && (
              // No separate install block any more: `--marketplace a,b` is one
              // of the flag lines above, because that is how the CLI takes it.
              <Out tone="comment">
                each add-on installed and registered in xano/index.ts
              </Out>
            )}
            <div className="mt-3">
              <Out tone="ok">{config.directory} created</Out>
              <Out>and you are back in your terminal</Out>
            </div>
          </Terminal>
          {config.theme.kind === "custom" ? (
            <p className="text-muted-foreground text-xs">
              Your edited palette has no preset name, so <code className="font-mono">--theme</code>{" "}
              above is a placeholder — the real tokens are written into{" "}
              <code className="font-mono">frontend/src/index.css</code>.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Onboarding is a nicer way to arrive at these flags, not a different way to build the
              project. Running that command produces exactly this.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
