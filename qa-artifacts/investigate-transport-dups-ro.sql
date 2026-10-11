-- READ-ONLY investigation of live vehicle/date/slot duplicates.
-- No student PII. Compare structural fields + dependent row counts.

WITH dups AS (
  SELECT vehicle_id, trip_date, slot
  FROM public.transport_trip
  WHERE deleted_at IS NULL
  GROUP BY vehicle_id, trip_date, slot
  HAVING COUNT(*) > 1
),
trips AS (
  SELECT t.*
  FROM public.transport_trip t
  JOIN dups d ON d.vehicle_id = t.vehicle_id AND d.trip_date = t.trip_date AND d.slot = t.slot
  WHERE t.deleted_at IS NULL
)
SELECT
  left(t.id::text, 8) AS trip_prefix,
  t.id::text AS trip_id,
  left(t.vehicle_id::text, 8) AS vehicle_prefix,
  t.trip_date::text AS trip_date,
  t.slot::text AS slot,
  left(t.route_id::text, 8) AS route_prefix,
  left(COALESCE(t.driver_id::text, ''), 8) AS driver_prefix,
  t.phase::text AS phase,
  t.finalized,
  t.started_at::text AS started_at,
  t.completed_at::text AS completed_at,
  t.created_at::text AS created_at,
  t.updated_at::text AS updated_at,
  left(COALESCE(t.client_event_id::text, ''), 12) AS client_event_prefix,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='transport_attendance') AS has_attendance_table
FROM trips t
ORDER BY t.trip_date, t.slot, t.created_at;
