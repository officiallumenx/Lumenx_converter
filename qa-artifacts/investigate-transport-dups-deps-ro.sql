-- Dependent activity counts per duplicate trip (aggregates only)
WITH ids AS (
  SELECT unnest(ARRAY[
    'b4956ac7-4149-4a76-b5eb-9608058f5866'::uuid,
    '4e2a391a-6584-45a2-b20a-afb5d6d71a8a'::uuid,
    'f14d8a24-6a86-4b67-80df-86694a9b8760'::uuid,
    '61ab1956-b4b0-4b25-ad0c-76248a5a2039'::uuid,
    '959266bb-13f0-4461-9567-d6cc1debede8'::uuid,
    '899cbe9f-ed50-4865-a152-fc5a47a6a635'::uuid
  ]) AS trip_id
)
SELECT
  left(i.trip_id::text, 8) AS trip_prefix,
  i.trip_id::text AS trip_id,
  (SELECT COUNT(*) FROM public.boarding_event b WHERE b.trip_id = i.trip_id) AS boarding_event_n,
  (SELECT COUNT(*) FROM public.transport_boarding_event b WHERE b.trip_id = i.trip_id) AS transport_boarding_n,
  (SELECT COUNT(*) FROM public.vehicle_location v WHERE v.trip_id = i.trip_id) AS vehicle_location_n,
  (SELECT COUNT(*) FROM public.emergency e WHERE e.trip_id = i.trip_id) AS emergency_n,
  (SELECT COUNT(*) FROM public.transport_emergency e WHERE e.trip_id = i.trip_id) AS transport_emergency_n,
  (SELECT COUNT(*) FROM public.transport_ops_idempotency o WHERE o.trip_id = i.trip_id) AS ops_idempotency_n,
  EXTRACT(EPOCH FROM (t.completed_at - t.started_at))::bigint AS duration_sec
FROM ids i
JOIN public.transport_trip t ON t.id = i.trip_id
ORDER BY t.trip_date, t.created_at;
