# MachineTrustRegistry

Minimal Solidity registry for machine ID, passport hash, Cleanverse asset reference, and ownership.

| Concern | Owner |
| --- | --- |
| CVI / CVA / CCP | Cleanverse Cooperate API (off-chain) |
| Machine passport + presentation | Machine Trust app |
| On-chain ownership state | This contract (when deployed) |

## Status

**NOT DEPLOYED** in the current Track 1 submission.

The live demo records a labelled **Monad settlement reference** after CCP approval. That is **DEMO**, not an explorer-verified Mainnet or Testnet transaction.

Deploy only when you have a funded operator key and a Cleanverse-gated write path that calls `registerMachine` / `transferOwnership` **after** `verify_apass` returns `data.code === 4`.

## Suggested deploy order

1. Monad **Testnet** — verify register + transfer events
2. Wire Machine Trust server to call the contract only on CCP approve
3. Monad **Mainnet** — only claim Mainnet once the tx hash is independently verifiable

## Compile / deploy (explicit — never during Render build)

```bash
npm run registry:compile   # Foundry if installed; otherwise presence check
# Deploy only when you intend to:
export MONAD_TESTNET_RPC_URL=...
export MONAD_TESTNET_PRIVATE_KEY=...
export MACHINETRUST_OPERATOR_ADDRESS=0x...
npm run registry:deploy
# Then set MACHINETRUST_REGISTRY_ADDRESS on Render
```

Runtime writes use `viem` only when RPC + registry address + operator key are all configured.

Do not implement KYC/AML/CVI/CVA inside this contract.
