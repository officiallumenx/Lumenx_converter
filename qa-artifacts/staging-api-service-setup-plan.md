# LumenX — Dedicated Staging API Service Setup Plan

**Date:** 2026-10-23 (updated: hosted dotenv fix)  
**Scope:** Plan + config fix — no cloud resources created, no login, no deploy, no production changes  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Production Supabase (denylist):** `kmpzflsurepjwqnfqyld`  
**Production API (do not touch):** `https://api.lumenxtech.in`  
**Final status:** `READY FOR MANUAL STAGING SERVICE CREATION`

---

## Status note

Hosted boot no longer requires an on-disk `.env.staging` when Railway injects
`LUMENX_ENV=staging` and gate/Supabase variables (see §8 resolved +
`qa-artifacts/staging-api-config-fix-report.md`). A human must still create the
Railway environment/service and authorize deploy.

---

## 1. Backend service configuration (from repo)

| Item | Value |
| --- | --- |
| Workspace | `@lumenx/api` |
| Backend root | `backend/` |
| Monorepo root (Docker build context) | repository root |
| Build command | `npm run build --workspace=@lumenx/api` → `backend/dist/index.js` (esbuild) |
| Start command (compiled) | `node dist/index.js` (cwd = `backend/`) |
| Local staging start | `npm run start:staging` → `node --env-file=.env.staging dist/index.js` |
| Local staging dev | `npm run dev:staging` |
| Docker | `backend/Dockerfile` — build from monorepo root; `CMD ["node", "dist/index.js"]`; exposes `8787` |
| Healthcheck (Docker) | `GET /api/v1/health` |
| `railway.toml` / `deploy:staging` script | **None in repo** |
| Prior production Railway evidence | Project `pure-quietude`, service `Lumenx_converter` → `https://api.lumenxtech.in` (`qa-artifacts/full-release-deployment-report.md`) |

### Health / readiness endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health` | Liveness — always JSON `status: "ok"`; includes `env` (= `NODE_ENV`) |
| `GET /api/v1/health/ready` | Readiness — Supabase connectivity; FCM may report `degraded` if push disabled |
| `GET /api/v1/health/supabase-public` | Returns staging `SUPABASE_URL` + **anon** key only (never service_role) |

Note: some docs mention `/health`; the implemented route prefix is **`/api/v1/health`**.

### Recommended Railway runtime shape

Prefer **Node build from monorepo** (same as production packaging) rather than inventing a new pipeline:

1. **Root directory / watch paths:** monorepo root (needed for `packages/` + `backend/`).
2. **Build:** `npm ci && npm run build --workspace=@lumenx/api`
3. **Start:** `cd backend && node dist/index.js` (or Railway start command equivalent with `backend` as cwd).
4. **Listen:** `HOST=0.0.0.0`, `PORT` = Railway-provided `$PORT` (map service port to process env).

If using the existing Dockerfile: override `NODE_ENV` (see §3) and ensure staging gate file exists (see §8). Do **not** point Docker `env_file` at production `backend/.env`.

---

## 2. Required environment variable names

Never paste secret values into tickets, chat, or this file. Sources are named only.

### 2.1 Staging isolation gates (mandatory)

| Variable | Staging value source | Notes |
| --- | --- | --- |
| `LUMENX_ENV` | Literal `staging` | Enables fail-closed checks in `backend/src/config/staging.ts` |
| `STAGING_CONFIRMED` | Literal `I_CONFIRM_THIS_IS_NON_PRODUCTION` | Exact phrase; set only after owner confirms non-prod project |
| `STAGING_SUPABASE_PROJECT_REF` | `yveadybpntziyryxsrsu` | Ref only, not full URL |
| `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` | Must include `kmpzflsurepjwqnfqyld` | Start fails if `SUPABASE_URL` ref is denylisted |

### 2.2 Process / HTTP

| Variable | Staging recommendation | Source |
| --- | --- | --- |
| `NODE_ENV` | Prefer `development` for hosted staging | Keeps production packaging gates off (`assertProductionEnv` only when `NODE_ENV=production`). Aligns with `backend/.env.staging.example` |
| `HOST` | `0.0.0.0` | Required on Railway |
| `PORT` | Railway `$PORT` | Do not hardcode only `8787` on hosted |
| `CORS_ORIGINS` | Comma-separated staging + local Vite origins | Operator-defined; see §10 |
| `LOG_LEVEL` | `info` (or `debug` temporarily) | Operator |

