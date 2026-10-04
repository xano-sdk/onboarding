/**
 * The wizard's chrome: the opening screen, the framework step, and the progress
 * header.
 *
 * The steps are declared once, here, and every screen reads the same list — so
 * the numbering on the welcome screen and the numbering in the header cannot
 * disagree, and adding a step is one entry rather than three edits.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Framework } from "../../../src/protocol.js";
import { ReactLogo, SvelteLogo } from "@/components/logos";
import { Caret, Cmd, Cont, Live, Out, Terminal } from "@/components/terminal";
import { BrandGlow } from "@/components/ui";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type StepId = "framework" | "style" | "plugins" | "review";

/** The ordered steps, as the welcome screen and the header both present them. */
export const STEPS: ReadonlyArray<{
  id: StepId;
  title: string;
  blurb: string;
}> = [
  {
    id: "framework",
    title: "Name and framework",
    blurb:
      "What the project is called, and whether it is React with Vite or SvelteKit. Both ship the same components and the same theme.",
  },
  {
    id: "style",
    title: "Configure styles",
    blurb:
      "Start from one of six finished presets, then take the palette, radius, typefaces and icons anywhere you like — beside a working dashboard you can click through, type into and sort as you go.",
  },
  {
    id: "plugins",
    title: "Configure plugins",
    blurb:
      "Prebuilt backend modules: auth, chat, vector search. Installed and registered in your project for you.",
  },
  {
    id: "review",
    title: "Review and create",
    blurb: "Name it, choose whether it gets an AGENTS.md agent brief, and check what will be written before anything is.",
  },
];

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/** One framework, as a card you pick. */
const FRAMEWORKS: ReadonlyArray<{
  id: Framework;
  name: string;
  logo: typeof ReactLogo;
  tagline: string;
  points: readonly string[];
}> = [
  {
    id: "react",
    name: "React",
    logo: ReactLogo,
    tagline: "React 19 + Vite, styled with shadcn/ui.",
    points: [
      "Components copied into your repo and owned by you",
      "npx shadcn@latest add — pre-configured, no init step",
      "Imports through the @/ alias",
    ],
  },
  {
    id: "svelte",
    name: "SvelteKit",
    logo: SvelteLogo,
    tagline: "Svelte 5 runes + SvelteKit, styled with shadcn-svelte.",
    points: [
      "File-based routing, every route prerendered",
      "npx shadcn-svelte@latest add — same story, Svelte components",
      "No server at runtime — Xano is the backend",
    ],
  },
];

/**
 * The first step: what the project is called, and what it is built with.
 *
 * These two together because they are the only STRUCTURAL answers in the
 * wizard — everything after decides how the project LOOKS. The framework also
 * has to precede the style step for a concrete reason: the preview renders
 * shadcn components, and which kit those come from is this answer.
 *
 * The name lands here rather than beside the palette because it is the first
 * thing anyone knows about their own project, and asking for it on the screen
 * where they are choosing a colour makes it feel like a styling decision. It
 * stays editable at review, where the directory it implies is also in view.
 *
 * This is also where the wizard OPENS, with no landing screen in front of it:
 * what this builds, and where it lands, is stated here. A tool that writes to
 * your filesystem and runs `npm install` should say so before you touch a
 * control.
 *
 * Two columns, and the split is the argument: what you decide on the left, and
 * what it does to the command on the right.
 */
