/**
 * The controls column: every axis `xanosdk init` accepts, as a picker.
 *
 * The base × accent grid mirrors shadcn's own create page, because the model is
 * shadcn's — a base color carrying the full token set, an accent overriding the
 * dozen that read as a brand. Presenting them as one flat list of 126 themes
 * would hide that structure and make the grid unreadable.
 *
 * The token editor below it is the escape hatch, and the reason the SDK grew
 * `--theme <path.json>`: anything edited here stops being a named pair, so it
 * travels to the CLI as a token map and is written as a registry item.
 *
 * Above all of it sit the presets — six finished looks, because most of the
 * people who reach this screen want a good default far more than they want to
 * exercise a 126-theme grid. Picking one fills in every control below it, and
 * the controls stay live: a preset is where you start, not what you are stuck
 * with. See `lib/presets.ts`.
 */
import { useMemo, useState } from "react";
import {
  ACCENTS,
  BASE_COLORS,
  DARK_MODES,
  FONT_IDS,
  FONTS,
  ICON_LIBRARIES,
  orderedTokens,
  parseColor,
} from "@xano/sdk/scaffold";
import type { DarkMode, FontSelection } from "../../../src/protocol.js";
import { Button, Field, Section, Segmented } from "@/components/ui";
import { withFont } from "@/lib/fonts";
import {
  DEFAULT_PRESET,
  STYLE_PRESETS,
  XANO_BASE,
  applyPreset,
  matchPreset,
  type CustomBaseId,
  type StylePreset,
} from "@/lib/presets";
import {
  baseTokens,
  composeTheme,
  isEdited,
  themeOf,
  type CustomizerValue,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * A base colour, drawn as the page it produces.
 *
 * A single `--foreground` chip could not do this job: it is near-black in every
 * light palette and near-white in every dark one, so all seven bases would
 * render as the same slab. What separates them is the TINT in their neutrals,
 * so the tile is a miniature page instead: the base's
 * own background, ringed in its `--border`, carrying a bar of `--primary` and a
 * bar of `--muted-foreground`.
 *
 * Composed with whatever ACCENT is currently selected, which is the point. The
 * question this grid answers is not "what is `stone` in the abstract" but "what
 * would my palette look like on `stone`" — so with an accent chosen every tile
 * shows that accent on its own paper, and with none chosen each base shows the
 * primary it supplies itself. That is how the Xano tile reads blue while the
 * shadcn bases read as the near-neutrals they honestly are.
 *
 * Rendered in whichever mode the preview is showing, which is why the switch
 * for that sits directly above this grid: shadcn's bases are nearly identical
 * in light — a few thousandths of chroma apart — and clearly different in dark.
 * A chooser stuck on one mode hides half of what you are choosing between.
 */
function BaseSwatch({ tokens }: { tokens: Record<string, string> }) {
  const fill = (token: string) => {
    const rgb = parseColor(tokens[token] ?? "");
    return rgb === null ? "transparent" : `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  };
  return (
    <span
      className="flex h-7 w-full flex-col justify-center gap-1 overflow-hidden rounded-md border px-1.5"
      style={{ background: fill("background"), borderColor: fill("border") }}
      aria-hidden
    >
      <span className="h-1 w-full rounded-full" style={{ background: fill("primary") }} />
      <span className="h-1 w-2/3 rounded-full" style={{ background: fill("muted-foreground") }} />
    </span>
  );
}

/** A colour chip. Falls back to a neutral block for a value we cannot parse. */
function Swatch({ value, className }: { value: string | undefined; className?: string }) {
  const rgb = value === undefined ? null : parseColor(value);
  return (
    <span
      className={cn("border-border inline-block rounded border", className)}
      style={{ background: rgb === null ? "transparent" : `rgb(${rgb.r} ${rgb.g} ${rgb.b})` }}
    />
  );
}

export { isCustomTheme, isEdited, themeOf, type CustomizerValue } from "@/lib/theme";

/**
 * A random style, for the "I have no opinion yet, show me something" case.
 *
 * Deliberately not uniform over the whole space. Two thirds of a uniform sample
 * would come back with a random typeface pairing, and most typefaces paired at
 * random look worse than the system stack — so a face is chosen only sometimes,
 * a heading face more rarely still, and a mono face rarest of all. The result
 * should read as a plausible design decision, not as noise.
 *
 * Token overrides are CLEARED rather than randomised. They are edits made
 * against a specific palette, and carrying them onto a new base produces a
 * theme that is neither the one you edited nor the one you rolled.
 *
 * Dark mode and the icon set are left alone: both are decisions about how the
 * app behaves and what it depends on, not about how it looks today.
 */
function randomStyle(current: CustomizerValue): CustomizerValue {
  const pick = <T,>(items: readonly T[]): T =>
    items[Math.floor(Math.random() * items.length)]!;
  const sansFonts = FONT_IDS.filter((f) => FONTS[f].type === "sans");
  const displayFonts = FONT_IDS.filter((f) => FONTS[f].type !== "mono");
  const monoFonts = FONT_IDS.filter((f) => FONTS[f].type === "mono");
  const fonts: FontSelection = {};
  if (Math.random() < 0.7) Object.assign(fonts, { sans: pick(sansFonts) });
  if (Math.random() < 0.35) Object.assign(fonts, { heading: pick(displayFonts) });
  if (Math.random() < 0.2) Object.assign(fonts, { mono: pick(monoFonts) });
  return {
    ...current,
    base: pick(BASES),
    // A quarter of the time, no accent at all — the base colours are a real
    // choice on their own and a randomiser that always adds a hue hides that.
    accent: Math.random() < 0.25 ? null : pick(ACCENTS),
    radius: pick(RADII).value,
    fonts,
    overrides: { light: {}, dark: {} },
  };
}

/**
 * The bases on offer, Xano first because it is the default and the one this
 * tool is for. The rest keep the SDK's order.
 */
const BASES: readonly CustomBaseId[] = [XANO_BASE, ...BASE_COLORS];

const RADII = [
  { value: "0", label: "0" },
  { value: "0.3rem", label: "S" },
  { value: "0.625rem", label: "M" },
  { value: "1rem", label: "L" },
  { value: "1.4rem", label: "XL" },
] as const;

/**
 * One preset, as a row: the palette it produces, then what it is for.
 *
 * The swatches are pulled through `themeOf` — the same composition the preview
 * pane renders from — rather than stored on the preset. A card that advertises
 * a colour the scaffold does not write is the one failure this whole screen
 * exists to prevent.
 */
function PresetCard({
  preset,
  selected,
  mode,
  onSelect,
}: {
  preset: StylePreset;
  selected: boolean;
  mode: "light" | "dark";
  onSelect: () => void;
}) {
  const tokens = useMemo(
    () => themeOf({ ...preset.style, dark: "system" })[mode],
    [preset, mode],
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
        selected ? "border-primary bg-accent" : "hover:bg-accent/50",
      )}
    >
      {/* A miniature of the palette: the page, then the three colours anything
          on it is painted with. Ordered background-first so the row reads as a
          screen rather than as a swatch library. */}
      <span
        className="border-border grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-md border p-1"
        style={{ background: tokens.background }}
      >
        <Swatch value={tokens.primary} className="size-3.5 border-0" />
        <Swatch value={tokens.accent} className="size-3.5 border-0" />
        <Swatch value={tokens["chart-3"]} className="size-3.5 border-0" />
        <Swatch value={tokens.muted} className="size-3.5 border-0" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{preset.label}</span>
        <span className="text-muted-foreground block text-xs leading-snug text-pretty">
          {preset.blurb}
        </span>
      </span>
    </button>
  );
}

export function Customizer({
  value,
  onChange,
  previewDark,
  onPreviewDark,
}: {
  value: CustomizerValue;
  onChange: (next: CustomizerValue) => void;
  previewDark: boolean;
  /** Flips which mode the swatches and the preview are showing. */
  onPreviewDark: (dark: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const theme = useMemo(() => themeOf(value), [value]);
  const active = useMemo(() => matchPreset(value), [value]);
  const mode = previewDark ? "dark" : "light";
  const set = (patch: Partial<CustomizerValue>) => onChange({ ...value, ...patch });

  const sansFonts = FONT_IDS.filter((f) => FONTS[f].type === "sans");
  const monoFonts = FONT_IDS.filter((f) => FONTS[f].type === "mono");

  return (
    <div className="flex flex-col">
      <Section title="Presets">
        <div className="flex flex-col gap-2">
          {STYLE_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              mode={mode}
              selected={active?.id === preset.id}
              onSelect={() => onChange(applyPreset(value, preset.style))}
            />
          ))}
        </div>
        {/*
          Under the cards rather than above them, because both buttons are about
          the list they now sit beneath: Randomize is "none of these six, show me
          another", and Reset is "back to the first one". Floated above the
          gallery they read as page-level chrome and pushed the presets — the
          fast path this step exists for — below the fold.
        */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onChange(randomStyle(value))}
          >
            Randomize
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={`Back to ${DEFAULT_PRESET.label}`}
            onClick={() => onChange(applyPreset(value, DEFAULT_PRESET.style))}
          >
            Reset
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          A finished look in one click. Everything below stays editable &mdash; change anything and
          you are on your own palette from there.
        </p>
      </Section>
      <Section
        title="Base colour"
        action={
          // The preview's light/dark switch, repeated here on purpose. It also
          // lives in the header, but this is the control it belongs beside:
          // a base colour's whole character is in its dark surfaces, and
          // deciding between eight of them while looking at one mode is
          // choosing half a palette.
          <div className="w-28">
            <Segmented
              value={previewDark ? "dark" : "light"}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(next) => onPreviewDark(next === "dark")}
            />
          </div>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {BASES.map((base) => {
            const tokens = composeTheme(base, value.accent);
            return (
              <button
                key={base}
                type="button"
                onClick={() => set({ base })}
                aria-pressed={base === value.base}
                className={cn(
                  "flex flex-col items-stretch gap-1.5 rounded-lg border p-2 text-xs transition-colors",
                  base === value.base ? "border-primary bg-accent" : "hover:bg-accent/50",
                )}
              >
                <BaseSwatch tokens={tokens[mode]} />
                <span className="text-left">{baseTokens(base).label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent">
        <div className="grid grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => set({ accent: null })}
            aria-pressed={value.accent === null}
            title="No accent — the base colour's own primary"
            className={cn(
              "grid h-9 place-items-center rounded-lg border text-[10px] transition-colors",
              value.accent === null ? "border-primary bg-accent" : "hover:bg-accent/50",
            )}
          >
            None
          </button>
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              onClick={() => set({ accent })}
              aria-pressed={accent === value.accent}
              title={accent}
              className={cn(
                "grid h-9 place-items-center rounded-lg border transition-colors",
                accent === value.accent ? "border-primary bg-accent" : "hover:bg-accent/50",
              )}
            >
              <Swatch value={composeTheme(value.base, accent)[mode].primary} className="size-4" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Shape & mode">
        <Field label="Radius" hint={value.radius}>
          <Segmented
            value={value.radius}
            options={RADII.map((r) => ({ value: r.value, label: r.label }))}
            onChange={(radius) => set({ radius })}
          />
        </Field>
        <Field label="Dark mode" hint={value.dark === "toggle" ? "ships a switcher" : undefined}>
          <Segmented
            value={value.dark}
            options={DARK_MODES.map((m) => ({ value: m as DarkMode, label: m }))}
            onChange={(dark) => set({ dark })}
          />
        </Field>
      </Section>

      <Section title="Typography">
        <Field label="Body" hint="Tailwind's --font-sans">
          <select
            value={value.fonts.sans ?? ""}
            onChange={(e) => set({ fonts: withFont(value.fonts, "sans", e.target.value) })}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="">System stack (no download)</option>
            {sansFonts.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Headings" hint="bound to h1–h6">
          <select
            value={value.fonts.heading ?? ""}
            onChange={(e) => set({ fonts: withFont(value.fonts, "heading", e.target.value) })}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="">Inherit the body face</option>
            {FONT_IDS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Code">
          <select
            value={value.fonts.mono ?? ""}
            onChange={(e) => set({ fonts: withFont(value.fonts, "mono", e.target.value) })}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="">System mono</option>
            {monoFonts.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Icons">
        <Segmented
          value={value.icons}
          options={ICON_LIBRARIES.map((i) => ({ value: i as string, label: i }))}
          onChange={(icons) => set({ icons })}
        />
        <p className="text-muted-foreground text-xs">
          The preview uses the set you pick, so the difference is visible before you commit to it.
        </p>
      </Section>

      <Section title="Tokens">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-4"
        >
          {editing ? "Hide" : "Edit individual tokens"}
        </button>
        {isEdited(value) && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {Object.keys(value.overrides[mode]).length} edited in {mode}
            </span>
            <button
              type="button"
              onClick={() => set({ overrides: { light: {}, dark: {} } })}
              className="underline underline-offset-4"
            >
              Reset
            </button>
          </div>
        )}
        {editing && (
          <div className="scroll-slim flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
            {orderedTokens(theme[mode])
              .filter(([name]) => name !== "radius")
              .map(([name, current]) => {
                const rgb = parseColor(current);
                const hex =
                  rgb === null
                    ? "#000000"
                    : `#${[rgb.r, rgb.g, rgb.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
                return (
                  <label key={name} className="flex items-center gap-2 text-xs">
                    {/*
                      A native colour input, on purpose. It is the one picker
                      every platform already has, it needs no dependency, and
                      the value it produces is hex — which the SDK's importer
                      accepts alongside oklch, so an edited token round-trips
                      through the same path a third-party registry theme does.
                    */}
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) =>
                        set({
                          overrides: {
                            ...value.overrides,
                            [mode]: { ...value.overrides[mode], [name]: e.target.value },
                          },
                        })
                      }
                      className="border-input size-6 shrink-0 cursor-pointer rounded border bg-transparent"
                    />
                    <span className="truncate font-mono">--{name}</span>
                    <span className="text-muted-foreground ml-auto truncate font-mono text-[10px]">
                      {current}
                    </span>
                  </label>
                );
              })}
          </div>
        )}
      </Section>
    </div>
  );
}