**Conflict note:** `backend/Dockerfile` defaults `NODE_ENV=production`. For staging Docker deploys, **override** to `development` unless you intentionally satisfy production OTP/CORS/FCM packaging rules.

### 2.3 Supabase (staging project only)

| Variable | Source |
| --- | --- |
| `SUPABASE_URL` | Staging dashboard → Project URL (`https://yveadybpntziyryxsrsu.supabase.co`) |
| `SUPABASE_ANON_KEY` | Staging dashboard → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging dashboard → service_role (server-only; required for registration RPCs) |

### 2.4 Notifications / OTP (keep non-live on staging)

| Variable | Staging recommendation | Why |
| --- | --- | --- |
| `FCM_WORKER_ENABLED` | `false` | No push worker |
| `FCM_ALLOW_PROD_OUTBOX` | `false` | Never drain production outbox |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Leave unset | Disables Firebase Admin |
| `OTP_DELIVERY_MODE` | `demo` | No live SMS/email |
| `OTP_SMS_PROVIDER` | `none` | |
| `OTP_EMAIL_PROVIDER` | `none` | |
| Twilio / Resend / StartMessaging / webhook OTP secrets | **Omit** | Prevents real contact |

### 2.5 Workers / limits / payments

| Variable | Staging recommendation |
| --- | --- |
| `SUBSCRIPTION_LIFECYCLE_SYNC_MS` | `3600000` or `0` to disable |
| `BACKGROUND_JOBS_INTERVAL_MS` | `60000` or `0` to disable |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Defaults OK (`60000` / `120`) |
| `RATE_LIMIT_AUTH_WINDOW_MS` / `RATE_LIMIT_AUTH_MAX` | Defaults OK (`60000` / `30`) |
| `ONLINE_PAYMENT_PROVIDER` | `none` |
| `NEXUS_OPEN_ACCESS` | `0` / unset |
| `NEXUS_BOOTSTRAP_EMAIL` / `NEXUS_BOOTSTRAP_PASSWORD` | Staging-only fixture credentials if needed; never production passwords |

### 2.6 Laptop / CI smoke only (not required on the Railway service)

| Variable | Where to set | Purpose |
| --- | --- | --- |
| `E2E_API_BASE_URL` | Local `backend/.env.staging` (gitignored) | Point smoke scripts at **hosted** staging URL after creation |
| `SMOKE_API_BASE_URL` | Same | Alias used by some probes |
| `E2E_SMOKE_PASSWORD` | Local `.env.staging` | Synthetic `@lumenx.test` users only |

These do **not** need to be set on the Railway service itself.

---

## 3. Staging isolation checks (runtime)

When `LUMENX_ENV=staging`, startup (`assertStagingEnv`) refuses to boot unless:

1. `STAGING_CONFIRMED` matches the exact phrase.
2. `STAGING_SUPABASE_PROJECT_REF` is set and equals the ref parsed from `SUPABASE_URL`.
3. That ref is **not** in `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST`.
4. Anon + service_role keys are present.

Additionally:

- `loadLumenxDotenv` **does not merge** `backend/.env` when staging is active (avoids attaching production keys from a local file).
- Consent RPCs require staging migrations already applied (`20261023120000`, `20261023140000`) — verified earlier on `yveadybpntziyryxsrsu`.
- FCM gate: with `FCM_WORKER_ENABLED=false`, worker does not start; `FCM_ALLOW_PROD_OUTBOX=false` blocks non-prod draining of a hosted outbox.

**Hard rule:** Never copy production Supabase or Firebase credentials into the staging service.

---

## 4. Proposed service and domain naming (not live)

These are **proposed names only**. They are not claimed to exist and must not be used as if already DNS-live.

| Item | Proposed name |
| --- | --- |
| Railway environment | `staging` |
| Railway service | `LumenX-API-Staging` |
| Custom domain (owner to provision) | `api-staging.lumenxtech.in` (pattern only) |
| Temporary Railway default domain | Whatever Railway assigns after creation (record it; do not guess) |
| Production service (do not redeploy for staging) | `Lumenx_converter` @ `api.lumenxtech.in` |

---

## 5. Railway: same project vs separate project

| Option | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| **A. Same Railway project (`pure-quietude`), new Environment `staging` + new Service `LumenX-API-Staging`** | Shared billing/org; mirrors prior QA guidance | Risk of selecting wrong environment when deploying | **Preferred** if dashboard clearly separates env vars per environment |
| **B. Separate Railway project (e.g. `lumenx-staging`)** | Stronger UI isolation from production | Extra project to manage | Prefer if operators frequently mis-click environments |

