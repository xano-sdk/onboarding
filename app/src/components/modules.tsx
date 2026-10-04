/**
 * The plugins step.
 *
 * Rendered entirely from `GET /api:marketplace/plugins`, never from a list
 * baked in here — a module published tomorrow appears without a release of
 * onboarding, which is the point of reading a catalogue at all.
 *
 * Built for a catalogue that grows. Three today is a list you read top to
 * bottom; fifty is not, and the difference shows up all at once. So:
 *
 * - A GRID of cards, three to a row, rather than full-width rows. A row that
 *   spans the window gives one module the same weight as the whole step and
 *   fits four on a screen; cards fit a dozen, and scanning a marketplace is
 *   comparing things side by side rather than reading them in sequence. Every
 *   card is the same height whatever it contains, because a ragged grid is
 *   harder to scan than a list.
 * - Search over everything a module says about itself, not just its title. At
 *   scale people arrive knowing what they want ("auth", "embeddings") rather
 *   than which package provides it.
 * - Tag filters derived from the catalogue itself, so a new category needs no
 *   code here.
 * - Selections pinned above the grid. Past a screenful, "what have I picked" is
 *   otherwise a scrolling exercise, and picking twice is easy.
 * - Detail in a modal, not in the card. Every module wants a paragraph and a
 *   manifest, and a card that expands in place shoves its neighbours down the
 *   page and tears a hole in the row. The detail comes up over the grid and
 *   hands it back unchanged.
 *
 * Not virtualised. The catalogue is designed to be fetched whole and filtered
 * on the client (its own API guide says so), and a few hundred rows of static
 * markup is well inside what the DOM handles.
 */
import { useMemo, useState } from "react";
import type { CatalogueEntry } from "../../../src/protocol.js";
import { Out, Terminal } from "@/components/terminal";
import { Button, Modal } from "@/components/ui";
import { iconSet } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** `3 tables · 5 endpoints · 1 task` from the itemised manifest. */
function summarise(includes: CatalogueEntry["includes"]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of includes) {
    const kind = item.kind === "" ? "object" : item.kind;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()];
}

