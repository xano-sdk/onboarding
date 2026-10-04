/**
 * @vitest-environment jsdom
 *
 * The wizard's entry point.
 *
 * The wizard opens on step one, with no landing screen in front of it, so the
 * first thing anyone wants to do — name the project — is the first thing on
 * screen.
 *
 * Most of this suite pins that a tool that writes to your filesystem and runs
 * `npm install` says so before you touch a control, and says where.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

const STATE = {
  cwd: "/home/dev/projects",
  suggestedName: "my-app",
  catalogue: [],
  catalogueError: null,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => STATE })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Render and wait for `GET /api/state` to land. */
async function renderApp() {
  render(<App />);
  await waitFor(() => expect(screen.getByLabelText("Project name")).toBeDefined());
}

describe("opening the configurator", () => {
  it("lands on step one, with no screen in front of it", async () => {
    await renderApp();

    // The name control is the first thing on screen.
    expect((screen.getByLabelText("Project name") as HTMLInputElement).value).toBe("my-app");
    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();
    expect(screen.getByRole("heading", { name: /set up your Xano SDK project/ })).toBeDefined();
  });

  it("still says what will happen and where, before anything is touched", async () => {
    await renderApp();
    expect(screen.getByText(/Nothing is written until the last step/)).toBeDefined();
    // The path itself rather than a sentence about it — the one fact somebody
    // needs before typing is where this lands.
    expect(screen.getByText(`${STATE.cwd}/my-app`)).toBeDefined();
  });

  it("writes a real command in the terminal, and rewrites it as you type", async () => {
    await renderApp();
    // A true prefix of the argv the CLI will run, not a decorative graphic.
    expect(screen.getByText(/xanosdk init/)).toBeDefined();
    expect(screen.getByText("my-app")).toBeDefined();
    expect(screen.getByText(/--framework react/)).toBeDefined();

    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "orders" } });
    expect(screen.getByText("orders")).toBeDefined();
    expect(screen.getByText(`${STATE.cwd}/orders`)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /SvelteKit/ }));
    expect(screen.getByText(/--framework svelte/)).toBeDefined();
  });

  it("wraps the command the way a shell does", async () => {
    await renderApp();
    // One backslash, not the two that JSX text yields for an escaped one — the
    // line is meant to be a continuation somebody could paste.
    const line = screen.getByText(/xanosdk init/).textContent ?? "";
    expect(line.trimEnd().endsWith("\\")).toBe(true);
    expect(line).not.toContain("\\\\");
  });

  it("shows the four steps in the header from the first frame", async () => {
    await renderApp();
    for (const title of [
      "Name and framework",
      "Configure styles",
      "Configure plugins",
      "Review and create",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(title) })).toBeDefined();
    }
  });

  it("lights each brand screen the same way", async () => {
    await renderApp();
    expect(document.querySelectorAll(".xo-glow")).toHaveLength(1);

    // Through to the plugins step. The style step is deliberately NOT lit —
    // its chrome stays plain because it frames a preview of someone's theme.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(document.querySelectorAll(".xo-glow")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Configure plugins" })).toBeDefined();
    expect(document.querySelectorAll(".xo-glow")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Review and create" })).toBeDefined();
    expect(document.querySelectorAll(".xo-glow")).toHaveLength(1);
  });

  it("has nothing to go back to", async () => {
    await renderApp();
    expect(screen.getByRole("button", { name: "Back" }).hasAttribute("disabled")).toBe(true);
  });
});
