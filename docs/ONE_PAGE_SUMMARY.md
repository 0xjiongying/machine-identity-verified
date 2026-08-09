# MACHINE TRUST

**Verified RWA infrastructure for programmable machine assets.**

Cleanverse Build: Trusted Assets — **Track 1 RWA**

---

## PROBLEM

Physical machines are valuable real-world assets, but identity, provenance, ownership and transaction eligibility are fragmented across disconnected systems. Without verified participants and a compliance gate, a tokenised machine is only a picture of a machine.

## SOLUTION

Machine Trust creates a **Machine Passport** for a physical machine and connects lifecycle data to compliant programmable asset issuance and ownership transfer:

**Physical Machine → Passport → CVI → CVA → CCP → RWA → Verified Buyer → CCP → Monad → Ownership**

Aligned with the Cleanverse Trust Framework: interlocking **CVI** (verified identity), **CVA** (verified asset), and **Programmed Governance** operationalised by the **CCP** — trust before value is issued, transferred, or settled.

## CVI / A-PASS

**Where:** Issuer verification at RWA issuance; buyer verification at transfer.

**What it controls:** Whether a wallet has an active Cleanverse A-Pass (`POST /query_apass`). If CVI fails, issuance or transfer **does not proceed**.

**Sandbox evidence:** Issuer & Equipment Fund B resolve active A-Passes; Unknown Wallet does not.

## CVA / A-TOKEN

**Where:** From the issuance stage — asset bound before CCP.

**What it represents:** Cleanverse verified asset layer via registered Monad **aUSDC** (`POST /query_deposit_atoken_list`). Issuance **binds** that A-Token for CCP (status `bound`). Custom `/atoken/launch` is not claimed as ISSUED — Sandbox history shows `ISSUE_FAILED`; never fabricated.

## CCP / VALIDATOR COMPLIANCE

**Where:** Pre-transaction gate for issuance and transfer via `POST /verify_apass` — Programmed Governance on interlocking CVI + CVA.

**Rule:** HTTP 200 / envelope `0000` is **not** approval. Only `data.code === 4` allows the transaction. Codes 1–3 → **BLOCKED**. Live Sandbox transport failure → **fail-closed**. On-chain validator pools are adapter-ready but unavailable without an owned registered pool.

## DEPLOYED CHAINS

| Layer | Status |
| --- | --- |
| Cleanverse Sandbox (Monad chain param) | **REAL** API calls |
| Monad Testnet | Official RPC · chain id **10143** · explorer [testnet.monadvision.com](https://testnet.monadvision.com) |
| `MachineTrustRegistry` | **DEPLOYED** [`0x83753166684AfB4912a61713c49Feada6298dF19`](https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19) |
| Deploy tx | [`0xa6fbe2a7…af8033`](https://testnet.monadvision.com/tx/0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033) |
| Register tx | [`0xdb70d058…df8fa6`](https://testnet.monadvision.com/tx/0xdb70d0585ef0afb6662f0813c6eec2822510c7233ad894b6eb8df131e0df8fa6) · confirmed |
| Ownership tx | [`0x5fa64683…e09513`](https://testnet.monadvision.com/tx/0x5fa6468338d03c1d18f53e08e8e45fa6c9371641763708a6413dd9ab86e09513) · owner Fund B |
| Proof time | `2026-08-09T01:47:12Z` (UTC) · CCP-gated · not Mainnet |
| CCP | Issuer + Fund **`data.code` 4** → only then Monad writes |

**Contract role:** Registers machine ownership and records transfers on Monad Testnet after Cleanverse CVI → CVA → CCP APPROVE.

## CORE FLOW

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

**Passport → CVI → CVA → CCP → BLOCK | APPROVE → Monad → Ownership → Audit**

## DEMO (2–4 min)

1. Explore Machine Asset (3D · COMPACT → READY)
2. Issue Machine Asset (issuer CVI → CVA bind → CCP → RWA ISSUED)
3. Transfer to Unknown Wallet → **BLOCKED**
4. Transfer to Equipment Fund B → **APPROVED** → ownership + audit
5. Architecture

Open `/?demo=1` — see `docs/DEMO_SCRIPT.md`.

## HONESTY LABELS

| REAL | SANDBOX | DEMO ONLY | ROADMAP |
| --- | --- | --- | --- |
| Monad Testnet registry + register/ownership txs (explorer-confirmed) | CVI/CVA/CCP via UAT Cooperate API v5.6 | Passport/maintenance metadata; local CCP when secrets unset | Custom A-Token ISSUED; validator pool CCP; Mainnet |

**Live demo:** https://machine-trust.onrender.com  
**Health:** https://machine-trust.onrender.com/health  
**Demo video:** _add 2–4 min link — see docs/DEMO_SCRIPT.md_  
**Repo:** https://github.com/0xjiongying/machine-identity-verified

> **Submission blockers (owner):** (1) make GitHub **public**, (2) set Cleanverse secrets on Render (`CLEANVERSE_SANDBOX_API_*`), (3) upload demo video.  
> **CCP note:** Empty A-Token rules caused on-chain `ComplianceFailed` for A-Pass holders. Machine Trust queries `/atoken/rules` and adds a permissive rule via `/atoken/add_rule` when empty, then requires `verify_apass` `data.code` 4 before Monad writes.
