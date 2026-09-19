-- Admin transport flowchart: vehicle assignment, app PIN, settings (notification/remember/pickup time),
-- and bus-only student enrollment (stops optional until driver configures them).

-- ── Driver: assigned vehicle + app account PIN ───────────────────────────────
ALTER TABLE public.driver
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid NULL,
  ADD COLUMN IF NOT EXISTS app_pin_hash text NULL,
  ADD COLUMN IF NOT EXISTS app_pin_salt text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'driver_assigned_vehicle_institute_fkey'
  ) THEN
    ALTER TABLE public.driver
      ADD CONSTRAINT driver_assigned_vehicle_institute_fkey
      FOREIGN KEY (assigned_vehicle_id, institute_id)
      REFERENCES public.vehicle (id, institute_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS driver_assigned_vehicle_live_uidx
  ON public.driver (institute_id, assigned_vehicle_id)
  WHERE assigned_vehicle_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.driver.assigned_vehicle_id IS
  'Admin flowchart: assign vehicle to driver. Synced to route.vehicle_id + route.driver_id.';
COMMENT ON COLUMN public.driver.app_pin_hash IS
  'Hashed Transport app account PIN (4–8 digits). Never return plaintext.';
COMMENT ON COLUMN public.driver.app_pin_salt IS
  'Salt for app_pin_hash.';

-- ── Settings: notification, remember, pickup time ───────────────────────────
ALTER TABLE public.transport_settings
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS remember_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_pickup_time time NULL;

COMMENT ON COLUMN public.transport_settings.notifications_enabled IS
  'Flowchart Notification toggle for transport alerts.';
COMMENT ON COLUMN public.transport_settings.remember_enabled IS
  'Flowchart Remember preference for transport client defaults.';
COMMENT ON COLUMN public.transport_settings.default_pickup_time IS
  'Flowchart Pickup time (HH:MM). Buffer minutes remain separate lead time.';

-- ── Enrollment: allow bus assign before driver stops exist ──────────────────
ALTER TABLE public.transport_enrollment
  ALTER COLUMN pickup_stop_id DROP NOT NULL,
  ALTER COLUMN drop_stop_id DROP NOT NULL;
