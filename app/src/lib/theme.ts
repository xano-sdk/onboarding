/**
 * The style value, and how it composes into a palette.
 *
 * Lifted out of the customizer component because three different things need
 * it and only one of them is UI: the component renders it, `lib/presets.ts`
 * describes it, and the preview stylesheet is built from it. Leaving the
 * composition inside a `.tsx` file meant anything that wanted to know what a
 * base colour resolves to had to import React to find out.
 *
 * The model is shadcn's, with one addition. A palette is a BASE (the full token
 * set) optionally overlaid with an ACCENT (the eleven tokens that read as a
 * brand), and then with whatever the user has hand-edited on top. Xano is an
 * eighth base rather than a bundle of overrides — see `XANO_BASE` for why that
 * distinction is the difference between a working chooser and a dead one.
 */
import { ACCENT_TOKENS, BASE_TOKENS, type AccentId } from "@xano/sdk/scaffold";
import type { DarkMode, FontSelection } from "../../../src/protocol.js";
import { XANO_BASE, XANO_BASE_TOKENS, type CustomBaseId } from "@/lib/presets";

export interface CustomizerValue {
  readonly base: CustomBaseId;
  readonly accent: AccentId | null;
  /** Token overrides, applied over the composed base×accent theme. */
  readonly overrides: { light: Record<string, string>; dark: Record<string, string> };
  readonly radius: string;
  readonly dark: DarkMode;
  readonly fonts: FontSelection;
  readonly icons: string;
}

/**
 * A composed palette. Structurally the SDK's `Theme` minus the fields only the
 * SDK's own writers need, so a base it has never heard of still fits.
 */
export interface ComposedTheme {
  readonly id: string;
  readonly label: string;
  readonly light: Record<string, string>;
  readonly dark: Record<string, string>;
}

/** The tokens a base supplies on its own, Xano included. */
export function baseTokens(base: CustomBaseId): { label: string; light: Record<string, string>; dark: Record<string, string> } {
  return base === XANO_BASE ? XANO_BASE_TOKENS : BASE_TOKENS[base];
}

/**
 * Compose a base with an accent, the way `buildTheme` does.
 *
 * Reimplemented rather than called because the SDK's version takes one of its
 * own seven bases and Xano is an eighth. The composition itself is copied
 * exactly — an accent is eleven tokens laid over a base's full set — so a Xano
 * palette and a `stone-orange` one are assembled by the same rule, and an
 * accent picked on either behaves identically.
 */
export function composeTheme(base: CustomBaseId, accent: AccentId | null): ComposedTheme {
  const b = baseTokens(base);
  if (accent === null) {
    return { id: base, label: b.label, light: { ...b.light }, dark: { ...b.dark } };
  }
  const a = ACCENT_TOKENS[accent];
  return {
    id: `${base}-${accent}`,
    label: `${b.label} ${a.label}`,
    light: { ...b.light, ...a.light },
    dark: { ...b.dark, ...a.dark },
  };
}

/** Compose the theme a value describes: base, then accent, then edits. */
export function themeOf(value: CustomizerValue): ComposedTheme {
  const composed = composeTheme(value.base, value.accent);
  return {
    ...composed,
    light: { ...composed.light, ...value.overrides.light },
    dark: { ...composed.dark, ...value.overrides.dark },
  };
}

/**
 * Whether this palette has to travel to the CLI as tokens rather than a name.
 *
 * Two ways to earn that: hand-edited tokens, or the Xano base — which the SDK's
 * `--theme` flag has never heard of, so there is no name to send.
 */
export function isCustomTheme(value: CustomizerValue): boolean {
  return value.base === XANO_BASE || isEdited(value);
}

/** Whether anything has been hand-edited — decides preset vs custom on the wire. */
export function isEdited(value: CustomizerValue): boolean {
  return (
    Object.keys(value.overrides.light).length > 0 || Object.keys(value.overrides.dark).length > 0
  );
}

