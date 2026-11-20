-- Transport: common-location next-trip deferral + immutable trip participant snapshots.
-- Non-destructive: keeps pickup_stop_id / drop_stop_id; dual-write is an application concern.
--
-- Depends on (already applied in production lineage):
--   public.transport_enrollment, public.driver, public.route, public.transport_trip
--   RLS helpers: is_staff_of_institute, is_platform_operator, has_institute_role,
--                is_own_student_row, is_guardian_of_student
-- Writes remain Hono service_role (bypasses RLS). Authenticated policies are SELECT-only.

-- Deferred location (promote onto live columns at next trip start).
ALTER TABLE public.transport_enrollment
  ADD COLUMN IF NOT EXISTS next_pickup_stop_id uuid NULL,
  ADD COLUMN IF NOT EXISTS next_drop_stop_id uuid NULL,
  ADD COLUMN IF NOT EXISTS next_stops_pending_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS location_changed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS location_changed_by_driver_id uuid NULL REFERENCES public.driver (id);

COMMENT ON COLUMN public.transport_enrollment.next_pickup_stop_id IS
  'Pending common/pickup stop applied at next trip start; null when live.';
COMMENT ON COLUMN public.transport_enrollment.next_drop_stop_id IS
  'Pending common/drop stop applied at next trip start; mirrors next_pickup for common location.';
COMMENT ON COLUMN public.transport_enrollment.next_stops_pending_at IS
  'When the driver queued a next-trip location change.';

CREATE INDEX IF NOT EXISTS transport_enrollment_next_stops_pending_idx
  ON public.transport_enrollment (institute_id, route_id)
  WHERE next_stops_pending_at IS NOT NULL AND deleted_at IS NULL;

-- Immutable per-trip student↔stop snapshot (freezes active trip from live enrollment churn).
CREATE TABLE IF NOT EXISTS public.transport_trip_participant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  trip_id uuid NOT NULL REFERENCES public.transport_trip (id),
  student_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.transport_enrollment (id),
  pickup_stop_id uuid NULL,
  drop_stop_id uuid NULL,
  not_riding boolean NOT NULL DEFAULT false,
  exception_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id)
);

CREATE INDEX IF NOT EXISTS transport_trip_participant_trip_idx
  ON public.transport_trip_participant (trip_id);

CREATE INDEX IF NOT EXISTS transport_trip_participant_institute_idx
  ON public.transport_trip_participant (institute_id);

COMMENT ON TABLE public.transport_trip_participant IS
  'Immutable student-stop assignment captured at trip start. Live enrollment changes do not mutate these rows.';

ALTER TABLE public.transport_trip_participant ENABLE ROW LEVEL SECURITY;

-- Soft history for Admin visibility of driver location changes (not an approval queue).
CREATE TABLE IF NOT EXISTS public.transport_enrollment_location_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  enrollment_id uuid NOT NULL REFERENCES public.transport_enrollment (id),
  student_id uuid NOT NULL,
  route_id uuid NOT NULL REFERENCES public.route (id),
  previous_pickup_stop_id uuid NULL,
  previous_drop_stop_id uuid NULL,
  new_stop_id uuid NOT NULL,
  changed_by_driver_id uuid NULL REFERENCES public.driver (id),
  changed_by_user_id uuid NULL,
  effective_mode text NOT NULL DEFAULT 'next_trip',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transport_enrollment_location_change_institute_idx
  ON public.transport_enrollment_location_change (institute_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transport_enrollment_location_change_enrollment_idx
  ON public.transport_enrollment_location_change (enrollment_id, created_at DESC);

COMMENT ON TABLE public.transport_enrollment_location_change IS
  'Audit log of driver/common-location changes. effective_mode: immediate | next_trip.';

ALTER TABLE public.transport_enrollment_location_change ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Privileges (mirror transport_daily_exception / transport_ops_rls)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.transport_trip_participant FROM anon, authenticated;
REVOKE ALL ON TABLE public.transport_enrollment_location_change FROM anon, authenticated;

GRANT SELECT ON TABLE public.transport_trip_participant TO authenticated;
GRANT SELECT ON TABLE public.transport_enrollment_location_change TO authenticated;

GRANT ALL ON TABLE public.transport_trip_participant TO service_role;
GRANT ALL ON TABLE public.transport_enrollment_location_change TO service_role;

-- -----------------------------------------------------------------------------
-- Authenticated SELECT policies — reuse existing SECURITY DEFINER helpers only.
-- No INSERT/UPDATE/DELETE policies for authenticated (writes via service_role).
-- -----------------------------------------------------------------------------

-- Trip participants: same audience as boarding events (staff / platform / learner /
-- guardian / driver of that trip only — not every institute driver).
DROP POLICY IF EXISTS transport_trip_participant_select_scoped
  ON public.transport_trip_participant;
CREATE POLICY transport_trip_participant_select_scoped
  ON public.transport_trip_participant
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR public.is_own_student_row(student_id)
    OR public.is_guardian_of_student(student_id)
    OR (
      public.has_institute_role(institute_id, 'driver')
      AND EXISTS (
        SELECT 1
        FROM public.transport_trip tt
        JOIN public.driver d
          ON d.id = tt.driver_id
         AND d.institute_id = tt.institute_id
         AND d.deleted_at IS NULL
         AND d.user_profile_id = auth.uid()
        WHERE tt.id = transport_trip_participant.trip_id
          AND tt.institute_id = transport_trip_participant.institute_id
          AND tt.deleted_at IS NULL
      )
    )
  );

COMMENT ON POLICY transport_trip_participant_select_scoped
  ON public.transport_trip_participant IS
  'SELECT: staff, platform, own student/guardian, or assigned trip driver. Writes via service_role.';

-- Location-change audit: institute staff / platform / drivers; learner/guardian only
-- for their own student_id (no cross-student leak).
DROP POLICY IF EXISTS transport_enrollment_location_change_select_scoped
  ON public.transport_enrollment_location_change;
CREATE POLICY transport_enrollment_location_change_select_scoped
  ON public.transport_enrollment_location_change
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR public.has_institute_role(institute_id, 'driver')
    OR public.is_own_student_row(student_id)
    OR public.is_guardian_of_student(student_id)
  );

COMMENT ON POLICY transport_enrollment_location_change_select_scoped
  ON public.transport_enrollment_location_change IS
  'SELECT: staff, platform, institute drivers, or own student/guardian. Writes via service_role.';
