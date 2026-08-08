/**
 * Track 2 sandbox eligibility probe — CVI + CCP for known wallets.
 * Never prints API keys.
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const BASE = (
  process.env.CLEANVERSE_API_URL || "https://uatapi.cleanverse.com/api/cooperate"
).replace(/\/$/, "");
const API_ID = process.env.CLEANVERSE_SANDBOX_API_ID;
const API_KEY = process.env.CLEANVERSE_SANDBOX_API_KEY;
const CHAIN = process.env.CLEANVERSE_CHAIN || "monad";
const ORIGIN = process.env.CLEANVERSE_ORIGIN_SYMBOL || "usdc";

if (!API_ID || !API_KEY) {
  console.error("Missing CLEANVERSE_SANDBOX_API_ID / CLEANVERSE_SANDBOX_API_KEY");
  process.exit(1);
}

const WALLETS = {
  issuer: "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e",
  fund: "0xc8ba032092cc2499637f4e331e841ab24d1c9964",
  unknown: "0xda45b2481b679b6a2eacb413fdcf761ab1637d2e",
};

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-id": API_ID,
      "User-Agent": "MachineTrust-Track2/1.0",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { http: res.status, json };
}

const list = await post("/query_deposit_atoken_list", { chain: CHAIN, symbol: ORIGIN });
const tokens = list.json?.data?.tokens ?? [];
const atoken =
  tokens.find((t) => t.atoken?.symbol?.toLowerCase() === "ausdc")?.atoken?.address ||
  tokens[0]?.atoken?.address;
console.log("CVA bind aToken:", atoken || "NONE");
if (!atoken) process.exit(2);

let pass = 0;
let total = 0;
for (const [name, address] of Object.entries(WALLETS)) {
  total++;
  const apass = await post("/query_apass", { chain: CHAIN, address });
  const active =
    apass.json?.code === "0000" &&
    !!apass.json?.data?.cvRecordId &&
    (apass.json.data.status === 1 ||
      apass.json.data.status === "1" ||
      apass.json.data.status == null);
  const verify = await post("/verify_apass", { chain: CHAIN, atoken, address });
  const code = Number(verify.json?.data?.code);
  const eligible = active && code === 4;
  const expect = name === "unknown" ? false : true;
  const ok = eligible === expect;
  if (ok) pass++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  CVI active=${active}  CCP data.code=${code}  eligible=${eligible} (expect ${expect})`,
  );
}

console.log(`\nTrack 2 eligibility: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
