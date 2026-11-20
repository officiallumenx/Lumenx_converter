# Transport Location Management & Assignment Lifecycle — Implementation Report

**Date:** 2026-11-01  
**Status:** Implemented in repo; **not deployed**. Database migration **not applied** to production.  
**Branch context:** Existing dirty tree preserved; no force reset / no auto-deploy.

---

## 1. Features implemented

| Rule | Status |
|------|--------|
| One common student location (dual-write pickup=drop) | Implemented |
| Driver Manage Location (multi-select reassign) | Implemented |
| No Admin approval for ordinary location changes | Implemented |
| Changes apply from next trip when a trip is active | Implemented (`next_*` + promote at start) |
| Active trip retains original stop assignments | Implemented (`transport_trip_participant` snapshot) |
| Driver-created assignments usable while Pending | Preserved (`isOperationallyUsable`) |
| Admin reject → inactive for subsequent trips | Preserved (snapshot freezes active trip) |
| Rejected students gray + reason | Implemented / polished (Manage Location + Route Setup) |
| Driver edit & resubmit rejected | Preserved (existing Route Setup flow) |
| Admin visibility of location changes | Implemented (dashboard panel + API) |
| Connect shows common assigned location | Implemented (learner summary maps common stop) |

---

## 2. Files changed (primary)

### Database
- `supabase/migrations/20261101140000_transport_location_snapshot.sql`

### Backend
- `backend/src/domains/transport/common-location.ts` (+ `.test.ts`)
- `backend/src/domains/transport/location-assignment.ts` (+ `.test.ts`)
- `backend/src/domains/transport/trip-participant-repository.ts`
- `backend/src/domains/transport/effective-participants.ts`
- `backend/src/domains/transport/ops-service.ts` (promote + snapshot at `startTrip`)
- `backend/src/domains/transport/approach.ts` (prefer effective/snapshot participants)
- `backend/src/domains/transport/approval-service.ts` (roster `rejectionReason`; Connect common location)
- `backend/src/domains/transport/repository.ts` / `types.ts` / `service.ts` (next_* columns, dual-write)
- `backend/src/routes/v1/transport.ts` (`reassign-common-location`, `enrollment-location-changes`)

### Transport app
- `apps/transport/src/features/manage-location/ManageLocationPage.tsx`
- `apps/transport/src/routes/_app/more/manage-location.tsx`
- `apps/transport/src/constants/nav.ts`
- `apps/transport/src/routeTree.gen.ts`
- `apps/transport/src/lib/transport-api.ts` (`reassignCommonLocation`, roster types)
- `apps/transport/src/lib/transport/api-roster.ts`

### Admin
- `apps/admin/src/components/transport/TransportLocationChangesPanel.tsx`
- `apps/admin/src/components/transport/TransportDashboardApiView.tsx`

### Connect
- `apps/connect/src/components/app/transport/LearnerTransportApiView.tsx`
- `apps/connect/src/lib/transport/learner-live.ts`

### QA
- `qa-artifacts/transport-location-management-implementation-report.md` (this file)

---

## 3. New UI screens / components

| Surface | Component | Path |
|---------|-----------|------|
| Transport | **Manage Location** | More → Manage Location (`/more/manage-location`) |
| Admin | **Driver location changes** panel | Transport dashboard (below pending stops) |

Manage Location workflow: locations → students (multi-select) → choose stop → confirm → save.  
Creating brand-new GPS stops remains in **Route Setup** (reused; no duplicate stop editor).

---

## 4. Backend / API changes

### `POST /api/v1/transport/enrollments/reassign-common-location`
Body: `institute_id`, `enrollment_ids[]`, `new_stop_id`, optional `client_event_id`.  
Auth: driver (own route) or transport writer.  
Behavior:
- Validates institute / route / stop / driver ownership.
- Dual-writes common stop to pickup+drop **or** queues `next_pickup_stop_id` / `next_drop_stop_id` when the route vehicle has an active trip.
- Writes `transport_enrollment_location_change` audit row (`effective_mode`: `immediate` | `next_trip`).

### `GET /api/v1/transport/enrollment-location-changes?institute_id=&limit=`
Admin/driver visibility of recent location changes.

### Trip start (`startTrip`)
1. `promotePendingEnrollmentStopsForRoute` — apply deferred `next_*` onto live columns.  
2. `snapshotTripParticipants` — insert immutable `transport_trip_participant` rows (idempotent).  
3. Effective participants / approach prefer snapshot when present.

### Driver roster
Includes `rejectionReason` for declined enrollments.

