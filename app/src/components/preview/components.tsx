/**
 * The component gallery: the surfaces and states a theme has to survive.
 *
 * Chosen for what they stress rather than for coverage. Overlays (dialog,
 * popover, dropdown, command) are the only place `--popover` is visible, and in
 * several themes it is identical to `--card` — worth seeing, because it means a
 * menu over a card has no edge. Alerts are where `--destructive` sits on a
 * tinted background rather than a solid button. Skeletons are `--muted` against
 * `--card`, which is the pair most likely to end up invisible.
 *
 * Everything here works. Tabs switch, the accordion opens, the menu selects,
 * the command palette filters as you type and answers to the arrow keys, Copy
 * copies. Two things follow from that which a gallery of shapes cannot give
 * you: the hover and active states of every surface, and the knowledge that a
 * palette which looks fine at rest can still be unusable in motion.
 *
 * What does NOT change: the overlays that are always open stay always open. A
 * preview you have to click to reveal is a preview most people never see, so
 * the dropdown and the command palette are rendered inline and open, and the
 * one modal in here is the only surface behind a button — because a modal that
 * is always up is not a modal, it is a card.
 */
import { useState } from "react";
import { Button, Dialog, Tabs, Tooltip } from "@/components/preview/ui";
import { iconSet } from "@/lib/icons";
import { cn } from "@/lib/utils";

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const MENU_ITEMS = ["Edit", "Duplicate", "Filter"] as const;

const COMMANDS = [
  "Deploy to ephemeral",
  "Open dashboard",
  "Invite teammate",
  "Roll back last deploy",
  "Copy connection string",
];

const TAB_PANELS: Record<string, { body: string; meta: string }> = {
  Overview: { body: "Four services, all healthy. Last deploy 2 minutes ago.", meta: "us-east-1" },
  Logs: { body: "12 warnings in the last hour, none since the latest deploy.", meta: "live tail" },
  Settings: { body: "Auto-deploy runs on every push to main.", meta: "3 collaborators" },
};

const FAQ = [
  {
    q: "What is an ephemeral environment?",
    a: "A disposable Xano environment that expires on its own, so a deploy never touches anything you care about.",
  },
  {
    q: "How does xano.lock work?",
    a: "It maps each object in your source to the guid Xano assigned it, so a rename is a rename rather than a delete and a create.",
  },
];

