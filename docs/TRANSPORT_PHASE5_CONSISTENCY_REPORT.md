# LumenX Transport — Phase 5: Admin, Driver and Connect Consistency

**Date:** 2026-10-15  
**Inputs:** Phase 2–4 reports; `docs/TRANSPORT_ECOSYSTEM_FULL_AUDIT.md`; backend/Admin/Connect/Transport source + unit tests.  
**Constraint:** Do not decide product behavior on the owner’s behalf. Preserve Pickup → Drop and Admin integration behavior.

---

## Verdict: **BLOCKED** (not READY FOR PHASE 6)

| Gate | Status |
|------|--------|
| Cross-app approval / stop usability contract (code) | **Aligned** after Phase 5 fixes |
| Not Riding Today (existence / wiring) | **Present** — not missing |
| Formal Admin approval vs pending-usable | **Unresolved product decision** (see §4) |
| Trip-completion notification recipients | **Implemented** (parents + admin); owner may still change policy |
| Unit / hydrate regression | **Passed** this session |
| Live API cross-app E2E (Admin ↔ Driver ↔ Connect) | **NOT RUN** — API `8787` unreachable |
| Device refresh / reopen against live server | **NOT RUN** |

**Phase 6 must not start until owner resolves §4 decisions (if they affect scope) and live consistency evidence exists, or owner explicitly accepts code-only readiness.**

---

## 1. Cross-app state matrix

Legend: **SoT** = authoritative source · **R** = read · **W** = write · **—** = not exposed

| Concern | Backend SoT | Admin | Transport (driver) | Connect (parent/student) |
|---------|-------------|-------|--------------------|--------------------------|
| Stop `approval_status` | `transport_stop.approval_status` | API review queue (`TransportApprovalApiPanel`); pending visible for Publish | Driver sees own pending/rejected; submits create/update | Rejected hidden; pending treated usable for assignment display |
| Operational usability | `isOperationallyUsable` = pending \|\| approved | Review is advisory for ops; reject removes from usable set | Trip plans / roster from API usable rows | Enrollment pending banner: “already usable”; Admin may still review |
| Rejected stop | Unusable; excluded from trip stop plans (`enrichTrip`) | Shown in history / driver resubmit path | Cannot use as approved stop | Not shown as assigned stop |
| Pending stop | Usable for ops (same as approved) | Still listed in review queue | Appears in route/stop ops | Can appear in assignment / live if enrolled |
| Enrollment usable | pending+approved+active; rejected out of live trip lookup | Enrollments API + review queue | Roster via `driver-route-roster` / effective participants | Learner summary only if enrollment usable |
| Not Riding Today | `transport_daily_exception` (date-scoped) | `TransportDailyExceptionsApiPanel` | Effective participants exclude not-riding from expected onboard | Parent-only `NotRidingTodayCard` create/undo |
| Active trip | `transport_trip` phases + finalized | `TransportTripsApiPanel` / dashboard API | Start/phase/end via ops API; hydrate on reopen | Live poll + realtime; no trip writes |
| Boarding / drop | `transport_boarding_event` | `TransportAttendanceApiPanel` | Attendance outbox → API; no localStorage SoT | Read-only boarding/dropping labels |
| Trip complete | phase completed + finalize + `notifyTripEnded` | Staff notification + trip list | End trip API; day-state hydrate | Parent `TRIP_COMPLETED` inbox/push |
| GPS / ETA | `vehicle_location` + approach engine | Ops dashboards (API) | Ping outbox ~2.5s | Live tracking panel; errors show Retry |
| Notifications | emit + recipients by enrollment/route | Admin audience | Driver audience (not on trip-complete) | Parent audience for guardians of enrolled students |
| Demo / localStorage | N/A | Demo panels dead (`isApiAuthMode()` always true); gated off Routes | Trip restore = API hydrate only; stale keys cleared | No attendance localStorage bridge |

### Status mapping (stop / enrollment)

| Status | Ops usable? | Driver roster / trip plan | Parent Connect assignment | Admin review queue |
|--------|-------------|---------------------------|---------------------------|--------------------|
| `pending` | Yes | Included | Visible / usable | Yes (Publish / approve / reject) |
| `approved` | Yes | Included | Visible | No (already published) |
| `rejected` | No | Excluded | Hidden | Resubmit path for driver; not operational |

---

## 2. Required checks (1–12)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Stop status consistent across apps | **Pass (code)** | Shared `approval_status` + `isOperationallyUsable`; Admin API queue; Connect filters rejected |
| 2 | Approved / rejected represented consistently | **Pass (code)** | Same enum; rejected presentation + unusable |
| 3 | Rejected cannot be used as approved | **Pass (fixed)** | `enrichTrip` filters stops; drop plan ignores unknown stop ids |
| 4 | Pending ≠ approved *assignment label*, but pending is ops-usable | **Pass under current contract** | Pending usable by design; Admin still reviews — see §4.A |
| 5 | Driver route/roster match backend | **Pass (code)** | `driver-route-roster` + hydrate; unit hydrate tests |
| 6 | Trip start / board / drop / end / complete agree | **Pass (code)** / **Unverified live** | Single trip row + boarding events; Connect live reads same APIs |
| 7 | Parent/student only intended info | **Pass (code)** | Not Riding + report issue parent-only; student read-only live |
| 8 | Admin dashboards API-backed where required | **Pass (code)** | `transport.tsx` mounts `*ApiPanel` / `*ApiView` when `apiMode` |
| 9 | localStorage/demo cannot override live ops | **Pass (code)** | API-only Admin auth; Transport clears trip localStorage SoT; Connect does not listen to attendance bridge |
| 10 | API errors / stale data visible & recoverable | **Pass (fixed)** | Connect live error + Retry; Admin list status hints |
| 11 | Refresh/reopen preserves server state | **Pass (code)** / **Unverified live** | `hydrateActiveTripFromApi`; React Query invalidate + realtime |
| 12 | Notification recipients match trip/enrollment | **Pass (code)** under current wiring | Guardians via route enrollments; staff; trip-complete **excludes driver** — see §4.B |

