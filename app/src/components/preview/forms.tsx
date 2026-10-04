/**
 * Form controls — the section that decides whether a theme is actually usable.
 *
 * Buttons look fine in almost any palette; it is `--input`, `--ring` and
 * `--muted-foreground` that break — a border you cannot see against the card, a
 * focus ring that disappears, placeholder text at the same lightness as real
 * text. So every control sits on a card rather than the page, which is the
 * harder background to be visible against.
 *
 * These are REAL controls: type in them, tab through them, drag the slider.
 * That is the point. A focus ring is a state you can only judge by putting
 * focus on something, and half of what a palette gets wrong — a checked
 * checkbox that vanishes, a caret you cannot find, a hover that does nothing —
 * is invisible in a screenshot of resting shapes.
 *
 * Two states stay pinned open rather than waiting to be discovered:
 *
 *   - The focused input renders its ring at rest. It is the state most likely
 *     to vanish in a low-contrast palette and the one nobody thinks to tab to.
 *   - The email field starts INVALID rather than empty, so `--destructive` on a
 *     tinted surface is on screen from the first frame. Fix the address and it
 *     clears, which is also how you see the valid state.
 */
import { useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Radio,
  Select,
  Slider,
  Switch,
  Textarea,
} from "@/components/preview/ui";
import { iconSet } from "@/lib/icons";
import { cn } from "@/lib/utils";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm leading-none font-medium">
      {children}
    </label>
  );
}

const ENVIRONMENTS = ["Production", "Staging", "Ephemeral"];

export function Forms({ icons }: { icons: string }) {
  const I = iconSet(icons);
  const [email, setEmail] = useState("not-an-email");
  const [project, setProject] = useState("acme-production");
  const [message, setMessage] = useState("");
  const [env, setEnv] = useState(ENVIRONMENTS[0]!);
  const [notify, setNotify] = useState({ finished: true, failed: true, digest: false });
  const [plan, setPlan] = useState("pro");
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [verbose, setVerbose] = useState(false);
  const [memory, setMemory] = useState(512);
  const [saved, setSaved] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email);
  const notifyCount = Object.values(notify).filter(Boolean).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Inputs</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="xo-email">Email</Label>
          <Input
            id="xo-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!emailValid}
            placeholder="you@example.com"
          />
          <p className={cn("text-xs", emailValid ? "text-muted-foreground" : "text-destructive")}>
            {emailValid ? "We’ll never share it." : "Enter a valid email address."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="xo-project">Focused</Label>
          {/* The ring pinned on at rest — see the note at the top of this file.
              Still a live input, so the hand-drawn ring and the real one land
              on the same element and any difference is immediately obvious. */}
          <Input
            id="xo-project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="border-ring ring-ring/50 ring-[3px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="xo-disabled">Disabled</Label>
          <Input id="xo-disabled" placeholder="Unavailable" disabled />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="xo-message">Message</Label>
            <span className="text-muted-foreground text-xs tabular-nums">{message.length}/280</span>
          </div>
          <Textarea
            id="xo-message"
            value={message}
            maxLength={280}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what happened…"
          />
        </div>
      </div>

      <div className="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Selection</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="xo-env">Environment</Label>
          <div className="relative">
            <Select id="xo-env" value={env} onChange={(e) => setEnv(e.target.value)}>
              {ENVIRONMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <I.chevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <Label>Notifications</Label>
            <span className="text-muted-foreground text-xs">{notifyCount} of 3 on</span>
          </div>
          {(
            [
              ["finished", "Deploy finished"],
              ["failed", "Deploy failed"],
              ["digest", "Weekly digest"],
            ] as const
          ).map(([key, label]) => (
            <Checkbox
              key={key}
              icon={I.check}
              label={label}
              checked={notify[key]}
              onChange={(next) => setNotify((n) => ({ ...n, [key]: next }))}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <Label>Plan</Label>
          {(
            [
              ["hobby", "Hobby"],
              ["pro", "Pro"],
            ] as const
          ).map(([value, label]) => (
            <Radio
              key={value}
              name="xo-plan"
              label={label}
              checked={plan === value}
              onChange={() => setPlan(value)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label>Auto-deploy</Label>
          <Switch checked={autoDeploy} onChange={setAutoDeploy} label="Auto-deploy" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label>Verbose logs</Label>
          <Switch checked={verbose} onChange={setVerbose} label="Verbose logs" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Memory</Label>
            <span className="text-muted-foreground text-xs tabular-nums">{memory} MB</span>
          </div>
          <Slider
            label="Memory"
            value={memory}
            min={128}
            max={2048}
            step={128}
            onChange={setMemory}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            {saved ? (
              <span className="text-primary inline-flex items-center gap-1">
                <I.check className="size-3.5" /> Saved to {env.toLowerCase()}
              </span>
            ) : (
              `${plan === "pro" ? "Pro" : "Hobby"} · ${memory} MB · ${autoDeploy ? "auto-deploy on" : "manual deploys"}`
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNotify({ finished: true, failed: true, digest: false });
                setPlan("pro");
                setAutoDeploy(true);
                setVerbose(false);
                setMemory(512);
                setSaved(false);
              }}
            >
              Reset
            </Button>
            <Button size="sm" disabled={!emailValid} onClick={() => setSaved(true)}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
