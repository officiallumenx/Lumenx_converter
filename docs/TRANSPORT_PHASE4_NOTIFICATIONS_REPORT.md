# LumenX Transport — Phase 4: Notifications and Alerts

**Date:** 2026-10-15  
**Inputs:** Phase 2–3 reports; `docs/TRANSPORT_ECOSYSTEM_FULL_AUDIT.md` (F-NOTIF-*); backend transport notification domain.  
**34-step workflow:** No authoritative numbered 34-step list exists in-repo (Phase 1 finding). This matrix is keyed by **implemented event kinds** and reminder jobs — not invented step numbers.

---

## Verdict: **BLOCKED** (not READY FOR PHASE 5)

| Area | Status |
|------|--------|
| Server emit pipeline, dedupe, audience→app routing | **Verified in code + unit tests** |
| Reminder job ~60s cadence; approach 90s start grace; delay 2m grace | **Documented as intentional** — not treated as defects |
| Observable emit/reminder failures (was silent) | **Fixed** this phase |
| Driver foreground push → inbox refresh | **Fixed** this phase |
| Stored notification ≠ device delivery | **Documented** |
| Real-device FCM (foreground / background / killed / permission) | **NOT RUN** |
| Live DB row + FCM attempt + device tap evidence | **NOT RUN** (API down) |

---

## 1. Pipeline (source of truth)

```
Trigger (ops write / GPS ping / ~60s reminder job)
  → emitTransportNotification / Safe
  → settings gate (notifications_enabled; critical SOS bypasses)
  → emitNotificationForInstituteSystem
  → notification + notification_recipient (+ dedupe_key unique)
  → in_app delivery + FCM delivery_attempt queue
  → fcm-worker retry/backoff
  → device (Connect / Transport / Admin) via targetApps
```

| Rule | Implementation | Notes |
|------|----------------|-------|
| Backend SoT | `ops-notifications.ts` header | No frontend business emits |
| Dedupe | `(institute_id, dedupe_key)` unique → emit returns `reason: "dedupe"` | Retries do not create duplicate logical rows |
| Safe wrapper | Fire-and-forget; must not break trip writes | Now logs skipped/failed/deduped |
| Reminder cadence | `background-jobs-runner` default **60s** | Intentional; not a defect without SLA evidence |
| Approach start grace | `APPROACH_START_GRACE_MS = 90_000` | Suppresses approach bands after trip start |
| Trip delayed grace | **2 minutes** after `started_at` | Avoids bundling with trip-start burst |
| ETA type | Straight-line / stop-leg | Not road-network (`docs/TRANSPORT_ETA.md`) |

**Stored notification ≠ device delivery.** Inbox row or emit `ok: true` only proves enqueue/persist succeeded, not FCM receipt or user open.

---

## 2. Notification matrix

Columns: **Device receipt / open** are Unverified this session unless noted.

### A. Trip lifecycle (`ops-notifications.ts`)

| Event | Trigger / source | Recipients | Condition / timing | Message (summary) | Deep link | Dedupe | DB / push evidence |
|-------|------------------|------------|--------------------|-------------------|-----------|--------|--------------------|
| TRIP_STARTED | Trip create / start API | Parent (route guardians), Admin staff, Driver | On successful start | Trip started / Driver started a trip | `/transport`, `/`, `/` | `…:started:{audience}` | Persist via emit; FCM queued |
| TRIP_PHASE_CHANGED | Phase PATCH | Admin staff | Phase change | Trip moved from X to Y | `/transport` | `…:phase:{phase}` | Emit Safe |
| SCHOOL_ARRIVED | GPS geofence school (`maybeMarkSchoolArrivedOnPing`) | Parent, Admin, Driver | Once per trip when within school radius | Bus reached school / Arrived at school | live / transport / attendance | `…:school_arrived:{audience}` | Timeline + emit |
| TRIP_COMPLETED | End trip | Parent, Admin | On complete | Trip completed | `/transport` | `…:completed` / `:admin` | Emit Safe |
| STUDENT_BOARDED / NOT_BOARDED | Boarding mark | Parent (that student) | On mark | Boarded / not boarded copy | `/transport` | `…:boarded` / `not_boarded` | Emit |
| STUDENT_DROPPED / NOT_DROPPED | Drop mark | Parent | On mark | Dropped / not dropped | history / transport | `…:dropped` | Emit |
| EMERGENCY_CREATED (SOS) | Emergency create | Parent route?, Admin, Driver (per notify fn) | On SOS | SOS raised | live / transport / emergency | `transport:sos:{id}:{audience}` | Critical bypass |
| EMERGENCY_RESOLVED | Resolve | Same audiences | On resolve | SOS resolved | Same family | `sos_resolved:…` | Emit |
| NOT_RIDING_* | Daily exception | Guardians / staff as wired | Create / cancel | Not riding today | `/transport` | `not_riding:…:{date}` | Emit |

### B. Approach / arrival (`approach.ts` on GPS ping)

| Event | Trigger | Recipients | Condition / timing | Message | Deep link | Dedupe | Notes |
|-------|---------|------------|--------------------|---------|-----------|--------|-------|
| STOP_APPROACHING | GPS ping ETA bands 30/15/5 | Parent (student guardians) | Nearest band only; **suppressed 90s after start**; no emit if ETA not publishable / GPS stale | Approaching / very close | `/transport/live` | `…:approach:{threshold}` | Not every band at once |
| STOP_ARRIVED | Bus within stop `notification_radius_m` | Parent → then Driver + Admin | Once per stop (await parent emit first) | Arrived at stop | live / attendance / transport | `…:arrived` (+ `:driver` / `:admin`) | softChime |

