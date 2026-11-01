# Transport Location Management — Pre-Deployment Safety Review

**Date:** 2026-11-01  
**Updated:** 2026-11-01 (staging migration + live RLS verification)  
**Constraint:** No production migration, no production deploy.

---

## Final decision (this pass)

# STAGING VERIFIED — READY FOR PRODUCTION REVIEW

Staging success **does not** authorize production deployment. Production remains a separate, explicitly approved change.

| Gate | Status |
|------|--------|
| Staging identity positively confirmed | **PASS** |
| Required RLS helpers present on staging | **PASS** |
| Migration applied on staging only | **PASS** |
| Schema / indexes / policies / grants | **PASS** |
| Live JWT policy matrix | **PASS (30/30)** |
| Data integrity (legacy, next_*, snapshot, promote, audit) | **PASS** |
| Production migration / deploy | **NOT DONE — still requires separate authorization** |

---

## Staging project identity

| Check | Value |
|-------|--------|
| Project name | `lumenx-staging` |
| Project ref | `yveadybpntziyryxsrsu` |
| URL ref | `yveadybpntziyryxsrsu` (matches `STAGING_SUPABASE_PROJECT_REF`) |
| `LUMENX_ENV` | `staging` |
| `STAGING_CONFIRMED` | `I_CONFIRM_THIS_IS_NON_PRODUCTION` |
| Production denylist | `kmpzflsurepjwqnfqyld` (`LumenX`) — **not targeted** |
| Soft institute markers | 3 (`E2E` / Staging Transport RT) |
| Session during apply | `current_database=postgres`, migrator role via linked Management API |

CLI: `npx supabase … --linked --project-ref yveadybpntziyryxsrsu`  
`assertStagingEnv` passed before probes. Secrets were not printed.

---

## Original blocker (historical)

Policies previously referenced non-existent helpers:

- `is_platform_admin()`
- `has_institute_membership()`

and omitted `GRANT`/`REVOKE`. Fixed in-repo before this staging pass.

---

## Preflight (before apply)

| Check | Result |
|-------|--------|
| Helpers present (`is_staff_of_institute`, `is_platform_operator`, `has_institute_role`, `is_own_student_row`, `is_guardian_of_student`) | **5** |
| Bad helpers (`is_platform_admin`, `has_institute_membership`) | **0** |
| Remote tip before apply | `20261023180000` |
| Local pending | `20261101140000` only |
| `transport_trip_participant` / location_change tables | absent |
| Live enrollments | 3 |
| Conflicting pickup≠drop | 3 |
| Boarding events | 48 |
| Active trips | 0 |

### Backup / recovery point

| Item | Result |
|------|--------|
| `supabase backups list --project-ref yveadybpntziyryxsrsu` | `walg_enabled=true`, `pitr_enabled=false`, **`backups=[]`** |
| Logical recovery baseline | Captured to `qa-artifacts/_staging-location-recovery-baseline.json` (all 3 enrollment stop pairs) |
| Risk acceptance | Proceeded because migration is **additive-only**; rollback = drop new objects/columns without rewriting historical pickup/drop |

Physical backup inventory was empty; logical enrollment baseline + additive rollback path used as the recovery point for this staging apply.

---

## Migration execution (staging only)

```text
npx supabase db push --linked --project-ref yveadybpntziyryxsrsu --yes
→ Applying migration 20261101140000_transport_location_snapshot.sql...
→ Finished supabase db push.
```

| Check | Result |
|-------|--------|
| Apply errors | **None** |
| Remote tip after | `20261101140000` |
| Migration row present | **Yes** |

### Post-apply schema inspection

| Object | Result |
|--------|--------|
| `transport_trip_participant` | created; RLS **on** |
| `transport_enrollment_location_change` | created; RLS **on** |
| Enrollment `next_*` / location audit columns | **5** new nullable columns |
| Indexes | participant trip/institute/unique; location_change institute/enrollment; `transport_enrollment_next_stops_pending_idx` |
| Policies | SELECT-only `TO authenticated` for both tables (expected names) |
| Grants | `authenticated`: **SELECT only**; `service_role`: INSERT/SELECT/UPDATE/DELETE/…; `anon`: **no table grants** |
| Pickup/drop values vs baseline | **3/3 unchanged** |
| Conflicts still present | **3** (not silently overwritten) |

