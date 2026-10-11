-- READ-ONLY: duplicate live trips — ids/status only, no student PII
SELECT
  left(t.vehicle_id::text, 8) AS vehicle_prefix,
  t.trip_date::text AS trip_date,
  t.slot::text AS slot,
  left(t.id::text, 8) AS trip_prefix,
  t.status::text AS status,
  (t.started_at IS NOT NULL) AS has_started,
  (t.completed_at IS NOT NULL OR t.finalized_at IS NOT NULL) AS has_completed_or_finalized,
  t.created_at::text AS created_at
FROM public.transport_trip t
WHERE t.deleted_at IS NULL
  AND (t.vehicle_id, t.trip_date, t.slot) IN (
    SELECT vehicle_id, trip_date, slot
    FROM public.transport_trip
    WHERE deleted_at IS NULL
    GROUP BY vehicle_id, trip_date, slot
    HAVING COUNT(*) > 1
  )
ORDER BY t.trip_date, t.slot, t.created_at;
