/**
 * The programmatic surface, for tests and for anything embedding onboarding.
 * The CLI is the supported entry point; these are the pieces it is built from.
 */
export { run, parseArgs, equivalentCommand } from "./cli.js";
export { fetchCatalogue } from "./catalogue.js";
export { serveConfigurator } from "./server.js";
export { createProject, collectRequirements, initArgs } from "./scaffold.js";
export type * from "./protocol.js";
