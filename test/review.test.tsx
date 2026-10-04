/**
 * @vitest-environment jsdom
 *
 * The last screen, and the promise it keeps.
 *
 * The command shown here is not an illustration of the project — it is the argv
 * the CLI is about to run, built by the one module both halves import. That is
 * the whole reason `init-args.ts` exists as its own file, and the reason this
 * suite compares what is on screen against `initArgs` directly rather than
 * against a string typed out by hand: a second copy of the expected command is
 * a second thing that can silently stop being true.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Review } from "@/components/review";
import { initArgs } from "../src/init-args.js";
import type { CatalogueEntry, OnboardConfig } from "../src/protocol.js";

afterEach(cleanup);

const CONFIG: OnboardConfig = {
  directory: "onboard-demo",
  name: "onboard-demo",
  framework: "react",
  theme: { kind: "preset", id: "stone-orange" },
  radius: "1rem",
  dark: "system",
  fonts: { sans: "inter", heading: "manrope" },
  icons: "lucide",
  agentsMd: true,
  modules: [],
};

const AUTH: CatalogueEntry = {
  slug: "auth",
  npmPackage: "@xano-sdk/auth",
  title: "Auth",
  tagline: "Sessions and a me endpoint.",
  description: "",
  tags: [],
  includes: [],
  requirements: ["A mail provider"],
  registerSnippet: "auth()",
  docsUrl: null,
  repoUrl: null,
};

function renderReview(config: OnboardConfig = CONFIG, modules: readonly CatalogueEntry[] = []) {
  render(
    <Review
      config={config}
      cwd="/home/dev"
      themeLabel="Stone Orange"
      fontsLabel="Inter / Manrope headings"
      selectedModules={modules}
      onDirectory={vi.fn()}
      onName={vi.fn()}
      onAgentsMd={vi.fn()}
    />,
  );
}

/** Every line of the terminal recap, joined the way a shell would read it. */
const recap = () =>
  Array.from(document.querySelectorAll(".xo-term p"))
    .map((p) => p.textContent ?? "")
    .join("\n");

describe("what runs when you press Create", () => {
  it("shows the argv the CLI will actually be given", () => {
    renderReview();
    const text = recap();
    const argv = initArgs(CONFIG, null);

    // The subcommand and its target lead, then every flag pair in order.
    expect(text).toContain(`xanosdk ${argv[0]} ${argv[1]}`);
    for (let i = 2; i < argv.length; i += 2) {
      expect(text).toContain(`${argv[i]} ${argv[i + 1]}`);
    }
  });

  it("wraps one flag per line, the way a person would type it", () => {
    renderReview();
    const lines = recap().split("\n").filter((l) => l.startsWith("  --"));
    expect(lines.length).toBeGreaterThan(4);
    // Continuations, not two backslashes and not a trailing one on the last row.
    expect(lines.slice(0, -1).every((l) => l.trimEnd().endsWith("\\"))).toBe(true);
    expect(recap()).not.toContain("\\\\");
  });

  it("carries the add-ons as one flag on the command, not a second step", () => {
    renderReview();
    expect(recap()).not.toContain("--marketplace");

    cleanup();
    renderReview({ ...CONFIG, modules: ["@xano-sdk/auth", "@xano-sdk/vector"] }, [AUTH]);
    // One line however many were picked, because that is how the CLI takes it —
    // and never raw npm or a per-module install, which would be a second way to
    // describe the same operation.
    expect(recap()).toContain("--marketplace @xano-sdk/auth,@xano-sdk/vector");
    expect(recap()).not.toContain("npm i ");
    expect(recap()).not.toContain("marketplace install");
  });

  it("ends where the wizard started — back in the terminal", () => {
    renderReview();
    expect(screen.getByText(/back in your terminal/)).toBeDefined();
    expect(screen.getByText(/onboard-demo created/)).toBeDefined();
  });

  it("says a hand-edited palette cannot be reproduced by that flag", () => {
    renderReview({
      ...CONFIG,
      theme: { kind: "custom", label: "Custom (Xano)", light: {}, dark: {} },
    });
    expect(screen.getByText(/is a placeholder/)).toBeDefined();
  });
});

describe("the decisions that live on this screen", () => {
  it("keeps the directory and the agent brief editable at the moment of writing", () => {
    renderReview();
    // Reachable by name, not by position — the label is a real one.
    expect((screen.getByLabelText("Directory") as HTMLInputElement).value).toBe("onboard-demo");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("onboard-demo");
    expect(
      (screen.getByLabelText("Write AGENTS.md") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("names only the file init writes, never a per-agent file", () => {
    renderReview();
    const text = document.body.textContent ?? "";
    expect(text).toContain("AGENTS.md");
    expect(text).not.toMatch(/CLAUDE\.md|\.cursor|\.mdc|GEMINI/);
  });

  it("opts out with `--ai none` and says nothing when the brief is on", () => {
    expect(initArgs(CONFIG, null)).not.toContain("--ai");
    const off = initArgs({ ...CONFIG, agentsMd: false }, null);
    expect(off.slice(off.indexOf("--ai"))).toEqual(["--ai", "none"]);
  });

  it("surfaces what a picked module needs before it can deploy", () => {
    renderReview({ ...CONFIG, modules: ["@xano-sdk/auth"] }, [AUTH]);
    expect(screen.getByText("A mail provider")).toBeDefined();
  });
});
