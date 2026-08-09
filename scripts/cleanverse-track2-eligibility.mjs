/**
 * Track 2 CVI-only eligibility probe (no CCP fabrication).
 * Verifies live query_apass for Fund B / Issuer / Unknown.
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
const CHAIN = process.env.CLEANVERSE_CHAIN || "monad";

if (!API_ID) {
  console.error("Missing CLEANVERSE_SANDBOX_API_ID");
  process.exit(1);
}

const WALLETS = {
  issuer: { address: "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e", expectCvi: true },
  fund: { address: "0xc8ba032092cc2499637f4e331e841ab24d1c9964", expectCvi: true },
  unknown: { address: "0xda45b2481b679b6a2eacb413fdcf761ab1637d2e", expectCvi: false },
};

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-id": API_ID,
      "User-Agent":
        "MachineTrust/1.0 (Cleanverse Cooperate; +https://github.com/0xjiongying/machine-identity-verified)",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { http: res.status, json };
}

let pass = 0;
let total = 0;
for (const [name, w] of Object.entries(WALLETS)) {
  total++;
  const apass = await post("/query_apass", { chain: CHAIN, address: w.address });
  const active =
    apass.json?.code === "0000" &&
    !!apass.json?.data?.cvRecordId &&
    (apass.json.data.status === 1 ||
      apass.json.data.status === "1" ||
      apass.json.data.status == null);
  const ok = active === w.expectCvi;
  if (ok) pass++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  CVI active=${active}  code=${apass.json?.code} (expect CVI=${w.expectCvi})`,
  );
}

console.log(`\nTrack 2 CVI probe: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
