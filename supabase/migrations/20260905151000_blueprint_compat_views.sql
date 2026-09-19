-- =============================================================================
-- LumenX Migration — Blueprint compatibility alias views
-- Version: 20260905151000
--
-- Views (5):
--   diary_submission   → diary_day (+ diary_day_row summary)
--   role_permission    → institute_access_role_permission
--   trip               → transport_trip
--   boarding_event     → transport_boarding_event
--   emergency          → transport_emergency
--
-- These are READ-ONLY blueprint-compat aliases so blueprint names resolve.
-- Writes must go through the underlying tables via Hono service_role.
-- =============================================================================

-- 1. diary_submission — blueprint alias for diary_day
CREATE OR REPLACE VIEW public.diary_submission AS
SELECT
  dd.id,
  dd.institute_id,
  dd.academic_year_id,
  dd.teacher_id,
  dd.diary_date,
  dd.scope,
  dd.submitted_at,
  dd.created_at,
  dd.updated_at,
  dd.deleted_at,
  (
    SELECT count(*)::integer
    FROM public.diary_day_row ddr
    WHERE ddr.diary_day_id = dd.id
      AND ddr.deleted_at IS NULL
  ) AS row_count
FROM public.diary_day dd;

COMMENT ON VIEW public.diary_submission IS 'Blueprint-compat alias: diary_submission → diary_day. Read-only.';

REVOKE ALL ON public.diary_submission FROM anon, authenticated;
GRANT SELECT ON public.diary_submission TO authenticated;
GRANT SELECT ON public.diary_submission TO service_role;

-- 2. role_permission — blueprint alias for institute_access_role_permission
CREATE OR REPLACE VIEW public.role_permission AS
SELECT
  p.access_role_id,
  r.institute_id,
  r.name        AS role_name,
  p.module_route,
  p.permission
FROM public.institute_access_role_permission p
JOIN public.institute_access_role r ON r.id = p.access_role_id;

COMMENT ON VIEW public.role_permission IS 'Blueprint-compat alias: role_permission → institute_access_role_permission. Read-only.';

REVOKE ALL ON public.role_permission FROM anon, authenticated;
GRANT SELECT ON public.role_permission TO authenticated;
GRANT SELECT ON public.role_permission TO service_role;

-- 3. trip — blueprint alias for transport_trip
CREATE OR REPLACE VIEW public.trip AS
SELECT
  id,
  institute_id,
  route_id,
  vehicle_id,
  driver_id,
  slot,
  trip_date,
  phase,
  started_at,
  completed_at,
  current_stop_id,
  current_stop_index,
  finalized,
  created_at,
  updated_at,
  deleted_at
FROM public.transport_trip;

COMMENT ON VIEW public.trip IS 'Blueprint-compat alias: trip → transport_trip. Read-only.';

REVOKE ALL ON public.trip FROM anon, authenticated;
GRANT SELECT ON public.trip TO authenticated;
GRANT SELECT ON public.trip TO service_role;

-- 4. boarding_event — blueprint alias for transport_boarding_event
CREATE OR REPLACE VIEW public.boarding_event AS
SELECT
  id,
  institute_id,
  trip_id,
  student_id,
  stop_id,
  boarding_status,
  dropping_status,
  boarded_at,
  dropped_at,
  finalized,
  created_at,
  updated_at
FROM public.transport_boarding_event;

COMMENT ON VIEW public.boarding_event IS 'Blueprint-compat alias: boarding_event → transport_boarding_event. Read-only.';

REVOKE ALL ON public.boarding_event FROM anon, authenticated;
GRANT SELECT ON public.boarding_event TO authenticated;
GRANT SELECT ON public.boarding_event TO service_role;

-- 5. emergency — blueprint alias for transport_emergency
CREATE OR REPLACE VIEW public.emergency AS
SELECT
  id,
  institute_id,
  trip_id,
  driver_id,
  vehicle_id,
  emergency_type,
  status,
  latitude,
  longitude,
  note,
  acknowledged_at,
  acknowledged_by_user_id,
  resolved_at,
  resolved_by_user_id,
  resolve_note,
  timeline,
  created_at,
  updated_at,
  deleted_at
FROM public.transport_emergency;

COMMENT ON VIEW public.emergency IS 'Blueprint-compat alias: emergency → transport_emergency. Read-only.';

REVOKE ALL ON public.emergency FROM anon, authenticated;
GRANT SELECT ON public.emergency TO authenticated;
GRANT SELECT ON public.emergency TO service_role;
