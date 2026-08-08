/**
 * Live Track 1 evaluation smoke test (sandbox).
 * Loads .env.local and exercises the cooperate gates the adapter uses.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";
import { pathToFileURL } from "node:url";

// Load env
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const base = process.env.CLEANVERSE_API_URL.replace(/\/$/, "");
const apiId = process.env.CLEANVERSE_SANDBOX_API_ID;
const chain = process.env.CLEANVERSE_CHAIN || "monad";
const ISSUER = "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e";
const FUND = "0xc8ba032092cc2499637f4e331e841ab24d1c9964";
const UNKNOWN = "0xda45b2481b679b6a2eacb413fdcf761ab1637d2e";

function request(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(base + path);
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-id": apiId,
          "User-Agent": "MachineTrust/1.0",
          "X-Request-ID": crypto.randomUUID(),
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let b = "";
        res.on("data", (d) => (b += d));
        res.on("end", () => resolve(JSON.parse(b)));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function gate(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

const list = await request("/query_deposit_atoken_list", { chain, symbol: "usdc" });
const atoken = list.data?.tokens?.[0]?.atoken?.address;
gate("CVA list aUSDC", list.code === "0000" && !!atoken, atoken?.slice(0, 12));

async function party(name, address, expectApass, expectVerify) {
  const q = await request("/query_apass", { chain, address });
  const has = q.code === "0000" && !!q.data?.cvRecordId;
  gate(`CVI ${name}`, has === expectApass, `${q.code} cv=${q.data?.cvRecordId ?? "-"}`);
  const v = await request("/verify_apass", { chain, atoken, address });
  gate(
    `CCP ${name}`,
    Number(v.data?.code) === expectVerify,
    `data.code=${v.data?.code} ${v.data?.message}`,
  );
}

await party("issuer", ISSUER, true, 4);
await party("fund", FUND, true, 4);
await party("unknown", UNKNOWN, false, 2);

console.log("\nTrack 1 sandbox gates: Machine Passport holders → CVI → CVA(aUSDC) → CCP(verify_apass).");
console.log("Custom A-Token launch remains ISSUE_FAILED on Monad (see list_my_atokens).");
