/**
 * The preview pane: one scroll through everything a theme has to survive.
 *
 * Sectioned rather than tabbed. A switcher would keep the pane short, but it
 * would also mean the chart ramp, the focus ring and the popover surface are
 * each one click away — and the whole failure mode this exists to prevent is
 * choosing a palette on the two components a starter page happens to show.
 * Scrolling past something is cheap; never being shown it is not.
 *
 * Everything below is styled with semantic classes only. Nothing picks a colour
 * directly, which is the same discipline the scaffold's own components follow,
 * so what this shows is what the generated project renders.
 *
 * And everything below WORKS. The dashboard navigates, the table sorts, the
 * forms take input, the charts answer the pointer. That is not polish for its
 * own sake: hover, focus-visible, checked, selected and disabled are half of
 * what a palette gets wrong, and none of them exist in a pane made of shapes.
 * The rule it does not break is the one above — anything that would otherwise
 * be hidden behind a click (the dropdown, the command palette, the focus ring,
 * the invalid field) is still rendered open, so you judge it whether or not you
 * think to go looking for it.
 */
import { Dashboard } from "@/components/preview/dashboard";
import { LineChart } from "@/components/preview/charts";
import { Components, CodeAndType } from "@/components/preview/components";
import { Forms } from "@/components/preview/forms";
import { PREVIEW_SCOPE } from "@/lib/preview-css";
import { cn } from "@/lib/utils";

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      {children}
    </section>
  );
}

export function Preview({
  icons,
  dark,
  appName,
  onToggleDark,
}: {
  icons: string;
  dark: boolean;
  appName: string;
  /** The pane's own theme switch, so the dashboard's header button is real. */
  onToggleDark: () => void;
}) {
  return (
    <div
      className={cn(
        PREVIEW_SCOPE,
        dark && "is-dark dark",
        "bg-background text-foreground flex flex-col gap-8 rounded-xl border p-4",
      )}
    >
      {/* The dashboard brings its own chrome (sidebar, header), so it sits
          outside the padded column the rest of the sections share. */}
      <Dashboard icons={icons} dark={dark} appName={appName} onToggleDark={onToggleDark} />

      <Group title="Charts" hint="the chart-1…5 ramp — hover either chart for a readout">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Two series</h3>
            <p className="text-muted-foreground text-xs">
              How far apart chart-1 and chart-3 actually sit. Hover for a month.
            </p>
            <div className="mt-3">
              <LineChart />
            </div>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Legibility</h3>
            <p className="text-muted-foreground text-xs">
              Each ramp colour as a fill, and as small text on muted.
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"].map((token, i) => (
                <div key={token} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "h-10 w-full rounded-md",
                      ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"][i],
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      ["text-chart-1", "text-chart-2", "text-chart-3", "text-chart-4", "text-chart-5"][i],
                    )}
                  >
                    {token}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Group>

      <Group title="Forms" hint="live controls — type in them, tab through them, drag the slider">
        <Forms icons={icons} />
      </Group>

      <Group title="Components" hint="working surfaces and states; overlays still rendered open">
        <Components icons={icons} />
      </Group>

      <Group title="Code and type" hint="the ramp as syntax colour, and the type scale">
        <CodeAndType icons={icons} />
      </Group>
    </div>
  );
}
