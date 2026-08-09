# Cleanverse Track 2 — CVI-gated DeFi

## Problem

Machine/AI wallets can interact with DeFi, but wallet possession alone does not establish verified identity or accountable machine authorization.

## Solution

**MachineTrustRegistry** connects **Cleanverse CVI** identity verification to machine authorization and DeFi eligibility via **MachineTrustCredit**.

## CVI Integration Points

```
CVI (POST /query_apass)
  ↓
wallet identity verification (APassService.lookup)
  ↓
MachineTrustRegistry.ownerOf(machineId)
  ↓
machine authorization
  ↓
MachineTrustCredit.setCviEligible + openCreditDeposit
  ↓
DeFi eligibility → real Monad Testnet transaction
```

| Layer | Code |
| --- | --- |
| CVI API | `src/lib/cleanverse/services/apass.server.ts` → `APassService.lookup` |
| Eligibility | `src/lib/lending/eligibility.server.ts` → `evaluateTrack2Eligibility` |
| On-chain write | `src/lib/lending/credit.server.ts` → `applyCviEligibilityOnChain` / `openCreditDepositOnChain` |
| Server fns | `src/lib/lending.functions.ts` |
| UI | `src/components/defi/LendingMarket.tsx` |
| Contract | `contracts/MachineTrustCredit.sol` |

## DeFi Primitive

- **Action:** Open credit deposit (stake MON into MachineTrustCredit)
- **Eligibility:** live CVI `active` A-Pass **AND** `registry.ownerOf(machineId) == wallet`
- **Rejection:** CVI unverified **OR** not machine owner → simulate/write reverts (`NotCviVerified` / `NotMachineOwner`); server refuses submit
- **Bypass resistance:** `openCreditDeposit` is `onlyOracle` and still checks `cviEligible` + registry ownership on-chain

## Track 1 CCP honesty

Issuer/fund CCP `ComplianceFailed` states are **not** rewritten. Track 2 requires **CVI or CVA** — this implementation uses **CVI only**.

## Deployed Chain

Monad Testnet · chain ID **10143**

| Item | Value |
| --- | --- |
| MachineTrustRegistry | `0x83753166684AfB4912a61713c49Feada6298dF19` |
| MachineTrustCredit | `0x918f4Db6F072b28E2eA379Cb53314892D36122B8` |
| Credit deploy TX | `0x78cf511b134dab8129cffc30d95bf31c9ea3bd1e1a6e3eda04976217e96ead0c` |
| setCviEligible (Fund B) | `0xe4f627571781d15a05552d8fbcf3b9ce947424dd5de8db14cd8a5b95ebf081d7` |
| openCreditDeposit | `0xfb7c0476fd3ffc94bab31c50f0e947cbfbe914a0f862eb3fb2fb59ec041acb91` |
| Negative path | Unknown wallet `query_apass` code `0002` → `NotCviVerified` |

Artifacts:

- Registry: `contracts/deployments/monad-testnet.json`
- Credit: `contracts/deployments/monad-testnet-credit.json`
- Proof: `contracts/deployments/monad-testnet-credit-proof.json`

Live demo: https://machine-trust.onrender.com/#defi  
GitHub: https://github.com/0xjiongying/machine-identity-verified

## Commands

```bash
forge test
npm run credit:deploy   # requires MONAD_* + MACHINETRUST_* 
npm run credit:proof    # Case D reject + Case C deposit
```

## Demo story

1. Connect Fund B wallet  
2. Show CVI VERIFIED (live query_apass)  
3. Show machine passport / MachineTrust AUTHORIZED  
4. Show DeFi ELIGIBLE  
5. Open Credit Deposit → Monad tx confirmed  
6. Switch to Unknown wallet  
7. CVI NOT VERIFIED · DeFi LOCKED  
8. Attempt deposit → REJECTED  
