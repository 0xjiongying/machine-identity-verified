#!/usr/bin/env node
/**
 * Deploy MachineTrustCredit to Monad Testnet — NEVER invents addresses.
 *
 * Usage:
 *   source .env.local && node scripts/deploy-credit.mjs
 *
 * Constructor: (registry, oracle)
 *   registry = MACHINETRUST_REGISTRY_ADDRESS
 *   oracle   = MACHINETRUST_OPERATOR_ADDRESS (holds MONAD_TESTNET_PRIVATE_KEY)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rpc = process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL;
const key = process.env.MONAD_TESTNET_PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;
const registry =
  process.env.MACHINETRUST_REGISTRY_ADDRESS ||
  "0x83753166684AfB4912a61713c49Feada6298dF19";
const oracle = process.env.MACHINETRUST_OPERATOR_ADDRESS;
const contract = resolve("contracts/MachineTrustCredit.sol");

if (!existsSync(contract)) {
  console.error("Missing contracts/MachineTrustCredit.sol");
  process.exit(1);
}
if (!rpc || !key) {
  console.error("Set MONAD_TESTNET_RPC_URL and MONAD_TESTNET_PRIVATE_KEY");
  process.exit(1);
}
if (!oracle) {
  console.error("Set MACHINETRUST_OPERATOR_ADDRESS (oracle / deployer)");
  process.exit(1);
}

console.log("Deploying MachineTrustCredit…");
console.log("RPC:", rpc);
console.log("Registry:", registry);
console.log("Oracle:", oracle);

const result = spawnSync(
  "forge",
  [
    "create",
    "contracts/MachineTrustCredit.sol:MachineTrustCredit",
    "--rpc-url",
    rpc,
    "--private-key",
    key,
    "--broadcast",
    "--chain",
    process.env.MONAD_CHAIN_ID || "10143",
    "--constructor-args",
    registry,
    oracle,
  ],
  { encoding: "utf8" },
);

const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
process.stdout.write(out);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const deployed = out.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
const txHash = out.match(/Transaction hash:\s*(0x[a-fA-F0-9]{64})/);

if (!deployed) {
  console.error("Could not parse deployed address from forge output");
  process.exit(1);
}

const creditAddress = deployed[1];
const deployTx = txHash?.[1] ?? null;
const artifactPath = resolve("contracts/deployments/monad-testnet-credit.json");
const basePath = resolve("contracts/deployments/monad-testnet.json");
let machine = {};
try {
  machine = JSON.parse(readFileSync(basePath, "utf8"));
} catch {
  /* optional */
}

const artifact = {
  network: "Monad Testnet",
  chainId: Number(process.env.MONAD_CHAIN_ID || 10143),
  rpcUrl: rpc,
  explorer: "https://testnet.monadvision.com",
  contract: "MachineTrustCredit",
  contractAddress: creditAddress,
  deployTx,
  registryAddress: registry,
  oracle,
  deployer: oracle,
  deployedAt: new Date().toISOString(),
  machineId: machine.machineId ?? null,
  passportId: machine.passportId ?? null,
  machineOwner: machine.ownerAfterTransfer ?? null,
  explorers: {
    contract: `https://testnet.monadvision.com/address/${creditAddress}`,
    deployTx: deployTx ? `https://testnet.monadvision.com/tx/${deployTx}` : null,
  },
  note: "Set MACHINE_TRUST_CREDIT_ADDRESS in env to this contractAddress",
};

writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log("\nWrote", artifactPath);
console.log("MACHINE_TRUST_CREDIT_ADDRESS=" + creditAddress);
process.exit(0);
