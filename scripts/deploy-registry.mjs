#!/usr/bin/env node
/**
 * Explicit MachineTrustRegistry deploy helper — NEVER runs during Render builds.
 *
 * Usage:
 *   MONAD_TESTNET_RPC_URL=... MONAD_TESTNET_PRIVATE_KEY=... npm run registry:deploy
 *
 * Requires Foundry (`forge`) on PATH. Prints commands; does not invent tx hashes.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rpc = process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL;
const key = process.env.MONAD_TESTNET_PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;
const contract = resolve("contracts/MachineTrustRegistry.sol");

if (!existsSync(contract)) {
  console.error("Missing contracts/MachineTrustRegistry.sol");
  process.exit(1);
}

if (!rpc || !key) {
  console.error(
    "Set MONAD_TESTNET_RPC_URL and MONAD_TESTNET_PRIVATE_KEY before deploying.\n" +
      "This script will not invent a deployment or fabricate a contract address.",
  );
  process.exit(1);
}

const forge = spawnSync("forge", ["--version"], { encoding: "utf8" });
if (forge.status !== 0) {
  console.error(
    "Foundry `forge` not found. Install from https://book.getfoundry.sh/ then re-run.\n" +
      "Suggested command after install:\n" +
      `  forge create contracts/MachineTrustRegistry.sol:MachineTrustRegistry \\\n` +
      `    --rpc-url "$MONAD_TESTNET_RPC_URL" \\\n` +
      `    --private-key "$MONAD_TESTNET_PRIVATE_KEY" \\\n` +
      `    --constructor-args <operatorAddress>`,
  );
  process.exit(1);
}

const operator = process.env.MACHINETRUST_OPERATOR_ADDRESS;
if (!operator) {
  console.error(
    "Set MACHINETRUST_OPERATOR_ADDRESS (constructor arg) to the operator wallet that will call register/transfer.",
  );
  process.exit(1);
}

console.log("Deploying MachineTrustRegistry (explicit, not part of Render build)...");
console.log("Network RPC:", rpc);
console.log("Operator:", operator);
// Do not print the private key.
const result = spawnSync(
  "forge",
  [
    "create",
    "contracts/MachineTrustRegistry.sol:MachineTrustRegistry",
    "--rpc-url",
    rpc,
    "--private-key",
    key,
    "--constructor-args",
    operator,
    "--broadcast",
    "--chain-id",
    process.env.MONAD_CHAIN_ID || "10143",
  ],
  { encoding: "utf8", stdio: "inherit" },
);

process.exit(result.status ?? 1);
