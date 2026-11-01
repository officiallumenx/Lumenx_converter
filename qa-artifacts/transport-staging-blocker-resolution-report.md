# LumenX Transport — Staging Blocker Resolution Report

**Date:** 2026-10-21  
**Upstream:** `transport-staging-acceptance-report.md`, `transport-staging-apk-manual-steps.md`, `transport-device-acceptance-checklist.md`, `transport-eight-issues-audit-and-fix-report.md`  
**Staging Supabase (verified):** `yveadybpntziyryxsrsu`  
**Denylist (untouched):** `kmpzflsurepjwqnfqyld`  
**Production API / Railway deploy:** **NOT PERFORMED**  
**Git commit / push / publish:** **NOT PERFORMED**  
**`apps/connect/.../learner-live.ts`:** **unchanged**

---

## Final status

# **BLOCKED**

Not ready for real-device acceptance. Staging Supabase identity and a partial three-sibling RT fixture are present, but there is **no verified hosted staging API**, the process on `:8787` is **not** a healthy staging API right now, **staging FCM is unavailable**, **no Android device is attached**, and **no staging-targeted APK was built**.

---

## 1. Staging API target

### Verified identity (`backend/.env.staging`)

| Check | Result |
|-------|--------|
| `SUPABASE_URL` ref | `yveadybpntziyryxsrsu` |
| `LUMENX_ENV` | `staging` |
| `STAGING_CONFIRMED` | present |
| `STAGING_SUPABASE_PROJECT_REF` | `yveadybpntziyryxsrsu` |
| On denylist | **false** |

### Railway / hosted staging

| Check | Result |
|-------|--------|
| `railway status` linked project | `pure-quietude` / service `Lumenx_converter` |
| Linked environment | **production** only (`Environment ID: f6c080eb-…`) |
| Linked public URL | `https://api.lumenxtech.in` |
| `railway environment list` | **only `production (linked)`** — no separate staging environment listed |
| Deploy eight-issue API to Railway | **NOT RUN** (would target production) |

**Conclusion:** There is **no verified distinct staging Railway service/environment** in this CLI link. Staging API for this laptop remains the **local** path in `backend/STAGING.md`.

### Local API (this run)

| Probe | Result |
|-------|--------|
| `GET http://127.0.0.1:8787/api/v1/health` | `200` but `"env":"development"` (not staging) |
| `GET .../health/ready` | `"status":"degraded"`, `supabase: unavailable`, FCM not configured |
| Prior acceptance pass (`npm run start:staging`) | Documented as healthy earlier; **not the process currently bound to :8787** |

**Do not use** the current `:8787` process for staging acceptance until it is restarted via:

```bash
cd backend
npm run build
npm run start:staging
# expect health env reflecting staging + ready.supabase ok + ref yveadybpntziyryxsrsu in logs
```

### Minimum setup if a hosted staging API is required (authorization needed)

Owner must authorize **new** Railway environment/service (never the production link):

1. Create Railway **environment** e.g. `staging` under a non-production service (or new service).
2. Set variables from `backend/.env.staging.example` patterns only — staging Supabase URL/keys, `LUMENX_ENV=staging`, confirmation phrase, denylist, `FCM_ALLOW_PROD_OUTBOX=false`.
3. **Do not** copy production Firebase / production Supabase keys into staging.
4. Deploy **only** that staging service; keep CLI unlinked from production for staging deploys.
5. Publish URL (e.g. `https://api-staging.…`) and point Transport/Connect Vite env at it.

**This run did not create cloud resources or deploy.**

---

## 2. Synthetic route / three-child fixture

### Authorized workflow

| Method | Role |
|--------|------|
| `e2e/staging/transport-realtime-probe.mjs` | Idempotent ensure of institute `lx-staging-transport-rt` + driver + parent + **3 siblings** + route + stops + enrollments/guardians (writes staging only after `assertStagingEnv`) |
| `backend` `smoke:login:staging` / `provision-staging-fixtures` | Operator/login institutes — **not** the three-sibling Transport RT matrix |
| Smoke Transport driver (earlier acceptance probe) | Roster **0 students / no route** — **do not use for A–E** |

