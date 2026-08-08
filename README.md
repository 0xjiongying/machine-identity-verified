# Machine Trust

**Trust infrastructure for programmable machine assets.**

Turn high-value physical machines into verified, traceable, compliance-aware programmable RWAs — with the Cleanverse Trust Framework (CVI + CVA + Programmed Governance via CCP) in the core issuance and transfer path, and Monad as the settlement layer. Trust before value moves.

Built for the **Cleanverse Build: Trusted Assets Hackathon — Track 1 RWA**.

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Live demo**       | _Add deployed URL (Lovable / Vercel / Cloudflare Workers)_          |
| **Demo video**      | _Add 2–4 min walkthrough — [DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)_ |
| **One-pager**       | [docs/ONE_PAGE_SUMMARY.md](./docs/ONE_PAGE_SUMMARY.md)              |
| **Integration map** | [docs/INTEGRATION_MAP.md](./docs/INTEGRATION_MAP.md)                |
| **Repo**            | https://github.com/0xjiongying/machine-identity-verified            |

> **Action required before submit:** make this GitHub repository **public** (hackathon rule). Visibility is currently private.

---

## Problem

Industrial machines accumulate identity, service history and ownership across siloed systems. Without verified participants and a pre-transaction compliance gate, tokenisation cannot be trusted.

## Solution

```
MACHINE TRUST
       │
       ▼
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

**Machine Trust** answers: _What is the machine?_  
**Cleanverse** answers: _Who may participate, and may this transaction proceed?_ (CVI + CVA interlocking under CCP)  
**Monad** answers: _Where does ownership settle — only after approval?_

---

## Architecture

```
src/
  components/          # UI (passport, issuance, transfer, 3D)
  lib/cleanverse/      # Server-only Cleanverse adapter (API v5.6)
    api.server.ts      # Auth + AES encryption client
    services/          # APass · AToken · Compliance · CommonQuery
    service.server.ts  # Track 1 orchestration (fail closed)
  lib/cleanverse-adapter.ts  # Browser → server boundary (no secrets)
contracts/             # (optional) future custody — not required for CCP
docs/                  # One-pager + integration map
```

Secrets stay in server env (`CLEANVERSE_SANDBOX_API_*`). Never `VITE_*`. Never in the browser.

---

## Cleanverse integration (API v5.6)

| Primitive | Endpoint                          | Controls                                  |
| --------- | --------------------------------- | ----------------------------------------- |
| **CVI**   | `POST /query_apass`               | Issuer/buyer must have active A-Pass      |
| **CVA**   | `POST /query_deposit_atoken_list` | Bind registered Monad aUSDC for the asset |
| **CCP**   | `POST /verify_apass`              | **Only `data.code === 4` is approval**    |

HTTP 200 / envelope `0000` alone is **never** treated as compliance success.

### Honesty matrix

| Capability                         | Label              | Notes                                                                 |
| ---------------------------------- | ------------------ | --------------------------------------------------------------------- |
| CVI `query_apass`                  | **SANDBOX / REAL** | Live UAT with credentials                                             |
| CVA registered bind (aUSDC)        | **SANDBOX / REAL** | Bound at issuance for CCP · `0xaC0893…f20D`                           |
| CVA custom `/atoken/launch`        | **UNAVAILABLE**    | Not on hot path; UAT history `ISSUE_FAILED` — never faked as ISSUED   |
| CCP `verify_apass`                 | **SANDBOX / REAL** | Issuer/Fund → code 4; Unknown → code 2                                |
| Validator pool `/validator/verify` | **UNAVAILABLE**    | Needs owned registered pool                                           |
| Monad settlement                   | **DEMO**           | Settlement **reference** after CCP pass (no fabricated explorer hash) |
| Passport / maintenance / parts     | **DEMO**           | Clearly labelled demo machine metadata                                |

---

## Demo (≤ 2 minutes)

1. **Hero / Inspect** — interactive 3D Machine Asset Core (not stock footage).
2. **Passport** — ABB IRB 6700 demo identity.
3. **Issue Machine Asset** — issuer CVI → CVA bind → CCP → **RWA ISSUED**.
4. **Transfer → Unknown Wallet** — CVI/CCP fail → **TRANSFER BLOCKED**.
5. **Transfer → Equipment Fund B** — CVI + CVA + CCP pass → ownership + audit update.

Use the in-app **Guided demo · 2 min** control (bottom-right).

---

## Setup

```bash
npm install
cp .env.example .env.local
# Fill CLEANVERSE_SANDBOX_API_ID and CLEANVERSE_SANDBOX_API_KEY from the hackathon welcome email.
# Optional: CLEANVERSE_CHAIN=monad CLEANVERSE_ORIGIN_SYMBOL=usdc CLEANVERSE_ATOKEN_SYMBOL=ausdc

npm run cleanverse:audit   # schema checks against UAT
npm run typecheck
npm run dev                # http://localhost:3000 (or Vite default)
npm run build && npm run preview
```

### Environment variables (server only)

| Variable                     | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `CLEANVERSE_API_URL`         | Default sandbox cooperate base              |
| `CLEANVERSE_SANDBOX_API_ID`  | `api-id` header                             |
| `CLEANVERSE_SANDBOX_API_KEY` | Local AES key — **never sent, never VITE_** |
| `CLEANVERSE_CHAIN`           | `monad`                                     |
| `CLEANVERSE_ORIGIN_SYMBOL`   | Origin filter for deposit list (`usdc`)     |
| `CLEANVERSE_ATOKEN_SYMBOL`   | Preferred A-Token (`ausdc`)                 |

Without credentials the adapter runs labelled **DEMO** local CCP — never disguised as live Cleanverse.

---

## Tech

- TanStack Start / React 19 / TypeScript
- React Three Fiber + drei (lazy WebGL, mobile-aware)
- Motion + Lenis
- Cleanverse Cooperate API v5.6 (server functions)

---

## Scalability (roadmap, not live products)

Robotics is the wedge. Same passport + CVI/CVA/CCP pattern extends conceptually to CNC, construction, logistics, energy and industrial equipment — marked as expansion, not shipped markets.

---

## License / notes

Demo entities (ABC Manufacturing, Equipment Fund B) are labelled fixtures bound to sandbox A-Pass wallets. Do not treat them as real institutional customers or financial performance.
