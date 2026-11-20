# Cross-App Data Sharing — QA Report (Fees · Leave · Announcements · Certificates)

**Date:** 2026-10-20  
**Verdict:** `PASS (scoped)` — staging multi-role browser/API green for attendance, marks, homework, fees, leave, announcements, and certificates; focused API Vitest green; Connect/Admin/API typechecks green.  
**Staging project:** `yveadybpntziyryxsrsu`  
**Shared/default (untouched):** `kmpzflsurepjwqnfqyld`

---

## 1. Staging identity (this run)

| Check | Status |
|-------|--------|
| `backend/.env.staging` → `yveadybpntziyryxsrsu.supabase.co` | **PASS** (gate + fixtures) |
| `LUMENX_ENV=staging` + `STAGING_CONFIRMED` | **PASS** |
| Shared/default `kmpzflsurepjwqnfqyld` modified | **PASS** (untouched) |
| Fixtures refreshed | **PASS** (`e2e/staging/ensure-multi-role-fixtures.mjs`; certificate template includes `family_id`) |
| Secrets printed | **PASS** (none) |

---

## 2. Verified test counts (this run)

| Suite | Command | Result | Status |
|-------|---------|--------|--------|
| Focused module API Vitest | `fees` + `leave` + `announcements` + `certificates` + `certificates-numbering` + `documents` + `cross-app-data-sharing` | **64/64** | **PASS** |
| Marks + homework + cross-app | `marks` + `homework` + `cross-app-data-sharing` | **45/45** | **PASS** |
| Staging multi-role — new modules | `run-multi-role-with-shells.mjs` fees\|leave\|announcements\|certificates | **8/8** | **PASS** |
| Staging multi-role — prior modules | attendance\|marks\|homework | **6/6** | **PASS** |
| Staging multi-role combined | 14 Playwright tests across two shell batches | **14/14** | **PASS** |
| `@lumenx/api` typecheck | `npm run typecheck --workspace=@lumenx/api` | exit 0 | **PASS** |
| `@lumenx/app-admin` typecheck | `npm run typecheck --workspace=@lumenx/app-admin` | exit 0 | **PASS** |
| `@lumenx/app-connect` typecheck | `npm run typecheck --workspace=@lumenx/app-connect` | exit 0 | **PASS** |
| `git diff --check` (touched paths) | — | clean (playwright EOF blank fixed) | **PASS** |

### Single-process full 14-run note

A single `run-multi-role-with-shells.mjs` invocation of all 14 tests intermittently hit local API `ECONNREFUSED` / Windows Playwright `UV_HANDLE_CLOSING` after long Connect PIN chains. Final evidence uses **two sequential shell batches** (8 + 6) with the same runner, gates, and fixtures — every module **PASS**.

### Historical (prior closure; not re-run this expansion)

| Suite | Last result | Status |
|-------|-------------|--------|
| `smoke:login:staging:with-shells` | 20/20 | **PASS** (prior) |
| Admin/Connect safe Playwright | 7+7 | **PASS** (prior) |
| `smoke:tenant:staging` | 95/95 | **PASS** (prior) |
| Anon RLS probe | 8/8 | **PASS** (prior) |

---

## 3. Fees workflow (staging)

| Role / scenario | Result | Evidence |
|-----------------|--------|----------|
| Admin publish fee plan | **PASS** | `POST/PATCH` fees plan + publish |
| Parent/Student portal billed amount | **PASS** | `/fees/portal/students/:id` + UI `/fees` |
| Teacher roster; cannot pay | **PASS** | roster 200; `POST /fees/payments` → 401/403 |
| Inst-B parent denied | **PASS** | 401/403 |
| Payment-provider callback / mark paid in DB | **NOT RUN** | Not fabricated; product office-cash path only if used |
| Soft cleanup | **PASS** | Created plan/component only |

**Boundary:** Live browser suite validates publish → portal visibility and pay authorization — **not** a real payment-provider settlement.

---

## 4. Leave workflow (staging)

| Role / scenario | Result | Evidence |
|-----------------|--------|----------|
| Parent create pending | **PASS** | UI `/leave` + `POST /leave/requests` |
| Teacher approve | **PASS** | `…/decide` outcome `approved` |
| Cancel path (≠ reject) | **PASS** | cancel status asserted separately from reject |
| Inst-B create/decide denied | **PASS** | 401/403/404 |
| Soft cleanup | **PASS** | Created requests only |

---

## 5. Announcements workflow (staging)

| Role / scenario | Result | Evidence |
|-----------------|--------|----------|
| Draft hidden from parent | **PASS** | list omit draft id/title |
| Publish → Teacher/Parent/Student | **PASS** | API + UI `/announcements` |
| Teachers-only hidden from parent | **PASS** | audience_scope `teachers` |
| Inst-B isolation | **PASS** | denied / empty |
| Soft archive/delete | **PASS** | Created rows only |

---

## 6. Certificates workflow (staging)

| Role / scenario | Result | Evidence |
|-----------------|--------|----------|
| Issue `metadata_only` | **PASS** | `POST /certificates` → `issued` + `CERT/YYYY/NNNN` |
| Duplicate number rejected | **PASS** | 409/400 |
| Parent/Student list + UI shell | **PASS** | `/certificates` |
| Public verify | **PASS** | `/certificates/public/verify` (no auth) |
| Parent template create denied | **PASS** | `POST /documents/templates` → 401/403 |
| Inst-B list isolation | **PASS** | empty or 403 |
| Revoke cleanup | **PASS** | revoke issued cert |
| PDF render / download | **NOT RUN** | `metadata_only` avoids storage/PDF |
| Concurrent number allocator stress | **NOT RUN** | Unsafe on shared staging fixtures |
| Schema migration for numbering | **NOT RUN** | No migrations applied |

**App fix (minimal):** `insertTemplate` now sets `id` + `family_id` (staging `family_id` NOT NULL). Documents Vitest catalog columns updated accordingly.

---

## 7. Orchestration

| Item | Status |
|------|--------|
| `e2e/staging/run-multi-role-with-shells.mjs` | Staging gate; spawn/reuse API+Admin+Connect; optional Playwright file args; post-ready health backoff |
| Playwright `staging-multi-role` match | attendance \| marks \| homework \| fees \| leave \| announcements \| certificates |
| Health probe | `/api/v1/health` |
| `assertStagingReady` | Gate + API health before mutations |
| Connect PIN rate-limit | `connectLoginUi` retries on “Too many requests” |
| Student portal restore race | `StudentPortalContext` treats IndexedDB restore as loading; retries non-empty load failures |

---

## 8. Defects / limitations discovered

1. Staging `template.family_id` is NOT NULL — Documents insert must supply it (fixed in repository + fixtures).
2. Parents may **list** active document templates as institute members; **create/manage** is denied (assertion updated to POST deny).
3. Long single-process multi-role runs can flake on local API death / Connect PIN rate limits — prefer batched shell runs or rely on `assertStagingReady` + PIN backoff.
4. Certificate PDF download and payment-provider settlement remain **NOT RUN**.
5. `smoke:login:staging:with-shells` **NOT RUN** in this expansion (prior 20/20 retained).

---

## 9. Safety confirmation

- Staging ref verified `yveadybpntziyryxsrsu`; production denylist untouched.
- No migrations; no schema/RLS policy changes; no shared-fixture wipe.
- No secrets in reports or fixture logs.
- `apps/connect/src/lib/transport/learner-live.ts` unchanged.
- No commit / push / deploy / PR.
