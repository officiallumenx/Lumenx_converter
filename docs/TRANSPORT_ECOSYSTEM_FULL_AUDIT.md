# LumenX Transport Ecosystem — Full Read-Only Audit

**Date:** 2026-10-15  
**Auditor role:** Senior QA / mobile / backend integration / system analysis  
**Mode:** **AUDIT ONLY** — no application, test, or configuration files modified (this report is the sole permitted write).  
**Method:** Source inspection, existing documentation/QA reports, non-destructive local unit tests, and four read-only deep-dive passes (Admin, Connect, Transport driver, notifications/GPS/timing). No fixture provisioning, trip resets, or production/shared data writes. Report amended 2026-10-15 after deep-dives completed.

---

## A. Executive summary

### Observed health (by surface)

| Surface | Observed health | Notes |
|---------|-----------------|--------|
| **Transport (driver)** | Partially verified by prior Playwright/API-mode QA; core pickup→drop lifecycle exists | Strong API-mode client (outbox, GPS, hydrate). Attendance interaction is nuanced (tap vs hold vs confirm). Prior E2E noted Drop mark UI issues. |
| **Admin Transport** | API-first hub; demo branches remain in tree but **unreachable** (`isApiAuthMode()` always true) | Live path: `*ApiPanel` + React Query + Supabase realtime. Demo/localStorage panels and attendance hints still present as dead/legacy UI. |
| **Connect Transport** | API-only learner portal (`LearnerTransportApiView`) | Live GPS/ETA/boarding via portal APIs; no interactive map; transport alerts live in global inbox/FCM, not on the Transport page. Prior E2E: parent status often **BLOCKED** (credentials). |
| **Backend** | Single operational SoT for trips, boarding events, GPS, notifications | `isOperationallyUsable`: pending≈approved for ops; rejected blocked. Approach notifications are server-emitted with dedupe + start grace. |

### Most significant verified findings

1. **F-ATT-001 / Issue 5:** First tap on a *pending* student is designed to mark boarded/dropped **without** a confirm dialog; confirm is for **undo/change**. “Needs two clicks” may be confusion with undo confirm, GPS block, wrong tab, long-press conflict, or failed sync showing optimistic UI.
2. **F-ADMIN-001:** Admin demo attendance empty-state still documents **shared localStorage** as the data path — conflicts with API boarding SoT used in apiMode.
3. **F-BE-001:** `enrichTrip` builds stop plans from **all** route stops (no approval filter), while Connect learner pickup/drop names use **usable** (pending/approved) stops only — cross-app inconsistency risk.
4. **F-NOTIF-001:** Approach alerts intentionally emit only the **tightest** ETA band per ping and suppress for **90s** after trip start — can look like “late” or “missing” early notifications.
5. **F-GPS-001:** Driver GPS targets ~**2.5s** pings with client thinning (8 m / heartbeat); Connect refreshes live on realtime `vehicle_location` (400 ms debounce) or polls 20s/120s — “stale” is classified, not always “live.”
6. **F-REL-001:** Optimistic attendance marks + silent hydrate catch can leave UI ahead of or behind API if outbox fails.
7. **F-ADMIN-003:** Admin product auth is API-only; transport → Admin inbox mirror is **demo-gated** — production staff rely on `/api/v1/notifications` + FCM, not `transport-notification-sync`.
8. **F-TIME-002:** Admin trip/attendance “today” queries use `toISOString().slice(0,10)` (**UTC date**), while driver/backend service date uses institute TZ / Asia/Kolkata — midnight mismatch risk.

### Major unknowns / unverified

- Real Android device GPS background / battery optimization (**NOT RUN** this audit; prior reports also NOT RUN for device GPS-off). iOS has **no** native trip-tracking peer (Android `TripTrackingService` only).
- Live cross-app notification delivery to a real parent device (FCM path exists in code; end-to-end delivery **NOT RUN** here; API was **DOWN** for live probes).
- Mid-trip Admin reject of a stop while trip active (called out in Phase 3 remaining risks; not re-executed).
- Whether `notifications_enabled` / reminder “preference-aware” filtering actually consults per-user prefs (header claim **Unconfirmed** in emit path).

### Release readiness

**No release-ready claim.** Prior phases (workflow 6/6, admin integration 6/6, phase3 6/6) prove dedicated-fixture slices only. This audit did not re-run Playwright against a live stack (API `8787` unreachable during inspection).

---

## B. Findings register

