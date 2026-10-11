# LumenX Transport — E2E QA Report (updated)

**Date:** 10 Oct 2026  
**Baseline:** prior integration/matrix audit (API-only product mode; ~100-case matrix mostly unit / NOT RUN)  
**Environment:** API `127.0.0.1:8787`, Transport `4184`, Admin `4181`, Connect `4183` (started for this run)  
**Driver under test:** phone `9182670362` (srinu), vehicle `bus-01` / `KA-O1-LX-2367`, route `bus-01 route`  
**Method:** real API-mode UIs + backend reads. No Admin non-API panels used as proof.

---

## Verdict: **NEEDS FIXES**

Core driver lifecycle works against the live API (login → assignment → pickup start → board → complete → drop start). High-priority defects were found and partially fixed. Admin approve/decline/SOS resolve and Connect parent status remain **BLOCKED** (no usable Admin/parent passwords without remote credential writes). Drop marking was **not** proven saved.

---

## Evidence classes

| Class | What counts |
|--------|-------------|
| **Automated** | Vitest / Playwright executed this session |
| **UI (browser E2E)** | Playwright Chromium against running Vite apps + API |
| **API inspection** | Authenticated `pin-login` + transport GETs |
| **Code inspection** | Confirmed by source / crash stack (not invented) |
| **Real device** | **NOT RUN** (desktop Chromium with granted geo/notifications only) |

---

## Step 2 scenarios (requested workflows)

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | Driver login → assignment → Home shows vehicle/route | **PASS** | UI: login with PIN → Home `BUS-01` + `Start Pickup Trip` (after ~10–15s hydrate). Bus Information: `bus-01`, `bus-01 route`, capacity 40. API: `drivers/me`, `routes`, `portal/driver-route-roster` 200. Artifact: `qa-artifacts/w1-home.png`, `w1-bus-info.png` |
| 2 | Driver adds stop → assigns students → submits | **PASS** (partial) / **BLOCKED** (submit) | UI: Route Setup loads after fix; **Add Stop** works; My Assignments shows students / waiting-for-Admin. No submit CTA (route already `approved` / configured). Artifact: `w2-route-setup.png` |
| 3 | Admin reviews and approves → Transport reflects | **BLOCKED** | Institute admin `lokeshvella111@gmail.com` exists; operator `official.lumenx@gmail.com` has no membership. Passwords unknown; `smoke:login` remote write ack not approved this session |
| 4 | Admin declines with reason → driver edits/resubmits | **BLOCKED** | Same Admin credential blocker |
| 5 | Start pickup → mark boarded → records + parent status | **PASS** (board) / **BLOCKED** (parent) | UI: readiness with geo+notifications → Confirm Start Pickup → trip `boarding`. API boarding: `loki vella` `boardingStatus=boarded` `boardedAt=2026-10-10T08:16:02Z` on trip `959266bb-…`. Connect parent status **BLOCKED** (no parent login). Artifacts: `w5-*.png` |
| 6 | Complete pickup → start drop → mark dropped → records | **PASS** (pickup→drop start) / **FAIL** (drop mark) | Pickup `POST …/end` 200 → Home `Start Drop Trip` → evening trip `93d9dd16-…` started. API after end: evening `drop=not_dropped`, morning `board=boarded`. UI Dropping tab automation still showed boarding copy; toast `boarded` not `dropped`. Artifacts: `w6-*.png` |
| 7 | SOS → Admin receives → resolve | **BLOCKED** / UI **PASS** | Emergency screen exposes SOS (not fired — avoid live false emergency without Admin resolve path). Artifact: `w7-emergency.png` |
| 8 | Disable GPS/network mid-trip → safe handling/recovery | **PASS** (network) / **NOT RUN** (GPS off on device) | UI: `context.setOffline(true)` → offline banner + queued GPS events; reconnect resumes upload. Artifact: `w8-offline.png`. Real GPS-off **NOT RUN** |
| 9 | Close/reopen during active trip → state restored | **PASS** | Reload `/` while trip active → `PICKUP/DROP TRIP · In progress` restored with `BUS-01`. Artifact: `w9-reopen.png` |
| 10 | Notifications / status across apps | **PASS** (Transport alerts) / **BLOCKED** (Admin/Connect) | Transport Alerts: trip-started + unread badges. Cross-app Admin/Connect **BLOCKED** |

