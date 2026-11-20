# Four-Module Reliability and Performance — Final Report

**Date:** 2026-10-20  
**Branch:** `fix/cloudflare-workers-build-upload` @ `c384e10e` (+ uncommitted work preserved)  
**Staging identity (gates only; no staging writes this run):** expected `yveadybpntziyryxsrsu`, denylist `kmpzflsurepjwqnfqyld`  
**Re-verify (same day):** API/Admin/Connect/Transport/Nexus/Website tsc PASS; Admin 23, Connect 21, API phase3+4 48 vitest PASS; `learner-live.ts` still unmodified.

---

## A. Overall verdict

| Workstream | Verdict |
|------------|---------|
| 1. Admin Diary + Photos | **PASS** |
| 2. Connect startup / lazy / preload | **PASS** (browser timing **NOT RUN**; build chunk evidence **PASS**) |
| 3. Transport notifications / realtime / loading | **PARTIAL** (producer + staging boarding/live API **PASS**; parent `vehicle_location` realtime **FAIL** — RLS) |
| 4. Nexus institute / subscription lifecycle | **PASS** |

---

## B. Admin Diary

**Read-only:** Admin `/diary` authoring UI/handlers removed. Teachers author in Connect only.  
**Submission status:** Distinct loading / error / needs_institute / forbidden / empty / ready; error ≠ “no submissions.” Unique submitted/draft day counts shown when rows valid.  
**Photos:** Diary domain has **no attachments** (NOT IMPLEMENTED). Repeated photo load fix targets Admin `/photos` + signed URLs: `refetchOnMount: false`, do not overwrite still-usable cached signed URLs, skip dehydrating driver photo lists.  
**Tests (current-run):** Admin tsc PASS; `signed-url.test.ts` 8; `list-view.test.ts` 15.

---

## C. Connect performance

**Cache restore:** Prefetch gated on `!isRestoring` for student/parent/teacher **and** activity workspace; Parent portal treats restore as loading (parity with Student). Prefetch cancel on identity change.  
**Repeated requests:** Critical modules immediate; deferred modules via `requestIdleCallback` / timeout idle pump (`schedule-idle.ts`).  
**Lazy modules:** fees, marks, exams, growth, complaints, diary, assignments, academic-history, certificates, leave → separate chunks (build shows e.g. `FeesPage-*.mjs`, `ExamsPage-*.mjs`).  
**Background preload:** Role-prioritized idle `import()`; skips save-data / 2g; deduped by module id.  
**Measurements:** Connect `vite`/nitro build **PASS** (~12.5s); precise startup-to-usable timing **NOT RUN** (no instrumented browser session this run).  
**Tests:** Connect tsc PASS; schedule-idle 4 + isolation 10 + persist 7.

---

## D. Transport

