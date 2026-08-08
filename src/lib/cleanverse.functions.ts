import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { evaluateWithCleanverse, resolveMode } from "./cleanverse/service.server";
import type { AtokenRecord, CvaCredential, CviCredential } from "./cleanverse/types";

const wallet = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "wallet must be a 20-byte hex address");

const cviCredential = z.object({
  schema: z.literal("cleanverse:cvi:v1"),
  id: z.string().min(1).max(200),
  type: z.literal("CleanverseVerifiedIdentity"),
  holder: z.object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    wallet,
    did: z.string().min(1).max(300),
  }),
  status: z.enum(["active", "revoked", "expired", "absent"]),
  kycTier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  accreditation: z.enum(["institutional", "operator", "none"]),
  jurisdiction: z.string().min(1).max(64),
  issuedAt: z.string().min(1).max(64),
  expiresAt: z.string().min(1).max(64),
  proof: z.object({
    type: z.string().min(1).max(100),
    verificationMethod: z.string().min(1).max(300),
  }),
});

const cvaCredential = z.object({
  schema: z.literal("cleanverse:cva:v1"),
  id: z.string().min(1).max(200),
  type: z.literal("CleanverseVerifiedAsset"),
  subject: z.object({
    passportId: z.string().min(1).max(200),
    serial: z.string().min(1).max(200),
    assetClass: z.string().min(1).max(200),
  }),
  status: z.enum(["active", "suspended"]),
  transferable: z.boolean(),
  attestations: z
    .array(
      z.object({
        code: z.string().min(1).max(64),
        label: z.string().min(1).max(200),
        attestor: z.string().min(1).max(200),
        validUntil: z.string().min(1).max(64),
        status: z.enum(["valid", "expired"]),
      }),
    )
    .max(32),
  restrictions: z.object({
    allowedJurisdictions: z.array(z.string().min(1).max(16)).max(64),
    minKycTier: z.number().int().min(0).max(3),
    allowedAccreditation: z.array(z.enum(["institutional", "operator", "none"])).max(8),
  }),
  proof: z.object({
    type: z.string().min(1).max(100),
    verificationMethod: z.string().min(1).max(300),
  }),
});

const aTokenRecord = z.object({
  ref: z.string().min(1).max(300),
  tokenId: z.string().min(1).max(300),
  credentialId: z.string().min(1).max(200),
  passportId: z.string().min(1).max(200),
  status: z.enum(["bound", "minted", "active", "suspended", "unissued"]),
  transferable: z.boolean(),
  attestations: z.number().int().min(0).max(64),
  mintedAt: z.string().min(1).max(64).nullable(),
  contractAddress: z.string().max(80).nullable().optional(),
});

const schema = z.object({
  kind: z.enum(["issuance", "transfer"]),
  sender: cviCredential,
  recipient: cviCredential.nullable(),
  asset: cvaCredential,
  aToken: aTokenRecord.nullable().optional(),
});

/**
 * One server entry point for the whole Cleanverse chain:
 * CVI (A-Pass) → CVA (A-Token) → CCP pre-transaction → Monad.
 * The browser never grades itself and never holds a Cleanverse credential.
 */
export const evaluateCompliance = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) =>
    evaluateWithCleanverse({
      kind: data.kind,
      sender: data.sender as CviCredential,
      recipient: (data.recipient ?? null) as CviCredential | null,
      asset: data.asset as CvaCredential,
      aToken: (data.aToken ?? null) as AtokenRecord | null,
    }),
  );

export const getCleanverseMode = createServerFn({ method: "GET" }).handler(async () => {
  const mode = resolveMode();
  return {
    mode,
    /** Docs version the adapter is written against. */
    apiVersion: "v5.6" as const,
  };
});
