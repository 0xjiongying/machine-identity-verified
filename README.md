# Machine Trust

**Trust infrastructure for programmable machine assets.**

Turn high-value physical machines into verified, traceable, compliance-aware programmable RWAs — using the Cleanverse Trust Framework (CVI + CVA + Programmed Governance via CCP) before value moves, with Monad as the execution / settlement layer.

Built for the **Cleanverse Build: Trusted Assets Hackathon — Track 1 RWA**.

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Live demo**       | https://machine-trust.onrender.com                                  |
| **Health**          | https://machine-trust.onrender.com/health                           |
| **Demo video**      | _Add 2–4 min walkthrough — [DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)_ |
| **One-pager**       | [docs/ONE_PAGE_SUMMARY.md](./docs/ONE_PAGE_SUMMARY.md)              |
| **Integration map** | [docs/INTEGRATION_MAP.md](./docs/INTEGRATION_MAP.md)                |
| **Contract**        | [MachineTrustRegistry](https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19) on **Monad Testnet** · [`0x8375…8dF19`](./contracts/deployments/monad-testnet.json) |
| **Deploy tx**       | [`0xa6fbe2a7…af8033`](https://testnet.monadvision.com/tx/0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033) |
| **Repo**            | https://github.com/0xjiongying/machine-identity-verified            |

> **Submission blockers (owner):** (1) make this GitHub repository **public**, (2) set Cleanverse Sandbox secrets on Render when UAT `verify_apass` returns `data.code` 4 again, (3) upload demo video.

---

## Problem

Physical machines are valuable assets, but identity, provenance, ownership and transaction eligibility are fragmented across disconnected systems. Without verified participants and a pre-transaction compliance gate, tokenisation cannot be trusted.

## Solution

Machine Trust creates a **Machine Passport** and connects lifecycle data to compliant RWA issuance and ownership transfer:

```
MACHINE PASSPORT
       │
┌──────┴──────┐
▼             ▼
CVI / A-PASS  CVA / A-TOKEN
│             │
└──────┬──────┘
       ▼
CCP · PROGRAMMED GOVERNANCE
       │
 ┌─────┴─────┐
 ▼           ▼
BLOCK      APPROVE
               │
               ▼
            MONAD
               │
               ▼
      OWNERSHIP UPDATE
               │
               ▼
          AUDIT TRAIL
```

Caption: **Passport → CVI → CVA → CCP → BLOCK | APPROVE → Monad → Ownership → Audit**

| Layer | Owns |
| --- | --- |
| **Machine Trust** | Passport, provenance, maintenance, parts, ownership UI, orchestration |
| **Cleanverse** | Verified identity (CVI), verified asset (CVA), compliance decision (CCP) |
| **Monad** | Execution / settlement after approval |

---

## Architecture (code)

```
src/
  components/                 # Passport, issuance, transfer, 3D, architecture
  lib/cleanverse/
    api.server.ts             # Auth + AES client (server-only)
    services/
      apass.server.ts         # APassService
      atoken.server.ts        # ATokenService
      compliance.server.ts    # ComplianceService (verify_apass)
      common-query.server.ts  # CommonQueryService
    service.server.ts         # Track 1 orchestration (fail closed)
  lib/cleanverse-adapter.ts   # Browser → server boundary (no secrets)
contracts/
  MachineTrustRegistry.sol    # Minimal ownership registry — NOT DEPLOYED
docs/                         # One-pager, integration map, demo script
```

Secrets stay in server env (`CLEANVERSE_SANDBOX_API_*`). Never `VITE_*`. Never in the browser, logs, or UI.

---

## Cleanverse integration (API v5.6 — docs.cleanverse.com)

| Primitive | Endpoint | Controls |
| --- | --- | --- |
| **CVI** | `POST /query_apass` | Issuer / buyer must have an active A-Pass |
| **CVA** | `POST /query_deposit_atoken_list` | Bind registered Monad **aUSDC** at issuance |
| **CCP** | `POST /verify_apass` | **Only `data.code === 4` is approval** |

HTTP 200 / envelope `0000` alone is **never** treated as compliance success.

If the live Sandbox is unreachable, the adapter **fails closed** (no approval, no ownership change). Demo mode without credentials uses a labelled local CCP mirror.

### Honesty matrix

| Capability | Label | Notes |
| --- | --- | --- |
| CVI `query_apass` | **SANDBOX / REAL** | Live UAT with credentials |
| CVA registered bind (aUSDC) | **SANDBOX / REAL** | Status `bound` · address from `query_deposit_atoken_list` (UAT can rotate) |
| CVA custom `/atoken/launch` | **UNAVAILABLE** | Not on hot path; UAT `ISSUE_FAILED` — never faked as ISSUED |
| CCP `verify_apass` | **SANDBOX / REAL** | Unknown → `data.code` 2 (BLOCK). Issuer/Fund currently may return envelope `0002` / atoken validation failure on UAT — app **fails closed** (never fabricates code 4). When UAT recovers, code 4 is the only APPROVE path. |
| Validator pool `/validator/verify` | **UNAVAILABLE** | Needs owned registered pool |
| Monad settlement | **On-chain after CCP only** | Registry **deployed** on Testnet; `registerMachine` / `transferOwnership` refused while UAT CCP returns ComplianceFailed |
| `MachineTrustRegistry` | **DEPLOYED · Monad Testnet** | `0x83753166684AfB4912a61713c49Feada6298dF19` · deploy tx confirmed on [MonadVision](https://testnet.monadvision.com/tx/0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033) |
| Passport / maintenance / parts | **DEMO** | Labelled demo machine metadata |

---

## Demo (2–4 minutes)

Open `/?demo=1` or use **Guided demo** (bottom-right). Captions are silent-video capable.

1. Hero — interactive 3D Machine Asset (COMPACT → READY FOR TRANSFER)
2. Machine Passport — ABB IRB 6700 demo identity
3. Issue Machine Asset — issuer CVI → CVA bind → CCP → **RWA ISSUED**
4. Transfer → Unknown Wallet — **TRANSFER BLOCKED** (`data.code` 2)
5. Transfer → Equipment Fund B — **APPROVED** (`data.code` 4) → ownership + audit
6. Architecture — canonical flow + scale roadmap

Full beat sheet: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)

---

## Setup

```bash
npm install
cp .env.example .env.local
# Fill CLEANVERSE_SANDBOX_API_ID and CLEANVERSE_SANDBOX_API_KEY from the hackathon welcome email.

npm run cleanverse:audit   # schema checks against UAT
npm run typecheck
npm run lint
npm run test
npm run build && npm start
```

### Environment variables (server only)

| Variable | Purpose |
| --- | --- |
| `HOST` / `PORT` | Bind `0.0.0.0` + Render-injected port |
| `FRONTEND_URL` | Public origin allowlist for server-function CSRF (no wildcard) |
| `CLEANVERSE_API_URL` | Sandbox cooperate base |
| `CLEANVERSE_SANDBOX_API_ID` | `api-id` header |
| `CLEANVERSE_SANDBOX_API_KEY` | Local AES key — **never sent, never VITE_** |
| `CLEANVERSE_CHAIN` | `monad` |
| `CLEANVERSE_ORIGIN_SYMBOL` | Origin filter for deposit list (`usdc`) |
| `CLEANVERSE_ATOKEN_SYMBOL` | Preferred A-Token (`ausdc`) |
| `CLEANVERSE_DOCS_INVITATION_CODE` | Docs unlock only — local tooling, never shipped to client |
| `MONAD_TESTNET_*` / `MACHINETRUST_REGISTRY_ADDRESS` | Optional on-chain registry write |

Without credentials the adapter runs labelled **DEMO** local CCP — never disguised as live Cleanverse.

---

## Deployment (Render.com)

Production target is a **single Render Web Service** (TanStack Start monolith — SSR + Cleanverse server functions).

| | |
| --- | --- |
| **Build** | `npm install && npm run build` |
| **Start** | `npm start` (`HOST=0.0.0.0`, `PORT` from Render) |
| **Health** | `GET /health` |
| **Blueprint** | [`render.yaml`](./render.yaml) |
| **Guide** | [`docs/RENDER_DEPLOYMENT.md`](./docs/RENDER_DEPLOYMENT.md) |

Contract deploy is **manual** (`npm run registry:deploy`) — never part of the Render build.

Official Monad Testnet (docs.monad.xyz): chain id `10143`, RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadvision.com`, faucet `https://faucet.monad.xyz`.

```bash
forge test
export MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
export MONAD_TESTNET_PRIVATE_KEY=...          # server only — never commit / never VITE_
export MACHINETRUST_OPERATOR_ADDRESS=0x...
npm run registry:deploy
export MACHINETRUST_REGISTRY_ADDRESS=0x...   # also set on Render
npm run registry:proof                       # CVI→CVA→CCP→register/transfer; refuses unless data.code 4
```

Also see [contracts/README.md](./contracts/README.md). Never claim Mainnet without a verifiable tx.

---

## Limitations

- Custom A-Token launch unavailable on Monad UAT (`ISSUE_FAILED`) — CVA uses registered aUSDC bind
- On-chain validator pool CCP unavailable without an owned pool
- Live UAT `verify_apass` for issuer/fund currently returns **ComplianceFailed** — Machine Trust **fails closed** (no fabricated `registerMachine` / `transferOwnership` txs)
- Passport / maintenance / parts are DEMO fixtures
- Not Mainnet

---

## Scalability (roadmap)

Robotics is the wedge. Same passport + CVI / CVA / CCP pattern extends conceptually to CNC, construction, logistics, energy and industrial equipment — expansion, not shipped markets.

---

## License / notes

Demo entities (ABC Manufacturing, Equipment Fund B) are labelled fixtures bound to sandbox A-Pass wallets. Do not treat them as real institutional customers or financial performance.
