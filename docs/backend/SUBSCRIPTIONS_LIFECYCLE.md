# Subscriptions & Lifecycle — implementation notes

## Business rules (authoritative)

| Rule | Value |
|------|-------|
| Trial duration | **60 days** (`DEFAULT_TRIAL_DAYS`) |
| Writable grace after expiry | **7 days** (`DEFAULT_GRACE_DAYS`) |
| After grace | **read-only** — mutations blocked server-side (`SUBSCRIPTION_READ_ONLY`) |
| Missing subscription | Fail-closed write lock (`SUBSCRIPTION_REQUIRED`) |
| Billable headcount | Distinct students with active non-deleted enrollment, student not deleted, status ≠ graduated |
| Coverage audit | `GET /api/nexus/subscriptions/coverage-audit` — **read-only**, no auto-backfill |
| Offline Nexus verification | Remains supported; online checkout is optional/env-gated |

Date comparisons use UTC ISO timestamps (`addUtcDays` / `Date.getTime()`). Inclusive end boundaries: `now <= trialEnd` / `now <= graceEndsAt` / `now <= period.endsAt` remain in the prior writable state.

## Server enforcement

- Middleware: `backend/src/middleware/subscription-write-gate.ts` (via `requireAuth`)
- Applies to mutating `/api/v1/*` including Transport, Admissions, Careers, Connect/Admin academic writes
- Allowlisted while locked: health, me, auth, firebase, **subscriptions** (renew/quote/offline/online checkout), registrations, product-feedback
- Platform operators bypass
- Reads remain available after expiry

Frontend helpers: `@lumenx/utils` → `isSubscriptionWriteBlockedError` / `formatSubscriptionWriteBlockedMessage` (wired into Admin + Connect API error formatting).

## Cancellation & renewal (current product model)

**There is no institute self-serve “cancel subscription” API.**

| Action | Semantics |
|--------|-----------|
| Offline / online payment submit | Creates pending renewal + payment; **does not activate** |
| Nexus verify / webhook confirm | Activates paid period; stacks on current paid end when present; idempotent if `subscription_period_id` already set |
| Renewal status `cancelled` | Billing adjustment / renewal record status only — not end-user cancellation |
| Nexus soft-delete subscription | Ops-only commercial delete; clears `current_period_id` |

### Missing business decision (do not invent)

If product requires end-user cancel / non-renew:

1. Define whether access continues through the paid period end (recommended) vs immediate read-only.
2. Define whether cancel is “stop auto-renew” only (no auto-renew exists today) vs terminate period early.
3. Add an explicit API + audit trail; do not reuse soft-delete.

Until that decision, ops manage coverage via Nexus commercial tools + coverage audit.

## Coverage audit — safe manual remediation

1. Run `GET /api/nexus/subscriptions/coverage-audit` as a platform operator.
2. Review issue categories (`missing_subscription`, `stale_lifecycle_status`, etc.).
3. Remediations are **manual and auditable**:
   - Missing sub → registration approval path or Nexus upsert (never auto-backfill scripts).
   - Stale lifecycle → `POST /api/nexus/subscriptions/sync-lifecycle`.
   - Stale headcount → open Admin subscription detail / quote (self-heals) or wait for enrollment sync.
4. Do **not** invent trial dates, payments, or paid periods.

## Pricing constants

Server mirror: `backend/src/domains/subscriptions/pricing.ts`  
Client/demo SoT: `packages/utils/src/subscription/policy.ts`  

Keep `DEFAULT_TRIAL_DAYS`, `DEFAULT_GRACE_DAYS`, `MIN_MONTHLY_CHARGE_INR`, and per-student rates aligned.

## Migration / deployment

No new subscription schema migration is required for the current implementation pass. Hosted apply, live RLS/worker verification, and production backfills are **out of scope** here — use a separate migration/deployment review.

## Safety

- Do not auto-create subscriptions for institutes lacking coverage.
- Do not enable production feature flags or run hosted SQL from this pillar’s implementation work.
- Online payment activation records `payment_method` from the verified payment (`online` vs `offline`).
