# LumenX Transport — Automated Acceptance Report (No Physical Device)

**Date:** 2026-10-23  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Denylist (untouched):** `kmpzflsurepjwqnfqyld`  
**Production deploy / migrate / commit / push:** **NOT PERFORMED**  
**`learner-live.ts`:** **unchanged**  
**RLS / auth / institute isolation:** **not weakened**

---

## Final status

# **AUTOMATED ACCEPTANCE PASS — DEVICE-ONLY ITEMS REMAIN**

Automated unit/contract coverage for all eight issues passed. Synthetic staging API integration verified fixture readiness, trip start, false school-arrival suppression, boarding idempotency, and measured start/end API latency. Physical-device background GPS, lock-screen reminders, OS FCM shade, and UI start/end timings remain **NOT RUN**.

This is **automated simulation + staging API evidence**, not real-device acceptance.

---

## Per-issue status

| # | Issue | Automated unit/contract | Staging API (synthetic) | Device / FCM |
|---|--------|-------------------------|-------------------------|--------------|
| 1 | Sibling trip-start dedupe | **PASS** | **PASS** (DB `…:started:parent` for trip) | Inbox UI / OS push **NOT RUN** |
| 2 | False school arrival at start | **PASS** | **PASS** (`school_arrived_at` null after school GPS) | **NOT RUN** |
| 3 | Drop wording | **PASS** | Unit only (copy helper) | **NOT RUN** |
| 4 | Attendance multi-tap / outbox | **PASS** | **PASS** (board + same `client_event_id` retry 200) | **NOT RUN** |
| 5 | STOP_NEXT after S1 | **PASS** (plan/dedupe) | **PARTIAL** — this-trip DB had no `:next` after one quick S1 ping (likely still inside 90s approach start grace / no confirmed arrival row) | **NOT RUN** |
| 6 | Approach vs arrival | **PASS** | Approach/arrival kinds present historically; this-trip progression **PARTIAL** | **NOT RUN** |
| 7 | Driver reminders policy | **PASS** | N/A (native LocalNotifications) | Background / lock-screen **NOT RUN** |
| 8 | Start/end performance | Waterfall mapped + **latency harness PASS** | API medians recorded below | Client UI ms **NOT RUN** |

---

## Phase 1 — Automated regression coverage

### Commands and results

```text
cd backend
npx vitest run src/domains/transport/eight-issues.regression.test.ts \
  src/domains/transport/stop-next.contract.test.ts \
  src/domains/transport/approach.test.ts
# → 3 files, 40 tests PASS

cd apps/transport
npx vitest run src/lib/transport/trip-driver-reminders.test.ts \
  src/lib/transport/ops-outbox-priority.test.ts \
  src/lib/transport/attendance/drop-stop.test.ts \
  src/lib/transport/attendance/sync.test.ts \
  src/lib/transport/ops-outbox.test.ts
# → 5 files, 41 tests PASS

cd apps/transport && npx tsc --noEmit -p tsconfig.json
# → TRANSPORT_TSC exit 0
```

### Code helpers added for testability (behavior-preserving)

| Helper | Purpose |
|--------|---------|
| `canEvaluateSchoolArrivalOnPing` (`approach.ts`) | Issue 2 gate used by `ops-service` |
| `buildStudentDroppedParentCopy` (`ops-notifications.ts`) | Issue 3 school vs home copy |
| `compareOpsFlushPriority` (`ops-outbox.ts`) | Issue 4 critical-before-GPS |
| Reminder policy exports (`trip-driver-reminders.ts`) | Issue 7 interval / hour / actions |

### Coverage notes by issue

1. **Siblings:** dedupe keys ignore student ids for trip-start / parent reminders; boarded keys remain distinct.
2. **School arrival:** `starting` phase and 90s grace block evaluation; `running` past grace allowed.
3. **Drop copy:** waypoint “STG RT S1” must not say “at school”; `kind=school` may.
4. **Attendance / outbox:** `boarding`/`drop` critical; flush sorts critical before GPS; existing sync tests + updated order test.
5/6. **STOP_NEXT:** shared kind with `@lumenx/utils`; plan S1→S2→S3; approach copy ≠ “Next is your stop”; distinct dedupe keys.
7. **Reminders:** 10 min × 60 min ceiling; Continue/End never silently end trip; no `TRIP_AUTO_ENDED` event.
8. **Perf:** API harness (Phase 4); no unsafe client refetch removal claimed this pass.

### Security / RLS

- No RLS migration changes.
- Staging scripts call `assertStagingEnv` + hard-check ref `yveadybpntziyryxsrsu`.
- Soft-delete only trips for the synthetic RT vehicle/today or the trip id created this run.
- Cross-institute / guardian rules exercised indirectly by existing backend transport suites (not re-run in full here).

