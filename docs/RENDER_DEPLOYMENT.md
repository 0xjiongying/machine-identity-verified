# Machine Trust — Render.com Deployment

Single **Web Service** (TanStack Start monolith): SSR UI + Cleanverse server functions + static/3D assets.

```
Browser
  → Render Web Service (Machine Trust)
      → Cleanverse Sandbox API (server-side)
      → Monad Testnet + MachineTrustRegistry (optional, when configured)
```

Do **not** split frontend/backend unless you intentionally redesign server-function transport. Same-origin is the supported production shape.

---

## 1. Required Render services

| Service | Required | Purpose |
| --- | --- | --- |
| Web Service (`machine-trust`) | **Yes** | App + API + health |
| PostgreSQL | **No** | Not used by Track 1 |
| Static Site | **No** | SSR needs the Node server |

Blueprint: [`render.yaml`](../render.yaml)

---

## 2. Build command

```bash
npm install && npm run build
```

`npm run build` sets `NITRO_PRESET=node-server` and emits `.output/server/index.mjs`.

## 3. Start command

```bash
npm start
```

Starts Node on `HOST` (default `0.0.0.0`) and `PORT` (Render-injected).

---

## 4. Required environment variables

### Always

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Injected by Render |
| `FRONTEND_URL` | Public origin (e.g. `https://machine-trust.onrender.com`) — CSRF Origin allowlist for server functions; **never `*`** |

### Cleanverse (server-only — never `VITE_*`)

| Variable | Notes |
| --- | --- |
| `CLEANVERSE_API_URL` | Default `https://uatapi.cleanverse.com/api/cooperate` |
| `CLEANVERSE_SANDBOX_API_ID` | `api-id` header |
| `CLEANVERSE_SANDBOX_API_KEY` | Local AES key — **never transmitted** |
| `CLEANVERSE_CHAIN` | `monad` |
| `CLEANVERSE_ORIGIN_SYMBOL` | `usdc` |
| `CLEANVERSE_ATOKEN_SYMBOL` | `ausdc` |

Without Cleanverse credentials the app starts in labelled **DEMO** local CCP mode (no fake Sandbox success).

### Monad / registry (optional)

| Variable | Notes |
| --- | --- |
| `MONAD_TESTNET_RPC_URL` | Testnet RPC |
| `MONAD_CHAIN_ID` | Default `10143` (override if needed) |
| `MONAD_TESTNET_PRIVATE_KEY` | Operator key — **server only** |
| `MACHINETRUST_REGISTRY_ADDRESS` | Deployed registry address |

If any of these are missing, CCP-approved flows record a **DEMO settlement reference** (never a fabricated explorer hash).

### Not required

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | Not used |
| `CLEANVERSE_DOCS_INVITATION_CODE` | Local docs tooling only |

See [`.env.example`](../.env.example).

---

## 5. PostgreSQL

**Not required.** Skip Render Postgres for this submission.

---

## 6. Cleanverse Sandbox configuration

1. Set `CLEANVERSE_SANDBOX_API_ID` and `CLEANVERSE_SANDBOX_API_KEY` from the hackathon welcome email.
2. Keep `CLEANVERSE_API_URL` on the UAT cooperate base unless Cleanverse provides another.
3. Verify with `GET /health` → `cleanverse.status === "configured"`.
4. Run in-app issuance / transfer; only `verify_apass` `data.code === 4` approves.
5. If Sandbox returns `data.code` 1–3 or envelope errors (e.g. temporary `ComplianceFailed`), the app **fails closed** — do not treat that as an app bug or fabricate approval.

---

## 7. Monad Testnet configuration

1. Set `MONAD_TESTNET_RPC_URL`.
2. Deploy the registry **separately** (never during Render build):

```bash
# Local machine with Foundry
export MONAD_TESTNET_RPC_URL=...
export MONAD_TESTNET_PRIVATE_KEY=...
export MACHINETRUST_OPERATOR_ADDRESS=0xYourOperator
npm run registry:deploy
```

3. Copy the deployed address into Render as `MACHINETRUST_REGISTRY_ADDRESS`.
4. Set the same operator private key as `MONAD_TESTNET_PRIVATE_KEY` on the Web Service.

---

## 8. Contract address configuration

Runtime reads **only** `MACHINETRUST_REGISTRY_ADDRESS`.

No hard-coded deployment address is embedded in the app.

---

## 9. Deployment order

1. (Skip) PostgreSQL — not required  
2. Create Web Service / apply `render.yaml`  
3. Set Cleanverse Sandbox secrets  
4. Set Monad RPC (optional)  
5. Deploy `MachineTrustRegistry` **manually** (optional)  
6. Set `MACHINETRUST_REGISTRY_ADDRESS` (optional)  
7. Deploy / redeploy Web Service  
8. Verify `GET /health`  
9. Set `FRONTEND_URL` to the Render URL  
10. Test Cleanverse mode via UI Integration tag + `/health`  
11. Test Monad status via `/health`  
12. Test full issuance (CVI → CVA → CCP → settle)  
13. Test BLOCKED transfer (Unknown wallet)  
14. Test APPROVED transfer (Fund B)  
15. Verify ownership + audit trail  

---

## 10. Health check

```
GET /health
```

Example (non-sensitive):

```json
{
  "status": "ok",
  "service": "machine-trust",
  "backend": "ok",
  "cleanverse": { "status": "configured", "mode": "live" },
  "database": { "status": "not_required" },
  "monad": { "status": "unconfigured", "registry": "unset", "writeEnabled": false }
}
```

Render `healthCheckPath`: `/health`

---

## 11. Post-deployment testing

```bash
curl -sS https://YOUR-SERVICE.onrender.com/health | jq .
# Open site → Issue Machine Asset → Transfer Unknown (BLOCKED) → Transfer Fund B (APPROVED)
# Confirm no APPROVED UI when CCP fails
# Confirm settlement.kind is demo-settlement-ref unless registry write is configured
```

Local parity:

```bash
npm install
npm run build
npm start
# http://localhost:3000/health
```

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build succeeds, start fails missing `.output` | Wrong start dir / clean build skipped | Ensure buildCommand runs `npm run build` |
| Port bind error | Not listening on `0.0.0.0` / `PORT` | Set `HOST=0.0.0.0`; use `npm start` |
| Cleanverse always DEMO | Missing API id/key on Render | Set secrets; redeploy |
| 403 from Cleanverse UAT | Bot / UA filtering | Server client already sends a browser UA |
| APPROVED without Sandbox | Local DEMO mode | Expected without credentials — labelled in UI |
| Registry write errors | Bad RPC/key/address/gas | Check `/health` monad status; keep DEMO settlement fallback |
| SPA deep link 404 | Static-only host | Must use Web Service (SSR), not Static Site |
| WebGL blank | GPU blocked | App falls back after canvas probe; UI remains usable |

---

## CORS / API

This deploy is a **same-origin monolith** (UI + server functions on one Web Service). Browser CORS to a separate API host is not required.

Server functions are protected by TanStack Start CSRF middleware. When `FRONTEND_URL` is set, its origin is allowlisted together with the request’s own origin. Wildcard CORS is not used.

Do not hardcode `localhost` API bases in client code. Production clients call same-origin server functions only.

---

## Security reminders

- Never prefix Cleanverse or Monad secrets with `VITE_`
- Never commit `.env` / `.env.local`
- Never put secrets in `render.yaml` values (use `sync: false`)
- Never claim Mainnet without an explorer-verifiable tx hash
- Client error pages never include stack traces
