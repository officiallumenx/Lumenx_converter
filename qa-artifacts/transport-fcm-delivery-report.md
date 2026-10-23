# LumenX Transport — FCM Push Delivery Verification Report

**Updated:** 2026-10-23 (blocker-resolution pass)  
**Upstream:** `qa-artifacts/transport-automated-acceptance-report.md`  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**STOP_NEXT:** **unchanged**  
**Production Railway / production Firebase credentials:** **NOT USED / NOT MODIFIED**  
**Secrets printed or committed:** **No**

---

## Final status

# **FCM BLOCKED**

Account-level Firebase Admin credentials for staging are still **missing**. This agent **cannot** create a Firebase service account or paste private keys into `backend/.env.staging` on your behalf.

Mocked FCM suites: **29 PASS** (reconfirmed this pass).  
Real Firebase send / device tray / tap: **NOT RUN**.

---

## What changed this pass

| Change | Detail |
|--------|--------|
| Product FCM pipeline code | **None** (no defect reproduced) |
| `STOP_NEXT` | **Untouched** |
| Env / secrets | **Not written** (credentials still empty) |
| Worker enabled | **No** — would be unsafe/false without credentials |
| Tests re-run | `npx vitest run` FCM suite → **29 PASS** |
| Report | Expanded with exact env names, worker behavior, and **owner-only** setup steps |

---

## 1. Exact configuration (from code — not guessed)

### Backend env variables (`backend/src/config/env.ts`, `.env.staging.example`)

| Variable | Role | Staging today |
|----------|------|---------------|
| `FIREBASE_PROJECT_ID` | Firebase project id for Admin SDK | **EMPTY** |
| `FIREBASE_CLIENT_EMAIL` | Service-account client email | **EMPTY** |
| `FIREBASE_PRIVATE_KEY` | Service-account PEM (use `\n` escapes in `.env`) | **EMPTY** |
| `FCM_WORKER_ENABLED` | `true`/`false`/`1`/`0`/`on`/`off`/`yes`/`no` — default **true** if unset; staging example sets **false** | **`false`** |
| `FCM_ALLOW_PROD_OUTBOX` | Escape hatch: allow **non-production** Node to drain FCM outbox against a **hosted** Supabase URL | **`false`** |

Optional / unrelated to send path: `FIREBASE_ANALYTICS_MEASUREMENT_ID`, `FIREBASE_CRASHLYTICS_ENABLED`.

**Never** put `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` in Vite `VITE_*` or Android client files.

### Private-key format (`integrations/firebase.ts` → `normalizePrivateKey`)

- Store the PEM in `backend/.env.staging` as a **single line** with literal `\n` between PEM lines, **or** a quoted multi-line value.
- Code strips surrounding quotes and converts `\n` → real newlines.
- Do not commit the file (gitignored).

### Worker deployment model (`backend/src/index.ts` + `fcm-worker-runner.ts`)

| Property | Value |
|----------|-------|
| Where it runs | **In-process** inside the API (`npm run start:staging` / Railway service) — not a separate worker service |
| Start condition | `initFirebaseAdmin` succeeds **and** `shouldStartFcmWorker(env).start === true` |
| Interval | **4000 ms** |
| Batch | **50** attempts / tick |
| Concurrency | Single-flight (`tickBusy`); skips overlap |
| Claim | Atomic claim of `pending` → `sending` |
| Retry | Exponential backoff from 30s, cap 1h; max attempts per row (default 8) |
| Permanent token errors | Soft-invalidate token; mark attempt `failed` |
| Transient errors | Re-queue `pending` with `next_attempt_at` |
| Null messaging | **No-op** — does **not** mark attempts `sent` |

### Staging gate that blocks local worker even after credentials exist

`shouldStartFcmWorker` (`fcm-worker-gate.ts`):

1. `FCM_WORKER_ENABLED=false` → **off**.
2. Else if `NODE_ENV !== production` **and** `SUPABASE_URL` is hosted (`*.supabase.co`) **and** `FCM_ALLOW_PROD_OUTBOX` is not true → **off** (prevents local API from silently draining a hosted outbox).

Staging API uses `NODE_ENV=development` + hosted staging Supabase → after credentials are set you **must** set:

```text
FCM_WORKER_ENABLED=true
FCM_ALLOW_PROD_OUTBOX=true
```

**Meaning of the escape hatch here:** allow this laptop’s staging API process to drain the **staging** project outbox (`yveadybpntziyryxsrsu`).  
**Do not** put **production** Firebase service-account keys into `.env.staging`.  
**Do not** point `.env.staging` `SUPABASE_*` at production.

### Client alignment (presence only — values not printed)

| Item | Status |
|------|--------|
| `apps/transport/android/app/google-services.json` | Present; package `com.lumenx.app.transport` |
| Transport `VITE_FIREBASE_PROJECT_ID` | SET locally |
| Must match Admin `FIREBASE_PROJECT_ID` | **Owner must confirm** after staging Admin project is chosen |

Parent pushes target **Connect** (`targetApps: ["connect"]`). Driver pushes target **Transport**. Device tests for parent events need a **Connect** build/token on the same Firebase project.

### Hosting note