### C. Scheduled reminders (`transport-reminders.ts`, job ~60s)

| Event | Trigger | Recipients | Condition / timing | Message | Deep link | Dedupe | Notes |
|-------|---------|------------|--------------------|---------|-----------|--------|-------|
| SERVICE_REMINDER | Job + `remember_enabled` | Guardians | 05:30–07:00 institute local | Bus service today | `/transport` | `…:morning_service:{date}` | |
| PICKUP_REMINDER | Job + remember | Guardians | Pre-pickup ±10m window | Pickup expected soon | `/transport/live` | `…:pre_pickup:{date}` | |
| TRIP_NOT_STARTED | Job | Parents + staff | Pickup → +20m, no active trip on route | Trip not started | connect+admin apps | `…:not_started:{date}` | Independent of remember |
| GPS_STALE | Job | Staff; parents if age≥10m | Age ≥5m staff path; state machine | GPS stale | `/transport` | `gps_stale:ep{n}` | Timeline marked |
| GPS_OFFLINE | Job | Staff + parents (≥10m) | Age ≥20m | GPS offline | `/transport` | `gps_offline:ep{n}` | |
| GPS_RECOVERED | Job | Staff + parents | Fresh fix after episode | GPS recovered | `/transport` | recovered:ep | softChime |
| TRIP_DELAYED | Job | Parents + staff | Past pickup+buffer+15m; **fresh GPS** (age&lt;5); **2m after start**; once per trip timeline | Trip delayed | deepLink helper | `…:delayed` / `:admin` | **Required by code** — not missing |

### D. Client consumption

| App | Inbox | Push app id | Foreground | Permission UX |
|-----|-------|-------------|------------|---------------|
| Connect | Portal inbox + poll | `connect` | Web FCM → in-app alert + inbox invalidate; native open deep link | Analytics `push_permission_*` |
| Transport | Inbox query 45s | `transport` | Web FCM → in-app alert; **native foreground now refreshes inbox** | Readiness notifications check; analytics |
| Admin | `/api/v1/notifications` shell ~45s | `admin` | Admin PushDeviceTokenRegistration | Demo mirror disabled in API mode |

---

## 3. Investigation findings

| Topic | Finding | Confidence |
|-------|---------|------------|
| Failures swallowed by Safe | Previously only empty then-branch on error; **now** structured logs for skip/fail/dedupe/unhandled | Confirmed → Fixed |
| Reminder institute catch empty | Silent `catch {}` → **now** `transport_reminders_institute_failed` log | Confirmed → Fixed |
| Missing delayed-trip notify | **Implemented** in reminders with grace + fresh GPS gate | Confirmed present |
| 60s job / 90s grace “bugs” | Documented product timing; no evidence they are defects | Confirmed intentional |
| Stale GPS approach | Approach skips non-publishable ETA; delay requires fresh GPS | Confirmed |
| Duplicate logical notifies | Dedupe keys + unique index; Safe treats 409 as dedupe | Confirmed |
| FCM app scoping | `targetAppsForTransportAudience` parent→connect, driver→transport, admin→admin | Confirmed |
| Child scoping | Guardians resolved per student / route enrollments | Confirmed (code) |
| Preference-aware reminders | Header claims “preference-aware”; emit path uses institute `notifications_enabled` / `remember_enabled` only | Unconfirmed per-user prefs |
| Device delivery | Not tested this session | Unverified |

---

## 4. Code changes this phase

| Change | Files |
|--------|-------|
| Observable Safe emit (skip/fail/dedupe/unhandled logs) | `transport-notification-emit.ts` |
| Reminder per-institute failure logging | `transport-reminders.ts` |
| Unit tests for emit empty/disabled/dedupe/ok/safe | `transport-notification-emit.test.ts` |
| Driver native foreground → inbox refresh event | `PushDeviceTokenRegistration.tsx`, `TransportAlertsSync.tsx` |

No changes to 90s approach grace, 60s job interval, delay thresholds, or severity bands.

---

## 5. Test results

| Suite | Result |
|-------|--------|
| `backend` `transport-notification-emit.test.ts` + `approach.test.ts` | **19 passed** |
| Real FCM / device foreground / background / killed | **NOT RUN** |
| Live notification DB + delivery_attempt inspection | **NOT RUN** (API down) |
| Playwright cross-app alerts | Historical: Transport inbox PASS; Admin/Connect often **BLOCKED** (credentials) — not re-run |

---

## 6. Device-test evidence

**None this session.** No physical device, no FCM delivery receipt, no tap/open telemetry captured.

Do not interpret unit pass or inbox poll as device delivery.

---

## 7. Unresolved blockers

1. Dedicated institute + FCM-configured Connect / Transport / Admin builds on device.  
2. Permission denied → recovery UX walkthrough with screenshots.  
3. Background / killed-app receipt for approach, boarding, SOS.  
4. Confirm Admin staff receive FCM (not only inbox API) under production auth.  
5. Clarify whether per-user notification preferences are required (header vs implement).

---

## 8. Decision

**BLOCKED** for Phase 5 auto-start: notification **server matrix and observability** improved; **device receipt criteria unmet**.

To mark **READY FOR PHASE 5**, attach evidence rows to the matrix: DB notification id, delivery_attempt status, device OS notification, and tap → deep link for at least trip-start, approach or arrival, boarding, delay (if in window), SOS, and trip-complete.

*End of Phase 4 notifications report.*
