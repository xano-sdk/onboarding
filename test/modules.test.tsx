/**
 * @vitest-environment jsdom
 *
 * The marketplace step, driven.
 *
 * Everything here is about a catalogue that GROWS. Three modules is a list you
 * read; the interesting failures start at thirty, and none of them are visible
 * with three fixtures on screen — so the tests exercise the machinery that
 * only earns its keep at scale: search across everything a module says about
 * itself, tag filters that narrow rather than widen, a pinned record of what
 * you have picked, and long-form detail that does not disturb the grid.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ModulePicker } from "@/components/modules";
import type { CatalogueEntry } from "../src/protocol.js";

afterEach(cleanup);

function entry(over: Partial<CatalogueEntry> = {}): CatalogueEntry {
  return {
    slug: "auth",
    npmPackage: "@xano-sdk/auth",
    title: "Auth",
    tagline: "Email and password, sessions, and a me endpoint.",
    description: "A full authentication module with tables, endpoints and a session task.",
    tags: ["security"],
    includes: [
      { kind: "table", name: "users", summary: "One row per account." },
      { kind: "endpoint", name: "POST /auth/login", summary: "" },
      { kind: "endpoint", name: "GET /auth/me", summary: "" },
    ],
    requirements: [],
    registerSnippet: "auth()",
    docsUrl: "https://example.test/docs",
    repoUrl: "https://example.test/repo",
    ...over,
  };
}

const CATALOGUE: readonly CatalogueEntry[] = [
  entry(),
  entry({
    slug: "chatbot",
    npmPackage: "@xano-sdk/chatbot",
    title: "Chatbot",
    tagline: "A streaming assistant over your own data.",
    tags: ["ai"],
    requirements: ["An Anthropic API key"],
    includes: [{ kind: "endpoint", name: "POST /chat", summary: "" }],
  }),
  entry({
    slug: "vector",
    npmPackage: "@xano-sdk/vector",
    title: "Vector search",
    tagline: "Embeddings and nearest-neighbour lookup.",
    tags: ["ai", "search"],
    includes: [{ kind: "table", name: "embeddings", summary: "" }],
  }),
];

function renderPicker(selected: readonly string[] = []) {
  const onToggle = vi.fn();
  render(
    <ModulePicker
      catalogue={CATALOGUE}
      error={null}
      selected={selected}
      onToggle={onToggle}
      icons="lucide"
    />,
  );
  return { onToggle };
}

/** The cards, by their accessible name — the toggle is the card's body. */
const cardNames = () =>
  screen
    .getAllByRole("button", { pressed: false })
    .map((b) => b.textContent ?? "")
    .filter((t) => t.includes("@xano-sdk/"));

describe("the module grid", () => {
  it("renders one card per module", () => {
    renderPicker();
    expect(screen.getByText("Auth")).toBeDefined();
    expect(screen.getByText("Chatbot")).toBeDefined();
    expect(screen.getByText("Vector search")).toBeDefined();
    expect(screen.getByText("3 modules")).toBeDefined();
  });

  it("summarises what each module adds", () => {
    renderPicker();
    // Auth ships one table and two endpoints; the card says so without expanding.
    const auth = within(screen.getByText("Auth").closest("article")!);
    expect(auth.getByText("1 table")).toBeDefined();
    expect(auth.getByText("2 endpoints")).toBeDefined();
  });

  it("flags a module that needs setup", () => {
    renderPicker();
    expect(screen.getAllByText("needs setup")).toHaveLength(1);
  });

  it("toggles a module from its card", () => {
    const { onToggle } = renderPicker();
    fireEvent.click(screen.getByText("Chatbot"));
    expect(onToggle).toHaveBeenCalledWith("@xano-sdk/chatbot");
  });

  it("pins what has been picked, as the command it becomes", () => {
    const { onToggle } = renderPicker(["@xano-sdk/auth", "@xano-sdk/vector"]);
    expect(screen.getByText("2 modules selected")).toBeDefined();
    // Not a row of chips, and not one install line per module: the single
    // `--marketplace` flag those selections become on the init command. It
    // stays one line however many you pick, and it is a fragment of the exact
    // command the review screen prints.
    expect(screen.getByText(/--marketplace/)).toBeDefined();
    expect(screen.queryByText(/npm i /)).toBeNull();
    expect(screen.queryByText(/marketplace install/)).toBeNull();

    // And still the fastest way to drop one — you do not have to find the card.
    fireEvent.click(screen.getByRole("button", { name: /Remove Auth/ }));
    expect(onToggle).toHaveBeenCalledWith("@xano-sdk/auth");
  });
});

describe("finding a module in a catalogue that grew", () => {
  const search = () => screen.getByPlaceholderText(/Search modules/);

  it("searches past the title, into what a module actually does", () => {
    renderPicker();
    // "embeddings" is in a tagline and an object name, never in a title.
    fireEvent.change(search(), { target: { value: "embeddings" } });
    expect(screen.getByText("1 of 3 modules")).toBeDefined();
    expect(screen.getByText("Vector search")).toBeDefined();
    expect(screen.queryByText("Chatbot")).toBeNull();
  });

  it("narrows across tags rather than widening", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "ai" }));
    expect(screen.getByText("2 of 3 modules")).toBeDefined();

    // AND, not OR: adding a second tag can only ever remove results.
    fireEvent.click(screen.getByRole("button", { name: "search" }));
    expect(screen.getByText("1 of 3 modules")).toBeDefined();
    expect(screen.getByText("Vector search")).toBeDefined();
  });

  it("says so when nothing matches, and clears back", () => {
    renderPicker();
    fireEvent.change(search(), { target: { value: "zzzz" } });
    expect(screen.getByText("Nothing matches that")).toBeDefined();
    expect(cardNames()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(cardNames()).toHaveLength(3);
  });
});

describe("module detail", () => {
  it("opens over the grid and leaves it alone", () => {
    renderPicker();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(within(screen.getByText("Auth").closest("article")!).getByText("Details"));
    const dialog = screen.getByRole("dialog");
    // The long form: everything the card had to leave out.
    expect(within(dialog).getByText(/full authentication module/)).toBeDefined();
    expect(within(dialog).getByText("POST /auth/login")).toBeDefined();
    expect(within(dialog).getByText("One row per account.")).toBeDefined();
    // The grid is untouched behind it.
    expect(cardNames()).toHaveLength(3);
  });

  it("lists what a module needs before you take it", () => {
    renderPicker();
    fireEvent.click(within(screen.getByText("Chatbot").closest("article")!).getByText("Details"));
    expect(screen.getByText("An Anthropic API key")).toBeDefined();
  });

  it("can add from the detail, and closes on Escape", () => {
    const { onToggle } = renderPicker();
    fireEvent.click(within(screen.getByText("Auth").closest("article")!).getByText("Details"));

    fireEvent.click(screen.getByRole("button", { name: "Add to project" }));
    expect(onToggle).toHaveBeenCalledWith("@xano-sdk/auth");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("when the catalogue cannot be read", () => {
  it("says so, and says the project can still be created", () => {
    render(
      <ModulePicker
        catalogue={[]}
        error="fetch failed"
        selected={[]}
        onToggle={() => {}}
        icons="lucide"
      />,
    );
    expect(screen.getByText(/Could not load the module catalogue/)).toBeDefined();
    expect(screen.getByText(/xanosdk marketplace install/)).toBeDefined();
  });
});
