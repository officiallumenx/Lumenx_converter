# LumenX Transport — Phase 2: Admin Integration Playwright QA Report

**Date:** 2026-10-10  
**Scope:** Driver ↔ Admin stop-approval workflow (submit → publish / decline → resubmit), with API persistence checks  
**Environment:** Local API-mode (`http://127.0.0.1:8787`), Transport UI (`4184`), Admin UI (`4181`)  
**Institute:** dedicated Playwright fixture only (`lx-transport-pw` / LumenX Transport Playwright Institute)  
**Verdict for this phase:** **6/6 planned tests executed and PASSED**  
**Release readiness:** This phase alone does **not** make the Transport product release-ready.

---

## 1. Totals

| Metric | Count |
|--------|------:|
| Planned | 6 |
| Executed | 6 |
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Not run | 0 |

---

## 2. Exact command and Playwright project

**Fixture reset (before suite):**

```bash
node e2e/transport/provision-fixture.mjs --reset-pending-stops
```

**Suite (final green run):**

```bash
npx playwright test --project=transport-admin-integration --reporter=list
```

| Item | Value |
|------|--------|
| Playwright project | `transport-admin-integration` |
| Spec | `e2e/transport-admin-integration.spec.ts` |
| Helpers | `e2e/transport/admin-helpers.ts`, `e2e/transport/helpers.ts` |
| Config | `playwright.config.ts` (timeout 240s, baseURL Transport `4184`, screenshots/traces on failure) |
| Final result | **6 passed (5.4m)**, `exit_code: 0` |

Credentials, PINs, and access tokens are **not** recorded in this report.

---

## 3. Evidence by test

### Test 1 — Driver submits a stop request → Admin queue shows pending — **PASS**

| Step | Evidence |
|------|----------|
| Driver sign-in | Transport PIN login on dedicated fixture driver |
| Route Setup → Add Stop | UI GPS (Playwright geolocation), name, assign E2E Rider Two |
| Submit | `POST /api/v1/transport/stops` → `approvalStatus: pending` |
| API pending | Admin staff token `GET /stops?route_id=…` matched stop id/name/`pending` |
| Admin UI | Signed in via Admin login; `/transport?view=reviews` showed `Stop: <name>` in Publish queue |

**UI surfaces used:** Transport Route Setup + Admin Publish Requests (`TransportApprovalApiPanel`).

### Test 2 — Admin approves → Transport shows approved — **PASS**

| Step | Evidence |
|------|----------|
| Admin Publish | UI **Publish** → `POST /stops/:id/approve` &lt; 300 |
| API approved | List stops → `approvalStatus: approved` |
| Transport sync | Route Setup shows stop name; status language includes Active/Approved path |
| Duplicate approve safety | Second `POST …/approve` returned one of `200/409/400/422`; status remained `approved` |

### Test 3 — Admin declines with reason → driver sees + resubmits — **PASS**

| Step | Evidence |
|------|----------|
| Separate pending stop | New stop via Transport UI |
| Admin Decline | UI reason + **Decline** → reject API; body includes rejection reason |
| API reason | List stops → `rejected` + reason matching test phrase |
| Driver visibility | Declined tab / body text includes stop name + Declined/Rejected/reason |
| Edit & Resubmit | Scoped **Edit & Resubmit** on rejected card → **Resubmit to Admin** → stop write HTTP OK |
| Back in Admin queue | After resubmit, status `pending` and Admin reviews show `Stop: <name>` |

### Test 4 — Pending/rejected safety vs approved baseline — **PASS**

| Check | Evidence |
|-------|----------|
| Baseline approved stops unchanged | Fixture pickup/drop (or school/gate) still `approved` |
| Pending ≠ approved | All pending rows have status `pending` |
| Rejected ≠ approved | All rejected rows have status `rejected` |
| Product note | Pending remains **operationally usable** for lessons/trips (`isOperationallyUsable`) while Admin status stays pending until Publish — UI copy: “Submitted — usable for trips. Admin can still review.” |

### Test 5 — Authorization — **PASS**

| Check | Evidence |
|-------|----------|
| Driver cannot approve | Driver token `POST …/approve` → `401/403/404` |
| Driver cannot reject | Driver token `POST …/reject` → `401/403/404` |
| Unauthenticated | No bearer `POST …/approve` → `401/403` |
| Isolation | Probe used dedicated institute records only (no production data) |

