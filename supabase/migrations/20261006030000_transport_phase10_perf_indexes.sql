-- Phase 10: transport performance indexes from actual query patterns.
-- GPS approach / live: route enrollments, trip date, latest location.
-- Do not add speculative indexes.

-- Approach + roster: enrollments by institute + route (active live rows)
CREATE INDEX IF NOT EXISTS transport_enrollment_institute_route_live_idx
  ON public.transport_enrollment (institute_id, route_id)
  WHERE deleted_at IS NULL AND status = 'active';

-- History / trip lists by route
CREATE INDEX IF NOT EXISTS transport_trip_institute_route_created_idx
  ON public.transport_trip (institute_id, route_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Driver assignment lookups
CREATE INDEX IF NOT EXISTS driver_assigned_vehicle_live_idx
  ON public.driver (institute_id, assigned_vehicle_id)
  WHERE deleted_at IS NULL AND assigned_vehicle_id IS NOT NULL;

-- Institute-scoped location history / admin live
CREATE INDEX IF NOT EXISTS vehicle_location_institute_captured_idx
  ON public.vehicle_location (institute_id, captured_at DESC);

-- Boarding marks by institute + trip (analytics / day boards)
CREATE INDEX IF NOT EXISTS transport_boarding_event_institute_trip_idx
  ON public.transport_boarding_event (institute_id, trip_id);

-- Stop geometry load per route (approach cache miss)
CREATE INDEX IF NOT EXISTS stop_route_live_idx
  ON public.stop (route_id)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX transport_enrollment_institute_route_live_idx IS
  'Phase 10: GPS approach + route roster — route-scoped enrollment scans.';
COMMENT ON INDEX vehicle_location_institute_captured_idx IS
  'Phase 10: institute live GPS / history without full table scans.';
