/**
 * ATokenService — Cleanverse Verified Asset (CVA / A-Token).
 * Docs v5.6: /query_deposit_atoken_list, /atoken/launch, query_apply_status, list_my_atokens.
 */

import {
  launchAtoken,
  listMyAtokens,
  queryApplyStatus,
  queryDepositAtokenList,
  type AtokenListing,
  type CleanverseConfig,
  type ComplianceRule,
  type Envelope,
  type LaunchAtokenRequest,
} from "../api.server";

export type BoundAtoken = {
  address: string;
  symbol: string | null;
  name: string | null;
  originSymbol: string | null;
  listing: AtokenListing;
};

function pickListing(listings: AtokenListing[], preferredAtoken: string | null) {
  if (!preferredAtoken) return listings[0];
  return (
    listings.find((l) => l.atoken?.symbol?.toLowerCase() === preferredAtoken.toLowerCase()) ??
    listings[0]
  );
}

export const ATokenService = {
  listSupported(cfg: CleanverseConfig, opts?: { chain?: string; originSymbol?: string | null }) {
    return queryDepositAtokenList(cfg, opts);
  },

  async bindRegistered(cfg: CleanverseConfig): Promise<{
    envelope: Envelope<{ chain?: string; tokens?: AtokenListing[] }>;
    bound: BoundAtoken | null;
  }> {
    const envelope = await queryDepositAtokenList(cfg);
    const listings = envelope.data?.tokens ?? [];
    const listing = pickListing(listings, cfg.atokenSymbol);
    const address = listing?.atoken?.address ?? null;
    if (!listing || !address) return { envelope, bound: null };
    return {
      envelope,
      bound: {
        address,
        symbol: listing.atoken?.symbol ?? null,
        name: listing.atoken?.name ?? null,
        originSymbol: listing.origin_token?.symbol ?? null,
        listing,
      },
    };
  },

  launch(cfg: CleanverseConfig, body: LaunchAtokenRequest) {
    return launchAtoken(cfg, body);
  },

  /** Attempt custom RWA launch; returns apply status honestly (may be ISSUE_FAILED). */
  async launchAndPoll(cfg: CleanverseConfig, body: LaunchAtokenRequest, polls = 4, delayMs = 2500) {
    const submitted = await launchAtoken(cfg, body);
    const requestId = submitted.data?.requestId;
    if (!requestId || submitted.code !== "0000") {
      return { submitted, status: null as Awaited<ReturnType<typeof queryApplyStatus>> | null };
    }
    let status = await queryApplyStatus(cfg, requestId);
    for (let i = 0; i < polls; i++) {
      const s = status.data?.applyStatus;
      if (s && s !== "PENDING" && s !== "APPROVED" && s !== "ISSUING") break;
      await new Promise((r) => setTimeout(r, delayMs));
      status = await queryApplyStatus(cfg, requestId);
    }
    return { submitted, status };
  },

  queryApplyStatus(cfg: CleanverseConfig, requestId: string) {
    return queryApplyStatus(cfg, requestId);
  },

  listMine(cfg: CleanverseConfig, query?: Parameters<typeof listMyAtokens>[1]) {
    return listMyAtokens(cfg, query);
  },

  defaultMachineRule(countries: string[]): ComplianceRule {
    return {
      allowed_group: "",
      allowed_sub_group: "",
      min_tier: 0,
      min_sub_tier: 0,
      is_black_list: false,
      countries,
    };
  },
};
