# LumenX Transport — Phase 3: Enrollment & Trip Behavior Under Pending/Rejected Stops

**Date:** 2026-10-10  
**Prior phase:** Phase 2 Admin Integration — 6/6 PASS (`docs/TRANSPORT_ADMIN_INTEGRATION_QA_REPORT.md`)  
**Scope:** Pending / rejected / resubmitted / approved stops vs enrollments, approved routes, and trip operations  
**Environment:** Local API-mode (`8787`), Transport UI (`4184`), Admin UI (`4181`)  
**Institute:** dedicated Playwright fixture only (`lx-transport-pw`)  
**Final verdict (Phase 3):** **6/6 Playwright scenarios PASSED** (+ `api-sync` unit 5/5)  
**Release readiness:** This phase alone does **not** make the Transport product release-ready.

---

## Totals

| Metric | Count |
|--------|------:|
| Planned | 6 |
| Executed | 6 |
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Not run | 0 |

**Unit (related):** `apps/transport/src/lib/transport/route-setup/api-sync.test.ts` — **5 passed**

---

## Exact commands

```bash
# Fixture (dedicated institute writes; shell ack required for hosted Supabase)
set ALLOW_REMOTE_DB_WRITES=I_CONFIRM_REMOTE_DATABASE_WRITES
set REMOTE_WRITE_PROJECT_REF=<project-ref-from-SUPABASE_URL>
node e2e/transport/provision-fixture.mjs --reset-pending-stops --reset-trips

npx playwright test --project=transport-phase3 --reporter=list
# Final green: 6 passed (14.3m), exit_code 0

npx vitest run apps/transport/src/lib/transport/route-setup/api-sync.test.ts --reporter=dot
# 5 passed
```

| Item | Value |
|------|--------|
| Playwright project | `transport-phase3` |
| Spec | `e2e/transport-phase3-enrollment-trip.spec.ts` |
| Helpers | `e2e/transport/admin-helpers.ts`, `e2e/transport/helpers.ts` |

Credentials / tokens / PINs are **not** recorded here.

---

## Business rules verified (existing product)

From `backend/src/domains/transport/approval.ts`:

- **`isOperationallyUsable`:** `pending` **or** `approved` — pending does **not** block daily ops.
- **Rejected:** not operationally usable until fixed/resubmitted.
- Driver stop create → `approvalStatus: pending`; Admin Publish/Decline via review APIs.

Enrollment sync (`syncStopAndEnrollmentsToApi`): assigning students to a pending stop **updates pickup immediately** (pending usable). Approved student1 pickup/drop must remain intact when other pending work happens.

---

## Scenario results

### P3-A — Pending stop does not corrupt approved route — **PASS**

| | |
|--|--|
| Expected | New pending request; approved stops + student1 enrollment unchanged; pending ≠ approved; trip CTA still available for approved route; states survive refresh |
| Actual | UI `POST /stops` → pending; `GET` stops/enrollments confirm baseline; home shows Start Pickup/Drop path; Admin reviews shows pending after reload |
| API | Create &lt;300 pending; list stops/enrollments 200 |

### P3-B — Rejected stop does not become active — **PASS**

| | |
|--|--|
| Expected | Admin Decline persists rejected + reason; approved route/enrollments intact; UI shows Declined (not false success) |
| Actual | Admin UI Decline → reject API; status `rejected` + reason; pickup/drop for student1 unchanged; Transport Declined tab shows reason |
| API | Reject 200; list stops 200 |

### P3-C — Edit and resubmit rejected — **PASS**

| | |
|--|--|
| Expected | Driver Edit & Resubmit → pending; Admin queue shows stop; rejection reason retained for audit; not active before approval |
| Actual | Reject via API; Transport **Edit & Resubmit** → `PATCH /stops/:id` 200 → `pending` with reason retained; Admin reviews shows `Stop: …` |
| API | Reject 200; PATCH 200 `approvalStatus: pending`, `rejectionReason` kept |

### P3-D — Student enrollment integrity — **PASS**

| | |
|--|--|
| Expected | Student1 approved pickup/drop not overwritten by unrelated pending; reject proposed stop leaves student1 intact; approve valid stop + enrollment PATCH sets correct IDs; no duplicate enrollments for student1 |
| Actual | Baseline student1 gate/school preserved through pending UI submit + reject; approved new stop + enrollment2 PATCH; student1 enrollment count = 1; Admin Publish for separate pending OK |
| API | List enrollments 200; reject/approve/patch 200 |

### P3-E — Trip behavior — **PASS**

