/**
 * The preset table, checked against the vocabulary it names.
 *
 * Every value in `lib/presets.ts` is a string that means something to the SDK —
 * a base color, an accent, a font id, an icon set, a token name — and none of
 * them are typed tightly enough for `tsc` to catch a rename on the SDK's side.
 * The failure that would produce is quiet and late: a card that renders, a
 * preview that looks right, and `xanosdk init` refusing the flag at the end of
 * the wizard. So the ids are resolved here through the same functions the CLI
 * validates with.
 */
import { describe, expect, it } from "vitest";
import {
  FONTS,
  ICON_LIBRARIES,
  TOKEN_ORDER,
  isAccent,
  isBaseColor,
  normalizeRadius,
  resolveThemeFlag,
} from "@xano/sdk/scaffold";
import {
  DEFAULT_PRESET,
  STYLE_PRESETS,
  XANO_BASE,
  XANO_BASE_TOKENS,
  applyPreset,
  matchPreset,
} from "../app/src/lib/presets.js";
import { composeTheme } from "../app/src/lib/theme.js";

/** A preset's style, plus the one axis a preset does not own. */
const asValue = (style: (typeof STYLE_PRESETS)[number]["style"]) =>
  ({ ...style, dark: "system" }) as const;

describe("the preset table", () => {
  it("offers six presets, defaulting to Xano Blue", () => {
    expect(STYLE_PRESETS).toHaveLength(6);
    expect(DEFAULT_PRESET.id).toBe("xano-blue");
    expect(STYLE_PRESETS[0]).toBe(DEFAULT_PRESET);
  });

  it("gives every preset a distinct id and a distinct palette", () => {
    expect(new Set(STYLE_PRESETS.map((p) => p.id)).size).toBe(STYLE_PRESETS.length);
    const palettes = STYLE_PRESETS.map((p) => `${p.style.base}-${p.style.accent}`);
    expect(new Set(palettes).size).toBe(palettes.length);
  });

  it.each(STYLE_PRESETS.map((p) => [p.id, p] as const))("%s names ids the SDK knows", (_id, p) => {
    const { base, accent, icons, fonts, radius } = p.style;
    if (accent !== null) expect(isAccent(accent)).toBe(true);
    expect(ICON_LIBRARIES as readonly string[]).toContain(icons);
    for (const id of Object.values(fonts)) expect(FONTS).toHaveProperty(id as string);
    expect(() => normalizeRadius(radius)).not.toThrow();

    if (base === XANO_BASE) {
      // Xano is ours, not shadcn's. It has no `--theme` name to send, which is
      // exactly why it travels to the CLI as tokens.
      expect(isBaseColor(base)).toBe(false);
      return;
    }
    expect(isBaseColor(base)).toBe(true);
    // The `--theme` string the CLI receives for a preset on an SDK base.
    const flag = accent === null ? base : `${base}-${accent}`;
    expect(() => resolveThemeFlag(flag)).not.toThrow();
  });

  it.each(STYLE_PRESETS.map((p) => [p.id, p] as const))(
    "%s resolves to a complete token set",
    (_id, p) => {
      const composed = composeTheme(p.style.base, p.style.accent);
      for (const mode of ["light", "dark"] as const) {
        const tokens = { ...composed[mode], ...p.style.overrides[mode] };
        for (const name of Object.keys(p.style.overrides[mode])) {
          expect(TOKEN_ORDER as readonly string[]).toContain(name);
        }
        // `radius` is written once, to `:root` — the dark block does not
        // repeat it, so it is the one token a dark map is allowed to lack.
        const expected = TOKEN_ORDER.filter((n) => mode === "light" || n !== "radius");
        for (const name of expected) expect(tokens[name]).toBeTypeOf("string");
      }
    },
  );

  it("ships no preset with hand-edited tokens", () => {
    // Overrides are the user's, not a preset's: a preset that carried them would
    // make the base and accent controls beneath it inert.
    for (const p of STYLE_PRESETS) {
      expect(Object.keys(p.style.overrides.light)).toHaveLength(0);
      expect(Object.keys(p.style.overrides.dark)).toHaveLength(0);
    }
  });

  it("puts Xano Blue on the Xano base, in the brand blue", () => {
    expect(DEFAULT_PRESET.style.base).toBe(XANO_BASE);
    expect(DEFAULT_PRESET.style.accent).toBeNull();
    expect(XANO_BASE_TOKENS.light["primary"]).toBe("#0b5aff");
    expect(XANO_BASE_TOKENS.dark["primary"]).toBe("#2b7fff");
  });

  it("lets an accent compose over the Xano base like any other", () => {
    const plain = composeTheme(XANO_BASE, null);
    const accented = composeTheme(XANO_BASE, "green");
    // The accent takes the brand tokens...
    expect(accented.light["primary"]).not.toBe(plain.light["primary"]);
    // ...and leaves Xano's surfaces alone. That is the whole point of a base.
    expect(accented.light["background"]).toBe(plain.light["background"]);
    expect(accented.dark["background"]).toBe(plain.dark["background"]);
  });
});

describe("matchPreset", () => {
  it.each(STYLE_PRESETS.map((p) => [p.id, p] as const))("recognises %s applied", (id, p) => {
    expect(matchPreset(applyPreset(asValue(p.style), p.style))?.id).toBe(id);
  });

  it("preserves dark mode, which a preset does not own", () => {
    const current = { ...asValue(DEFAULT_PRESET.style), dark: "toggle" as const };
    expect(applyPreset(current, STYLE_PRESETS[2]!.style).dark).toBe("toggle");
  });

  it("lets go once any axis is nudged", () => {
    const base = asValue(DEFAULT_PRESET.style);
    expect(matchPreset(base)?.id).toBe("xano-blue");
    expect(matchPreset({ ...base, radius: "1rem" })).toBeNull();
    expect(matchPreset({ ...base, icons: "phosphor" })).toBeNull();
    expect(matchPreset({ ...base, fonts: {} })).toBeNull();
    expect(matchPreset({ ...base, base: "stone" })).toBeNull();
    expect(matchPreset({ ...base, accent: "green" })).toBeNull();
    expect(
      matchPreset({ ...base, overrides: { light: { primary: "#ff0000" }, dark: {} } }),
    ).toBeNull();
  });

  it("does not share mutable state with the table", () => {
    const applied = applyPreset(asValue(DEFAULT_PRESET.style), DEFAULT_PRESET.style);
    applied.overrides.light["primary"] = "#ff0000";
    (applied.fonts as { sans?: string }).sans = "roboto";
    expect(Object.keys(DEFAULT_PRESET.style.overrides.light)).toHaveLength(0);
    expect(DEFAULT_PRESET.style.fonts.sans).toBe("inter");
  });
});
