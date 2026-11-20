# LumenX — Supabase API Gateway Warnings Investigation

**Date:** 2026-10-29  
**Mode:** Investigate + implement + test — **no commit, push, deploy, or production migration**  
**Status:** **FIXES READY (uncommitted)** — production warning elimination **not** claimed

---

## 1. Confirmed causes of API Gateway warnings

### What the dashboard “API Gateway warnings” count represents

Cross-check of uploaded production evidence:

| Window | Total requests | Success rate | API Gateway warnings | Observed PG / HTTP signal |
|--------|----------------|--------------|----------------------|---------------------------|
| Last 24h | 206,956 | 96.6% | **3,547** | ~3,495× `23505` on `notification_institute_dedupe_uidx` (same order) |
| Last 60m | 8,062 | 97.0% | **120** | ~118× same constraint (same order) |

**Verdict:** The warning count tracks **failed / conflict responses and Postgres unique violations surfaced through PostgREST**, not successful HTTP 200 traffic. Approximate **1:1** with `notification_institute_dedupe_uidx` / HTTP **409** on `POST /rest/v1/notification`.

**Not** the warning driver (despite high request volume):

- Repeated **200** GETs for `notification_delivery_attempt` (`status=eq.pending` / `sending`)
- Repeated **200** reads of `institute`, `membership`, `alert_rule`, `transport_settings`
- Auth / Storage / Realtime (no matching error spike in the provided evidence)

Success rate ≈ 96.6–97% is consistent with ~3–3.5% of requests being non-2xx; the warning tile is dominated by those conflicts, not by “gateway timeouts” as a separate class in this sample.

### Primary confirmed cause

**Duplicate notification inserts** hitting partial unique index:

```sql
CREATE UNIQUE INDEX notification_institute_dedupe_uidx
  ON public.notification (institute_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;
```

Flow: domain emit (diary / transport / fees / …) → plain `INSERT` → concurrent or retry with same `(institute_id, dedupe_key)` → PostgreSQL **23505** → PostgREST **HTTP 409** → counted as API Gateway warning.

### Secondary contributors (volume, not warnings)

| Source | Interval | Tables | Assessment |
|--------|----------|--------|------------|
| FCM worker | was fixed **4s** | `notification_delivery_attempt` pending + sending reclaim | **Intended** delivery drain; high volume when idle; **not** 409s |
| Background jobs | **60s** | per-institute `institute` / `membership` / `alert_rule` / diary / transport / retention | **Intended** scheduled work; mostly 200s |
| App clients | session / portal loads | membership, institute, settings | Expected; watch for remount storms separately |

---

## 2. Endpoints and status codes responsible

| Endpoint / statement | Status / code | Role in warnings |
|----------------------|---------------|------------------|
| `POST /rest/v1/notification` | **HTTP 409** | Direct gateway warning source |
| Postgres insert on `notification` | **23505** `notification_institute_dedupe_uidx` | Root DB error behind 409 |
| `GET …/notification_delivery_attempt?status=eq.pending` | **200** | Volume only |
| `GET …/notification_delivery_attempt?status=eq.sending` | **200** | Volume only (reclaim list) |
| `GET` institute / membership / alert_rule / transport_settings | **200** | Volume from 60s jobs + clients |

---

## 3. Connection between HTTP 409 and notification dedupe errors

**Yes — same incident class.**

- Postgres logs `23505` for `notification_institute_dedupe_uidx`.
- PostgREST maps unique violations on REST inserts to **409 Conflict**.
- Dashboard API Gateway warnings ≈ those conflicts (counts align within a few percent).
- Successful 200 polls do **not** explain the warning tile.

Fixing idempotent notification insert therefore addresses **both** the Postgres error stream **and** the majority of API Gateway warnings, without removing the unique index.

---

## 4. Is polling excessive?

**Partially — for volume, not for warnings.**

**Evidence that polling is expected:**

- FCM outbox must poll pending attempts; reclaim of stuck `sending` is required after crashes.
- Background jobs intentionally fan out per institute every 60s (alerts, diary, transport reminders).

**Evidence that idle FCM polling was heavier than needed:**

- Fixed **4s** tick always listed **pending** and (previously) up to 200 **sending** rows even when the queue was empty → ~2 REST reads / 4s / process when idle ≈ **~43k GETs / day / process** before counting updates.
- Reclaim previously pulled all `sending` then filtered in JS; empty ticks still paid a full list query.

**Changes made (safe):**

