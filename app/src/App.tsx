/**
 * The configurator.
 *
 * A short wizard rather than one dense page: an explainer, then styles, then
 * plugins, then review. The steps are independent and reversible, so the
 * sequence paces the reading rather than enforcing an order — any step you have
 * already seen is one click away in the header.
 *
 * Only the style step is split into two panes. There the preview IS the
 * feedback loop, and hiding it would make every control guesswork. The plugin
 * and review steps are prose someone has to actually read, so they get one
 * centred column and the full width of the window.
 *
 * State lives here and flows down. It is small enough that a reducer would be
 * ceremony, and keeping it in one object means the POST body is the state
 * rather than something assembled from six places at submit time.
 */
import { useEffect, useMemo, useState } from "react";
import { describeFonts } from "@xano/sdk/scaffold";
import type {
  CreateResponse,
  Framework,
  OnboardConfig,
  OnboardState,
} from "../../src/protocol.js";
import {
  Customizer,
  isCustomTheme,
  isEdited,
  themeOf,
  type CustomizerValue,
} from "@/components/customizer";
import { ModulePicker } from "@/components/modules";
import { Preview } from "@/components/preview";
import { Review } from "@/components/review";
import {
  FrameworkStep,
  STEPS,
  StepHeader,
  stepIndex,
  type StepId,
} from "@/components/steps";
import { BrandGlow, Segmented } from "@/components/ui";
import { toFontChoice } from "@/lib/fonts";
import { DEFAULT_PRESET, matchPreset } from "@/lib/presets";
import { previewCss, previewFontHref } from "@/lib/preview-css";

/** The token the CLI put in the URL. Every API call carries it. */
const TOKEN = new URLSearchParams(window.location.search).get("token") ?? "";

const api = (path: string) => `/api/${path}?token=${encodeURIComponent(TOKEN)}`;

