# LumenX Transport — Staging Readiness Next Steps

**Date:** 2026-10-21  
**Upstream:** `transport-staging-blocker-resolution-report.md` §7  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Denylist (untouched):** `kmpzflsurepjwqnfqyld`  
**Production Railway deploy / env mutation:** **NOT PERFORMED**  
**Commit / push / publish:** **NOT PERFORMED**  
**`learner-live.ts`:** **unchanged**

---

## Final status

# **BLOCKED**

Software staging prep for local-USB acceptance is largely complete (API process, S1→S2→S3 fixture, staging-targeted APK). Real-device acceptance **cannot start** until an Android device is attached. Staging FCM remains unavailable (inbox-only notification evidence).

---

## 1. Staging API target and service status

### Verified local staging API (this run)

| Check | Result |
|-------|--------|
| Process on `:8787` | `node --env-file=.env.staging dist/index.js` |
| `GET /api/v1/health` | `200` (`env` field = `NODE_ENV` → `development`, expected per staging example) |
| `GET /api/v1/health/ready` | `ready`, `supabase: ok` |
| Supabase project (from `.env.staging`) | `yveadybpntziyryxsrsu` |
| FCM on this API | disabled (`firebaseConfigured: false`) |

**Verified staging API URL for USB device tests:** `http://127.0.0.1:8787` (with `adb reverse tcp:8787 tcp:8787`).

### Hosted Railway staging

| Check | Result |
|-------|--------|
| `railway environment list` | **only `production (linked)`** |
| Linked service URL | `https://api.lumenxtech.in` |
| Approved repo workflow to create staging | **None found** (no `railway.toml` / staging deploy script) |
| Cloud resource creation this run | **NOT RUN** |

#### Owner instructions (authorization required — do not use production service)

1. In Railway project `pure-quietude` (or a dedicated staging project), create environment **`staging`** and a **new** service (do not redeploy `Lumenx_converter` production).
2. Set variables from `backend/.env.staging.example` using **staging-only** Supabase keys for `yveadybpntziyryxsrsu`.
3. Required: `LUMENX_ENV=staging`, `STAGING_CONFIRMED=I_CONFIRM_THIS_IS_NON_PRODUCTION`, `STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu`, production ref on denylist, `FCM_ALLOW_PROD_OUTBOX=false`.
4. Do **not** copy production Firebase or production Supabase credentials.
5. Deploy only the staging service; publish a distinct URL (e.g. `https://api-staging.…`).
6. Point Transport/Connect Vite staging env at that URL; keep CLI unlinked from production for staging deploys.

---

## 2. Third-stop fixture result

**Method:** staging-guarded script `qa-artifacts/ensure-staging-rt-three-stops.mjs`  
(`assertStagingEnv` + hard ref check `yveadybpntziyryxsrsu` before writes)

| Item | Result |
|------|--------|
| Institute | `lx-staging-transport-rt` (existing, not duplicated) |
| Route | `Staging RT Route` preserved |
| Stop order | **S1 → S2 → S3 → School** (`route_order` 0–3) |
| Child mapping | child1→S1, child2→S2, child3→S3; drop→School |
| RO re-verify | **PASS** (`qa-artifacts/_verify-rt-stops-ro.mjs`) |

Stop names: `STG RT S1`, `STG RT S2`, `STG RT S3`, `STG RT School`.

Re-run if needed:

```bash
node --env-file=backend/.env.staging qa-artifacts/ensure-staging-rt-three-stops.mjs
```

---

## 3. Staging Transport APK

Production `.env.production` / `.env.capacitor` **not modified**.

| Step | Result |
|------|--------|
| Env prep | `qa-artifacts/prepare-transport-staging-env.mjs` → gitignored `apps/transport/.env.staging.local` |
| Vite mode | `vite build --config vite.config.capacitor.ts --mode staging` |
| API target baked in | `http://127.0.0.1:8787` |
| Supabase ref baked in | `yveadybpntziyryxsrsu` |
| Note | Bundle still contains compile-time string `api.lumenxtech.in` as **unused fallback** in `getTransportApiBaseUrl` when `VITE_API_BASE_URL` is set; runtime prefers staging URL |
| Cap sync | completed |
| APK | **BUILT** |

