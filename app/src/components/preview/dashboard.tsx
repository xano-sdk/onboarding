/**
 * The live preview — a dashboard rendered entirely from the tokens the user is
 * choosing, and one you can actually operate.
 *
 * Every colour here comes from a semantic class (`bg-primary`, `bg-sidebar`,
 * `bg-chart-3`) whose custom property is supplied by the scoped stylesheet in
 * `lib/preview-css.ts`. Nothing picks a colour directly, which is the same
 * discipline the scaffold's own components follow — so what this pane shows is
 * what the generated project renders.
 *
 * It deliberately exercises the tokens NOTHING in a default scaffold touches:
 * the `chart-1..5` ramp and the whole `sidebar-*` family. Those are the ones a
 * user is most likely to be surprised by later, precisely because the starter
 * page never shows them.
 *
 * It is a working app rather than a screenshot of one. The navigation
 * navigates, the search filters, the table sorts and selects, and Deploy runs a
 * deploy. That is not showmanship: half of what a palette gets wrong only
 * appears in a state you have to reach — a sidebar item that is invisible until
 * it is active, a selected table row indistinguishable from a hovered one, a
 * toast whose `--popover` matches the card underneath it. A pane you can only
 * look at cannot show you any of those.
 *
 * Nothing here leaves the browser. "Deploying" is a timer.
 */
import { useMemo, useState } from "react";
import {
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
  RadialGauge,
  REQUESTS,
  REVENUE,
  SESSIONS,
  SPARK_A,
  SPARK_B,
  SPARK_C,
  Sparkline,
} from "@/components/preview/charts";
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  Select,
  Slider,
  Switch,
  Tabs,
  Toast,
  Tooltip,
} from "@/components/preview/ui";
import { iconSet } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Status = "live" | "queued" | "failed";
type PanelId = "overview" | "analytics" | "deployments" | "settings";

interface Row {
  id: string;
  name: string;
  env: string;
  status: Status;
  minutes: number;
}

const INITIAL_ROWS: readonly Row[] = [
  { id: "orders-api", name: "orders-api", env: "production", status: "live", minutes: 2 },
  { id: "billing-worker", name: "billing-worker", env: "production", status: "live", minutes: 11 },
  { id: "search-index", name: "search-index", env: "staging", status: "queued", minutes: 26 },
  { id: "webhook-relay", name: "webhook-relay", env: "production", status: "failed", minutes: 62 },
  { id: "media-resizer", name: "media-resizer", env: "ephemeral", status: "live", minutes: 94 },
  { id: "digest-mailer", name: "digest-mailer", env: "staging", status: "queued", minutes: 143 },
];