### F-ATT-001 — Attendance first interaction is tap-to-mark, not select-then-confirm
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance / UX |
| Observed | `onBoardingTap` / `onDroppingTap`: if status `pending`, call `applyBoarding/Dropping` immediately; if already marked, open confirm to **undo**. Cards say “Tap = Boarded · Hold = Not boarded.” |
| Expected (from implementation) | One tap marks pending→boarded/dropped; confirm only for undo/change. |
| Reproduction | Code path: `AttendancePage.tsx` ~396–475; `StudentAttendanceCard.tsx` ~89–146 |
| Root cause | N/A for design; if testers expect select-then-confirm, mismatch is **expectation vs implementation**. Failures to mark on first tap need separate causes (below). |
| Severity | Medium (UX clarity) / High if GPS/sync makes first tap appear ignored |
| Confidence | **Confirmed** (code) |
| Test | Unit attendance sync tests exist; Playwright marks student by name click (helpers) — not a dedicated first-click matrix. |

### F-ATT-002 — GPS-off disables attendance taps
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance / GPS guard |
| Observed | `locationBlocked = locationTrack.status === "off"` disables cards and toasts “Turn on location” on tap. |
| Evidence | `AttendancePage.tsx` ~234, 397–401, 629 |
| Severity | High if GPS flickers “off” during trip |
| Confidence | **Confirmed** |

### F-ATT-003 — Long-press vs tap gesture (520 ms)
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance / input |
| Observed | `useTapLongPress` waits 520 ms for hold; tap fires on pointer **up**. Scroll/`pointerleave` can cancel an in-progress press without firing tap. |
| Evidence | `use-tap-long-press.ts` ~3–65 |
| Severity | Medium (Probable contributor to “first click ignored” on touch devices) |
| Confidence | **Probable** for device feel; **Confirmed** mechanism |

### F-ATT-004 — Optimistic local mark + outbox; hydrate errors swallowed
| Field | Value |
|-------|--------|
| Apps | Transport / Backend |
| Category | Attendance sync |
| Observed | `markBoarding` applies local state then enqueues ops event; `hydrateAttendanceFromApi` catch keeps screen state on failure. Sync chip: syncing / confirmed / error. |
| Evidence | `attendance/repository.ts` ~122–163; `store.ts` ~214–242 |
| Severity | High when UI shows boarded but API never confirms |
| Confidence | **Confirmed** mechanism; live dual-state incidents **Unconfirmed** this session |

### F-ATT-005 — Prior E2E: Drop mark UI vs boarding confusion
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance / Drop tab |
| Observed | `docs/TRANSPORT_E2E_QA_REPORT.md`: Dropping tab automation still showed boarding copy; toast `boarded` not `dropped`. |
| Severity | High |
| Confidence | **Confirmed** in prior report (2026-10-10); **not re-run** this audit |
| Test | Prior Playwright/API session |

### F-ATT-006 — Dead `finalized` confirm branch vs store
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Incomplete / dead path |
| Observed | UI handles `result.code === "finalized"` to open confirm, but `applyLocalBoarding` / `applyLocalDropping` do not return `finalized` (always apply locally). |
| Evidence | `AttendancePage.tsx` ~330–340; `store.ts` ~101+ |
| Severity | Low (dead branch) |
| Confidence | **Confirmed** |

### F-ATT-007 — `confirmChange` option ignored; no per-student tap mutex
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance sync |
| Observed | Confirm sheet passes `{ confirmChange: true }` but repository ignores `_options`. Rapid taps enqueue multiple ops events with distinct `clientEventId`s until server conflict. Success toast fires on optimistic local apply. |
| Evidence | `attendance/repository.ts` ~122–169; `AttendancePage.tsx` confirm handlers ~512–543 |
| Severity | Medium–High (false success / duplicate marks) |
| Confidence | **Confirmed** |

### F-ATT-008 — Morning same-trip drop requires boarded first; evening does not
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Attendance rules |
| Observed | `requiresBoardedBeforeDrop(slot)` returns true unless `slot === "evening"`. Drop tap can toast “Board first” on morning trips. |
| Evidence | `roster-visibility.ts` ~28–31; `AttendancePage.tsx` dropping tap |
| Severity | Medium (can look like “tap ignored”) |
| Confidence | **Confirmed** |

### F-ATT-009 — Boarding stopId may use current route stop, not enrollment pickup
| Field | Value |
|-------|--------|
| Apps | Transport / Backend |
| Category | Attendance payload |
| Observed | Mark path uses enrollment `stopId` or **current route stop index** at mark time — not guaranteed student pickup stop. |
| Evidence | `attendance/repository.ts` ~132–149 |
| Severity | Medium |
| Confidence | **Confirmed** |

