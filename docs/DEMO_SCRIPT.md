# Machine Trust — Demo Script (silent-capable, 2–4 minutes)

**Track:** Cleanverse Build Track 1 RWA  
**Live demo:** https://machine-trust.onrender.com/?demo=1  
**Local record:** `http://localhost:3000/?demo=1` (captions auto-open)

**Verified execution (Monad Testnet · not Mainnet):**

| Item | Value |
| --- | --- |
| Registry | [`0x83753166684AfB4912a61713c49Feada6298dF19`](https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19) |
| Register TX | [`0xdb70d058…df8fa6`](https://testnet.monadvision.com/tx/0xdb70d0585ef0afb6662f0813c6eec2822510c7233ad894b6eb8df131e0df8fa6) |
| Ownership TX | [`0x5fa64683…e09513`](https://testnet.monadvision.com/tx/0x5fa6468338d03c1d18f53e08e8e45fa6c9371641763708a6413dd9ab86e09513) |
| Owner | Equipment Fund B `0xC8bA032092cC2499637f4E331E841ab24d1c9964` |
| Gate | CVI ✓ → CVA ✓ → CCP (`data.code` 4) ✓ → Monad |

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
| 3:05–3:30 | Monad registry       | `MONAD TESTNET · MachineTrustRegistry · Confirmed`                   | SettlementProof / Architecture |
| 3:30–3:50 | Ownership + Audit    | `OWNERSHIP UPDATED · AUDIT · Machine Registered → Ownership Updated` | Ownership → Audit              |
| 3:50–4:00 | Architecture         | `Cleanverse essential · Passport \| CVI · CVA · CCP \| Monad`        | Architecture + scale           |

**Say on camera:** Cleanverse is essential — CVI, CVA and CCP decide before Monad runs.

## On-camera explorer checks

1. Open register tx on [MonadVision](https://testnet.monadvision.com/tx/0xdb70d0585ef0afb6662f0813c6eec2822510c7233ad894b6eb8df131e0df8fa6) — status success.  
2. Open ownership tx on [MonadVision](https://testnet.monadvision.com/tx/0x5fa6468338d03c1d18f53e08e8e45fa6c9371641763708a6413dd9ab86e09513) — status success.  
3. Show Audit: **Machine Registered → Ownership Updated**.

Official explorer (docs.monad.xyz): `https://testnet.monadvision.com`.

## Do not say / show as fact

- Custom A-Token `/atoken/launch` succeeded (Sandbox: bind registered aUSDC only)
- HTTP 200 alone means compliance approved
- Settlement refs are Monad Mainnet explorer hashes
- Local credential toggles change live Sandbox decisions
- A Monad register/transfer ran when CCP was ComplianceFailed / non–code-4

## Upload

Paste the final video URL into `README.md` and `docs/ONE_PAGE_SUMMARY.md`.
