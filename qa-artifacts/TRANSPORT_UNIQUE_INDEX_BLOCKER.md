# Transport unique-index migration blocker (2026-10-11)

**Migration:** `20261009180000_transport_trip_vehicle_date_slot_unique.sql`  
**Project:** `kmpzflsurepjwqnfqyld`  
**Status:** **NOT applied** — 3 live duplicate vehicle/date/slot groups

## Residual recovery risk

Supabase Free: `pitr_enabled=false`, `backups=[]`. No claimed backup exists.

## Duplicate groups (no student PII)

All six trips are `phase=completed`, `finalized=true`, same vehicle prefix `6058e78e…`, slot `morning`:

| trip_date  | keep (newer created_at) | soft-delete candidate (older) |
|------------|-------------------------|-------------------------------|
| 2026-09-19 | `4e2a391a…`             | `b4956ac7…`                   |
| 2026-10-08 | `61ab1956…`             | `f14d8a24…`                   |
| 2026-10-10 | `899cbe9f…`             | `959266bb…`                   |

## Smallest safe remediation (requires explicit approval)

Soft-delete the older trip in each pair (`deleted_at = now()`). Do **not** hard-delete. Then:

```bash
npx supabase db push --linked --dry-run   # should list only 20261009180000
npx supabase db push --linked --yes
```

Do not auto-merge or rewrite attendance history without review.
