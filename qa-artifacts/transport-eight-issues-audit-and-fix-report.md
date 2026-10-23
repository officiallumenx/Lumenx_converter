# LumenX Transport — Eight Issues Audit and Fix Report

**Date:** 2026-10-21  
**Scope:** Local code fixes only — **no** production migration, deploy, commit, or push.  
**Branch:** `fix/cloudflare-workers-build-upload` @ `682a12ec` (+ local uncommitted work)  
**Constraint honored:** Did not modify `apps/connect/src/lib/transport/learner-live.ts`.  
**RLS:** Did not alter `20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` or `vehicle_location_select_scoped` / `can_learner_read_vehicle_location`.

---

## Summary matrix

| # | Issue | Root cause (short) | Fix status | Tests |
|---|--------|-------------------|------------|-------|
| 1 | Duplicate parent notifies (siblings) | Trip-level reminders keyed per student; approach copy looked like “next” per stop | **PASS** (code) | PASS |
| 2 | False “reached school” at pickup start | School geofence on first ping in `starting` phase | **PASS** (code) | PASS (grace + phase guards) |
| 3 | Drop text says “at school” wrongly | Client fall-back to last route stop (school) + plural copy | **PASS** (code) | PASS |
| 4 | Attendance multi-tap / flaky save | Race before `syncing` + GPS ahead of marks in outbox | **PASS** (code) | PASS |
| 5 | “Next is your stop” too early | ETA proximity used “next” copy; no sequential plan gate | **PASS** (code) | PASS |
| 6 | “Next” instead of / with arrival | Same ping emitted approach + arrival | **PASS** (code) | PASS |
| 7 | Background pause / reminders / Continue–End | JS GPS only; no driver local reminders | **PASS** (code; device NOT RUN) | Unit policy PASS |
| 8 | Slow start/end / GPS lag | Outbox GPS blocked attendance; hydrate waterfall unchanged | **PARTIAL** (outbox priority) | PASS focused |

---

## 1. Duplicate notifications for siblings

### Root cause
- `notifyTripStarted` already emits **one** parent row with unique guardians (`guardianUserIdsForRoute` + `transportDedupe.tripStarted`).
- Morning / pre-pickup **reminders** looped **per enrollment** with `transportDedupe.reminder(..., studentId, ...)`, producing **N inbox/push rows** for one parent with three children.
- Approach bands used **“Next is your stop”** per assigned stop, so three different stops looked like three copies of the same alert class.

### Fix
- Coalesce service / pre-pickup reminders to **unique parents** with `transportDedupe.reminderParent(route, type, date)`.
- Keep boarding/drop **per student** (child-specific events must remain distinct).
- Split sequential “next” into `STOP_NEXT` (Issue 5/6).

### Files
- `backend/src/domains/transport/transport-reminders.ts`
- `backend/src/domains/transport/transport-notification-severity.ts`

### Before / after
- Before: 3 sibling enrollments → 3 morning reminder rows for one parent.  
- After: 1 reminder row, `recipientUserIds` = unique parents.

---

## 2. False “reached school safely” at pickup start

### Root cause
`maybeMarkSchoolArrivedOnPing` ran for any pickup phase including **`starting`**. First GPS ping with the bus parked at school marked `school_arrived_at` and called `notifySchoolArrived` (“Children reached school safely”) with **no boarding**.

### Fix
- Require `phase === "running" || phase === "boarding"`.
- Honor `isWithinApproachStartGrace(started_at)` (same 90s window as approach).

### Files
- `backend/src/domains/transport/ops-service.ts`

### Before / after
- Before: Start pickup at school → immediate school-arrived push.  
- After: No school-arrived until past start grace and active running/boarding.

---

## 3. Incorrect school-drop notification text

### Root cause
- Client `resolveDropStopIdForMark` preferred **last route stop** (often School) when `dropStopId` was missing.
- Parent body always said “Your children dropped at stop safely — … was dropped at {stopName}”.

### Fix
- Prefer enrollment `dropStopId`, then **pickup (home)**, then last route stop.
- Server copy: singular; “reached school” only when `stop.kind === "school"` (or name starts with School).

### Files
- `apps/transport/src/lib/transport/attendance/drop-stop.ts` (+ tests)
- `backend/src/domains/transport/ops-notifications.ts`
- `apps/transport/src/lib/transport/attendance/sync.test.ts`
- `apps/transport/src/features/attendance/roster-visibility.test.ts`

---

## 4. Attendance multi-tap / failures

### Root cause
- Double-tap race before `syncStatus === "syncing"`.
- Shared outbox flushed GPS before boarding (25s timeouts) → marks felt stuck → more taps.

### Fix
- Synchronous `markInFlightByStudent` mutex around mark apply/enqueue.
- Flush sorts **critical** events (boarding/drop/lifecycle) before GPS.

### Files
- `apps/transport/src/lib/transport/attendance/repository.ts`
- `apps/transport/src/lib/transport/ops-outbox.ts`

---

