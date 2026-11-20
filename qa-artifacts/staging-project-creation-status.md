# Dedicated Supabase Staging Project — Closure Status

**Date:** 2026-10-20  
**Final status:** `STAGING READY — QA CLOSURE PASS (SCOPED)`

## Project

| Field | Value |
|-------|--------|
| Name | `lumenx-staging` |
| Project ref | `yveadybpntziyryxsrsu` |
| Shared/default (untouched) | `kmpzflsurepjwqnfqyld` |
| Schema | 102/102 migrations (prior; not re-applied this closure) |

## Closure verification

| Check | Result |
|-------|--------|
| Env points only at staging ref | **PASS** |
| `smoke:login:staging:with-shells` | **20 PASS / 0 FAIL** |
| Staging multi-role | **2 PASS** |
| Admin safe | **7 PASS / 1 gated skip** |
| Connect safe | **7 PASS** |
| Connect Vitest (isolation/scope/client/role) | **28 PASS** |
| Tenant smoke / anon RLS / cross-app API | **PASS** (prior counts; not re-run) |
| `@lumenx/api` + `@lumenx/app-admin` typecheck | **PASS** |
| `@lumenx/app-connect` typecheck | **FAIL** (pre-existing) |
| Secrets / `.env.staging` tracked | **PASS** (not tracked) |

## Tooling

- `backend/scripts/run-smoke-login-with-shells.mjs`
- `npm run smoke:login:staging:with-shells --workspace=@lumenx/api`
- Playwright `staging-multi-role` + safe projects

## Safety

- No remigration; no shared/default writes; no secrets printed; no commit/push/deploy
- `learner-live.ts` untouched