export function Components({ icons }: { icons: string }) {
  const I = iconSet(icons);
  const [rating, setRating] = useState(4);
  const [menuChoice, setMenuChoice] = useState<string>(MENU_ITEMS[0]);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [ran, setRan] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [page, setPage] = useState(2);
  const [open, setOpen] = useState<number | null>(0);
  const [progress, setProgress] = useState(68);
  const [loading, setLoading] = useState(false);

  const matches = COMMANDS.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  const panel = TAB_PANELS[tab]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <I.spinner className="size-4 animate-spin" /> Saving
                </>
              ) : (
                <>
                  <I.plus className="size-4" /> New project
                </>
              )}
            </Button>
            <Button disabled>
              <I.spinner className="size-4 animate-spin" /> Disabled
            </Button>
            <Tooltip label="More actions">
              <Button variant="outline" size="icon" aria-label="More actions">
                <I.more className="size-4" />
              </Button>
            </Tooltip>
          </div>
        </Card>

        <Card title="Badges and avatars">
          <div className="flex flex-wrap gap-2">
            <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              Default
            </span>
            <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              Secondary
            </span>
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">Outline</span>
            <span className="bg-destructive rounded-full px-2.5 py-0.5 text-xs font-medium text-white">
              Destructive
            </span>
            <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2.5 py-0.5 text-xs font-medium">
              Tinted
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["AM", "JD", "SK", "+3"].map((initials, i) => (
                <Tooltip key={initials} label={i === 3 ? "3 more" : initials}>
                  <span
                    className={cn(
                      "border-background grid size-8 cursor-default place-items-center rounded-full border-2 text-xs font-medium transition-transform hover:-translate-y-0.5",
                      i === 3
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {initials}
                  </span>
                </Tooltip>
              ))}
            </div>
            {/* A real rating: the star colour is a ramp token, and whether a
                filled star reads as filled is only obvious once you set it. */}
            <div className="flex items-center gap-1 text-xs">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                  aria-pressed={n === rating}
                  className="cursor-pointer rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <I.star
                    className={cn(
                      "size-4 transition-colors",
                      n <= rating ? "fill-chart-1 text-chart-1" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
              <span className="text-muted-foreground ml-1 tabular-nums">{rating}.0</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Alerts">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <I.info className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Heads up</p>
              <p className="text-muted-foreground text-sm">
                Your ephemeral environment expires in 42 minutes.
              </p>
            </div>
          </div>
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-3 rounded-lg border p-3">
            <I.alert className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Deploy failed</p>
              <p className="text-sm opacity-90">
                <code className="font-mono">webhook-relay</code> exited with status 1.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="destructive" size="sm">
                  Retry
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                  View logs
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Progress and loading"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress((p) => (p >= 100 ? 12 : Math.min(100, p + 16)))}
            >
              {progress >= 100 ? "Restart" : "Advance"}
            </Button>
          }
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {progress >= 100 ? "Build uploaded" : "Uploading build"}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* muted-on-card: the pair most likely to disappear in a theme. */}
            <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Dropdown">
          {/* Always open: a menu you have to click for is a menu nobody
              previews. Open does not mean inert — the items select. */}
          <div className="bg-popover text-popover-foreground w-full rounded-md border p-1 shadow-md">
            {MENU_ITEMS.map((label, i) => {
              const Icon = [I.file, I.copy, I.filter][i]!;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMenuChoice(label)}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    menuChoice === label && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {menuChoice === label && <I.check className="ml-auto size-3.5" />}
                </button>
              );
            })}
            <div className="bg-border my-1 h-px" />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus-visible:ring-destructive/40 focus-visible:ring-[3px]"
            >
              <I.trash className="size-4" />
              Delete
            </button>
          </div>
          <p className="text-muted-foreground text-xs">
            {deleted ? "Deleted. Nothing was really removed." : `Last action: ${menuChoice}`}
          </p>
        </Card>

        <Card title="Command">
          <div className="bg-popover text-popover-foreground overflow-hidden rounded-md border shadow-md">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <I.search className="text-muted-foreground size-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(matches.length - 1, c + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  } else if (e.key === "Enter" && matches[cursor] !== undefined) {
                    setRan(matches[cursor]!);
                  }
                }}
                placeholder="Type a command…"
                aria-label="Command"
                className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="p-1">
              <p className="text-muted-foreground px-2 py-1 text-[11px] font-medium">
                {matches.length === 0 ? "No results" : "Suggestions"}
              </p>
              {matches.map((item, i) => (
                <button
                  key={item}
                  type="button"
                  onPointerEnter={() => setCursor(i)}
                  onClick={() => setRan(item)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                    i === cursor && "bg-accent text-accent-foreground",
                  )}
                >
                  <I.chevronRight className="size-3.5 shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {ran === null ? "↑ ↓ to move, ↵ to run." : `Ran: ${ran}`}
          </p>
        </Card>

        <Card title="Tooltip and kbd">
          <div className="flex flex-col items-center gap-3 py-2">
            {/* One tooltip pinned open so the surface is never missed, and one
                on a real button so the interaction is never fake. */}
            <span className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs shadow-md">
              Deploy this build
            </span>
            <Tooltip label="Ships to production">
              <Button variant="outline">Deploy</Button>
            </Tooltip>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              Press
              <kbd className="bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                K
              </kbd>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tabs and navigation">
          <Tabs
            className="w-full"
            value={tab}
            onChange={setTab}
            options={Object.keys(TAB_PANELS).map((t) => ({ value: t, label: t }))}
          />
          <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span>{panel.body}</span>
            <span className="text-muted-foreground shrink-0 text-xs">{panel.meta}</span>
          </div>
          <nav className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="hover:text-foreground cursor-pointer">Projects</span>
            <I.chevronRight className="size-3" />
            <span className="hover:text-foreground cursor-pointer">acme</span>
            <I.chevronRight className="size-3" />
            <span className="text-foreground font-medium">{tab}</span>
          </nav>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={page === n ? "page" : undefined}
                className={cn(
                  "grid size-8 cursor-pointer place-items-center rounded-md text-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  page === n
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent border",
                )}
              >
                {n}
              </button>
            ))}
            <span className="text-muted-foreground px-1 text-sm">…</span>
            <button
              type="button"
              onClick={() => setPage(9)}
              aria-current={page === 9 ? "page" : undefined}
              className={cn(
                "grid size-8 cursor-pointer place-items-center rounded-md text-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                page === 9 ? "bg-primary text-primary-foreground" : "hover:bg-accent border",
              )}
            >
              9
            </button>
            <span className="text-muted-foreground ml-2 text-xs tabular-nums">Page {page} of 9</span>
          </div>
        </Card>

        <Card title="Accordion and empty state">
          <div className="divide-border divide-y border-y">
            {FAQ.map((item, i) => (
              <div key={item.q} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                  className="hover:text-primary flex cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <span className="text-sm font-medium">{item.q}</span>
                  <I.chevronDown
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      open === i && "rotate-180",
                    )}
                  />
                </button>
                {open === i && <p className="text-muted-foreground pb-3 text-sm">{item.a}</p>}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
            <div className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full">
              <I.file className="size-5" />
            </div>
            <p className="text-sm font-medium">No deployments yet</p>
            <p className="text-muted-foreground text-xs">
              Run <code className="font-mono">npm run xano:deploy</code> to ship your first build.
            </p>
            <Button size="sm" className="mt-1">
              <I.plus className="size-4" /> New deployment
            </Button>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this service?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleted(true);
                setConfirming(false);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        Nothing is actually deleted — this is a preview. It is here because a modal is the only
        place a theme shows you <code className="font-mono">--popover</code> over a dimmed page.
      </Dialog>
    </div>
  );
}

