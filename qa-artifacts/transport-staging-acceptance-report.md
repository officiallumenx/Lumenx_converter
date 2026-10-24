# LumenX Transport — Staging Integration & Real-Device Acceptance Report

**Date:** 2026-10-21 (execution pass)  
**Upstream:** `qa-artifacts/transport-eight-issues-audit-and-fix-report.md`  
**HEAD:** `682a12ec` + local eight-issue fix tree (uncommitted)  
**Staging Supabase:** `yveadybpntziyryxsrsu` (`lumenx-staging`)  
**Denylist (untouched):** `kmpzflsurepjwqnfqyld`  
**Production API / Railway:** **NOT DEPLOYED** (see §3)

---

## Executive verdict

# **INCOMPLETE** — staging API acceptance partial; device / FCM / three-sibling live trip **NOT RUN**

**Production readiness: NOT DECLARED.**

---

## 1. Backend / client `STOP_NEXT` compatibility

| Concern | Result |
|---------|--------|
| Kind `STOP_NEXT` shared backend ↔ `@lumenx/utils` | **PASS** (contract tests) |
| Dedupe `transport:{tripId}:stop:{stopId}:next` | **PASS** |
| Recipient scope / payload fields | **PASS** (code + contract) |
| Connect `learner-live.ts` | **Unchanged** (not required for push) |

**Tests this pass:** `stop-next.contract.test.ts` + `eight-issues.regression.test.ts` → **14 PASS**.

---

## 2. Migration / template

| Item | Result |
|------|--------|
| DB migration for `STOP_NEXT` | **Not required** |
| Production migration | **Not run** (correct) |
| Optional notification registry template | Not added (runtime hardcoded emit) |

---

## 3. Staging deployment evidence

### 3.1 Identity

```text
node qa-artifacts/staging-meta-probe.mjs
```

| Check | Result |
|-------|--------|
| Staging URL ref | `yveadybpntziyryxsrsu` |
| Matches expected | **PASS** |
| On denylist | **false** |
| Differs from default/shared | **PASS** |

### 3.2 Hosted staging API / Railway

| Target | Result |
|--------|--------|
| `railway status` linked service | `https://api.lumenxtech.in` — Environment **production** |
| Deploy eight-issue backend to Railway | **NOT RUN — BLOCKED** (would mutate production) |
| Separate Railway staging environment | **Not linked / not used** |

Per `backend/STAGING.md`, staging API for this laptop is **local** `npm run start:staging` against staging Supabase.

### 3.3 Local staging API (executed)

```text
npm run build
npm run start:staging
```

| Probe | Result |
|-------|--------|
| Supabase init log | `https://yveadybpntziyryxsrsu.supabase.co` |
| `GET /api/v1/health` | **200** `{ status: ok, version: v1, release: 0.1.0 }` |
| `GET /api/v1/health/ready` | **200** `{ status: ready, supabase: ok }` |
| FCM | **disabled** (`firebaseConfigured: false`, `messagingReady: false`) |

### 3.4 Smoke login (API portion)

```text
npm run smoke:login:staging
```

| Area | Result |
|------|--------|
| `api.health` / `api.ready` | **PASS** |
| Fixtures provision | **PASS** |
| login.Transport driver + drivers/me | **PASS** |
| login.Connect parent / student / teacher | **PASS** |
| shell.* (Admin/Connect/Transport UIs) | **FAIL** (apps not running — expected without `with-shells`) |
| Summary | **13 PASS / 7 FAIL** (shell-only failures) |

---

## 4. Transport APK / Android device

| Step | Result |
|------|--------|
| `adb devices` | Daemon started; **no devices attached** |
| Build release APK via `.env.production` | **NOT RUN** — file points at **production** API `https://api.lumenxtech.in` |
| Staging-safe Capacitor build | **NOT RUN** — needs gitignored staging Vite env + reachable staging API from device |
| Install on device | **NOT RUN** |

Manual steps: `qa-artifacts/transport-staging-apk-manual-steps.md`.

---

## 5. Checklist A–E results

| ID | Scenario | Result | Evidence / blocker |
|----|----------|--------|--------------------|
| **A** | Trip start / sibling dedupe | **NOT RUN** | No device; FCM off; driver roster has **0** students / no route |
| **B** | Start at school → no false school-arrived | **NOT RUN** | No live trip |
| **C** | STOP_ARRIVED vs STOP_NEXT progression | **NOT RUN** (device); contract **PASS** | Code/contract only |
| **D** | Drop wording | **NOT RUN** (device); unit **PASS** | drop-stop / notify unit tests earlier |
| **E** | Attendance tap / retry | **NOT RUN** (device); unit **PASS** | sync mutex tests earlier |
| **F** | Background reminders | **NOT RUN** | No device |
| **G** | Start/end latency ms | **NOT MEASURED** | Waterfall mapped only |

