# LumenX staging runbook (Admin · Connect · Transport · shared API)

This document prepares a **dedicated non-production** staging stack. It does **not**
assume the cloud project currently referenced by a local `backend/.env` is staging.

**Do not** apply migrations, smoke probes, or deploys until an owner confirms a
staging Supabase project and fills `backend/.env.staging` (gitignored).

---

## 1. What you need from the project owner

| Item | Purpose |
|------|---------|
| Staging Supabase **project ref** | Host subdomain; must differ from production |
| Staging `SUPABASE_URL` | `https://<staging-ref>.supabase.co` |
| Staging **anon** key | Browser + API anon client |
| Staging **service-role** key | Server-only; never put in Vite / apps |
| Production project ref(s) | Put in `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` |
| Written confirmation | Owner asserts the project is non-production |
| Staging API base URL | Local `http://127.0.0.1:8787` or a hosted staging API |
| Optional staging Firebase | Separate FCM project or leave FCM disabled |
| Two smoke institutes (for tenant probe) | Names below, or create before `smoke:tenant` |

Never paste real keys into git, chat logs, or this file.

---

## 2. Configure `backend/.env.staging`

```bash
cd backend
cp .env.staging.example .env.staging
```

Edit `.env.staging` (placeholders only in the example):

1. Set `LUMENX_ENV=staging`
2. Set `STAGING_CONFIRMED=I_CONFIRM_THIS_IS_NON_PRODUCTION` **only after** owner confirmation
3. Set `STAGING_SUPABASE_PROJECT_REF` to the staging ref
4. Set `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` to the production ref (and any other forbidden refs)
5. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for **staging only**
6. Keep `FCM_ALLOW_PROD_OUTBOX=false` and prefer `FCM_WORKER_ENABLED=false` unless using a staging Firebase project
7. Prefer `OTP_DELIVERY_MODE=demo` unless deliberately testing SMS against staging

### Fail-closed guard

When `LUMENX_ENV=staging`, the API and staging smoke scripts refuse to start unless:

- confirmation phrase matches exactly
- `STAGING_SUPABASE_PROJECT_REF` equals the ref inside `SUPABASE_URL`
- that ref is **not** on `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST`
- anon + service-role keys are present

Staging mode **does not** merge `backend/.env`, so production keys cannot silently attach.

---

## 3. Frontend apps (Admin / Connect / Transport)

Point each app at the **staging API** and **staging anon** Supabase project (never service-role):

| App | Typical local origin | Variables |
|-----|----------------------|-----------|
| Admin | `http://127.0.0.1:8081` | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_AUTH_MODE=api` |
| Connect | `http://127.0.0.1:5174` | same API + staging Supabase anon |
| Transport | `http://127.0.0.1:5175` | same API + staging Supabase anon |

Use separate local env files (gitignored), e.g. `.env.staging.local`, and keep production `.env` / `.env.production` untouched.

Add the same origins to staging API `CORS_ORIGINS`.

---

## 4. Start the API against staging and check health

From `backend/` (with `.env.staging` filled):

```bash
# Dev (tsx watch)
npm run dev:staging

# Or compiled
npm run build
npm run start:staging
```

Health (no secrets printed):

```bash
curl -sS http://127.0.0.1:8787/health
# expect JSON with status ok
```

If the process exits with `Staging environment refused to start`, fix `.env.staging` confirmation / ref mismatch / denylist — do **not** weaken the guard.

Optional: set `E2E_API_BASE_URL` / `SMOKE_API_BASE_URL` in `.env.staging` when the API is not on localhost.

---

## 5. Trip uniqueness migration (staging only)

Migration file:

`supabase/migrations/20261009180000_transport_trip_vehicle_date_slot_unique.sql`

### 5.1 Read-only duplicate audit (run in staging SQL Editor)

```sql
SELECT vehicle_id, trip_date, slot, COUNT(*) AS n,
       array_agg(id ORDER BY created_at) AS trip_ids
FROM public.transport_trip
WHERE deleted_at IS NULL
GROUP BY vehicle_id, trip_date, slot
HAVING COUNT(*) > 1;
```

If rows appear: resolve **manually** (soft-delete unintended extras; keep the authoritative trip). Do not auto-merge. Do not run remediation against production from this laptop.

### 5.2 Apply to staging only

Preferred (linked **staging** project — never prod-ref):

```bash
npx supabase link --project-ref <STAGING_PROJECT_REF>
# confirm the linked ref is staging before continuing
npx supabase db push
```

