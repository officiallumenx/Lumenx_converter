# Transport duplicate resolution (authorized cleanup)

**Project:** `kmpzflsurepjwqnfqyld`  
**Business rule:** at most one non-deleted trip per `(vehicle_id, trip_date, slot)`.

## Classification

All three groups share the same vehicle, route, driver, `trip_date`, and `slot=morning`, with distinct `client_event_id` / start times — sequential restarts that violate the intended uniqueness rule, not legitimate concurrent morning trips.

Canonical trip = richest operational evidence (boarding events, then vehicle_location count). Soft-delete never hard-deletes dependents.

| trip_date  | KEEP (canonical)                         | Soft-delete (redundant)                    | Evidence |
|------------|------------------------------------------|--------------------------------------------|----------|
| 2026-09-19 | `4e2a391a-6584-45a2-b20a-afb5d6d71a8a`   | `b4956ac7-4149-4a76-b5eb-9608058f5866`     | keep: 1 boarding, 35 GPS; drop: 0/0 |
| 2026-10-08 | `61ab1956-b4b0-4b25-ad0c-76248a5a2039`   | `f14d8a24-6a86-4b67-80df-86694a9b8760`     | keep: 19 GPS; drop: 10 GPS; both 0 boarding |
| 2026-10-10 | `959266bb-13f0-4461-9567-d6cc1debede8`   | `899cbe9f-ed50-4865-a152-fc5a47a6a635`     | keep: 1 boarding, 12 GPS; drop: 0 boarding, 2 GPS |

## Intended mutation

```sql
UPDATE public.transport_trip
SET deleted_at = now(), updated_at = now()
WHERE id IN (
  'b4956ac7-4149-4a76-b5eb-9608058f5866',
  'f14d8a24-6a86-4b67-80df-86694a9b8760',
  '899cbe9f-ed50-4865-a152-fc5a47a6a635'
)
AND deleted_at IS NULL;
```

Then apply `20261009180000_transport_trip_vehicle_date_slot_unique.sql`.