`git diff --check` on touched source files: **clean**.

---

## Phase 2 — Synthetic staging integration

**Script:** `qa-artifacts/transport-automated-staging-integration.mjs`  
**API:** local `http://127.0.0.1:8787` with `--env-file=.env.staging` (log: supabase `yveadybpntziyryxsrsu`, FCM disabled).  
**Fixture:** `lx-staging-transport-rt` — 3 students, S1→S2→S3→School, distinct pickups.

| Step | Result |
|------|--------|
| Health / ready | **PASS** (supabase ok; FCM not configured) |
| Driver/parent auth (RT emails) | **PASS** |
| Roster 3 kids / 3 pickups / route | **PASS** |
| Trip start | **PASS** (201) |
| Phase → running | **PASS** (200) |
| School GPS early | **PASS** (201); `school_arrived_at` **null** → Issue 2 **PASS** |
| S1 GPS | **PASS** (201) |
| DB notifications for trip | `…:started:parent` **present**; `:next` **absent** this run; `school_arrived` **absent** |
| Board child1 + idempotent retry | **PASS** (200/200) |
| Trip end + soft cleanup | **PASS** |
| FCM OS push | **NOT RUN** (disabled; not claimed) |

Inbox list included historical rows from prior synthetic trips (TRIP_STARTED / STOP_ARRIVED / SCHOOL_ARRIVED counts are **not** trip-scoped). Trip-scoped DB keys are the SoT for this run.

---

## Phase 3 — Android without hardware

| Check | Result |
|-------|--------|
| `adb devices` | Empty — no device/emulator |
| Emulator AVD list | Empty / unavailable |
| Fresh Gradle compile this run | **FAIL** (wrapper network download error) |
| Existing staging APK | **PASS** present |

**APK verify** (`qa-artifacts/transport-apk-config-verify.mjs`):

| Field | Value |
|-------|--------|
| Path | `apps/transport/android/app/build/outputs/apk/release/app-release.apk` |
| SHA-256 | `052a275dab0494affa0d76a5b524f374e6de5208030ce99af07e599c795c7317` |
| applicationId | `com.lumenx.app.transport` |
| versionName / versionCode | `1.0.6` / `7` |
| Bundle has `127.0.0.1:8787` | true |
| Bundle has `yveadybpntziyryxsrsu` | true |
| Prod API string also present | true (compile-time fallback constant only) |

**Explicitly NOT RUN:** physical background tracking, lock-screen reminders, OEM timer survival, real FCM delivery. An APK build does **not** prove those.

---

## Phase 4 — Start/end latency (API wall-clock)

**Script:** `qa-artifacts/transport-start-end-latency-harness.mjs`  
**Samples:** 5 (synthetic RT fixture; soft-cleaned each iteration)

| Metric | min | median | max | mean |
|--------|-----|--------|-----|------|
| Start trip API ms | 1493 | **1812** | 3945 | 2177 |
| Phase → running API ms | 953 | **1031** | 1176 | 1042 |
| End trip API ms | 2144 | **2231** | 2527 | 2299 |
| Client UI start/end ms | **NOT RUN** | | | |

No production requests. No invented timings. No client hydrate/GPS ladder included.

---

## Unresolved / remaining

1. **Device acceptance** checklist A–G still required for real-world proof.
2. **Staging FCM** unset — push delivery cannot be proven.
3. **Live STOP_NEXT** not observed for the single quick S1 ping in this harness (grace / arrival confirmation); unit+contract still **PASS**. Re-run RT probe or longer geofence dwell on staging for live confirmation.
4. **Hosted staging Railway** still unavailable (local API only).
5. Backend `tsc` from `backend/` still surfaces pre-existing `packages/utils` DOM lib noise — unrelated to this change set; Transport `tsc` **PASS**.

---

## Capability rollup

| Capability | Status |
|------------|--------|
| Issue 1–8 unit/contract automation | **PASS** |
| Synthetic staging fixture + trip lifecycle API | **PASS** |
| False school-arrival staging proof | **PASS** |
| Live STOP_NEXT staging proof | **PARTIAL** |
| Attendance idempotent API | **PASS** |
| Start/end API latency measured | **PASS** |
| Staging APK artifact + config | **PASS** |
| Emulator / physical device | **NOT RUN** |
| FCM push delivery | **NOT RUN** |
| Background location on phone | **NOT RUN** |

### Final status: **AUTOMATED ACCEPTANCE PASS — DEVICE-ONLY ITEMS REMAIN**
