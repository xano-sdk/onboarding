/**
 * Six complete looks, so the style step has a one-click path through it.
 *
 * The controls beside these presets are the whole space — eight bases, an
 * accent, five radii, 26 typefaces, three icon sets — and someone who has not
 * yet decided what their app looks like has no way to search it. A preset is
 * that decision already made: a palette, a corner radius, a typeface pairing
 * and an icon set that were chosen together, so picking one lands on something
 * coherent rather than on the first plausible-looking base colour.
 *
 * They are a starting point, not a mode. Applying one writes straight into the
 * customizer's value, and every control below stays live — nudge the radius or
 * swap the body face and the selection simply stops matching, which is exactly
 * what {@link matchPreset} reports back to the UI.
 *
 * Two things are deliberately NOT part of a preset:
 *
 *   - Dark mode, which is a decision about how the app behaves rather than how
 *     it looks. Applying a preset preserves whatever is set.
 *   - Token overrides. Those belong to the user, and a preset that shipped some
 *     would sit on top of the very controls it is meant to be a starting point
 *     for. Xano Blue was written that way once and it made the base and accent
 *     grids inert — see {@link XANO_BASE}. Every preset here is a base, an
 *     accent and nothing on top.
 *
 * Five of the six name one of the SDK's own base×accent pairs, so they travel
 * to the CLI as `--theme stone-orange` and the scaffold renders them from its
 * own tables — which keeps the theme's name in the generated README and agent
 * brief. Xano Blue is on a base the SDK has never heard of, so it travels as a
 * token map instead; that is the one thing it gives up, and it is unavoidable.
 */
import { DEFAULT_ICON_LIBRARY, type AccentId, type BaseColorId } from "@xano/sdk/scaffold";
import type { FontSelection } from "../../../src/protocol.js";
import type { CustomizerValue } from "@/lib/theme";

/** Everything a preset decides. `dark` is the customizer's, not the preset's. */
export type PresetStyle = Omit<CustomizerValue, "dark">;

export interface StylePreset {
  readonly id: string;
  readonly label: string;
  /** One line, in the card. What the palette is FOR, not what it contains. */
  readonly blurb: string;
  readonly style: PresetStyle;
}

/**
 * The id of the one base colour that is not shadcn's.
 *
 * Xano is offered as a BASE rather than as a bundle of token overrides, and the
 * difference is the whole reason this constant exists. Overrides sit on top of
 * a composed theme, so a palette expressed that way swallows every control
 * underneath it: picking a different base recomposed a theme nobody could see,
 * and picking an accent changed a `--primary` that an override immediately
 * overwrote. As a base it behaves like `stone` or `mist` — it supplies the
 * surfaces, an accent composes over it, and switching away from it is one click
 * rather than a hunt for a Reset button.
 */
export const XANO_BASE = "xano";

/** Every base the customizer offers: shadcn's seven, plus Xano's own. */
export type CustomBaseId = BaseColorId | typeof XANO_BASE;

/**
 * Xano's own tokens, lifted from the brand palette xano.com ships:
 * `--color-primary: #0b5aff`, the near-black `#000205` / `#000b22` navies its
 * dark surfaces run on, the blue-tinted paper `#f4f7fb` / `#eef5ff` behind its
 * light sections, and the teal `#00d6e9` it reserves for live signal.
 *
 * Hex on purpose. The SDK's importer takes hex alongside oklch — the same path
 * a third-party registry theme arrives by — so these values reach the scaffold
 * unrounded, which a hand-conversion to oklch could not promise.
 *
 * The pair sits over `zinc`×`blue`, so any token NOT named here still lands on
 * a cool neutral that belongs beside the ones that are.
 */
const XANO_LIGHT: Record<string, string> = {
  // Written to `:root` only, exactly as the SDK's own bases carry it — the dark
  // block does not repeat a radius. The customizer's radius control overwrites
  // this, so it is the value you get if nothing ever touches that control.
  radius: "0.625rem",
  background: "#f4f7fb",
  foreground: "#000b22",
  card: "#ffffff",
  "card-foreground": "#000b22",
  popover: "#ffffff",
  "popover-foreground": "#000b22",
  primary: "#0b5aff",
  "primary-foreground": "#ffffff",
  secondary: "#e8effe",
  "secondary-foreground": "#05122e",
  muted: "#eef5ff",
  "muted-foreground": "#5f6b85",
  accent: "#e0eaff",
  "accent-foreground": "#0040c4",
  destructive: "#c2410c",
  border: "#dce5f6",
  input: "#bbd0fd",
  ring: "#0b5aff",
  // A ramp, not five hues: four steps of the brand blue with the brand teal
  // fourth, so a chart with two series still reads as one palette.
  "chart-1": "#0b5aff",
  "chart-2": "#2b7fff",
  "chart-3": "#6b99fa",
  "chart-4": "#0d9488",
  "chart-5": "#0040c4",
  sidebar: "#ffffff",
  "sidebar-foreground": "#000b22",
  "sidebar-primary": "#0b5aff",
  "sidebar-primary-foreground": "#ffffff",
  "sidebar-accent": "#eef5ff",
  "sidebar-accent-foreground": "#0040c4",
  "sidebar-border": "#dce5f6",
  "sidebar-ring": "#0b5aff",
};

