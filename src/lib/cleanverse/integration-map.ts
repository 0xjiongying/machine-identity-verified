/**
 * Internal Cleanverse → Machine Trust integration map.
 *
 * Source: Cleanverse API v5.6 (docs.cleanverse.com/docs/cleanverse), 2026-07-21.
 * Not imported by the UI. Kept as typed documentation next to the adapter.
 */

export type IntegrationAvailability = "REAL" | "SANDBOX" | "UNAVAILABLE";

export type EndpointMapEntry = {
  id: string;
  module: "CVI" | "CVA" | "CCP" | "VALIDATOR" | "COMMON";
  endpoint: string;
  method: "GET" | "POST";
  auth: "api-id header; api-key used locally for AES only (never transmitted)";
  headers: string[];
  encryptedBody: boolean;
  requestBody: string;
  responseBody: string;
  errorHandling: string;
  roles: Array<"Issue Member" | "Gateway Member" | "Service Partner">;
  sandbox: boolean;
  machineTrustMapping: string;
  availability: IntegrationAvailability;
  notes?: string;
};

export const CLEANVERSE_API_VERSION = "v5.6";
export const CLEANVERSE_SANDBOX_BASE = "https://uatapi.cleanverse.com/api/cooperate";
export const CLEANVERSE_PROD_BASE = "https://api.cleanverse.com/api/cooperate";
export const CLEANVERSE_SUPPORTED_CHAINS = [
  "solana",
  "base",
  "avalanche",
  "arbitrum",
  "ethereum",
  "polygon",
  "bsc",
  "monad",
  "hashkey",
  "platon",
] as const;

