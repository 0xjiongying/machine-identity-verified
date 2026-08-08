# Cleanverse API v5.6 — Machine Trust Integration Map

Source of truth: https://docs.cleanverse.com (Cooperate API **v5.6**, revision 2026-07-21).

| Item            | Value                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sandbox base    | `https://uatapi.cleanverse.com/api/cooperate`                                                                           |
| Production base | `https://api.cleanverse.com/api/cooperate`                                                                              |
| Auth            | Header `api-id` (issued by Cleanverse)                                                                                  |
| Encryption      | AES/CBC/PKCS5Padding, zero IV, body `{"data":"<Base64>"}` for documented write endpoints; **api-key never transmitted** |
| Chain used      | `monad`                                                                                                                 |
| Envelope        | `code "0000"` = API call OK — **not** compliance approval                                                               |
| CCP approval    | `POST /verify_apass` → `data.code === 4` only; live transport failure → fail-closed                                     |
| On-chain registry | `contracts/MachineTrustRegistry.sol` — **NOT DEPLOYED**; settlement refs remain DEMO                                  |

## Endpoints used by Machine Trust

| Endpoint                          | Method | Encrypted | Role                  | Availability      | Machine Trust use                                             |
| --------------------------------- | ------ | --------- | --------------------- | ----------------- | ------------------------------------------------------------- |
| `/query_apass`                    | POST   | No        | Issue/Gateway/Service | **SANDBOX**       | CVI gate — issuer/buyer A-Pass                                |
| `/generate_apass`                 | POST   | Yes       | Issue/Gateway         | **SANDBOX**       | Onboard demo wallets (ops)                                    |
| `/query_apass_list`               | POST   | No        | Issue/Gateway         | **SANDBOX**       | Ops / audit                                                   |
| `/update_status`                  | POST   | Yes       | Issue/Gateway         | **SANDBOX**       | Freeze A-Pass (adapter ready)                                 |
| `/query_deposit_atoken_list`      | POST   | No        | Issue/Gateway/Service | **SANDBOX**       | CVA — bind registered A-Token (`symbol` = origin e.g. `usdc`) |
| `/atoken/launch`                  | POST   | Yes       | Issue                 | **UNAVAILABLE***  | Custom RWA mint apply                                         |
| `/atoken/query_apply_status/{id}` | GET    | No        | Issue                 | **SANDBOX**       | Poll apply until ISSUED / ISSUE_FAILED                        |
| `/atoken/list_my_atokens`         | GET    | No        | Issue                 | **SANDBOX**       | Inventory applies                                             |
| `/verify_apass`                   | POST   | No        | Issue/Gateway/Service | **SANDBOX**       | CCP pre-tx gate (`data.code` 1–4)                             |
| `/validator/is_register`          | POST   | No        | Issue                 | **SANDBOX**       | Pool discovery                                                |
| `/validator/verify`               | POST   | No        | Issue                 | **UNAVAILABLE**** | On-chain validator pool CCP                                   |

\* Custom `/atoken/launch` is **not** on the hot issuance path (historically `ISSUE_FAILED` on Monad UAT). Hot path **binds** the registered Monad **aUSDC** address returned by `query_deposit_atoken_list` for CCP — never fabricates ISSUED. UAT token addresses can rotate.

\*\* Requires Machine Trust–owned registered pool + EIP-191 owner signatures.

## Track 1 flow (code path)

1. Machine Passport (Machine Trust)
2. CVI: `query_apass` (issuer)
3. CVA: `query_deposit_atoken_list` → bind A-Token (+ optional launch attempt)
4. CCP: `verify_apass` issuer → `data.code === 4`
5. RWA issued only if gates pass (Monad settlement **ref** in UAT)
6. Buyer CVI: `query_apass`
7. Buyer CCP: `verify_apass`
8. Approved → ownership + audit; Rejected → blocked, no chain write

## Sandbox demo wallets (public addresses)

| Role                       | Address                                      | Expected              |
| -------------------------- | -------------------------------------------- | --------------------- |
| Issuer (ABC Manufacturing) | `0x5d6b84e2cab95b72ed74fb4768324763f4950d9e` | A-Pass active · CCP 4 |
| Buyer (Equipment Fund B)   | `0xc8ba032092cc2499637f4e331e841ab24d1c9964` | A-Pass active · CCP 4 |
| Unknown                    | `0xda45b2481b679b6a2eacb413fdcf761ab1637d2e` | No A-Pass · CCP 2     |

Typed map also lives in `src/lib/cleanverse/integration-map.ts`.