/**
 * A code block with syntax colouring drawn from the chart ramp.
 *
 * Not arbitrary: a theme has to be able to colour code, and the only palette a
 * shadcn theme actually ships for "several distinguishable hues" is
 * `chart-1..5`. Using it here shows whether those five stay legible as small
 * text on `--muted`, which the bar chart cannot tell you.
 */
export function CodeAndType({ icons }: { icons: string }) {
  const I = iconSet(icons);
  const [copied, setCopied] = useState(false);
  const source = `import { workspace, table, f } from "@xano/sdk";

// \`id\` and \`created_at\` are injected.
const notes = table({
  name: "notes",
  schema: { body: f.text({ required: true }) },
});

export default workspace("acme").registerTables([notes]);`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">xano/index.ts</h3>
          <button
            type="button"
            onClick={() => {
              // Best-effort: a loopback page is a secure context, but a browser
              // that refuses the clipboard should not break the preview.
              void navigator.clipboard?.writeText(source).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-sm text-xs transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {copied ? <I.check className="text-primary size-3.5" /> : <I.copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="bg-muted scroll-slim overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
          <code>
            <span className="text-chart-3">import</span>
            <span> {"{ workspace, table, f }"} </span>
            <span className="text-chart-3">from</span>
            <span className="text-chart-2"> &quot;@xano/sdk&quot;</span>
            <span>;{"\n\n"}</span>
            <span className="text-muted-foreground">{"// `id` and `created_at` are injected.\n"}</span>
            <span className="text-chart-3">const</span>
            <span className="text-chart-1"> notes</span>
            <span> = </span>
            <span className="text-chart-4">table</span>
            <span>{"({\n  name: "}</span>
            <span className="text-chart-2">&quot;notes&quot;</span>
            <span>{",\n  schema: { body: "}</span>
            <span className="text-chart-4">f.text</span>
            <span>{"({ required: "}</span>
            <span className="text-chart-5">true</span>
            <span>{" }) },\n});\n\n"}</span>
            <span className="text-chart-3">export default</span>
            <span className="text-chart-4"> workspace</span>
            <span>(</span>
            <span className="text-chart-2">&quot;acme&quot;</span>
            <span>{").registerTables(["}</span>
            <span className="text-chart-1">notes</span>
            <span>{"]);"}</span>
          </code>
        </pre>
        <div className="bg-background text-muted-foreground scroll-slim overflow-x-auto rounded-lg border p-3 font-mono text-xs">
          <div>
            <span className="text-chart-2">→</span> Deploying ./xano/index.ts
          </div>
          <div>
            <span className="text-chart-1">✓</span> Ephemeral e4f2-9ab1 deployed
          </div>
          <div className="text-destructive">✗ 1 test failed</div>
        </div>
      </div>

      <div className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Typography</h3>
        <h1 className="text-3xl font-semibold tracking-tight">The quick brown fox</h1>
        <h2 className="text-xl font-semibold tracking-tight">Jumps over the lazy dog</h2>
        <p className="text-sm leading-relaxed">
          Body copy at its resting size. A theme has to keep this readable against{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">--background</code>,
          and keep <span className="text-muted-foreground">muted text</span> distinguishable from
          it without disappearing.
        </p>
        <blockquote className="border-primary text-muted-foreground border-l-2 pl-4 text-sm italic">
          &ldquo;Object identity derives from (type, name), so a rename changes an object&rsquo;s
          guid.&rdquo;
        </blockquote>
        <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
          {["Commit xano.lock", "Never edit it by hand", "Run xano:check in CI"].map((item) => (
            <li key={item} className="flex gap-2">
              <I.check className="text-primary mt-0.5 size-3.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Small print, links look like{" "}
          <a
            href="#type"
            onClick={(e) => e.preventDefault()}
            className="text-primary hover:text-primary/80 underline underline-offset-4"
          >
            this one
          </a>
          .
        </p>
      </div>
    </div>
  );
}
