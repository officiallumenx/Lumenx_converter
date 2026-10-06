-- Phase 8: idempotent trip start + emergency create for driver offline outbox replay.

ALTER TABLE public.transport_trip
  ADD COLUMN IF NOT EXISTS client_event_id text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transport_trip_client_event_uidx
  ON public.transport_trip (institute_id, client_event_id)
  WHERE client_event_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.transport_trip.client_event_id IS
  'Driver-generated idempotency key for offline trip_start replay.';

ALTER TABLE public.transport_emergency
  ADD COLUMN IF NOT EXISTS client_event_id text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transport_emergency_client_event_uidx
  ON public.transport_emergency (institute_id, client_event_id)
  WHERE client_event_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.transport_emergency.client_event_id IS
  'Driver-generated idempotency key for offline emergency replay.';

-- Generic ops idempotency for trip phase / end (and future operational writes).
CREATE TABLE IF NOT EXISTS public.transport_ops_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  client_event_id text NOT NULL,
  event_type text NOT NULL,
  trip_id uuid NULL REFERENCES public.transport_trip (id),
  result_ref text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_id, client_event_id)
);

CREATE INDEX IF NOT EXISTS transport_ops_idempotency_trip_idx
  ON public.transport_ops_idempotency (trip_id)
  WHERE trip_id IS NOT NULL;

ALTER TABLE public.transport_ops_idempotency ENABLE ROW LEVEL SECURITY;
