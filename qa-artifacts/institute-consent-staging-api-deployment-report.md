# Institute Consent — Staging API Deployment Report

**Date:** 2026-10-23  
**Staging Supabase:** `yveadybpntziyryxsrsu` (migrations already verified)  
**Production (untouched):** `kmpzflsurepjwqnfqyld` / `https://api.lumenxtech.in`  
**Final status:** `BLOCKED — STAGING TARGET NOT SAFELY IDENTIFIED`

---

## Verdict

**No distinct hosted staging API service exists in this repository’s deployment configuration.**  
The only documented Railway / public API target is production (`https://api.lumenxtech.in`). Per safety rules, that service was **not** used. **No deploy was performed.**

Staging Supabase migrations and RPC integration remain valid (prior report: `PASS — STAGING MIGRATIONS AND INTEGRATION VERIFIED`). Hosted API rollout of the consent code is blocked until an owner creates a separate staging API service.

---

## 1. Staging deployment configuration inspection

| Item | Finding |
| --- | --- |
| `backend/STAGING.md` | Documents **local** `npm run dev:staging` / `start:staging` against `.env.staging`; hosted staging API is optional |
| `backend/DEPLOY.md` | Production packaging only (Railway / Docker / PM2) |
| `backend/package.json` | Has `dev:staging` / `start:staging`; **no** `deploy:staging` script |
| `railway.toml` / staging deploy workflow | **None** |
| Prior QA evidence | `transport-staging-readiness-next-steps.md`, `transport-staging-blocker-resolution-report.md`: Railway env list = **only production**; linked URL = `https://api.lumenxtech.in` |
| This run: `railway status` / `environment list` | **Unauthorized** (`railway login` required) — cannot create or select a staging environment from this session |
| Docs ADR note | `docs/backend/ADR-nexus-platform-certificate-templates.md` §11: “no separate hosted staging” / hosted staging optional |

### Configured API URLs (non-secret)

| Source | Value |
| --- | --- |
| `backend/.env.staging` → `E2E_API_BASE_URL` | `http://127.0.0.1:8787` (local process only) |
| Production app env / Admin production | `https://api.lumenxtech.in` (**not used**) |
| Distinct `https://api-staging.…` (or equivalent) | **Not found** |

**Decision:** STOP before deploy. Do not repurpose `api.lumenxtech.in`.

---

## 2. Staging Supabase / consent RPC env (presence only)

Checked via `node --env-file=backend/.env.staging qa-artifacts/_check-staging-api-target.mjs` (no secret values printed):

| Check | Result |
| --- | --- |
| `LUMENX_ENV` | `staging` |
| `STAGING_SUPABASE_PROJECT_REF` | `yveadybpntziyryxsrsu` |
| `SUPABASE_URL` project ref | `yveadybpntziyryxsrsu` |
| Matches expected staging | **true** |
| Is production denylist ref | **false** |
| `SUPABASE_ANON_KEY` present | **true** |
| `SUPABASE_SERVICE_ROLE_KEY` present | **true** (required for registration RPCs via Hono) |
| Points at production API host | **false** |

Local staging process env is correctly wired for Supabase staging. That does **not** constitute a deployed staging API service.

---

## 3. Quality gates (pre-deploy evidence; deploy skipped)

| Gate | Result |
| --- | --- |
| Backend consent tests (3 files) | **20/20 PASS** |
| Admin consent/registration tests (3 files) | **25/25 PASS** |
| `npm run build` (`@lumenx/api`) | **PASS** → `backend/dist/index.js` (2.0mb) |
| `git diff --check` (consent-related paths) | **PASS** (exit 0) |
| `npm run typecheck` (`@lumenx/api`) | **FAIL** — unrelated `packages/utils` `window` / `StorageEvent` errors under backend `tsc` project; not introduced by consent RPCs |
| `npm run lint` (`@lumenx/api`) | **FAIL** — ESLint 9 finds no `eslint.config.*` in backend workspace (tooling gap; not consent-specific) |

---

## 4. Deployment

| Action | Result |
| --- | --- |
| Deploy to staging hosted API | **NOT RUN** — no distinct staging service |
| Deploy to `api.lumenxtech.in` | **NOT RUN** (forbidden) |
| Commit / push | **NOT RUN** |
| Migrations | **NOT RUN** (already applied on staging Supabase; out of scope) |

---

## 5. Health / HTTP registration verification

| Check | Result |
| --- | --- |
| Hosted staging health/ready | **NOT RUN** — no staging URL |
| Synthetic HTTP registration against staging API | **NOT RUN** |
| Existing harness `institute-consent-staging-integration.mjs` | Targets **Supabase RPCs** with service role; does **not** call `POST /api/v1/registrations`. Prior 9/9 PASS remains DB-layer evidence only |

---

## 6. Admin client staging targeting

| Check | Result |
| --- | --- |
| Admin sends `legal_consent` on create/resubmit | **PASS** (code + unit tests) — `apps/admin/src/lib/registrations/api.ts` |
| Admin staging env file (`.env.staging` / `.env.staging.local`) | **Not present** in workspace |
| Admin production `VITE_API_BASE_URL` | `https://api.lumenxtech.in` — must not be used for this rollout |
| Staging Admin → staging API E2E | **NOT RUN** — blocked by missing staging API URL |

---

## 7. Production confirmation

| Claim | Evidence |
| --- | --- |
| Production API not deployed | No `railway up` / no push to `api.lumenxtech.in` |
| Production migrations/secrets/data | Untouched |
| Secrets not printed | Env probe prints presence/refs only |

---

## 8. Blocker — owner actions required

To unblock a safe staging API deploy:

1. Create a **new** Railway environment/service (or other host) named for **staging** — do **not** redeploy `Lumenx_converter` production.
2. Load variables from `backend/.env.staging.example` using staging Supabase keys for `yveadybpntziyryxsrsu` only (`LUMENX_ENV=staging`, confirmation phrase, denylist including `kmpzflsurepjwqnfqyld`).
3. Publish a **distinct** public URL (e.g. `https://api-staging.…`), never `api.lumenxtech.in`.
4. Set `E2E_API_BASE_URL` / Admin `VITE_API_BASE_URL` to that URL for staging tests.
5. Re-authorize this task (or a follow-up) to deploy **only** that service, then run health + HTTP registration smoke with a synthetic fixture.

Optional interim (not a deploy): local `npm run start:staging` on `:8787` for developer smoke — does not satisfy hosted staging deployment criteria.

---

## Related artifacts

| Path | Role |
| --- | --- |
| `qa-artifacts/institute-consent-staging-verification-report.md` | Staging DB migrations + RPC integration PASS |
| `qa-artifacts/institute-server-side-consent-report.md` | Design / unit readiness |
| `qa-artifacts/institute-consent-staging-integration.mjs` | Synthetic DB RPC harness (not HTTP API) |
| `backend/STAGING.md` | Local staging runbook |

---

## Remaining blockers

1. **Primary:** No distinct staging API deployment target (BLOCKED).  
2. Railway CLI not logged in this session (cannot inventory/create staging env).  
3. Backend workspace typecheck/lint tooling failures (pre-existing / unrelated to consent; fix separately before production packaging claims).  
4. Admin lacks a staging Vite env pointing at a non-production API host.
