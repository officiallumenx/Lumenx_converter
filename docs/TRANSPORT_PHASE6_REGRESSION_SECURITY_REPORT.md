# LumenX Transport — Phase 6: Regression, Security and Failure Recovery

**Date:** 2026-10-15  
**Inputs:** Phases 2–5 reports; automated Vitest suites (backend / Transport / Admin / Connect / utils); source audit of access, GPS validation, outbox, notifications.  
**Constraint:** Do not weaken validation or access controls. Dedicated fixtures / mocks only — no production writes. Distinguish **automated** vs **physical-device** evidence.

---

## Verdict: **BLOCKED** (not READY FOR PHASE 7)

| Acceptance gate | Status |
|-----------------|--------|
| Automated regression (Pickup→Drop, duplicate start, boarding, GPS radius, IDOR, outbox) | **PASS** this session |
| Failure-recovery unit coverage (offline, timeout, retry, mutex, hydrate) | **PASS** this session |
| Security / institute isolation (API mock + RLS source tests) | **PASS** (automated) |
| Live API / Playwright workflow & admin integration | **BLOCKED** — API `8787`, Admin `4181`, Transport UI `4184` unreachable |
| Physical device (GPS off/revoke, background kill, FCM provider failure) | **NOT RUN** |
| Phase 5 product decisions (pending-usable vs formal approve; trip-complete recipients) | **Still open** — recorded; not changed here |

**Phase 7 must not start** until live E2E (or owner-accepted waiver) clears the blockers below, or blockers remain explicitly recorded with owner sign-off.

---

## 1. Commands and results (automated)

Working directories relative to repo root. PowerShell: use `;` not `&&`.

| # | Command | Result |
|---|---------|--------|
| 1 | `cd backend; npx vitest run src/domains/transport` | **73 passed** (15 files) |
| 2 | `cd backend; npx vitest run tests/transport.test.ts tests/transport-geo.test.ts tests/transport-emit-observability.test.ts tests/transport-pin-login.test.ts` | **54 passed** (4 files) |
| 3 | `cd apps/transport; npx vitest run src/lib/transport src/features/attendance src/lib/auth` | **99 passed** (19 files) |
| 4 | `cd apps/admin; npx vitest run src/lib/transport src/lib/transport-workflow.test.ts src/lib/transport-fleet.test.ts` | **55 passed** (12 files) |
| 5 | `cd apps/connect; npx vitest run src/lib/transport src/lib/transport-store.test.ts src/lib/transport-utils.test.ts` | **25 passed** (4 files) |
| 6 | `cd packages/utils; npx vitest run src/transport-*.test.ts` | **7 passed** (4 files) |
| 7 | Probe `http://127.0.0.1:8787/health` | **DOWN** (timeout) |
| 8 | Probe `http://127.0.0.1:4184/` / `4181/` | **DOWN** |
| 9 | Playwright `transport-workflow` / `transport-admin-integration` / `transport-phase3` | **NOT RUN** (UI+API down) |
| 10 | Playwright `transport-auth-boundaries` | **NOT RUN** (UI down) |

**Automated total this session:** **313 passed**, **0 failed**.

Post-fix re-check after Not Riding audience split: targeted `transport.test.ts` filters (Not Riding + phase5 GPS + phase9 IDOR + concurrent start + phase4 journey) **PASS**.

---

## 2. Regression coverage matrix

| Area | Automated evidence | Live / device |
|------|-------------------|---------------|
| Pickup → Return/Drop → Day Complete | `trip-lifecycle`, `lifecycle.smoke`, `day-state`, `api-ops.hydrate`, `phase4: full journey` API | **BLOCKED** |
| Admin stop / approval / route | API create+review queue tests; Admin flowchart + workflow (demo store) + API panels code path | **BLOCKED** Playwright admin integration |
| Driver roster / assigned stops | `driver route roster`, `api-roster`, hydrate-roster, matches-current-stop | **BLOCKED** |
| Boarding / dropping persistence | Boarding upsert + client_event_id; attendance sync + drop-stop tests | **BLOCKED** |
| Duplicate trip-start prevention | `concurrent trip starts: only one live trip…`; client `rejects starting a second trip` | **BLOCKED** |
| Reload / app restart | hydrateActiveTripFromApi; ops-outbox localStorage survive; trip **not** restored from trip localStorage SoT | **BLOCKED** device kill |
| Notification triggers / recipients | emit + phase5 dedupe; approach bands; reminders; **Not Riding split fix** | FCM delivery **NOT RUN** |
| GPS / radius preservation | `stop-radius`, approach geofence (no 50m floor), parking radius PATCH omit, GPS validation | Device GPS **NOT RUN** |
| Cross-app consistency | Phase 5 contract + `approval.test.ts` + Connect parent-status / learner-live | Live triad **BLOCKED** |

---

## 3. Failure scenarios

