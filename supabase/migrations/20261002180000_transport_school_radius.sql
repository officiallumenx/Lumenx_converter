-- Separate radius for school endpoint vs normal student stops.

ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS school_notification_radius_m integer NOT NULL DEFAULT 150;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_settings_school_radius_check'
  ) THEN
    ALTER TABLE public.transport_settings
      ADD CONSTRAINT transport_settings_school_radius_check
      CHECK (school_notification_radius_m > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.transport_settings.school_notification_radius_m IS
  'Approach radius (m) for the Admin school endpoint stop. Independent of default_notification_radius_m used for normal stops.';

COMMENT ON COLUMN public.transport_settings.default_notification_radius_m IS
  'Default approach radius (m) for normal student pickup/drop stops.';