### F-ADMIN-001 — Demo attendance still describes localStorage SoT
| Field | Value |
|-------|--------|
| Apps | Admin |
| Category | Dual SoT / documentation in UI |
| Observed | Non-api `TransportAttendanceView` empty hint: records appear “via shared localStorage.” Live hub uses `TransportAttendanceApiPanel`. Demo branch is unreachable today (`isApiAuthMode()` always true) but copy remains misleading if that view is ever mounted. |
| Evidence | `TransportAttendanceView.tsx` ~115–118; `auth-mode.ts` ~46–54; `transport.tsx` API/demo branches |
| Severity | Medium (dead path today) / High if demo branch re-enabled |
| Confidence | **Confirmed** |

### F-ADMIN-002 — Reviews: API panel vs localStorage demo panel
| Field | Value |
|-------|--------|
| Apps | Admin |
| Category | Architecture |
| Observed | Hub `view=reviews` uses `TransportApprovalApiPanel`. `TransportApprovalPanel` (localStorage `lumenx.transport.route-setup.v1`) still embeds on **route detail** in API mode while Admin startup **clears** that key — panel is empty/dead but mounted. |
| Evidence | `transport.tsx` reviews branch; `TransportRoutesView.tsx` ~129–131; `transport-notification-sync.ts` clears route-setup key |
| Severity | Medium (false confidence / clutter) |
| Confidence | **Confirmed** |

### F-ADMIN-003 — Transport workflow notifications not mirrored into Admin center (API mode)
| Field | Value |
|-------|--------|
| Apps | Admin |
| Category | Notifications |
| Observed | `startTransportAdminNotificationSync` only mirrors utils bridge when `VITE_ADMIN_AUTH_MODE === "demo"`; otherwise clears legacy keys. Staff transport alerts must come from backend `/api/v1/notifications` + FCM (`targetApps` admin). |
| Evidence | `transport-notification-sync.ts` ~81–93; `resolve-target-apps.ts` parent→connect / driver→transport / admin→admin |
| Severity | Medium–High if operators expect mirrored driver utils alerts in Admin chrome |
| Confidence | **Confirmed** |

### F-ADMIN-004 — Home SOS strip is one-shot; no realtime
| Field | Value |
|-------|--------|
| Apps | Admin |
| Category | Emergencies / freshness |
| Observed | `HomeCommandCenter` fetches active emergencies once in `useEffect`; no `useTransportRealtimeInvalidate` on Home. Attention can lag until remount/navigation. |
| Evidence | `HomeCommandCenter.tsx` ~160–183 |
| Severity | Medium |
| Confidence | **Confirmed** |

### F-ADMIN-005 — Admin enrollment assign clears pickup/drop stop IDs
| Field | Value |
|-------|--------|
| Apps | Admin |
| Category | Enrollment |
| Observed | API assign path sets `pickupStopId: null`, `dropStopId: null`; no Admin UI to set pickup/drop on assign (driver/route-setup owns stop linkage). |
| Evidence | `transport.tsx` ~1169–1174 |
| Severity | Medium (process gap, not necessarily a bug) |
| Confidence | **Confirmed** |

### F-BE-001 — Trip enrich stop plan ignores approval_status
| Field | Value |
|-------|--------|
| Apps | Backend / Cross-app |
| Category | Stop usability inconsistency |
| Observed | `enrichTrip` lists all route stops into pickup/drop plans; Connect learner resolves pickup/drop names only from `isOperationallyUsable` stops. |
| Evidence | `ops-service.ts` ~224–245; prior Phase 3 audit of `approval-service.ts` learner path |
| Severity | Medium–High if rejected stops remain on route with enrollments pointing at them |
| Confidence | **Confirmed** (code divergence); operational impact **Probable** |

### F-BE-002 — Pending operationally usable (product contract)
| Field | Value |
|-------|--------|
| Apps | Backend / All |
| Category | Business rule |
| Observed | `isOperationallyUsable` = pending \|\| approved; trip start blocked only for **rejected route**. |
| Evidence | `approval.ts` ~8–17; `ops-service.ts` ~541–545 |
| Severity | N/A (rule) — testers may mis-label “pending used on trip” as a bug |
| Confidence | **Confirmed** |

### F-NOTIF-001 — Approach band fan-out suppressed + 90s start grace
| Field | Value |
|-------|--------|
| Apps | Backend / Connect |
| Category | Notifications / timing |
| Observed | Only nearest ETA band emitted per ping; `APPROACH_START_GRACE_MS = 90_000` after trip start. Dedupe keys per band. Backend emit is SoT (no frontend business notifications). |
| Evidence | `approach.ts` ~34–100; `ops-notifications.ts` header comments |
| Severity | Medium (explains early “missing” alerts) |
| Confidence | **Confirmed** |