**Do not:** Redeploy or overwrite variables on `Lumenx_converter` / production environment.  
**Do not:** Attach custom domain `api.lumenxtech.in` to the staging service.

Repo evidence is insufficient to confirm current Railway UI state (CLI unauthorized this session). Owner must verify project name/id in dashboard before creating resources.

---

## 6. Railway dashboard setup steps (manual — after authorization)

Execute only when an owner authorizes **staging resource creation** (this task does not create anything).

1. Log in to Railway dashboard (human).
2. Open production project **only to identify it** — do not edit production services.
3. Choose Option A or B (§5).
4. Create Environment **`staging`** (Option A) or a new project (Option B).
5. Create Service **`LumenX-API-Staging`** from the LumenX GitHub repo (or empty service + later deploy).
6. Set **Root Directory** / build to monorepo-compatible commands (§1).
7. Add Variables from §2 (staging Supabase keys from staging dashboard only).
8. Resolve §8 (staging dotenv file or approved code fix) **before** first successful boot with `LUMENX_ENV=staging`.
9. Generate a Railway domain **or** attach proposed custom domain `api-staging.lumenxtech.in` (DNS at registrar — owner).
10. Confirm production service URL remains `https://api.lumenxtech.in` unchanged.
11. Record the real staging base URL for `E2E_API_BASE_URL` (laptop `.env.staging`).

---

## 7. Deployment steps (after human authorization — not this task)

1. Confirm target service name is `LumenX-API-Staging` (or Option B equivalent), **not** `Lumenx_converter`.
2. Confirm env: `LUMENX_ENV=staging`, ref `yveadybpntziyryxsrsu`, denylist contains `kmpzflsurepjwqnfqyld`.
3. Confirm `FCM_WORKER_ENABLED=false`, OTP providers `none`, `OTP_DELIVERY_MODE=demo`.
4. Deploy **only** that service (dashboard Deploy / `railway up` with explicit service + staging environment flags — never default-linked production).
5. Wait for deploy healthy.
6. Run health checks (§9).
7. Update local `backend/.env.staging`:
   - `E2E_API_BASE_URL=<hosted-staging-base-url>`
   - `SMOKE_API_BASE_URL=<same>`
8. Run consent / smoke verification (§9).
9. Point Admin/Connect/Transport **staging** Vite envs at the same URL (§10).

### Rollback

1. In Railway staging service: **Rollback** to previous deployment, or **Remove** the staging service if first deploy is bad.
2. Do **not** “fix” staging by deploying to production.
3. Revert laptop `E2E_API_BASE_URL` to `http://127.0.0.1:8787` if hosted staging is taken down.
4. Leave production service and production env vars untouched.
5. Staging Supabase data: soft-delete synthetic fixtures only; no production DB actions.

---

## 8. Hosted `LUMENX_ENV=staging` boot — RESOLVED

**Root cause (fixed):** `loadLumenxDotenv` threw if `.env.staging` was missing whenever `LUMENX_ENV=staging`.

**Fix:** If no staging file exists and `LUMENX_DOTENV` is unset, use Railway-injected `process.env` (`stagingSource: "process_env"`). If a local `.env.staging` exists, load it with `override: false` so platform/`--env-file` values win. `assertStagingEnv` still fail-closes on missing/malformed/denylisted Supabase config **before** DB clients start.

Details / test evidence: `qa-artifacts/staging-api-config-fix-report.md`.

---

## 9. Health and integration verification commands

Replace `<STAGING_API>` with the real hosted base URL after creation (no scheme typos; no production host).

```bash
# Liveness
curl -sS "<STAGING_API>/api/v1/health"

# Readiness (expect supabase ok; fcm messagingReady false is OK when push disabled)
curl -sS "<STAGING_API>/api/v1/health/ready"

# Public anon config — confirm URL host ref is yveadybpntziyryxsrsu (do not log full anon key in shared reports)
curl -sS "<STAGING_API>/api/v1/health/supabase-public"
```

### Consent / registration

| Layer | Command / harness | Notes |
| --- | --- | --- |
| DB RPCs (already PASS) | `node --env-file=backend/.env.staging qa-artifacts/institute-consent-staging-integration.mjs` | Service-role against staging Supabase; not HTTP |
| HTTP API (after hosted API exists) | New or extended smoke against `E2E_API_BASE_URL=<STAGING_API>` calling `POST /api/v1/registrations` | Use synthetic `@lumenx.test` only; clean up Auth + registration rows |
| Unit (pre-deploy) | Backend 20 + Admin 25 consent tests | Already green |

