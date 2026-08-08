#!/usr/bin/env node
/**
 * Sandbox audit against Cleanverse API v5.6 schemas.
 * Reads CLEANVERSE_* from the environment / .env.local.
 * Never prints api-id or api-key values.
 *
 * Usage: node scripts/cleanverse-sandbox-audit.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";

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
const chain = (process.env.CLEANVERSE_CHAIN || "monad").toLowerCase();

if (!apiId || !apiKey) {
  console.error("Missing CLEANVERSE_SANDBOX_API_ID / CLEANVERSE_SANDBOX_API_KEY");
  process.exit(1);
}

function encrypt(payload) {
  const key = Buffer.from(apiKey, "base64");
  const iv = Buffer.alloc(16, 0);
  const algo =
    key.length === 16 ? "aes-128-cbc" : key.length === 24 ? "aes-192-cbc" : "aes-256-cbc";
  const cipher = crypto.createCipheriv(algo, key, iv);
  const json = JSON.stringify(payload);
  return Buffer.concat([cipher.update(json, "utf8"), cipher.final()]).toString("base64");
}

function request(method, path, body, encrypted = false) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : encrypted ? { data: encrypt(body) } : body;
    const data = payload == null ? null : JSON.stringify(payload);
    const u = new URL(base + path);
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        Accept: "application/json",
        // Cloudflare UAT rejects bare Node UAs — use a product browser UA.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 MachineTrust/1.0",
        "api-id": apiId,
        "X-Request-ID": crypto.randomUUID(),
        ...(data
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (d) => (buf += d));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(buf);
        } catch {
          parsed = { raw: buf.slice(0, 200) };
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function trunc(o, n = 40) {
  if (Array.isArray(o)) return o.slice(0, 6).map((x) => trunc(x, n));
  if (o && typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[k] = trunc(v, n);
    return out;
  }
  if (typeof o === "string" && o.length > n) return `${o.slice(0, n)}…`;
  return o;
}

function assertShape(name, cond, detail) {
  const ok = Boolean(cond);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

const ISSUER = "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e";
const FUND = "0xc8ba032092cc2499637f4e331e841ab24d1c9964";
const UNKNOWN = "0xda45b2481b679b6a2eacb413fdcf761ab1637d2e";

const results = [];

async function check(name, fn) {
  try {
    const ok = await fn();
    results.push({ name, ok });
  } catch (e) {
    console.log(`FAIL  ${name} — ${e instanceof Error ? e.message : e}`);
    results.push({ name, ok: false });
  }
}

await check("env present (redacted)", async () =>
  assertShape(
    "credentials configured",
    apiId.length > 8 && apiKey.length > 8,
    `api-id len=${apiId.length}`,
  ),
);

let atoken = null;

await check("POST /query_deposit_atoken_list", async () => {
  const res = await request("POST", "/query_deposit_atoken_list", { chain });
  const tokens = res.body?.data?.tokens;
  atoken = tokens?.[0]?.atoken?.address ?? null;
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return [
    assertShape("HTTP 200", res.status === 200),
    assertShape("envelope code 0000", res.body?.code === "0000"),
    assertShape("data.tokens[]", Array.isArray(tokens) && tokens.length > 0),
    assertShape("atoken.address", !!atoken),
  ].every(Boolean);
});

await check("POST /query_apass (issuer)", async () => {
  const res = await request("POST", "/query_apass", { chain, address: ISSUER });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return [
    assertShape("code 0000", res.body?.code === "0000"),
    assertShape("cvRecordId", !!res.body?.data?.cvRecordId),
    assertShape(
      "status active/1 or null",
      res.body?.data?.status === 1 || res.body?.data?.status == null,
    ),
    assertShape("countries includes DE", (res.body?.data?.countries || []).includes("DE")),
  ].every(Boolean);
});

await check("POST /query_apass (unknown → not found)", async () => {
  const res = await request("POST", "/query_apass", { chain, address: UNKNOWN });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return assertShape("business not-found code 0002", res.body?.code === "0002");
});

await check("POST /verify_apass (issuer → data.code 4)", async () => {
  if (!atoken) throw new Error("no atoken");
  const res = await request("POST", "/verify_apass", { chain, atoken, address: ISSUER });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return [
    assertShape("envelope 0000", res.body?.code === "0000"),
    assertShape("data.code === 4 (allowed)", Number(res.body?.data?.code) === 4),
  ].every(Boolean);
});

await check("POST /verify_apass (unknown → data.code 2)", async () => {
  if (!atoken) throw new Error("no atoken");
  const res = await request("POST", "/verify_apass", { chain, atoken, address: UNKNOWN });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return [
    assertShape("envelope 0000", res.body?.code === "0000"),
    assertShape("data.code === 2 (no A-Pass)", Number(res.body?.data?.code) === 2),
  ].every(Boolean);
});

await check("POST /verify_apass (fund → data.code 4)", async () => {
  if (!atoken) throw new Error("no atoken");
  const res = await request("POST", "/verify_apass", { chain, atoken, address: FUND });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return assertShape("data.code === 4", Number(res.body?.data?.code) === 4);
});

await check("GET /atoken/list_my_atokens", async () => {
  const res = await request("GET", "/atoken/list_my_atokens?page=1&page_size=5&chain=monad");
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return [
    assertShape("code 0000", res.body?.code === "0000"),
    assertShape("items array", Array.isArray(res.body?.data?.items)),
  ].every(Boolean);
});

await check("POST /validator/is_register (probe)", async () => {
  const res = await request("POST", "/validator/is_register", {
    chain: "base",
    contract_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  });
  console.log(JSON.stringify(trunc(res.body), null, 2));
  return assertShape("code 0000", res.body?.code === "0000");
});

const failed = results.filter((r) => !r.ok);
console.log("\n=== AUDIT SUMMARY ===");
console.log(`API version target: Cleanverse Cooperate v5.6`);
console.log(`Base: ${base}`);
console.log(`Chain: ${chain}`);
console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
console.log("All schema checks passed against sandbox.");
