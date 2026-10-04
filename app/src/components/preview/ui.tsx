/**
 * The preview's own component kit — the real, interactive versions.
 *
 * The pane used to be built from `<span>`s dressed as controls. That was enough
 * to judge a resting colour and nothing else, and it hid the states a theme is
 * most often wrong about: hover, active, focus-visible, checked, disabled. You
 * cannot hover a shape you cannot reach, and you cannot tab to a `<span>`.
 *
 * So everything here is the real element — `<button>`, `<input>`, a slider you
 * can drag and arrow-key — and every state is a variant of the same semantic
 * classes the scaffold's own shadcn components carry. Nothing picks a colour
 * directly. What you click here is what the generated project renders.
 *
 * The primitives are deliberately small and local rather than vendored from
 * shadcn/ui: the configurator's own chrome (`components/ui.tsx`) is a separate
 * kit on purpose, so that a token change repaints the preview and leaves the
 * controls beside it alone. Two kits, one discipline.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** The focus ring every control shares, so one token failure shows everywhere. */
const RING =
  "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"button"> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
        RING,
        {
          default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
          secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          outline: "bg-background hover:bg-accent hover:text-accent-foreground border shadow-xs",
          ghost: "hover:bg-accent hover:text-accent-foreground",
          destructive: "bg-destructive text-white hover:bg-destructive/90",
          link: "text-primary underline underline-offset-4 hover:no-underline",
        }[variant],
        { default: "h-9 px-4", sm: "h-8 px-3 text-xs", icon: "size-9" }[size],
        className,
      )}
      {...props}
    />
  );
}

export const INPUT_CLASS =
  "border-input bg-background placeholder:text-muted-foreground h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(INPUT_CLASS, RING, "aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(INPUT_CLASS, RING, "h-20 resize-none py-2", className)} {...props} />;
}

/** A native select, styled. The one control every platform already does well. */
export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select"> & { children: ReactNode }) {
  return (
    <select
      className={cn(INPUT_CLASS, RING, "cursor-pointer appearance-none pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * A checkbox and a radio, built on the native input with `appearance-none`.
 *
 * NOT a visually-hidden input behind a styled `<span>`, which is the usual
 * recipe and was an outright bug here. `sr-only` is `position: absolute`, and
 * an absolutely-positioned element with no positioned ancestor resolves against
 * the INITIAL containing block — the document — rather than against the pane it
 * appears in. Two things follow, and this pane suffered both: the input joins
 * the document's scrollable overflow at whatever coordinate its static position
 * lands on, so the page grows a screenful of dead space below the app; and
 * clicking the label moves focus to it, so the browser scrolls the document
 * down to reveal something one pixel wide and the whole configurator jumps.
 *
 * Styling the real input avoids the entire class of problem: nothing leaves the
 * flow. The mark on top is stacked with grid rather than absolute positioning,
 * for the same reason — one grid cell, two children, no containing block to
 * reason about.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  ariaLabel,
  icon: Check,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visible text. Omit for a bare box, and pass `ariaLabel` instead. */
  label?: ReactNode;
  ariaLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <span className="grid shrink-0">
        <input
          type="checkbox"
          checked={checked}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            "peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-[4px] border transition-colors",
            "border-input group-hover:border-ring checked:bg-primary checked:border-primary",
            RING,
          )}
        />
        <Check className="text-primary-foreground pointer-events-none col-start-1 row-start-1 size-4 scale-75 opacity-0 peer-checked:opacity-100" />
      </span>
      {label !== undefined && <span className="text-sm select-none">{label}</span>}
    </label>
  );
}

