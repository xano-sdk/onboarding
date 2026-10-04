/**
 * @vitest-environment jsdom
 *
 * The preview pane, driven the way a user drives it.
 *
 * This suite exists because the pane's whole value is that it is HONEST — what
 * you click is what the scaffold renders — and the failure it guards against is
 * a regression back to shapes: a `<span>` dressed as a button, a table header
 * that does not sort, a "Deploy" that does nothing. None of that is visible to
 * `tsc`, and none of it is visible in a screenshot either.
 *
 * It asserts behaviour, never colour. The colours are tokens supplied by a
 * scoped stylesheet that jsdom does not evaluate, and pinning class names here
 * would turn every restyle into a failing test for no gain.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Preview } from "@/components/preview";
import { Forms } from "@/components/preview/forms";
import { CodeAndType, Components } from "@/components/preview/components";
import { Dashboard } from "@/components/preview/dashboard";

afterEach(cleanup);

/** The pane, with the dark switch stubbed so the callback can be asserted. */
function renderDashboard(onToggleDark = () => {}) {
  return render(
    <Dashboard icons="lucide" dark={false} appName="acme" onToggleDark={onToggleDark} />,
  );
}

describe("the preview pane", () => {
  it("renders every section without a crash", () => {
    render(<Preview icons="lucide" dark={false} appName="acme" onToggleDark={() => {}} />);
    expect(screen.getByRole("heading", { name: "Charts" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Forms" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Components" })).toBeDefined();
  });

  it("renders the same for every icon set", () => {
    for (const icons of ["lucide", "tabler", "phosphor"]) {
      cleanup();
      render(<Preview icons={icons} dark={false} appName="acme" onToggleDark={() => {}} />);
      expect(screen.getByRole("heading", { name: "Overview" })).toBeDefined();
    }
  });
});

describe("the dashboard", () => {
  it("navigates between panels", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: /Settings/ })[0]!);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
    expect(screen.getByLabelText("Auto-deploy")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: /Deployments/ })[0]!);
    expect(screen.getByRole("heading", { name: "All deployments" })).toBeDefined();
  });

  it("filters the table from the header search", () => {
    renderDashboard();
    expect(screen.queryByText("billing-worker")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Search services"), { target: { value: "orders" } });
    expect(screen.queryByText("billing-worker")).toBeNull();
    expect(screen.queryByText("orders-api")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Search services"), { target: { value: "zzz" } });
    expect(screen.getAllByText("Nothing matches that filter.").length).toBeGreaterThan(0);
  });

  it("sorts a column, and reverses on a second click", () => {
    renderDashboard();
    // On the full table, not the overview's five-row extract — a reversed sort
    // of six rows truncated to five is not the reverse of the first five.
    fireEvent.click(screen.getAllByRole("button", { name: /Deployments/ })[0]!);
    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1]?.textContent);

    fireEvent.click(screen.getByRole("button", { name: /Service/ }));
    const ascending = names();
    fireEvent.click(screen.getByRole("button", { name: /Service/ }));
    expect(names()).toEqual([...ascending].reverse());
  });

  it("selects rows and offers a bulk action", () => {
    renderDashboard();
    expect(screen.queryByText(/selected/)).toBeNull();

    fireEvent.click(screen.getByLabelText("Select orders-api"));
    expect(screen.getByText("1 selected")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("runs a deploy, then reports it", async () => {
    vi.useFakeTimers();
    try {
      renderDashboard();
      const deploy = screen.getByRole("button", { name: "Deploy" });
      fireEvent.click(deploy);
      expect(screen.getByRole("button", { name: /Deploying/ })).toBeDefined();

      // Wrapped: the toast lands from a timer callback, which React does not
      // flush on its own the way it flushes an event handler.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      expect(screen.getByRole("status").textContent).toContain("Deployed acme to production");
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches the charted series when a stat card is clicked", () => {
    renderDashboard();
    expect(screen.getByRole("img", { name: /Revenue over/ })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Active users/ }));
    expect(screen.getByRole("img", { name: /Active users over/ })).toBeDefined();
  });

  it("hands the theme switch back to the configurator", () => {
    const onToggleDark = vi.fn();
    renderDashboard(onToggleDark);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(onToggleDark).toHaveBeenCalledOnce();
  });
});

describe("the forms section", () => {
  it("starts invalid and clears as the address is fixed", () => {
    render(<Forms icons="lucide" />);
    const email = screen.getByLabelText("Email");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a valid email address.")).toBeDefined();

    fireEvent.change(email, { target: { value: "you@example.com" } });
    expect(email.getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByText("We’ll never share it.")).toBeDefined();
  });

  it("takes input, toggles and slides", () => {
    render(<Forms icons="lucide" />);

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hello" } });
    expect(screen.getByText("5/280")).toBeDefined();

    expect(screen.getByText("2 of 3 on")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Weekly digest"));
    expect(screen.getByText("3 of 3 on")).toBeDefined();

    const memory = screen.getByRole("slider", { name: "Memory" });
    expect(memory.getAttribute("aria-valuenow")).toBe("512");
    fireEvent.keyDown(memory, { key: "ArrowRight" });
    expect(memory.getAttribute("aria-valuenow")).toBe("640");

    const autoDeploy = screen.getByRole("switch", { name: "Auto-deploy" });
    expect(autoDeploy.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(autoDeploy);
    expect(autoDeploy.getAttribute("aria-checked")).toBe("false");
  });

  it("blocks the save while the form is invalid", () => {
    render(<Forms icons="lucide" />);
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "you@example.com" } });
    expect(save.hasAttribute("disabled")).toBe(false);
    fireEvent.click(save);
    expect(screen.getByText(/Saved to production/)).toBeDefined();
  });
});