**Do not** run registration smokes against `https://api.lumenxtech.in`.

### Optional broader staging smokes (after API is up)

```bash
cd backend
# With E2E_API_BASE_URL pointing at hosted staging:
npm run smoke:login:staging
```

See `backend/STAGING.md` for fixture side effects and cleanup expectations.

---

## 10. CORS, callbacks, rate limits, frontend

### CORS

Set `CORS_ORIGINS` on the staging API to every browser origin that will call it, for example:

- Local Admin / Connect / Transport Vite: `http://localhost:8081`, `http://localhost:5174`, `http://localhost:5175` (and `127.0.0.1` variants) — already in `.env.staging.example`
- Any future hosted staging Admin/Nexus static origins (owner-defined HTTPS URLs)

Production app origins should **not** be required on staging; avoid pointing production frontends at staging API.

### Supabase Auth callbacks

In **staging** Supabase project Auth settings (not production):

- Add redirect URLs for staging Admin/Connect web origins used in tests.
- Do not change production Auth URL allow-lists for this work.

### Rate limits

Defaults (`RATE_LIMIT_MAX=120`, auth `30`) are fine for staging. Raise only if smoke suites trip limits; do not disable in production.

### Frontend staging env (laptop / staging builds)

| App | Variables to point at staging |
| --- | --- |
| Admin | `VITE_API_BASE_URL=<STAGING_API>`, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for `yveadybpntziyryxsrsu`, `VITE_ADMIN_AUTH_MODE=api` |
| Connect / Transport | Same API + staging anon Supabase |
| Nexus (if used against staging) | Same pattern |

There is **no** committed `apps/admin/.env.staging` today — create a gitignored local file when testing. Never point staging builds at `api.lumenxtech.in` or production Supabase.

Admin already sends `legal_consent` on create/resubmit (`apps/admin/src/lib/registrations/api.ts`).

### Notifications isolation checklist

- [ ] `FCM_WORKER_ENABLED=false`
- [ ] No production Firebase credentials on staging service
- [ ] `OTP_DELIVERY_MODE=demo`, SMS/email providers `none`
- [ ] `ONLINE_PAYMENT_PROVIDER=none`
- [ ] Ready probe shows `fcm.messagingReady: false` (acceptable)

---

## 11. Remaining prerequisites (owner checklist)

1. **Authorize** staging Railway environment/service creation (charges may apply — not done here).
2. Confirm Railway project choice (same project new env vs new project) in dashboard (§5).
3. Set Railway Variables from §2 (names only in plan; values from staging Supabase dashboard).
4. Collect staging Supabase anon + service_role from project `yveadybpntziyryxsrsu` (already migrated).
5. Choose and DNS-register staging API hostname (proposed pattern only until live).
6. After URL exists: set laptop `E2E_API_BASE_URL` / Admin staging Vite API URL.
7. Authorize a **follow-up deploy task** that targets only `LumenX-API-Staging`.
8. Optional: extend HTTP registration smoke harness (current consent harness is RPC-level only).

### Information still needed from owner (do not guess)

| Question | Why |
| --- | --- |
| Confirm Railway project id/name still `pure-quietude` | Prior report only; CLI not logged in this session |
| Preferred Option A vs B (§5) | Isolation vs convenience |
| Approved staging hostname | DNS ownership |
| Whether staging Firebase project exists | Only if push testing is required later |
| Who may authorize cloud spend / deploy | Process gate |

---

## 12. Safety confirmation for this planning task

| Action | Status |
| --- | --- |
| External login | **Not performed** |
| Cloud resource creation | **Not performed** |
| Deploy | **Not performed** |
| Production env/service changes | **Not performed** |
| Commit / push | **Not performed** |
| Secrets printed | **No** |

---

## Related artifacts

| Path | Role |
| --- | --- |
| `backend/STAGING.md` | Local staging runbook |
| `backend/.env.staging.example` | Variable template |
| `backend/DEPLOY.md` | Production packaging |
| `backend/Dockerfile` | Container build/start/health |
| `qa-artifacts/institute-consent-staging-verification-report.md` | Staging DB + RPC PASS |
| `qa-artifacts/institute-consent-staging-api-deployment-report.md` | Deploy blocked — no staging service |

---

## Next status transition

Owner creates `LumenX-API-Staging` with isolated env vars → authorized deploy → health + consent HTTP smoke → `PASS — STAGING API DEPLOYED AND VERIFIED`.

Hosted staging has **not** been verified until that service exists.
