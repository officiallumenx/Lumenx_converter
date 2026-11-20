-- PROPOSED / operator notes — do not apply without explicit approval.
-- Do NOT copy into supabase/migrations/ until approved for a target environment.
-- Intended eventual migration name (when approved):
--   supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
--
-- Staging project only for first apply: yveadybpntziyryxsrsu
-- Denylist: kmpzflsurepjwqnfqyld (never apply here without a separate production change request)
--
-- Problem:
--   Phase 9 policy vehicle_location_select_scoped (20261006020000) authorizes guardians via:
--     EXISTS (transport_trip tt JOIN transport_enrollment te …)
--   Under Postgres RLS, those joins run as the invoking role. Parents have GRANT SELECT on
--   transport_trip but transport_trip_select_scoped allows only staff / platform / driver.
--   The trip join therefore returns zero rows for parents → guardian GPS SELECT is always false
--   → Supabase Realtime postgres_changes (RLS-filtered) never delivers vehicle_location events.
--   Parent live GPS via Hono still works because the API uses service_role and app-level
--   guardian checks (getLearnerTransportLiveForActor).
--
-- Fix (narrow; revised after security review):
--   Introduce SECURITY DEFINER helper can_learner_read_vehicle_location(institute_id, trip_id)
--   that re-evaluates trip-route + guardian/student authorization while bypassing invoker RLS
--   on transport_trip / transport_enrollment, AND aligns with live GPS API rules:
--     - public.is_institute_member(institute)  (parity with assertInstituteAccess)
--     - te.approval_status IN ('pending', 'approved')  (findActiveTripForStudent)
--     - tt.finalized = false AND tt.phase <> 'completed' AND tt.deleted_at IS NULL
--   Replace only the guardian/student branch of vehicle_location_select_scoped.
--   Do not widen to institute-wide GPS (pre-phase9).
--   Do not grant parents SELECT on transport_trip. Do not change write paths.
--   Do not change staff / platform / assigned-driver SELECT branches.
--
-- Schema facts (verified from migrations):
--   transport_enrollment.approval_status CHECK IN ('pending','approved','rejected')
--     — 20260827215000_transport_approval_realtime.sql
--   transport_trip.phase CHECK IN ('ready','starting','running','boarding','dropping','completed')
--     — 20260827221000_transport_ops.sql
--   transport_trip.finalized boolean NOT NULL DEFAULT false
--   No 'cancelled' trip phase exists.
--
-- Ownership (mandatory):
--   This migration MUST run as the privileged Supabase migrator role (postgres / supabase_admin
--   / equivalent). SECURITY DEFINER functions inherit the owner. Post-apply validation MUST fail
--   if the function owner is authenticated, anon, or another untrusted role (see companion .md).
--
-- Preconditions:
--   - Phase 9 migration already applied on the target DB.
--   - Helpers exist: is_own_student_row, is_guardian_of_student, is_institute_member
--     (is_institute_member hardened in 20260908160000_auth_identity_security_hardening.sql).
--   - vehicle_location remains in publication supabase_realtime (transport_ops).
--   - Authenticated retains GRANT SELECT on vehicle_location; anon remains revoked.
--
-- Rollback:
--   Re-apply the phase9 vehicle_location_select_scoped body (see companion .md), then
--   DROP FUNCTION IF EXISTS public.can_learner_read_vehicle_location(uuid, uuid);

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
