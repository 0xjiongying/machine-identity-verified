# Deployments

Public, explorer-verifiable deployment artifacts only.

| File | Network |
| --- | --- |
| `monad-testnet.json` | Monad Testnet (chain id **10143**) — created only after a real deploy / CCP-gated proof |

Never store private keys here. Runtime uses server env:

- `MONAD_TESTNET_RPC_URL`
- `MONAD_TESTNET_PRIVATE_KEY` (Render / `.env.local` only)
- `MACHINETRUST_REGISTRY_ADDRESS`

Official explorer: https://testnet.monadvision.com  
Official RPC: https://testnet-rpc.monad.xyz  
Docs: https://docs.monad.xyz/developer-essentials/testnet
