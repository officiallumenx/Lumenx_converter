-- Transport operations: trips, boarding marks, emergencies, vehicle GPS.
-- Version: 20260827221000
-- Enables cross-device live tracking for Admin, Connect, and Transport app.

CREATE TABLE IF NOT EXISTS public.transport_trip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  route_id uuid NOT NULL REFERENCES public.route (id),
  vehicle_id uuid NOT NULL REFERENCES public.vehicle (id),
  driver_id uuid NOT NULL REFERENCES public.driver (id),
  slot text NOT NULL DEFAULT 'morning',
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  phase text NOT NULL DEFAULT 'ready',
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  current_stop_id uuid NULL REFERENCES public.stop (id),
  current_stop_index integer NOT NULL DEFAULT 0,
  finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

ALTER TABLE public.transport_trip
  DROP CONSTRAINT IF EXISTS transport_trip_slot_check;
ALTER TABLE public.transport_trip
  ADD CONSTRAINT transport_trip_slot_check CHECK (slot IN ('morning', 'evening'));

ALTER TABLE public.transport_trip
  DROP CONSTRAINT IF EXISTS transport_trip_phase_check;
ALTER TABLE public.transport_trip
  ADD CONSTRAINT transport_trip_phase_check CHECK (
    phase IN ('ready', 'starting', 'running', 'boarding', 'dropping', 'completed')
  );

CREATE INDEX IF NOT EXISTS transport_trip_institute_date_idx
  ON public.transport_trip (institute_id, trip_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS transport_trip_vehicle_active_idx
  ON public.transport_trip (vehicle_id, phase)
  WHERE deleted_at IS NULL AND finalized = false;

CREATE TABLE IF NOT EXISTS public.transport_boarding_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  trip_id uuid NOT NULL REFERENCES public.transport_trip (id),
  student_id uuid NOT NULL REFERENCES public.student (id),
  stop_id uuid NOT NULL REFERENCES public.stop (id),
  boarding_status text NOT NULL DEFAULT 'pending',
  dropping_status text NOT NULL DEFAULT 'pending',
  boarded_at timestamptz NULL,
  dropped_at timestamptz NULL,
  finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id)
);

ALTER TABLE public.transport_boarding_event
  DROP CONSTRAINT IF EXISTS transport_boarding_event_boarding_check;
ALTER TABLE public.transport_boarding_event
  ADD CONSTRAINT transport_boarding_event_boarding_check CHECK (
    boarding_status IN ('pending', 'boarded', 'not_boarded')
  );

ALTER TABLE public.transport_boarding_event
  DROP CONSTRAINT IF EXISTS transport_boarding_event_dropping_check;
ALTER TABLE public.transport_boarding_event
  ADD CONSTRAINT transport_boarding_event_dropping_check CHECK (
    dropping_status IN ('pending', 'dropped', 'not_dropped')
  );

CREATE INDEX IF NOT EXISTS transport_boarding_event_trip_idx
  ON public.transport_boarding_event (trip_id);

CREATE TABLE IF NOT EXISTS public.transport_emergency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  trip_id uuid NULL REFERENCES public.transport_trip (id),
  driver_id uuid NOT NULL REFERENCES public.driver (id),
  vehicle_id uuid NOT NULL REFERENCES public.vehicle (id),
  emergency_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  latitude double precision NULL,
  longitude double precision NULL,
  note text NULL,
  acknowledged_at timestamptz NULL,
  acknowledged_by_user_id uuid NULL REFERENCES public.user_profile (id),
  resolved_at timestamptz NULL,
  resolved_by_user_id uuid NULL REFERENCES public.user_profile (id),
  resolve_note text NULL,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

ALTER TABLE public.transport_emergency
  DROP CONSTRAINT IF EXISTS transport_emergency_type_check;
ALTER TABLE public.transport_emergency
  ADD CONSTRAINT transport_emergency_type_check CHECK (
    emergency_type IN ('general', 'breakdown', 'medical', 'accident', 'delay', 'route_issue', 'other')
  );

ALTER TABLE public.transport_emergency
  DROP CONSTRAINT IF EXISTS transport_emergency_status_check;
ALTER TABLE public.transport_emergency
  ADD CONSTRAINT transport_emergency_status_check CHECK (
    status IN ('active', 'acknowledged', 'resolved')
  );

CREATE INDEX IF NOT EXISTS transport_emergency_institute_status_idx
  ON public.transport_emergency (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  trip_id uuid NOT NULL REFERENCES public.transport_trip (id),
  vehicle_id uuid NOT NULL REFERENCES public.vehicle (id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy_m double precision NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_location_trip_captured_idx
  ON public.vehicle_location (trip_id, captured_at DESC);

-- Realtime publication (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_trip;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_boarding_event;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_emergency;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_location;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
