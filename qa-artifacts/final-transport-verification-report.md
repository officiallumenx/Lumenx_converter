# Final Transport Verification Report

**Date:** 2026-10-20  
**Staging project:** `yveadybpntziyryxsrsu` (denylist `kmpzflsurepjwqnfqyld` not targeted)  
**GPS RLS:** Already applied + history-recorded (`20261020160000`) — not modified this run  
**Protected file:** `apps/connect/src/lib/transport/learner-live.ts` — unchanged

---

## Verdict

| Gap | Result |
|-----|--------|
| Staging `STOP_APPROACHING` emission + sibling coalesce | **PASS** |
| Browser live / stale / disconnected / recovered GPS UI | **PARTIAL** — unit/label coverage **PASS**; Playwright browser E2E **NOT RUN** (no harness; cannot edit `learner-live.ts`) |

Overall for the two remaining Transport gaps: **READY WITH KNOWN LIMITATIONS** (browser E2E chrome still not exercised in a real browser).

---

## Part A — STOP_APPROACHING

### Required conditions (from `approach.ts`)

| Condition | Value / rule |
|-----------|----------------|
| Start grace | `APPROACH_START_GRACE_MS = 90_000` — bands suppressed while `now - started_at < 90s` |
| Approach bands | ETA maps to 30 / 15 / 5 minutes via `approachThresholdToEmit` |
| Spatial window | Crow-flies ≤ `APPROACH_EVAL_RADIUS_M` (~17 km) |
| At-stop | `withinRadius` (default geofence 100 m) → `STOP_ARRIVED`; approach path uses **distant** pings to isolate bands |
| Sibling coalesce | One parent row per `transport:{trip}:stop:{stop}:approach:{threshold}` with `studentIds[]` |

### Harness change

`e2e/staging/transport-realtime-probe.mjs` approach section now:

1. Backdates synthetic `transport_trip.started_at` past grace (fallback: bounded `waitFor` until grace end).  
2. Publishes distant GPS (~2.5 km north of pickup, `speed_kmh=25`) outside the 100 m geofence.  
3. Polls parent inbox with `waitFor` for `STOP_APPROACHING` (no arbitrary fixed sleep as the primary gate).

### Staging result

```text
node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs
→ {"PASS":32,"FAIL":0,"BLOCKED":0,"PARTIAL":0,"NOT RUN":0}
```

Critical rows:

- `approach_start_grace: PASS` — synthetic started_at backdated past 90000ms grace  
- `notif_approach_dedupe: PASS` — exactly 1 STOP_APPROACHING covering 3 siblings  
- `notif_stop_arrived_dedupe: PASS` — 1 STOP_ARRIVED covering 3 siblings  
- `vehicle_location_rls_parent: PASS` / `realtime_location_event: PASS` (post-RLS)

API: `npm run dev:staging` → Supabase `https://yveadybpntziyryxsrsu.supabase.co` on `127.0.0.1:8787`.

---

## Part B — GPS UI states (live / stale / disconnected / recovered)

### Feasibility without `learner-live.ts`

| Approach | Status |
|----------|--------|
| Playwright browser E2E for Connect transport chrome | **NOT RUN** — no existing Playwright scenario drives live/stale/offline/recovered GPS chrome; adding one that rewires live mapping would risk the protected file |
| Source/unit coverage of status + label mapping | **PASS** (extended) |

### Unit results

```text
npm run test --workspace=@lumenx/app-connect -- src/lib/transport/parent-status.test.ts src/lib/transport-utils.test.ts
→ 20 passed (20)

npx vitest run backend/src/domains/transport/approach.test.ts
→ 16 passed
```

Coverage added:

- `deriveParentTransportStatus` for `live` / `stale` / `offline` / recovered-to-`live`  
- `trackingStatusLabel` / `formatApproachEta` for live, stale, unavailable, and recovered ETA copy  

These are the same pure functions the Connect UI uses for chrome text; they are **not** a substitute for a full browser session.

---

## Safety confirmation

- Staging only (`yveadybpntziyryxsrsu`); denylist not used as API/DB target  
- No GPS RLS apply/repair/alter  
- No `learner-live.ts` edits  
- No commit / push / deploy / destructive working-tree cleanup  
- Synthetic RT institute fixtures only; trip soft-deleted at end of probe  
- Secrets not printed  

### Note on local API port

An existing non-staging listener on `8787` was stopped so `npm run dev:staging` could bind. Staging identity was verified via Supabase URL in server logs before the probe.

---

## Commands executed

```bash
# Identity (read-only)
npx supabase db query --linked --project-ref yveadybpntziyryxsrsu \
  -o json "select version, name from supabase_migrations.schema_migrations where version = '20261020160000';"
# → present

# Staging API
cd backend && npm run dev:staging

# Probe
node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs

# Units
npm run test --workspace=@lumenx/app-connect -- src/lib/transport/parent-status.test.ts src/lib/transport-utils.test.ts
npx vitest run backend/src/domains/transport/approach.test.ts

git diff --check
git diff --name-only -- apps/connect/src/lib/transport/learner-live.ts
```

---

## Files touched this run

| File | Why |
|------|-----|
| `e2e/staging/transport-realtime-probe.mjs` | Grace + distant approach path |
| `apps/connect/src/lib/transport/parent-status.test.ts` | GPS freshness unit cases |
| `apps/connect/src/lib/transport-utils.test.ts` | Live/stale/offline/recovered labels |
| `qa-artifacts/_final-transport-realtime-probe.txt` | Probe log |
| `qa-artifacts/_final-transport-gps-ui-vitest.txt` | UI unit log |
| `qa-artifacts/final-transport-verification-report.md` | This report |
| `qa-artifacts/transport-staging-realtime-verification.md` | Superseding note |

---

## Remaining limitation

Full **browser** E2E of Connect transport GPS chrome (live → stale → disconnected → recovered) still needs a dedicated Playwright harness that mocks or drives API/realtime without editing `learner-live.ts`. Track as a follow-up; unit mapping is green.
