# Machine Trust — Track 2 Demo Script (CVI-gated DeFi)

**Track:** Cleanverse Build Track 2 DeFi  
**Live demo (after Render deploy of Track 2 branch):** https://machine-trust.onrender.com/?demo=1#defi  
**Until then:** record against a local/prod build that has Cleanverse + `MACHINE_TRUST_CREDIT_ADDRESS` configured — do not claim live `#defi` while `/health` reports Cleanverse/Monad `unconfigured`.  
**One-pager:** [CLEANVERSE_TRACK2.md](./CLEANVERSE_TRACK2.md)

## On-chain evidence (Monad Testnet · chain 10143)

| Item | Value |
| --- | --- |
| Registry | [`0x83753166684AfB4912a61713c49Feada6298dF19`](https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19) |
| Credit | [`0x918f4Db6F072b28E2eA379Cb53314892D36122B8`](https://testnet.monadvision.com/address/0x918f4Db6F072b28E2eA379Cb53314892D36122B8) |
| Credit deploy | [`0x78cf511b…6ead0c`](https://testnet.monadvision.com/tx/0x78cf511b134dab8129cffc30d95bf31c9ea3bd1e1a6e3eda04976217e96ead0c) |
| DeFi deposit | [`0xfb7c0476…1acb91`](https://testnet.monadvision.com/tx/0xfb7c0476fd3ffc94bab31c50f0e947cbfbe914a0f862eb3fb2fb59ec041acb91) |

## Recording sequence

1. **Problem** — wallet possession ≠ verified identity for DeFi  
2. **Architecture** — CVI → MachineTrustRegistry → MachineTrustCredit  
3. **Connect Fund B** — operator `0xC8bA…9964`  
4. **CVI verification** — live `query_apass` → VERIFIED (`cvRecordId` present)  
5. **Machine identity** — passport / `machineId` from registry artifact  
6. **MachineTrustRegistry** — `ownerOf` matches Fund B → AUTHORIZED  
7. **DeFi eligibility** — ELIGIBLE  
8. **Real transaction** — show confirmed deposit TX on MonadVision (or Open Credit if position closed)  
9. **Negative case** — switch to Unknown wallet → CVI NOT VERIFIED → attempt deposit → REJECTED  
10. **Track 2 close** — “CVI determines whether the machine/operator may participate in DeFi.”

Demo Controller beats **10–12** (`?demo=1`) drive the `#defi` section for silent capture.

## Say on camera

Cleanverse CVI verifies the operator. MachineTrustRegistry binds that wallet to the machine. Only then can MachineTrustCredit accept a real Monad Testnet deposit. Unverified wallets cannot bypass the gate.
