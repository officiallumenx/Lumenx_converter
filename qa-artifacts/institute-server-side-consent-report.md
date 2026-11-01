# Institute Registration — Server-Side Legal Consent Report

**Date:** 2026-10-23 (updated: atomic registration + consent)  
**Scope:** Durable, atomic server-side consent for Admin institute registration  
**Final status:** `PASS — STAGING MIGRATIONS AND INTEGRATION VERIFIED` (see `institute-consent-staging-verification-report.md`)

---

## Atomicity design (chosen)

**PostgreSQL SECURITY DEFINER RPCs** (same pattern as `begin_institute_registration_approval`):

| RPC | Purpose |
| --- | --- |
| `create_institute_registration_with_legal_consent` | Insert `institute_registration` **and** required consent rows in **one plpgsql function** (single implicit transaction) |
| `resubmit_institute_registration_with_legal_consent` | Rejected → pending update **and** consent upsert atomically |
| `upsert_institute_registration_legal_consent` | Pending-retry / repair consent only (single statement set inside one function) |
| `_institute_registration_write_legal_consent` | Internal helper: validates docs, requires `admin_terms` + `admin_privacy`, upserts rows |

### What is atomic

- Registration row + legal consent rows for **create** and **resubmit** commit together or roll back together inside Postgres.
- Application code calls **one** `admin.rpc(...)`; there is **no** compensating delete path on create anymore.
- Missing RPC / DB error → thrown to the client; registration is **not** reported successful.

### What is still outside the DB transaction

- **Supabase Auth user** creation (`auth.admin.createUser`) and profile/credential upserts remain **before** the RPC (existing architecture). An Auth user can still exist if the RPC later fails — same class of orphan as before registration existed. Consent cannot succeed without a registration row.

This is **not** two independent PostgREST inserts. Do not describe Auth+profile+registration as one global transaction.

---

## Migration changes

| File | Role |
| --- | --- |
| `supabase/migrations/20261023120000_institute_registration_legal_consent.sql` | Table + RLS — **applied on staging** (`yveadybpntziyryxsrsu`) |
| `supabase/migrations/20261023140000_institute_registration_consent_atomic.sql` | Atomic RPCs — **applied on staging**; see `institute-consent-staging-verification-report.md` |

Staging verification: `PASS — STAGING MIGRATIONS AND INTEGRATION VERIFIED`. Production still **not** migrated.

No backfill. No fabricated consent for existing registrations.

---

## Authorization / RLS implications

| Surface | Control |
| --- | --- |
| Table RLS | Unchanged: applicant SELECT (own registration) + `is_platform_operator()` SELECT; no client INSERT/UPDATE/DELETE policies |
| Atomic RPCs | `REVOKE ALL … FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE … TO service_role` only |
| Hono | Continues to use service_role; no service-role keys in Admin |
| `/registrations/me` DTO | Still omits consent rows (least exposure) |

Applicants cannot execute the create/resubmit RPCs directly and cannot read other applicants’ consent via RLS.

---

## Consent contract (unchanged)

Required: `admin_terms`, `admin_privacy` @ version `2026-09-04`  
Optional: `cookie_policy` @ `2026-09-04`  
Validated in TS **before** Auth/RPC; re-checked in SQL helper (required IDs + version format).

Admin sends `legal_consent` via `buildRegistrationLegalConsentAssertion()` → `POST /api/v1/registrations`.

---

## Application wiring

- `createRegistration` → `insertRegistrationWithLegalConsent` (RPC). Consent validated first; no registration insert without valid assertion.
- Pending retry → `upsert_institute_registration_legal_consent` if required docs missing.
- Resubmit → `resubmitRegistrationWithLegalConsent` (RPC).
- **Fail closed:** no silent fallback to non-atomic insert+upsert if the RPC is missing.

---

## Automated test results (this pass)

```text
# Backend
npm test -- --run src/domains/registrations/legal-consent.test.ts \
  src/domains/registrations/service.consent.test.ts \
  src/domains/registrations/consent-atomic.test.ts
→ Test Files  3 passed (3)
→ Tests       20 passed (20)

# Admin
npm test -- --run src/auth/signup-legal-consent.test.ts \
  src/auth/api-registration-signup.test.ts src/lib/registrations/api.test.ts
→ Test Files  3 passed (3)
→ Tests       25 passed (25)

# Admin typecheck → exit 0
# Admin focused eslint → exit 0
# git diff --check (atomic migration + registrations domain) → exit 0
```

| Case | Result |
| --- | --- |
| Missing consent rejected before Auth/RPC | PASS |
| Malformed/stale consent rejected (unit) | PASS |
| Atomic RPC called with Terms+Privacy docs | PASS |
| RPC failure → no success DTO | PASS |
| Pending retry upsert / skip when complete | PASS |
| Migration SQL: SECURITY DEFINER + service_role-only | PASS |
| Live PostgreSQL transaction / RLS enforcement | **PASS on staging** — see `institute-consent-staging-verification-report.md` (9/9 synthetic integration) |

**Staging live verification complete.** Production remains untouched.

---

## Staging rollout prerequisites

1. Apply **both** migrations to staging (`yveadybpntziyryxsrsu`) only after approval.  
2. Confirm CLI is **not** linked to production (`kmpzflsurepjwqnfqyld`).  
3. Deploy API that calls the new RPCs **after** migrations succeed.  
4. Deploy Admin that sends `legal_consent` (already wired).  
5. Smoke: successful register → registration + consent rows; missing consent → 400; failed RPC → no orphan registration row; Nexus approve unchanged.

### Exact staging apply commands (do **not** execute in this task)

```bash
cd backend
# SUPABASE_URL + REMOTE_WRITE_PROJECT_REF + CONFIRM_MIGRATION_TARGET = yveadybpntziyryxsrsu
# plus remote-write ack env required by assertRemoteWriteAck

REMOTE_WRITE_PROJECT_REF=yveadybpntziyryxsrsu CONFIRM_MIGRATION_TARGET=yveadybpntziyryxsrsu ^
  npm run preflight:migration -- 20261023120000_institute_registration_legal_consent.sql

REMOTE_WRITE_PROJECT_REF=yveadybpntziyryxsrsu CONFIRM_MIGRATION_TARGET=yveadybpntziyryxsrsu ^
  npm run preflight:migration -- 20261023140000_institute_registration_consent_atomic.sql

npx supabase link --project-ref yveadybpntziyryxsrsu
# verify linked ref is staging, then:
npx supabase db push
```

---

## Remaining limitations

1. Live DB / real transaction not verified locally (Docker down).  
2. Auth user provisioning remains outside the PG transaction.  
3. Migrations not applied to staging or production.

---

## Final status

**`PASS — STAGING MIGRATIONS AND INTEGRATION VERIFIED`**

Design, unit tests, and staging live verification confirm Postgres-level atomic create/resubmit for registration + consent via SECURITY DEFINER RPCs. Staging migrations applied and integration harness passed; production not migrated; API deploy remains a separate step.
