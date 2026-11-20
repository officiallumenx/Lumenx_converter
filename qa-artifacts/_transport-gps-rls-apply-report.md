# Staging apply report — guardian GPS realtime RLS

**Date:** 2026-10-20  
**Target:** `yveadybpntziyryxsrsu` only  
**Source:** `docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql` (revised)  
**Method:** `npx supabase db query --linked --project-ref yveadybpntziyryxsrsu -f …`  
**Not applied to:** `kmpzflsurepjwqnfqyld`  
**Not copied into:** `supabase/migrations/`

## Pre-change

- Staging institutes present (`lx-staging-transport-rt`, `LX-E2E-*`)
- `can_learner_read_vehicle_location` absent
- Peer helpers owned by `postgres`, `SECURITY DEFINER`
- Policy used bare `transport_trip` join (phase9)
- `vehicle_location` in `supabase_realtime`

## Post-change

| Check | Result |
|-------|--------|
| Function owner | `postgres` |
| SECURITY DEFINER | true |
| Predicates | `is_institute_member`, `approval_status`, `finalized`, `phase <> completed` |
| Policy uses helper | yes (no bare trip join) |
| Publication | `vehicle_location` present |
| EXECUTE grants | `authenticated`, `service_role`, `postgres` — **anon revoked** after apply (Supabase PUBLIC default had granted anon; explicit REVOKE applied; proposal SQL updated) |

## Live verification

### Probe (`e2e/staging/transport-realtime-probe.mjs`)

**30 PASS / 0 FAIL / 1 NOT RUN**

Critical:

- `vehicle_location_rls_parent: PASS` (parent SELECT rows=1)
- `realtime_location_event: PASS` (events=1)
- `reconnect_realtime: PASS` (locEvents=1)
- isolation / unauthorized board-location unchanged PASS

### Extended matrix (postgres state + parent JWT)

| Case | Result |
|------|--------|
| Active trip GPS SELECT + helper true | PASS |
| Completed/finalized trip GPS denied | PASS (`rpc=false`, rows=0) |
| Soft-deleted trip GPS denied | PASS |
| Membership soft-deleted (`deleted_at`) denied | PASS (`is_institute_member=false`) |
| Membership restored | PASS |
| Parent `transport_trip` SELECT | PASS (0 rows) |
| Isolation parent GPS | PASS (0 rows) |
| Anon GPS | PASS (0 rows) |

Note: membership status `inactive` is **invalid** (CHECK: `active|invited|suspended|ended`). Revocation tested via `deleted_at` soft-delete.

### Unit tests

`transport-rls-policies` + `approach`: **17 PASS**

## Verdict

**Parent GPS realtime is genuinely fixed on staging** — verified by parent JWT Postgres Changes event and SELECT, not by SQL apply alone.

Rollback not required (no failure criteria met).

## Safety

- No production apply  
- No commit / push / deploy  
- phase9 migration file and `learner-live.ts` unchanged  
- Unrelated working tree preserved  
