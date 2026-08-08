/**
 * Cleanverse Cooperate API client (API v5.6) — server-only.
 *
 * Source of truth: https://docs.cleanverse.com/docs/cleanverse (Cleanverse API v5.6).
 * Secrets stay in process.env (never VITE_*). This module must not be imported
 * from client components.
 *
 * Env:
 *   CLEANVERSE_API_URL          default sandbox base
 *   CLEANVERSE_SANDBOX_API_ID   api-id header
 *   CLEANVERSE_SANDBOX_API_KEY  Base64 AES key (encrypt only; never sent)
 *   CLEANVERSE_CHAIN            default "monad"
 *   CLEANVERSE_ORIGIN_SYMBOL    origin token filter for query_deposit_atoken_list (e.g. usdc)
 *   CLEANVERSE_ATOKEN_SYMBOL    preferred A-Token symbol to select from the list (e.g. ausdc)
 */

const SANDBOX_BASE = "https://uatapi.cleanverse.com/api/cooperate";
const PROD_BASE = "https://api.cleanverse.com/api/cooperate";

/** Docs: endpoints whose plaintext JSON must be sent as {"data":"<Base64 ciphertext>"}. */
const ENCRYPTED_PATHS = new Set([
  "/generate_apass",
  "/update_status",
  "/atoken/register_atoken",
  "/atoken/launch",
  "/atoken/register_wrapped_atoken",
  "/atoken/launch_wrapped_atoken",
  "/atoken/add_rule",
  "/atoken/remove_rule",
  "/atoken/set_paused",
  "/atoken/add_whitelist_for_institutional",
  "/atoken/remove_whitelist_for_institutional",
  "/atoken/restore_whitelist_for_institutional",
  "/blacklist/add",
  "/validator/grant",
  "/validator/register",
  "/validator/set_rule",
  "/validator/add_rule",
  "/validator/remove_rule",
  "/validator/set_paused",
]);

export type CleanverseConfig = {
  baseUrl: string;
  apiId: string;
  apiKey: string;
  chain: string;
  /** Origin (native) symbol sent to query_deposit_atoken_list — not an A-Token symbol. */
  originSymbol: string | null;
  /** Preferred A-Token symbol selected client-side from the returned list. */
  atokenSymbol: string | null;
  environment: "sandbox" | "production" | "custom";
};

export type Envelope<T = unknown> = {
  code: string;
  message: string;
  data: T | null;
};

export function readConfig(): CleanverseConfig | null {
  const apiId = process.env["CLEANVERSE_SANDBOX_API_ID"]?.trim();
  const apiKey = process.env["CLEANVERSE_SANDBOX_API_KEY"]?.trim();
  if (!apiId || !apiKey) return null;

  const baseUrl = (process.env["CLEANVERSE_API_URL"] || SANDBOX_BASE).replace(/\/$/, "");
  const environment =
    baseUrl === SANDBOX_BASE ? "sandbox" : baseUrl === PROD_BASE ? "production" : "custom";

  return {
    baseUrl,
    apiId,
    apiKey,
    chain: (process.env["CLEANVERSE_CHAIN"] || "monad").toLowerCase(),
    originSymbol: process.env["CLEANVERSE_ORIGIN_SYMBOL"]?.trim() || "usdc",
    atokenSymbol: process.env["CLEANVERSE_ATOKEN_SYMBOL"]?.trim() || "ausdc",
    environment,
  };
}

export class CleanverseError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 0) {
    super(`Cleanverse ${code}: ${message}`);
    this.code = code;
    this.httpStatus = httpStatus;
    this.name = "CleanverseError";
  }
}

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

/** AES/CBC/PKCS5Padding, zero IV, key = Base64-decoded api-key (docs Encryption). */
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

type RequestOpts = {
  method?: "GET" | "POST";
  path: string;
  body?: Record<string, unknown> | null;
  /** Force encryption even if path is not in the docs set (tests). */
  encrypt?: boolean;
};

/**
 * Low-level cooperate call. Returns the JSON envelope without throwing on
 * business codes (0001/0002/…). Throws CleanverseError on HTTP/transport failure.
 */
