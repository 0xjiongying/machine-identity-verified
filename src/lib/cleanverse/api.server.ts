/**
 * Cleanverse HTTP client — the ONLY place credentials and endpoints live.
 *
 * Configure with (server-side env only, never VITE_ prefixed):
 *   CLEANVERSE_API_URL           sandbox base URL
 *   CLEANVERSE_SANDBOX_API_ID    sandbox API ID / client id
 *   CLEANVERSE_SANDBOX_API_KEY   sandbox API key / secret
 *   CLEANVERSE_ISSUER_DID        (optional) issuing entity DID
 *
 * When these are absent the service layer runs the local CCP engine instead
 * and every surface is labelled DEMO. Nothing here fabricates a response: a
 * failed call is returned as a failure and the transaction fails closed.
 */

export type CleanverseConfig = {
  baseUrl: string;
  apiId: string;
  apiKey: string;
  issuerDid?: string;
};

export function readConfig(): CleanverseConfig | null {
  const baseUrl = process.env["CLEANVERSE_API_URL"];
  const apiId = process.env["CLEANVERSE_SANDBOX_API_ID"] ?? "";
  const apiKey = process.env["CLEANVERSE_SANDBOX_API_KEY"] ?? process.env["CLEANVERSE_API_KEY"];
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiId,
    apiKey,
    ...(process.env["CLEANVERSE_ISSUER_DID"]
      ? { issuerDid: process.env["CLEANVERSE_ISSUER_DID"]! }
      : {}),
  };
}

async function call<T>(
  cfg: CleanverseConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      // Sandbox auth: API ID identifies the app, API key authenticates it.
      "x-api-key": cfg.apiKey,
      ...(cfg.apiId ? { "x-api-id": cfg.apiId } : {}),
      authorization: `Bearer ${cfg.apiKey}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cleanverse ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** CVI — resolve and verify an A-Pass for a holder DID. */
export function verifyApass(cfg: CleanverseConfig, did: string) {
  return call<Record<string, unknown>>(cfg, "GET", `/v1/cvi/apass/${encodeURIComponent(did)}`);
}

/** CVA — mint the A-Token for a verified asset at issuance. */
export function mintAtoken(
  cfg: CleanverseConfig,
  payload: { credentialId: string; passportId: string; serial: string; issuerDid: string },
) {
  return call<Record<string, unknown>>(cfg, "POST", "/v1/cva/atokens", payload);
}

/** CCP — pre-transaction compliance decision. */
export function ccpPreTransaction(
  cfg: CleanverseConfig,
  payload: {
    rulesetId: string;
    intent: "issuance" | "transfer";
    subject: string;
    holderDid: string;
    counterpartyDid: string | null;
    aTokenId: string | null;
  },
) {
  return call<Record<string, unknown>>(cfg, "POST", "/v1/ccp/pre-transaction", payload);
}