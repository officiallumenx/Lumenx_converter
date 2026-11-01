# Staging scenario — three siblings, one parent, three stops

**Project:** `lumenx-staging` / `yveadybpntziyryxsrsu` only  
**Denylist:** `kmpzflsurepjwqnfqyld` (never)

## Fixture sketch (synthetic)

| Entity | Value |
|--------|--------|
| Institute | `LX-E2E-TEST` (or dedicated `LX-E2E-TRANSPORT-SIB`) |
| Parent | one Connect user, linked to Child A/B/C |
| Stops | S1, S2, S3 + School (distinct lat/lng, ≥200 m apart) |
| Enrollments | A→S1, B→S2, C→S3 (pickup); drops configured explicitly |
| Driver | PIN login; vehicle assigned to route |

## Expected notification counts (same trip)

| Event | Parent inbox/OS rows | Dedupe key pattern |
|-------|----------------------|--------------------|
| Trip started | **1** | `transport:{tripId}:started:parent` |
| Morning service reminder (if window) | **1** | `transport:{routeId}:reminder:morning_service:{date}` |
| STOP_ARRIVED at S1 | **1** (A’s guardians; same parent) | `transport:{tripId}:stop:{s1}:arrived` |
| STOP_NEXT for S2 (after S1 arrival) | **1** | `transport:{tripId}:stop:{s2}:next` |
| Boarded A, then B, then C | **3** (child-specific) | `…:student:{id}:boarded` |
| School arrived (only if valid later) | **1** | `transport:{tripId}:school_arrived:parent` |

**Anti-expectations**

- Not 3× trip-started for one parent.
- Not STOP_NEXT for S2 merely because GPS is within 100 m of S2 before S1 arrival.
- Not SCHOOL_ARRIVED on trip start while parked at school with no boarding.

## Commands (prepare; do not invent results)

```bash
# 1) Identity
node qa-artifacts/staging-meta-probe.mjs
# Expect: staging_url_ref=yveadybpntziyryxsrsu, staging_ref_on_denylist=false

# 2) Contract (no network)
cd backend && npx vitest run src/domains/transport/stop-next.contract.test.ts

# 3) Waterfall (static)
node qa-artifacts/transport-start-end-waterfall-probe.mjs

# 4) Device checklist
# Follow qa-artifacts/transport-device-acceptance-checklist.md
```

## Live staging API (optional, gated)

Only with operator approval and synthetic accounts:

```bash
# Example shape — fill tokens from staging smoke users, never paste into git
# LUMENX_ENV=staging node --env-file=backend/.env.staging <staging-transport-acceptance.mjs>
```

Do **not** enable FCM to real parent phones outside the staging synthetic parent device.