describe("the component gallery", () => {
  it("switches tabs and follows them in the breadcrumb", () => {
    render(<Components icons="lucide" />);
    expect(screen.getByText(/Four services, all healthy/)).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Logs" }));
    expect(screen.getByText(/12 warnings in the last hour/)).toBeDefined();
    expect(screen.getByRole("tab", { name: "Logs" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens and closes the accordion", () => {
    render(<Components icons="lucide" />);
    const second = screen.getByRole("button", { name: /How does xano.lock work/ });
    expect(second.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/maps each object in your source/)).toBeDefined();
  });

  it("filters the command palette and runs on Enter", () => {
    render(<Components icons="lucide" />);
    const input = screen.getByLabelText("Command");
    expect(screen.getByText("Roll back last deploy")).toBeDefined();

    fireEvent.change(input, { target: { value: "invite" } });
    expect(screen.queryByText("Roll back last deploy")).toBeNull();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Ran: Invite teammate")).toBeDefined();
  });

  it("puts the destructive menu item behind a confirmation", () => {
    render(<Components icons="lucide" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Delete this service/)).toBeDefined();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sets a rating", () => {
    render(<Components icons="lucide" />);
    expect(screen.getByText("4.0")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "2 stars" }));
    expect(screen.getByText("2.0")).toBeDefined();
  });

  it("copies the snippet and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CodeAndType icons="lucide" />);

    fireEvent.click(screen.getByRole("button", { name: /Copy/ }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(String(writeText.mock.calls[0]![0])).toContain("@xano/sdk");
    expect(screen.getByRole("button", { name: /Copied/ })).toBeDefined();
  });
});

/**
 * The layout guard.
 *
 * This suite pins the shape of one specific bug rather than a look, because the
 * bug was invisible in every other check: the pane rendered correctly, typed
 * correctly and tested green while quietly making the DOCUMENT a screenful
 * taller than the viewport and scrolling it out from under the user whenever a
 * control took focus.
 *
 * The cause was a visually-hidden `sr-only` input — `position: absolute` with
 * no positioned ancestor, so its containing block was the document rather than
 * the scrolling pane it appeared in. jsdom does no layout and cannot measure
 * that, so what is asserted here is the structure that caused it: the preview
 * contains no out-of-flow hidden controls, and every toggle is a real input
 * sitting in the flow.
 */
describe("the preview's layout contract", () => {
  it("hides no control out of the document flow", () => {
    const { container } = render(
      <Preview icons="lucide" dark={false} appName="acme" onToggleDark={() => {}} />,
    );
    // `sr-only` is absolutely positioned. Anywhere inside a scrolling pane it
    // escapes that pane's overflow and extends the page instead.
    expect(container.querySelectorAll(".sr-only")).toHaveLength(0);
  });

  it("builds its toggles from real inputs, not styled spans", () => {
    render(<Forms icons="lucide" />);
    const digest = screen.getByLabelText("Weekly digest");
    expect(digest.tagName).toBe("INPUT");
    expect(digest.getAttribute("type")).toBe("checkbox");

    const hobby = screen.getByLabelText("Hobby");
    expect(hobby.tagName).toBe("INPUT");
    expect(hobby.getAttribute("type")).toBe("radio");

    // The visible state rides on :checked, so the input is the thing that moves.
    fireEvent.click(hobby);
    expect((hobby as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Pro") as HTMLInputElement).checked).toBe(false);
  });

  it("opens tooltips below their trigger, not into the header above it", () => {
    renderDashboard();
    const theme = screen.getByRole("button", { name: "Toggle theme" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.pointerEnter(theme.parentElement!);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("Switch to dark");
    // jsdom does no layout, so the direction is asserted as the contract it is:
    // this trigger sits just inside the top edge of a card with
    // `overflow-hidden`, and a tooltip opening upward was sliced by it.
    expect(tip.className).toContain("top-full");
    expect(tip.className).not.toContain("bottom-full");

    fireEvent.pointerLeave(theme.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("keeps the table's bare checkboxes labelled", () => {
    renderDashboard();
    const selectAll = screen.getByLabelText("Select all");
    expect(selectAll.tagName).toBe("INPUT");
    fireEvent.click(selectAll);
    expect(screen.getByText("5 selected")).toBeDefined();
  });
});
