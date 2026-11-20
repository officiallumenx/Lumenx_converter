-- REVIEWED PROPOSAL BODY (archive / source reference).
-- Active repo copy:
--   supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
-- Authorization semantics identical to:
--   docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql
-- including REVOKE EXECUTE FROM anon.
--
-- Staging: DDL already applied directly to yveadybpntziyryxsrsu outside
-- schema_migrations. Local migration file is for reproducibility; staging
-- still needs history-only repair (see
-- transport_vehicle_location_guardian_realtime_rls_migration_formalization.md).
-- Denylist: kmpzflsurepjwqnfqyld

-- -----------------------------------------------------------------------------
-- 1) Authorization helper (SECURITY DEFINER, fixed search_path)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_learner_read_vehicle_location(
  p_institute_id uuid,
  p_trip_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_institute_member(p_institute_id)
    AND EXISTS (
      SELECT 1
      FROM public.transport_trip tt
      JOIN public.transport_enrollment te
        ON te.institute_id = tt.institute_id
       AND te.route_id = tt.route_id
       AND te.deleted_at IS NULL
       AND te.status = 'active'
       AND te.approval_status IN ('pending', 'approved')
      WHERE tt.id = p_trip_id
        AND tt.deleted_at IS NULL
        AND tt.institute_id = p_institute_id
        AND tt.finalized = false
        AND tt.phase <> 'completed'
        AND (
          public.is_own_student_row(te.student_id)
          OR public.is_guardian_of_student(te.student_id)
        )
    );
$$;

COMMENT ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) IS
  'True when auth.uid() is an active institute member AND student/guardian of a student with active pending|approved enrollment on a non-completed, non-finalized, non-deleted trip route. SECURITY DEFINER bypasses invoker RLS on transport_trip for Realtime SELECT. Aligns with findActiveTripForStudent + assertInstituteAccess.';

REVOKE ALL ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) Replace vehicle_location SELECT policy (guardian branch only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS vehicle_location_select_scoped ON public.vehicle_location;
CREATE POLICY vehicle_location_select_scoped
  ON public.vehicle_location FOR SELECT TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR (
      public.has_institute_role(institute_id, 'driver')
      AND EXISTS (
        SELECT 1
        FROM public.driver d
        WHERE d.institute_id = vehicle_location.institute_id
          AND d.deleted_at IS NULL
          AND d.user_profile_id = auth.uid()
          AND (
            d.id = vehicle_location.driver_id
            OR d.assigned_vehicle_id = vehicle_location.vehicle_id
          )
      )
    )
    OR public.can_learner_read_vehicle_location(institute_id, trip_id)
  );

COMMENT ON POLICY vehicle_location_select_scoped ON public.vehicle_location IS
  'Staff / platform / assigned driver / active institute member who is learner-or-guardian on an active (non-completed) trip route (via can_learner_read_vehicle_location).';
