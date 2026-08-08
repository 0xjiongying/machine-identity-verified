# MachineTrustRegistry

Minimal Solidity registry for machine ID, passport hash, Cleanverse asset reference, and ownership.

| Concern | Owner |
| --- | --- |
| CVI / CVA / CCP | Cleanverse Cooperate API (off-chain) |
| Machine passport + presentation | Machine Trust app |
| On-chain ownership state | This contract (when deployed) |

## Status

See [`deployments/monad-testnet.json`](./deployments/monad-testnet.json) after a real Monad Testnet deploy. Until that file exists with explorer-verifiable hashes, settlement in the UI may remain a labelled **DEMO** reference.

**Never claim Monad Mainnet** without an independently verifiable Mainnet tx.

## Cleanverse → Monad relationship

```
CVI ✓ → CVA ✓ → CCP ✓ (verify_apass data.code === 4) → MachineTrustRegistry write
```

If Cleanverse returns `ComplianceFailed` or any non-approved state → **BLOCK** → no Monad transaction.

## Compile / test / deploy (explicit — never during Render build)

```bash
# Foundry required (https://book.getfoundry.sh / docs.monad.xyz Foundry guide)
forge build
forge test

export MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
export MONAD_CHAIN_ID=10143
export MONAD_TESTNET_PRIVATE_KEY=...          # never commit
export MACHINETRUST_OPERATOR_ADDRESS=0x...    # constructor operator
npm run registry:deploy

# After deploy:
export MACHINETRUST_REGISTRY_ADDRESS=0x...
# CCP-gated register + transfer (refuses unless verify_apass code 4):
npm run registry:proof
```

Official Testnet (docs.monad.xyz):

| | |
| --- | --- |
| Chain ID | `10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadvision.com` |
| Faucet | `https://faucet.monad.xyz` |

Runtime writes use `viem` only when RPC + registry address + operator key are all configured **and** Cleanverse CCP approved.