Accounts used by the RT probe (passwords via `E2E_SMOKE_PASSWORD` / staging smoke password — never printed here):

| Role | Email / phone |
|------|----------------|
| Driver | `smoke.staging.transport.rt.driver@lumenx.test` / `9000000294` |
| Parent | `smoke.staging.transport.rt.parent@lumenx.test` / `9000000295` |
| Children | `smoke.staging.transport.rt.child{1,2,3}@lumenx.test` |

### Read-only verification this run (staging project only)

Helper: `qa-artifacts/_staging-fixture-ro-check.mjs`, `qa-artifacts/_staging-driver-ro.mjs`

| Entity | Status |
|--------|--------|
| Institute `lx-staging-transport-rt` | **Present** (`32e6db7a-…`, active) |
| Students | **3** |
| Parent row | **1** live (`smoke.staging.transport.rt.parent@…`) |
| Driver row | **1** live (`4b533f2c-…`, active), route.driver_id set |
| Route `Staging RT Route` | **1** active + **approved**, vehicle assigned |
| Stops | **2** — `STG RT Pickup` (order 0) + `STG RT School` (order 1) |
| Enrollments / guardian links | **3 / 3** |
| Three-sibling **core** (parent+3 kids+route+driver+≥2 stops) | **Present** |
| Checklist sequential **S1/S2/S3** (≥3 ordered pickup stops) | **Missing** (fixture only has pickup + school) |

**Data mutations this run:** none (RO only).  
**Re-provision / extend stops:** owner-authorized only, e.g.:

```bash
# After local staging API is healthy on :8787
node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs
```

For Issues 5–6 device scenario (distinct S1→S2→S3 progression), owner must either extend the RT route with a third ordered stop (staging Admin / approved SQL / probe enhancement) **or** accept that the stock RT fixture only supports pickup→school progression.

---

## 3. Staging Android APK

| Item | Result |
|------|--------|
| `apps/transport/.env.production` | Points at **production** API host `api.lumenxtech.in` |
| `apps/transport/.env.capacitor` | Overrides Capacitor builds to **production** API host |
| `.env.staging.local` | **Absent** |
| Default `npm run cap:apk` / `build:capacitor` (`--mode capacitor`) | Would bake **production** API — **NOT RUN** |
| `android/keystore.properties` | **Present** (signing tooling available; secrets not read/printed) |
| `gradlew.bat` | Present |
| Staging APK artifact / checksum | **NOT BUILT** |

**Blocker:** No known **hosted** staging API URL for a device-reachable build, and building against production env files is forbidden. Local-USB path remains valid only after staging API is up:

1. Create gitignored `apps/transport/.env.staging.local` (or a dedicated Capacitor mode file) with:
   - `VITE_API_BASE_URL=http://127.0.0.1:8787` (plus `adb reverse tcp:8787 tcp:8787`) **or** authorized hosted staging URL
   - `VITE_SUPABASE_URL=https://yveadybpntziyryxsrsu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<staging anon>`
2. Build with that mode only (do not overwrite `.env.production` / `.env.capacitor`).
3. `npx cap sync android` → `assembleRelease` or debug.
4. Verify APK network target is staging ref before install.

Manual detail: `qa-artifacts/transport-staging-apk-manual-steps.md`.

---

## 4. FCM / notification verification

| Source | Result |
|--------|--------|
| `backend/.env.staging` | `FCM_WORKER_ENABLED=false`, `FCM_ALLOW_PROD_OUTBOX=false` |
| Firebase Admin fields in staging env | `FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` = **EMPTY** |
| Live ready probe (current `:8787`) | `firebaseConfigured: false`, `messagingReady: false` |
| Enable staging FCM without touching production | **Not possible with existing staging credentials** — none configured |

