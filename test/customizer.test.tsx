/**
 * @vitest-environment jsdom
 *
 * The controls column, driven.
 *
 * The bug this suite is built around: Xano Blue used to be 62 token overrides
 * laid over `zinc-blue`, and overrides win. Selecting a different base colour
 * recomposed a palette nobody could see, and picking an accent moved a
 * `--primary` that an override immediately painted over. Both controls looked
 * live and were inert — the worst kind of broken, because nothing errors.
 *
 * So what is asserted here is that a choice CHANGES something. Not which
 * colour: the values live in the SDK's tables and in the brand palette, and
 * pinning them here would only duplicate `presets.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Customizer } from "@/components/customizer";
import { DEFAULT_PRESET, XANO_BASE } from "@/lib/presets";
import { themeOf, type CustomizerValue } from "@/lib/theme";

afterEach(cleanup);

const XANO: CustomizerValue = { ...DEFAULT_PRESET.style, dark: "system" };

/** Render the column and hand back whatever the next value would be. */
function renderCustomizer(value: CustomizerValue = XANO) {
  const onChange = vi.fn();
  const onPreviewDark = vi.fn();
  render(
    <Customizer value={value} onChange={onChange} previewDark={false} onPreviewDark={onPreviewDark} />,
  );
  return { onChange, onPreviewDark };
}

describe("the base colour grid", () => {
  it("offers Xano alongside the SDK's own bases", () => {
    renderCustomizer();
    expect(screen.getByRole("button", { name: "Xano" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Stone" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Xano" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches away from Xano, and the palette actually moves", () => {
    const { onChange } = renderCustomizer();
    fireEvent.click(screen.getByRole("button", { name: "Stone" }));

    const next = onChange.mock.calls[0]![0] as CustomizerValue;
    expect(next.base).toBe("stone");
    // The regression: this used to hold the Xano tokens no matter the base.
    expect(themeOf(next).light["background"]).not.toBe(themeOf(XANO).light["background"]);
    expect(themeOf(next).dark["background"]).not.toBe(themeOf(XANO).dark["background"]);
  });

  it("switches back to Xano from another base", () => {
    const { onChange } = renderCustomizer({ ...XANO, base: "stone" });
    expect(screen.getByRole("button", { name: "Xano" }).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Xano" }));
    const next = onChange.mock.calls[0]![0] as CustomizerValue;
    expect(next.base).toBe(XANO_BASE);
    expect(themeOf(next).light["primary"]).toBe("#0b5aff");
  });

  it("lets an accent move the primary while on the Xano base", () => {
    const { onChange } = renderCustomizer();
    // The accent buttons are titled by name; "None" is the first cell.
    fireEvent.click(screen.getByTitle("green"));

    const next = onChange.mock.calls[0]![0] as CustomizerValue;
    expect(next.accent).toBe("green");
    expect(themeOf(next).light["primary"]).not.toBe("#0b5aff");
    // ...on Xano's own paper, which the accent must not touch.
    expect(themeOf(next).light["background"]).toBe(themeOf(XANO).light["background"]);
  });

  it("puts a light/dark switch beside the swatches", () => {
    const { onPreviewDark } = renderCustomizer();
    fireEvent.click(screen.getAllByRole("button", { name: "Dark" })[0]!);
    expect(onPreviewDark).toHaveBeenCalledWith(true);
  });
});

describe("the preset gallery", () => {
  it("applies a preset without touching the dark-mode setting", () => {
    const { onChange } = renderCustomizer({ ...XANO, dark: "toggle" });
    fireEvent.click(screen.getByRole("button", { name: /Terracotta/ }));

    const next = onChange.mock.calls[0]![0] as CustomizerValue;
    expect(next.base).toBe("stone");
    expect(next.accent).toBe("orange");
    expect(next.dark).toBe("toggle");
  });

  it("resets to Xano Blue", () => {
    const { onChange } = renderCustomizer({ ...XANO, base: "olive", accent: "lime" });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    const next = onChange.mock.calls[0]![0] as CustomizerValue;
    expect(next.base).toBe(XANO_BASE);
    expect(next.accent).toBeNull();
  });
});
