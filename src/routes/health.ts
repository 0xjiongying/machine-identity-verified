import { createFileRoute } from "@tanstack/react-router";

import { readConfig as readCleanverseConfig } from "@/lib/cleanverse/api.server";
import { resolveMode } from "@/lib/cleanverse/service.server";
import { readMonadConfig } from "@/lib/monad/config.server";

/**
 * Production health check for Render (and local ops).
 * Never returns secrets, keys, or wallet material.
 */
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        const cleanverse = readCleanverseConfig();
        const mode = resolveMode();
        const monad = readMonadConfig();

        const body = {
          status: "ok" as const,
          service: "machine-trust",
          timestamp: new Date().toISOString(),
          backend: "ok",
          cleanverse: cleanverse
            ? {
                status: "configured" as const,
                mode,
                environment: cleanverse.environment,
                chain: cleanverse.chain,
              }
            : {
                status: "unconfigured" as const,
                mode: "demo" as const,
                note: "CLEANVERSE_SANDBOX_API_ID / KEY missing — adapter runs labelled DEMO CCP",
              },
          database: {
            status: "not_required" as const,
          },
          monad: {
            status: monad.rpcUrl
              ? monad.registryAddress
                ? monad.hasOperatorKey
                  ? ("configured" as const)
                  : ("registry_set_no_operator" as const)
                : ("rpc_only" as const)
              : ("unconfigured" as const),
            network: monad.networkLabel,
            registry: monad.registryAddress ? "set" : "unset",
            writeEnabled: monad.canWrite,
          },
        };

        return Response.json(body, {
          headers: {
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
