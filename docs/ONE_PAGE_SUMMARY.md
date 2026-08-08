# MACHINE TRUST

**Verified RWA infrastructure for programmable machine assets.**

Cleanverse Build: Trusted Assets — **Track 1 RWA**

---

## PROBLEM

Physical machines are valuable real-world assets, but identity, provenance, ownership and transaction eligibility are fragmented across disconnected systems. Without verified participants and a compliance gate, a tokenised machine is only a picture of a machine.

## SOLUTION

Machine Trust creates a **Machine Passport** for a physical machine and connects lifecycle data to compliant programmable asset issuance and ownership transfer:

**Physical Machine → Passport → CVI → CVA → CCP → RWA → Verified Buyer → CCP → Monad → Ownership**

Aligned with the Cleanverse Trust Framework: interlocking **CVI** (verified identity), **CVA** (verified asset), and **Programmed Governance** operationalised by the **CCP** — so trust is established before value is issued, transferred, or settled.

## CVI / A-PASS

**Where:** Issuer verification at RWA issuance; buyer verification at transfer.

**What it controls:** Whether a wallet has an active Cleanverse A-Pass (`POST /query_apass`). If CVI fails, issuance or transfer **does not proceed**.

**Sandbox evidence:** Issuer & Equipment Fund B resolve active A-Passes; Unknown Wallet does not.

## CVA / A-TOKEN

**Where:** From the issuance stage — asset bound before CCP.

**What it represents:** Cleanverse verified asset layer via registered Monad **aUSDC** (`POST /query_deposit_atoken_list`). Issuance **binds** that A-Token for CCP (status `bound`). Custom `/atoken/launch` is not claimed as ISSUED — Sandbox history shows `ISSUE_FAILED`; never fabricated.

## CCP / PROGRAMMED GOVERNANCE

**Where:** Pre-transaction gate for issuance and transfer via `POST /verify_apass` — Cleanverse Compliance Protocol enforcing eligibility on interlocking CVI + CVA.

**Rule:** HTTP 200 / envelope `0000` is **not** approval. Only `data.code === 4` allows the transaction. Codes 1–3 → **BLOCKED**. On-chain validator pools are adapter-ready but unavailable without an owned registered pool.

## DEPLOYED CHAINS

| Layer                                  | Status                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cleanverse Sandbox (Monad chain param) | **REAL** API calls                                                                                                |
| Monad settlement                       | **Demo settlement reference** after CCP approval (no fabricated tx hash; custody write when contract is deployed) |

## CORE FLOW

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

## DEMO (≤ 2 min)

1. Explore Machine Passport (ABB IRB 6700 — demo metadata)
2. Issue Machine Asset (issuer CVI → CVA bind → CCP → RWA ISSUED)
3. Transfer to Unknown Wallet → **BLOCKED**
4. Transfer to Equipment Fund B → **APPROVED** → ownership + audit update

## HONESTY LABELS

| REAL                                   | SANDBOX                | DEMO ONLY                                           | ROADMAP                                                     |
| -------------------------------------- | ---------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| CVI/CVA/CCP API calls with credentials | UAT Cooperate API v5.6 | Passport/maintenance metadata; Monad settlement ref | Custom A-Token ISSUED; validator pool CCP; custody contract |

**Live demo:** _add deployed URL (Lovable / Vercel / Cloudflare Workers)_  
**Demo video:** _add 2–4 min link — see docs/DEMO_SCRIPT.md_  
**Repo:** https://github.com/0xjiongying/machine-identity-verified

> **Submission blocker:** GitHub currently reports the repository as **private**. Hackathon rules require a **public** repo — flip visibility in GitHub Settings before submit.
