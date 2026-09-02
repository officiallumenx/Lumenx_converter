-- Transport approval workflow + Supabase Realtime publication.
-- Drivers submit routes/stops/enrollments as pending; admin approves or rejects.
-- Only approved rows are visible in parent/teacher/student operational views.

ALTER TABLE public.route
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

ALTER TABLE public.stop
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

ALTER TABLE public.transport_enrollment
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid NULL REFERENCES public.user_profile (id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

ALTER TABLE public.route
  DROP CONSTRAINT IF EXISTS route_approval_status_check;
ALTER TABLE public.route
  ADD CONSTRAINT route_approval_status_check CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  );

ALTER TABLE public.stop
  DROP CONSTRAINT IF EXISTS stop_approval_status_check;
ALTER TABLE public.stop
  ADD CONSTRAINT stop_approval_status_check CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  );

ALTER TABLE public.transport_enrollment
  DROP CONSTRAINT IF EXISTS transport_enrollment_approval_status_check;
ALTER TABLE public.transport_enrollment
  ADD CONSTRAINT transport_enrollment_approval_status_check CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  );

CREATE INDEX IF NOT EXISTS route_institute_approval_idx
  ON public.route (institute_id, approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS stop_route_approval_idx
  ON public.stop (route_id, approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS transport_enrollment_institute_approval_idx
  ON public.transport_enrollment (institute_id, approval_status)
  WHERE deleted_at IS NULL;

-- Realtime (idempotent — ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.route;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stop;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_enrollment;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
