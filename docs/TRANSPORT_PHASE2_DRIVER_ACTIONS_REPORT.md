# LumenX Transport — Phase 2: Driver Actions and Trip Lifecycle

**Date:** 2026-10-15  
**Scope:** Confirmed driver attendance / trip-lifecycle defects only (no approval, notification-threshold, or trip-semantics changes).  
**Source of truth for defects:** `docs/TRANSPORT_ECOSYSTEM_FULL_AUDIT.md` (F-ATT-007 and related), plus prior Pickup→Drop / Drop-workflow fix reports.  
**Note:** A separate Phase 1 “34-step” baseline report was not present in-repo; Phase 2 did **not** invent or alter any 34-step process.

---

## Verdict: **BLOCKED** (not READY FOR PHASE 3)

Code fixes and unit regressions for this phase **passed**. End-to-end Playwright Pickup→Drop and Admin integration suites were **not executed** this session:

| Blocker | Detail |
|---------|--------|
| API | `http://127.0.0.1:8787/api/v1/health` unreachable |
| Fixture | `e2e/transport/.fixture.json` missing (provisioner not run) |

Phase 3 must not start until the Playwright baselines below are green against a dedicated test institute.

---

## 1. Fixes delivered

| ID | Problem (confirmed) | Fix | Files |
|----|---------------------|-----|-------|
| P2-ATT-01 | Success toast fired on optimistic apply (false success) | Immediate feedback is **Saving… / Queued**; `toast.success` only after `lumenx-transport-ops-confirmed` | `attendance/repository.ts`, `AttendancePage.tsx` |
| P2-ATT-02 | Rapid taps could enqueue duplicate marks | Per-student **busy** guard while `syncStatus === "syncing"`; cards disabled while saving | `repository.ts`, `AttendancePage.tsx`, `StudentAttendanceCard.tsx` |
| P2-ATT-03 | Failed sync left optimistic boarded/dropped UI | Rollback to pre-mark snapshot + `syncStatus: error`; toast with real error + tap-to-retry | `repository.ts`, `store.ts` |
| P2-ATT-04 | Hydrate could clobber in-flight / error rows | Hydrate preserves `syncing` and `error` rows | `store.ts` |
| P2-ATT-05 | GPS-off disabled taps with weak on-screen explanation | Alert banner on Attendance when location is off (plus existing toast) | `AttendancePage.tsx` |
| P2-ATT-06 | Error retry could no-op if failed outbox row gone | Retry re-arms failed events **and** enqueues a fresh mark | `repository.ts` |
| P2-TRIP-* | Pickup→Drop hydrate race, drop stop, duplicate starts | **Already fixed** in prior Return/Drop reports; re-verified by unit suites only this session | (no new trip lifecycle code) |

**Preserved intentional behavior**

- First tap on **pending** still marks boarded/dropped (one-click); confirm sheet remains for **undo/change**.
- Pickup vs Drop tabs / evening default Dropping tab unchanged.
- Drop marks still enqueue with enrollment `dropStopId` (not pickup).
- Home still waits for roster + trip hydrate before `routeHydrated` unlocks CTAs (prior fix).

---

## 2. Tests executed

### Unit (observed this session)

```bash
cd apps/transport
npx vitest run src/lib/transport/attendance/ \
  src/lib/transport/trip/api-ops.hydrate.test.ts \
  src/lib/transport/trip/store.test.ts \
  src/features/attendance/roster-visibility.test.ts --reporter=dot
```

| Result | Detail |
|--------|--------|
| **39 passed / 0 failed** | Includes new mutex, rollback, confirm, offline `queuedOffline`, drop-stop, hydrate/homeAction coverage |

### Playwright / API / UI E2E (this session)

| Suite | Command | Result |
|-------|---------|--------|
| `transport-workflow` | `npx playwright test --project=transport-workflow` | **NOT RUN** — API down, no fixture |
| `transport-admin-integration` | `npx playwright test --project=transport-admin-integration` | **NOT RUN** — API down, no fixture |

### Prior baselines (historical; not re-run today)

| Suite | Prior result | Report |
|-------|--------------|--------|
| Pickup → Drop → Day complete | 6/6 PASS | `docs/TRANSPORT_RETURN_TRIP_FIX_REPORT.md` |
| Admin stop approval | 6/6 PASS | `docs/TRANSPORT_ADMIN_INTEGRATION_QA_REPORT.md` |

---

## 3. Acceptance criteria checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Pickup vs Drop attendance separate | **Unit PASS** (drop stop + tab defaults); E2E **NOT RUN** |
| 2 | First valid tap works | **Code Confirmed** (pending→mark); E2E **NOT RUN** |
| 3 | Confirm/undo per intended workflow | **Code Confirmed**; E2E **NOT RUN** |
| 4 | Pickup complete → Start Drop | **Unit PASS** (hydrate); E2E **NOT RUN** |
| 5 | Drop recorded at drop stop / correct trip | **Unit PASS**; E2E **NOT RUN** |
| 6 | End drop → completed / day complete | **Unit PASS** (prior + store); E2E **NOT RUN** |
| 7 | Reload restores server state | **Code path exists**; E2E **NOT RUN** |
| 8 | Duplicate trip starts prevented | **Unit PASS** (store + prior API 409); E2E **NOT RUN** |
| 9 | Slow/fail/offline no duplicate attendance | **Unit PASS** (mutex + rollback); live outbox **NOT RUN** |
| 10 | Hydration before dependent actions | **Unit PASS** |
| 11 | GPS block explains why | **Code Confirmed** (banner + toast); device **NOT RUN** |

---

## 4. Remaining blockers before Phase 3

1. Start local API + apps; provision dedicated fixture:  
   `node e2e/transport/provision-fixture.mjs --reset-trips`
2. Run and record:  
   - `npx playwright test --project=transport-workflow --reporter=list`  
   - `npx playwright test --project=transport-admin-integration --reporter=list`
3. Optionally re-prove one evening Drop mark in UI with network panel (success toast only after boarding/dropping POST succeeds).

---

## 5. Decision

**BLOCKED** — Phase 2 code acceptance for attendance feedback/mutex/rollback is met at unit level; phase exit requires green Playwright Pickup→Drop and Admin integration regressions, which could not be executed (API down, missing fixture).

Do **not** begin Phase 3 until those suites pass and this report is updated to **READY FOR PHASE 3**.
