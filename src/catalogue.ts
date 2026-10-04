/**
 * The marketplace catalogue, fetched once and projected for the picker.
 *
 * Deliberately NOT a hardcoded list of the three modules that exist today. The
 * catalogue is a public, unauthenticated API and it is the thing that grows —
 * a new module published there has to appear in onboarding without a release of
 * onboarding, or every publisher is blocked on this package's release cadence.
 *
 * Projection is field-by-field rather than a cast, mirroring the SDK's own
 * catalogue reader: it pins what the picker depends on. A column added upstream
 * cannot silently widen the UI's input, and a column removed upstream surfaces
 * here as a missing field instead of `undefined` reaching React.
 */
import type { CatalogueEntry } from "./protocol.js";

/**
 * Where the catalogue lives. The same host and the same override the SDK's
 * `marketplace list` reads, so the two can never disagree about which
 * catalogue is "the" catalogue.
 */
const DEFAULT_BASE_URL = "https://xare-rvr8-mnnt.dev.xano.io";

/** Bound the read so a stalled catalogue cannot hang onboarding before it starts. */
const TIMEOUT_MS = 15_000;

function baseUrl(): string {
  const override = process.env.XANOSDK_MARKETPLACE_URL;
  return override !== undefined && override !== "" ? override : DEFAULT_BASE_URL;
}

/** Coerce whatever a field holds to a string, so nothing renders `undefined`. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A URL field, or null — the picker renders a link only when there is one. */
function url(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Requirements arrive as objects (`{ text: "A Stripe account…" }`), not strings.
 *
 * The API guide calls this out specifically, and the failure mode of getting it
 * wrong is a card rendering `[object Object]` — visible, but only if someone
 * happens to select the one module that has requirements.
 */
function requirements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      typeof entry === "string" ? entry : str((entry as { text?: unknown } | null)?.text),
    )
    .filter((text) => text !== "");
}

function includes(value: unknown): CatalogueEntry["includes"] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = entry as Record<string, unknown>;
    return { kind: str(row.kind), name: str(row.name), summary: str(row.summary) };
  });
}

/** Project one catalogue record. Returns null for a row we cannot install. */
function project(raw: unknown): CatalogueEntry | null {
  const row = raw as Record<string, unknown>;
  const npmPackage = str(row.npm_package);
  // The package name IS the install argument. A row without one is unusable,
  // and showing it would produce a card whose only action fails.
  if (npmPackage === "") return null;
  return {
    slug: str(row.slug),
    npmPackage,
    title: str(row.title) || npmPackage,
    tagline: str(row.tagline),
    description: str(row.description),
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : [],
    includes: includes(row.includes),
    requirements: requirements(row.requirements),
    registerSnippet: str(row.register_snippet),
    docsUrl: url(row.docs_url),
    repoUrl: url(row.repo_url),
  };
}

/**
 * Fetch the catalogue.
 *
 * Never throws. A catalogue that cannot be reached must not stop someone
 * scaffolding a project — the modules are optional, and the theme half of
 * onboarding is entirely local. The reason comes back alongside the empty list
 * so the UI can say "could not reach the marketplace" rather than "no modules
 * available", which would be a lie.
 */
export async function fetchCatalogue(): Promise<{
  entries: CatalogueEntry[];
  error: string | null;
}> {
  const endpoint = `${baseUrl()}/api:marketplace/plugins`;
  try {
    const res = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { entries: [], error: `Marketplace returned ${res.status} ${res.statusText}.` };
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) {
      return { entries: [], error: "Marketplace returned an unexpected shape." };
    }
    return { entries: body.map(project).filter((e): e is CatalogueEntry => e !== null), error: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { entries: [], error: `Could not reach the marketplace: ${reason}` };
  }
}
