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

Artifacts:

- Registry: `contracts/deployments/monad-testnet.json`
- Credit: `contracts/deployments/monad-testnet-credit.json` (after deploy)
- Proof: `contracts/deployments/monad-testnet-credit-proof.json` (after proof)

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