---

## Live JWT test matrix

Artifact: `qa-artifacts/_staging-location-rls-matrix.mjs`  
Result JSON: `qa-artifacts/_staging-location-rls-matrix-result.json`  
Command: `node --env-file=backend/.env.staging qa-artifacts/_staging-location-rls-matrix.mjs`  

Temporary fixtures (trip, participant, location_change, unassigned same-institute driver) were seeded and cleaned up.

| Actor | Trip participant | Location-change audit | Write attempt |
|-------|------------------|-----------------------|---------------|
| Platform operator | visible | visible | — |
| Institute staff (RT admin membership) | visible | visible | denied (`permission denied` — no INSERT grant) |
| Assigned trip driver | visible | visible | denied |
| Unassigned same-institute driver | **hidden** | visible (institute driver role) | — |
| Driver from other institute | hidden | hidden | — |
| Own student | visible | visible | — |
| Guardian of student | visible | visible | — |
| Unrelated guardian | hidden | hidden | — |
| Anon (no JWT) | denied | — | — |
| Service role | select OK | audit row OK | intended writer |

**Assigned-driver-only participant access:** confirmed (unassigned same-institute driver cannot read participant row).  
**Institute isolation:** other-institute driver cannot read RT participant or location-change rows.  
**Authenticated writes:** rejected at privilege layer (SELECT-only grants) — stronger than RLS-only denial.  
**RLS not disabled; no permissive policies introduced.**

Score: **30 passed / 0 failed**.

---

## Data integrity results

| Test | Result |
|------|--------|
| Legacy pickup/drop preserved after migration | **PASS** (baseline match) |
| Conflicting legacy locations retained | **PASS** (3 conflicts) |
| Deferred `next_*` does not mutate live pickup/drop | **PASS** |
| Active trip snapshot immutable while `next_*` queued | **PASS** |
| Promote dual-writes common location + clears `next_*` | **PASS** |
| Snapshot survives promote (active freeze) | **PASS** |
| Location-change audit row (`effective_mode=next_trip`) | **PASS** |
| Enrollment restored to baseline conflict after probe | **PASS** |

---

## Failures

None in the staging matrix (30/30).

---

## Unresolved risks (do not block staging verification)

1. **Physical backups empty / PITR off** on staging project — production apply should confirm PITR or a named backup first.  
2. **Legacy conflict reporting** still not a product UI; inventory remains manual SQL.  
3. **Snapshot immutability** remains application convention (service_role can still UPDATE participant rows).  
4. **Trip-start promote/snapshot soft-catch** in API still swallows errors (app behavior; unchanged).  
5. Temporary staging membership for `smoke.tenant.a` on RT institute may remain (idempotent ensure); unassigned driver auth user may remain without driver row.  
6. Production schema/history may differ from staging tip — production CR must re-check helpers, tip, and denylist before apply.

---

## Production readiness (explicit)

| Action | Allowed now? |
|--------|----------------|
| Staging migration (done) | Yes — completed |
| Staging JWT/integrity verification (done) | Yes — completed |
| Production migration | **No — requires separate authorization + backup/PITR confirmation** |
| Production API/app deploy | **No** |

Recommended production order after approval: confirm backup/PITR → apply same migration on production ref only → deploy API → Transport → Admin → Connect → smoke.

---

## Artifacts

- `supabase/migrations/20261101140000_transport_location_snapshot.sql` (fixed helpers + grants)
- `qa-artifacts/_staging-location-preflight.sql`
- `qa-artifacts/_staging-location-recovery-baseline.json`
- `qa-artifacts/_staging-location-rls-matrix.mjs`
- `qa-artifacts/_staging-location-rls-matrix-result.json`
- `backend/.../transport-rls-policies.test.ts` (static)

Backend transport unit tests previously: **122 passed** (not re-run as part of this staging DB pass; no app source changes).
