/**
 * Narrowing the wire's font selection to the SDK's.
 *
 * `protocol.ts` types the three slots as plain strings, deliberately: it is the
 * shape that crosses an HTTP boundary, and a union of 26 literals is not
 * something a JSON body can be trusted to honour. The SDK's `FontChoice` is
 * that union, because on its side the value has already been validated.
 *
 * This is the one place the two meet. Unknown ids are dropped rather than
 * passed through — the CLI validates again with `resolveFontFlag` and would
 * reject them anyway, and dropping here means the preview degrades to the
 * system stack instead of emitting a font stack for a face that does not exist.
 */
import { FONTS, type FontChoice, type FontId } from "@xano/sdk/scaffold";
import type { FontSelection } from "../../../src/protocol.js";

function known(id: string | undefined): FontId | undefined {
  return id !== undefined && Object.prototype.hasOwnProperty.call(FONTS, id)
    ? (id as FontId)
    : undefined;
}

export function toFontChoice(fonts: FontSelection): FontChoice {
  const sans = known(fonts.sans);
  const mono = known(fonts.mono);
  const heading = known(fonts.heading);
  // Keys are omitted rather than set to undefined: the SDK's types are
  // `exactOptionalPropertyTypes`, where the two are not the same thing.
  return {
    ...(sans === undefined ? {} : { sans }),
    ...(mono === undefined ? {} : { mono }),
    ...(heading === undefined ? {} : { heading }),
  };
}

/** Set one slot, dropping the key entirely when cleared. */
export function withFont(
  fonts: FontSelection,
  slot: "sans" | "mono" | "heading",
  id: string,
): FontSelection {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(fonts)) {
    if (value !== undefined && key !== slot) next[key] = value;
  }
  if (id !== "") next[slot] = id;
  return next as FontSelection;
}
