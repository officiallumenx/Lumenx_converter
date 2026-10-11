# Transport Evening Drop Mark — Fix Report

**Date:** 10 Oct 2026  
**Baseline:** `docs/TRANSPORT_E2E_QA_REPORT.md` (evening trip ended with `droppingStatus=not_dropped`)  
**Scope:** Drop mark persistence + Drop confirmation slot lock  

---

## Verdict

**Root cause fixed in code; unit/API regression tests PASS.**  
Full live evening Drop re-mark was **not** re-run (today’s morning+evening trips already `completed`; no destructive re-trip on live institute data). Drop readiness dialog UI re-open was **NOT RUN** this session (Home showed day complete).

---

## Root cause (traced end-to-end)

### What the prior QA observed

| Field | Value |
|--------|--------|
| Student | `loki vella` / `e4440ad9-14ce-401e-bd29-f89b3d9ded41` |
| Evening trip | `93d9dd16-4062-4100-808b-63e50be50aee` (`slot=evening`) |
| After End Trip | `boardingStatus=pending`, `droppingStatus=not_dropped` |
| UI | Attendance stayed on Boarding copy; toast `boarded` not `dropped` |

### Causal chain

1. **Attendance defaulted to Boarding** even on evening Drop trips (`useState("boarding")`). Drivers/automation tapped students → boarding marks, not drop marks.
2. **Assignment roster seed omitted `dropStopId`** in `loadApiDriverAssignment` → `setApiAttendanceRoster`. Live roster proves pickup ≠ drop:
   - pickup: `2d2cb67b-37ce-4b9f-909b-c4244d09687c` (4road center)
   - drop: `60cbced4-9c1c-42d4-8fe3-80e2c13f6e2b` (School)
3. `markDropping` previously fell back to **pickup** `stopId`. Backend `assertBoardingTargetAllowed(..., kind: "dropping")` rejects when enrollment `drop_stop_id` differs → drop never persists.
4. `POST …/end` runs `planAttendanceFinalize` for evening → unset drops become **`not_dropped`** (correct finalize behavior; not a backend bug).

Not a label-only issue. Persistence failed because the drop write either never fired or used the wrong stop.

### Drop confirmation (`readinessSlot`)

Prior fix on Home locked `readinessSlot` when opening the sheet. Same `startSlot ?? "morning"` bug remained on **AttendanceGate**. Both now lock the slot at open time so Drop cannot flip to Pickup after `continue_drop` makes `nextStartSlot` null.

---

## Files changed

| File | Change |
|------|--------|
| `apps/transport/src/lib/transport/attendance/drop-stop.ts` | **New** — `defaultAttendanceTabForSlot`, `resolveDropStopIdForMark` |
| `apps/transport/src/lib/transport/attendance/drop-stop.test.ts` | **New** regression tests |
| `apps/transport/src/lib/transport/attendance/repository.ts` | Drop marks use resolved drop stop; fail closed if none |
| `apps/transport/src/lib/transport/driver-assignment-api.ts` | Seed `dropStopId` / `dropStopName` into attendance roster |
| `apps/transport/src/features/attendance/AttendancePage.tsx` | Default/sync Dropping tab for evening; lock AttendanceGate readiness slot |
| `apps/transport/src/features/attendance/roster-visibility.ts` | Re-export helpers |
| `apps/transport/src/features/attendance/roster-visibility.test.ts` | Regression cases |
| `apps/transport/src/lib/transport/attendance/sync.test.ts` | Drop outbox payload uses drop stop |
| `apps/transport/src/lib/transport/trip/day-state.test.ts` | readiness slot lock for `start_drop` |

---

## Tests actually executed

| Suite | Result |
|-------|--------|
| Vitest `drop-stop.test.ts` | **PASS** (6) |
| Vitest `sync.test.ts` (incl. drop queue) | **PASS** (5) |
| Vitest `roster-visibility.test.ts` | **PASS** (5) |
| Vitest `day-state.test.ts` | **PASS** (10) |
| Vitest backend `attendance-finalize.test.ts` | **PASS** (6) |
| Playwright `transport` auth boundaries | **PASS** (2) |
| Live evening Drop mark + End Trip | **NOT RUN** (day already complete; avoided destructive re-trip) |
| Live Drop readiness/confirm UI open | **NOT RUN** (no Start Drop CTA; day complete) |
| Real device / Admin / Connect | **NOT RUN** |

---

## API / DB evidence (read-only this session)

```
GET /api/v1/transport/portal/driver-route-roster
student e4440ad9-… loki vella
  pickupStopId = 2d2cb67b-… (≠ drop)
  dropStopId   = 60cbced4-… School

GET /api/v1/transport/trips?trip_date=2026-10-10
  morning 959266bb-… completed
  evening 93d9dd16-… completed  (prior QA left drop=not_dropped)
```

---

## Acceptance criteria status

| Criterion | Status |
|-----------|--------|
| Mark dropped during Drop workflow | **Fixed in code**; live re-proof **pending** next evening cycle |
| API persists `dropped` | Stop id + tab fixes address validated failure mode |
| Roster refresh does not revert `dropped` | Unchanged hydrate path; unit drop mark holds after hydrate settle |
| Completing trip preserves dropped | Finalize never overwrites explicit `dropped` (backend tests) |
| Duplicate / offline retries safe | Existing outbox client_event_id path unchanged; sync tests cover offline queue |
| Drop confirmation stays on Drop slot | Home + AttendanceGate lock `readinessSlot`; unit coverage for slot resolution |
| Relevant automated tests pass | **PASS** (see table) |

---

## Remaining blockers

1. **Live UI re-proof** on a fresh service date (or test institute): Start Drop → confirm dialog says Drop → Dropping tab default → mark dropped → `GET …/boarding` shows `dropped` → End Trip keeps `dropped`.
2. Prior evening row `93d9dd16-…` remains historical `not_dropped` (expected; not rewritten).
3. Admin/Connect cross-app still out of scope for this fix.