const BADGE: Record<Status, string> = {
  live: "bg-primary/10 text-primary border-primary/20",
  queued: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

/** "2m ago" / "1h ago", from a fixed number of minutes. No clock is read. */
function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

const SERIES = {
  Revenue: { values: REVENUE, token: "var(--chart-1)", spark: SPARK_A, format: (v: number) => `$${v}k` },
  "Active users": { values: SESSIONS, token: "var(--chart-4)", spark: SPARK_C, format: (v: number) => `${v}k` },
  Requests: { values: REQUESTS, token: "var(--chart-2)", spark: SPARK_B, format: (v: number) => `${v}k` },
} as const;

type SeriesName = keyof typeof SERIES;

const RANGES = [
  { value: "3", label: "3m" },
  { value: "6", label: "6m" },
  { value: "12", label: "12m" },
] as const;

export function Dashboard({
  icons,
  dark,
  appName,
  onToggleDark,
}: {
  icons: string;
  dark: boolean;
  appName: string;
  /** Flips the pane's own light/dark switch, from inside the pane. */
  onToggleDark: () => void;
}) {
  const I = iconSet(icons);
  const [panel, setPanel] = useState<PanelId>("overview");
  const [rows, setRows] = useState<readonly Row[]>(INITIAL_ROWS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<{ key: keyof Row; asc: boolean }>({ key: "minutes", asc: true });
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [series, setSeries] = useState<SeriesName>("Revenue");
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("12");
  const [deploying, setDeploying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [settings, setSettings] = useState({
    name: appName || "your-app",
    region: "us-east-1",
    autoDeploy: true,
    previews: true,
    quota: 84,
  });

  /**
   * The panels, titled here rather than by capitalising the id in CSS.
   *
   * `text-transform` changes the pixels and not the text, so a heading styled
   * that way reads "overview" to a screen reader — and the preview is supposed
   * to model what a real app does, not just what one looks like.
   */
  const nav: ReadonlyArray<{
    id: PanelId;
    label: string;
    blurb: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "overview", label: "Overview", blurb: "Last 7 days across all environments.", Icon: I.home },
    { id: "analytics", label: "Analytics", blurb: "Trailing twelve months, by series.", Icon: I.chart },
    { id: "deployments", label: "Deployments", blurb: "", Icon: I.activity },
    { id: "settings", label: "Settings", blurb: "Applies to every environment in this project.", Icon: I.settings },
  ];
  const current = nav.find((n) => n.id === panel)!;

  const stats: ReadonlyArray<{ label: SeriesName; value: string; delta: string; up: boolean; Icon: React.ComponentType<{ className?: string }> }> = [
    { label: "Revenue", value: "$48,120", delta: "+12.4%", up: true, Icon: I.card },
    { label: "Active users", value: "2,340", delta: "+4.1%", up: true, Icon: I.users },
    { label: "Requests", value: "1.2M", delta: "-2.3%", up: false, Icon: I.activity },
  ];

  const months = Number(range);
  const active = SERIES[series];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => needle === "" || r.name.includes(needle) || r.env.includes(needle))
      .slice()
      .sort((a, b) => {
        const [x, y] = [a[sort.key], b[sort.key]];
        const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.asc ? order : -order;
      });
  }, [rows, query, statusFilter, sort]);

  function deploy() {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      const name = (settings.name || "your-app").slice(0, 24);
      setRows((current) => [
        { id: `${name}-${current.length}`, name, env: "production", status: "live", minutes: 0 },
        ...current,
      ]);
      setToast(`Deployed ${name} to production`);
    }, 1500);
  }

  function toggleSort(key: keyof Row) {
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  }

  const failedCount = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="bg-background text-foreground relative flex overflow-hidden rounded-xl border">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-52 shrink-0 flex-col border-r lg:flex">
        <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold">
            {appName.slice(0, 1).toUpperCase() || "X"}
          </div>
          <span className="truncate text-sm font-semibold">{appName || "your-app"}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              aria-current={panel === id ? "page" : undefined}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-sidebar-ring/50 focus-visible:ring-[3px]",
                panel === id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {id === "deployments" && failedCount > 0 && (
                <span className="bg-destructive ml-auto grid size-4 place-items-center rounded-full text-[10px] font-medium text-white">
                  {failedCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <div className="bg-sidebar-accent/50 border-sidebar-border rounded-lg border p-3">
            <p className="text-sm font-medium">Free plan</p>
            <div className="bg-sidebar-border mt-2 h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-sidebar-primary h-full rounded-full transition-[width]"
                style={{ width: `${settings.quota}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setPanel("settings")}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground mt-2 cursor-pointer text-xs underline underline-offset-4"
            >
              {settings.quota}% of quota used
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex h-14 items-center gap-3 border-b px-4">
          <div className="relative hidden max-w-56 flex-1 sm:block">
            <I.search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services…"
              aria-label="Search services"
              className="pl-8"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications((n) => !n)}
              >
                <I.bell className="size-4" />
                {failedCount > 0 && (
                  <span className="bg-destructive absolute top-2 right-2 size-1.5 rounded-full" />
                )}
              </Button>
              {notifications && (
                <div className="bg-popover text-popover-foreground absolute top-full right-0 z-30 mt-1 w-64 rounded-lg border p-1 shadow-md">
                  <p className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium">
                    Notifications
                  </p>
                  {[
                    { icon: I.alert, text: `${failedCount} deploy failed`, tone: "text-destructive" },
                    { icon: I.check, text: "orders-api is live", tone: "text-primary" },
                    { icon: I.info, text: "Ephemeral expires in 42m", tone: "text-muted-foreground" },
                  ].map((n) => (
                    <div key={n.text} className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                      <n.icon className={cn("size-4 shrink-0", n.tone)} />
                      <span className="truncate">{n.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Tooltip label={dark ? "Switch to light" : "Switch to dark"}>
              <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={onToggleDark}>
                {dark ? <I.moon className="size-4" /> : <I.sun className="size-4" />}
              </Button>
            </Tooltip>
            <Button onClick={deploy} disabled={deploying}>
              {deploying ? (
                <>
                  <I.spinner className="size-4 animate-spin" /> Deploying
                </>
              ) : (
                "Deploy"
              )}
            </Button>
          </div>
        </header>

        {/* The sidebar is desktop-only, so the panels need a way in below lg. */}
        <div className="border-b p-3 lg:hidden">
          <Tabs
            className="w-full"
            value={panel}
            onChange={(id) => setPanel(id)}
            options={nav.map((n) => ({ value: n.id, label: n.label }))}
          />
        </div>

        <main className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{current.label}</h1>
              <p className="text-muted-foreground text-sm">
                {panel === "deployments"
                  ? `${visible.length} of ${rows.length} services shown.`
                  : current.blurb}
              </p>
            </div>
            {panel === "analytics" && (
              <Tabs value={range} onChange={setRange} options={RANGES.map((r) => ({ ...r }))} />
            )}
          </div>

          {panel === "overview" && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map(({ label, value, delta, up, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSeries(label)}
                    aria-pressed={series === label}
                    className={cn(
                      "bg-card text-card-foreground cursor-pointer rounded-xl border p-4 text-left shadow-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      series === label ? "border-primary ring-primary/20 ring-[3px]" : "hover:border-ring",
                    )}
                  >
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Icon className="size-3.5" />
                      {label}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-semibold tabular-nums">{value}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                          up ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {up ? <I.arrowUp className="size-3" /> : <I.arrowDown className="size-3" />}
                        {delta}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Sparkline values={SERIES[label].spark} token={SERIES[label].token} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm xl:col-span-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold">{series}</h2>
                      <p className="text-muted-foreground text-xs">
                        Trailing twelve months. Hover the line for a month.
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">Click a card above</span>
                  </div>
                  <div className="mt-3">
                    <AreaChart
                      values={active.values}
                      token={active.token}
                      label={series}
                      format={active.format}
                    />
                  </div>
                  <div className="mt-4 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Requests</h2>
                      <div className="text-muted-foreground flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1">
                          <span className="bg-chart-1 size-2 rounded-full" /> revenue
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="bg-chart-4 size-2 rounded-full" /> sessions
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <BarChart />
                    </div>
                  </div>
                </div>

                <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-4 shadow-sm">
                  <div>
                    <h2 className="text-sm font-semibold">Traffic</h2>
                    <p className="text-muted-foreground text-xs">By source, this month.</p>
                  </div>
                  <DonutChart />
                  <div className="flex items-center justify-between gap-4 border-t pt-4">
                    <div>
                      <h2 className="text-sm font-semibold">Quota</h2>
                      <p className="text-muted-foreground text-xs">
                        {Math.round(settings.quota * 100)} of 10,000 requests.
                      </p>
                    </div>
                    <RadialGauge value={settings.quota} />
                  </div>
                </div>
              </div>

              <DeploymentTable
                icons={icons}
                rows={visible.slice(0, 5)}
                sort={sort}
                onSort={toggleSort}
                selected={selected}
                onSelect={setSelected}
                title="Recent deployments"
                onSeeAll={() => setPanel("deployments")}
              />
            </>
          )}

          {panel === "analytics" && (
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{series}</h2>
                  <Tabs
                    value={series}
                    onChange={(next) => setSeries(next)}
                    options={(Object.keys(SERIES) as SeriesName[]).map((s) => ({ value: s, label: s }))}
                  />
                </div>
                <div className="mt-3">
                  <AreaChart
                    values={active.values.slice(12 - months)}
                    token={active.token}
                    label={series}
                    format={active.format}
                  />
                </div>
              </div>
              <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Sources</h2>
                <p className="text-muted-foreground text-xs">Hover a slice.</p>
                <div className="mt-3">
                  <DonutChart />
                </div>
              </div>
              <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm xl:col-span-2">
                <h2 className="text-sm font-semibold">Revenue against sessions</h2>
                <p className="text-muted-foreground text-xs">Two ramp colours on one grid.</p>
                <div className="mt-3">
                  <LineChart />
                </div>
              </div>
              <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Monthly</h2>
                <p className="text-muted-foreground text-xs">Last {months} months.</p>
                <div className="mt-3">
                  <BarChart months={months} />
                </div>
              </div>
            </div>
          )}

          {panel === "deployments" && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Tabs
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all" as const, label: "All" },
                    { value: "live" as const, label: "Live" },
                    { value: "queued" as const, label: "Queued" },
                    { value: "failed" as const, label: "Failed" },
                  ]}
                />
                <div className="min-w-40 flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name or environment…"
                    aria-label="Filter deployments"
                  />
                </div>
                <Button variant="outline" onClick={() => { setQuery(""); setStatusFilter("all"); }}>
                  Clear
                </Button>
              </div>
              <DeploymentTable
                icons={icons}
                rows={visible}
                sort={sort}
                onSort={toggleSort}
                selected={selected}
                onSelect={setSelected}
                title="All deployments"
              />
            </>
          )}

          {panel === "settings" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
                <h2 className="text-sm font-semibold">Project</h2>
                <div className="flex flex-col gap-2">
                  <label htmlFor="xo-name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="xo-name"
                    value={settings.name}
                    onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
                  />
                  <p className="text-muted-foreground text-xs">Used for the deploy you just ran.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="xo-region" className="text-sm font-medium">
                    Region
                  </label>
                  <div className="relative">
                    <Select
                      id="xo-region"
                      value={settings.region}
                      onChange={(e) => setSettings((s) => ({ ...s, region: e.target.value }))}
                    >
                      {["us-east-1", "eu-west-2", "ap-southeast-2"].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                    <I.chevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quota alert</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {settings.quota}%
                    </span>
                  </div>
                  <Slider
                    label="Quota alert"
                    value={settings.quota}
                    onChange={(quota) => setSettings((s) => ({ ...s, quota }))}
                  />
                  <p className="text-muted-foreground text-xs">
                    Drives the gauge and the sidebar meter.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
                  <h2 className="text-sm font-semibold">Deploys</h2>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Auto-deploy</p>
                      <p className="text-muted-foreground text-xs">On every push to main.</p>
                    </div>
                    <Switch
                      label="Auto-deploy"
                      checked={settings.autoDeploy}
                      onChange={(autoDeploy) => setSettings((s) => ({ ...s, autoDeploy }))}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Preview environments</p>
                      <p className="text-muted-foreground text-xs">One ephemeral per pull request.</p>
                    </div>
                    <Switch
                      label="Preview environments"
                      checked={settings.previews}
                      onChange={(previews) => setSettings((s) => ({ ...s, previews }))}
                    />
                  </div>
                </div>

                <div className="border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-5">
                  <h2 className="text-destructive text-sm font-semibold">Danger zone</h2>
                  <p className="text-muted-foreground text-sm">
                    Deleting a project removes every environment attached to it.
                  </p>
                  <Button variant="destructive" className="self-start" onClick={() => setConfirming(true)}>
                    <I.trash className="size-4" /> Delete project
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Anchored to the dashboard rather than the window: a toast that floated
          over the configurator's chrome would be showing the wrong palette. */}
      <div className="pointer-events-none absolute right-4 bottom-4 flex flex-col items-end gap-2">
        {selected.length > 0 && (
          <div className="bg-popover text-popover-foreground pointer-events-auto flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg">
            <span className="tabular-nums">{selected.length} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setToast(`Redeployed ${selected.length} service${selected.length === 1 ? "" : "s"}`);
                setSelected([]);
              }}
            >
              Redeploy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}
        {toast !== null && <Toast message={toast} icon={I.check} onDismiss={() => setToast(null)} />}
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${settings.name}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                setToast("Nothing was deleted — this is a preview");
              }}
            >
              Delete project
            </Button>
          </>
        }
      >
        This preview does not touch anything. The dialog is here because it is the only surface that
        shows <code className="font-mono">--popover</code> over a dimmed page.
      </Dialog>
    </div>
  );
}

/**
 * The deployments table: sortable, selectable, and filtered from above.
 *
 * A table is where a palette's quietest failure shows up — hover, selected and
 * striped are three near-identical surfaces, and a theme that renders them the
 * same makes a real table unusable without ever looking wrong in a screenshot.
 */
function DeploymentTable({
  icons,
  rows,
  sort,
  onSort,
  selected,
  onSelect,
  title,
  onSeeAll,
}: {
  icons: string;
  rows: readonly Row[];
  sort: { key: keyof Row; asc: boolean };
  onSort: (key: keyof Row) => void;
  selected: readonly string[];
  onSelect: (next: readonly string[]) => void;
  title: string;
  onSeeAll?: () => void;
}) {
  const I = iconSet(icons);
  const allShown = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const header = (key: keyof Row, label: string) => (
    <th className="px-4 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(key)}
        className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        {label}
        <I.chevronDown
          className={cn(
            "size-3 transition-transform",
            sort.key === key ? "opacity-100" : "opacity-0",
            sort.key === key && !sort.asc && "rotate-180",
          )}
        />
      </button>
    </th>
  );

  return (
    <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {onSeeAll !== undefined && (
          <Button variant="ghost" size="sm" onClick={onSeeAll}>
            See all <I.arrowRight className="size-3.5" />
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-y text-xs">
            <th className="w-9 py-2 pl-4">
              <Checkbox
                icon={I.check}
                ariaLabel="Select all"
                checked={allShown}
                onChange={(next) => onSelect(next ? rows.map((r) => r.id) : [])}
              />
            </th>
            {header("name", "Service")}
            {header("env", "Environment")}
            {header("status", "Status")}
            {header("minutes", "Deployed")}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selected.includes(row.id);
            return (
              <tr
                key={row.id}
                onClick={() =>
                  onSelect(
                    isSelected ? selected.filter((id) => id !== row.id) : [...selected, row.id],
                  )
                }
                className={cn(
                  "border-border cursor-pointer border-b transition-colors last:border-0",
                  isSelected ? "bg-accent/60" : "hover:bg-muted/60",
                )}
              >
                <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    icon={I.check}
                    ariaLabel={`Select ${row.name}`}
                    checked={isSelected}
                    onChange={(next) =>
                      onSelect(next ? [...selected, row.id] : selected.filter((id) => id !== row.id))
                    }
                  />
                </td>
                <td className="px-4 py-2.5 font-medium">{row.name}</td>
                <td className="text-muted-foreground px-4 py-2.5">{row.env}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                      BADGE[row.status],
                    )}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-2.5 tabular-nums">{ago(row.minutes)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center text-sm">
                Nothing matches that filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