1. Reclaim filters `attempted_at < cutoff` in SQL (`.lt`) so empty ticks return zero rows quickly.
2. Adaptive FCM interval: base **4s** when work exists; backoff ×1.5 up to **30s** when `pendingFound === 0`; snap back to 4s when work appears.
3. Tick overlap guard retained (`tickBusy` + single schedule).

Background **60s** institute fan-out left unchanged — reducing it would delay alerts/diary/transport without fixing warnings.

---

## 5. Files changed and fixes implemented

### A. Notification dedupe idempotency (primary warning fix)

| File | Change |
|------|--------|
| `backend/src/domains/notifications/repository.ts` | Pre-read + insert + 23505 re-read; `findNotificationByInstituteDedupeKey` |
| `backend/src/domains/notifications/service.ts` | On `created: false`, skip recipient re-insert / FCM re-enqueue |
| `backend/src/db/errors.ts` | Map constraint → “Notification already recorded” |
| `backend/tests/helpers/mock-supabase.ts` | Richer 23505 details for mock |
| `backend/src/domains/notifications/dedupe-insert.test.ts` | Unit coverage |
| `backend/tests/notifications.test.ts` | HTTP replay / isolation |
| `backend/tests/db-errors-map.test.ts` | Mapping assertion |

Unique index **preserved**. No production migration.

### B. FCM polling / reclaim (volume reduction)

| File | Change |
|------|--------|
| `backend/src/domains/notifications/repository.ts` | `reclaimStaleSendingFcmAttempts` uses `.lt("attempted_at", cutoff)` |
| `backend/src/domains/notifications/fcm-worker.ts` | `pendingFound` on result |
| `backend/src/workers/fcm-worker-runner.ts` | Adaptive `setTimeout` backoff; `nextFcmWorkerDelayMs`; no stacked loops |
| `backend/src/routes/v1/health.ts` | Comment only (worker schedule wording) |
| `backend/src/workers/fcm-worker-runner.test.ts` | Backoff unit tests |
| `backend/src/domains/notifications/fcm-reclaim.test.ts` | Stale vs fresh reclaim |

---

## 6. Before / after measurements

| Metric | Before (production evidence) | After (local / code) |
|--------|------------------------------|----------------------|
| API Gateway warnings 24h | 3,547 | **Not remeasured in prod** (await deploy) |
| PG 23505 dedupe | ~same magnitude | Expected sharp drop after API deploy |
| Idle FCM REST reads | ~2 queries / 4s | ~2 queries / 4s→30s adaptive; reclaim filter empty |
| Vitest (related) | — | **35 PASS** (see below) |
| `npm run build` (api) | — | **PASS** (`dist/index.js`) |

**Do not claim production warnings eliminated** until Railway deploy + fresh Supabase dashboard windows (30–60+ minutes) are compared.

---

## 7. Tests and build results

| Command | Result |
|---------|--------|
| `vitest` — dedupe-insert, notifications, db-errors-map, fcm-worker, fcm-reclaim, fcm-worker-runner, background-jobs | **35/35 PASS** |
| `npm run build` (`@lumenx/api`) | **PASS** |
| `npm run typecheck` | **FAIL** — pre-existing `packages/utils` DOM/`window` errors (unchanged by this work) |
| `npm run lint` | **FAIL** — missing `eslint.config.*` in backend (pre-existing) |

---

## 8. Remaining risks and production monitoring

### Risks

- Rare concurrent race can still log a single 23505 before re-read recovery (orders of magnitude fewer than systematic retries).
- Adaptive idle delay (up to 30s) adds bounded push latency when the outbox was empty and a new attempt appears just after a tick.
- Multiple API replicas each run their own FCM loop (existing design); claim/status transitions must remain idempotent.
- Orphan: notification committed, crash before recipients — replay returns existing row with empty recipients (rare).

### Monitoring after authorized deploy

1. Supabase Dashboard → API Gateway warnings (same 24h / 60m windows).
2. Postgres logs: count of `notification_institute_dedupe_uidx` / `23505` — expect sharp decline.
3. Confirm remaining 409s are not a new constraint.
4. Railway: `fcm_worker_tick` / `fcm_worker_tick_failed`; health `checks.fcm.workerRunning`.
5. Spot-check: distinct dedupe keys still deliver; same-key retries do not duplicate inbox / FCM fan-out.
6. Optional: REST volume on `notification_delivery_attempt` should fall when queue is mostly idle.

### Explicit non-actions (this task)

- No commit / push / Railway deploy / production SQL migration.
- Unique index not dropped or weakened.
- Unrelated errors not swallowed.

---

## Authorization needed next

1. Review this report + diffs.
2. Authorize commit / push / API deploy when ready.
3. Re-measure Supabase dashboard after deploy before declaring warnings resolved.
