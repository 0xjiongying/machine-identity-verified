/**
 * CommonQueryService — read-only Cleanverse lookups used across Track 1.
 * Docs v5.6 Common Queries module.
 */

import {
  queryApass,
  queryDepositAtokenList,
  verifyApass,
  type CleanverseConfig,
} from "../api.server";

export const CommonQueryService = {
  supportedAtokens(cfg: CleanverseConfig, opts?: { chain?: string; originSymbol?: string | null }) {
    return queryDepositAtokenList(cfg, opts);
  },

  apass(cfg: CleanverseConfig, address: string, chain = cfg.chain) {
    return queryApass(cfg, address, chain);
  },

  verifyApass(cfg: CleanverseConfig, atoken: string, address: string, chain = cfg.chain) {
    return verifyApass(cfg, atoken, address, chain);
  },
};
