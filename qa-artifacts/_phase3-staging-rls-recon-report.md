# Phase 3 — Read-only staging GPS RLS reconciliation

**Date:** 2026-10-20  
**Project:** `yveadybpntziyryxsrsu` (verified)  
**Denylist:** `kmpzflsurepjwqnfqyld` (not queried for writes; CLI default link is denylist — all queries used `--linked --project-ref yveadybpntziyryxsrsu`)  
**Decision:** **B — Not recorded, schema already matches**

## Identity

| Check | Result |
|-------|--------|
| Soft institutes | `staging_rt_count=1`, `e2e_count=2` |
| Session | `current_database=postgres`, `current_user=postgres` |

Artifacts: `_phase3-identity.json`

## Migration history

| Check | Result |
|-------|--------|
| Tip | `20261016150000` / `document_number_uniqueness` |
| Phase9 | Present: `20261006020000` / `transport_phase9_rls_hardening` |
| Target `20261020160000` | **Absent** |
| Any `20261020*` / guardian realtime name | **Absent** |
| `migration list` local↔remote | Aligned through `20261016150000`; no local file for `20261020160000` yet |

`schema_migrations` columns: `version`, `statements`, `name` (no `inserted_at`).

## Schema comparison vs proposal

| Check | Staging | Match? |
|-------|---------|--------|
| Function exists | yes | yes |
| Owner | `postgres` | yes |
| SECURITY DEFINER | true | yes |
| `search_path` | `{search_path=public}` | yes |
| Predicates | `is_institute_member`, `approval_status IN ('pending','approved')`, `finalized=false`, `phase <> 'completed'` | yes |
| Policy guardian branch | `can_learner_read_vehicle_location(institute_id, trip_id)` only | yes |
| Bare `transport_trip` in policy | no | yes |
| EXECUTE grants | `authenticated`, `service_role`, `postgres` | yes |
| `anon` EXECUTE | **absent** | yes |
| Publication | `supabase_realtime.public.vehicle_location` | yes |

## Convergence

Proposed migration DDL is idempotent (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, explicit REVOKE/GRANT). Re-apply would converge, but **unnecessary** while schema already matches. Prefer history-only mark-applied after the file lands in `supabase/migrations/`.

## Follow-up status

| Step | Status |
|------|--------|
| Local migration file under `supabase/migrations/` | **Done** (separate local formalization pass) |
| Staging history mark-applied | **NOT executed** — still requires separate approval |

```bash
npx supabase migration repair --status applied --linked --project-ref yveadybpntziyryxsrsu 20261020160000
npx supabase migration list --linked --project-ref yveadybpntziyryxsrsu
# Expect local+remote both show 20261020160000
```

Then re-run owner/grant/policy SELECTs (read-only). Do **not** re-apply DDL while schema matches.

## Safety (Phase 3 recon + later local formalization)

- Phase 3: No DDL/DML, no repair, no push.
- Local formalization: migration file + source tests only; no DB writes / repair / push / commit.
- Production denylist not used as query target for this reconciliation.