### API fixture probe (read-only)

```text
node --env-file=backend/.env.staging qa-artifacts/transport-staging-acceptance-api-probe.mjs
```

| Field | Value |
|-------|--------|
| Driver / institute | Present (**PASS**) |
| Roster `route_id` | **false** |
| `student_count` | **0** |
| `distinct_pickup_stops` | **0** |
| `three_sibling_ready` | **false** |
| Trip mutations | **NOT RUN** (read-only probe) |

**Blocker for A–E live:** smoke Transport driver has **no assigned route / three-sibling enrollments**. Must provision synthetic route + 3 children + 1 parent on staging before device run.

---

## 6. Three-sibling notification counts (actual)

| Event | Expected | Actual (this pass) |
|-------|----------|---------------------|
| Trip started (unique parent) | 1 | **NOT RUN** |
| STOP_ARRIVED S1 | 1 | **NOT RUN** |
| STOP_NEXT S2 | 1 | **NOT RUN** |
| Boarded A/B/C | 3 | **NOT RUN** |
| False school-arrived at start | 0 | **NOT RUN** |

Expected matrix remains in `qa-artifacts/transport-staging-three-sibling-scenario.md`.

---

## 7. Stop progression & wording

| Check | Status |
|-------|--------|
| Plan S1→S2 + distinct dedupe keys | **PASS** (contract) |
| Approach copy ≠ “Next is your stop” | **PASS** (unit) |
| Live GPS → STOP_NEXT after S1 | **NOT RUN** |

---

## 8. Background tracking / reminders

| Check | Status |
|-------|--------|
| Code present (`trip-driver-reminders.ts`, App resume flush) | Yes (local tree) |
| Device lock-screen / 10-min reminder | **NOT RUN** |
| FCM parent delivery | **NOT RUN** (staging FCM disabled) |

---

## 9. Start / end latency

| Metric | Value |
|--------|--------|
| Static waterfall | Start ~4–5 steps; End ~4 steps (`transport-start-end-waterfall-probe.mjs`) |
| Measured median / range (ms) | **`null` — not measured** |
| Repeated live timings | **NOT RUN** (no trip start/end instrumentation on staging) |

Do **not** invent millisecond claims.

---

## 10. Failures, limitations, next actions

### Failures / blockers

1. **No Android device** attached → A–G device evidence impossible this session.  
2. **Railway = production** → cannot deploy staging API there.  
3. **FCM disabled** on local staging API → OS push counts unverifiable.  
4. **Smoke driver has empty roster** → three-sibling scenario not fixture-ready.  
5. Transport **production env** unsuitable for staging APK without a separate staging Vite env.

### Safe next actions (ordered)

1. Provision staging synthetic: route + vehicle + driver assign + parent ↔ 3 students @ S1/S2/S3.  
2. Optionally enable **staging-only** Firebase for FCM (still not production).  
3. Host a **non-prod** API (or use `adb reverse` + local `start:staging`) and build Transport with staging Vite env.  
4. Attach device; execute checklist A–E; attach screenshots / redacted notification IDs.  
5. Time start/end with request timestamps (≥3 runs → median/range).  
6. Only then update this report to PASS/FAIL and request production approval.

### Commands reference

```bash
node qa-artifacts/staging-meta-probe.mjs
cd backend && npm run build && npm run start:staging
# other terminal:
curl -sS http://127.0.0.1:8787/api/v1/health
curl -sS http://127.0.0.1:8787/api/v1/health/ready
npm run smoke:login:staging --workspace=@lumenx/api
node --env-file=backend/.env.staging qa-artifacts/transport-staging-acceptance-api-probe.mjs
npx vitest run src/domains/transport/stop-next.contract.test.ts --workspace=@lumenx/api
```

Device: `qa-artifacts/transport-device-acceptance-checklist.md`  
APK: `qa-artifacts/transport-staging-apk-manual-steps.md`

---

## Concise matrix

| Area | Status |
|------|--------|
| Staging Supabase identity | **PASS** |
| Local staging API health/ready | **PASS** |
| Smoke Transport/Connect login | **PASS** |
| Hosted staging API deploy | **NOT RUN** (Railway=prod) |
| Transport staging APK | **NOT RUN** |
| Device A–E | **NOT RUN** |
| Three-sibling live counts | **NOT RUN** |
| FCM / background | **NOT RUN** |
| Latency ms | **NOT MEASURED** |
| STOP_NEXT contracts | **PASS** |
| **Staging acceptance** | **INCOMPLETE** |
| **Production ready** | **NO** |
