# Transport unique-index migration — RESOLVED (2026-10-11)

**Migration:** `20261009180000_transport_trip_vehicle_date_slot_unique.sql`  
**Project:** `kmpzflsurepjwqnfqyld`  
**Status:** **Applied** (`schema_migrations` + index `transport_trip_vehicle_date_slot_live_uidx` present)

## Resolution

Soft-deleted 3 redundant live trips after relationship evidence (boarding / GPS counts). Canonical trips kept live. See `TRANSPORT_DUP_RESOLUTION.md`.

| Metric | Value |
|--------|-------|
| Live duplicate groups after cleanup | 0 |
| Soft-deleted redundant trips | 3 |
| Canonical trips still live | 3 |

## Residual recovery risk

Supabase Free: `pitr_enabled=false`, `backups=[]`. No claimed backup exists.
