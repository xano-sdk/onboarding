/**
 * The configurator's own primitives.
 *
 * Hand-written rather than vendored from shadcn/ui, for one reason: this app
 * renders a PREVIEW of shadcn components a few pixels away from its own
 * chrome, and if both are the same components then a change to the preview's
 * tokens is impossible to attribute at a glance. Keeping the frame visually
 * quiet and structurally separate is what makes the preview readable.
 */
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        {
          default: "bg-primary text-primary-foreground hover:bg-primary/90",
          outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
          ghost: "hover:bg-accent hover:text-accent-foreground",
          secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        }[variant],
        { default: "h-9 px-4 py-2", sm: "h-8 px-3", lg: "h-11 px-6 text-base", icon: "size-9" }[size],
        className,
      )}
      {...props}
    />
  );
}

/**
 * A labelled block.
 *
 * `htmlFor` makes the label a real one. Most uses here wrap a group of controls
 * rather than a single field — a segmented radio row, a swatch grid — where a
 * `<label>` pointing at nothing in particular is worse than a heading. Pass it
 * whenever there IS one control to point at, which is what makes that control
 * reachable by name rather than by position.
 */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  const Label = htmlFor === undefined ? "span" : "label";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-sm font-medium" {...(htmlFor === undefined ? {} : { htmlFor })}>
          {label}
        </Label>
        {hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** A mutually-exclusive row of options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="bg-muted inline-flex w-full rounded-md p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            "flex-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
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

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  /** A control that belongs to this section rather than to the page. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b p-5 last:border-b-0">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wide uppercase opacity-60">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A modal for the configurator's own chrome.
 *
 * Distinct from the preview's dialog, and it has to be: that one is deliberately
 * a descendant of the themed pane so it wears the user's `--popover`. This one
 * belongs to the frame around it and wears the frame's palette, which is why it
 * can be a plain fixed overlay.
 *
 * It exists for module detail. A catalogue that grows past a screenful cannot
 * expand records in place — a card that grows pushes its neighbours around and
 * leaves a ragged grid — so the long-form content comes up over the list and
 * hands the grid back untouched when it closes.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className="bg-background relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
      >
        <div className="flex items-start gap-4 border-b p-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle !== undefined && <div className="mt-1">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-lg leading-none transition-colors"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
        {footer !== undefined && (
          <div className="flex items-center justify-end gap-2 border-t p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * The wash behind a brand screen.
 *
 * One light source, above the fold and off to one side, rather than a tint over
 * the whole page — the terminal is what these screens are lit by, and a
 * gradient band across everything would be atmosphere for its own sake. It sits
 * behind the content on `-z-10`, so the parent needs `relative isolate` or the
 * wash falls behind the page's own background and disappears.
 *
 * Horizontal insets are deliberately zero. A step's pane scrolls vertically,
 * and once one axis is not `visible` the other computes to `auto` — so a
 * gradient hanging off the left and right edges earns a horizontal scrollbar.
 */
export function BrandGlow() {
  return (
    <div
      aria-hidden
      className="xo-glow pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[34rem]"
    />
  );
}
