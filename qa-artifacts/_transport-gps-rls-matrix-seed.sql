-- Staging-only synthetic matrix trip seed (lx-staging-transport-rt)
INSERT INTO public.transport_trip (
  institute_id, route_id, vehicle_id, driver_id, slot, phase, finalized, trip_date
) VALUES (
  '32e6db7a-e8c5-4b42-984d-a70c653d10a2',
  'a559cfdc-6df3-40e3-af86-1eb244cd6bbf',
  'd3b3706a-0a08-4e14-97b6-fc5ab15eef37',
  '4b533f2c-2791-4a8d-9b98-681326506f39',
  'evening',
  'running',
  false,
  CURRENT_DATE
)
RETURNING id;
