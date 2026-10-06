-- Phase 9: tighten transport ops RLS (defense-in-depth).
-- Writes remain service_role / Hono only. Authenticated SELECT is narrowed:
--   - trips / emergencies / boarding: drivers see only their own trip rows
--   - vehicle_location: guardians only see GPS for their child's trip route
-- Does not weaken existing staff / platform policies.

-- -----------------------------------------------------------------------------
-- transport_trip: drivers scoped to own trips
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS transport_trip_select_scoped ON public.transport_trip;
CREATE POLICY transport_trip_select_scoped
  ON public.transport_trip FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.has_institute_role(institute_id, 'driver')
        AND EXISTS (
          SELECT 1
          FROM public.driver d
          WHERE d.id = transport_trip.driver_id
            AND d.institute_id = transport_trip.institute_id
            AND d.deleted_at IS NULL
            AND d.user_profile_id = auth.uid()
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- transport_boarding_event: staff / own student / guardian / trip driver
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS transport_boarding_event_select_scoped ON public.transport_boarding_event;
CREATE POLICY transport_boarding_event_select_scoped
  ON public.transport_boarding_event FOR SELECT TO authenticated
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
        WHERE tt.id = transport_boarding_event.trip_id
          AND tt.deleted_at IS NULL
      )
    )
  );

-- -----------------------------------------------------------------------------
-- transport_emergency: drivers scoped to own emergencies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS transport_emergency_select_scoped ON public.transport_emergency;
CREATE POLICY transport_emergency_select_scoped
  ON public.transport_emergency FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.has_institute_role(institute_id, 'driver')
        AND EXISTS (
          SELECT 1
          FROM public.driver d
          WHERE d.id = transport_emergency.driver_id
            AND d.institute_id = transport_emergency.institute_id
            AND d.deleted_at IS NULL
            AND d.user_profile_id = auth.uid()
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- vehicle_location: staff / platform / assigned driver / child's trip route only
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
    OR EXISTS (
      SELECT 1
      FROM public.transport_trip tt
      JOIN public.transport_enrollment te
        ON te.institute_id = tt.institute_id
       AND te.route_id = tt.route_id
       AND te.deleted_at IS NULL
       AND te.status = 'active'
      WHERE tt.id = vehicle_location.trip_id
        AND tt.deleted_at IS NULL
        AND tt.institute_id = vehicle_location.institute_id
        AND (
          public.is_own_student_row(te.student_id)
          OR public.is_guardian_of_student(te.student_id)
        )
    )
  );

COMMENT ON POLICY vehicle_location_select_scoped ON public.vehicle_location IS
  'Phase 9: GPS readable by staff, assigned driver, or guardian/student on the trip route only.';
