/**
 * The contract between the two halves of onboarding: a Node CLI and a browser
 * app that never share a process.
 *
 * Both import this file, so the wire shape is checked at compile time on each
 * side rather than trusted at runtime on one. That matters more here than in a
 * normal client/server split, because the two are shipped together in one
 * package and versioned as one thing — a drift between them is not a
 * compatibility problem to negotiate, it is a bug.
 *
 * Everything here is plain data. No imports from either half, so neither can
 * pull the other's runtime in through this module.
 */

/** Which framework fills `frontend/`. Mirrors the SDK's `FrameworkId`. */
export type Framework = "react" | "svelte";

/** What switches the app into its dark palette. Mirrors the SDK's `DarkMode`. */
export type DarkMode = "system" | "toggle" | "off";

/**
 * A theme, as the browser sends it back.
 *
 * Two forms, because the configurator has two modes and they are not the same
 * decision. `preset` is "one of the pairs the SDK already knows", which the CLI
 * forwards as `--theme zinc-blue` — the scaffold then renders it from its own
 * tables, and the stylesheet is identical to what any other route would produce.
 * `custom` is "I edited the tokens", which cannot be named, so the CLI writes it
 * to a temporary registry item and passes the path.
 *
 * Sending the resolved token map in BOTH cases and always writing a file would
 * be simpler by one branch, and worse: a scaffold whose stylesheet came from a
 * temp file records no theme name, so the README and the agent brief lose the
 * one piece of provenance anybody needs later.
 */
export type ThemeSelection =
  | { readonly kind: "preset"; readonly id: string }
  | {
      readonly kind: "custom";
      /** A label for the README, e.g. `Custom (from Zinc Blue)`. */
      readonly label: string;
      /** Resolved `:root` tokens, without the leading `--`. */
      readonly light: Record<string, string>;
      /** Resolved `.dark` tokens. */
      readonly dark: Record<string, string>;
    };

/** The typefaces, by Tailwind slot. Absent means the system stack. */
export interface FontSelection {
  readonly sans?: string;
  readonly mono?: string;
  readonly heading?: string;
}

/** Everything the browser decides. One POST, one object, one scaffold. */
export interface OnboardConfig {
  /** Project directory, relative to where the command was run, or absolute. */
  readonly directory: string;
  /** npm package name. The CLI sanitises it again — never trust the client. */
  readonly name: string;
  readonly framework: Framework;
  readonly theme: ThemeSelection;
  /** A CSS length, or a bare number meaning rem. */
  readonly radius: string;
  readonly dark: DarkMode;
  readonly fonts: FontSelection;
  readonly icons: string;
  /**
   * Whether `init` writes the `AGENTS.md` agent brief. One file serves every
   * agent, so this is a switch rather than a choice of tools.
   */
  readonly agentsMd: boolean;
  /** npm packages from the marketplace, in the order they should be installed. */
  readonly modules: readonly string[];
}

/**
 * One marketplace module, trimmed to what the picker renders.
 *
 * A projection of the catalogue's record rather than a pass-through: the
 * catalogue is a public API that can grow columns, and a picker that forwards
 * whatever it receives is a picker whose shape is decided elsewhere. `includes`
 * survives because the count — "3 tables, 5 endpoints" — is the most useful
 * thing on the card, and `requirements` because a module you cannot run without
 * an API key should say so BEFORE you select it, not after the scaffold.
 */
export interface CatalogueEntry {
  readonly slug: string;
  readonly npmPackage: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly includes: ReadonlyArray<{
    readonly kind: string;
    readonly name: string;
    readonly summary: string;
  }>;
  readonly requirements: readonly string[];
  /** Verbatim, to be inserted into `xano/index.ts`. Never reassembled. */
  readonly registerSnippet: string;
  readonly docsUrl: string | null;
  readonly repoUrl: string | null;
}

/** What `GET /api/state` hands the app on load. */
export interface OnboardState {
  /** Where the command was run — shown so the user knows what `./my-app` means. */
  readonly cwd: string;
  /** Default project name, from the directory or `--name`. */
  readonly suggestedName: string;
  /** Base colors, accents, fonts and icon sets, resolved from the SDK's tables. */
  readonly catalogue: readonly CatalogueEntry[];
  /**
   * Why the catalogue is empty, when it is.
   *
   * Distinguishing "there are no modules" from "we could not reach the
   * catalogue" is the difference between a UI that says nothing is available
   * and one that says the network is down — and only the second is ever true
   * today.
   */
  readonly catalogueError: string | null;
}

/** What `POST /api/create` answers, before the CLI takes over the terminal. */
export interface CreateResponse {
  readonly ok: boolean;
  /** Absolute path the project will be written to, for the closing screen. */
  readonly directory: string;
  /** Set when the config was rejected — the app shows it rather than closing. */
  readonly error?: string;
}