**Artifact**

| Field | Value |
|-------|--------|
| Path | `apps/transport/android/app/build/outputs/apk/release/app-release.apk` |
| Size | 5219778 bytes |
| SHA-256 | `052A275DAB0494AFFA0D76A5B524F374E6DE5208030CE99AF07E599C795C7317` |

Rebuild recipe (local staging API):

```bash
node --env-file=backend/.env.staging qa-artifacts/prepare-transport-staging-env.mjs
cd apps/transport
node scripts/sync-app-version.mjs
npx vite build --config vite.config.capacitor.ts --mode staging
node ../../packages/capacitor/scripts/flatten-capacitor-dist.mjs
npx cap sync android
cd android && .\gradlew.bat assembleRelease --no-daemon
```

---

## 4. FCM configuration status

| Item | Status |
|------|--------|
| Staging `FIREBASE_PROJECT_ID` / client email / private key | **EMPTY** |
| `FCM_WORKER_ENABLED` | `false` |
| `FCM_ALLOW_PROD_OUTBOX` | `false` |
| Ready probe messaging | not configured |
| Production FCM reused for staging | **NOT DONE** (unsafe / not approved) |

**FCM readiness: UNAVAILABLE**

Owner setup for optional push proof:

1. Create or designate a **staging** Firebase project.
2. Fill staging-only `FIREBASE_*` in `backend/.env.staging`.
3. Set `FCM_WORKER_ENABLED=true`, keep `FCM_ALLOW_PROD_OUTBOX=false`.
4. Restart staging API; register FCM token on synthetic Connect parent device only.
5. Until then: use API/inbox + DB `dedupe_key` evidence — **not** OS shade as push proof.

---

## 5. Device availability

| Check | Result |
|-------|--------|
| Android SDK `adb` | Present |
| `adb devices -l` | **Empty** — no device/emulator |

### Connect a device

1. Enable Developer options → USB debugging.
2. USB-connect; accept RSA fingerprint prompt.
3. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe devices -l` → state `device`.
4. `adb reverse tcp:8787 tcp:8787`
5. `adb install -r "apps\transport\android\app\build\outputs\apk\release\app-release.apk"`
6. Confirm driver login hits local staging API (not `api.lumenxtech.in`).
7. Execute `qa-artifacts/transport-device-acceptance-checklist.md` A–E (F–G as time allows).

---

## 6. Remaining owner actions

1. **Attach** an Android device and verify with `adb devices`.
2. Keep local staging API running (`npm run start:staging` if the process dies).
3. Install the staging APK above; run `adb reverse` before network calls.
4. Log in as RT fixture driver/parent (emails in blocker report; password from staging smoke env — never commit).
5. Run checklist A–G; record real evidence (do not invent latency/FCM results).
6. **Optional:** authorize Railway staging environment + staging Firebase for hosted API / push.
7. **Never** deploy eight-issue backend to production Railway or use production students/parents.

---

## 7. Status matrix

| Area | Status |
|------|--------|
| Staging Supabase identity | **PASS** |
| Local staging API (`:8787` + `.env.staging`) | **PASS** |
| Hosted Railway staging service | **UNAVAILABLE** (owner auth required) |
| Fixture S1→S2→S3 + child mapping | **PASS** |
| Staging APK (local API target + checksum) | **PASS** |
| FCM | **UNAVAILABLE** |
| Android device | **NONE** |
| Device acceptance A–G | **NOT RUN** |

### Final status: **BLOCKED**

Primary remaining blocker: **no Android device connected**. Secondary: FCM unset (inbox-only). Hosted staging API still optional if local USB path is used.
