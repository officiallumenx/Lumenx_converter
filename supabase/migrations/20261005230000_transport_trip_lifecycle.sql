-- Phase 4: trip timeline + boarding/dropping client event idempotency.

ALTER TABLE public.transport_trip
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS school_arrived_at timestamptz NULL;

ALTER TABLE public.transport_boarding_event
  ADD COLUMN IF NOT EXISTS boarding_client_event_id text NULL,
  ADD COLUMN IF NOT EXISTS dropping_client_event_id text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transport_boarding_boarding_client_event_uidx
  ON public.transport_boarding_event (institute_id, boarding_client_event_id)
  WHERE boarding_client_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transport_boarding_dropping_client_event_uidx
  ON public.transport_boarding_event (institute_id, dropping_client_event_id)
  WHERE dropping_client_event_id IS NOT NULL;

COMMENT ON COLUMN public.transport_trip.timeline IS
  'Append-only trip lifecycle events for Admin/Connect (JSON array).';
COMMENT ON COLUMN public.transport_trip.school_arrived_at IS
  'Set when bus first enters school geofence during pickup — does not auto-board.';