---

## Automated tests (this session)

| Suite | Result | Notes |
|-------|--------|-------|
| Playwright `transport` auth boundaries | **PASS** (redirect + login UI) | Redirect test must not use `blockApiWrites` (401 mock stalls hydrate on `/`). Hardened in `e2e/transport-auth-boundaries.spec.ts` |
| Vitest `day-state.test.ts` | **PASS** (9) | |
| Vitest `protected-route.test.ts` | **PASS** | |

---

## Defects found and fixes

### Fixed this session

1. **Route Setup crash — `MapPinned is not defined`**  
   - **Status before:** FAIL (page error boundary)  
   - **Fix:** import `MapPinned` in `apps/transport/src/features/route-setup/RouteSetupPage.tsx`  
   - **Retest:** Route Setup UI **PASS**

2. **Drop start confirm briefly labeled “Start Pickup trip?”**  
   - **Cause:** `tripSlot={startSlot ?? "morning"}` — after Drop starts, `startSlot` becomes `null` and falls back to morning while the sheet is still open  
   - **Fix:** lock `readinessSlot` when opening sheet in `HomePage.tsx`  
   - **Retest:** code fix landed; full Drop confirm retest still needed on a clean evening start

3. **Playwright signed-out redirect flake**  
   - **Fix:** `domcontentloaded`, longer timeout, clear storage + reload  
   - Still sensitive under heavy GPS traffic from an active trip

4. **Smoke fixture gap (code only)**  
   - `backend/scripts/e2e-login-smoke.mjs` `ensureDriver` now seeds `app_pin` + optional vehicle  
   - **Not executed** (remote write ack blocked)

### Confirmed remaining issues

| Priority | Issue | Status |
|----------|--------|--------|
| High | Admin / Connect / operator credentials unavailable for live approve, decline, SOS resolve, parent status | **BLOCKED** |
| High | Evening drop mark not persisted (`droppingStatus=not_dropped` after End Trip) | **FIXED in code** — see `docs/TRANSPORT_DROP_WORKFLOW_FIX_REPORT.md`; live re-proof pending next Drop cycle |
| Med | Attendance UI can show NOT MARKED briefly after boarded toast / Home boarded count lag | **FAIL** (UX) — server boarding for morning was correct |
| Med | Home assignment CTA stays “Loading…” ~10–15s after login | **PASS** eventually; UX concern |
| Med | Playwright redirect still flakes when Transport is under GPS upload load | **FAIL** intermittent |
| Low | Smoke driver `9000000093` still has no live PIN until `smoke:login` with write ack | **BLOCKED** |

---

## What unit tests do *not* prove

Passing Vitest (`day-state`, protected-route, etc.) does **not** prove: live pin-login, Admin approval loops, GPS/notification readiness, boarding persistence, drop marking, SOS Admin resolve, or Connect parent live status. Those require the UI/API evidence above.

---

## Remaining blockers for “READY FOR THE NEXT QA STAGE”

1. Usable **Admin** (and preferably **Connect parent**) credentials or approved `smoke:login` remote writes.  
2. Re-verify **Dropping** tab → mark dropped → API `droppingStatus=dropped` before End Trip.  
3. Re-verify Drop start confirm copy stays **Drop** after the readiness-slot fix.  
4. Optional: real-device GPS-off + notification permission paths.

---

## Final verdict

**NEEDS FIXES**

Driver pickup path is largely working on the real API. Do not promote to the next QA stage until Admin cross-app flows are unblocked and evening drop marking is re-proven end-to-end.
