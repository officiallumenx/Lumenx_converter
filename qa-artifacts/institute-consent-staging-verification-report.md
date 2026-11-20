# Institute Consent — Staging Migration & Integration Verification

**Date:** 2026-10-23  
**Verified target:** `yveadybpntziyryxsrsu` (lumenx-staging)  
**Production (untouched):** `kmpzflsurepjwqnfqyld`  
**Final status:** `PASS — STAGING MIGRATIONS AND INTEGRATION VERIFIED`

---

## Phase 1 — Preflight (no writes)

| Check | Result |
| --- | --- |
| Migration files present & ordered | **PASS** — `20261023120000_…legal_consent.sql` then `20261023140000_…consent_atomic.sql` |
| Consent table / FKs / constraints / RLS (SQL review) | **PASS** — FK to `institute_registration` ON DELETE CASCADE; unique `(registration_id, document_id)`; SELECT-only policies for applicant + operator |
| Atomic RPCs | **PASS** — create + resubmit call `_institute_registration_write_legal_consent` in same plpgsql function |
| `SECURITY DEFINER` + fixed `search_path` | **PASS** — `search_path = public, pg_catalog` |
| EXECUTE grants | **PASS** — `REVOKE` from `PUBLIC`/`anon`/`authenticated`; `GRANT` to `service_role` |
| Auth-user-before-RPC failure mode documented | **PASS** — Auth/profile outside DB txn; registration+consent atomic inside Postgres |

Preflight env used staging gate only (`LUMENX_ENV=staging`, `STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu`, production denylist includes `kmpzflsurepjwqnfqyld`). Secret values were not printed.

---

## Phase 2 — Staging migration apply

| Step | Result |
| --- | --- |
| Migration-target preflight | **PASS** (staging ref only) |
| CLI link | **PASS** — linked to `yveadybpntziyryxsrsu` (`projects list`: staging `linked:true`, production `linked:false`) |
| Re-check before apply | **PASS** |
| Apply | **PASS** — both missing migrations applied via linked `db push` (not production) |
| Blind re-run / history rewrite | **Not done** (correct) |

### Migration history (staging)

| Version | Local | Remote |
| --- | --- | --- |
| `20261023120000` | present | present |
| `20261023140000` | present | present |

---

## Phase 3 — Catalog / RLS / permission verification (staging)

Read-only catalog probe (`qa-artifacts/_staging-consent-catalog-verify.sql`):

| Check | Detail |
| --- | --- |
| `table_exists` | `true` |
| `rls_enabled` | `true` |
| `policies` | `institute_registration_legal_consent_select_operator`, `institute_registration_legal_consent_select_self` |
| `constraints` | action/document_id/version checks, pkey, `(registration_id, document_id)` unique, FK |
| create RPC `SECURITY DEFINER` | `true` |
| create RPC search_path | `search_path=public, pg_catalog` |
| resubmit RPC `SECURITY DEFINER` | `true` |
| upsert RPC exists | `true` |
| EXECUTE create | `postgres`, `service_role` |
| EXECUTE resubmit | `postgres`, `service_role` |
| `anon` EXECUTE create | `false` |
| Table grants | `authenticated:SELECT`; `service_role` ALL; no client INSERT/UPDATE/DELETE |

Production was not linked and was not targeted by `db push` or migration apply.

---

## Phase 4 — Integration tests (synthetic fixture)

Harness: `qa-artifacts/institute-consent-staging-integration.mjs`  
Gate: staging env assertion + ref `yveadybpntziyryxsrsu` + production denylist.  
Fixture: ephemeral `lx-consent-probe.*.@lumenx.test` Auth users; cleaned up after run. No real customer registrations.

| # | Case | Result |
| --- | --- | --- |
| 1 | Missing required consent rejected | **PASS** |
| 2 | Valid Terms + Privacy consent persisted | **PASS** |
| 3 | Registration + consent commit together | **PASS** |
| 4 | Consent-write failure rolls back registration | **PASS** (no registration row for applicant after missing `admin_privacy`) |
| 5 | Resubmit RPC; no duplicate consent rows | **PASS** (3 docs after upsert-on-conflict; action `registration_resubmit`) |
| 6 | Unauthorized (`anon`) cannot invoke create RPC | **PASS** (`42501`) |
| 7 | Cross-applicant consent SELECT denied by RLS | **PASS** (empty) |
| 8 | Auth identity already exists → password sign-in recovers same user | **PASS** |
| — | Fixture cleanup | **PASS** |

**Counts:** 9/9 PASS, 0 FAIL (second run after correcting case 4 to use a unique institute code so the failure was consent validation, not a code collision).

---

## Phase 5 — Auth-user-before-RPC recovery

Observed architecture (`backend/src/domains/registrations/service.ts`):

1. **Consent validated in TS** before Auth or RPC.
2. **`auth.admin.createUser`** runs before the registration RPC.
3. **RPC** inserts registration + consent atomically.
4. Compensating Auth delete on create was **removed** (by design); recovery is resume-oriented.

| Scenario | Behavior |
| --- | --- |
| Auth succeeds, RPC fails | Auth user (and possibly profile/credentials) may exist; **no** registration row if RPC rolled back |
| User retries same email + password | `provisionAuthUser` detects “already registered”, verifies password via sign-in, returns same `userId` |
| Pending registration already exists | Idempotent path: `ensureRequiredConsentPresent` via upsert RPC; no second registration |
| Rejected registration | Client directed to sign-in + resubmit (conflict), not a second create |
| Email exists, wrong password | Conflict: sign in or use a different email |

**Staging evidence:** Case 8 confirmed duplicate `createUser` is blocked and password sign-in returns the same fixture user.  
**Product-code change:** None required for safe recovery; existing resume path is sufficient. No Auth user deletes of non-fixture accounts were performed.

**Remaining product gap (known, not a staging blocker):** Auth/profile/credential steps remain outside the Postgres transaction. Orphan Auth users without a registration are recoverable on retry with the same password, but are not auto-deleted.

---

## Production confirmation

| Claim | Evidence |
| --- | --- |
| Production not modified | CLI linked to staging only; production `linked:false` at verification time; no `db push` / migration list write against `kmpzflsurepjwqnfqyld` |
| API not deployed | Explicitly out of scope for this task |
| No commit / push / publish | Not performed |

---

## API deployment readiness (separate step)

| Environment | Migrations | API deploy? |
| --- | --- | --- |
| Staging (`yveadybpntziyryxsrsu`) | Applied + verified | **Ready for a separate staging API deploy** that calls the new RPCs |
| Production (`kmpzflsurepjwqnfqyld`) | **Not applied** | **Not ready** — apply migrations only after explicit production approval |

Do not deploy an API build that requires `create_institute_registration_with_legal_consent` / `resubmit_…` to production until those migrations exist there.

---

## Artifacts

| Path | Role |
| --- | --- |
| `qa-artifacts/_staging-consent-catalog-verify.sql` | Catalog/RLS/grant probe |
| `qa-artifacts/institute-consent-staging-integration.mjs` | Gated synthetic integration harness |
| `qa-artifacts/institute-server-side-consent-report.md` | Prior design / unit-test readiness report |

---

## Remaining blockers

None for **staging migration + RPC integration**. Follow-ups outside this task:

1. Separate **staging API** deploy + Admin smoke against hosted API.
2. Explicit approval before any **production** migration apply.
3. Optional: operator tooling to list Auth users with no registration (support-only; not required for PASS).