export async function cooperateRequest<T = unknown>(
  cfg: CleanverseConfig,
  opts: RequestOpts,
): Promise<Envelope<T>> {
  const method = opts.method ?? "POST";
  const encrypt = opts.encrypt ?? ENCRYPTED_PATHS.has(opts.path);
  let bodyText: string | undefined;
  if (method !== "GET" && opts.body != null) {
    const payload = encrypt ? { data: await encryptBody(cfg.apiKey, opts.body) } : opts.body;
    bodyText = JSON.stringify(payload);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "api-id": cfg.apiId,
    "X-Request-ID": crypto.randomUUID(),
    // Cloudflare on uatapi rejects bare Node UAs (error 1010); send a product UA.
    "User-Agent":
      "MachineTrust/1.0 (Cleanverse Cooperate; +https://github.com/0xjiongying/machine-identity-verified)",
  };
  if (bodyText) headers["Content-Type"] = "application/json";

  const init: RequestInit = { method, headers };
  if (bodyText) init.body = bodyText;

  const res = await fetch(`${cfg.baseUrl}${opts.path}`, init);

  const text = await res.text();
  if (!res.ok) {
    throw new CleanverseError(String(res.status), text.slice(0, 240), res.status);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new CleanverseError("parse", text.slice(0, 240), res.status);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new CleanverseError("shape", "Cleanverse response was not an object", res.status);
  }
  const envelope = parsed as Record<string, unknown>;
  const code = envelope["code"];
  const message = envelope["message"];
  if (typeof code !== "string" || typeof message !== "string") {
    throw new CleanverseError(
      "shape",
      "Cleanverse response missing code/message strings",
      res.status,
    );
  }
  const dataField = envelope["data"];
  return {
    code,
    message,
    data: (dataField === undefined ? null : (dataField as T)) as T | null,
  };
}

export async function cooperateOk<T = unknown>(
  cfg: CleanverseConfig,
  opts: RequestOpts,
): Promise<T> {
  const env = await cooperateRequest<T>(cfg, opts);
  if (env.code !== "0000") throw new CleanverseError(env.code, env.message);
  return (env.data ?? ({} as T)) as T;
}

/* ── CVI / A-Pass ─────────────────────────────────────────────────────── */

export type GenerateApassRequest = {
  customerId: string;
  kycSource?: string;
  kycId?: string;
  subTier?: number;
  subGroup?: string;
  override?: boolean;
  expirationTime: number;
  wallet: { address: string; chain: string };
  identityDataList?: Array<{
    idType: string;
    fullName: string;
    idNumber?: string;
    validUntil?: string;
    issuingCountryISO2: string;
  }>;
  bankAccountList?: Array<Record<string, unknown>>;
};

export type GenerateApassData = {
  customerId?: string;
  cvRecordId?: string;
  tier?: string;
  wallet?: {
    operate?: string;
    address?: string;
    chain?: string;
    txHash?: string;
    depositUSDCWallet?: string;
    depositUSDTWallet?: string;
    apassAddress?: string;
  };
};

export function generateApass(cfg: CleanverseConfig, body: GenerateApassRequest) {
  return cooperateRequest<GenerateApassData>(cfg, {
    path: "/generate_apass",
    body: body as unknown as Record<string, unknown>,
  });
}

export type ApassRecord = {
  cvRecordId?: string;
  status?: number | string | null;
  tier?: string | number;
  subTier?: number;
  group?: string | null;
  subGroup?: string | null;
  expirationTime?: number;
  currentKycHash?: string;
  countries?: string[];
};

export function queryApass(cfg: CleanverseConfig, address: string, chain = cfg.chain) {
  return cooperateRequest<ApassRecord>(cfg, {
    path: "/query_apass",
    body: { chain, address },
  });
}

export type ApassListItem = {
  cvRecordId?: string;
  customerId?: string;
  chain?: string;
  walletAddress?: string;
  status?: number | null;
  tier?: string;
  subTier?: number;
  group?: string | null;
  subGroup?: string | null;
  countries?: string[];
  expirationTime?: number;
  txHash?: string;
  registeredAt?: string;
};

export function queryApassList(
  cfg: CleanverseConfig,
  filters: {
    page?: number;
    pageSize?: number;
    chain?: string;
    walletAddress?: string;
    customerId?: string;
    status?: number;
  } = {},
) {
  return cooperateRequest<{
    total?: number;
    page?: number;
    pageSize?: number;
    items?: ApassListItem[];
  }>(cfg, { path: "/query_apass_list", body: { page: 1, pageSize: 20, ...filters } });
}

/* ── CVA / A-Token ────────────────────────────────────────────────────── */

export type AtokenListing = {
  origin_token?: { address?: string; symbol?: string; name?: string; decimals?: number };
  atoken?: { address?: string; symbol?: string; name?: string; decimals?: number };
  accesscore_address?: string;
  apass_address?: string;
};

