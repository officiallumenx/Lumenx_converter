# LumenX Transport — Phase 3: GPS, Geofencing and Timing

**Date:** 2026-10-15  
**Inputs:** Phase 2 driver-actions report; `docs/TRANSPORT_ECOSYSTEM_FULL_AUDIT.md` (F-GPS-*, F-TIME-002); existing radius/GPS implementation.  
**Constraint:** No silent change to radius defaults or notification thresholds. ETA remains straight-line / stop-leg (not road-network) — see `docs/TRANSPORT_ETA.md`.

---

## Verdict: **BLOCKED** (not READY FOR PHASE 4)

| Area | Status |
|------|--------|
| Radius data path (Admin → DB → API → roster → approach) | **Verified in code + unit/API tests** |
| Parking GPS refresh preserves radius | **Verified** (existing API test + client sync) |
| Per-stop / 100m school geofence preservation | **Verified** (unit + existing API roster tests) |
| Admin Asia/Kolkata service-date (vs UTC) | **Fixed** this phase + unit tests |
| GPS start/stop at trip boundaries (client) | **Verified in code + outbox unit tests** |
| Stale GPS not shown as live | **Verified** (`gps-freshness` unit tests) |
| Physical Android permission / background / lock-screen | **NOT RUN** — no device this session |
| Live API GPS association / network loss E2E | **NOT RUN** — API `8787` down |

Phase exit requires device/live probes listed in §6 or an explicit product waiver. Do **not** treat unit tests as proof of background GPS.

---

## 1. Complete radius data path (traced)

```
Admin Transport Settings
  default_notification_radius_m     → new waypoint default when client omits radius
  school_notification_radius_m      → school stop upsert + school-arrival geofence fallback
       ↓ PUT /api/v1/transport/settings
Postgres transport_settings
       ↓ syncSchoolStopsForInstitute → stop.kind=school.notification_radius_m
Stop create/update
  POST/PATCH /api/v1/transport/stops
  Create: client radius OR institute default (ONLY if omitted)
  Update: omitted radius → preserved (toStopUpdatePatch)
  Parking GPS refresh: lat/lng ONLY (service.ts + driver api-sync)
       ↓
Driver roster GET /portal/driver-route-roster
  stops[].notificationRadiusM = stop.notification_radius_m  (not dropped)
       ↓
Driver Route Setup store hydrate
  Uses API radius; fallback STOP_RADIUS_DEFAULT_M (150) only if missing/invalid
       ↓
GPS ping → approach.ts / maybeMarkSchoolArrivedOnPing
  Geofence = resolveStopGeofenceM(stop.notification_radius_m)
  School arrival prefers school stop radius, else settings.school_notification_radius_m
```

### Investigation answers

| Question | Finding | Confidence |
|----------|---------|------------|
| Parking refresh creates/updates stop without radius? | **Update path:** coords only — radius untouched. **Create path:** omits radius → institute **default** applied once (by design). | Confirmed |
| Backend replaces per-stop radius with institute default on edit? | **No** — omit preserves stored value. Default only on create-omit. | Confirmed |
| Driver roster drops radius? | **No** — `notificationRadiusM` mapped in `approval-service.ts`. | Confirmed |
| GPS tied to institute/driver/vehicle/route/trip? | Ping is `POST …/trips/:id/location` under driver auth + trip row scoping; outbox carries `tripId`. | Confirmed (code) |
| Old points presented as live? | Freshness bands: live ≤45s, recent ≤120s, stale ≤10m; UI must not label stale as live. | Confirmed (utils) |
| Service date consistent? | Backend/driver: institute TZ / Asia/Kolkata. **Admin was UTC** — fixed this phase. | Confirmed |

### Product defaults (unchanged)

| Setting | Default | Notes |
|---------|---------|--------|
| Stop / default notification radius | **150 m** | `STOP_RADIUS_DEFAULT_M`; Admin UI default |
| School notification radius | **150 m** | Configurable; **100 m is valid and preserved** when set |
| Bounds | 20–5000 m | `parseStopNotificationRadiusM` |

**Explicit 100 m:** Supported and tested. Product default remains 150 m — **not** silently changed to 100. Institutes that require 100 m must set school (and/or stop) radius in Admin Settings / stop edit.

**ETA:** Straight-line / stop-leg smoothing (`eta-engine`). Not road-network ETA (`docs/TRANSPORT_ETA.md`).

---

## 2. Fixes this phase

