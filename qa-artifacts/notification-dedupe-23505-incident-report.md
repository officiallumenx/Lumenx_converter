# LumenX Incident — `notification_institute_dedupe_uidx` (23505)

**Date:** 2026-10-29  
**Mode:** Investigate + implement + test — **no commit, push, deploy, or production migration**  
**Status:** **FIX READY (uncommitted)** — production stoppage **not** claimed

---

## 1. Confirmed root cause

### Constraint (actual schema)

From `supabase/migrations/20260827120000_notifications_foundation.sql`:

```sql
CREATE UNIQUE INDEX notification_institute_dedupe_uidx
  ON public.notification (institute_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;
```

Semantics: at most one **live** notification per `(institute_id, dedupe_key)`.

### Why PostgreSQL errors appeared

1. Many domain paths emit notifications with stable `dedupeKey` values (diary reminders, transport trip events, fees, exams, complaints, alert rules, etc.).
2. Shared insert path `insertNotification` performed a plain `.insert()` with **no** pre-check and **no** conflict recovery.
3. Legitimate **retries / concurrent workers / scheduled ticks** (notably the diary background job every 60s, plus transport safe-emit paths) re-attempted the same key.
4. PostgreSQL correctly rejected the second insert with **23505**. Supabase dashboard counts that statement failure even when the API later mapped it to HTTP 409 / swallowed it in a caller.
5. Partial unique indexes are **not** reliably targetable via PostgREST `onConflict`, so “just upsert” was not available without an RPC/migration.

This is **expected unique-protection firing**, not a broken index. The application failed to treat that protection as **successful idempotency** at the write site, so production showed thousands of PG errors.

### Not the root cause

- Dropping or weakening `notification_institute_dedupe_uidx`
- Unrelated Auth/Storage/Realtime errors (metrics show 0)
- Advisor “no issues” (schema can be healthy while app writes conflict)

### Primary generators (evidence from code)

| Source | Dedupe pattern | Retry / concurrency |
|--------|----------------|---------------------|
| Diary background worker | `diary-reminder:{user}:{scope}:{date}` | Worker every 60s until submit |
| Transport ops emits | `transport:{tripId}:…` | Safe emit + concurrent fan-out |
| Fees / exams / homework / leave / … | Domain-stable keys | Client retries / double-submit |
| HTTP `POST /notifications` | Optional `dedupe_key` / Idempotency-Key | Client retries |

All funnel through `emitNotificationForInstituteSystem` / `emitNotificationForActor` → `insertNotification`.

---

## 2. Fix implemented (application-layer; no migration)

### Files changed

| File | Change |
|------|--------|
| `backend/src/domains/notifications/repository.ts` | `findNotificationByInstituteDedupeKey`, `isNotificationInstituteDedupeConflict`, idempotent `insertNotification` (pre-read → insert → on 23505 re-read) |
| `backend/src/domains/notifications/service.ts` | On `created: false`, return existing recipients; **do not** re-insert recipients or enqueue FCM again |
| `backend/src/db/errors.ts` | Map `notification_institute_dedupe_uidx` → `Notification already recorded` (fallback for any remaining raw path) |
| `backend/tests/helpers/mock-supabase.ts` | Richer 23505 `details` for the constraint |
| `backend/src/domains/notifications/dedupe-insert.test.ts` | Unit tests: pre-hit, race recovery, unrelated errors |
| `backend/tests/notifications.test.ts` | HTTP replay + distinct keys + cross-institute isolation |
| `backend/tests/db-errors-map.test.ts` | Constraint mapping assertion |

### Behaviour

- **New** dedupe key → insert + recipients + in-app + FCM (unchanged).
- **Replay / concurrent winner** → return existing notification + existing recipients; no second push fan-out.
- **Null dedupe** → unconstrained inserts still allowed (index predicate).
- **Unrelated DB errors** → still thrown / observable.
- Unique index **preserved**.

No database migration required for this fix.

---

## 3. Tests executed

| Suite | Result |
|-------|--------|
| `dedupe-insert.test.ts` | **6 PASS** |
| `notifications.test.ts` | **13 PASS** (includes new dedupe cases) |
| `db-errors-map.test.ts` | **4 PASS** |
| `diary.test.ts` | **11 PASS** |
| `background-jobs.test.ts` | **4 PASS** |
| `transport-notification-emit.test.ts` + observability + idempotency | **9 PASS** |

Backend full `tsc` still reports pre-existing `packages/utils` DOM/`window` issues; **one** new mock typing issue for `details` was fixed on `MockDbError`.

---

## 4. Deployment readiness (awaiting your authorization)

1. Review the diff above.
2. Commit + push when authorized.
3. Deploy API (Railway `Lumenx_converter` / established workflow). **No SQL migration.**
4. **Do not** claim production is clean until fresh logs show decline in 23505 for this constraint.

### Production verification procedure

After deploy, monitor for ≥30–60 minutes:

1. Supabase Dashboard → Postgres errors: filter / search `notification_institute_dedupe_uidx` / `23505`.
2. Expect **sharp drop** in that specific error (diary worker ticks should no longer INSERT-fail).
3. API health: `GET https://api.lumenxtech.in/api/v1/health`.
4. Spot-check: legitimate distinct notifications (different keys) still appear; same-key retries do not duplicate inbox rows.
5. Railway logs: `background_jobs_job_failed` for diary should stay quiet if prior diary mapping + this idempotent insert are both live.

### Remaining risks

- Orphan edge case: notification row committed, process crash before recipients → replay returns empty recipient list (rare; not observed in metrics).
- Pre-read reduces but does not eliminate rare races; race path recovers via re-read after 23505 (may still produce an occasional logged 23505 under extreme concurrency — far fewer than today’s systematic retries).
- Frontends (Connect/Transport Workers) unchanged; this is API-only.

---

## 5. Explicit non-actions (per instructions)

- No commit / push / Railway deploy / production migration performed in this task.
- Unique index not dropped or weakened.
- No production notification rows deleted.
