# Machine Trust — Demo Script (silent-capable, 2–4 minutes)

**Track:** Cleanverse Build Track 1 RWA  
**Live demo:** https://machine-trust.onrender.com/?demo=1  
**Local record:** `http://localhost:3000/?demo=1` (captions auto-open)

If Render has Cleanverse secrets and UAT `verify_apass` returns `data.code` 4, record the live SANDBOX path. If UAT returns `ComplianceFailed`, show fail-closed honesty — then optionally demo local DEMO mode for the approve path with clear labels.

Captions in the Guided demo are designed so the story works **without narration**.

## Beat sheet

| Time      | Beat                 | On-screen caption                                                    | Action                         |
| --------- | -------------------- | -------------------------------------------------------------------- | ------------------------------ |
| 0:00–0:20 | Problem + product    | `PROBLEM → fragmented machine records · PRODUCT → Machine Trust RWA` | Hero · brand **Machine Trust** |
| 0:20–0:50 | 3D + Passport        | `INTERACTIVE 3D MACHINE → MACHINE PASSPORT`                          | Inspect → Passport             |
| 0:50–1:20 | CVI issuer           | `CVI / A-PASS · ISSUER → must be VERIFIED before issuance`           | Credentials · issuer card      |
| 1:20–1:50 | CVA asset issuance   | `ISSUANCE · CVI → CVA (bind aUSDC) → CCP → RWA ISSUED`               | Issue Machine Asset            |
| 1:50–2:15 | CCP compliance       | Verdict banner `verify_apass · CCP · APPROVED`                       | Hold on VerdictBanner          |
| 2:15–2:35 | Unverified → BLOCKED | `BUYER A · UNVERIFIED → TRANSFER BLOCKED`                            | Unknown Wallet                 |
| 2:35–3:05 | Verified → APPROVED  | `BUYER B · VERIFIED → CCP APPROVED`                                  | Equipment Fund B               |
| 3:05–3:30 | Monad transaction    | `MONAD SETTLEMENT → after CCP only`                                  | Settlement / ownership panel   |
| 3:30–3:50 | Ownership + Audit    | `OWNERSHIP UPDATED · AUDIT TRAIL`                                    | Ownership → Audit              |
| 3:50–4:00 | Architecture         | `Cleanverse essential · Passport \| CVI · CVA · CCP \| Monad`        | Architecture + scale           |

**Say on camera:** Cleanverse is essential — CVI, CVA and CCP decide before Monad runs.

## Do not say / show as fact

- Custom A-Token `/atoken/launch` succeeded (Sandbox: bind registered aUSDC only)
- HTTP 200 alone means compliance approved
- Settlement refs are mainnet explorer hashes
- Local credential toggles change live Sandbox decisions

## Upload

Paste the final video URL into `README.md` and `docs/ONE_PAGE_SUMMARY.md`.
