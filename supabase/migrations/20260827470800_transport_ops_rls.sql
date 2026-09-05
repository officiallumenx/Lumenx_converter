-- Transport ops RLS + privileges (closes gap from 20260827221000_transport_ops).
-- Version: 20260827470800
-- Pattern matches transport_foundation: authenticated SELECT only; service_role ALL.
-- Hono/service_role remains authoritative for writes.

-- -----------------------------------------------------------------------------
-- updated_at triggers (ops tables created without them)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS transport_trip_set_updated_at ON public.transport_trip;
CREATE TRIGGER transport_trip_set_updated_at
  BEFORE UPDATE ON public.transport_trip
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transport_boarding_event_set_updated_at ON public.transport_boarding_event;
CREATE TRIGGER transport_boarding_event_set_updated_at
  BEFORE UPDATE ON public.transport_boarding_event
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transport_emergency_set_updated_at ON public.transport_emergency;
CREATE TRIGGER transport_emergency_set_updated_at
  BEFORE UPDATE ON public.transport_emergency
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.transport_trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_boarding_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_location ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transport_trip_select_scoped ON public.transport_trip;
CREATE POLICY transport_trip_select_scoped
  ON public.transport_trip FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

DROP POLICY IF EXISTS transport_boarding_event_select_scoped ON public.transport_boarding_event;
CREATE POLICY transport_boarding_event_select_scoped
  ON public.transport_boarding_event FOR SELECT TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR public.has_institute_role(institute_id, 'driver')
    OR public.is_own_student_row(student_id)
    OR public.is_guardian_of_student(student_id)
  );

DROP POLICY IF EXISTS transport_emergency_select_scoped ON public.transport_emergency;
CREATE POLICY transport_emergency_select_scoped
  ON public.transport_emergency FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

DROP POLICY IF EXISTS vehicle_location_select_scoped ON public.vehicle_location;
CREATE POLICY vehicle_location_select_scoped
  ON public.vehicle_location FOR SELECT TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR public.has_institute_role(institute_id, 'driver')
    OR EXISTS (
      SELECT 1
      FROM public.transport_enrollment te
      WHERE te.institute_id = vehicle_location.institute_id
        AND te.deleted_at IS NULL
        AND te.status = 'active'
        AND (
          public.is_own_student_row(te.student_id)
          OR public.is_guardian_of_student(te.student_id)
        )
    )
  );

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.transport_trip FROM anon, authenticated;
REVOKE ALL ON TABLE public.transport_boarding_event FROM anon, authenticated;
REVOKE ALL ON TABLE public.transport_emergency FROM anon, authenticated;
REVOKE ALL ON TABLE public.vehicle_location FROM anon, authenticated;

GRANT SELECT ON TABLE public.transport_trip TO authenticated;
GRANT SELECT ON TABLE public.transport_boarding_event TO authenticated;
GRANT SELECT ON TABLE public.transport_emergency TO authenticated;
GRANT SELECT ON TABLE public.vehicle_location TO authenticated;

GRANT ALL ON TABLE public.transport_trip TO service_role;
GRANT ALL ON TABLE public.transport_boarding_event TO service_role;
GRANT ALL ON TABLE public.transport_emergency TO service_role;
GRANT ALL ON TABLE public.vehicle_location TO service_role;

COMMENT ON TABLE public.transport_trip IS
  'Live transport trip sessions. Writes via Hono service_role; authenticated SELECT scoped.';
COMMENT ON TABLE public.transport_boarding_event IS
  'Per-student boarding/dropping marks for a trip. Writes via Hono; SELECT for staff/driver/own/guardian.';
COMMENT ON TABLE public.transport_emergency IS
  'Driver emergency SOS records. Writes via Hono; SELECT for staff/driver/platform.';
COMMENT ON TABLE public.vehicle_location IS
  'GPS pings for active trips. Writes via Hono; SELECT for staff/driver/enrolled learner guardians.';