export const INTEGRATION_MAP: EndpointMapEntry[] = [
  {
    id: "generate_apass",
    module: "CVI",
    endpoint: "/generate_apass",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: true,
    requestBody:
      "{ customerId, expirationTime, wallet:{address,chain}, identityDataList?[{idType,fullName,issuingCountryISO2,…}], … }",
    responseBody: "{ code, message, data:{ customerId, cvRecordId, tier, wallet:{…,txHash} } }",
    errorHandling:
      "Envelope code 0000 success; 0001 bad params; 0002 business; 1000 retry with override; HTTP 403 bad api-id/IP",
    roles: ["Issue Member", "Gateway Member"],
    sandbox: true,
    machineTrustMapping:
      "Issuance / onboarding: bind Machine Passport holder wallet → Cleanverse A-Pass (CVI).",
    availability: "SANDBOX",
  },
  {
    id: "query_apass",
    module: "CVI",
    endpoint: "/query_apass",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "{ chain, address }",
    responseBody:
      "{ code, message, data:{ cvRecordId, status(1|2), tier, subTier, group, subGroup, expirationTime, currentKycHash, countries[] } }",
    errorHandling: "0000 + data; 0002 CN_001 apass not found; HTTP 403",
    roles: ["Issue Member", "Gateway Member", "Service Partner"],
    sandbox: true,
    machineTrustMapping: "CVI gate: resolve issuer/buyer A-Pass before issuance or transfer.",
    availability: "SANDBOX",
  },
  {
    id: "query_apass_list",
    module: "CVI",
    endpoint: "/query_apass_list",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id"],
    encryptedBody: false,
    requestBody: "{ page?, pageSize?, chain?, walletAddress?, customerId?, status? }",
    responseBody: "{ code, message, data:{ total, page, pageSize, items[] } }",
    errorHandling: "0000 success; 0002 business",
    roles: ["Issue Member", "Gateway Member"],
    sandbox: true,
    machineTrustMapping: "Ops / audit: list institution A-Pass registrations.",
    availability: "SANDBOX",
  },
  {
    id: "update_status",
    module: "CVI",
    endpoint: "/update_status",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: true,
    requestBody:
      "{ status(1|2), wallet:{chain,address}, customerId?, cvRecordId?, blacklistReason? }",
    responseBody: "{ code, message, data }",
    errorHandling: "0000 success; 0002 business",
    roles: ["Issue Member", "Gateway Member"],
    sandbox: true,
    machineTrustMapping:
      "Revocation path: freeze A-Pass → subsequent CCP checks fail (data.code 3).",
    availability: "SANDBOX",
    notes: "Not wired into the demo UI freeze control yet; API client exposes it.",
  },
  {
    id: "query_deposit_atoken_list",
    module: "CVA",
    endpoint: "/query_deposit_atoken_list",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "{ chain, symbol?, address? }  // symbol/address are ORIGIN token filters",
    responseBody:
      "{ code, message, data:{ chain, tokens:[{ origin_token, atoken, accesscore_address, apass_address }] } }",
    errorHandling: "0000 success; 0002 failure",
    roles: ["Issue Member", "Gateway Member", "Service Partner"],
    sandbox: true,
    machineTrustMapping:
      "CVA gate: bind Machine Passport to a registered A-Token (Monad aUSDC in sandbox).",
    availability: "SANDBOX",
  },
  {
    id: "launch_atoken",
    module: "CVA",
    endpoint: "/atoken/launch",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: true,
    requestBody:
      "{ chain, token_name, token_symbol, decimals, admin_address, rule:{allowed_group,allowed_sub_group,min_tier,min_sub_tier,is_black_list?,countries?}, icon, callback_url? }",
    responseBody: "{ code, message, data:{ requestId, issueAssetId } }",
    errorHandling: "0000 accepted; poll query_apply_status until ISSUED / REJECTED / ISSUE_FAILED",
    roles: ["Issue Member"],
    sandbox: true,
    machineTrustMapping:
      "CVA issuance: submit custom RWA A-Token application tied to Machine Passport class.",
    availability: "UNAVAILABLE",
    notes:
      "Sandbox accepts the apply (requestId) but Monad on-chain launch currently returns ISSUE_FAILED for custom symbols. Compliance uses registered aUSDC instead.",
  },
  {
    id: "query_apply_status",
    module: "CVA",
    endpoint: "/atoken/query_apply_status/{requestId}",
    method: "GET",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "(path) requestId",
    responseBody:
      "{ code, message, data:{ applyStatus, atokenAddress?, txHash?, issueErrorMsg?… } }",
    errorHandling: "0000; 12015 not found",
    roles: ["Issue Member"],
    sandbox: true,
    machineTrustMapping: "Poll CVA issuance until ISSUED before treating the RWA as transferable.",
    availability: "SANDBOX",
  },
  {
    id: "list_my_atokens",
    module: "CVA",
    endpoint: "/atoken/list_my_atokens",
    method: "GET",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["api-id"],
    encryptedBody: false,
    requestBody: "?page&page_size&chain&apply_status&flow_type",
    responseBody: "{ code, message, data:{ total, page, pageSize, items[] } }",
    errorHandling: "0000 success",
    roles: ["Issue Member"],
    sandbox: true,
    machineTrustMapping: "Inventory institution A-Token applications / ISSUED contracts.",
    availability: "SANDBOX",
  },
  {
    id: "verify_apass",
    module: "CCP",
    endpoint: "/verify_apass",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "{ chain, atoken, address }",
    responseBody:
      "{ code, message, data:{ chain, atoken, address, code(1|2|3|4), message, magickLink } }",
    errorHandling:
      "Envelope 0000 = call ok. data.code 4 allowed; 1 atoken missing; 2 no A-Pass; 3 cannot transfer.",
    roles: ["Issue Member", "Gateway Member", "Service Partner"],
    sandbox: true,
    machineTrustMapping:
      "CCP gate for issuance & transfer: buyer/issuer A-Pass eligibility against the bound A-Token.",
    availability: "SANDBOX",
  },
  {
    id: "validator_verify",
    module: "VALIDATOR",
    endpoint: "/validator/verify",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "{ chain, contract_address, user_address }",
    responseBody:
      "{ code, message, data:{ valid:boolean, … } }  // code 0000 with valid false is not an API error",
    errorHandling: "0000 completed; 12027 on-chain read failed (e.g. paused pool)",
    roles: ["Issue Member"],
    sandbox: true,
    machineTrustMapping:
      "Optional on-chain Validator pool CCP. Requires a registered pool (owner EIP-191 signature).",
    availability: "UNAVAILABLE",
    notes: "No Machine Trust–owned pool registered; grant/register need contract owner signatures.",
  },
  {
    id: "validator_is_register",
    module: "VALIDATOR",
    endpoint: "/validator/is_register",
    method: "POST",
    auth: "api-id header; api-key used locally for AES only (never transmitted)",
    headers: ["Content-Type: application/json", "api-id", "X-Request-ID?"],
    encryptedBody: false,
    requestBody: "{ chain, contract_address }",
    responseBody: "{ code, message, data:{ registered:boolean } }",
    errorHandling: "0000 success",
    roles: ["Issue Member"],
    sandbox: true,
    machineTrustMapping: "Discover whether a CCP validator pool is registered for a contract.",
    availability: "SANDBOX",
  },
];

export const TRACK1_FLOW = [
  "Machine Passport (Machine Trust custody)",
  "CVI: POST /query_apass (issuer) — optionally POST /generate_apass to onboard",
  "CVA: POST /query_deposit_atoken_list → bind A-Token; optional POST /atoken/launch + GET query_apply_status",
  "CCP: POST /verify_apass (issuer against A-Token)",
  "RWA issued (Machine Trust + Monad settlement ref when CCP passes)",
  "Buyer CVI: POST /query_apass (buyer)",
  "Buyer CCP: POST /verify_apass (buyer against A-Token)",
  "Approved/rejected transfer → Monad execution → ownership/audit update",
] as const;
