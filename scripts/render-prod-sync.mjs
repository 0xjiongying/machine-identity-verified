#!/usr/bin/env node
/**
 * Sync local Track 2 production env → Render `machine-trust` and redeploy.
 *
 * Usage:
 *   RENDER_API_KEY=rnd_... node scripts/render-prod-sync.mjs
 *
 * Reads values from process.env / .env.local. Never prints secret values.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://api.render.com/v1";
const SERVICE_NAME = process.env.RENDER_SERVICE_NAME || "machine-trust";

const REQUIRED = [
  "CLEANVERSE_SANDBOX_API_ID",
  "CLEANVERSE_SANDBOX_API_KEY",
  "MONAD_TESTNET_RPC_URL",
  "MONAD_TESTNET_PRIVATE_KEY",
  "MACHINETRUST_OPERATOR_ADDRESS",
  "MACHINETRUST_REGISTRY_ADDRESS",
  "MACHINE_TRUST_CREDIT_ADDRESS",
];

const OPTIONAL = [
  "CLEANVERSE_API_URL",
  "CLEANVERSE_CHAIN",
  "CLEANVERSE_ORIGIN_SYMBOL",
  "CLEANVERSE_ATOKEN_SYMBOL",
  "MONAD_CHAIN_ID",
  "MONAD_NETWORK_LABEL",
  "FRONTEND_URL",
  "HOST",
  "NITRO_PRESET",
];

function loadDotEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function api(path, { method = "GET", body } = {}) {
  const key = process.env.RENDER_API_KEY;
  if (!key) {
    throw new Error("RENDER_API_KEY is required");
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Render API ${method} ${path} → ${res.status}`);
  }
  return data;
}

function collectEnv() {
  const keys = [...REQUIRED, ...OPTIONAL];
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
  // Defaults for public/non-secret config
  if (!process.env.FRONTEND_URL) process.env.FRONTEND_URL = "https://machine-trust.onrender.com";
  if (!process.env.HOST) process.env.HOST = "0.0.0.0";
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
  if (!process.env.NITRO_PRESET) process.env.NITRO_PRESET = "node-server";
  if (!process.env.MONAD_CHAIN_ID) process.env.MONAD_CHAIN_ID = "10143";
  if (!process.env.MONAD_NETWORK_LABEL) process.env.MONAD_NETWORK_LABEL = "monad-testnet";

  return keys
    .filter((k) => process.env[k]?.trim())
    .map((k) => ({
      key: k,
      value: process.env[k].trim(),
    }));
}

async function main() {
  loadDotEnvLocal();
  const envVars = collectEnv();
  console.log(`Preparing ${envVars.length} env keys for service "${SERVICE_NAME}" (values redacted)`);
  console.log(
    "Keys:",
    envVars.map((e) => e.key).join(", "),
  );

  const listed = await api("/services?limit=50");
  const services = Array.isArray(listed)
    ? listed.map((row) => row.service || row)
    : [];
  const service = services.find(
    (s) => s.name === SERVICE_NAME || s.serviceDetails?.url?.includes("machine-trust"),
  );
  if (!service?.id) {
    throw new Error(`Service "${SERVICE_NAME}" not found in Render account`);
  }
  console.log(`Service id: ${service.id}`);
  console.log(`Branch: ${service.branch || service.serviceDetails?.branch || "unknown"}`);

  // Replace env vars (PUT semantics via Render env-vars endpoint)
  await api(`/services/${service.id}/env-vars`, {
    method: "PUT",
    body: envVars.map((e) => ({ key: e.key, value: e.value })),
  });
  console.log("Environment variables updated");

  const deploy = await api(`/services/${service.id}/deploys`, {
    method: "POST",
    body: { clearCache: "clear" },
  });
  const deployId = deploy?.id || deploy?.deploy?.id;
  console.log(`Deploy triggered: ${deployId || "ok"}`);

  const healthUrl = "https://machine-trust.onrender.com/health";
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 15000));
    try {
      const h = await fetch(healthUrl, { headers: { "cache-control": "no-store" } }).then((r) =>
        r.json(),
      );
      console.log(
        `health poll ${i + 1}: cleanverse=${h.cleanverse?.status} monad=${h.monad?.status} registry=${h.monad?.registry}`,
      );
      if (h.cleanverse?.status === "configured" && h.monad?.status === "configured") {
        console.log("SUCCESS: production health configured");
        process.exit(0);
      }
    } catch {
      console.log(`health poll ${i + 1}: waiting for service`);
    }
  }
  console.error("TIMEOUT: health did not become fully configured");
  process.exit(2);
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
