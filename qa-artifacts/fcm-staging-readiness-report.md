# LumenX — FCM Staging Readiness Report

**Date:** 2026-10-23  
**Upstream:** `qa-artifacts/transport-fcm-delivery-report.md`  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Production Supabase (deny):** `kmpzflsurepjwqnfqyld`  
**Real FCM send / tray / tap:** **NOT RUN** (no approval; credentials incomplete)  
**Secrets printed or committed:** **No**

---

## Final status

# `READY FOR HUMAN STAGING CONFIGURATION`

Code path, targeting, isolation gates, and mocked delivery tests pass. Staging Firebase Admin credentials are still **empty** and `FCM_WORKER_ENABLED=false`. This status **does not** mean real push delivery has been proven.

---

## 1. Verified findings and evidence

### Pipeline (code)

| Stage | Evidence |
|-------|----------|
| Emit → `targetApps` | `transport-notification-emit.ts` + `resolve-target-apps.ts` (`targetAppsForTransportAudience`) |
| Enqueue FCM attempts | Notification create → `notification_delivery_attempt` channel `fcm` (mocked worker tests) |
| Worker loop | In-process in API (`backend/src/index.ts` + `fcm-worker-runner.ts`); interval **4000 ms**, batch **50** |
| Permanent token invalidation | Soft-invalidate `device_token.valid`; attempt `failed` (mocked) |
| Null messaging | No-op — does **not** mark attempts `sent` |

### Worker hosting model

- **Not** a separate microservice.
- Runs **inside** the API process when `initFirebaseAdmin` succeeds **and** `shouldStartFcmWorker(env).start === true`.
- Staging path documented as local `backend` + `backend/.env.staging` (`backend/STAGING.md`). This pass did **not** enable the worker or deploy anything.

### Health / ready (`GET /api/v1/health/ready`)

Exposes `checks.fcm`:

| Field | Meaning |
|-------|---------|
| `workerEnabled` | Env intent (`FCM_WORKER_ENABLED !== false`) |
| `firebaseConfigured` | Named Admin app initialized |
| `workerRunning` | Active `setInterval` in this process |
| `messagingReady` | All three true |

When push is intentionally disabled (`FCM_WORKER_ENABLED=false`), readiness is **not** failed solely for FCM (`messagingReady=false` still reported). Automated assertion added this pass.

### Staging config presence probe (names only)

`node --env-file=backend/.env.staging qa-artifacts/_fcm-staging-config-probe.mjs` → exit **3**:

| Name | Staging today |
|------|----------------|
| `FIREBASE_PROJECT_ID` | **EMPTY** |
| `FIREBASE_CLIENT_EMAIL` | **EMPTY** |
| `FIREBASE_PRIVATE_KEY` | **EMPTY** |
| `FCM_WORKER_ENABLED` | **`false`** |
| `FCM_ALLOW_PROD_OUTBOX` | **`false`** |
| Staging Supabase ref | **`yveadybpntziyryxsrsu`** (asserted) |

### Android / client presence (no secret values)

| App | `google-services.json` | Package match | Shared Firebase project fingerprint\* |
|-----|------------------------|---------------|----------------------------------------|
| Admin `com.lumenx.app.admin` | Present | OK | `81441b63d3aa` |
| Connect `com.lumenx.app.connect` | Present | OK | `81441b63d3aa` |
| Transport `com.lumenx.app.transport` | Present | OK | `81441b63d3aa` |

\*SHA-256 prefix of `project_info.project_id` only — **not** the project id string. All three Android clients currently share the **same** Firebase project fingerprint. Owner must confirm that project is the **intended staging** Firebase project (not production) before enabling the worker.

Client Vite public Firebase ids (`VITE_FIREBASE_*`) are present in local app envs per prior probe for Transport; Admin SDK server keys remain empty in `backend/.env.staging`.

### Permissions / channels / tap handling

| Item | Status |
|------|--------|
| `POST_NOTIFICATIONS` | Declared on Admin / Connect / Transport manifests |
| Default FCM channel (Connect) | `lumenx_notifications` meta-data present |
| Small icon / color | `ic_notification` + presentation helpers (`fcm-presentation.ts`) |
| Token registration | `@lumenx/notifications` `push-device-token.ts` + app `PushDeviceTokenRegistration` |
| Tap / deep link | Capacitor `pushNotificationActionPerformed`; server templates carry `deepLink` (e.g. `/transport`) — **device tap NOT verified this pass** |

---

## 2. Missing configuration (names only — no values)

Must be set by a human in **staging-only** `backend/.env.staging` (gitignored):

1. `FIREBASE_PROJECT_ID`
2. `FIREBASE_CLIENT_EMAIL`
3. `FIREBASE_PRIVATE_KEY` (PEM with `\n` escapes)

Then, only after explicit approval to run the worker against staging:

4. `FCM_WORKER_ENABLED=true`
5. `FCM_ALLOW_PROD_OUTBOX=true` — **escape hatch** so non-`production` Node may drain a **hosted** staging Supabase outbox (`*.supabase.co`).  
   **Meaning here:** allow local staging API to process **staging** outbox rows.  
   **Never** point `SUPABASE_*` or Firebase Admin keys at production when using this hatch.