### Learner transport portal
Resolves one common stop for both pickup and drop display fields.

---

## 5. Database migrations

**File:** `supabase/migrations/20261101140000_transport_location_snapshot.sql`

**Adds (non-destructive):**
- `transport_enrollment.next_pickup_stop_id`, `next_drop_stop_id`, `next_stops_pending_at`
- `transport_enrollment.location_changed_at`, `location_changed_by_driver_id`
- Table `transport_trip_participant` (trip-scoped immutable student↔stop snapshot)
- Table `transport_enrollment_location_change` (audit history)
- RLS select policies for staff membership

**Does not:** drop `pickup_stop_id` / `drop_stop_id`, delete historical rows, or mutate attendance.

**Requires manual apply** before production API that depends on new columns/tables.  
**Do not auto-deploy** this migration without explicit authorization.

### Conflicting historical pickup ≠ drop
- Detection: `hasConflictingPickupDrop()` in `common-location.ts`.
- Read path: prefer pickup, else drop (`resolveCommonLocationStopId`).
- Write path: always dual-write the same id.
- Historical trips/attendance unchanged.
- Manual reconciliation recommended for institutes with many diverging pairs (report query: enrollments where `pickup_stop_id IS DISTINCT FROM drop_stop_id`).

---

## 6. Backward compatibility approach

- Legacy columns retained; new product writes set both equal.
- Trips started **before** snapshot migration fall back to live enrollments (`source: "live"`).
- Trips started **after** promote+snapshot use frozen rows (`source: "snapshot"`).
- Existing pending/approved/rejected approval fields unchanged.
- Connect continues to expose `pickupStop` / `dropStop` DTOs; both now reflect the common stop when available.

---

## 7. How common student location works

1. Authoritative write helper: `commonLocationWritePair(stopId)` → `{ pickupStopId, dropStopId }` same id.  
2. Manage Location and enrollment updates dual-write.  
3. Readers resolve via `resolveCommonLocationStopId` (pickup preferred).  
4. Conflicts are detectable but not silently discarded.

---

## 8. How next-trip-only updates are enforced

If `routeHasActiveTrip` (vehicle has non-finalized, non-completed trip):
- Live `pickup_stop_id` / `drop_stop_id` **unchanged**.
- Deferred fields `next_*` updated.
- Audit `effective_mode = next_trip`.

If no active trip:
- Live columns updated immediately.
- `next_*` cleared.
- Audit `effective_mode = immediate`.

At **next** `startTrip`, deferred values are promoted onto live columns **before** the snapshot is taken.

---

## 9. How active-trip snapshots are preserved

- On trip start, usable enrollments (pending + approved) are copied into `transport_trip_participant`.
- Subsequent enrollment location changes or Admin rejection update live enrollment only.
- `getEffectiveTripParticipants` prefers snapshot rows; approach/boarding expected lists follow that.
- Completing the trip leaves snapshot history; the next trip promotes then snapshots again.

---

## 10. Pending / approved / rejected behavior

| State | New trips | Active trip | Driver UX |
|-------|-----------|-------------|-----------|
| Pending | Usable | Frozen in snapshot if already started | Normal |
| Approved | Usable | Frozen | Normal |
| Rejected | Not usable (`isOperationallyUsable` false) | Snapshot unchanged if rejection mid-trip | Gray + Rejected + reason; edit & resubmit via Route Setup |
| Resubmitted | Returns to Pending; usable again | Prior trip snapshot untouched | Editable |

Ordinary Manage Location reassignments **do not** create approval requests.

---

## 11. Admin and Connect synchronization

- **Admin:** `TransportLocationChangesPanel` lists recent changes (student, previous→new stop ids, driver, mode, timestamp). Pending stop approvals remain on the existing pending-stops card / reviews.
- **Connect:** Learner summary resolves common location; live trip ETA/approach uses trip-scoped participant stops when snapshotted. No full-page reload required beyond existing query/realtime invalidation paths.
- Stale realtime: enrollment refresh still applies to summary; active trip approach uses trip id + snapshot, so mid-trip enrollment changes do not rewrite the active trip stop.

---

## 12. Tests added

| File | Coverage |
|------|----------|
| `backend/.../common-location.test.ts` | Resolve, conflict detect, dual-write (Test H helpers) |
| `backend/.../location-assignment.test.ts` | Immediate vs next_trip, cross-route reject, other-driver reject, promote, snapshot (Tests A/B/C/I/J-ish unit) |