export function FrameworkStep({
  value,
  onChange,
  name,
  onName,
  cwd,
}: {
  value: Framework;
  onChange: (next: Framework) => void;
  name: string;
  onName: (next: string) => void;
  /** Where the command was run, so "./my-app" means something concrete. */
  cwd: string;
}) {
  const project = name.trim() === "" ? "my-app" : name.trim();
  const directory = `${cwd.replace(/\/$/, "")}/${project}`;
  return (
    <div className="xo-brand relative isolate mx-auto w-full max-w-6xl">
      <BrandGlow />

      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-7">
          <div className="xo-rise flex flex-col items-start gap-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs"
              style={{ borderColor: "var(--xo-brand)", color: "var(--xo-brand)" }}
            >
              npx @xano-sdk/onboard
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Let&rsquo;s set up your{" "}
              {/* The product's name is a code identifier, so it is set as one.
                  One word in the mono face is the whole type gesture on this
                  page — the alternative was a gradient, which every hero has. */}
              <span
                className="font-mono tracking-tighter"
                style={{ color: "var(--xo-brand)" }}
              >
                Xano SDK
              </span>{" "}
              project
            </h1>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed text-pretty">
              A Xano backend authored in TypeScript, and a frontend that derives its request paths
              and types from it — so the two can&rsquo;t drift.
            </p>
          </div>

          <div className="xo-rise flex flex-col gap-2" style={{ "--xo-rise-delay": "80ms" } as CSSProperties}>
            <label htmlFor="project-name" className="text-sm font-medium">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="my-app"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 h-12 w-full max-w-sm rounded-lg border px-3.5 font-mono text-base outline-none transition-[border-color,box-shadow] focus-visible:ring-[3px]"
            />
            {/* The path, not a sentence about the path. It is the one fact
                somebody needs before typing: where this lands. */}
            <p className="text-muted-foreground truncate font-mono text-xs" title={directory}>
              {directory}
            </p>
          </div>

          <div className="xo-rise flex flex-col gap-3" style={{ "--xo-rise-delay": "160ms" } as CSSProperties}>
            <div>
              <h2 className="text-sm font-medium">Frontend framework</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Both ship the same theme tokens, the same{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  frontend/src/lib/api.ts
                </code>{" "}
                contract, and the same backend. Only the UI layer differs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FRAMEWORKS.map((framework) => {
                const selected = framework.id === value;
                const Logo = framework.logo;
                return (
                  <button
                    key={framework.id}
                    type="button"
                    onClick={() => onChange(framework.id)}
                    aria-pressed={selected}
                    className={cn(
                      "group flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      selected ? "bg-accent/40" : "hover:bg-accent/20",
                    )}
                    style={selected ? { borderColor: "var(--xo-brand)" } : undefined}
                  >
                    <span className="flex w-full items-center gap-3">
                      {/* The marks draw in `currentColor`, so the colour is set
                          on a wrapper rather than threaded through their props. */}
                      <span
                        className="shrink-0 transition-colors"
                        style={selected ? { color: "var(--xo-brand)" } : undefined}
                      >
                        <Logo className={cn("size-7", !selected && "text-muted-foreground")} />
                      </span>
                      <span className="text-base font-semibold">{framework.name}</span>
                      <span
                        className={cn(
                          "ml-auto grid size-5 shrink-0 place-items-center rounded-full border text-xs transition-colors",
                          selected ? "text-white" : "border-input",
                        )}
                        style={
                          selected
                            ? { background: "var(--xo-brand)", borderColor: "var(--xo-brand)" }
                            : undefined
                        }
                        aria-hidden
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-sm">{framework.tagline}</span>
                    <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
                      {framework.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span aria-hidden>·</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="xo-rise text-muted-foreground text-xs" style={{ "--xo-rise-delay": "240ms" } as CSSProperties}>
            Nothing is written until the last step.
          </p>
        </div>

        <div className="xo-rise lg:pl-4" style={{ "--xo-rise-delay": "120ms" } as CSSProperties}>
          {/* The command is a true prefix of the argv the CLI runs, and it
              rewrites itself as you type. See components/terminal.tsx. */}
          <Terminal title={`${cwd} — zsh`} live>
            <Cmd>npx @xano-sdk/onboard</Cmd>
            <Out tone="ok">configurator listening on 127.0.0.1</Out>
            <Out>… waiting for you in the browser</Out>
            <div className="mt-4">
              <Out tone="comment">the command this page is writing</Out>
              <Cmd>
                xanosdk init <Live>{project}</Live> {"\\"}
              </Cmd>
              <Cont>{`  --framework ${value}`}</Cont>
              <Caret />
            </div>
          </Terminal>
        </div>
      </div>
    </div>
  );
}

/**
 * The persistent header: where you are, and how to move.
 *
 * Completed steps are clickable and steps ahead are not. Every choice in this
 * wizard is independent and reversible, so going back has no cost — but jumping
 * FORWARD past a step you have not seen means being asked to review decisions
 * you were never shown.
 */
export function StepHeader({
  current,
  onGoTo,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
}: {
  current: StepId;
  onGoTo: (id: StepId) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  children?: ReactNode;
}) {
  const index = stepIndex(current);
  return (
    <header className="bg-background/90 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b px-4 backdrop-blur md:px-6">
      <ol className="scroll-slim flex items-center gap-1 overflow-x-auto">
        {STEPS.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li key={step.id} className="flex items-center gap-1">
              {i > 0 && <span className="bg-border h-px w-4 shrink-0" aria-hidden />}
              <button
                type="button"
                onClick={() => done && onGoTo(step.id)}
                disabled={!done}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm whitespace-nowrap transition-colors",
                  active && "font-medium",
                  done && "text-muted-foreground hover:text-foreground cursor-pointer",
                  !done && !active && "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-xs tabular-nums",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground/60",
                  )}
                  aria-hidden
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="hidden md:inline">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="ml-auto flex items-center gap-2">
        {children}
        {/* Nothing behind the first step any more — the landing screen it used
            to go back to is now the step itself. */}
        <Button variant="ghost" size="sm" onClick={onBack} disabled={index === 0}>
          Back
        </Button>
        <Button size="sm" onClick={onNext} disabled={nextDisabled === true}>
          {nextLabel}
        </Button>
      </div>
    </header>
  );
}