export function Radio({
  checked,
  onChange,
  label,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  name: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <span className="grid shrink-0 place-items-center">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className={cn(
            "peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-full border transition-colors",
            "border-input group-hover:border-ring checked:border-primary",
            RING,
          )}
        />
        <span className="bg-primary pointer-events-none col-start-1 row-start-1 size-2 place-self-center rounded-full opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="text-sm select-none">{label}</span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
        RING,
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "bg-background size-4 rounded-full shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

/**
 * A slider you can actually drag.
 *
 * Hand-built rather than a styled `<input type="range">`: theming a native
 * range means one block of vendor pseudo-elements per browser, and the track
 * and thumb are exactly the two surfaces this pane exists to show. A div pair
 * wears `--primary`, `--muted` and the focus ring like everything else.
 *
 * Keyboard support is not decoration here — the arrow keys are how you reach
 * the focus ring on a control that has no text cursor.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;

  const fromClientX = useCallback(
    (clientX: number) => {
      const box = track.current?.getBoundingClientRect();
      if (box === undefined || box.width === 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      onChange(Math.round((min + ratio * (max - min)) / step) * step);
    },
    [max, min, onChange, step],
  );

  // Bound to the window, not the thumb: a drag that leaves the track still
  // tracks the pointer, which is the behaviour every real slider has.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => fromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, fromClientX]);

  return (
    <div
      ref={track}
      onPointerDown={(e) => {
        setDragging(true);
        fromClientX(e.clientX);
      }}
      className="relative flex h-4 w-full cursor-pointer touch-none items-center"
    >
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onKeyDown={(e) => {
          const delta =
            { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[e.key] ?? 0;
          if (delta === 0) return;
          e.preventDefault();
          onChange(Math.min(max, Math.max(min, value + delta)));
        }}
        style={{ left: `${pct}%` }}
        className={cn(
          "border-primary bg-background absolute size-4 -translate-x-1/2 cursor-grab rounded-full border-2 shadow-sm transition-shadow",
          RING,
          dragging && "cursor-grabbing",
        )}
      />
    </div>
  );
}

/**
 * A tooltip that appears on hover AND on focus, and opens DOWNWARD.
 *
 * The gallery still renders one tooltip permanently open — a surface you have
 * to find is a surface most people never judge — but a tooltip nobody can
 * summon is not a tooltip. This is both: discoverable there, real here.
 *
 * Downward is not a style preference. The tooltip's most important trigger is
 * the theme button in the dashboard header, which sits a few pixels below the
 * top edge of a card with `overflow-hidden` on it; a tooltip opening up was
 * sliced in half by that edge and by the step header above it. Below the
 * trigger there is always the rest of the panel to open into, and every
 * trigger in this pane sits nearer its container's top than its bottom.
 *
 * A caret ties the bubble to the control it belongs to, which matters more
 * downward: above a button the gap reads as "attached", below it reads as a
 * floating label unless something points back.
 */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2"
        >
          <span
            aria-hidden
            className="bg-primary absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[2px]"
          />
          <span className="bg-primary text-primary-foreground relative block rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md">
            {label}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * A modal, rendered in place rather than through a portal.
 *
 * Deliberate: the preview's tokens live on a scoped `.xo-preview` selector, so
 * a portal to `document.body` would render the one component whose whole job is
 * to show `--popover` against an overlay in the CONFIGURATOR's palette. Custom
 * properties inherit down the DOM, not up the stacking context, so staying a
 * descendant is what keeps a fixed-position dialog wearing the right colours.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="bg-popover text-popover-foreground relative w-full max-w-sm rounded-xl border p-5 shadow-lg"
      >
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <div className="text-muted-foreground mt-2 text-sm">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

/**
 * A transient message, anchored to the bottom of whatever card raised it.
 *
 * Auto-dismissing, because the alternative is a preview that fills up with
 * toasts as you play with it — but slow enough to read, and dismissible.
 */
export function Toast({
  message,
  onDismiss,
  icon: Icon,
}: {
  message: string;
  onDismiss: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <div
      role="status"
      className="bg-popover text-popover-foreground pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm shadow-lg"
    >
      <Icon className="text-primary size-4 shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground -mr-1 ml-2 cursor-pointer rounded-sm"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}

/** A row of mutually-exclusive buttons. The preview's own segmented control. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("bg-muted inline-flex rounded-md p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 cursor-pointer rounded-[5px] px-3 py-1 text-center text-xs font-medium transition-colors",
            RING,
            option.value === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