Cross-institute UI access and “other driver” mutation were not expanded beyond API enforcement on this fixture; backend forbid on writer-only approve/reject paths is what the suite asserts.

### Test 6 — Persistence and recovery — **PASS**

| Check | Evidence |
|-------|----------|
| Approved survives reload | Transport Route Setup reload still shows approved stop name |
| Admin reviews survives reload | Reviews page reload shows Publish queue or empty “Nothing to publish” |
| API persistence | Approved stop from Test 1/2 still `approved` after reload cycle |

Network-failure retry UX was not separately fault-injected in this run (no offline toggle); duplicate-stop collision was covered by the route-order fix below and approve idempotency in Test 2.

---

## 4. Confirmed defects (and fix applied during this phase)

### DEF-ADMIN-INT-01 — Driver stop create 409 colliding with school `route_order` — **Fixed**

| Field | Detail |
|-------|--------|
| Severity | **High** (blocked Driver → Admin submit via UI on fixture with school at order `1`) |
| Symptom | `POST /api/v1/transport/stops` returned **409** `That item already exists`; Transport local store could still show “Waiting for Admin” |
| Root cause | `syncStopAndEnrollmentsToApi` sent `routeOrder: localOrder - 1`, which collided with Admin school stop at API `route_order: 1` |
| Fix | `apps/transport/src/lib/transport/route-setup/api-sync.ts` — allocate `nextFreeRouteOrder()` from live API max+1; preserve API order on PATCH. Unit coverage in `api-sync.test.ts` |
| Verification | Vitest api-sync **5/5**; full Admin integration suite **6/6** after fix |

### Product behavior (not a suite failure) — pending usable before Publish

Pending stops are intentionally usable for trips before Admin Publish. Tests assert **status labels** stay pending/rejected correctly; they do **not** treat “usable” as “approved.”

---

## 5. Missing / partial functionality notes

| Area | Finding |
|------|---------|
| Admin institute picker under Playwright | Custom listbox open was flaky; helper seeds `lx_admin_login_institute_id` then completes Continue → password → **Login** (PIN) through real UI |
| False-success risk (pre-fix) | Before DEF-ADMIN-INT-01, local Route Setup could show Waiting for Admin after 409 — monitor after deploy |
| Cross-institute Admin UI browsing | Not UI-exercised; API authz covered for approve/reject |
| Offline / failed-write toast matrix | Not fault-injected this phase |

No missing **Decline reason** or **Edit & Resubmit** controls were found in the final green run — both exist in Admin API panel and Transport Route Setup.

---

## 6. Admin UI + Transport UI verification

| Surface | Verified in this phase? |
|---------|-------------------------|
| Transport UI (submit, status, resubmit) | **Yes** (real clicks, real API writes) |
| Admin UI (Publish / Decline + reason) | **Yes** (`TransportApprovalApiPanel`, not localStorage demo panel) |
| API persistence cross-check | **Yes** (staff + driver tokens against dedicated institute) |
| API-only-as-proof of Admin UI | **Not used** — Admin UI interactions required for Tests 1–3 |

`blockApiWrites` was **not** used. No production institute data was targeted.

---

## 7. Next recommended QA phase

**Phase 3 — Enrollment + trip coupling under approval states**

Suggested focus:

1. Pending stop used on a live Pickup/Drop day vs Admin later rejecting it mid-day  
2. Enrollment reassignment when a stop is declined and resubmitted  
3. Multi-driver / multi-route institute isolation in Admin reviews UI  
4. Fault injection: failed approve/reject network → no false success toast; safe retry  
5. Regression: keep `transport-workflow` (Pickup→Drop 6/6) + `transport-admin-integration` in CI against API-mode

Do **not** treat Transport as release-ready until Phase 3 (and any open architecture items in other Transport reports) are closed.

---

## Appendix — Artifacts

| Artifact | Location |
|----------|----------|
| Spec | `e2e/transport-admin-integration.spec.ts` |
| Admin helpers | `e2e/transport/admin-helpers.ts` |
| Fixture provisioner | `e2e/transport/provision-fixture.mjs` |
| Playwright project | `transport-admin-integration` in `playwright.config.ts` |
| Failure artifacts (earlier iterations) | `test-results/` (screenshots, traces, videos on failure) |

---

*End of Phase 2 Admin Integration QA report.*