Scenarios mapped:
- **A/B** — reassign single/multi via shared API loop (unit: immediate write + count).
- **C** — next_trip queue + promote + snapshot freeze (unit).
- **D/E/F/G** — pending usable / reject / resubmit covered by existing approval + Route Setup tests; rejection mid-trip safety via snapshot design.
- **H** — common-location conflict + prefer pickup.
- **I** — unauthorized driver / wrong route stop.
- **J** — no false success: API throws on validation; UI shows error toast; saving flag prevents double submit.

Device/E2E for Manage Location UI: **not run on a physical device** in this pass.

---

## 13. Test results (this run)

| Suite | Command | Result |
|-------|---------|--------|
| Transport | `apps/transport` `npm test` | **120 passed** (was 104 baseline; includes prior remediation) |
| Backend Transport | `backend` `npm test -- src/domains/transport` | **120 passed** (was 110; +10 new) |
| Admin transport | `apps/admin` `npm test -- src/lib/transport` | **56 passed** (matches baseline scope) |
| Connect transport | `apps/connect` transport-related | **30 passed** (matches baseline scope) |

**Relevant total (transport-scoped baseline comparison): 326 passed** in these suites.

Full Admin / Connect monorepo suites have unrelated pre-existing failures (registration-gate, module-help wording, inbox reuse timeouts) — **not introduced by this work**.

---

## 14. Typecheck / lint / build results

| Check | Result |
|-------|--------|
| Transport `typecheck` | Pass |
| Admin `typecheck` | Pass |
| Connect `typecheck` | Pass |
| Backend `typecheck` | Pre-existing DOM/`packages/utils` noise; **no remaining `location-assignment` errors** after `TransportTripRow` import fix |
| Transport `lint` | Pass (0 errors; existing warnings only) |
| Backend `build` | Pass |
| Transport `build` | Pass |
| Admin `build` | Pass |
| Connect `build` | Pass |

---

## 15. Remaining issues

1. **Migration not applied** to remote Supabase — APIs that touch new columns/tables will fail until applied.  
2. **Manage Location “Create New Location”** redirects drivers to Route Setup rather than an inline GPS creator (reuse decision).  
3. Admin location-change panel shows truncated UUIDs (not student display names) — adequate for visibility; enrichment optional.  
4. `client_event_id` accepted on reassign but not yet used for server-side idempotency storage.  
5. Conflicting historical pickup/drop pairs need optional ops reconciliation report after migration.  
6. Real-device GPS / Manage Location UX not exercised in this session.  
7. Snapshot failure at trip start is swallowed so trip can still start (falls back to live) — intentional soft failure; monitor in production logs.

---

## 16. Required deployment order

**Do not deploy until explicitly authorized.**

1. Apply SQL migration `20261101140000_transport_location_snapshot.sql` to the target database.  
2. Deploy **API / Workers backend** (depends on new tables/columns).  
3. Deploy **Transport** app (Manage Location UI + client API).  
4. Deploy **Admin** app (location-changes panel).  
5. Deploy **Connect** app (common location labels / mapping).  
6. Smoke: start trip → Manage Location mid-trip → complete → start next trip → verify stop change.  
7. Smoke: reject pending assignment mid-trip → verify active trip unchanged; next trip excludes rejected.

---

## 17. Manual verification steps

1. Driver opens **More → Manage Location**.  
2. Select a stop → select students → choose another stop → confirm.  
3. With **no** active trip: roster shows new stop immediately; Admin panel shows `Effective: immediate`.  
4. Start a trip; change location mid-trip: active attendance/stop order unchanged; Admin shows `Effective: next trip`.  
5. Complete trip; start next: new location used; Connect “Assigned location” matches.  
6. Create stop + assign students in Route Setup → usable while Pending; Admin reviews approve/reject.  
7. Reject with reason → Manage Location / My Assignments show gray **Rejected** + reason; resubmit → Pending again.  
8. Attempt reassign for another driver’s route student → API 403.

---

## Distilled status legend

| Item | Classification |
|------|----------------|
| Common location dual-write + helpers | Implemented and unit-tested |
| next_* deferral + promote at start | Implemented and unit-tested |
| Trip participant snapshot | Implemented and unit-tested |
| Manage Location UI | Implemented; **not tested on real device** |
| Admin location-changes panel | Implemented; needs migration + API deploy |
| Connect common location display | Implemented; typecheck + unit tests pass |
| Schema migration | **Requires database migration** (manual) |
| Production rollout | **Requires deployment** (not done) |
| Full E2E A–J on live envs | Still incomplete (unit-level coverage present) |

---

*End of report. Awaiting review and explicit deployment authorization.*