### F-NOTIF-002 — Cross-app notification E2E often blocked historically
| Field | Value |
|-------|--------|
| Apps | Cross-app |
| Category | Notifications delivery |
| Observed | Prior E2E: Transport alerts PASS; Admin/Connect parent **BLOCKED** (credentials). |
| Evidence | `TRANSPORT_E2E_QA_REPORT.md` scenario 10 |
| Severity | High for product trust |
| Confidence | **Confirmed** (prior); **NOT RUN** this audit |

### F-GPS-001 — 2.5s ping + client thinning
| Field | Value |
|-------|--------|
| Apps | Transport → Backend → Connect/Admin |
| Category | Location |
| Observed | `PING_INTERVAL_MS = 2500`, min move 8 m, accuracy caps; Capacitor `watchPosition` / browser geolocation. |
| Evidence | `gps-outbox.ts` ~39–45; `location-tracking.ts` |
| Severity | Medium (perceived lag) |
| Confidence | **Confirmed** |

### F-GPS-002 — Connect freshness classes + poll fallback
| Field | Value |
|-------|--------|
| Apps | Connect |
| Category | Location display |
| Observed | Live query poll 20s without realtime, 120s with realtime; `vehicle_location` realtime debounced 400 ms; stale/offline must not invent ETA countdown. |
| Evidence | `LearnerTransportApiView.tsx` ~196–253; `learner-live.ts` ~273 area |
| Severity | Medium |
| Confidence | **Confirmed** |

### F-GPS-003 — GPS pings wait for server UUID trip id; iOS native tracking absent
| Field | Value |
|-------|--------|
| Apps | Transport |
| Category | Location |
| Observed | `isTripActive` includes `starting`, but GPS outbox skips until `isServerTripId`; accuracy >500 m rejected. Android `TripTrackingService` + background location; iOS explicitly no native peer. |
| Evidence | `gps-outbox.ts` ~219–227, 307–323; `trip-tracking-native.ts`; `AndroidManifest.xml` |
| Severity | Medium (start lag / platform gap) |
| Confidence | **Confirmed** |

### F-CONNECT-001 — API Transport page has no in-page alert list
| Field | Value |
|-------|--------|
| Apps | Connect |
| Category | Notifications UX |
| Observed | `TransportAlertsList` only on unused `LearnerTransportView`. Production `LearnerTransportApiView` relies on global inbox/FCM; page subtitle still mentions pickup alerts. |
| Evidence | `LearnerTransportView.tsx` ~125–129; `ParentTransportPage.tsx`; `LearnerTransportApiView.tsx` |
| Severity | Medium |
| Confidence | **Confirmed** |

### F-CONNECT-002 — `realtimeConnected` set true before subscribe succeeds
| Field | Value |
|-------|--------|
| Apps | Connect |
| Category | Location freshness |
| Observed | Flag set true on `try` before subscribe outcome; UI may show live updates while falling back to **120s** poll if events miss. |
| Evidence | `LearnerTransportApiView.tsx` ~229–231, 197–206 |
| Severity | Medium |
| Confidence | **Confirmed** |

### F-CONNECT-003 — Live load errors swallowed to empty “not started”
| Field | Value |
|-------|--------|
| Apps | Connect |
| Category | Error handling |
| Observed | `loadLearnerTransportLive` errors → `null`; UI shows empty tracking without distinct error. `placeholderData` keeps last position during failed refetch. |
| Evidence | `learner-live.ts` ~317–326, 143–154; hooks `placeholderData` |
| Severity | High (silent failure) |
| Confidence | **Confirmed** |

### F-CONNECT-004 — Scheduled stop times always “Not scheduled”
| Field | Value |
|-------|--------|
| Apps | Connect |
| Category | Timing display |
| Observed | Mapper sets pickup/drop schedule strings to `"Not scheduled"`; only institute `expectedPickupTime` on live DTO fills expected pickup. Unit test expects this. |
| Evidence | `learner-live.ts` ~131–133; `learner-live.test.ts` |
| Severity | Low–Medium (UX clarity) |
| Confidence | **Confirmed** |

