# LumenX — FCM Staging Setup Checklist

**Audience:** Owner / ops (human)  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Production Supabase (never target):** `kmpzflsurepjwqnfqyld`  
**Agent status:** Do **not** complete credential paste, worker enable, or real sends without explicit human approval.

Never paste private keys, service-account JSON, or access tokens into chat, git, or these artifacts.

---

## 1. Firebase Console project

- [ ] Open [Firebase Console](https://console.firebase.google.com/).
- [ ] Select a **non-production** Firebase project dedicated to staging (preferred), **or** confirm an existing staging project is intentional.
- [ ] Confirm it is **not** the production Firebase project used by live Play Store builds (if those differ).
- [ ] Note the project id for later match against Admin `FIREBASE_PROJECT_ID` (do not commit it into this checklist file if sensitive in your org policy).

---

## 2. Android app registrations (package IDs)

Register (or verify) Android apps in that Firebase project:

| App | applicationId / package |
|-----|-------------------------|
| Admin | `com.lumenx.app.admin` |
| Connect | `com.lumenx.app.connect` |
| Transport | `com.lumenx.app.transport` |

- [ ] Each package exists under the **staging** Firebase project.
- [ ] Download / place `google-services.json` under each:
  - `apps/admin/android/app/google-services.json`
  - `apps/connect/android/app/google-services.json`
  - `apps/transport/android/app/google-services.json`
- [ ] Files remain **gitignored**; release builds fail closed if missing.
- [ ] Confirm `project_info.project_id` matches the Admin SDK project you will configure.
- [ ] Optional: align each app’s `VITE_FIREBASE_PROJECT_ID` (public client hint) with the same project.

**Do not assume** Admin / Connect / Transport share one Firebase app entry — they are three Android clients (may share one Firebase **project**).

---

## 3. Firebase Admin credentials (server)

- [ ] Firebase Console → Project settings → **Service accounts** → **Generate new private key**.
- [ ] From the JSON, map fields to staging env **names** (values only in gitignored file):
  - `project_id` → `FIREBASE_PROJECT_ID`
  - `client_email` → `FIREBASE_CLIENT_EMAIL`
  - `private_key` → `FIREBASE_PRIVATE_KEY` (single-line with `\n` escapes, or quoted multi-line)
- [ ] Prefer a **staging-only** service account; do not reuse production keys in `.env.staging`.
- [ ] Workload identity / alternative cloud IAM is acceptable if your host maps to the same three env vars — still staging-only.

---

## 4. Where staging-only secrets must be configured

- [ ] Edit **`backend/.env.staging`** only (copy from `backend/.env.staging.example` if needed).
- [ ] Confirm staging guards:
  - `LUMENX_ENV=staging`
  - `STAGING_CONFIRMED=I_CONFIRM_THIS_IS_NON_PRODUCTION`
  - `STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu`
  - `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` includes `kmpzflsurepjwqnfqyld`
  - `SUPABASE_URL` / anon / service-role → **staging** project only
- [ ] Set the three `FIREBASE_*` Admin vars (presence only until verified).
- [ ] Keep initially:
  - `FCM_WORKER_ENABLED=false`
  - `FCM_ALLOW_PROD_OUTBOX=false`
- [ ] **Never** put `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` into Vite `VITE_*` or Android client files.
- [ ] Do **not** write these into production Railway / production `.env`.

---

## 5. Verify worker environment and deployment target **before** enabling

Worker runs **in-process** inside the API (`npm run start:staging` / staging host) — not a separate FCM service.

- [ ] Start API with staging env only (see `backend/STAGING.md`).
- [ ] Confirm process env shows staging Supabase ref `yveadybpntziyryxsrsu` (logs/ref checks — not full URLs in shared docs if policy forbids).
- [ ] Confirm Firebase Admin init log `firebase_initialized` **or** `firebase_not_configured` matches expectation (project id may appear in logs — treat as sensitive metadata).
- [ ] With worker still disabled, expect log hint `fcm_worker_disabled` / gate reason.
- [ ] Ensure this process is **not** the production Railway service and **not** using production Supabase keys.

Presence probe (safe):

```bash
node --env-file=backend/.env.staging qa-artifacts/_fcm-staging-config-probe.mjs
```

Expect `firebase_admin_credentials_complete: true` only after credentials are filled; exit 0 when complete, 3 when incomplete.

---

## 6. Verify `health/ready`

```bash
# Against the staging API base URL you actually started
curl -sS http://127.0.0.1:8787/api/v1/health/ready
```

- [ ] With `FCM_WORKER_ENABLED=false`: `checks.fcm.workerEnabled=false`, `messagingReady=false`; overall status may still be `ready` if Supabase is ok.
- [ ] After credentials + worker enabled (step 7): `firebaseConfigured=true`, `workerRunning=true`, `messagingReady=true`.
- [ ] If credentials missing but worker enabled on production-like host, expect degraded / startup failure — do not “fix” by pointing at production.

---

## 7. Enable the worker (explicit human approval required)

**Stop here until an owner writes approval** (chat / ticket) to enable staging FCM.

Only then, in `backend/.env.staging`:

- [ ] `FCM_WORKER_ENABLED=true`
- [ ] `FCM_ALLOW_PROD_OUTBOX=true` — required for non-production Node draining **hosted** staging Supabase outbox  
  - Meaning: allow this staging API to process **staging** outbox rows  
  - **Not** permission to use production Firebase or production Supabase
- [ ] Restart the staging API process.
- [ ] Confirm log `fcm_worker_started` and `health/ready` `messagingReady=true`.

If approval is withdrawn:

- [ ] Set `FCM_WORKER_ENABLED=false` (and preferably `FCM_ALLOW_PROD_OUTBOX=false`), restart.

---

## 8. Real push test (authorized staging accounts only)

Prerequisites: worker enabled on staging; devices on staging builds; test users on staging Supabase.

- [ ] Install staging builds of the correct apps:
  - Parent / student events → **Connect**
  - Driver events → **Transport**
  - Staff → **Admin**
- [ ] Sign in with **staging** test accounts only.
- [ ] Grant notification permission (Android 13+ `POST_NOTIFICATIONS`).
- [ ] Confirm device token registered (backend `device_token` for that user + app; no tokens in reports).
- [ ] Trigger a **staging-safe** notification (e.g. test announcement or transport emit on a staging institute).
- [ ] Confirm worker drains attempts (`sent` / retry) without using production data.

---

## 9. Verify delivery UX

- [ ] Notification appears in system tray while backgrounded.
- [ ] Foreground behaviour matches product (in-app banner / tray — per app).
- [ ] Tap opens the correct app and navigates via safe deep link (e.g. transport → `/transport`).
- [ ] Wrong app does **not** receive the other audience’s pushes (`targetApps` isolation).
- [ ] Capture evidence privately (screenshots / short video); do not commit tokens or PII.

---

## 10. Cleanup

- [ ] Soft-invalidate or delete test device tokens for the test users/apps.
- [ ] Leave no pending test outbox spam on staging (or let retries exhaust).
- [ ] If experiment complete: set `FCM_WORKER_ENABLED=false`, restart staging API.
- [ ] Remove unused service-account JSON downloads from disks / downloads folders.
- [ ] Do **not** rotate or delete production Firebase keys as part of staging cleanup.

---

## Quick reference — env names

| Name | Role |
|------|------|
| `FIREBASE_PROJECT_ID` | Admin SDK project |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account PEM |
| `FCM_WORKER_ENABLED` | Master worker switch |
| `FCM_ALLOW_PROD_OUTBOX` | Allow non-prod process to drain hosted Supabase FCM outbox |
| `VITE_FIREBASE_PROJECT_ID` | Public client project hint (apps) |

Related docs: `backend/STAGING.md`, `qa-artifacts/transport-fcm-delivery-report.md`, `qa-artifacts/fcm-staging-readiness-report.md`.