| Scenario | Automated | Physical device |
|----------|-----------|-----------------|
| Rapid repeated taps | Attendance mutex → `busy`; duplicate boarding client_event_id | **NOT RUN** |
| Slow API / timeouts | Outbox dispatch timeout clears sending lock | **NOT RUN** |
| API failures + retry | Outbox network retryable; attendance rollback on failure; retry after error | **NOT RUN** |
| Network disconnect / recovery | Offline queue + replay; offline end pending sync | **NOT RUN** |
| GPS disabled / stale / inaccurate | Client surfaces `gps_error`; server rejects bad accuracy / stale / future; freshness bands; gps_stale/offline reminders | **NOT RUN** |
| Permission denied / revoked | Auth boundaries unit (session 401 vs 403); UI permission flows | **NOT RUN** |
| Background / process kill / restart | Outbox mid-flush persist + recover; hydrate day-state | **NOT RUN** |
| Duplicate / out-of-order requests | Stable `client_event_id`; sequence flush GPS then boarding; GPS coalesce | Mock only |
| Unauthorized institute / driver / parent / student | phase9 IDOR suite; cross-tenant; parent other-student 403; driver cannot create Not Riding | Mock only |
| Invalid coordinates / malformed | `validateGpsPingInput`; stop radius reject | Mock only |
| Service-date boundaries / scheduler | Asia/Kolkata service-date tests; reminder timezone case | Live scheduler **NOT RUN** |
| Notification provider failure | emit Safe logs error/disabled/empty; never fails trip write | Real FCM fail **NOT RUN** |

---

## 4. Security and data integrity

### Verified (automated)

| Control | Evidence |
|---------|----------|
| Institute isolation | Cross-tenant vehicle/trip/analytics 403; phase7 isolation |
| Server-side authz | Driver owns trip/vehicle/route; parent own-child only; teacher cannot write vehicles; elevated-only analytics |
| Trip ownership | `assertDriverOwnsTrip` / phase9 cross-driver block |
| Attendance / trip updates | Boarding requires driver-for-trip; completed trip rejects marks |
| Coordinate bounds | Lat/lng range, accuracy cap, captured_at skew |
| RLS defense-in-depth (source) | Enrollment, GPS, boarding, emergency, daily exception policies present in migrations |
| Emit logs avoid names/phones | Fail/skip logs use `kind`, `instituteId`, `tripId`, `studentId` UUIDs — not display names or phones |

### Findings

| ID | Severity | Finding | Disposition |
|----|----------|---------|-------------|
| S-P6-01 | **Medium (fixed)** | `notifyNotRidingCreated/Cancelled` mixed guardians + staff into one emit with `targetAudience: "parent"` and dual `targetApps`. Broke audience→app hygiene vs trip lifecycle pattern. | **Fixed:** separate parent and admin emits + `:admin` dedupe suffix |
| S-P6-02 | Low / intentional | Parent boarding/drop/Not Riding notification **bodies** include student display name for that student’s guardians (and staff for Not Riding). Not logged as PII in emit failure logs. | **Accept** — operational copy; recipients scoped |
| S-P6-03 | Info | Driver phone exists on Admin/driver DTOs for ops; not placed in parent push bodies in audited emit path. | Monitor |
| S-P6-04 | Residual | Live RLS against real Supabase with stolen JWT **NOT RUN** this session (API down). | **BLOCKED** for Phase 7 |

No validation or access checks were weakened.

---

## 5. Defect fixed this phase

| ID | Component | Change |
|----|-----------|--------|
| P6-01 | `backend/.../ops-notifications.ts` | Split Not Riding create/cancel into parent-audience and admin-audience Safe emits (aligned with `notifyTripEnded` / school arrived). |

Regression suite preserved; targeted API tests re-run green.

---

## 6. Failed tests

**None** in automated suites run this session.

---

## 7. Blocked tests (explicit)

| Test / class | Why blocked |
|--------------|-------------|
| Playwright `transport-pickup-drop-workflow` | API + Transport UI down |
| Playwright `transport-admin-integration` | API + Admin/Transport UI down |
| Playwright `transport-phase3-enrollment-trip` | API + UIs down |
| Playwright `transport-auth-boundaries` | Transport UI `4184` down |
| Live FCM / notification provider failure | No running stack / devices |
| Device GPS off, permission revoke, background kill | No physical device run |
| Live cross-tenant RLS with real JWT | API down |

---

## 8. Carry-forward from Phase 5 (not decided here)

1. **Pending stops usable without formal Admin approve (A1)** vs **hard gate until approve (A2)**.  
2. **Trip completion recipients:** parents + admin (B1) vs add driver / other.  

Phase 6 did not change those product contracts.

---

## 9. READY / BLOCKED for Phase 7

**BLOCKED.**

Unblock when **all** of the following hold, or owner records an explicit waiver:

1. Local/staging API + Admin + Transport (and Connect if in scope) are up.  
2. At least one Playwright or manual pass of Pickup → Drop → Day Complete and Admin stop/route integration against dedicated fixtures.  
3. Recorded note on device GPS/notification residual risk (run or accept).  
4. Phase 5 product decisions resolved or explicitly deferred without blocking the chosen release slice.
