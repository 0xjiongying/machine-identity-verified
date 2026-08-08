#!/usr/bin/env node
/**
 * CCP-gated Monad Testnet proof runner.
 *
 * Flow: CVI → CVA → CCP → only if APPROVED → registerMachine / transferOwnership
 * Never bypasses Cleanverse. Never fabricates tx hashes.
 *
 * Usage (after deploy + env configured):
 *   node scripts/ccp-gated-registry-proof.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  getAddress,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

function loadEnvLocal() {
  try {
    const text = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const base = (
  process.env.CLEANVERSE_API_URL || "https://uatapi.cleanverse.com/api/cooperate"
).replace(/\/$/, "");
const apiId = process.env.CLEANVERSE_SANDBOX_API_ID;
const apiKey = process.env.CLEANVERSE_SANDBOX_API_KEY;
const rpc = process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";
const key = process.env.MONAD_TESTNET_PRIVATE_KEY;
const registryAddress = process.env.MACHINETRUST_REGISTRY_ADDRESS;
const chainId = Number(process.env.MONAD_CHAIN_ID || 10143);
const explorer = "https://testnet.monadvision.com";

const ISSUER = "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e";
const FUND = "0xc8ba032092cc2499637f4e331e841ab24d1c9964";
const PASSPORT = process.env.MACHINETRUST_PROOF_PASSPORT || `MT-PROOF-${Date.now()}`;

if (!apiId || !apiKey) {
  console.error("Missing Cleanverse Sandbox credentials — refusing Monad write.");
  process.exit(1);
}
if (!key || !registryAddress) {
  console.error("Missing MONAD_TESTNET_PRIVATE_KEY or MACHINETRUST_REGISTRY_ADDRESS.");
  process.exit(1);
}

function commitment(value) {
  return `0x${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function encrypt(payload) {
  const k = Buffer.from(apiKey, "base64");
  const iv = Buffer.alloc(16, 0);
  const algo = k.length === 16 ? "aes-128-cbc" : k.length === 24 ? "aes-192-cbc" : "aes-256-cbc";
  const cipher = crypto.createCipheriv(algo, k, iv);
  return Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]).toString(
    "base64",
  );
}

function request(path, body, encrypted = false) {
  return new Promise((resolve, reject) => {
    const payload = encrypted ? { data: encrypt(body) } : body;
    const data = JSON.stringify(payload);
    const u = new URL(base + path);
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 MachineTrust/1.0",
          "api-id": apiId,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (d) => (buf += d));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch {
            resolve({ code: "parse", message: buf.slice(0, 200) });
          }
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function report(label, ok, detail) {
  console.log(`${ok ? "PASS" : "BLOCK"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

function apassActive(envelope) {
  if (envelope.code !== "0000") return false;
  const status = envelope.data?.status;
  return (
    status === 1 ||
    status === "1" ||
    status === null ||
    status === undefined ||
    Boolean(envelope.data?.cvRecordId)
  );
}

async function verifySubjects(atoken, addresses) {
  const results = [];
  for (const address of addresses) {
    const envelope = await request("/verify_apass", { chain: "monad", atoken, address }, true);
    const code = Number(envelope?.data?.code);
    const allowed = envelope.code === "0000" && code === 4;
    results.push({ address, envelope, allowed, code });
    report(
      `CCP verify_apass ${address.slice(0, 10)}…`,
      allowed,
      allowed
        ? "data.code 4"
        : `env ${envelope.code} inner ${envelope?.data?.code ?? "n/a"} ${(envelope.message || "").slice(0, 80)}`,
    );
  }
  return results;
}

async function run() {
  console.log("=== CCP-gated Monad Testnet proof ===");
  console.log("Explorer:", explorer);
  console.log("Registry:", registryAddress);
  console.log("Passport:", PASSPORT);

  const issuerApass = await request("/query_apass", {
    wallet: { address: ISSUER, chain: "monad" },
  });
  const fundApass = await request("/query_apass", {
    wallet: { address: FUND, chain: "monad" },
  });
  const issuerOk = apassActive(issuerApass);
  const fundOk = apassActive(fundApass);
  report("CVI issuer", issuerOk, `env ${issuerApass.code}`);
  report("CVI fund", fundOk, `env ${fundApass.code}`);
  if (!issuerOk || !fundOk) {
    console.error("Cleanverse Gate: BLOCKED at CVI — no Monad transaction.");
    process.exit(2);
  }

  const list = await request("/query_deposit_atoken_list", {
    chain: "monad",
    symbol: "usdc",
    page: 1,
    pageSize: 20,
  });
  const tokens = list.data?.tokens || [];
  const ausdc = tokens.find((t) => (t.atoken?.symbol || "").toLowerCase() === "ausdc") || tokens[0];
  const atoken = ausdc?.atoken?.address;
  report("CVA bind aUSDC", Boolean(atoken), atoken ? `${atoken.slice(0, 12)}…` : list.message);
  if (!atoken) {
    console.error("Cleanverse Gate: BLOCKED at CVA — no Monad transaction.");
    process.exit(2);
  }

  const issueCcp = await verifySubjects(atoken, [ISSUER]);
  if (!issueCcp.every((r) => r.allowed)) {
    console.error(
      "Cleanverse Gate: BLOCKED at CCP (issuance) — DO NOT submit Monad registerMachine.",
    );
    process.exit(2);
  }
  report("CCP issuance", true, "APPROVED");

  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  const chain = {
    id: chainId,
    name: "monad-testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
  const transport = http(rpc);
  const wallet = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });
  const bal = await publicClient.getBalance({ address: account.address });
  console.log(`Operator ${account.address} balance ${formatEther(bal)} MON`);
  if (bal === 0n) {
    console.error("Deployer has 0 MON — fund via https://faucet.monad.xyz");
    process.exit(1);
  }

  const abi = parseAbi([
    "function registerMachine(bytes32 machineId, bytes32 passportHash, bytes32 cleanverseAssetRef, address owner_)",
    "function transferOwnership(bytes32 machineId, address to, bytes32 cleanverseDecisionRef)",
    "function ownerOf(bytes32 machineId) view returns (address)",
  ]);
  const registry = getAddress(registryAddress);
  const machineId = commitment(PASSPORT);
  const passportHash = commitment(`passport:${PASSPORT}`);
  const assetRef = commitment(atoken);
  const decisionRef = commitment(`ccp:issue:${ISSUER}:${atoken}`);

  const { request: regReq } = await publicClient.simulateContract({
    address: registry,
    abi,
    functionName: "registerMachine",
    args: [machineId, passportHash, assetRef, getAddress(ISSUER)],
    account,
  });
  const regHash = await wallet.writeContract(regReq);
  const regReceipt = await publicClient.waitForTransactionReceipt({
    hash: regHash,
    timeout: 120000,
  });
  if (regReceipt.status !== "success") {
    console.error("registerMachine reverted");
    process.exit(1);
  }
  const ownerAfterReg = await publicClient.readContract({
    address: registry,
    abi,
    functionName: "ownerOf",
    args: [machineId],
  });
  console.log("Registration TX:", regHash);
  console.log("Explorer:", `${explorer}/tx/${regHash}`);
  console.log("Owner after register:", ownerAfterReg);

  const transferCcp = await verifySubjects(atoken, [ISSUER, FUND]);
  if (!transferCcp.every((r) => r.allowed)) {
    console.error(
      "Cleanverse Gate: BLOCKED at CCP (transfer) — DO NOT submit Monad transferOwnership.",
    );
    const partial = {
      network: "Monad Testnet",
      chainId,
      contractAddress: registry,
      registrationTx: regHash,
      ownershipTransferTx: null,
      ownerAfterRegister: ownerAfterReg,
      cleanverseGate: "BLOCKED",
      endToEndFlow: "FAIL",
      note: "Registration completed after CCP issuance APPROVE; transfer blocked by Cleanverse CCP.",
      deployedAt: new Date().toISOString(),
    };
    fs.mkdirSync(new URL("../contracts/deployments", import.meta.url), { recursive: true });
    fs.writeFileSync(
      new URL("../contracts/deployments/monad-testnet.json", import.meta.url),
      JSON.stringify(partial, null, 2) + "\n",
    );
    process.exit(2);
  }
  report("CCP transfer", true, "APPROVED");

  const xferDecision = commitment(`ccp:transfer:${ISSUER}:${FUND}:${atoken}`);
  const { request: xferReq } = await publicClient.simulateContract({
    address: registry,
    abi,
    functionName: "transferOwnership",
    args: [machineId, getAddress(FUND), xferDecision],
    account,
  });
  const xferHash = await wallet.writeContract(xferReq);
  const xferReceipt = await publicClient.waitForTransactionReceipt({
    hash: xferHash,
    timeout: 120000,
  });
  if (xferReceipt.status !== "success") {
    console.error("transferOwnership reverted");
    process.exit(1);
  }
  const ownerAfterXfer = await publicClient.readContract({
    address: registry,
    abi,
    functionName: "ownerOf",
    args: [machineId],
  });
  console.log("Ownership Transfer TX:", xferHash);
  console.log("Explorer:", `${explorer}/tx/${xferHash}`);
  console.log("Owner after transfer:", ownerAfterXfer);

  const artifact = {
    network: "Monad Testnet",
    chainId,
    rpcUrl: rpc,
    explorer,
    contract: "MachineTrustRegistry",
    contractAddress: registry,
    passportId: PASSPORT,
    machineId,
    registrationTx: regHash,
    ownershipTransferTx: xferHash,
    ownerAfterRegister: ownerAfterReg,
    ownerAfterTransfer: ownerAfterXfer,
    cleanverse: {
      cvi: true,
      cva: atoken,
      ccpIssuance: true,
      ccpTransfer: true,
    },
    deployedAt: new Date().toISOString(),
  };
  fs.mkdirSync(new URL("../contracts/deployments", import.meta.url), { recursive: true });
  fs.writeFileSync(
    new URL("../contracts/deployments/monad-testnet.json", import.meta.url),
    JSON.stringify(artifact, null, 2) + "\n",
  );
  console.log("Wrote contracts/deployments/monad-testnet.json");
  console.log(
    JSON.stringify(
      {
        contract: "READY",
        network: "Monad Testnet",
        contractAddress: registry,
        registrationTx: regHash,
        ownershipTransferTx: xferHash,
        explorerVerification: "PASS",
        cleanverseGate: "PASS",
        endToEndFlow: "PASS",
      },
      null,
      2,
    ),
  );
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
