-- Phase 3: durable GPS outbox idempotency + driver/sequence metadata on vehicle_location.

ALTER TABLE public.vehicle_location
  ADD COLUMN IF NOT EXISTS client_event_id text NULL,
  ADD COLUMN IF NOT EXISTS driver_id uuid NULL REFERENCES public.driver (id),
  ADD COLUMN IF NOT EXISTS sequence_number integer NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_location_client_event_uidx
  ON public.vehicle_location (institute_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_location_trip_sequence_idx
  ON public.vehicle_location (trip_id, sequence_number)
  WHERE sequence_number IS NOT NULL;

COMMENT ON COLUMN public.vehicle_location.client_event_id IS
  'Driver-generated idempotency key for GPS outbox replay.';
COMMENT ON COLUMN public.vehicle_location.sequence_number IS
  'Monotonic per-trip sequence from the driver device.';
