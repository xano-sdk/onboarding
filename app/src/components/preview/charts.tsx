/**
 * Charts, drawn as SVG straight from the `chart-1..5` tokens.
 *
 * These matter more to a theme preview than they look. The chart ramp is five
 * tokens nothing in a starter page ever renders, so it is the part of a palette
 * people discover last and are most often surprised by — several of shadcn's
 * bases give you a near-monochrome ramp, and several accents give you five
 * saturated hues. Side by side with the rest of the UI is the only place that
 * difference is legible.
 *
 * No charting library: `stroke="var(--chart-1)"` works in SVG exactly as it
 * does in CSS, so the scoped custom properties reach into these the same way
 * they reach a `bg-primary` div. A library would need its palette threaded in
 * by hand, which is a second place for the preview to disagree with the theme.
 *
 * Every series is fixed data. A preview that reshuffled on each render would
 * make it impossible to tell a palette change from a data change — so the
 * charts are interactive but never random: hovering moves a crosshair through
 * points that were already there. That hover is not a flourish. A tooltip is a
 * `--popover` surface floating over a `--chart-*` line, which is a pairing
 * nothing else on the page tests, and the crosshair is `--border` drawn over
 * a filled area.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Map values into an SVG viewBox, y inverted. */
function project(
  values: readonly number[],
  width: number,
  height: number,
  pad = 0,
): Array<[number, number]> {
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [
    pad + i * step,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
}

/** A Catmull-Rom-ish smooth path — cheaper than a spline, smooth enough here. */
function smoothPath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first![0]} ${first![1]}`;
  for (let i = 0; i < rest.length; i++) {
    const prev = points[i]!;
    const curr = rest[i]!;
    const cx = (prev[0] + curr[0]) / 2;
    d += ` C ${cx} ${prev[1]}, ${cx} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  return d;
}

export const REVENUE = [32, 41, 38, 52, 49, 63, 58, 71, 68, 82, 79, 94];
export const SESSIONS = [18, 26, 22, 31, 36, 34, 43, 41, 52, 48, 61, 66];
export const REQUESTS = [64, 58, 71, 66, 79, 74, 88, 81, 93, 86, 97, 91];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Which point the pointer is nearest, as a fraction of the element's width.
 *
 * Read from the bounding box rather than from SVG user units on purpose: these
 * charts stretch with `preserveAspectRatio="none"`, so an `offsetX` in viewBox
 * space would drift from the pixel the pointer is actually over.
 */
function useNearest(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setIndex(Math.round(ratio * (count - 1)));
  };
  return { index, onPointerMove, onPointerLeave: () => setIndex(null) };
}

/** The floating readout every chart shares. */
function ChartTip({
  x,
  title,
  rows,
}: {
  x: number;
  title: string;
  rows: ReadonlyArray<{ label: string; value: string; token: string }>;
}) {
  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 min-w-28 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
      // Clamped so the tip stays inside the card at either end of the series.
      style={{ left: `${Math.min(88, Math.max(12, x * 100))}%` }}
    >
      <p className="font-medium">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="mt-0.5 flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: row.token }} />
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto font-medium tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Area chart with a gradient fill — the shape most dashboards open with. */
export function AreaChart({
  values = REVENUE,
  token = "var(--chart-1)",
  label = "Revenue",
  format = (v: number) => `$${v}k`,
}: {
  values?: readonly number[];
  token?: string;
  label?: string;
  format?: (value: number) => string;
}) {
  const { index, onPointerMove, onPointerLeave } = useNearest(values.length);
  const pts = project(values, 300, 100, 4);
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]![0]} 100 L ${pts[0]![0]} 100 Z`;
  const active = index === null ? null : pts[index];
  // A gradient id per token, so two area charts in one pane cannot share a
  // <defs> and quietly paint the second one in the first one's colour.
  const gradient = `xo-area-${token.replace(/\W/g, "")}`;
  return (
    <div
      className="relative"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      role="img"
      aria-label={`${label} over ${values.length} months`}
    >
      <svg viewBox="0 0 300 100" className="h-32 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            {/* Stops read the token too, so the fade is in the theme's own hue. */}
            <stop offset="0%" stopColor={token} stopOpacity="0.45" />
            <stop offset="100%" stopColor={token} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke={token} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {active !== null && active !== undefined && (
          <g>
            <line
              x1={active[0]}
              y1="0"
              x2={active[0]}
              y2="100"
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={active[0]} cy={active[1]} r="3" fill={token} stroke="var(--background)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {index !== null && (
        <ChartTip
          x={index / (values.length - 1)}
          title={MONTHS[index % 12]!}
          rows={[{ label, value: format(values[index]!), token }]}
        />
      )}
    </div>
  );
}

/** Two series, to show how far apart chart-1 and chart-3 actually sit. */
export function LineChart() {
  const { index, onPointerMove, onPointerLeave } = useNearest(REVENUE.length);
  const ptsA = project(REVENUE, 300, 100, 4);
  const ptsB = project(SESSIONS, 300, 100, 4);
  return (
    <div
      className="relative"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      role="img"
      aria-label="Revenue against sessions"
    >
      <svg viewBox="0 0 300 100" className="h-32 w-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={smoothPath(ptsA)} fill="none" stroke="var(--chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path
          d={smoothPath(ptsB)}
          fill="none"
          stroke="var(--chart-3)"
          strokeWidth="2"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        {index !== null && (
          <g>
            <line x1={ptsA[index]![0]} y1="0" x2={ptsA[index]![0]} y2="100" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={ptsA[index]![0]} cy={ptsA[index]![1]} r="3" fill="var(--chart-1)" stroke="var(--background)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <circle cx={ptsB[index]![0]} cy={ptsB[index]![1]} r="3" fill="var(--chart-3)" stroke="var(--background)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {index !== null && (
        <ChartTip
          x={index / (REVENUE.length - 1)}
          title={MONTHS[index]!}
          rows={[
            { label: "Revenue", value: `$${REVENUE[index]!}k`, token: "var(--chart-1)" },
            { label: "Sessions", value: `${SESSIONS[index]!}k`, token: "var(--chart-3)" },
          ]}
        />
      )}
    </div>
  );
}

/** Grouped bars — two series per month, each column its own hover target. */
export function BarChart({ months = 12 }: { months?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const from = MONTHS.length - months;
  return (
    <div className="relative flex h-32 items-end gap-1.5" onPointerLeave={() => setHover(null)}>
      {MONTHS.slice(from).map((month, i) => {
        const index = from + i;
        return (
          <div
            key={month}
            onPointerEnter={() => setHover(index)}
            className="group flex h-full flex-1 cursor-default flex-col items-center gap-1"
          >
            <div
              className={cn(
                "flex w-full flex-1 items-end gap-0.5 rounded-t-sm transition-opacity",
                hover !== null && hover !== index && "opacity-40",
              )}
            >
              <div
                className="bg-chart-1 flex-1 rounded-t-sm"
                style={{ height: `${(REVENUE[index]! / 94) * 100}%` }}
              />
              <div
                className="bg-chart-4 flex-1 rounded-t-sm"
                style={{ height: `${(SESSIONS[index]! / 94) * 100}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[9px] transition-colors",
                hover === index ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {month.slice(0, 1)}
            </span>
          </div>
        );
      })}
      {hover !== null && (
        <ChartTip
          x={(hover - from + 0.5) / months}
          title={MONTHS[hover]!}
          rows={[
            { label: "Revenue", value: `$${REVENUE[hover]!}k`, token: "var(--chart-1)" },
            { label: "Sessions", value: `${SESSIONS[hover]!}k`, token: "var(--chart-4)" },
          ]}
        />
      )}
    </div>
  );
}