### F-TIME-001 — Asia/Kolkata service date + homeAction
| Field | Value |
|-------|--------|
| Apps | Transport / Backend |
| Category | Timing |
| Observed | Service date uses institute timezone with Asia/Kolkata fallback; `homeAction` from morning/evening completion flags + hydrate from list-trips. No wall-clock “morning window” on driver home (copy: no schedule window). Evening start requires morning completed (client + server). |
| Evidence | `trip/service-date.ts`; `day-state.ts`; `ops-service.ts` ~556–573; hydrate tests |
| Severity | High if TZ wrong (wrong slot/day) |
| Confidence | **Confirmed** for implementation; live TZ misconfig **Unconfirmed** |

### F-TIME-002 — Admin “today” uses UTC calendar date
| Field | Value |
|-------|--------|
| Apps | Admin / Cross-app |
| Category | Timing |
| Observed | Trip/attendance panels hard-code today via `new Date().toISOString().slice(0, 10)` (UTC). Driver/backend service date uses institute local / Kolkata. Near IST midnight, Admin can query wrong service day vs driver. |
| Evidence | Admin trips/attendance query wiring; `daily-exception-service.ts` / `service-date.ts` |
| Severity | High near midnight IST |
| Confidence | **Confirmed** mechanism; live incident **Unconfirmed** |

### F-REL-001 — Enrollment moved immediately on pending stop assign
| Field | Value |
|-------|--------|
| Apps | Transport / Backend |
| Category | Enrollment reliability |
| Observed | `syncStopAndEnrollmentsToApi` PATCHes pickup to new pending stop immediately; reject does not auto-restore prior pickup (Phase 3 risk). |
| Evidence | `api-sync.ts`; Phase 3 report remaining risks |
| Severity | High for parent/driver confusion |
| Confidence | **Confirmed** |

### F-TEST-001 — Local API unavailable during this audit
| Field | Value |
|-------|--------|
| Apps | All |
| Category | Verification gap |
| Observed | `GET http://127.0.0.1:8787/api/v1/health` failed; Playwright/E2E not re-run. |
| Severity | Blocks live confirmation of Issues 1–6 today |
| Confidence | **Confirmed** |

### F-TEST-002 — Vitest monorepo root alias failures
| Field | Value |
|-------|--------|
| Apps | Tooling |
| Category | Test harness |
| Observed | Running selected vitest from repo root failed to resolve `@/lib/...` for some files (file exists under `apps/transport/.../drop-stop.ts`). 19 tests still passed in other files. |
| Severity | Low–Medium for CI clarity |
| Confidence | **Confirmed** (this session) |

---

## C. Six reported issues

### 1. Improper notifications

**Pipeline (verified in code):**  
Triggers (GPS ping → approach/arrival; trip/boarding/SOS ops; **~60s** `processTransportRemindersSystem` for morning/pre-pickup/not-started/GPS stale/delayed) → `emitTransportNotification` / Safe → `emitNotificationForInstituteSystem` → `notification` + recipients + in-app + FCM queue → apps via `/api/v1/notifications` and FCM (`parent→connect`, `driver→transport`, `admin→admin`). Dedupe on `(institute_id, dedupe_key)`. Critical can bypass `notifications_enabled`.

**App consumption:** Transport inbox poll **45s** + push invalidate; Connect global inbox/FCM (no Transport-page alert list in API mode — F-CONNECT-001); Admin notifications shell **45s** — **not** the demo-only `transport-notification-sync` bridge (F-ADMIN-003).

**Likely explanations for reported symptoms (evidence-based):**

| Symptom | Plausible mechanism | Confidence |
|---------|---------------------|------------|
| Too early / flood | Historical; mitigated by tightest-band-only + 90s grace + dedupe | Confirmed mitigations exist |
| Too late / missing early | Start grace 90s; ETA not publishable when GPS stale; Connect 120s poll if realtime “connected” but events miss | Confirmed mechanisms |
| Wrong recipient | Audience helpers + targetApps — **not re-probed** live | Unconfirmed delivery |
| Duplicate | Dedupe keys; unique violation → idempotent; FCM worker retries with backoff | Confirmed intent |
| Transport-only visible | Prior E2E: driver alerts work; parent/Admin credential blocks; Connect alerts not on Transport screen | Confirmed historically / Confirmed UX split |

**Not proven this session:** FCM delivery on device, read/unread cross-app consistency under load, per-user reminder preference filtering.

### 2. Location updates

**Pipeline:** Capacitor/browser watch + Android foreground `TripTrackingService` → `gps-outbox` (~2.5s, 8 m / heartbeat thin) → ops outbox → `POST .../trips/:id/location` (30 m max age, 60 s future skew, ≤500 m accuracy, client_event_id idempotency, server 8 m/2.5 s thin, jump reject) → approach side effects → Admin trip DTO / Connect live API → freshness bands (live ≤45 s, recent ≤120 s, stale ≤10 m).

