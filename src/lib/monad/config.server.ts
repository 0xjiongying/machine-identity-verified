/**
 * Monad Testnet / registry configuration — server-only.
 *
 * Never import from client components. Private keys stay in process.env.
 */

export type MonadConfig = {
  rpcUrl: string | null;
  registryAddress: string | null;
  hasOperatorKey: boolean;
  networkLabel: string;
  canWrite: boolean;
  chainId: number | null;
};

function trim(value: string | undefined) {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}

export function readMonadConfig(): MonadConfig {
  const rpcUrl = trim(process.env["MONAD_TESTNET_RPC_URL"] ?? process.env["MONAD_RPC_URL"]);
  const registryAddress = trim(process.env["MACHINETRUST_REGISTRY_ADDRESS"]);
  const operatorKey = trim(
    process.env["MONAD_TESTNET_PRIVATE_KEY"] ?? process.env["MONAD_PRIVATE_KEY"],
  );
  const chainIdRaw = trim(process.env["MONAD_CHAIN_ID"]);
  // Official Monad Testnet chain id per docs.monad.xyz/developer-essentials/testnet
  const chainId = chainIdRaw ? Number(chainIdRaw) : rpcUrl ? 10143 : null;

  const hasOperatorKey = Boolean(operatorKey);
  const canWrite = Boolean(rpcUrl && registryAddress && hasOperatorKey);

  return {
    rpcUrl,
    registryAddress,
    hasOperatorKey,
    networkLabel: trim(process.env["MONAD_NETWORK_LABEL"]) ?? (rpcUrl ? "monad-testnet" : "unset"),
    canWrite,
    chainId: Number.isFinite(chainId as number) ? (chainId as number) : null,
  };
}

/** Operator private key — never log or return from health/API surfaces. */
export function readMonadOperatorKey(): string | null {
  return trim(process.env["MONAD_TESTNET_PRIVATE_KEY"] ?? process.env["MONAD_PRIVATE_KEY"]);
}
