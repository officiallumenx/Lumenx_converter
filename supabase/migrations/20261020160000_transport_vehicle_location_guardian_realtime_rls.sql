-- =============================================================================
-- LumenX Migration — Parent/learner vehicle_location Realtime RLS (guardian helper)
-- Version: 20261020160000
--
-- Reviewed proposal source (identical authorization semantics):
--   docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
--   docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql
-- Formalization / staging history notes:
--   docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md
--   qa-artifacts/_phase3-staging-rls-recon-report.md
--
-- Staging (yveadybpntziyryxsrsu): equivalent DDL was applied directly outside
-- schema_migrations. After this file lands in the repo, reconcile staging with
-- history-only `migration repair --status applied` (separate approval). Do not
-- re-apply DDL on staging while schema already matches.
-- Denylist: kmpzflsurepjwqnfqyld — separate production change request required.
--
-- Problem:
--   Phase 9 policy vehicle_location_select_scoped (20261006020000) authorizes
--   guardians via EXISTS (transport_trip JOIN …). Under invoker RLS, parents
--   cannot see transport_trip → guardian GPS SELECT is always false → Realtime
--   never delivers vehicle_location. Fix via SECURITY DEFINER helper aligned
--   with findActiveTripForStudent + assertInstituteAccess.
-- =============================================================================

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
