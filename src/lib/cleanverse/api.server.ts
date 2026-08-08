/**
 * Cleanverse Sandbox HTTP client — the ONLY place credentials and endpoints live.
 *
 * Contract (Cleanverse cooperate API, as used by the sandbox credentials issued
 * for the hackathon):
 *   base   sandbox https://uatapi.cleanverse.com/api/cooperate
 *          prod    https://api.cleanverse.com/api/cooperate
 *   auth   header `api-id: <API ID>` + per-request `X-Request-ID: <uuid>`.
 *          The API key is NOT a bearer token: it is the AES-CBC key used to
 *          encrypt the JSON body of protected write endpoints, which are sent
 *          as { "data": "<base64 ciphertext>" }.
 *   envelope { code, message, data } — code "0000" means success.
 *
 * Server-side env only (never VITE_ prefixed):
 *   CLEANVERSE_API_URL          base URL (optional, defaults to sandbox)
 *   CLEANVERSE_SANDBOX_API_ID   api-id header value
 *   CLEANVERSE_SANDBOX_API_KEY  base64 AES key for protected writes
 *   CLEANVERSE_CHAIN            chain slug, defaults to "monad"
 *   CLEANVERSE_ATOKEN_SYMBOL    optional A-Token symbol to bind the asset to
 */

const SANDBOX_BASE = "https://uatapi.cleanverse.com/api/cooperate";

export type CleanverseConfig = {
  baseUrl: string;
  apiId: string;
  apiKey: string;
  chain: string;
  atokenSymbol: string | null;
};

export type Envelope<T = Record<string, unknown>> = {
  code: string;
  message: string;
  data: T | null;
};

export function readConfig(): CleanverseConfig | null {
  const apiId = process.env["CLEANVERSE_SANDBOX_API_ID"];
  const apiKey = process.env["CLEANVERSE_SANDBOX_API_KEY"];
  if (!apiId || !apiKey) return null;
  const baseUrl = (process.env["CLEANVERSE_API_URL"] || SANDBOX_BASE).replace(/\/$/, "");
  return {
    baseUrl,
    apiId,
    apiKey,
    chain: process.env["CLEANVERSE_CHAIN"] || "monad",
    atokenSymbol: process.env["CLEANVERSE_ATOKEN_SYMBOL"] || null,
  };
}

/** Endpoints whose body must be AES-CBC encrypted with the API key. */
const ENCRYPTED = new Set([
  "/generate_apass",
  "/update_status",
  "/atoken/register_atoken",
  "/atoken/launch",
  "/atoken/add_rule",
  "/atoken/remove_rule",
  "/atoken/set_paused",
  "/blacklist/add",
]);

function b64ToBytes(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** AES-CBC, zero IV, key = base64-decoded API key (16/24/32 bytes). */
async function encryptBody(apiKey: string, payload: unknown) {
  const raw = b64ToBytes(apiKey);
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, ["encrypt"]);
  const iv = new Uint8Array(16);
  const buf = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return bytesToB64(new Uint8Array(buf));
}

export class CleanverseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(`Cleanverse ${code}: ${message}`);
    this.code = code;
  }
}

/** POST an endpoint and return the raw envelope (no throwing on business codes). */
export async function post<T = Record<string, unknown>>(
  cfg: CleanverseConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<Envelope<T>> {
  const payload = ENCRYPTED.has(path) ? { data: await encryptBody(cfg.apiKey, body) } : body;
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-id": cfg.apiId,
      "X-Request-ID": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new CleanverseError(String(res.status), text.slice(0, 240));
  let parsed: Envelope<T>;
  try {
    parsed = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new CleanverseError("parse", text.slice(0, 240));
  }
  return parsed;
}

/** Throwing variant for calls where anything but 0000 is an outage, not a denial. */
export async function postOk<T = Record<string, unknown>>(
  cfg: CleanverseConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const env = await post<T>(cfg, path, body);
  if (env.code !== "0000") throw new CleanverseError(env.code, env.message);
  return (env.data ?? ({} as T)) as T;
}

/* ── CVI (A-Pass) ─────────────────────────────────────────────────────── */

export type ApassRecord = {
  cvRecordId?: string;
  status?: string | number;
  tier?: string | number;
  subTier?: string | number;
  group?: string;
  subGroup?: string;
  expirationTime?: string | number;
  currentKycHash?: string;
};

export function queryApass(cfg: CleanverseConfig, address: string) {
  return post<ApassRecord>(cfg, "/query_apass", { chain: cfg.chain, address });
}

/* ── CVA (A-Token registry) ───────────────────────────────────────────── */

export type AtokenListing = {
  origin_token?: { address?: string; symbol?: string; name?: string };
  atoken?: { address?: string; symbol?: string; name?: string };
  accesscore_address?: string;
  apass_address?: string;
};

export function queryDepositAtokenList(cfg: CleanverseConfig, symbol?: string | null) {
  return post<{ chain?: string; tokens?: AtokenListing[] }>(cfg, "/query_deposit_atoken_list", {
    chain: cfg.chain,
    ...(symbol ? { symbol } : {}),
  });
}

/* ── CCP (pre-transaction check) ──────────────────────────────────────── */

/**
 * verify_apass is Cleanverse's pre-transaction gate: it answers whether this
 * address may move this A-Token right now. code 0000 = allowed, 2 = no A-Pass
 * (onboarding required), 3 = A-Pass exists but cannot transfer.
 */
export type VerifyApassResult = {
  code?: number | string;
  message?: string;
  magickLink?: string;
};

export function verifyApass(cfg: CleanverseConfig, atoken: string, address: string) {
  return post<VerifyApassResult>(cfg, "/verify_apass", {
    chain: cfg.chain,
    atoken,
    address,
  });
}