/** Everything a module says about itself, lowercased once for searching. */
function haystack(entry: CatalogueEntry): string {
  return [
    entry.title,
    entry.npmPackage,
    entry.slug,
    entry.tagline,
    entry.description,
    entry.tags.join(" "),
    entry.includes.map((i) => `${i.kind} ${i.name}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function ModuleCard({
  entry,
  selected,
  onToggle,
  onDetails,
  icons,
}: {
  entry: CatalogueEntry;
  selected: boolean;
  onToggle: () => void;
  onDetails: () => void;
  icons: string;
}) {
  const I = iconSet(icons);
  const counts = summarise(entry.includes);

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border transition-colors",
        selected ? "bg-accent/30" : "bg-card hover:border-ring/60",
      )}
      style={selected ? { borderColor: "var(--xo-brand)" } : undefined}
    >
      {/*
        The body toggles selection; Details and the links below are their own
        controls. Nesting them inside the toggle would make reading about a
        module also select it, which is the opposite of what someone deciding
        wants — and `flex-1` here is what keeps every card in a row the same
        height when their taglines are not.
      */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="flex flex-1 cursor-pointer flex-col items-start gap-3 p-4 text-left"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{entry.title}</span>
            <code className="text-muted-foreground mt-0.5 block truncate font-mono text-[11px]">
              {entry.npmPackage}
            </code>
          </span>
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-full border text-xs transition-colors",
              selected ? "text-white" : "border-input",
            )}
            style={
              selected ? { background: "var(--xo-brand)", borderColor: "var(--xo-brand)" } : undefined
            }
            aria-hidden
          >
            {selected ? "✓" : ""}
          </span>
        </span>

        <span className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {entry.tagline}
        </span>

        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {counts.map(([kind, n]) => (
            <span
              key={kind}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] tabular-nums"
            >
              {n} {kind}
              {n === 1 ? "" : "s"}
            </span>
          ))}
          {entry.requirements.length > 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <I.alert className="size-3" />
              needs setup
            </span>
          )}
        </span>
      </button>

      <div className="flex items-center gap-3 border-t px-4 py-2.5 text-xs">
        <button
          type="button"
          onClick={onDetails}
          className="text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-4"
        >
          Details
        </button>
        {entry.docsUrl !== null && (
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Docs
          </a>
        )}
        {entry.tags.length > 0 && (
          <span className="text-muted-foreground ml-auto flex min-w-0 gap-1">
            {/* One tag on the card. The rest are a filter away, and a card that
                wraps to three lines of tags stops being scannable. */}
            <span className="bg-muted truncate rounded px-1.5 py-0.5">{entry.tags[0]}</span>
            {entry.tags.length > 1 && (
              <span className="shrink-0 py-0.5">+{entry.tags.length - 1}</span>
            )}
          </span>
        )}
      </div>
    </article>
  );
}

/** The long form: everything the card had to leave out. */
function ModuleDetail({
  entry,
  selected,
  onToggle,
  onClose,
}: {
  entry: CatalogueEntry | null;
  selected: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={entry?.title ?? ""}
      subtitle={
        entry === null ? undefined : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="text-muted-foreground font-mono text-xs">{entry.npmPackage}</code>
            {entry.tags.map((tag) => (
              <span key={tag} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )
      }
      footer={
        entry === null ? undefined : (
          <>
            {entry.repoUrl !== null && (
              <a
                href={entry.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground mr-auto text-xs underline underline-offset-4"
              >
                Source
              </a>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant={selected ? "secondary" : "default"} onClick={onToggle}>
              {selected ? "Remove" : "Add to project"}
            </Button>
          </>
        )
      }
    >
      {entry !== null && (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed">{entry.tagline}</p>
          {entry.description !== "" && entry.description !== entry.tagline && (
            <p className="text-muted-foreground text-sm leading-relaxed">{entry.description}</p>
          )}

          {entry.requirements.length > 0 && (
            <div className="border-border bg-muted/40 rounded-lg border p-3">
              <h3 className="text-xs font-semibold tracking-wide uppercase opacity-60">
                You will need
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {entry.requirements.map((req) => (
                  <li key={req} className="text-muted-foreground flex gap-2 text-sm">
                    <span aria-hidden>·</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.includes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide uppercase opacity-60">
                Adds to your backend
              </h3>
              <ul className="border-border divide-border mt-2 divide-y rounded-lg border">
                {entry.includes.map((item) => (
                  <li key={`${item.kind}:${item.name}`} className="flex gap-3 p-3 text-sm">
                    <span className="bg-muted text-muted-foreground h-fit rounded px-1.5 py-0.5 font-mono text-[11px]">
                      {item.kind}
                    </span>
                    <span className="min-w-0">
                      <code className="font-mono text-xs">{item.name}</code>
                      {item.summary !== "" && (
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">
                          {item.summary}
                        </p>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ModulePicker({
  catalogue,
  error,
  selected,
  onToggle,
  icons,
}: {
  catalogue: readonly CatalogueEntry[];
  error: string | null;
  selected: readonly string[];
  onToggle: (npmPackage: string) => void;
  icons: string;
}) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<readonly string[]>([]);
  /** The module whose detail is open, by package. Null when the grid is bare. */
  const [detail, setDetail] = useState<string | null>(null);
  const I = iconSet(icons);

  // Derived from the catalogue, so a new category needs no code here.
  const allTags = useMemo(
    () => [...new Set(catalogue.flatMap((e) => e.tags))].sort(),
    [catalogue],
  );

  const indexed = useMemo(
    () => catalogue.map((entry) => ({ entry, text: haystack(entry) })),
    [catalogue],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return indexed
      .filter(({ text }) => q === "" || text.includes(q))
      // AND across tags, not OR: with a handful of tags OR selects almost
      // everything, and narrowing is the only reason to touch a filter.
      .filter(({ entry }) => activeTags.every((tag) => entry.tags.includes(tag)))
      .map(({ entry }) => entry);
  }, [indexed, query, activeTags]);

  const selectedEntries = catalogue.filter((e) => selected.includes(e.npmPackage));

  if (error !== null) {
    return (
      <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-5 text-sm">
        <p className="font-medium">Could not load the module catalogue.</p>
        <p className="mt-1 text-xs opacity-80">{error}</p>
        <p className="text-muted-foreground mt-3 text-xs">
          You can still create the project — add modules later with{" "}
          <code className="font-mono">xanosdk marketplace install &lt;package&gt;</code>.
        </p>
      </div>
    );
  }
  if (catalogue.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border p-5 text-sm">
        No modules are published yet. You can add them later with{" "}
        <code className="font-mono">xanosdk marketplace install &lt;package&gt;</code>.
      </p>
    );
  }

  return (
    <div className="xo-brand flex flex-col gap-4">
      {/*
        What you have picked, as the line it becomes.
        
        Pinned so a selection made at card 40 stays visible while you keep
        looking — but shown as the install command rather than a row of chips,
        because that is what selecting a module actually DOES, and because it is
        the same session that has been following you since the first screen. It
        is still the fastest way to drop one: every package name is a button.
      */}
      {selectedEntries.length > 0 && (
        <Terminal
          title={`${selectedEntries.length} module${selectedEntries.length === 1 ? "" : "s"} selected`}
        >
          {/*
            One line, because that is what your selections become.

            Not `npm i`, and not a `marketplace install` per module either: both
            were a second way to describe the same thing. Add-ons ride on the
            init command as a single `--marketplace` flag, so what this panel
            shows is literally a fragment of the command the review screen
            prints and the CLI runs — and it stays one line however many modules
            you pick. Every package in it is still a button.
          */}
          <Out tone="comment">adds to your init command</Out>
          <p className="whitespace-pre-wrap pl-4 -indent-4">
            <span style={{ color: "var(--xo-term-ink)" }}>--marketplace </span>
            {selectedEntries.map((entry, i) => (
              <span key={entry.npmPackage}>
                {i > 0 && <span style={{ color: "var(--xo-term-dim)" }}>,</span>}
                <button
                  type="button"
                  onClick={() => onToggle(entry.npmPackage)}
                  // The visible text is the package; the name says what the
                  // click does, which is not guessable from a package name.
                  aria-label={`Remove ${entry.title}`}
                  title={`Remove ${entry.title}`}
                  className="cursor-pointer rounded-sm underline decoration-dotted underline-offset-4 outline-none hover:opacity-70 focus-visible:ring-[2px]"
                  style={{ color: "var(--xo-live)" }}
                >
                  {entry.npmPackage}
                  <I.x className="ml-0.5 inline size-3 align-[-1px]" />
                </button>
              </span>
            ))}
          </p>
          <Out tone="comment">installed and registered in xano/index.ts for you</Out>
        </Terminal>
      )}

      <div className="flex flex-col gap-3">
        <div className="relative">
          <I.search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules — auth, embeddings, chat…"
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border pr-9 pl-9 text-sm outline-none focus-visible:ring-[3px]"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <I.x className="size-4" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {allTags.map((tag) => {
              const on = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setActiveTags((current) =>
                      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                    )
                  }
                  aria-pressed={on}
                  className={cn(
                    "cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on ? "text-white" : "text-muted-foreground hover:bg-accent",
                  )}
                  style={
                    on ? { background: "var(--xo-brand)", borderColor: "var(--xo-brand)" } : undefined
                  }
                >
                  {tag}
                </button>
              );
            })}
            {(activeTags.length > 0 || query !== "") && (
              <button
                type="button"
                onClick={() => {
                  setActiveTags([]);
                  setQuery("");
                }}
                className="text-muted-foreground hover:text-foreground ml-1 text-xs underline underline-offset-4"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <p className="text-muted-foreground text-xs tabular-nums">
          {results.length === catalogue.length
            ? `${catalogue.length} module${catalogue.length === 1 ? "" : "s"}`
            : `${results.length} of ${catalogue.length} modules`}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Nothing matches that</p>
          <p className="text-muted-foreground text-xs">
            Try a different search, or clear the filters.
          </p>
        </div>
      ) : (
        // Three across from a laptop up, two on a tablet, one on a phone. The
        // step's own column is widened to match — see App.tsx.
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((entry) => (
            <ModuleCard
              key={entry.npmPackage}
              entry={entry}
              icons={icons}
              selected={selected.includes(entry.npmPackage)}
              onToggle={() => onToggle(entry.npmPackage)}
              onDetails={() => setDetail(entry.npmPackage)}
            />
          ))}
        </div>
      )}

      <ModuleDetail
        entry={catalogue.find((e) => e.npmPackage === detail) ?? null}
        selected={detail !== null && selected.includes(detail)}
        onToggle={() => detail !== null && onToggle(detail)}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
