/**
 * Official Monad Testnet explorer helpers.
 * Source: https://docs.monad.xyz/developer-essentials/testnet
 *
 * Safe for client import — no secrets.
 */

export const MONAD_TESTNET = {
  chainId: 10143,
  networkName: "Monad Testnet",
  currency: "MON",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorers: {
    monadvision: "https://testnet.monadvision.com",
    monadscan: "https://testnet.monadscan.com",
  },
  faucet: "https://faucet.monad.xyz",
} as const;

export const MONAD_TESTNET_EXPLORER = MONAD_TESTNET.explorers.monadvision;

/**
 * Public, explorer-verified MachineTrustRegistry deployment + CCP-gated txs.
 * Mirrored from contracts/deployments/monad-testnet.json (no secrets).
 */
export const MACHINE_TRUST_REGISTRY_DEPLOYMENT = {
  network: "Monad Testnet",
  chainId: 10143,
  contractAddress: "0x83753166684AfB4912a61713c49Feada6298dF19" as const,
  deployTx: "0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033" as const,
  registrationTx: "0xdb70d0585ef0afb6662f0813c6eec2822510c7233ad894b6eb8df131e0df8fa6" as const,
  ownershipTransferTx:
    "0x5fa6468338d03c1d18f53e08e8e45fa6c9371641763708a6413dd9ab86e09513" as const,
  ruleAddTx: "0x903fed2f853ca3d92447ce08badd9ed512a16dd6f71732c72415f44ec5f7d6e2" as const,
  ownerAfterTransfer: "0xC8bA032092cC2499637f4E331E841ab24d1c9964" as const,
  ownerAfterRegister: "0x5D6b84e2CAB95b72eD74FB4768324763F4950D9e" as const,
  cleanverseGate: "PASS" as const,
  proofAt: "2026-08-09T01:47:12.454Z" as const,
  explorers: {
    contract: "https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19",
    deployTx:
      "https://testnet.monadvision.com/tx/0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033",
    registrationTx:
      "https://testnet.monadvision.com/tx/0xdb70d0585ef0afb6662f0813c6eec2822510c7233ad894b6eb8df131e0df8fa6",
    ownershipTransferTx:
      "https://testnet.monadvision.com/tx/0x5fa6468338d03c1d18f53e08e8e45fa6c9371641763708a6413dd9ab86e09513",
    ruleAddTx:
      "https://testnet.monadvision.com/tx/0x903fed2f853ca3d92447ce08badd9ed512a16dd6f71732c72415f44ec5f7d6e2",
  },
} as const;

export function monadTestnetTxUrl(txHash: string): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  return `${MONAD_TESTNET_EXPLORER}/tx/${hash}`;
}

export function monadTestnetAddressUrl(address: string): string {
  return `${MONAD_TESTNET_EXPLORER}/address/${address}`;
}

export function isLikelyTxHash(value: string | null | undefined): boolean {
  return Boolean(value && /^0x[a-fA-F0-9]{64}$/.test(value));
}
