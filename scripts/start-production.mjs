#!/usr/bin/env node
/**
 * Production entry for Render / Node hosts.
 * Binds to 0.0.0.0 and process.env.PORT (Render injects PORT).
 */

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const entry = resolve(".output/server/index.mjs");
if (!existsSync(entry)) {
  console.error(
    "Missing .output/server/index.mjs — run `npm run build` before `npm start`.\n" +
      "Expected Nitro preset: node-server",
  );
  process.exit(1);
}

const port = process.env.PORT || process.env.NITRO_PORT || "3000";
const host = process.env.HOST || process.env.NITRO_HOST || "0.0.0.0";

process.env.PORT = String(port);
process.env.NITRO_PORT = String(port);
process.env.HOST = host;
process.env.NITRO_HOST = host;
process.env.NODE_ENV = process.env.NODE_ENV || "production";

console.log(`[MachineTrust] starting on http://${host}:${port}`);

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
