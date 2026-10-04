/**
 * The loopback server that carries one answer from a browser back to a
 * terminal.
 *
 * Shaped after `xanosdk login`'s OAuth callback for the same reasons: bind to
 * 127.0.0.1 on an ephemeral port so nothing is reachable off the machine and no
 * fixed port can collide, hand the browser a URL, and resolve a promise when it
 * answers. Onboarding differs in one way — the browser is not returning from a
 * third party, it IS the app — so this also serves the built client.
 *
 * Three properties this has to hold, none of which are obvious:
 *
 * - It must never outlive the answer. A server left listening after a scaffold
 *   is a port held open on someone's machine for as long as their shell lives.
 * - It must not be reachable by a web page the user happens to have open. A
 *   site can POST to localhost, and the answer here starts an `npm install` in
 *   a directory of the caller's choosing. The token below is what stops that.
 * - It must serve the static app without becoming a general file server. Paths
 *   are resolved and then checked to be inside the app directory, so a request
 *   for `/../../.ssh/id_rsa` cannot escape.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { CreateResponse, OnboardConfig, OnboardState } from "./protocol.js";

/** Bodies are small — a config object — and anything larger is not one. */
const MAX_BODY_BYTES = 256 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export interface ServeOptions {
  /** Directory holding the built client (`dist/app`). */
  readonly appDir: string;
  /** What `GET /api/state` answers. */
  readonly state: OnboardState;
  /** Loopback port. 0 (the default) takes an ephemeral one. */
  readonly port?: number;
}

export interface ServeResult {
  /** The URL to open, token included. */
  readonly url: string;
  /** Resolves with the config the browser submitted; rejects if the user aborts. */
  readonly config: Promise<OnboardConfig>;
  /** Shut the server down. Safe to call more than once. */
  close(): Promise<void>;
}

/** Read a JSON body, bounded. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large.");
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    // The config carries a directory this process will write to. No page, from
    // any origin, gets to read or replay that.
    "cache-control": "no-store",
  });
  res.end(payload);
}

/**
 * Serve one file from the app directory.
 *
 * `normalize` then a prefix check, rather than trusting the URL: `..` segments
 * are resolved BEFORE the containment test, so a traversal attempt fails the
 * check instead of passing it as a literal path.
 */
function sendFile(res: ServerResponse, appDir: string, urlPath: string): void {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  const full = resolve(appDir, relative);
  if (full !== appDir && !full.startsWith(appDir + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  const target = existsSync(full) && statSync(full).isDirectory() ? join(full, "index.html") : full;
  if (!existsSync(target)) {
    // Single-page app: an unknown path is a client route, not a 404.
    const fallback = join(appDir, "index.html");
    if (!existsSync(fallback)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": CONTENT_TYPES[".html"]! });
    createReadStream(fallback).pipe(res);
    return;
  }
  res.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
  });
  createReadStream(target).pipe(res);
}

/**
 * Start the configurator server.
 *
 * The returned `config` promise is the whole point: the CLI awaits it, the
 * browser resolves it, and the terminal takes over from there.
 */
export async function serveConfigurator(opts: ServeOptions): Promise<ServeResult> {
  const appDir = resolve(opts.appDir);
  /**
   * A per-run secret, required on every `/api/*` request.
   *
   * Without it, any page in any tab could POST a config to this port while
   * onboarding is running and have a project scaffolded — and `npm install`
   * run — at a path of its choosing. The browser gets the token in the URL the
   * CLI opens; nothing else can guess it.
   */
  const token = randomUUID();

  let resolveConfig!: (config: OnboardConfig) => void;
  let rejectConfig!: (reason: Error) => void;
  const config = new Promise<OnboardConfig>((res, rej) => {
    resolveConfig = res;
    rejectConfig = rej;
  });

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/api/")) {
      sendFile(res, appDir, url.pathname);
      return;
    }
    // Constant-ish comparison is not the concern — the token is a v4 UUID and
    // the attacker cannot observe timing across origins anyway. What matters is
    // that it is checked at all, and on every API route.
    const provided = url.searchParams.get("token") ?? req.headers["x-onboard-token"];
    if (provided !== token) {
      sendJson(res, 403, { error: "Bad or missing token." });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      sendJson(res, 200, opts.state);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/create") {
      try {
        const body = (await readJson(req)) as OnboardConfig;
        const problem = validate(body);
        if (problem !== null) {
          sendJson(res, 400, { ok: false, directory: "", error: problem } satisfies CreateResponse);
          return;
        }
        // Answer BEFORE resolving, so the browser has its confirmation screen
        // even though the next thing the CLI does is close this server.
        sendJson(res, 200, {
          ok: true,
          directory: resolve(body.directory),
        } satisfies CreateResponse);
        res.on("finish", () => resolveConfig(body));
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          directory: "",
          error: err instanceof Error ? err.message : String(err),
        } satisfies CreateResponse);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/cancel") {
      sendJson(res, 200, { ok: true, directory: "" } satisfies CreateResponse);
      res.on("finish", () => rejectConfig(new Error("Cancelled in the browser.")));
      return;
    }
    sendJson(res, 404, { error: "Not found." });
  }

  await new Promise<void>((ready, fail) => {
    server.once("error", fail);
    // 127.0.0.1, never 0.0.0.0: this port accepts an instruction to write to
    // the filesystem, and it has no business being reachable from the network.
    server.listen(opts.port ?? 0, "127.0.0.1", ready);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not determine the onboarding server's port.");
  }

  return {
    url: `http://127.0.0.1:${address.port}/?token=${token}`,
    config,
    close: () =>
      new Promise<void>((done) => {
        server.close(() => done());
        // Anything still connected (the page itself) would otherwise hold the
        // process open after the answer has already arrived.
        server.closeAllConnections();
      }),
  };
}

/**
 * Check what the browser sent before acting on it.
 *
 * The client is trusted the way any client is: not at all. This body decides a
 * filesystem path to write to and a list of packages to `npm install`, so the
 * fields that carry those are the ones checked hardest.
 */
function validate(body: OnboardConfig): string | null {
  if (typeof body !== "object" || body === null) return "Expected a configuration object.";
  if (typeof body.directory !== "string" || body.directory.trim() === "") {
    return "Pick a project directory.";
  }
  if (typeof body.name !== "string" || body.name.trim() === "") return "Pick a project name.";
  if (body.framework !== "react" && body.framework !== "svelte") {
    return `Unknown framework "${String(body.framework)}".`;
  }
  if (!Array.isArray(body.modules)) return "Expected a list of modules.";
  for (const pkg of body.modules) {
    // The install argument. A value starting with `-` would be read by npm as a
    // flag, which is how "install this module" becomes "run npm with arbitrary
    // options" — the same guard the SDK's `marketplace install` carries.
    if (typeof pkg !== "string" || pkg.trim() === "" || pkg.startsWith("-")) {
      return `"${String(pkg)}" is not a valid package name.`;
    }
  }
  return null;
}