- Documented staging API path for this laptop: **local** `backend` + `backend/.env.staging` (`backend/STAGING.md`).
- Railway CLI currently has **no usable staging login** this pass (`railway login` required); production Railway must **not** receive staging FCM experiments.

---

## 2. Owner actions required (account-level — agent stopped here)

### A. Firebase Console (you)

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select or create a **non-production** project dedicated to staging (preferred), **or** an already approved staging project — **not** production if you can avoid it.
3. **Project settings → Service accounts → Generate new private key** (Admin SDK).
4. Download the JSON once. You will need:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (escape newlines as `\n` in `.env`)
5. Ensure Android apps exist (or are added) for:
   - `com.lumenx.app.transport`
   - `com.lumenx.app.connect` (for parent push tests)
6. Download matching `google-services.json` into each app’s `android/app/` if the project id differs from what you already have (gitignored; never commit).

### B. Edit gitignored `backend/.env.staging` (you — do not paste keys into chat)

Set (placeholders only):

```bash
FIREBASE_PROJECT_ID=<staging_project_id>
FIREBASE_CLIENT_EMAIL=<staging_sa>@<project>.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_WORKER_ENABLED=true
FCM_ALLOW_PROD_OUTBOX=true
```

Keep:

- `LUMENX_ENV=staging`
- `STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu`
- Supabase URL/keys for **staging only**
- Denylist including production ref

### C. Restart staging API (you or ask agent after credentials exist)

```bash
cd backend
npm run build
npm run start:staging
```

### D. Verify readiness (no secrets)

```bash
curl -sS http://127.0.0.1:8787/api/v1/health/ready
node --env-file=backend/.env.staging qa-artifacts/_fcm-staging-config-probe.mjs
```

**Ready only if:**

- `fcm.firebaseConfigured: true`
- `fcm.messagingReady: true`
- `fcm.workerEnabled: true`
- `fcm.workerRunning: true`
- `fcm.projectId` is non-null (id only; safe)
- Probe `firebase_admin_credentials_complete: true`

Until then, readiness remains **BLOCKED**.

---

## 3. Safe enablement rules (once credentials exist)

| Rule | Why |
|------|-----|
| Use staging Firebase + staging Supabase only | Avoid production users |
| Synthetic accounts only (`smoke.staging.transport.rt.*`) | No real parents |
| Prefer one controlled Admin/API emit to a single test user | Avoid queue floods |
| Worker batch 50 / 4s is fine for staging | Existing design |
| Soft-invalidate on permanent FCM errors | Existing behavior — do not disable |
| Do not toggle production Railway FCM | Out of scope |

Agent will **not** enable the worker or send notifications until you confirm credentials are in `.env.staging` and authorize a synthetic send.

---

## 4. Controlled real-device test plan (after readiness PASS)

**Device today:** `adb devices` → **empty** → device steps **BLOCKED**.

When a test phone is available:

1. USB debug; `adb devices` shows `device`.
2. Install **staging** Transport and/or Connect APK built against staging API + matching Firebase project.
3. Sign in as synthetic staging user; grant notification permission.
4. Confirm token: authenticated `GET /api/v1/notifications/device-tokens` (masked fingerprints only in any log).
5. Emit **one** synthetic notification (no real student/parent names) to that user only.
6. Record separately:
   - Backend attempt status / staff delivery diagnostic
   - Firebase acceptance (message id if exposed by diagnostics — tray still required)
   - Foreground in-app behavior
   - Background tray
   - Terminated tray (if supported)
   - Tap → relative deep link only

Without a device: complete A–D above, then mark device verification still BLOCKED.

---

## 5. Test evidence this pass

```text
cd backend
npx vitest run tests/fcm-delivery-edge.test.ts \
  tests/fcm-worker.test.ts \
  tests/fcm-target-apps.test.ts \
  tests/fcm-presentation.test.ts \
  src/integrations/fcm-worker-gate.test.ts
# → 5 files, 29 tests PASS
```

```text
node --env-file=backend/.env.staging qa-artifacts/_fcm-staging-config-probe.mjs
# → firebase_admin_credentials_complete: false
# → FCM_WORKER_ENABLED: false
```

```text
GET /api/v1/health/ready → fcm.firebaseConfigured=false, messagingReady=false,
  workerEnabled=false, workerRunning=false, projectId=null
```

```text
adb devices → (none)
```

---

## Capability rollup

| Item | Status |
|------|--------|
| Env / worker / gate documented from code | **PASS** |
| Staging credentials present | **FAIL** / **BLOCKED** |
| Worker running on staging API | **BLOCKED** |
| Mocked FCM tests (29) | **PASS** |
| Real Firebase acceptance | **NOT RUN** |
| Device tray / tap | **BLOCKED** (no device + no credentials) |
| Pipeline refactor | **Not done** (not needed) |
| `STOP_NEXT` | **Untouched** |

### Final status: **FCM BLOCKED**

**Your next actions:** complete §2 A–B (Firebase service account → `backend/.env.staging`), restart API (§2 C), confirm readiness (§2 D), then attach a test device and authorize one synthetic send. After credentials are in place, ask the agent to re-verify readiness and (if a device is connected) run the controlled send — still without printing secrets.
