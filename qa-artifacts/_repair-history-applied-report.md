# Staging history repair — `20261020160000` guardian GPS RLS

**Date:** 2026-10-20  
**Project:** `yveadybpntziyryxsrsu` only  
**Operation:** history-only `migration repair --status applied`  
**Not done:** DDL, `db push`, production denylist access, commit/push/deploy

## Preflight

| Check | Result |
|-------|--------|
| Identity | `staging_rt_count=1`, `e2e_count=2` |
| Version present before | **No** (empty) |
| Tip before | `20261016150000` |
| Function owner / DEFINER / search_path | `postgres` / true / `{search_path=public}` |
| Predicates | membership, approval, active-trip filters present |
| Policy | uses `can_learner_read_vehicle_location` |
| Grants | authenticated, service_role, postgres — **no anon** |
| Publication | `supabase_realtime.vehicle_location` |
| Local SQL vs proposal DDL core | match; `REVOKE … FROM anon` present |

## Command

```bash
npx supabase migration repair \
  --status applied \
  --linked \
  --project-ref yveadybpntziyryxsrsu \
  20261020160000
```

**Result (exit 0):** `Repaired migration history: [20261020160000] => applied`

## After

| Check | Result |
|-------|--------|
| History row | `20261020160000` / `transport_vehicle_location_guardian_realtime_rls` |
| Tip | `20261020160000` |
| Function / grants / policy / publication | Unchanged vs preflight (still correct) |

## Safety

- No schema DDL/DML  
- No production/shared project (`kmpzflsurepjwqnfqyld`) as repair target  
- No commit / push / deploy  