Also confirm (presence / match — not values in reports):

- `LUMENX_ENV=staging`, `STAGING_CONFIRMED`, `STAGING_SUPABASE_PROJECT_REF=yveadybpntziyryxsrsu`
- `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` includes `kmpzflsurepjwqnfqyld`
- Each app’s `google-services.json` + `VITE_FIREBASE_PROJECT_ID` align with the **same** Firebase project as Admin `FIREBASE_PROJECT_ID`

Optional / non-blocking for send: `FIREBASE_ANALYTICS_MEASUREMENT_ID`, `FIREBASE_CRASHLYTICS_ENABLED`.

---

## 3. Current worker and health status

| Check | Result |
|-------|--------|
| Firebase Admin init (staging env) | **Not configured** (credentials empty) |
| Worker gate | **Off** (`FCM_WORKER_ENABLED=false`) |
| Worker running | **No** |
| Real push | **Not authorized / not attempted** |
| Production touched | **No** |

---

## 4. Automated test results (mocked only)

| Suite | Result |
|-------|--------|
| `tests/fcm-worker.test.ts` | 4 PASS |
| `tests/fcm-delivery-edge.test.ts` | **8 PASS** (was 6; +health/ready + staging gate hatch) |
| `tests/fcm-target-apps.test.ts` | 6 PASS |
| `tests/fcm-presentation.test.ts` | 9 PASS |
| `src/integrations/fcm-worker-gate.test.ts` | 4 PASS |
| **Total** | **31 PASS / 5 files** |

These tests prove **pipeline correctness with mocks**. They **do not** prove Firebase Cloud Messaging delivery, tray display, or tap navigation.

Covered: missing credentials → null config; worker disabled; hosted-URL gate + escape hatch; null messaging no-op; permanent invalidation without cross-token damage; multi-recipient isolation; targetApps mapping; presentation/payload helpers; health FCM snapshot when disabled.

---

## 5. Staging-versus-production isolation evidence

| Control | Evidence |
|---------|----------|
| Staging env assert | `assertStagingEnv` — ref must match `STAGING_SUPABASE_PROJECT_REF`; denylist blocks production ref |
| Staging dotenv isolation | Staging mode does not merge production `backend/.env` (`STAGING.md`) |
| FCM outbox drain gate | Non-production + hosted Supabase refuses worker unless `FCM_ALLOW_PROD_OUTBOX=true` |
| Probe binding | Probe refused unless URL ref is `yveadybpntziyryxsrsu` |
| This pass | No production secret writes, no Railway prod deploy, worker not enabled |

**Residual human risk:** putting **production** Firebase service-account JSON into `.env.staging`, or pointing staging `SUPABASE_*` at `kmpzflsurepjwqnfqyld`. Checklists below forbid both.

---

## 6. Remaining steps (human — see checklist)

1. Choose / confirm non-production Firebase project; register Android packages for Admin / Connect / Transport.  
2. Generate Admin SDK key; set the three `FIREBASE_*` names in `.env.staging` only.  
3. Align client `google-services.json` / `VITE_FIREBASE_PROJECT_ID` with that project.  
4. Verify `health/ready` after restart (still `messagingReady=false` until worker enabled).  
5. Obtain **explicit approval** → set `FCM_WORKER_ENABLED=true` and `FCM_ALLOW_PROD_OUTBOX=true` for staging-only.  
6. Controlled device test (authorized staging accounts) → tray → tap → deep link.  
7. Soft-invalidate / clean test tokens; set worker back to `false` if experiment ends.

**Do not** enable the worker or send real pushes without that approval.

---

## 7. Mocked vs real-device proof (hard separation)

| Claim | Status |
|-------|--------|
| Emit → enqueue → worker → invalidate (mocked) | **Proven** (31 tests) |
| Health reflects disabled FCM | **Proven** (new test) |
| Staging isolation gates | **Proven** (code + probe + tests) |
| Firebase Admin accepts staging credentials | **NOT PROVEN** (credentials empty) |
| Device receives notification | **NOT PROVEN** |
| Tray display / tap / navigation | **NOT PROVEN** |

---

## 8. Files changed this pass

| File | Change |
|------|--------|
| `backend/tests/fcm-delivery-edge.test.ts` | Added health/ready FCM snapshot + staging gate hatch tests |
| `qa-artifacts/fcm-staging-readiness-report.md` | This report |
| `qa-artifacts/fcm-staging-setup-checklist.md` | Human setup checklist |
| `qa-artifacts/_fcm-readiness-tests.txt` | Test log |

**Product runtime code:** unchanged (no defect requiring a fix).

---

## 9. Verification commands

| Command | Result |
|---------|--------|
| FCM Vitest suites (5 files) | **31 PASS** |
| `git diff --check` (touched paths) | **PASS** |
| `backend` `tsc --noEmit` | **FAIL** — pre-existing `packages/utils` `window` / `StorageEvent` errors under Node typings; **unrelated** to FCM test changes |

---

## 10. Conclusion

Push **code** is ready for a human to configure staging Firebase and, after approval, enable the in-process worker against staging only. Until credentials exist and a device test is approved, treat delivery as **unverified**.