**Dedupe identity:** Parent `STOP_APPROACHING` = `transport:{trip}:stop:{stop}:approach:{threshold}` with unique guardian recipients (siblings share one parent row). Boarding/drop remain per-student. Student audience skipped when user already in parent recipient set.  
**Status-change notify:** Boarding/drop timeline + notify only when status actually changes.  
**Realtime (staging follow-up, same day):** Live staging probe **ran** against `yveadybpntziyryxsrsu` (see §D2). Driver→parent **live API** PASS; boarding postgres_changes PASS; sibling stop-level notify PASS. Parent `vehicle_location` **postgres_changes FAIL** — phase9 RLS joins `transport_trip` which parents cannot SELECT (migration required; not applied). `learner-live.ts` **untouched**.  
**Loading:** Transport non-critical routes (alerts, more/*) lazy-loaded; home/attendance/emergency stay eager.  
**Tests:** approach 16 + severity 4 + audience 5; Transport tsc PASS; staging probe 28 PASS / 2 FAIL / 1 NOT RUN.

### D2. Staging realtime probe (Task 1)

**Command:** `node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs`  
**Log:** `qa-artifacts/_transport-staging-realtime-probe.txt`  
**Fixture institute:** `lx-staging-transport-rt` (synthetic driver + parent + 3 siblings). Soft-deletes only the trip created that run.

| Scenario | Result |
|----------|--------|
| Staging identity gate | PASS (`yveadybpntziyryxsrsu`) |
| Driver location publish + parent live API | PASS |
| Parent `vehicle_location` RLS / realtime event | **FAIL** (phase9 policy; needs migration) |
| Isolation institute parent denied live | PASS (HTTP 403) |
| Boarding ×3 + idempotent retry + unauthorized | PASS |
| Boarding realtime events | PASS (3) |
| Parent sees boarded state | PASS |
| `STOP_ARRIVED` sibling coalesce (1 notif / 3 kids) | PASS |
| `STOP_APPROACHING` band coalesce | NOT RUN (start grace / at-stop arrival) |
| Boarded notifs per child | PASS (3 / 3) |
| Dropping ×3 | PASS |
| Reconnect cleanup + no duplicate boarding | PASS |
| Unauthorized location | PASS (HTTP 403) |

---

## E. Nexus

**State machine (actual):** `pending → approving → approved | rejected`; reject now from `pending` **or** `approving`; reject idempotent when already rejected; approve seeds 60-day trial.  
**Authz:** Operator-only create/approve/reject (existing); institute cannot self-approve via tenant routes.  
**Fixes:** Shared `ensureTrialSubscriptionForInstitute`; `POST /api/v1/institutes` seeds trial; Nexus Create institute enabled in API mode → identity API.  
**Unsupported:** Website “Get Started” ≠ Nexus registration queue (unchanged).  
**Tests:** registrations-approval 18; identity create→trial assertion; Nexus tsc PASS.

---

## F. Verification (current-run)

| Command | Result |
|---------|--------|
| `npm run typecheck:api` | PASS |
| `npm run typecheck:admin` | PASS |
| `npm run typecheck:connect` | PASS |
| `npm run typecheck --workspace=@lumenx/app-transport` | PASS |
| `npm run typecheck --workspace=@lumenx/app-nexus` | PASS |
| `npm run typecheck:website` | PASS |
| Admin vitest photos+diary list-view | 23 PASS |
| Connect vitest schedule-idle+isolation+persist | 21 PASS |
| API approach+severity+severity | 25 PASS |
| API registrations-approval | 18 PASS |
| API identity (+ trial seed assert) | 5 PASS |
| `npm run build --workspace=@lumenx/app-connect` | PASS (lazy chunks present) |
| Staging multi-role E2E | **NOT RUN** this run (historical 14/14 in prior session) |
| Staging transport realtime probe | **PARTIAL** — 28 PASS / 2 FAIL / 1 NOT RUN (`_transport-staging-realtime-probe.txt`) |
| Transport tsc (Task 1 baseline) | PASS |
| Transport approach+severity+audience vitest | 25 PASS |

Logs under `qa-artifacts/_final-*.txt`, `_phase1-*`, `_phase2-*`, `_phase3-*`, `_phase4-*`, `_transport-staging-realtime-probe.txt`.

---

## G. Changed files (this workstream)

| File | Why |
|------|-----|
| `apps/admin/src/routes/diary.tsx` | View-only monitoring surface |
| `apps/admin/src/routes/photos.tsx` | Cache-first signed URL seeding |
| `apps/admin/src/lib/photos/signed-url.ts` (+ test) | `shouldReplaceCachedSignedPhoto` |
| `apps/admin/src/lib/admin-queries/persist.ts` | Skip dehydrate drivers photo lists |
| `apps/admin/src/lib/diary/list-view.test.ts` | Error vs empty vs loading |
| `apps/connect/src/lib/connect-queries/schedule-idle.ts` (+ test) | Idle prefetch tiers |
| `apps/connect/src/lib/connect-queries/background-preload.ts` | Role chunk preload |
| `apps/connect/src/lib/connect-queries/prefetch-{student,parent,teacher}.ts` | Tiered prefetch |
| `apps/connect/src/context/{Student,Parent,Teacher}PortalContext.tsx` | Restore gate + cancel |
| `apps/connect/src/routes/_authenticated/{fees,marks,exams,growth,complaints,diary,assignments,academic-history,certificates,leave,index}.tsx` | Lazy routes + preload hook |
| `apps/connect/src/lazy-pages/*` | Extracted heavy pages |
| `apps/connect/src/components/app/RouteLazyFallback.tsx` | Suspense fallback |
| `apps/connect/src/lib/connect-queries/isolation.test.ts` | Account-switch regression |
| `backend/src/domains/transport/approach.ts` (+ test) | Coalesce approach notifies |
| `backend/src/domains/transport/transport-notification-severity.ts` (+ test) | Stop-level approach dedupe |
| `backend/src/domains/transport/ops-service.ts` | Notify only on status change |
| `apps/transport/src/routes/_app/alerts.tsx`, `more/*` | Lazy non-critical screens |
| `apps/transport/src/components/app/RouteLazyFallback.tsx` | Suspense fallback |
| `backend/src/domains/subscriptions/ensure-trial.ts` | Shared trial seed |
| `backend/src/domains/registrations/review-service.ts` | Reject approving + idempotent |
| `backend/src/domains/identity/service.ts` | Trial on institute create |
| `backend/tests/registrations-approval.test.ts`, `identity.test.ts` | Lifecycle coverage |
| `apps/nexus/src/lib/institutes/create-api.ts` | API create helper |
| `apps/nexus/src/components/institutes/CreateInstituteDialog.tsx` | API-mode create |
| `apps/nexus/src/routes/institutes.index.tsx` | Create button in API mode |

---

## H. Remaining risks

1. **Parent `vehicle_location` realtime blocked on staging:** `vehicle_location_select_scoped` (phase9) joins `transport_trip`, but parents have no SELECT on `transport_trip`, so RLS returns 0 rows and postgres_changes never delivers. Connect live API (service_role) still works; UI relies on poll + boarding/trip events for refresh. Fix requires an approved RLS migration (SECURITY DEFINER helper or enrollment-only guardian path).  
2. `STOP_APPROACHING` staging band not exercised when first GPS is already inside stop geofence / within `APPROACH_START_GRACE_MS`; stop-level coalesce verified via `STOP_ARRIVED` instead. Unit tests cover approach dedupe keys.  
3. Historical approach dedupe keys were per-student; in-flight DB rows with old keys may coexist until expiry (no migration; new emits use stop keys).  
4. Diary photo attachments remain NOT IMPLEMENTED if product later requires them.  
5. Connect first-usable timing not instrumented in CI.  
6. Concurrent `insertSubscription` races rely on existing uniqueness/idempotency of subscription table (no new migration).

---

## I. Safety confirmation

- No secrets/tokens/`.env` contents exposed.  
- Staging only: `yveadybpntziyryxsrsu`; production denylist `kmpzflsurepjwqnfqyld` enforced by probe gate.  
- Synthetic transport RT fixtures only; soft-deleted probe trips only (no broad cleanup).  
- No migrations / RLS / schema changes applied.  
- No commit, push, deploy, or PR.  
- `apps/connect/src/lib/transport/learner-live.ts` not modified.  
- Admissions / Careers not modified for this task.  
- Pre-existing dirty working tree preserved.
