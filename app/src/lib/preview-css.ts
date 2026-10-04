/**
 * Turning a chosen theme into CSS the preview pane can wear, without theming
 * the configurator around it.
 *
 * The scaffold writes its tokens to `:root` and `.dark`. The preview cannot:
 * those selectors would repaint this whole app, including the controls you use
 * to change them. So the same token VALUES are emitted against a scoped
 * selector instead, and the preview is rendered inside an element carrying it.
 *
 * The values are the only thing that matters for fidelity, and they come from
 * the SDK's own tables through `@xano/sdk/scaffold` — the same functions
 * `renderIndexCss` uses. What differs is the selector and nothing else, which
 * is why "what you see" and "what gets written" cannot drift apart in the way
 * a hand-assembled preview would.
 *
 * Fonts are the one deliberate exception, and it is worth being precise about:
 * a scaffold self-hosts its typefaces from `@fontsource-*` packages, and this
 * app cannot bundle 26 of them to preview one. The preview loads the chosen
 * face from Google Fonts instead. The rendering is the same; the delivery is
 * not, and the generated project never makes that request.
 *
 * That difference reaches into the family NAME, which is the subtle part.
 * fontsource registers a variable face under its own name — `Geist Variable` —
 * while Google serves the same typeface as `Geist`. Emitting the SDK's family
 * string here would ask for a family the preview never loaded, and the browser
 * would quietly fall back to the system stack: every font choice would look
 * like it did nothing, except the handful whose two names happen to coincide
 * (`Instrument Serif`). So the preview builds its own stack from the label.
 */
import { FONTS, orderedTokens } from "@xano/sdk/scaffold";
import type { FontSelection } from "../../../src/protocol.js";

/** The class the preview root carries. Scopes every token below it. */
export const PREVIEW_SCOPE = "xo-preview";

/** The generic to fall back to, so a missing download still reads correctly. */
const GENERIC: Record<string, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

/**
 * The font stack for the preview: the family Google Fonts actually registers,
 * plus a generic.
 *
 * NOT `FONTS[id].family` — see the note at the top of this file. That string
 * names the fontsource face (`'Geist Variable'`), which nothing on this page
 * has loaded.
 */
function previewFamily(id: string): string {
  const font = FONTS[id as keyof typeof FONTS];
  return `'${font.label}', ${GENERIC[font.type] ?? "sans-serif"}`;
}

/** `--font-sans` etc. for the preview, using whatever the browser can load. */
function fontVars(fonts: FontSelection): string[] {
  const rows: string[] = [];
  if (fonts.sans !== undefined) rows.push(`  --font-sans: ${previewFamily(fonts.sans)};`);
  if (fonts.mono !== undefined) rows.push(`  --font-mono: ${previewFamily(fonts.mono)};`);
  if (fonts.heading !== undefined) {
    rows.push(`  --font-heading: ${previewFamily(fonts.heading)};`);
  }
  return rows;
}

/**
 * The `<style>` body for a preview of `theme`.
 *
 * `light` sits on the scope element and `dark` on `.dark` INSIDE it, rather
 * than on the document — so the preview's own light/dark switch is independent
 * of the configurator's, and you can compare the two halves of a palette
 * without your controls flipping colour underneath you.
 */
export function previewCss(
  /**
   * Structural rather than the SDK's `Theme`: the customizer composes an eighth
   * base the SDK has never heard of, and this function only ever reads the two
   * token maps. Asking for the nominal type would exclude a palette it renders
   * perfectly well.
   */
  theme: { light: Readonly<Record<string, string>>; dark: Readonly<Record<string, string>> },
  fonts: FontSelection,
  radius: string,
): string {
  const block = (vars: Readonly<Record<string, string>>): string =>
    orderedTokens(vars)
      .map(([name, value]) => `  --${name}: ${name === "radius" ? radius : value};`)
      .join("\n");
  return `.${PREVIEW_SCOPE} {
${block(theme.light)}
${fontVars(fonts).join("\n")}
  font-family: var(--font-sans, inherit);
}

.${PREVIEW_SCOPE}.is-dark {
${block(theme.dark)}
}

.${PREVIEW_SCOPE} h1,
.${PREVIEW_SCOPE} h2,
.${PREVIEW_SCOPE} h3 {
  font-family: var(--font-heading, var(--font-sans, inherit));
}
`;
}

/**
 * The Google Fonts stylesheet URL for the chosen faces, or null when none are
 * chosen.
 *
 * Preview-only — see the note at the top of this file. Families are sent as the
 * face's own name with spaces turned into `+`, which is what the v2 API takes.
 */
export function previewFontHref(fonts: FontSelection): string | null {
  const ids = [fonts.sans, fonts.mono, fonts.heading].filter(
    (id): id is string => id !== undefined,
  );
  if (ids.length === 0) return null;
  const families = [...new Set(ids)].map((id) => {
    const label = FONTS[id as keyof typeof FONTS].label;
    return `family=${label.replace(/\s+/g, "+")}:wght@400;500;600;700`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
