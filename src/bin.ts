#!/usr/bin/env node
/**
 * The `onboard` executable. Thin on purpose: argv in, exit code out, and one
 * place that turns a thrown error into a message rather than a stack trace.
 */
import { run } from "./cli.js";

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    process.stderr.write(`\x1b[31m✗\x1b[0m ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
