# Transport — Real-Device Acceptance Checklist (Staging)

**Environment:** Android Transport APK + Connect against staging `yveadybpntziyryxsrsu` only.  
**Never** use production parents/students or project `kmpzflsurepjwqnfqyld`.

## Preconditions

- [ ] `backend/.env.staging` points at `yveadybpntziyryxsrsu` (`node qa-artifacts/staging-meta-probe.mjs`)
- [ ] Staging API / Transport / Connect builds include eight-issue fixes (`STOP_NEXT`, school-arrival grace, drop copy, attendance mutex, driver reminders)
- [ ] Synthetic institute (e.g. `LX-E2E-TEST`) with:
  - 1 driver + assigned vehicle + approved route
  - 1 parent linked to **3 children**, pickup stops **S1 / S2 / S3** (distinct coordinates)
  - FCM tokens registered on parent Connect device
- [ ] Capture: screenshots, notification shade, `adb logcat` (FCM), server `notification` rows (dedupe_key)

## Scenario A — Trip start (Issue 1)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| A1 | Driver starts morning pickup | Parent receives **1** “Trip started” (or equivalent), not 3 | Inbox + OS shade count |
| A2 | Check DB/API inbox | One row with `dedupe_key = transport:{tripId}:started:parent` | Query / screenshot |
| A3 | Board child A only | Separate boarded notify for A only | Title includes child A name |

## Scenario B — Start at school, no movement (Issue 2)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| B1 | Park at school; start pickup; stay still 2+ min | **No** “Children reached school safely” | Shade empty of SCHOOL_ARRIVED |
| B2 | After grace + running, still no boarding | Still no school-arrived until geofence rules + phase allow | Timeline |

## Scenario C — Stop order vs proximity (Issues 5–6)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| C1 | Drive into S1 geofence | Parents of S1: **STOP_ARRIVED** (“Bus has arrived…”). No “Next is your stop” for S1 from approach | Push titles |
| C2 | Same moment | Parents of S2: **STOP_NEXT** (“Next is your stop — … S2”). Not merely because near S2 earlier | Push + dedupe `…:stop:{s2}:next` |
| C3 | Before leaving S1, drive near S2 only (if possible) without completing S1 arrival | Must **not** get STOP_NEXT for S2 from proximity alone | Negative evidence |
| C4 | Enter S2 geofence | S2: STOP_ARRIVED; S3: STOP_NEXT | |

## Scenario D — Drop wording (Issue 3)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| D1 | Evening trip; drop child at home stop (not school) | Body uses **home stop name**; no “at school” unless stop.kind=school | Screenshot |
| D2 | Drop at school stop | May say reached school / dropped at school | |

## Scenario E — Attendance taps (Issue 4)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| E1 | Single tap board | One durable boarding; chip → confirmed | UI |
| E2 | Double-tap fast | Second tap busy / ignored; one server event | Network log |
| E3 | Airplane mode → mark → reconnect | One sync; no duplicate after retry | Outbox |

## Scenario F — Background reminders (Issue 7)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| F1 | Start trip; background + lock 10+ min | Local “Trip still active” reminder (if notification permission granted) | Shade |
| F2 | Tap Continue | Trip stays active; toast/continue event | |
| F3 | Tap End | Opens Home end flow — **does not** silent-complete | |
| F4 | After 60 min no response | Hour-boundary alert; trip **still active** | |
| F5 | Resume app | GPS/outbox flush (location updates resume) | Map / logcat |

## Scenario G — Latency (Issue 8)

| Step | Action | Expected | Evidence |
|------|--------|----------|----------|
| G1 | Time Start Trip button → Home CTA ready | Record ms (target: document baseline; no claim without numbers) | Stopwatch / perf log |
| G2 | Time End Trip → day flags correct | Record ms | |

## Pass criteria for staging acceptance

- A1–A2, B1, C1–C2, D1, E1–E2 must PASS on device or instrumented staging.
- F* and G* may be PARTIAL if OEM kills timers — document honestly.
- Any FAIL blocks production approval for that issue.
