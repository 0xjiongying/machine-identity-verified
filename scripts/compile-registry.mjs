#!/usr/bin/env node
/**
 * MachineTrustRegistry compile + test.
 * Prefers Foundry `forge`; falls back to presence check without failing soft CI.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");
const file = resolve("contracts/MachineTrustRegistry.sol");

if (!existsSync(file)) {
  console.error("FAIL: contracts/MachineTrustRegistry.sol missing");
  process.exit(1);
}

const src = readFileSync(file, "utf8");
if (!src.includes("contract MachineTrustRegistry")) {
  console.error("FAIL: MachineTrustRegistry contract declaration not found");
  process.exit(1);
}

const forge = spawnSync("forge", ["--version"], { encoding: "utf8" });
if (forge.status === 0) {
  const build = spawnSync("forge", ["build"], { encoding: "utf8", stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
  const test = spawnSync("forge", ["test"], { encoding: "utf8", stdio: "inherit" });
  process.exit(test.status ?? 1);
}

console.log("WARN: Foundry `forge` not installed — syntax presence check only.");
console.log("PASS: MachineTrustRegistry.sol present (install Foundry to compile + test).");
if (strict) process.exit(1);
process.exit(0);