export default function App() {
  const [state, setState] = useState<OnboardState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen, setScreen] = useState<StepId>("framework");
  const [name, setName] = useState("");
  const [directory, setDirectory] = useState("");
  /**
   * Whether the directory has been edited by hand.
   *
   * Until it has, it tracks the name — renaming the project on step one and
   * then finding it scaffolded into a directory named after the placeholder is
   * a surprise nobody wants at the last screen. Once someone sets a directory
   * deliberately, the name stops overwriting it.
   */
  const [directoryTouched, setDirectoryTouched] = useState(false);
  const [framework, setFramework] = useState<Framework>("react");
  const [agentsMd, setAgentsMd] = useState(true);
  const [modules, setModules] = useState<readonly string[]>([]);
  const [previewDark, setPreviewDark] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * The style, opening on a preset rather than on bare defaults.
   *
   * Somebody who never touches this step should still land on a project that
   * looks like it was designed — and if it is going to look like anything by
   * default, it should look like Xano. The preset supplies every visual axis;
   * `dark` is the one decision it does not own, because it is about behaviour.
   */
  const [style, setStyle] = useState<CustomizerValue>(() => ({
    ...DEFAULT_PRESET.style,
    fonts: { ...DEFAULT_PRESET.style.fonts },
    overrides: {
      light: { ...DEFAULT_PRESET.style.overrides.light },
      dark: { ...DEFAULT_PRESET.style.overrides.dark },
    },
    dark: "system",
  }));

  useEffect(() => {
    fetch(api("state"))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((s: OnboardState) => {
        setState(s);
        setName(s.suggestedName);
        setDirectory(s.suggestedName);
      })
      .catch(() => setLoadError("Could not reach the onboarding server. Is it still running?"));
  }, []);

  const updateName = (next: string) => {
    setName(next);
    if (!directoryTouched) setDirectory(next);
  };

  const theme = useMemo(() => themeOf(style), [style]);
  /**
   * The preset the style still matches, if any.
   *
   * Only used for naming. A preset carrying token overrides travels the custom
   * path like any other edited palette, and without this the README and the
   * review screen would call Xano Blue `Custom (zinc-blue)` — provenance
   * thrown away for a theme nobody actually hand-edited.
   */
  const preset = useMemo(() => matchPreset(style), [style]);
  const themeLabel = preset === null ? theme.label : preset.label;

  // The preview's tokens ride on a scoped <style> rather than :root — see
  // lib/preview-css.ts for why that is the only way this pane can be honest
  // without repainting the controls beside it.
  const css = useMemo(
    () => previewCss(theme, style.fonts, style.radius),
    [theme, style.fonts, style.radius],
  );
  const fontHref = useMemo(() => previewFontHref(style.fonts), [style.fonts]);

  const config: OnboardConfig = {
    directory,
    name,
    framework,
    theme: isCustomTheme(style)
      ? {
          kind: "custom",
          // The composed name, not the raw ids: "Custom (Xano Green)" is what
          // the generated README and agent brief will carry, and it is the only
          // provenance a token-map theme gets to keep.
          label: preset === null ? `Custom (${theme.label})` : preset.label,
          light: theme.light as Record<string, string>,
          dark: theme.dark as Record<string, string>,
        }
      : { kind: "preset", id: style.accent === null ? style.base : `${style.base}-${style.accent}` },
    radius: style.radius,
    dark: style.dark,
    fonts: style.fonts,
    icons: style.icons,
    agentsMd,
    modules,
  };

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(api("create"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const body: CreateResponse = await res.json();
      if (!body.ok) {
        setSubmitError(body.error ?? "The server rejected that configuration.");
        setSubmitting(false);
        return;
      }
      setDone(body.directory);
    } catch {
      setSubmitError("Could not reach the onboarding server.");
      setSubmitting(false);
    }
  }

  if (loadError !== null) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold">{loadError}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Close this tab and run <code className="font-mono">npx @xano-sdk/onboard</code> again.
          </p>
        </div>
      </main>
    );
  }

  if (done !== null) {
    return (
      <main className="grid min-h-screen place-items-center p-8">
        <div className="max-w-lg text-center">
          <div className="bg-primary text-primary-foreground mx-auto grid size-12 place-items-center rounded-full text-xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Back to your terminal</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Scaffolding <span className="font-mono">{name}</span> into
          </p>
          <p className="bg-muted mt-2 rounded-md px-3 py-2 font-mono text-xs break-all">{done}</p>
          <p className="text-muted-foreground mt-4 text-sm">You can close this tab.</p>
        </div>
      </main>
    );
  }

  if (state === null) {
    return (
      <main className="text-muted-foreground grid min-h-screen place-items-center text-sm">
        Loading…
      </main>
    );
  }

  const index = stepIndex(screen);
  // The first step is the beginning now; the header disables Back there.
  const goBack = () => index > 0 && setScreen(STEPS[index - 1]!.id);
  const goNext = () => {
    if (index < STEPS.length - 1) setScreen(STEPS[index + 1]!.id);
    else void submit();
  };
  const nextLabel =
    screen === "review" ? (submitting ? "Creating…" : "Create project") : "Continue";

  return (
    <>
      <style>{css}</style>
      {/* Preview-only: the scaffold self-hosts its fonts from @fontsource. */}
      {fontHref !== null && <link rel="stylesheet" href={fontHref} />}

      {/*
        Exactly one viewport tall, and it never grows.

        `h-dvh` rather than `h-screen` so a mobile browser's collapsing toolbar
        does not leave a strip of page below the fold, and `overflow-hidden` so
        the document itself can never scroll: every pane below scrolls inside
        its own box. That last part is not belt-and-braces — an element that
        escapes its scroll container (an absolutely-positioned child with no
        positioned ancestor, say) silently extends the DOCUMENT instead, and the
        symptom is a screenful of empty space under the app and a page that
        jumps when something down the pane takes focus.
      */}
      <div className="flex h-dvh flex-col overflow-hidden">
        <StepHeader
          current={screen}
          onGoTo={setScreen}
          onBack={goBack}
          onNext={goNext}
          nextLabel={nextLabel}
          nextDisabled={
            submitting ||
            (screen === "framework" && name.trim() === "") ||
            (screen === "review" && directory.trim() === "")
          }
        >
          {screen === "style" && (
            <div className="hidden w-36 sm:block">
              <Segmented
                value={previewDark ? "dark" : "light"}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
                onChange={(v) => setPreviewDark(v === "dark")}
              />
            </div>
          )}
        </StepHeader>

        {screen === "framework" && (
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
            <FrameworkStep
              value={framework}
              onChange={setFramework}
              name={name}
              onName={updateName}
              cwd={state.cwd}
            />
          </div>
        )}

        {screen === "style" && (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="scroll-slim flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-r lg:w-96">
              <Customizer
                value={style}
                onChange={setStyle}
                previewDark={previewDark}
                onPreviewDark={setPreviewDark}
              />

              <p className="text-muted-foreground border-t p-5 text-xs">
                {describeFonts(toFontChoice(style.fonts))} · {style.icons} icons ·{" "}
                {isEdited(style) && preset === null ? "edited palette" : themeLabel}
              </p>
            </aside>

            <div className="scroll-slim flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-6">
              <div>
                <h1 className="text-sm font-semibold">Preview</h1>
                <p className="text-muted-foreground text-xs">
                  Rendered from the tokens your project will ship — including the chart ramp and
                  sidebar colours nothing in a starter page normally shows. It is a working app,
                  not a screenshot: click through it, type in it, sort the table. Hover and focus
                  states are half of what a palette gets wrong.
                </p>
              </div>
              <Preview
                icons={style.icons}
                dark={previewDark}
                appName={name}
                onToggleDark={() => setPreviewDark((d) => !d)}
              />
            </div>
          </div>
        )}

        {screen === "plugins" && (
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
            <div className="xo-brand xo-rise relative isolate mx-auto flex w-full max-w-6xl flex-col gap-6">
              <BrandGlow />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Configure plugins</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Prebuilt backend modules. Whatever you pick is installed and registered in{" "}
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono">xano/index.ts</code>{" "}
                  for you. All optional — you can add more later with{" "}
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                    xanosdk marketplace install
                  </code>
                  .
                </p>
              </div>
              <ModulePicker
                catalogue={state.catalogue}
                icons={style.icons}
                error={state.catalogueError}
                selected={modules}
                onToggle={(pkg) =>
                  setModules((current) =>
                    current.includes(pkg) ? current.filter((m) => m !== pkg) : [...current, pkg],
                  )
                }
              />
            </div>
          </div>
        )}

        {screen === "review" && (
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
            <Review
              config={config}
              cwd={state.cwd}
              themeLabel={themeLabel}
              fontsLabel={describeFonts(toFontChoice(style.fonts))}
              selectedModules={state.catalogue.filter((e) => modules.includes(e.npmPackage))}
              onDirectory={(value) => {
                setDirectoryTouched(true);
                setDirectory(value);
              }}
              onName={updateName}
              onAgentsMd={setAgentsMd}
            />
            {submitError !== null && (
              <p className="text-destructive mx-auto mt-4 max-w-3xl text-sm">{submitError}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
