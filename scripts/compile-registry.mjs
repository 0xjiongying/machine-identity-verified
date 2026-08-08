#!/usr/bin/env node
/**
 * Best-effort MachineTrustRegistry compile check.
 * Prefers Foundry `forge`; falls back to reporting solc/forge missing without failing CI hard
 * unless --strict is passed.
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
  const build = spawnSync(
    "forge",
    ["build", "--contracts", "contracts/MachineTrustRegistry.sol"],
    { encoding: "utf8", stdio: "inherit" },
  );
  process.exit(build.status ?? 1);
}

console.log("WARN: Foundry `forge` not installed — syntax presence check only.");
console.log("PASS: MachineTrustRegistry.sol present (install Foundry to compile).");
if (strict) process.exit(1);
process.exit(0);
