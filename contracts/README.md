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

## Compile (Foundry)

```bash
# from repo root, if Foundry is installed
forge build --contracts contracts/MachineTrustRegistry.sol
```

Do not implement KYC/AML/CVI/CVA inside this contract.