const SLICES = [
  { label: "Direct", value: 38, token: "var(--chart-1)" },
  { label: "Search", value: 26, token: "var(--chart-2)" },
  { label: "Social", value: 18, token: "var(--chart-3)" },
  { label: "Email", value: 12, token: "var(--chart-4)" },
  { label: "Other", value: 6, token: "var(--chart-5)" },
];

/**
 * A donut, drawn with stroke-dasharray on a single circle per slice.
 *
 * Arc paths would need trigonometry for five slices; a dashed circumference
 * needs one number each, and the ring reads identically.
 *
 * The ring and the legend hover as one control — pointing at either lifts the
 * slice and fills the hole with its label. That is the only way to tell two
 * adjacent ramp steps apart in a monochrome palette, which is exactly the case
 * a user needs to catch here rather than after scaffolding.
 */
export function DonutChart() {
  const [hover, setHover] = useState<number | null>(null);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const active = hover === null ? null : SLICES[hover]!;
  return (
    <div className="flex items-center gap-5">
      <div className="relative grid shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" className="size-28 -rotate-90" role="img" aria-label="Traffic by source">
          {SLICES.map((slice, i) => {
            const length = (slice.value / 100) * circumference;
            const el = (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.token}
                strokeWidth={hover === i ? 20 : 16}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                opacity={hover === null || hover === i ? 1 : 0.45}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                className="cursor-default transition-[stroke-width,opacity]"
              />
            );
            offset += length;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute text-center">
          <p className="text-lg font-semibold tabular-nums">{active?.value ?? 100}%</p>
          <p className="text-muted-foreground text-[10px]">{active?.label ?? "of traffic"}</p>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
        {SLICES.map((slice, i) => (
          <li key={slice.label}>
            <button
              type="button"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={cn(
                "hover:bg-accent flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                hover === i && "bg-accent",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.token }} />
              <span className="text-muted-foreground">{slice.label}</span>
              <span className="ml-auto tabular-nums">{slice.value}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A tiny inline trend line, for stat tiles. */
export function Sparkline({ values, token }: { values: readonly number[]; token: string }) {
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" preserveAspectRatio="none" role="img">
      <path
        d={smoothPath(project(values, 80, 24, 2))}
        fill="none"
        stroke={token}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export const SPARK_A = [4, 7, 5, 9, 8, 12, 11, 15];
export const SPARK_B = [12, 9, 11, 7, 8, 6, 7, 4];
export const SPARK_C = [6, 6, 8, 7, 10, 9, 12, 13];

/** A radial gauge — the other place a single accent colour has to carry a value. */
export function RadialGauge({ value = 72 }: { value?: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90" role="img" aria-label={`${value}%`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute text-lg font-semibold tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}
