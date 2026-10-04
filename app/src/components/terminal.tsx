/**
 * The session that opened this tab, and the thread running through the wizard.
 *
 * Not a decoration repeated for consistency. You reached this page by typing
 * `npx @xano-sdk/onboard` into a shell, and you will be back in that shell when
 * it closes — so the terminal is the one object on screen that belongs to both
 * ends of the trip, and it grows as you move:
 *
 *   step 1  the command starts:  `xanosdk init my-app --framework react`
 *   step 3  the install line appears as you pick modules
 *   step 4  the whole sequence, exactly what is about to run
 *
 * Everything it renders is REAL — the argv comes from `initArgs`, the one
 * module both halves import, so what is shown here and what the CLI runs cannot
 * drift. That is the same promise the README makes ("a nicer way to arrive at
 * those flags, not a different way to build a project"), kept on screen instead
 * of in prose.
 *
 * It is a picture of a terminal. Nothing here executes, and nothing here is a
 * text field.
 *
 * Dark in both themes, because a terminal is. In light mode it is the one dark
 * object on the page, which is what gives that half of the layout its weight.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Terminal({
  title,
  live = false,
  children,
  className,
}: {
  /**
   * The title bar's text, verbatim.
   *
   * Not assembled here: two of the three callers are a shell sitting in a
   * working directory and want `~/path — zsh`, and the third is a running
   * tally of what you have picked. A component that appended "— zsh" to
   * whatever it was given made the third one lie.
   */
  title: string;
  /** Whether the session is still running — the configurator is, the recap is not. */
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("xo-term flex flex-col overflow-hidden rounded-xl border shadow-2xl", className)}>
      {/* No traffic lights. Three coloured dots are the one thing every mocked
          code window has, and the strip reads as a terminal without them — it
          is carrying a real working directory. */}
      <div className="xo-term-bar flex items-center gap-3 border-b px-3.5 py-2">
        <span
          className="min-w-0 flex-1 truncate font-mono text-[11px]"
          style={{ color: "var(--xo-term-dim)" }}
          title={title}
        >
          {title}
        </span>
        {live && (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-wide uppercase"
            style={{ color: "var(--xo-live)" }}
          >
            <span className="size-1.5 rounded-full" style={{ background: "var(--xo-live)" }} />
            live
          </span>
        )}
      </div>
      <div className="scroll-slim min-h-0 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/** A line the user typed. The `$` is not selectable text you would paste back. */
export function Cmd({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap">
      <span style={{ color: "var(--xo-brand-soft)" }} aria-hidden>
        ${" "}
      </span>
      {children}
    </p>
  );
}

/** A continuation line — a wrapped command's second and later rows. */
export function Cont({ children }: { children: ReactNode }) {
  return <p className="whitespace-pre-wrap pl-4 -indent-4 sm:pl-6 sm:-indent-6">{children}</p>;
}

/** Output the machine wrote back. `tone` is what kind. */
export function Out({
  tone = "dim",
  children,
}: {
  tone?: "dim" | "ok" | "comment";
  children: ReactNode;
}) {
  const color = tone === "ok" ? "var(--xo-live)" : "var(--xo-term-dim)";
  return (
    <p className="whitespace-pre-wrap" style={{ color: "var(--xo-term-dim)" }}>
      {tone === "ok" && (
        <span style={{ color }} aria-hidden>
          ✓{" "}
        </span>
      )}
      {tone === "comment" && <span aria-hidden># </span>}
      {children}
    </p>
  );
}

/** The part of a line that changed because of something you just did. */
export function Live({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--xo-live)" }}>{children}</span>;
}

/** A blinking block cursor. Only where the session is genuinely still waiting. */
export function Caret() {
  return (
    <p>
      <span className="xo-caret" aria-hidden />
    </p>
  );
}