| ID | Change | Files |
|----|--------|-------|
| P3-TIME-01 | Admin transport “today” uses `todayInTimeZone(Asia/Kolkata)` instead of UTC `toISOString().slice(0,10)` | `apps/admin/src/lib/transport/service-date.ts`, API panels, realtime invalidate, demo trip views |
| P3-GEO-01 | School-arrival radius uses stop/settings value via `isBusWithinStopRadius` / `resolveStopGeofenceM` (no `Number(x) \|\| 150` that obscures intent) | `backend/.../ops-service.ts` |
| P3-TEST-01 | Unit: 100 m school geofence; Admin service-date midnight IST | `approach.test.ts`, `service-date.test.ts` |

No notification threshold or approach-band changes.

---

## 3. GPS behavior (implementation summary)

| Concern | Behavior | Evidence |
|---------|----------|----------|
| Permission / location off | Readiness gate; Attendance banner + disabled marks (Phase 2); location track status | Code |
| Ping interval | ~2.5 s + 8 m / heartbeat thinning; server same thin | `gps-outbox.ts`, `gps-persist.ts` |
| Trip start | Ping starts after server UUID trip id; skips `ready`/`starting`/`completed` | `gps-outbox.ts` |
| Trip end | `stopTripGpsPing` + `discardPendingGpsEvents` (no post-end GPS spam) | `gps-outbox.ts`, `ops-outbox.test.ts` |
| Offline | GPS queued in ops outbox; flush on online/visibility | Code + prior E2E offline PASS |
| Background | Android `TripTrackingService` + background location permission; **iOS native peer absent** | Manifest / `trip-tracking-native.ts` |
| Stale display | `classifyGpsFreshness` / `isGpsShownAsLive` | `packages/utils` tests |

---

## 4. Test evidence (executed this session)

| Suite | Command | Result |
|-------|---------|--------|
| Admin service-date + stop-radius | `cd apps/admin && npx vitest run src/lib/transport/service-date.test.ts src/lib/transport/stop-radius.test.ts` | **5 passed** |
| Transport api-sync + ops-outbox | `cd apps/transport && npx vitest run …/api-sync.test.ts …/ops-outbox.test.ts` | **25 passed** |
| Backend approach + stop-radius | `cd backend && npx vitest run src/domains/transport/approach.test.ts src/domains/transport/stop-radius.test.ts` | **17 passed** |
| Utils freshness + date | `npx vitest run packages/utils/src/gps-freshness.test.ts packages/utils/src/date.test.ts` | **8 passed** |
| Backend `transport.test.ts` radius/roster/parking | Already present in suite (parking refresh 220 m; roster 50/100 m) | **Not re-run full file** (API harness heavy); prior coverage stands |
| Playwright / real device | — | **NOT RUN** |

---

## 5. Required verification matrix

| Scenario | Status |
|----------|--------|
| Location permission grant/deny/revoke/restore | **NOT RUN** (device) |
| GPS disabled / inaccurate / stale / unavailable | Partial: unit + UI paths; **device NOT RUN** |
| Network loss / reconnect | Prior E2E offline PASS; **not re-run** |
| Foreground / background / lock-screen Android | **NOT RUN** — no physical device |
| School-arrival 100 m when configured | **Unit Confirmed**; live ping **NOT RUN** |
| Per-stop radius preservation | **Confirmed** (API + unit) |
| GPS start/stop at trip boundaries | **Code + unit Confirmed**; device **NOT RUN** |
| Asia/Kolkata around midnight | **Admin fix + unit Confirmed**; live Admin UI at midnight **NOT RUN** |
| No tracking after trip end | **Code + unit Confirmed**; device **NOT RUN** |

---

## 6. Remaining limitations / blockers

1. **No physical Android device** in this session — background, Doze, OEM battery, lock-screen GPS unverified.  
2. **iOS** has no native trip-tracking service (documented no-op).  
3. **Local API down** — cannot re-run live GPS association or Playwright transport suites.  
4. Admin service date uses **default Asia/Kolkata** (matches backend fallback); per-institute Admin TZ wiring remains a future enhancement if institutes differ from Kolkata.  
5. Product default school radius remains **150 m** unless Admin sets **100 m**.

---

## 7. Decision

**BLOCKED** for Phase 4 auto-start: device and live GPS acceptance criteria unmet.

**Code-level outcomes ready for review:** radius path intact, parking refresh safe, 100 m geofence preserved when configured, Admin service-date UTC bug fixed.

To reach **READY FOR PHASE 4**, execute on a dedicated test institute + Android device:

1. Set school radius to **100 m** → start Pickup → approach school → confirm arrival only within 100 m.  
2. Create stop at **80 m** → GPS refresh parking (if used) → confirm stop radius unchanged.  
3. Deny/revoke location → confirm no silent attendance GPS; restore → resume.  
4. Background + lock screen during active trip → confirm pings resume or documented OS limitation.  
5. End trip → confirm no further location POSTs.  
6. Near IST midnight → Admin trips/attendance show same service date as driver.

*End of Phase 3 GPS / geofencing / timing report.*
