-- =============================================================================
-- LumenX Migration 019 — Transport foundation
-- Version: 20260827210000
--
-- Tables (exactly 6 — step 4.1):
--   vehicle
--   driver
--   route
--   stop
--   transport_enrollment
--   transport_settings
--
-- Out of scope (defer):
--   trip, boarding_event, emergency, live GPS, route-lock RPC,
--   driver login accounts, demo seeds
--
-- Model:
--   institute → vehicle, driver, route, transport_settings
--   route → stop[] (ordered)
--   transport_enrollment → student + route + pickup/drop stops
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. vehicle
-- -----------------------------------------------------------------------------
CREATE TABLE public.vehicle (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),

  vehicle_number        text NOT NULL,
  registration_number   text NOT NULL,
  capacity              integer NOT NULL,
  status                text NOT NULL DEFAULT 'active',
  notes                 text NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT vehicle_status_check CHECK (
    status IN ('active', 'inactive', 'maintenance')
  ),
  CONSTRAINT vehicle_capacity_check CHECK (capacity > 0),

  CONSTRAINT vehicle_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX vehicle_institute_number_live_uidx
  ON public.vehicle (institute_id, vehicle_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX vehicle_institute_registration_live_uidx
  ON public.vehicle (institute_id, registration_number)
  WHERE deleted_at IS NULL;

CREATE INDEX vehicle_institute_id_idx
  ON public.vehicle (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER vehicle_set_updated_at
  BEFORE UPDATE ON public.vehicle
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.vehicle IS
  'Institute transport vehicle. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. driver (institute-scoped people row — not membership role alone)
-- -----------------------------------------------------------------------------
CREATE TABLE public.driver (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id       uuid NULL REFERENCES public.user_profile (id),

  display_name          text NOT NULL,
  phone                 text NOT NULL,
  license_number        text NOT NULL,
  license_expiry        date NULL,
  status                text NOT NULL DEFAULT 'active',
  notes                 text NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT driver_status_check CHECK (
    status IN ('active', 'inactive', 'maintenance')
  ),

  CONSTRAINT driver_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX driver_institute_phone_live_uidx
  ON public.driver (institute_id, phone)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX driver_institute_license_live_uidx
  ON public.driver (institute_id, license_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX driver_institute_user_profile_uidx
  ON public.driver (institute_id, user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX driver_institute_id_idx
  ON public.driver (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER driver_set_updated_at
  BEFORE UPDATE ON public.driver
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.driver IS
  'Institute-scoped transport driver directory. Portal login via optional user_profile_id + membership role driver.';

-- -----------------------------------------------------------------------------
-- 3. route
-- -----------------------------------------------------------------------------
CREATE TABLE public.route (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),

  name                  text NOT NULL,
  vehicle_id            uuid NULL,
  driver_id             uuid NULL,
  status                text NOT NULL DEFAULT 'active',
  config_status         text NOT NULL DEFAULT 'not_configured',
  locked_at             timestamptz NULL,
  locked_by_user_id     uuid NULL REFERENCES public.user_profile (id),
  setup_finished_at     timestamptz NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT route_status_check CHECK (
    status IN ('active', 'inactive', 'maintenance')
  ),
  CONSTRAINT route_config_status_check CHECK (
    config_status IN ('not_configured', 'configured', 'locked')
  ),

  CONSTRAINT route_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT route_vehicle_institute_fkey
    FOREIGN KEY (vehicle_id, institute_id)
    REFERENCES public.vehicle (id, institute_id),

  CONSTRAINT route_driver_institute_fkey
    FOREIGN KEY (driver_id, institute_id)
    REFERENCES public.driver (id, institute_id)
);

CREATE UNIQUE INDEX route_institute_name_live_uidx
  ON public.route (institute_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX route_institute_id_idx
  ON public.route (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX route_vehicle_id_idx
  ON public.route (vehicle_id)
  WHERE deleted_at IS NULL;

CREATE INDEX route_driver_id_idx
  ON public.route (driver_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER route_set_updated_at
  BEFORE UPDATE ON public.route
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.route IS
  'Transport route linking optional vehicle/driver. Stops are child rows.';

-- -----------------------------------------------------------------------------
-- 4. stop
-- -----------------------------------------------------------------------------
CREATE TABLE public.stop (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL,
  route_id                uuid NOT NULL,

  name                    text NOT NULL,
  location_label          text NOT NULL,
  latitude                double precision NOT NULL,
  longitude               double precision NOT NULL,
  route_order             integer NOT NULL,
  notification_radius_m   integer NOT NULL DEFAULT 150,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT stop_order_check CHECK (route_order >= 0),
  CONSTRAINT stop_radius_check CHECK (notification_radius_m > 0),
  CONSTRAINT stop_lat_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT stop_lng_check CHECK (longitude BETWEEN -180 AND 180),

  CONSTRAINT stop_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT stop_route_institute_fkey
    FOREIGN KEY (route_id, institute_id)
    REFERENCES public.route (id, institute_id)
);

CREATE UNIQUE INDEX stop_route_order_live_uidx
  ON public.stop (route_id, route_order)
  WHERE deleted_at IS NULL;

CREATE INDEX stop_route_id_idx
  ON public.stop (route_id)
  WHERE deleted_at IS NULL;

CREATE INDEX stop_institute_id_idx
  ON public.stop (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER stop_set_updated_at
  BEFORE UPDATE ON public.stop
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.stop IS
  'Ordered stop on a transport route with GPS coordinates.';

-- -----------------------------------------------------------------------------
-- 5. transport_enrollment
-- -----------------------------------------------------------------------------
CREATE TABLE public.transport_enrollment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL,
  student_id            uuid NOT NULL,
  route_id              uuid NOT NULL,
  pickup_stop_id        uuid NOT NULL,
  drop_stop_id          uuid NOT NULL,
  status                text NOT NULL DEFAULT 'active',

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT transport_enrollment_status_check CHECK (
    status IN ('active', 'inactive', 'ended')
  ),

  CONSTRAINT transport_enrollment_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT transport_enrollment_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT transport_enrollment_route_institute_fkey
    FOREIGN KEY (route_id, institute_id)
    REFERENCES public.route (id, institute_id),

  CONSTRAINT transport_enrollment_pickup_stop_institute_fkey
    FOREIGN KEY (pickup_stop_id, institute_id)
    REFERENCES public.stop (id, institute_id),

  CONSTRAINT transport_enrollment_drop_stop_institute_fkey
    FOREIGN KEY (drop_stop_id, institute_id)
    REFERENCES public.stop (id, institute_id)
);

CREATE UNIQUE INDEX transport_enrollment_student_live_uidx
  ON public.transport_enrollment (institute_id, student_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX transport_enrollment_route_id_idx
  ON public.transport_enrollment (route_id)
  WHERE deleted_at IS NULL;

CREATE INDEX transport_enrollment_student_id_idx
  ON public.transport_enrollment (student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER transport_enrollment_set_updated_at
  BEFORE UPDATE ON public.transport_enrollment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.transport_enrollment IS
  'Student assigned to a route with pickup/drop stops. One active enrollment per student.';

-- -----------------------------------------------------------------------------
-- 6. transport_settings (singleton per institute)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transport_settings (
  institute_id                  uuid PRIMARY KEY REFERENCES public.institute (id),
  default_notification_radius_m integer NOT NULL DEFAULT 150,
  default_pickup_buffer_mins    integer NOT NULL DEFAULT 5,
  working_days                  integer[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT transport_settings_radius_check CHECK (
    default_notification_radius_m > 0
  ),
  CONSTRAINT transport_settings_buffer_check CHECK (
    default_pickup_buffer_mins >= 0
  )
);

CREATE TRIGGER transport_settings_set_updated_at
  BEFORE UPDATE ON public.transport_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.transport_settings IS
  'Institute transport defaults (notification radius, pickup buffer, working days).';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_select_scoped
  ON public.vehicle FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

CREATE POLICY driver_select_scoped
  ON public.driver FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR user_profile_id = auth.uid()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

CREATE POLICY route_select_scoped
  ON public.route FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

CREATE POLICY stop_select_scoped
  ON public.stop FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
    )
  );

CREATE POLICY transport_enrollment_select_scoped
  ON public.transport_enrollment FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY transport_settings_select_scoped
  ON public.transport_settings FOR SELECT TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR public.has_institute_role(institute_id, 'driver')
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.vehicle FROM anon, authenticated;
REVOKE ALL ON TABLE public.driver FROM anon, authenticated;
REVOKE ALL ON TABLE public.route FROM anon, authenticated;
REVOKE ALL ON TABLE public.stop FROM anon, authenticated;
REVOKE ALL ON TABLE public.transport_enrollment FROM anon, authenticated;
REVOKE ALL ON TABLE public.transport_settings FROM anon, authenticated;

GRANT SELECT ON TABLE public.vehicle TO authenticated;
GRANT SELECT ON TABLE public.driver TO authenticated;
GRANT SELECT ON TABLE public.route TO authenticated;
GRANT SELECT ON TABLE public.stop TO authenticated;
GRANT SELECT ON TABLE public.transport_enrollment TO authenticated;
GRANT SELECT ON TABLE public.transport_settings TO authenticated;

GRANT ALL ON TABLE public.vehicle TO service_role;
GRANT ALL ON TABLE public.driver TO service_role;
GRANT ALL ON TABLE public.route TO service_role;
GRANT ALL ON TABLE public.stop TO service_role;
GRANT ALL ON TABLE public.transport_enrollment TO service_role;
GRANT ALL ON TABLE public.transport_settings TO service_role;
