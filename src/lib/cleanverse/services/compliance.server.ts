/**
 * ComplianceService — CCP pre-transaction gate via verify_apass (+ optional Validator).
 *
 * Docs v5.6 Verify A-Pass — data.code:
 *   1 AToken not found
 *   2 User does not have APass
 *   3 APass exists but cannot transfer (expired/frozen)
 *   4 Success — valid APass and transfer allowed
 *
 * HTTP 200 / envelope 0000 alone is NOT approval. Only data.code === 4 is.
 */

import {
  validatorIsRegister,
  validatorRules,
  validatorVerify,
  verifyApass,
  type CleanverseConfig,
  type Envelope,
  type VerifyApassData,
} from "../api.server";

export type CcpVerdict = {
  allowed: boolean;
  code: string;
  reason: string;
  magickLink: string | null;
  envelope: Envelope<VerifyApassData>;
};

export const ComplianceService = {
  /**
   * Pre-transaction CCP check against a registered A-Token.
   * Never treat HTTP success alone as approval.
   */
  async verifyTransferEligibility(
    cfg: CleanverseConfig,
    atoken: string,
    address: string,
    chain = cfg.chain,
  ): Promise<CcpVerdict> {
    const envelope = await verifyApass(cfg, atoken, address, chain);
    if (envelope.code !== "0000") {
      const msg = envelope.message || `Cleanverse deny (envelope ${envelope.code}).`;
      // On-chain ComplianceFailed(address) — A-Token rule evaluation rejected the wallet.
      // Root cause observed on UAT: empty A-Token rules (`POST /atoken/rules` → rules: []).
      // This is a real CCP deny, not a transport timeout.
      const complianceFailed =
        /ComplianceFailed|failed to validate atoken|failed to check apass/i.test(msg);
      return {
        allowed: false,
        code: envelope.code,
        reason: complianceFailed
          ? `CCP ComplianceFailed for this A-Token/wallet (on-chain). ${msg} — often empty or mismatched A-Token compliance rules (tier/group/countries). Fail-closed — not approved.`
          : msg,
        magickLink: envelope.data?.magickLink ?? null,
        envelope,
      };
    }

    const inner = envelope.data ?? {};
    const code = Number(inner.code);
    if (code === 4) {
      return {
        allowed: true,
        code: "4",
        reason: "Cleanverse verify_apass: valid A-Pass and transfer allowed.",
        magickLink: inner.magickLink ?? null,
        envelope,
      };
    }
    if (code === 1) {
      return {
        allowed: false,
        code: "1",
        reason: "A-Token not found for this chain.",
        magickLink: inner.magickLink ?? null,
        envelope,
      };
    }
    if (code === 2) {
      return {
        allowed: false,
        code: "2",
        reason: "No A-Pass for this address — Cleanverse onboarding required.",
        magickLink: inner.magickLink ?? null,
        envelope,
      };
    }
    if (code === 3) {
      return {
        allowed: false,
        code: "3",
        reason: "A-Pass exists but cannot transfer this A-Token (expired or frozen).",
        magickLink: inner.magickLink ?? null,
        envelope,
      };
    }
    return {
      allowed: false,
      code: String(inner.code ?? "?"),
      reason: inner.message || "Cleanverse denied the pre-transaction check.",
      magickLink: inner.magickLink ?? null,
      envelope,
    };
  },

  /** Optional Validator pool check — only when a registered pool address is configured. */
  async verifyValidatorPool(
    cfg: CleanverseConfig,
    contractAddress: string,
    userAddress: string,
    chain = cfg.chain,
  ) {
    const registered = await validatorIsRegister(cfg, contractAddress, chain);
    if (registered.code !== "0000" || !registered.data?.registered) {
      return {
        available: false as const,
        registered,
        verify: null,
        rules: null,
      };
    }
    const [verify, rules] = await Promise.all([
      validatorVerify(cfg, contractAddress, userAddress, chain),
      validatorRules(cfg, contractAddress, chain),
    ]);
    // Docs: code 0000 with valid:false is a completed check, not an API error.
    const valid = verify.code === "0000" && verify.data?.valid === true;
    return {
      available: true as const,
      registered,
      verify,
      rules,
      valid,
    };
  },
};