| | |
|--|--|
| Expected | Trip start/complete on approved route; pending/reject leave approved baseline usable; approve new stop hydrates; invalid re-reject rejected by backend; reload does not activate rejected |
| Actual | Start/end trip via UI (or trip list 200 if day already complete); pending + reject leave gate `approved`; Admin Publish new stop → `approved`; re-reject → 400/409/422; reload keeps rejected vs approved |
| API | Trip POST/end &lt;300 when run; stop create/reject/approve as above |

### P3-F — Route order / sync regression — **PASS**

| | |
|--|--|
| Expected | Distinct route orders; collision 409 when order taken; pending not falsely approved |
| Actual | Two creates with max+1 / max+2; collide on occupied order → 409 when school at 1; statuses remain pending |
| Unit | `nextFreeRouteOrder` / school-order-1 case in `api-sync.test.ts` |

---

## Confirmed defects (documented then fixed)

### DEF-P3-01 — Driver cannot resubmit rejected stop (PATCH 403 / no status reset) — **Fixed**

| Field | Detail |
|-------|--------|
| Severity | **High** (broke Edit & Resubmit → Admin queue) |
| Evidence | Pre-fix: driver `PATCH /stops/:id` on rejected → **403** `Insufficient permissions`; `assertCanEditTransportSubmission` allowed only `pending` |
| Fix | `backend/src/domains/transport/service.ts`: allow submitter to edit `rejected`; on driver update of rejected stop set `approval_status=pending`, clear review fields, **keep** `rejection_reason` for audit (including empty field patches) |
| Re-verify | API probe PATCH → 200 pending + reason; Scenario C green |

### DEF-P3-02 (Phase 2 carry) — `routeOrder: local-1` 409 vs school — already fixed via `nextFreeRouteOrder` in `api-sync.ts`; re-confirmed in P3-F + unit tests.

---

## Files changed

| File | Change |
|------|--------|
| `backend/src/domains/transport/service.ts` | Rejected-stop edit + resubmit → pending |
| `e2e/transport-phase3-enrollment-trip.spec.ts` | **New** Phase 3 scenarios A–F |
| `e2e/transport/admin-helpers.ts` | Enrollments helpers, create/reject/approve API, review-card locators, student2 pickup clear |
| `e2e/transport/helpers.ts` | `goHome` button/link; softer end-trip navigation |
| `playwright.config.ts` | Project `transport-phase3` |

---

## Remaining risks

1. **Enrollment on reject:** Rejecting a stop does **not** automatically restore a student’s previous pickup if it was moved to that pending stop (pending-usable rule). Operators should treat proposed reassignments carefully.  
2. **Playwright `webServer` env** in config still points some apps’ `VITE_API_BASE_URL` at their own origin when spawning servers — prefer `reuseExistingServer` with correct app `.env`.  
3. **Fixture provision** against hosted Supabase requires explicit `ALLOW_REMOTE_DB_WRITES` + `REMOTE_WRITE_PROJECT_REF` (see `backend/DEV_SAFETY.md`).  
4. Offline/retry duplicate-assignment fault injection was **not** fully simulated (P3-F covers order/collision/false-approved only).  
5. Cross-driver / cross-institute UI isolation beyond API authz was not expanded this phase.

---

## Surfaces verified

| Surface | This phase |
|---------|------------|
| Transport UI (submit, declined, resubmit, trip) | Yes |
| Admin UI (Decline / Publish) | Yes (B, D, E) |
| API persistence after UI | Yes |
| `blockApiWrites` / mocked writes | **Not used** |

---

## Next recommended QA phase

**Phase 4 — Enrollment revert + mid-trip reject + multi-driver isolation + offline sync**

Findings from the Phase 3 rules audit ([Audit trip enrollment rules](657de416-2c4b-423c-b259-39f4e26f6e0c)) that are **outside** the green A–F matrix:

1. Explicit policy/tests for restoring pickup when a pending-assigned stop is rejected  
2. **Admin rejects a stop mid-day while a Pickup/Drop trip is already active** (roster / boarding / enrichTrip vs `isOperationallyUsable`)  
3. Second-driver / second-institute negative tests in Admin reviews UI  
4. Offline queue flush: no duplicate stops/enrollments; fault-injected approve/reject (no false success)  
5. Keep CI matrix: `transport-workflow` + `transport-admin-integration` + `transport-phase3`

Note: the audit’s pre-fix “driver PATCH rejected → 403 / no pending reset” gap was fixed as **DEF-P3-01** and covered by Scenario C.

---

*End of Phase 3 report. Do not treat Transport as release-ready from this phase alone.*
