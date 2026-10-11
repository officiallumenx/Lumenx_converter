# Transport — Return/Drop after Pickup completion (fix report)

**Date:** 2026-10-10  
**Driver:** `9182670362` (srinu) · vehicle `bus-01`  
**Mode:** API (`VITE_TRANSPORT_AUTH_MODE=api`)

## 1. Confirmed root cause

Home’s next action (`start_drop` / `day_complete`) depends on `morningCompletedToday` / `eveningCompletedToday`, which are loaded by `hydrateActiveTripFromApi` from **`GET /transport/trips?trip_date=…`**.

Three bugs stacked:

1. **Race in assignment hydrate** (`useDriverAssignmentQuery`): `routeHydrated` was set `true` as soon as the roster finished, **in parallel with** (and often before) trip-list hydrate. Home then rendered **Start Pickup Trip** while day flags were still false.
2. **Fire-and-forget after Pickup end**: `endTrip` did not await list-trips refresh, so navigation to Home could paint before completions were applied.
3. **Silent empty list**: missing/`catch` list results never applied authoritative flags; a successful Pickup end could be followed by a stale **Start Pickup** CTA (and a real `409 Pickup trip already exists` if the driver tapped it).

Backend Pickup→Drop rules were fine: evening start requires a completed morning the same Asia/Kolkata service date; duplicate slots return `409`.

## 2. Files changed

| File | Change |
|------|--------|
| `apps/transport/src/lib/transport/trip/api-ops.ts` | Resolve `instituteId` from scope or `ues_transport_session`; authoritative list-trips; **await** hydrate inside `endTripViaApi` |
| `apps/transport/src/lib/transport/trip/store.ts` | `applyTodayTripCompletions({ authoritative })` replaces flags from successful list |
| `apps/transport/src/lib/transport/trip/repository.ts` | Rely on awaited hydrate from `endTripViaApi` (no duplicate void hydrate) |
| `apps/transport/src/lib/transport-queries/hooks.ts` | `Promise.all(roster + trip hydrate)` then `setRouteHydrated(true)` |
| `apps/transport/src/lib/transport/trip/api-ops.hydrate.test.ts` | New regression suite |
| `apps/transport/src/lib/transport/trip/store.test.ts` | Authoritative completion + no re-start Pickup |

## 3. Exact fix

- Next Home action is derived only after **authoritative** today’s trips are applied (or after a failed list that preserves a just-synced end).
- Assignment effect no longer unlocks the CTA until trip hydrate settles.
- Pickup end path: `syncTripFromApiDto` → **await** `hydrateActiveTripFromApi` → return session with `start_drop` / `day_complete`.

`readinessSlot` / Dropping-tab / drop-stop behavior from the prior Drop workflow fix is unchanged.

## 4. Tests run

| Suite | Result |
|-------|--------|
| `apps/transport` `trip/*` + `drop-stop.test.ts` | **36 passed** |
| `backend` `drop-after-pickup.test.ts` | **3 passed** |
| Playwright `qa-artifacts/verify-drop-cta.mjs` | **PASS** — Home shows **Start Drop Trip** + Pickup complete; network includes `trips?trip_date=2026-10-10` |
| Playwright start-flow (headless) | Readiness sheet opens for **Drop** (`Before you start Drop`); GPS/notifications **NOT READY** in headless (expected gate, not hydrate) |

## 5. Real API verification

| Step | Result |
|------|--------|
| List trips after soft-removing prior evening row | Morning `completed` only |
| `POST /trips` slot `evening` | **201** — Drop created |
| Re-start morning | **409** `Pickup trip already exists for today` |
| Mark dropping with enrollment `dropStopId` | **200** `droppingStatus: dropped` |
| UI login (morning complete, no evening) | **Start Drop Trip** (not Start Pickup) |

Full Pickup→board→end→Drop was not re-run end-to-end in the UI in this pass (today’s morning was already completed; evening was reset only for Drop availability). API + hydrate + Home CTA prove the missing next action is fixed in API mode.

## 6. Remaining blockers

- Portal path historically used wrong roster URL in ad-hoc probes; app uses `/portal/driver-route-roster` (works for the dedicated E2E fixture).
- Do not treat unit tests alone as proof; Playwright API-mode workflow below is the UI evidence.

---

## 7. Playwright E2E regression (Pickup → Drop → Day complete)

**Date run:** 2026-10-10  
**Browser:** Playwright Chromium (`Desktop Chrome`)  
**App:** `http://127.0.0.1:4184` · API: `http://127.0.0.1:8787` · `VITE_TRANSPORT_AUTH_MODE=api`  
**Fixture:** dedicated institute `LumenX Transport Playwright Institute` (`lx-transport-pw`), driver phone `9000000094`, vehicle `E2E-BUS-01`, student `E2E Rider` (pickup stop ≠ drop/school stop).  
**Permissions:** Playwright `grantPermissions(['geolocation','notifications'])` + fixed geolocation — **no** app readiness bypass, **no** `blockApiWrites`.

### Commands executed

```bash
node e2e/transport/provision-fixture.mjs --reset-trips
# PowerShell:
$env:E2E_APP='transport'
npx playwright test --project=transport-workflow --reporter=list
```

**Result:** `6 passed (3.6m)`

### Per-test status

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Pickup completion reveals Start Drop Trip | **PASS** | UI Start Pickup → board → End Trip; Home shows Start Drop Trip + Pickup complete; no Start Pickup |
| 2 | Start Return/Drop trip via UI | **PASS** | UI Confirm Start Drop; API trip create evening; Attendance Dropping tab |
| 3 | Mark student dropped | **PASS** | UI drop mark; API `droppingStatus: dropped` at enrollment `dropStopId` (not pickup); survives reload |
| 4 | Complete Return/Drop → Day complete | **PASS** | UI End Trip; API phase completed/evening; Home Day complete; no Pickup CTA |
| 5 | Persistence after app reload | **PASS** | After suite day-complete path: reload keeps Day complete (no Start Pickup) |
| 6 | Duplicate Pickup prevention | **PASS** | UI has no Start Pickup; API `POST /trips` morning → **409** Pickup already exists |

### Artifacts / config

| Item | Location |
|------|----------|
| Spec | `e2e/transport-pickup-drop-workflow.spec.ts` |
| Helpers | `e2e/transport/helpers.ts` |
| Fixture provisioner | `e2e/transport/provision-fixture.mjs` |
| Fixture file (gitignored) | `e2e/transport/.fixture.json` |
| Playwright project | `transport-workflow` in `playwright.config.ts` |
| Failure screenshots/traces | `test-results/` (retain-on-failure; none for this green run) |

### API evidence (from live run + fixture)

- Dedicated institute pin-login **200**
- Morning trip create via UI **2xx**, slot `morning`
- Evening trip create via UI **2xx**, slot `evening`
- Dropping mark **2xx**, `droppingStatus: dropped`, `stopId` = school/drop stop
- Evening end **2xx**, `phase: completed`
- Duplicate morning start **409** `Pickup trip already exists for today`

### Files added for this E2E pass

- `e2e/transport/provision-fixture.mjs`
- `e2e/transport/helpers.ts`
- `e2e/transport-pickup-drop-workflow.spec.ts`
- `playwright.config.ts` (`transport-workflow` project)
- `.gitignore` entries for `.fixture.json` / `qa-artifacts/pw-*.png`