**Observed behaviors encoded:**

- Poor GPS surfaces `gps_error` (unit-tested intent in `gps-outbox.test.ts`).
- Offline queues GPS; prior E2E offline banner **PASS**.
- Connect refuses to invent ETA when stale/offline; hides coords unless live/recent (`learner-live.ts`, `gps-freshness.ts`).
- Admin GPS realtime invalidates **trips today only** — not boarding/analytics caches.
- Pings wait for server UUID `tripId` (F-GPS-003).

**Unverified:** Android Doze/OEM battery limits; iOS background GPS (no native service).

### 3. Improper timing and tracking

**Sources of time:**

- Service date: institute TZ / `Asia/Kolkata` fallback (`service-date.ts`).
- Trip slots: morning Pickup / evening Drop; `homeAction` after hydrate (`day-state.ts`, hydrate tests).
- Approach ETA: `eta-engine` + bands 30/15/5 (`approach.ts`).
- Display age: GPS `capturedAt` vs “now” on clients.

**Risks:** device clock skew vs server; hydrate race on home CTA (previously addressed in Return/Drop fix reports — not re-audited as open defect); Admin/Connect lag vs 2.5 s driver ping; **F-TIME-002** Admin UTC “today” vs institute service date; reminder windows 05:30–07:00 and trip-delayed / GPS-stale jobs on 60 s background cadence.

### 4. Attendance marking problems

**Pipeline:** Roster from driver-route-roster → attendance store → tap/hold → optimistic local mark → enqueue boarding/drop event → flush outbox → backend validation → hydrate from `listBoardingViaApi` → Admin `TransportAttendanceApiPanel` / Connect live boarding fields.

**Documented problem classes:**

- Wrong tab / wrong mode (prior Drop FAIL).
- Enrollment/stop mapping (`resolveDropStopIdForMark`, board-before-drop rules).
- Optimistic UI vs failed sync (`syncStatus: error`).
- Pending stop enrollment moves pickup immediately (F-REL-001).

### 5. Attendance does not mark on one click

**Implementation-intended behavior (Confirmed):**

1. Student `boarding/dropping === "pending"` → **one tap** triggers mark (no confirm).
2. Already marked → **tap opens confirm to undo** (second intentional step).
3. Long-press → not_boarded / not_dropped (or confirm if changing).

**Therefore:** “One click does nothing / needs second click” is **not** the designed select→confirm flow for first mark. Separate observed blockers:

| Blocker | Evidence |
|---------|----------|
| GPS off | Toast + disabled cards |
| Undo confirm mistaken for “first mark confirm” | Tap on already-boarded opens dialog |
| Gesture cancel (scroll/leave) | `useTapLongPress` |
| Sync failure after optimistic UI | Outbox / hydrate |
| Wrong attendance tab | Prior Drop E2E |

**API on first successful tap:** Yes — enqueue + flush when online (`repository.markBoarding`).

### 6. Overall process does not feel reliable

**Cross-cutting reliability themes (from code + prior QA):**

| Theme | Evidence |
|-------|----------|
| Dual Admin SoT (API vs demo/localStorage) | `transport.tsx` branching; demo attendance hint |
| Optimistic driver UI vs API SoT | Attendance + GPS outboxes; success toast before ack (F-ATT-007) |
| Pending usable vs “approved” language | Approval contract vs UX copy |
| Connect silent live failure / slow poll | F-CONNECT-002/003 |
| Connect alerts off Transport page | F-CONNECT-001 vs global inbox |
| Admin dead demo panels / Home SOS lag | F-ADMIN-002/004 |
| Admin UTC today vs Kolkata service date | F-TIME-002 |
| Credential/environment blockers | Prior E2E BLOCKED Admin/parent |
| Incomplete mid-trip reject / enrollment revert | Phase 3 remaining risks |
| Dead UI branches | `finalized` confirm; ignored `confirmChange` |

---

## D. Cross-application data flow

```
Driver Transport UI
  → client stores (trip / attendance / route-setup / gps-outbox / ops-outbox)
  → REST /api/v1/transport/* (auth: transport pin-login)
  → Backend domains (ops-service, approval-service, approach, notifications)
  → Postgres (trips, boarding events, vehicle_location, stops, enrollments, emergencies)
  → Realtime channels (Supabase) + notification fan-out
  → Admin (*ApiPanel + React Query invalidate)
  → Connect (LearnerTransportApiView live/summary/history + inbox)
```

