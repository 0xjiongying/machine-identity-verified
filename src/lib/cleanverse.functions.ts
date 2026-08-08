import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { evaluateWithCleanverse, resolveMode } from "./cleanverse/service.server";
import type { AtokenRecord, CvaCredential, CviCredential } from "./cleanverse/types";

const anyCredential = z.any();

const schema = z.object({
  kind: z.enum(["issuance", "transfer"]),
  sender: anyCredential,
  recipient: anyCredential.nullable(),
  asset: anyCredential,
  aToken: anyCredential.nullable().optional(),
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

export const getCleanverseMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: resolveMode(),
}));
