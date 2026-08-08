import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { evaluateWithCleanverse, resolveMode } from "./cleanverse.server";
import type { CvaCredential, CviCredential } from "@/data/cleanverse-registry";

const credential = z.any();

const schema = z.object({
  kind: z.enum(["issuance", "transfer"]),
  sender: credential,
  recipient: credential.nullable(),
  asset: credential,
});

/** Policy decisions are made server-side — the browser never grades itself. */
export const evaluateCompliance = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) =>
    evaluateWithCleanverse({
      kind: data.kind,
      sender: data.sender as CviCredential,
      recipient: (data.recipient ?? null) as CviCredential | null,
      asset: data.asset as CvaCredential,
    }),
  );

export const getCleanverseMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: resolveMode(),
}));