| Data | Producer | Persisted? | Admin | Connect |
|------|----------|------------|-------|---------|
| Trip start/end | Driver | Yes | Trips API panel | Live phase / history |
| GPS | Driver outbox | Yes | Trip monitor | Live map / age / ETA |
| Boarding/drop | Driver outbox | Yes | Attendance API panel | Live + history labels |
| Stop approval | Driver submit / Admin publish|decline | Yes | Approval API panel | Usable stops only for names |
| SOS | Driver | Yes | Emergencies API panel | Live emergency fields |
| Approach notify | Backend on GPS | Notification rows | Staff targets | Guardian targets |

---

## E. Test coverage and execution results

### Existing automated coverage (discovered)

| Layer | Examples | Notes |
|-------|----------|-------|
| Unit (Transport) | attendance sync, gps-outbox, hydrate/homeAction, api-sync, assignment-readiness | Strong for client logic |
| Unit (Backend) | transport.test.ts, flowchart-contract, approach/ETA related | Large API contract surface |
| Unit (Connect) | learner-live.test.ts | Mapping/freshness |
| Playwright | `transport-workflow`, `transport-admin-integration`, `transport-phase3`, auth boundaries | Dedicated institute fixtures |
| Prior reports | E2E QA, Admin Integration, Phase 3, Return/Drop, UI audits | Mixed PASS/BLOCKED/FAIL |

### Commands executed **this** audit

```text
# Health probe (read-only)
Invoke-WebRequest http://127.0.0.1:8787/api/v1/health
→ API_DOWN

# Unit (local, no remote DB writes intended)
npx vitest run apps/transport/src/features/attendance `
  apps/transport/src/lib/transport/attendance `
  apps/transport/src/lib/transport/gps-outbox.test.ts `
  apps/connect/src/lib/transport/learner-live.test.ts --reporter=dot