Or paste **only** that migration SQL into the **staging** Supabase SQL Editor after the audit is clean.

### 5.3 Verify index

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'transport_trip'
  AND indexname = 'transport_trip_vehicle_date_slot_live_uidx';
```

### 5.4 Rollback (staging)

```sql
DROP INDEX IF EXISTS public.transport_trip_vehicle_date_slot_live_uidx;
```

### 5.5 Concurrent-start check

After the index exists, use **disposable** staging vehicle/driver/route data and two parallel `POST /api/v1/transport/trips` with different `client_event_id` values for the same vehicle/date/slot. Expect one success and one conflict (or reconcile to a single live row). Do not use production vehicles.

---

## 6. Security smoke sequence (staging only)

Prerequisites:

1. Owner-confirmed staging project + filled `.env.staging`
2. Staging API healthy (`/health`)
3. For `smoke:tenant`: institutes named exactly  
   - `LumenX E2E Test Institute`  
   - `LumenX E2E Isolation Institute`  
   must already exist (script resolves by name; it does not create institutes)
4. Operator / outsider auth users may be updated by fixtures (see §7)

Recommended order:

```bash
cd backend

# 1) Login / role smoke (may provision Connect/Transport smoke users)
npm run smoke:login:staging

# 2) Cross-tenant isolation (seeds disposable academic/student rows via API)
npm run smoke:tenant:staging

# 3) Optional read-only auth provider check (explicit opt-in)
#    Set LIVE_AUTH_VERIFY=1 in .env.staging only when intentional
npm run verify:auth:live:staging
```

Do **not** run the non-`:staging` smoke scripts against an ambiguous `backend/.env` cloud project.

Stop if any step fails; do not disable RLS or weaken authorization to force a pass.

---

## 7. What the smoke scripts create / modify (cleanup)

| Script | Writes? | Effects | Cleanup |
|--------|---------|---------|---------|
| `smoke:login` | Yes (unless `E2E_SKIP_FIXTURES=1`) | Ensures Auth users + profiles for `smoke.connect.*` / `smoke.transport.driver@lumenx.test`; may create teacher/parent/student/driver rows; updates operator password for `lumenx.e2e.operator@lumenx.test` | Soft-delete or disable smoke users/rows in **staging** when finished; rotate smoke passwords |
| `smoke:tenant` | Yes | Requires two named institutes; ensures tenant admin users/memberships; seeds academic year/class/section/student via API; ends outsider memberships; updates outsider/operator passwords | Soft-delete probe-seeded years/classes/students (`Probe AY …` / codes with random suffix); leave institutes if shared fixtures |
| `verify:auth:live` | No (when `LIVE_AUTH_VERIFY=1`) | Read-only `listUsers` against Supabase Admin + Firebase Admin | None |

Smoke emails use `@lumenx.test` — keep them out of production projects.

There is **no** automated teardown. Prefer a disposable staging database that can be reset.

---

## 8. Safe command cheat-sheet (after owner confirmation)

```bash
# Config
cd backend && cp .env.staging.example .env.staging
# …fill staging-only values; set denylist to production ref…

# API
npm run dev:staging
curl -sS http://127.0.0.1:8787/health

# Migration (staging-linked CLI only)
npx supabase link --project-ref <STAGING_PROJECT_REF>
# run duplicate audit SQL, then:
npx supabase db push

# Smokes
# API + fixture logins only (shell probes FAIL unless Vite apps are already up):
npm run smoke:login:staging
# Reuses ready shells, starts missing ones on STAGING.md ports (staging anon only),
# waits for readiness, runs smoke:login, then stops only processes it spawned:
npm run smoke:login:staging:with-shells

# Shell ports: Admin 8081, Nexus 8080, Connect 5174, Transport 5175,
# Admissions 5177, Careers 5176, Website 8082.
npm run smoke:tenant:staging
# optional:
# LIVE_AUTH_VERIFY=1 in .env.staging
npm run verify:auth:live:staging

# Hosted staging multi-role Playwright (opt-in; anon browser clients only)
# node --env-file=.env.staging ../e2e/staging/ensure-multi-role-fixtures.mjs
# STAGING_E2E=1 npm run test:e2e:staging-multi-role   # from repo root; Admin:8081 + Connect:5174 + API
```

---

## 9. Explicit non-goals

- Do not treat the existing laptop `backend/.env` cloud project as staging by default
- Do not `supabase link` / `db push` to production from this runbook
- Do not commit `.env.staging` or any real keys
- Do not run smokes until staging is confirmed and the API is healthy
