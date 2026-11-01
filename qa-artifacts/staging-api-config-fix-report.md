# LumenX — Staging API Config Fix for Railway

**Date:** 2026-10-23  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Production denylist:** `kmpzflsurepjwqnfqyld`  
**Final status:** `READY FOR MANUAL STAGING SERVICE CREATION`

No Railway resources created, no login, no deploy, no production changes, no commit/push.

---

## Root cause

`backend/src/config/load-dotenv.ts` (and the smoke-script twin `backend/scripts/load-lumenx-dotenv.mjs`) treated `LUMENX_ENV=staging` as requiring an on-disk `.env.staging` file and threw if it was missing.

That file is gitignored and is not present in a clean Railway image. Hosted staging therefore could not boot even when all required variables were injected by Railway.

Validation of the real Supabase project ref already lived in `assertStagingEnv` (runs in `index.ts` **before** Supabase clients / workers). The gap was only the dotenv gate.

---

## Fix summary

| Behavior | After fix |
| --- | --- |
| `LUMENX_ENV=staging` + no `.env.staging` + no `LUMENX_DOTENV` | Use `process.env` (`stagingSource: "process_env"`) |
| Local `.env.staging` present | Load with `override: false` (Railway / `--env-file` wins; file fills gaps) |
| Explicit `LUMENX_DOTENV` pointing at missing path | Still throws (operator asked for that file) |
| Non-staging | Unchanged — loads `.env` only; never requires `.env.staging` |
| Secrets in image | Still not packaged; Railway Variables only |

Also: `collectStagingEnvIssues` now rejects `FCM_ALLOW_PROD_OUTBOX=true` when `LUMENX_ENV=staging`.

Startup order unchanged and still fail-closed before side effects:

1. `loadLumenxDotenv()`
2. `assertStagingEnv(process.env)`
3. `loadEnv()` / `assertProductionEnv` (no-op for staging when `NODE_ENV≠production`)
4. Then Supabase / Firebase / workers

---

## Files changed

| Path | Change |
| --- | --- |
| `backend/src/config/load-dotenv.ts` | Hosted process-env staging; file optional; `override: false` |
| `backend/scripts/load-lumenx-dotenv.mjs` | Same behavior for smoke scripts |
| `backend/src/config/staging.ts` | Docs + reject `FCM_ALLOW_PROD_OUTBOX` in staging |
| `backend/src/config/load-dotenv.test.ts` | **New** — hosted / local / explicit-missing / default |
| `backend/src/config/staging.test.ts` | Expanded isolation cases for real staging/prod refs |
| `backend/STAGING.md` | Hosted Railway boot note; health path `/api/v1/health` |
| `qa-artifacts/staging-api-service-setup-plan.md` | §8 resolved; status → READY |

---

## Required Railway environment variable NAMES

Set on service `LumenX-API-Staging` / environment `staging` only. **Do not print values.**

### Isolation gates

- `LUMENX_ENV` (= `staging`)
- `STAGING_CONFIRMED` (= `I_CONFIRM_THIS_IS_NON_PRODUCTION`)
- `STAGING_SUPABASE_PROJECT_REF` (= `yveadybpntziyryxsrsu`)
- `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` (must include `kmpzflsurepjwqnfqyld`)

### Process

- `NODE_ENV` (prefer `development` for staging packaging gates)
- `HOST` (`0.0.0.0`)
- `PORT` (Railway `$PORT`)
- `CORS_ORIGINS`
- `LOG_LEVEL` (optional)

### Supabase (staging project only)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Notifications / OTP (initial staging)

- `FCM_WORKER_ENABLED` (= `false`)
- `FCM_ALLOW_PROD_OUTBOX` (= `false` or unset)
- `OTP_DELIVERY_MODE` (= `demo`)
- `OTP_SMS_PROVIDER` (= `none`)
- `OTP_EMAIL_PROVIDER` (= `none`)

Omit Firebase / Twilio / Resend / StartMessaging secrets for initial staging.

### Laptop only (after URL exists)

- `E2E_API_BASE_URL` / `SMOKE_API_BASE_URL` in local `backend/.env.staging`

---

## Staging / production isolation checks

| Check | Mechanism |
| --- | --- |
| Label alone insufficient | `STAGING_SUPABASE_PROJECT_REF` must equal ref parsed from `SUPABASE_URL` |
| Production ref rejected | Denylist includes `kmpzflsurepjwqnfqyld` |
| Staging ref accepted | Tests use `yveadybpntziyryxsrsu` |
| Missing / malformed URL | Fail with actionable codes; no JWT/secret echo |
| Missing anon/service keys | Fail closed |
| Prod outbox drain | `FCM_ALLOW_PROD_OUTBOX` forbidden in staging |
| Production startup | Staging collector returns `[]` when `LUMENX_ENV` ≠ `staging` |
| No silent prod `.env` merge | Staging path never loads `backend/.env` |

---

## Test and build results

```text
npm test -- --run src/config/
→ Test Files  3 passed
→ Tests       20 passed (20)
  - load-dotenv.test.ts  5
  - staging.test.ts      9
  - remote-write-ack     6

npm run build --workspace=@lumenx/api
→ PASS (dist/index.js); scan: old “Staging mode requires” throw absent;
  process_env staging path present; no packaged .env.staging

git diff --check (changed config/STAGING paths)
→ exit 0
```

Typecheck/lint: backend workspace still has pre-existing tooling gaps (`packages/utils` `window` under `tsc`; ESLint 9 config missing). Not introduced by this change. Focused config tests + build are green.

Diff review: no secrets, no production URL fallbacks, no `.env.staging` added to the repo or image.

---

## Remaining manual setup (not done here)

1. Human creates Railway env `staging` + service `LumenX-API-Staging`.
2. Set the variable **names** above with staging-only values.
3. Authorize deploy of that service only (never `api.lumenxtech.in`).
4. Verify `GET /api/v1/health` and `/ready` on the real staging URL.
5. Point `E2E_API_BASE_URL` at hosted staging; run HTTP registration smoke with synthetic fixtures.

**Hosted staging is not verified until that service exists.**

---

## Safety confirmation

| Action | Status |
| --- | --- |
| Railway login / resource create / deploy | **Not performed** |
| Production modified | **No** |
| Commit / push | **No** |
| Secrets logged | **No** |
