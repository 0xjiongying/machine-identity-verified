#!/usr/bin/env node
/**
 * Lightweight security / production contract smoke checks (no network secrets).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// .env.example must be placeholders only
const envExample = read(".env.example");
assert.match(envExample, /CLEANVERSE_SANDBOX_API_ID=\s*$/m);
assert.match(envExample, /CLEANVERSE_SANDBOX_API_KEY=\s*$/m);
assert.match(envExample, /MONAD_TESTNET_PRIVATE_KEY=\s*$/m);
assert.doesNotMatch(envExample, /VITE_.*(?:KEY|SECRET|PASSWORD)/i);
// Placeholder lines must stay empty — no non-empty secret assignments.
for (const line of envExample.split("\n")) {
  if (/^\s*#/.test(line) || !line.trim()) continue;
  assert.doesNotMatch(
    line,
    /^(?:CLEANVERSE_SANDBOX_API_(?:ID|KEY)|MONAD_TESTNET_PRIVATE_KEY|DATABASE_URL)=.+$/,
  );
}

// Secrets must not be committed
const tracked = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
assert.match(tracked, /\.env/);
assert.match(tracked, /\*\.local/);

// Production bind contract
const start = read("scripts/start-production.mjs");
assert.match(start, /process\.env\.PORT/);
assert.match(start, /0\.0\.0\.0/);

// Health route exists and returns status ok shape in source
const health = read("src/routes/health.ts");
assert.match(health, /status:\s*"ok"/);
assert.doesNotMatch(health, /PRIVATE_KEY|SANDBOX_API_KEY|apiKey/);

// No wildcard CORS in start middleware
const startTs = read("src/start.ts");
assert.match(startTs, /FRONTEND_URL|isAllowedFrontendOrigin/);
assert.doesNotMatch(startTs, /Access-Control-Allow-Origin['"`]\s*,\s*['"`]\*/);

console.log("PASS  security smoke checks");