**FCM readiness: UNAVAILABLE**

In-app / API inbox rows on staging can still be inspected for dedupe and kind (`STOP_NEXT`, trip started, etc.) and **must not** be reported as OS push proof.

To enable later (owner): separate staging Firebase project + fill staging-only `FIREBASE_*`, set `FCM_WORKER_ENABLED=true`, keep `FCM_ALLOW_PROD_OUTBOX=false`. Never reuse production Railway Firebase material in staging.

---

## 5. Android device readiness

| Check | Result |
|-------|--------|
| SDK `adb` | Present (`Android Debug Bridge 1.0.41` / `37.0.0-…`) |
| `adb devices -l` | **Empty** — no physical/emulator device |
| Device acceptance checklist | **NOT RUN** |

### Connect a device (owner)

1. Enable Developer options → USB debugging on the phone.
2. USB connect; accept RSA prompt.
3. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe devices -l` → expect `device` (not `unauthorized`).
4. For local API: `adb reverse tcp:8787 tcp:8787`.
5. Install staging APK only after §3 staging Vite target is verified.

---

## 6. Acceptance sequence (when unblocked)

Use `qa-artifacts/transport-device-acceptance-checklist.md` and `transport-staging-three-sibling-scenario.md`. **Do not invent pass results.**

### Preconditions (all required)

1. Restart **staging** API (`npm run start:staging`) — health/ready green against `yveadybpntziyryxsrsu`.
2. Confirm RT fixture (or re-run authorized probe); for C1–C4 prefer **≥3 ordered stops**.
3. Build/install **staging** Transport APK + Connect against staging anon (not production).
4. Register parent FCM token **only if** staging FCM enabled; else mark push N/A and use inbox/DB.
5. `adb devices` shows a test device.

### Exact scenario order

| Order | Focus | Expected (not claimed) |
|-------|--------|-------------------------|
| A | Trip start | **One** trip-start notification for shared parent (`dedupe_key` …`:started:parent`) |
| A3 | Board child A | Child-specific boarded only |
| B | Start at school, no move | **No** school-arrival at trip start |
| C | Enter S1 then S2 | S1 `STOP_ARRIVED`; S2 `STOP_NEXT`; no proximity-only false next |
| D | Drop wording | Home stop name; no false “at school” |
| E | Attendance | Single-tap confirm; double-tap ignored; airplane retry once |
| F | Background | 10‑min local reminder; Continue keeps trip; End opens end flow (no silent complete) |
| G | Latency | Record Start/End ms — no target claimed without measurement |

---

## 7. Exact manual actions required from owner

1. **Authorize** hosted staging Railway environment **or** confirm local-only API for device tests.
2. **Restart** local staging API; discard/ignore the current `development` / degraded `:8787` process.
3. **Authorize** fixture refresh if driver password/route stops need repair; for Issues 5–6, add a third ordered stop on staging.
4. **Create** gitignored Transport staging Vite env and build a staging APK (do not use `.env.production` / `.env.capacitor` as-is).
5. **Optionally** provision staging-only Firebase for FCM; otherwise accept inbox-only notification evidence.
6. **Attach** an Android device and run checklist A–E (F–G as time allows).
7. **Do not** deploy to `api.lumenxtech.in`, migrate production, or use production parents/students.

---

## 8. Status matrix

| Area | Status |
|------|--------|
| Staging Supabase identity | **PASS** (`yveadybpntziyryxsrsu`) |
| Hosted staging API / Railway staging env | **UNAVAILABLE** (production-only link) |
| Local staging API process (current) | **FAIL** (wrong env / degraded) |
| Three-sibling RT fixture core | **PARTIAL PASS** (present; 2 stops only) |
| Sequential 3-stop progression fixture | **MISSING** |
| Staging APK | **NOT BUILT** |
| FCM | **UNAVAILABLE** |
| Android device | **NONE ATTACHED** |
| Device acceptance A–G | **NOT RUN** |

### Final status: **BLOCKED**