→ 19 tests passed in 5 files; 2 files failed to load (path alias / resolution from repo root)
```

| Metric | Count |
|--------|------:|
| Planned live E2E this audit | 0 (API down → **BLOCKED**) |
| Unit files attempted | 7 |
| Unit files collected OK | 5 |
| Unit tests passed | 19 |
| Unit files failed to load | 2 |
| Playwright this audit | **NOT RUN** |
| Real device | **NOT RUN** |

### Prior executed evidence (not re-run today)

- Playwright transport-workflow 6/6; admin-integration 6/6; phase3 6/6 (Oct 2026 reports).
- Broader E2E QA: mixed PASS/FAIL/BLOCKED (Drop mark fail; Admin/Connect credential blocks).

### Gaps

- No automated first-click vs confirm matrix for attendance.
- No automated mid-trip stop reject.
- No real-device GPS/background suite.
- No cross-app notification delivery assertion in CI.
- Admin demo panels still testable separately from API panels.

---

## F. Incomplete or disconnected functionality

| Item | Evidence |
|------|----------|
| Admin demo attendance via localStorage messaging | `TransportAttendanceView` hint (unreachable branch today) |
| Admin `TransportApprovalPanel` on route detail in API mode | Empty after startup clears `route-setup.v1` (F-ADMIN-002) |
| Admin `apiMode ? … : demo` trees | Dead with `isApiAuthMode() === true` |
| Connect `LearnerTransportView` / `transportStore` | Legacy; not wired in production UI |
| Connect `mock-data.ts` / scheduled “Not scheduled” | F-CONNECT-004 |
| Connect in-page `TransportAlertsList` | Demo path only (F-CONNECT-001) |
| Attendance UI `finalized` confirm + ignored `confirmChange` | F-ATT-006 / F-ATT-007 |
| `finalizeAttendanceForActiveTrip` intentionally empty | `store.ts` ~209–212 |
| Legacy localStorage attendance/ops keys cleared on Admin/Transport boot | Avoids same-browser demo bridge |
| Offline trip start | Queues but **throws** — cannot start offline |
| iOS native trip tracking | No-op (Android only) |
| Playwright webServer env historically pointed some apps’ `VITE_API_BASE_URL` at own origin when spawning | Prior Phase 3 report risk |

---

## G. Questions requiring clarification

1. Should **pending** stops appear on the driver’s live trip stop list the same as **approved**, or only be usable for enrollment/roster?
2. When a pending stop that already received enrollment pickup is **rejected**, should pickup **auto-revert**, stay pointing at rejected stop, or require Admin action?
3. Is **one-tap board/drop** the accepted product UX, or do operators want an explicit confirm on first mark?
4. Should approach notifications fire during the first **90 seconds** after trip start, or is silence intentional?
5. Should Admin trip/attendance “today” follow **institute service date** (same as driver) rather than UTC calendar date?
6. What is the SLA for Connect location “live” vs “recent” vs “stale” (seconds), for support scripts?
7. Should Connect Transport show an in-page alert feed, or is global Notifications/Inbox the sole parent surface?
8. Are transport reminder “preferences” meant to filter emits, or is institute `notifications_enabled` the only gate?

---

## H. Recommended investigation priorities

Investigation only — **no fixes authorized by this document.**

| Priority | Finding | Why first |
|----------|---------|-----------|
| P0 | F-ATT-005 + Issue 4/5 on real Drop tab | Prior FAIL; parents/Admin trust boarding/drop marks |
| P0 | F-ATT-002/003/004/007/008 under real GPS + touch | Explains “one click” without assuming bad design |
| P0 | F-NOTIF-002 + F-CONNECT-001 live parent/Admin delivery UX | Cross-app reliability perception |
| P0 | F-TIME-002 Admin UTC today near IST midnight | Wrong-day trips/attendance on Admin |
| P1 | F-CONNECT-003 silent live null | Parents see “not started” on API errors |
| P1 | F-ADMIN-003/004 notification + Home SOS lag | Staff operational awareness |
| P1 | F-BE-001 enrichTrip vs usable stops | Rejected/pending stop plan inconsistency |
| P1 | F-REL-001 enrollment on reject | Data integrity after Phase 3 |
| P2 | F-ADMIN-002 dead route-detail approval panel | Operator confusion |
| P2 | Real-device background GPS / iOS gap | Completes Issue 2 |
| P2 | Mid-trip Admin reject | Phase 3 leftover |

---

## I. Final status

| Area | Status |
|------|--------|
| Code-level architecture map | **Verified** (this audit + four deep-dive passes) |
| Issues 1–6 mechanisms | **Partially verified** in code; live reproduction **BLOCKED** (API down; no device) |
| Prior Playwright fixture suites | **Historically green** for scoped phases; not re-executed today |
| Production/shared data | **Not touched** |
| Fixes / product decisions | **None made** |

**What remains uncertain:** live notification/FCM delivery, device GPS lifecycle (esp. OEM kill + iOS), whether Drop-tab marking defect still reproduces after later fixes, and whether reminder preference filtering is implemented.

**What requires a safe live test environment:** restart API + Transport + Admin + Connect; dedicated institute credentials; optional Android device with location unrestricted; then reproduce Issues 1–6 with traces (network, `syncStatus`, GPS freshness labels, notification rows, Admin date near midnight IST).

---

## Appendix — Deep-dive sources (read-only)

| Pass | Focus |
|------|--------|
| [Audit Admin Transport surface](3d755765-2ed6-4d07-87a7-30329ff04424) | Admin hub API vs demo, realtime invalidate, Home SOS, approval panels |
| [Audit Connect Transport UX](213237ee-ffb9-41dd-9342-51348feff9db) | Parent/student live portal, poll/realtime, boarding semantics, alert UX |
| [Audit Transport driver app](04fc162b-c02f-468c-95b4-8963b179f8e1) | Login→trip→attendance→GPS→SOS→outbox; Issue 5 one-click path |
| [Audit notifications GPS timing](5b0df6d4-e072-4e61-912f-17c0161f4305) | Emit pipeline, reminders, GPS POST validation, service date / ETA |

---

## Appendix — Key file index

| Area | Paths |
|------|--------|
| Driver attendance UI | `apps/transport/src/features/attendance/AttendancePage.tsx`, `StudentAttendanceCard.tsx`, `use-tap-long-press.ts` |
| Attendance sync | `apps/transport/src/lib/transport/attendance/repository.ts`, `store.ts` |
| GPS | `apps/transport/src/lib/transport/gps-outbox.ts`, `location-tracking.ts` |
| Timing / home | `apps/transport/src/lib/transport/trip/day-state.ts`, `service-date.ts` |
| Approach / notify | `backend/src/domains/transport/approach.ts`, `ops-notifications.ts`, `transport-notification-emit.ts` |
| Approval contract | `backend/src/domains/transport/approval.ts` |
| Trip enrich | `backend/src/domains/transport/ops-service.ts` |
| Admin routing | `apps/admin/src/routes/transport.tsx` |
| Connect live | `apps/connect/src/components/app/transport/LearnerTransportApiView.tsx`, `lib/transport/learner-live.ts` |
| Prior QA | `docs/TRANSPORT_*_QA_REPORT.md`, `docs/TRANSPORT_E2E_QA_REPORT.md` |

---

*End of read-only ecosystem audit.*
