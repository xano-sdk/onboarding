# @xano-sdk/onboard

Visual onboarding for [Xano SDK](https://www.npmjs.com/package/@xano/sdk). Pick
your framework, theme, fonts, icons and backend modules in a browser; get the
scaffolded project back in your terminal.

```bash
npx @xano-sdk/onboard my-app
```

It opens a local page, waits for one answer, and finishes in the shell you ran
it from.

## What it is not

It is **not** a second scaffolder. Everything it can produce, `xanosdk init` can
produce from flags — and onboarding prints the equivalent command when it is
done:

```
The same project, from flags:
  npx xanosdk init my-app --framework react --theme mist-teal --radius 1rem \
    --dark toggle --icons tabler --font geist --font-heading instrument-serif
```

That constraint is deliberate. A configuration you cannot express as a command
is one you cannot put in a script, a README, or a bug report. The browser is a
nicer way to arrive at those flags, not a different way to build a project.

`xanosdk init` keeps working exactly as it did, prompts included.

## How it works

```
npx @xano-sdk/onboard
  │
  ├─ fetch the module catalogue          (public, unauthenticated)
  ├─ start a loopback server on 127.0.0.1:<ephemeral>
  ├─ open the browser at /?token=<per-run secret>
  │     …you configure…
  ├─ POST /api/create  →  server closes
  └─ run(["init", …, "--marketplace", "@xano-sdk/auth,…"])   via @xano/sdk/node
```

The scaffold itself comes from the SDK's own CLI dispatcher, so everything
`init` guarantees — the lock file, the `AGENTS.md` brief, the contract between
`xano/` and `frontend/` — holds here without being reimplemented, and a change
to `init` reaches onboarding with no release of onboarding.

The theme travels the same way. `xanosdk init --theme` accepts a path to a
[shadcn registry item](https://ui.shadcn.com/schema/registry-item.json), so a
palette edited token-by-token in the browser needs no new SDK surface: it is
written to a temp file and passed by path. A preset pair (`zinc-blue`) is
forwarded by NAME instead, so the generated README and agent brief can record
which theme you picked.

### Style presets

The style step opens on six finished looks rather than on an empty grid —
**Xano Blue** (the default), Graphite, Terracotta, Meadow, Orchid and Lagoon.
Each one sets the palette, the corner radius, the typeface pairing and the icon
set together, so one click lands on something coherent; every control below
stays live, and changing anything simply puts you on your own palette.

Xano is a **base colour** in that step, sitting alongside shadcn's seven: its
own brand palette (`#0b5aff` on blue-tinted paper, navy in the dark), and an
accent composes over it exactly as it does over `stone` or `mist`. The base
swatches show each base carrying your current accent, in whichever mode the
light/dark switch above them is set to — shadcn's bases are a few thousandths
of chroma apart in light and clearly different in dark, so that switch is part
of the chooser rather than a preview convenience.

Five of the six presets name one of the SDK's own base×accent pairs and travel
to the CLI by name, so the generated README still records which theme you
picked. Xano Blue is on a base the SDK has never heard of, so it travels as a
token map instead. The table lives in
[`app/src/lib/presets.ts`](app/src/lib/presets.ts), the composition in
[`app/src/lib/theme.ts`](app/src/lib/theme.ts).

### One session, running through the wizard

Three of the four steps share a surface: Xano's own palette, the mono voice of
the terminal you launched this from, and a terminal that follows you and grows
as you go — the command starts on step one, gains an install line as you pick
modules, and is the whole sequence about to run by the time you reach Review.
Everything it shows is built by [`src/init-args.ts`](src/init-args.ts), the one
module both halves import, so the command on screen and the command the CLI
runs cannot drift.

The style step is deliberately exempt. The chrome there is plain because it
frames a preview of someone else's theme, and a frame with opinions competes
with the thing being judged — but that argument only ever applied to the screen
with a preview on it. The other three have nothing to compete with.

There is no webfont anywhere. This page is served from a loopback port with no
network guarantee, which is also why the framework logos are inlined.

### The plugins step is a marketplace

Modules come from `GET /api:marketplace/plugins`, never from a list baked into
this package — one published tomorrow appears without a release of onboarding.
That is also why the step is built for a catalogue far larger than today's:
cards three to a row rather than full-width rows, search across everything a
module says about itself (not just its title), tag filters derived from the
catalogue itself, a pinned record of what you have picked, and long-form detail
in a modal so a card never expands and tears a hole in the grid.

### The preview is a working app

The right-hand pane of the style step is not a screenshot. The dashboard
navigates, the table sorts and selects, the forms take input, the charts answer
the pointer, and the header's theme switch flips the pane between light and
dark. That is deliberate: hover, focus-visible, checked, selected and disabled
are half of what a palette gets wrong, and none of them exist in a page made of
`<span>`s.

The rule it keeps is that nothing you would otherwise never see is hidden behind
a click — the dropdown and the command palette render open, the focus ring is
pinned on one input, and the email field starts invalid — so a state you did not
think to go looking for is still on screen. Nothing in the pane leaves the
browser; "deploying" is a timer.

### Security

The server binds to `127.0.0.1` only, and every `/api/*` request carries a
per-run UUID that the CLI puts in the URL it opens. Without it, any page in any
tab could POST a config to that port while onboarding is running and have a
project scaffolded — and `npm install` run — at a path of its choosing. Static
file paths are resolved and then checked to be inside the app directory, so a
request cannot escape it. The server is shut down before any scaffolding begins.

## Development

```bash
npm install
npm run build          # client into dist/app, CLI into dist/
npm test
npm run dev            # UI with hot reload…
npm run dev:cli -- --port 7777 --no-open   # …and the API it proxies to
```

The client lives in `app/`, the Node half in `src/`, and `src/protocol.ts` is
the wire contract both import — so a drift between them is a compile error
rather than a runtime surprise.

## Working against a local SDK

`@xano/sdk` is a published range in `package.json`. To develop against a
checkout instead, link it rather than editing the manifest — an absolute
`file:` path committed to the repo breaks the install for everyone else:

```bash
npm install --no-save /path/to/sdk
```

## Modules are the CLI's job

Onboarding does not install or wire modules. `xanosdk init --marketplace <a,b>`
installs each package and registers it in `xano/index.ts`. A module declares how
it registers in its own `package.json`:

```json
"xanosdk": { "register": "registerAuth", "returns": "workspace", "options": {} }
```

and the CLI reads that off the installed package. `options` lists what the
register call's second argument needs: a literal (`{ "value": ... }`) or another
package's export (`{ "package": ..., "export": ... }`). A module with no
`xanosdk` field is read for a single `register*` export instead.

Registration mutates the workspace, so the generated file calls each module as a
statement and exports the workspace; nothing is chained.

What stays here is the one thing the CLI cannot know: the catalogue's
`requirements` — the API keys and accounts a module needs before it will
deploy. Those describe the world outside the project, so they are not in the
package. They are listed on the review screen and again when the scaffold
finishes.

## Adding a module to the picker

Nothing here. The picker renders whatever
`GET /api:marketplace/plugins` returns, so a newly published module appears
without a release of this package. Point it at a different catalogue with
`XANOSDK_MARKETPLACE_URL`, the same variable the SDK's `marketplace` commands
read.

## License

MIT