---

## 3. Confirmed defects and fixes (this phase)

| ID | Defect | Fix | Files |
|----|--------|-----|-------|
| P5-01 | `enrichTrip` built stop plans from **all** route stops (incl. rejected) — diverged from Connect/usable contract | Filter stops with `isOperationallyUsable` | `backend/src/domains/transport/ops-service.ts` |
| P5-02 | Trip drop/pickup enrollment set ignored enrollment approval | Filter route enrollments with `isOperationallyUsable` | same |
| P5-03 | Connect live API failures swallowed → looked like “driver not started” | Propagate errors; Retry banner on live query | `apps/connect/src/lib/transport/learner-live.ts`, `LearnerTransportApiView.tsx` |
| P5-04 | Demo `TransportApprovalPanel` mounted on Routes even in product shell | Gate with `!isApiAuthMode()` | `TransportRoutesView.tsx` |
| P5-05 | Demo Attendance empty hint claimed shared localStorage SoT | Copy corrected to “demo only / API attendance” | `TransportAttendanceView.tsx` |
| P5-06 | No unit lock on usable/rejected contract | Added `approval.test.ts` | `backend/src/domains/transport/approval.test.ts` |

**Not changed (preserve working behavior):** Pickup → Drop sequencing (`trip-stop-plan.ts`), Admin API approval mutations, driver attendance mutex / outbox, GPS radius rules, notification cadence/grace from Phase 4.

---

## 4. Unresolved product decisions (owner must choose)

### A. Do driver-submitted stops require formal Admin approval before operational use?

| Alternative | Current code | Implication |
|-------------|--------------|-------------|
| **A1 — Pending is immediately usable** (ops = pending≈approved) | **Implemented** (`isOperationallyUsable`, trip start, roster, Connect pending banner) | Admin “Publish / Approve” is review/history, not a hard gate |
| **A2 — Pending blocked until Admin approves** | **Not implemented** | Would require changing `isOperationallyUsable`, trip start, roster, Connect copy, and likely driver UX |

**Stop work on changing this gate until owner picks A1 or A2.** Phase 5 kept A1 behavior and only excluded **rejected**.

### B. Who receives final trip completion notifications?

| Alternative | Current code (`notifyTripEnded`) |
|-------------|----------------------------------|
| **B1 — Parents (route guardians) + Admin staff** | **Implemented** — driver **not** notified on `TRIP_COMPLETED` |
| **B2 — Also notify the trip driver** | Not implemented |
| **B3 — Parents only / Admin only** | Not implemented |

**Documented as B1. No recipient change without owner decision.**

### C. Does “Not Riding Today” exist and is it complete?

| Layer | Status |
|-------|--------|
| Schema | `transport_daily_exception` migration present |
| API | create / list / participation / cancel + auth tests in `transport.test.ts` |
| Connect | Parent `NotRidingTodayCard` |
| Admin | `TransportDailyExceptionsApiPanel` |
| Ops | Effective participants + reminders exclude not-riding |
| Notifications | `NOT_RIDING_CREATED` / `CANCELLED` |

**Classification: feature exists and is wired end-to-end in code + API tests — not “missing.”** Live parent device E2E still **NOT RUN** (same API-down constraint).

---

## 5. API / UI regression evidence

### Ran this session

| Suite | Result |
|-------|--------|
| `backend` `src/domains/transport/approval.test.ts` (5) | **PASS** |
| `apps/transport` `api-ops.hydrate.test.ts` (6) | **PASS** |
| `apps/transport` `attendance/sync.test.ts` (10) | **PASS** |
| `apps/admin` `src/lib/transport/load.test.ts` (6) | **PASS** |
| Local API `http://127.0.0.1:8787/health` | **DOWN** (timeout) |

### Not run (blocked)

- Playwright Admin ↔ Transport ↔ Connect live trip
- Refresh/reopen on device with live hydrate
- FCM delivery for `TRIP_COMPLETED` / Not Riding
- Mid-trip Admin reject of an active stop

### Prior phases still relevant

- Phase 2–4 verdicts were **BLOCKED** on live device/API evidence; Phase 5 does not overturn those gates.

---

## 6. Preservation note

Pickup → Drop stop sequencing, Admin API enrollment/stop/route writes, driver attendance confirm-after-mark for undo, and Phase 3/4 GPS/notification rules were **not** intentionally altered beyond usable-stop/enrollment filtering and UI error/demo gating above.

---

## 7. READY / BLOCKED

**BLOCKED** for Phase 6.

Unblock when:
1. Owner confirms **§4.A** (A1 keep vs A2 formal gate) and **§4.B** (trip-complete recipients), and  
2. Live API is up and a minimal cross-app consistency pass is recorded (stop pending/rejected, one trip complete, Not Riding, refresh reopen), **or** owner explicitly accepts code-verified readiness without live E2E.