const XANO_DARK: Record<string, string> = {
  background: "#030b1c",
  foreground: "#fcfcff",
  card: "#000b22",
  "card-foreground": "#fcfcff",
  popover: "#000b22",
  "popover-foreground": "#fcfcff",
  primary: "#2b7fff",
  "primary-foreground": "#000205",
  secondary: "#2a364d",
  "secondary-foreground": "#fcfcff",
  muted: "#05122e",
  "muted-foreground": "#a4b1cc",
  accent: "#081e4d",
  "accent-foreground": "#9db5f5",
  destructive: "#fb923c",
  border: "#16274a",
  input: "#2a364d",
  ring: "#2b7fff",
  "chart-1": "#2b7fff",
  "chart-2": "#6b99fa",
  "chart-3": "#00d6e9",
  "chart-4": "#5eead4",
  "chart-5": "#0b5aff",
  sidebar: "#000b22",
  "sidebar-foreground": "#fcfcff",
  "sidebar-primary": "#2b7fff",
  "sidebar-primary-foreground": "#000205",
  "sidebar-accent": "#081e4d",
  "sidebar-accent-foreground": "#9db5f5",
  "sidebar-border": "#16274a",
  "sidebar-ring": "#2b7fff",
};

/**
 * Xano in the shape `BASE_TOKENS` entries take, so the customizer can render
 * and compose it through exactly the same code path as shadcn's own bases.
 */
export const XANO_BASE_TOKENS = {
  label: "Xano",
  light: XANO_LIGHT,
  dark: XANO_DARK,
} as const;

function preset(
  id: string,
  label: string,
  blurb: string,
  base: BaseColorId,
  accent: AccentId | null,
  radius: string,
  fonts: FontSelection,
  icons: string = DEFAULT_ICON_LIBRARY,
): StylePreset {
  return {
    id,
    label,
    blurb,
    style: { base, accent, radius, fonts, icons, overrides: { light: {}, dark: {} } },
  };
}

/**
 * The six, in the order they are offered.
 *
 * Chosen to sit apart from each other rather than to cover the space evenly:
 * one brand palette, one monochrome, one warm, one green, one violet and one
 * cool. Six near-identical blues would be six ways of not deciding.
 */
export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    id: "xano-blue",
    label: "Xano Blue",
    blurb: "Xano's own palette — brand blue on blue-tinted paper, navy in the dark.",
    style: {
      base: XANO_BASE,
      // No accent: the brand blue IS this base's primary. Picking one here
      // still works — it composes over Xano's surfaces like any other base.
      accent: null,
      radius: "0.625rem",
      // The three families xano.com runs on: Inter for body, Manrope for
      // display, JetBrains Mono for anything that is code.
      fonts: { sans: "inter", heading: "manrope", mono: "jetbrains-mono" },
      icons: "lucide",
      overrides: { light: {}, dark: {} },
    },
  },
  preset(
    "graphite",
    "Graphite",
    "Monochrome and tight-cornered. Nothing competes with your content.",
    "neutral",
    null,
    "0.3rem",
    { sans: "geist", mono: "geist-mono" },
    "tabler",
  ),
  preset(
    "terracotta",
    "Terracotta",
    "Warm stone with a serif masthead — editorial, unhurried, print-ish.",
    "stone",
    "orange",
    "1rem",
    { sans: "dm-sans", heading: "instrument-serif" },
    "phosphor",
  ),
  preset(
    "meadow",
    "Meadow",
    "Olive under a green accent. Calm, legible, good for long sessions.",
    "olive",
    "green",
    "0.625rem",
    { sans: "figtree" },
  ),
  preset(
    "orchid",
    "Orchid",
    "Mauve and purple on generous corners. Soft, consumer-facing.",
    "mauve",
    "purple",
    "1.4rem",
    { sans: "manrope", heading: "outfit" },
    "tabler",
  ),
  preset(
    "lagoon",
    "Lagoon",
    "Cool teal over mist. Dense, technical, at home in a dashboard.",
    "mist",
    "teal",
    "0.3rem",
    { sans: "ibm-plex-sans", heading: "space-grotesk", mono: "jetbrains-mono" },
  ),
];

/** The one the app opens on. */
export const DEFAULT_PRESET: StylePreset = STYLE_PRESETS[0]!;

/** A preset applied over a value, keeping the decisions it does not own. */
export function applyPreset(current: CustomizerValue, style: PresetStyle): CustomizerValue {
  return {
    ...current,
    base: style.base,
    accent: style.accent,
    radius: style.radius,
    fonts: { ...style.fonts },
    icons: style.icons,
    // Cloned, so editing a token afterwards cannot write into the table every
    // other project scaffolded from this preset reads.
    overrides: {
      light: { ...style.overrides.light },
      dark: { ...style.overrides.dark },
    },
  };
}

function sameMap(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

/**
 * Which preset a value still IS, or null once it has been nudged.
 *
 * Derived rather than remembered on purpose. A "selected preset" held in state
 * beside the value it produced is a second source of truth that goes stale the
 * moment someone moves the radius slider, and every consumer then has to know
 * whether to trust it. Comparing the value is a few dozen string equalities and
 * cannot disagree with what the preview is showing.
 */
export function matchPreset(value: CustomizerValue): StylePreset | null {
  return (
    STYLE_PRESETS.find(
      (p) =>
        p.style.base === value.base &&
        p.style.accent === value.accent &&
        p.style.radius === value.radius &&
        p.style.icons === value.icons &&
        sameMap(p.style.fonts as Record<string, string>, value.fonts as Record<string, string>) &&
        sameMap(p.style.overrides.light, value.overrides.light) &&
        sameMap(p.style.overrides.dark, value.overrides.dark),
    ) ?? null
  );
}