## 5 & 6. “Next is your stop” timing and vs arrival

### Root cause
- `STOP_APPROACHING` used **“Next is your stop”** from ETA/proximity to the child’s assigned stop, independent of route-order completion.
- Same ping could emit approach (low ETA inside geofence) **and** `STOP_ARRIVED`.

### Fix
- New event `STOP_NEXT` + dedupe `transportDedupe.stopNext(trip, stop)`.
- Emit `STOP_NEXT` only after **confirmed arrival** at plan stop N → recipients for plan N+1.
- `STOP_APPROACHING` copy is **“Approaching …”** only; **skipped when `withinRadius`**.
- Plan from `buildPickupStopSequence` / `buildDropStopSequence`.

### Files
- `backend/src/domains/transport/transport-events.ts`
- `packages/utils/src/transport-events.ts`
- `backend/src/domains/transport/approach.ts`
- `backend/src/domains/transport/transport-notification-severity.ts`
- `backend/src/domains/transport/approach.test.ts`
- `backend/src/domains/transport/eight-issues.regression.test.ts`

---

## 7. Background pause; 10‑min reminders; Continue / End

### Root cause
- Android `TripTrackingService` is a **foreground notification shell**; GPS remains JS `setInterval` + Capacitor Geolocation.
- No `App` resume flush; LocalNotifications only used for permission checks.
- Server `transport-reminders.ts` targets Connect/Admin, not the driver app.

### Fix (supported path)
- `App.addListener('appStateChange')` → flush GPS/outbox on resume.
- `trip-driver-reminders.ts`: schedule local reminders every **10 minutes** for up to **1 hour**; actions Continue / End.
- **Policy:** at one hour, alert driver — **do not silently auto-end** the trip (safety).
- Home listens for Continue / End request events.

### Files
- `apps/transport/src/lib/transport/trip-driver-reminders.ts`
- `apps/transport/src/lib/transport/gps-outbox.ts`
- `apps/transport/src/features/home/HomePage.tsx`

### Remaining (real device — NOT RUN here)
- Background location runtime permission UX
- Lock-screen action delivery under OEM battery restrictions
- Proof that JS GPS continues while screen locked (may still pause without FGS location updates in native code)

---

## 8. GPS accuracy / start–end loading

### Done
- Critical outbox priority (attendance not stuck behind GPS backlog).

### Not fully done (documented)
- Start still: readiness GPS ladder → `startTransportTrip` + phase PATCH → hydrate → first ping.
- No before/after wall-clock timings captured in this environment (no production traffic).
- Recommended next: cache readiness fix for first ping; combine start+running API; return day flags from end trip.

---

## Security / RLS impact

| Check | Result |
|-------|--------|
| `vehicle_location` guardian RLS migration | **Unchanged** |
| `can_learner_read_vehicle_location` | **Unchanged** |
| Institute isolation on emits | Preserved (`instituteId` + existing recipient resolvers) |
| Guardian-only recipients | Preserved; reminders now unique-parent, not broader |
| Client UI as auth boundary | Not introduced |
| `learner-live.ts` | **Not modified** |

---

## Tests run (local)

| Suite | Result |
|-------|--------|
| `backend` approach + eight-issues + attendance-finalize + stop-radius | **PASS** |
| `backend` ops-notifications-audience | **PASS** |
| `apps/transport` drop-stop + sync + roster-visibility | **PASS** |
| `backend` `tsc --noEmit` | **PASS** |
| `apps/transport` `tsc --noEmit` | **PASS** |
| Physical device GPS/FCM / lock-screen actions | **NOT RUN** |
| Production / staging live trip with 3 siblings | **NOT RUN** |
| Full Playwright transport workflow | **NOT RUN** (avoid prod parents) |

---

## Performance measurements

| Metric | Evidence |
|--------|----------|
| Cold-open assignment fan-out (prior session) | Earlier work: parallel me∥driver-me; roster-enriched assignment |
| Attendance vs GPS flush order | Code change only — no timed harness in this run |
| Start/end wall clock | **NOT MEASURED** this session |

---

## Remaining policy / rollout

1. **One-hour boundary:** Implemented as alert-only (no auto-end). Confirm with product if Admin escalate is required.
2. **Deploy backend first** (approach, school arrival, reminders, drop copy) before Transport APK that depends on `STOP_NEXT`.
3. **Device checklist:** Background GPS, reminder actions, three-sibling trip-start (one push), start-at-school (no school-arrived), ordered three-stop next-stop.
4. **Do not** commit/push/migrate production from this pass without explicit approval.

---

## Concise PASS / FAIL / NOT RUN

- **PASS:** Issues 1–6 code + focused tests; Issue 7 client reminder scaffolding; Issue 8 outbox priority; typechecks.
- **PARTIAL:** Issue 8 start/end API waterfall; Issue 7 native GPS continuity.
- **NOT RUN:** Real-device background/FCM; staging three-sibling live trip; production deploy.
- **FAIL:** None in automated suites run above.
