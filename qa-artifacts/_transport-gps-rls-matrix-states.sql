-- Staging-only: drive denial states for matrix trip, then soft-delete.
-- Trip: fd7c0298-e330-4f84-8027-3f8edb37f870
-- Parent user: 164040ff-4b2e-4a91-90de-e536edb40456
-- Institute: 32e6db7a-e8c5-4b42-984d-a70c653d10a2

-- Ensure active + location exists
UPDATE public.transport_trip
SET phase = 'running', finalized = false, completed_at = NULL, deleted_at = NULL
WHERE id = 'fd7c0298-e330-4f84-8027-3f8edb37f870';

INSERT INTO public.vehicle_location (
  institute_id, trip_id, vehicle_id, driver_id, latitude, longitude, accuracy_m
) VALUES (
  '32e6db7a-e8c5-4b42-984d-a70c653d10a2',
  'fd7c0298-e330-4f84-8027-3f8edb37f870',
  'd3b3706a-0a08-4e14-97b6-fc5ab15eef37',
  '4b533f2c-2791-4a8d-9b98-681326506f39',
  17.3875, 78.4885, 4
);

SELECT 'active' AS state, phase, finalized, deleted_at IS NULL AS not_deleted
FROM public.transport_trip
WHERE id = 'fd7c0298-e330-4f84-8027-3f8edb37f870';
