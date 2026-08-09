#!/usr/bin/env node
/**
 * Track 2 end-to-end proof on Monad Testnet.
 *
 * Case D (negative): Unknown wallet → CVI unverified → openCreditDeposit rejected
 * Case C (positive): Fund B → live CVI → setCviEligible → openCreditDeposit → real TX
 *
 * Never fabricates tx hashes. Requires:
 *   CLEANVERSE_* , MONAD_* , MACHINE_TRUST_CREDIT_ADDRESS
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  getAddress,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

function loadEnvLocal() {
  const p = resolve(".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const API_URL = process.env.CLEANVERSE_API_URL;
const API_ID = process.env.CLEANVERSE_SANDBOX_API_ID;
const API_KEY = process.env.CLEANVERSE_SANDBOX_API_KEY;
const CHAIN = process.env.CLEANVERSE_CHAIN || "monad";
const RPC = process.env.MONAD_TESTNET_RPC_URL;
const KEY = process.env.MONAD_TESTNET_PRIVATE_KEY;
const CREDIT = process.env.MACHINE_TRUST_CREDIT_ADDRESS;
const REGISTRY =
  process.env.MACHINETRUST_REGISTRY_ADDRESS || "0x83753166684AfB4912a61713c49Feada6298dF19";

const FUND_B = "0xC8bA032092cC2499637f4E331E841ab24d1c9964";
const UNKNOWN = "0xDA45b2481b679B6A2Eacb413FdCf761Ab1637D2e";

if (!API_URL || !API_ID || !API_KEY || !RPC || !KEY || !CREDIT) {
  console.error("Missing Cleanverse / Monad / MACHINE_TRUST_CREDIT_ADDRESS env");
  process.exit(1);
}

const deployment = JSON.parse(
  readFileSync(resolve("contracts/deployments/monad-testnet.json"), "utf8"),
);
const machineId = deployment.machineId;

async function queryApass(wallet) {
  const res = await fetch(`${API_URL.replace(/\/$/, "")}/query_apass`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-id": API_ID,
      // api-key is AES-only locally for encrypted paths; never transmitted (Cleanverse docs).
      "User-Agent":
        "MachineTrust/1.0 (Cleanverse Cooperate; +https://github.com/0xjiongying/machine-identity-verified)",
    },
    body: JSON.stringify({ chain: CHAIN, address: wallet }),
  });
  const json = await res.json();
  const data = json?.data ?? {};
  const active =
    json?.code === "0000" &&
    Boolean(data.cvRecordId || data.cv_record_id) &&
    (data.status === 1 || data.status === "1" || data.status === undefined || data.status === null);
  return {
    envelopeCode: json?.code ?? String(res.status),
    envelopeMessage: json?.message ?? "",
    active,
    cvRecordId: data.cvRecordId ?? data.cv_record_id ?? null,
    rawHasData: Boolean(json?.data),
  };
}

function cviRef(wallet, cvRecordId) {
  return `0x${createHash("sha256")
    .update(`cvi:${wallet}:${cvRecordId ?? "none"}`)
    .digest("hex")}`;
}

const CREDIT_ABI = parseAbi([
  "function setCviEligible(address wallet, bool eligible, bytes32 cviRef)",
  "function openCreditDeposit(address borrower, bytes32 machineId, bytes32 cviRef) payable returns (uint256)",
  "function cviEligible(address) view returns (bool)",
  "function positions(address) view returns (bytes32 machineId, bytes32 cviRef, uint256 deposit, uint64 openedAt, bool active)",
  "function isAuthorized(address wallet, bytes32 machineId) view returns (bool)",
]);

const REGISTRY_ABI = parseAbi(["function ownerOf(bytes32 machineId) view returns (address)"]);

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const chain = {
  id: 10143,
  name: "monad-testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const transport = http(RPC);
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const proof = {
  network: "Monad Testnet",
  chainId: 10143,
  registry: REGISTRY,
  credit: CREDIT,
  machineId,
  cases: {},
  at: new Date().toISOString(),
};

console.log("=== Track 2 CVI-gated credit proof ===");
console.log("Credit:", CREDIT);
console.log("Machine:", machineId);

// Ownership check
const owner = await publicClient.readContract({
  address: getAddress(REGISTRY),
  abi: REGISTRY_ABI,
  functionName: "ownerOf",
  args: [machineId],
});
console.log("Registry ownerOf:", owner);
proof.machineOwner = owner;

// Case D — negative
console.log("\n--- Case D: Unknown wallet (expect reject) ---");
const unknownCvi = await queryApass(UNKNOWN);
console.log("CVI unknown:", unknownCvi);
proof.cases.unknown = { cvi: unknownCvi, expected: "blocked" };

if (unknownCvi.active) {
  console.error("UNEXPECTED: unknown wallet has active A-Pass — negative path weak");
}

// Ensure on-chain marks unverified
{
  const { request } = await publicClient.simulateContract({
    address: getAddress(CREDIT),
    abi: CREDIT_ABI,
    functionName: "setCviEligible",
    args: [getAddress(UNKNOWN), false, cviRef(UNKNOWN, null)],
    account,
  });
  const tx = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  proof.cases.unknown.setCviEligibleTx = tx;
  console.log("setCviEligible(false) tx:", tx);
}

let negativeRejected = false;
try {
  await publicClient.simulateContract({
    address: getAddress(CREDIT),
    abi: CREDIT_ABI,
    functionName: "openCreditDeposit",
    args: [getAddress(UNKNOWN), machineId, cviRef(UNKNOWN, null)],
    account,
    value: parseEther("0.01"),
  });
  console.error("FAIL: unknown openCreditDeposit simulated success");
} catch (e) {
  negativeRejected = true;
  proof.cases.unknown.rejectReason = e instanceof Error ? e.message : String(e);
  console.log("REJECTED as expected:", proof.cases.unknown.rejectReason.slice(0, 160));
}
proof.cases.unknown.rejected = negativeRejected;

// Case C — positive (Fund B)
console.log("\n--- Case C: Fund B verified owner (expect success) ---");
const fundCvi = await queryApass(FUND_B);
console.log("CVI Fund B:", fundCvi);
proof.cases.fundB = { cvi: fundCvi, expected: "eligible" };

if (!fundCvi.active) {
  console.error("FAIL: Fund B CVI not active — cannot prove positive path");
  writeFileSync(
    resolve("contracts/deployments/monad-testnet-credit-proof.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  process.exit(1);
}

if (String(owner).toLowerCase() !== FUND_B.toLowerCase()) {
  console.error("FAIL: Fund B is not machine owner — ownership prerequisite missing");
  writeFileSync(
    resolve("contracts/deployments/monad-testnet-credit-proof.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  process.exit(1);
}

const ref = cviRef(FUND_B, fundCvi.cvRecordId);
{
  const { request } = await publicClient.simulateContract({
    address: getAddress(CREDIT),
    abi: CREDIT_ABI,
    functionName: "setCviEligible",
    args: [getAddress(FUND_B), true, ref],
    account,
  });
  const tx = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  proof.cases.fundB.setCviEligibleTx = tx;
  console.log("setCviEligible(true) tx:", tx);
}

const already = await publicClient.readContract({
  address: getAddress(CREDIT),
  abi: CREDIT_ABI,
  functionName: "positions",
  args: [getAddress(FUND_B)],
});
const active = already[4];
if (active) {
  console.log("Position already open — skipping openCreditDeposit (idempotent proof)");
  proof.cases.fundB.alreadyOpen = true;
  proof.cases.fundB.deposit = already[2].toString();
} else {
  const { request } = await publicClient.simulateContract({
    address: getAddress(CREDIT),
    abi: CREDIT_ABI,
    functionName: "openCreditDeposit",
    args: [getAddress(FUND_B), machineId, ref],
    account,
    value: parseEther("0.01"),
  });
  const tx = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  proof.cases.fundB.openCreditDepositTx = tx;
  proof.cases.fundB.receiptStatus = receipt.status;
  console.log("openCreditDeposit tx:", tx, "status:", receipt.status);
  if (receipt.status !== "success") {
    console.error("FAIL: openCreditDeposit mined but reverted");
    writeFileSync(
      resolve("contracts/deployments/monad-testnet-credit-proof.json"),
      `${JSON.stringify(proof, null, 2)}\n`,
    );
    process.exit(1);
  }
}

const authorized = await publicClient.readContract({
  address: getAddress(CREDIT),
  abi: CREDIT_ABI,
  functionName: "isAuthorized",
  args: [getAddress(FUND_B), machineId],
});
const fundPosition = await publicClient.readContract({
  address: getAddress(CREDIT),
  abi: CREDIT_ABI,
  functionName: "positions",
  args: [getAddress(FUND_B)],
});
proof.cases.fundB.isAuthorized = authorized;
proof.cases.fundB.positionActive = fundPosition[4];
proof.cases.fundB.depositWei = fundPosition[2].toString();
console.log("isAuthorized(Fund B):", authorized, "positionActive:", fundPosition[4]);

proof.ok = negativeRejected && fundCvi.active && authorized === true && fundPosition[4] === true;
proof.explorers = {
  credit: `https://testnet.monadvision.com/address/${CREDIT}`,
  setCviEligibleFundB: proof.cases.fundB.setCviEligibleTx
    ? `https://testnet.monadvision.com/tx/${proof.cases.fundB.setCviEligibleTx}`
    : null,
  openCreditDeposit: proof.cases.fundB.openCreditDepositTx
    ? `https://testnet.monadvision.com/tx/${proof.cases.fundB.openCreditDepositTx}`
    : null,
  unknownRejectSet: proof.cases.unknown.setCviEligibleTx
    ? `https://testnet.monadvision.com/tx/${proof.cases.unknown.setCviEligibleTx}`
    : null,
};

const outPath = resolve("contracts/deployments/monad-testnet-credit-proof.json");
writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log("\nWrote", outPath);
console.log(proof.ok ? "PROOF PASS" : "PROOF INCOMPLETE");
process.exit(proof.ok ? 0 : 1);