export function queryDepositAtokenList(
  cfg: CleanverseConfig,
  opts: { chain?: string; originSymbol?: string | null; address?: string } = {},
) {
  const chain = opts.chain ?? cfg.chain;
  // Docs: `symbol` filters the ORIGIN token (usdc), not the A-Token (ausdc).
  const symbol = opts.originSymbol === undefined ? cfg.originSymbol : opts.originSymbol;
  return cooperateRequest<{ chain?: string; tokens?: AtokenListing[] }>(cfg, {
    path: "/query_deposit_atoken_list",
    body: {
      chain,
      ...(symbol ? { symbol } : {}),
      ...(opts.address ? { address: opts.address } : {}),
    },
  });
}

export type ComplianceRule = {
  allowed_group: string;
  allowed_sub_group: string;
  min_tier: number;
  min_sub_tier: number;
  is_black_list?: boolean;
  countries?: string[];
};

export type LaunchAtokenRequest = {
  chain: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  admin_address: string;
  rule: ComplianceRule;
  icon: string;
  callback_url?: string;
};

export function launchAtoken(cfg: CleanverseConfig, body: LaunchAtokenRequest) {
  return cooperateRequest<{ requestId?: string; issueAssetId?: number }>(cfg, {
    path: "/atoken/launch",
    body: body as unknown as Record<string, unknown>,
  });
}

export type ApplyStatus = {
  flowType?: string;
  requestId?: string;
  applyStatus?: string;
  rejectReason?: string;
  issueErrorMsg?: string;
  chain?: string;
  atokenAddress?: string;
  originTokenAddress?: string;
  tokenSymbol?: string;
  txHash?: string;
  issuedAt?: string;
  callbackUrl?: string;
  callbackStatus?: string;
  callbackAttempts?: number;
  callbackLastError?: string;
};

export function queryApplyStatus(cfg: CleanverseConfig, requestId: string) {
  return cooperateRequest<ApplyStatus>(cfg, {
    method: "GET",
    path: `/atoken/query_apply_status/${encodeURIComponent(requestId)}`,
  });
}

export type MyAtokenItem = {
  flowType?: string;
  requestId?: string;
  applyStatus?: string;
  chain?: string;
  atokenAddress?: string;
  originTokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  txHash?: string;
  issuedAt?: string;
  createTime?: string;
};

export function listMyAtokens(
  cfg: CleanverseConfig,
  query: {
    page?: number;
    page_size?: number;
    chain?: string;
    apply_status?: string;
    flow_type?: string;
  } = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs}` : "";
  return cooperateRequest<{
    total?: number;
    page?: number;
    pageSize?: number;
    items?: MyAtokenItem[];
  }>(cfg, { method: "GET", path: `/atoken/list_my_atokens${suffix}` });
}

/* ── CCP / pre-transaction (verify_apass) + Validator ─────────────────── */

/**
 * Docs Verify A-Pass — data.code:
 *   1 AToken not found
 *   2 User does not have APass
 *   3 APass exists but cannot transfer (expired/frozen)
 *   4 Success — valid APass and transfer allowed
 */
export type VerifyApassData = {
  chain?: string;
  atoken?: string;
  address?: string;
  code?: number | string;
  message?: string;
  magickLink?: string;
};

export function verifyApass(
  cfg: CleanverseConfig,
  atoken: string,
  address: string,
  chain = cfg.chain,
) {
  return cooperateRequest<VerifyApassData>(cfg, {
    path: "/verify_apass",
    body: { chain, atoken, address },
  });
}

export function validatorIsRegister(
  cfg: CleanverseConfig,
  contractAddress: string,
  chain = cfg.chain,
) {
  return cooperateRequest<{ chain?: string; contract_address?: string; registered?: boolean }>(
    cfg,
    {
      path: "/validator/is_register",
      body: { chain, contract_address: contractAddress },
    },
  );
}

export function validatorVerify(
  cfg: CleanverseConfig,
  contractAddress: string,
  userAddress: string,
  chain = cfg.chain,
) {
  return cooperateRequest<{
    chain?: string;
    contract_address?: string;
    user_address?: string;
    valid?: boolean;
  }>(cfg, {
    path: "/validator/verify",
    body: { chain, contract_address: contractAddress, user_address: userAddress },
  });
}

export function validatorRules(cfg: CleanverseConfig, contractAddress: string, chain = cfg.chain) {
  return cooperateRequest<{
    chain?: string;
    contract_address?: string;
    rules?: ComplianceRule[];
  }>(cfg, {
    path: "/validator/rules",
    body: { chain, contract_address: contractAddress },
  });
}
