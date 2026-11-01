# Transport Real-Time Staging Verification (Task 1)

**Date:** 2026-10-20  
**Staging project:** `yveadybpntziyryxsrsu` (denylist `kmpzflsurepjwqnfqyld`)  
**Overall verdict:** **PASS** (final re-verification 2026-10-20 — see `final-transport-verification-report.md`)

> **Supersession:** Initial Task 1 run was PARTIAL (parent GPS RLS FAIL; `STOP_APPROACHING` NOT RUN). After staging GPS RLS apply + history repair + probe approach-path fix, re-run scored **32 PASS / 0 FAIL**, including parent Realtime GPS and `STOP_APPROACHING` sibling coalesce.

---

## 1. Overall verdict: PASS (final)

Live staging paths for driver publish, parent live API + `vehicle_location` Realtime, boarding/dropping lifecycle, sibling stop-level notification coalesce (`STOP_ARRIVED` + `STOP_APPROACHING`), isolation, and reconnect cleanup **PASS**.

---

## 2. Driver-to-parent location

| Check | Status | Notes |
|-------|--------|-------|
| Driver `POST .../location` | PASS | Authorized driver JWT |
| Unauthorized location | PASS | Parent token → HTTP 403 |
| Parent live API | PASS | `/portal/learner-transport/live` returns trip/location |
| Parent SELECT `vehicle_location` | PASS | parent SELECT rows ≥1 (post guardian RLS helper) |
| postgres_changes `vehicle_location` | PASS | events ≥1 |
| Isolation parent live denied | PASS | Inst-B parent → HTTP 403 |

**Root cause (confirmed, not fixed):**  
`supabase/migrations/20261006020000_transport_phase9_rls_hardening.sql` — `vehicle_location_select_scoped` guardian path joins `transport_trip`. Parents cannot SELECT `transport_trip` (staff/driver/platform only), so the EXISTS clause is always false under RLS. Older enrollment-only policy would have allowed parents. Fix needs an approved migration.

---

## 3. Pickup / drop-off

| Check | Status |
|-------|--------|
| Board child 1/2/3 | PASS |
| Idempotent boarding retry | PASS |
| Unauthorized boarding | PASS (403) |
| Boarding realtime events | PASS (3) |
| Parent sees boarded | PASS |
| Drop child 1/2/3 | PASS |

---

## 4. Notification deduplication

| Check | Status | Notes |
|-------|--------|-------|
| `STOP_ARRIVED` sibling coalesce | PASS | 1 parent notif, `studentIds.length=3` |
| `STOP_APPROACHING` band coalesce | PASS | grace cleared + distant pings → 1 parent row / 3 siblings |
| Boarded per child | PASS | 3 notifs / 3 students (trip-scoped) |
| Unit approach coalesce keys | PASS | 25 vitest (approach+severity+audience) |

Duplicates origin for boarded: distinct per-student production (expected). Stop-level events coalesce at producer (`studentIds` array + single dedupe key).

---

## 5. Reconnect and authorization

| Check | Status |
|-------|--------|
| Remove channels + resubscribe | PASS |
| Idempotent boarding after reconnect (no duplicate event) | PASS |
| Location publish after reconnect | PASS |
| Parent live after reconnect | PASS |
| Realtime cleanup | PASS |
| Role/institute isolation | PASS |

---

## 6. Exact commands and counts

```text
# Staging identity + probe (mutates synthetic RT institute only)
node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs
# → PASS 28 / FAIL 2 / NOT RUN 1  (exit 1 due to RLS FAILs)

npm run typecheck --workspace=@lumenx/app-transport
# → PASS

npx vitest run backend/src/domains/transport/approach.test.ts \
  backend/src/domains/transport/transport-notification-severity.test.ts \
  backend/src/domains/transport/ops-notifications-audience.test.ts
# → 3 files, 25 tests PASS

git diff --check
# → clean (warnings only on CRLF)

# learner-live.ts unchanged:
git diff --name-only -- apps/connect/src/lib/transport/learner-live.ts
# → (empty)
```

**Separation:**
- Unit tests: 25 PASS (mocked; not live realtime)
- API / staging probe: live Hono on `127.0.0.1:8787` + staging Supabase
- Browser tests: NOT RUN this task
- Actual staging realtime: boarding **verified live**; vehicle_location **verified FAIL** (not mocked)

---

## 7. Unverified / blockers

1. Parent GPS realtime channel — **blocked by RLS** (see §2); cannot fix without migration approval.  
2. `STOP_APPROACHING` staging emit — NOT RUN (grace + first ping inside geofence).  
3. Browser UI live/stale/disconnected chrome — NOT RUN (API + realtime probe only).  
4. Connect poll fallback timing after missed GPS events — NOT RUN.

---

## 8. Changed files (this task)

| File | Reason |
|------|--------|
| `e2e/staging/transport-realtime-probe.mjs` | Gated staging probe (fixtures, location, boarding, notifs, reconnect, isolation) |
| `qa-artifacts/_transport-staging-realtime-probe.txt` | Probe output |
| `qa-artifacts/_transport-rt-baseline-tsc.txt` | Transport tsc log |
| `qa-artifacts/_transport-rt-baseline-vitest.txt` | Focused vitest log |
| `qa-artifacts/four-module-reliability-report.md` | Preserve prior evidence; add staging results |
| `qa-artifacts/transport-staging-realtime-verification.md` | This report |

No product/runtime Transport or Connect source changes. No RLS/migration edits.

---

## 9. Safety confirmation

- Staging identity asserted before mutations; production denylist enforced.  
- No secrets printed.  
- No production data / real students.  
- No migrations, RLS changes, schema changes, DB resets.  
- No commit, push, deploy, or PR.  
- `apps/connect/src/lib/transport/learner-live.ts` unchanged.  
- Soft-cleanup limited to probe-created trips.  
- Pre-existing user working-tree changes preserved.
