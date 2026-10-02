-- Transport route endpoints: Admin school (shared) + Driver parking (per route).
-- Stop kinds: waypoint (default), school (synced from settings), parking (driver).

ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS school_location_label text NULL,
  ADD COLUMN IF NOT EXISTS school_latitude double precision NULL,
  ADD COLUMN IF NOT EXISTS school_longitude double precision NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_settings_school_lat_check'
  ) THEN
    ALTER TABLE public.transport_settings
      ADD CONSTRAINT transport_settings_school_lat_check
      CHECK (school_latitude IS NULL OR school_latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_settings_school_lng_check'
  ) THEN
    ALTER TABLE public.transport_settings
      ADD CONSTRAINT transport_settings_school_lng_check
      CHECK (school_longitude IS NULL OR school_longitude BETWEEN -180 AND 180);
  END IF;
END $$;

COMMENT ON COLUMN public.transport_settings.school_location_label IS
  'Admin-set school endpoint label shared by all routes (boarding end).';
COMMENT ON COLUMN public.transport_settings.school_latitude IS
  'Admin-set school latitude. Synced onto each route as stop.kind=school.';
COMMENT ON COLUMN public.transport_settings.school_longitude IS
  'Admin-set school longitude. Synced onto each route as stop.kind=school.';

ALTER TABLE public.stop
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'waypoint';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stop_kind_check'
  ) THEN
    ALTER TABLE public.stop
      ADD CONSTRAINT stop_kind_check
      CHECK (kind IN ('waypoint', 'school', 'parking'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS stop_route_school_live_uidx
  ON public.stop (route_id)
  WHERE deleted_at IS NULL AND kind = 'school';

CREATE UNIQUE INDEX IF NOT EXISTS stop_route_parking_live_uidx
  ON public.stop (route_id)
  WHERE deleted_at IS NULL AND kind = 'parking';

COMMENT ON COLUMN public.stop.kind IS
  'waypoint = student pickup; school = Admin endpoint (boarding end); parking = Driver bus-park (start/evening end).';
