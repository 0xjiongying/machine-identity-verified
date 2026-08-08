/**
 * APassService — Cleanverse Verified Identity (CVI / A-Pass).
 * Docs v5.6: /generate_apass, /query_apass, /query_apass_list, /update_status.
 */

import {
  generateApass,
  queryApass,
  queryApassList,
  type ApassListItem,
  type ApassRecord,
  type CleanverseConfig,
  type Envelope,
  type GenerateApassRequest,
} from "../api.server";

export type ApassLookup = {
  envelope: Envelope<ApassRecord>;
  active: boolean;
  ref: string | null;
  countries: string[];
  tier: string | null;
  status: number | string | null | undefined;
};

function isActive(env: Envelope<ApassRecord>): boolean {
  const record = env.data ?? {};
  return (
    env.code === "0000" &&
    !!record.cvRecordId &&
    (record.status === 1 ||
      record.status === "1" ||
      record.status === undefined ||
      record.status === null)
  );
}

export const APassService = {
  query(cfg: CleanverseConfig, address: string, chain = cfg.chain): Promise<Envelope<ApassRecord>> {
    return queryApass(cfg, address, chain);
  },

  async lookup(cfg: CleanverseConfig, address: string, chain = cfg.chain): Promise<ApassLookup> {
    const envelope = await queryApass(cfg, address, chain);
    const record = envelope.data ?? {};
    return {
      envelope,
      active: isActive(envelope),
      ref: record.cvRecordId ?? null,
      countries: Array.isArray(record.countries) ? record.countries : [],
      tier: record.tier !== undefined && record.tier !== null ? String(record.tier) : null,
      status: record.status,
    };
  },

  list(
    cfg: CleanverseConfig,
    filters: Parameters<typeof queryApassList>[1] = {},
  ): Promise<
    Envelope<{ total?: number; page?: number; pageSize?: number; items?: ApassListItem[] }>
  > {
    return queryApassList(cfg, filters);
  },

  generate(cfg: CleanverseConfig, body: GenerateApassRequest) {
    return generateApass(cfg, body);
  },
};
