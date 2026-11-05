/**
 * What the wizard's "Create project" does, end to end: scaffold through the SDK with a marketplace module,
 * deploy what was scaffolded, and use it over HTTP. The project is created outside this repository so it
 * resolves the packages it installed itself.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { run as runXanoSdk } from "@xano/sdk/node";
import type { OnboardConfig } from "../../src/protocol.js";
import { createProject } from "../../src/scaffold.js";

const parent = mkdtempSync(join(tmpdir(), "onboard-e2e-"));
const directory = join(parent, "app");
const config: OnboardConfig = {
  directory,
  name: "onboard-e2e",
  framework: "react",
  theme: { kind: "preset", id: "stone-orange" },
  radius: "1rem",
  dark: "system",
  fonts: { sans: "inter", heading: "manrope" },
  icons: "lucide",
  agentsMd: true,
  modules: ["@xano-sdk/auth"],
};

afterAll(() => {
  const name = deployOutput ? (JSON.parse(deployOutput.slice(deployOutput.indexOf("{"))) as { engine?: { name?: string } }).engine?.name : undefined;
  if (name) spawnSync("npx", ["xanosdk", "local", "stop", name], { cwd: directory, stdio: "ignore" });
  rmSync(parent, { recursive: true, force: true });
});

let deployOutput = "";

describe("a scaffolded project", () => {
  it("installs the SDK and registers the module", async () => {
    await createProject(config, { step: () => {}, done: () => {}, warn: () => {} } as never, (argv) => runXanoSdk(argv) as Promise<unknown>);
    const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(expect.arrayContaining(["@xano/sdk", "@xano-sdk/auth"]));
    expect(readFileSync(join(directory, "xano/index.ts"), "utf8")).toContain("registerAuth");
  });

  it("deploys, and a person can sign up through it", async () => {
    const deployed = spawnSync("npx", ["xanosdk", "deploy", "--yes", "--json"], { cwd: directory, encoding: "utf8" });
    deployOutput = deployed.stdout;
    expect(deployed.status, deployed.stderr).toBe(0);
    const url = (JSON.parse(deployed.stdout.slice(deployed.stdout.indexOf("{"))) as { url: string }).url.replace(/\/+$/, "");
    const routes = spawnSync("npx", ["xanosdk", "routes", "xano/index.ts", "--json"], { cwd: directory, encoding: "utf8" });
    const path = /"path": "(\/api:[^"]+\/auth\/signup)"/.exec(routes.stdout)?.[1];
    expect(path, routes.stdout.slice(0, 400)).toBeTruthy();
    const res = await fetch(`${url}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", email: `ada-${Date.now()}@example.com`, password: "Correct-horse-9" }),
    });
    const body = (await res.json()) as { authToken?: string };
    expect(res.status).toBe(200);
    expect(typeof body.authToken).toBe("string");
  });
});
