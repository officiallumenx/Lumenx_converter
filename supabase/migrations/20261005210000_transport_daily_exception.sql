-- Transport daily exceptions ("Not Riding Today").
-- Date-scoped only — must NEVER modify permanent transport_enrollment.
-- Replaces provisional transport_ride_exception naming from earlier draft.
-- Version: 20261005210000

DROP TABLE IF EXISTS public.transport_ride_exception CASCADE;

CREATE TABLE IF NOT EXISTS public.transport_daily_exception (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),
  student_id            uuid NOT NULL,
  service_date          date NOT NULL,
  exception_type        text NOT NULL DEFAULT 'NOT_RIDING',
  reason                text NOT NULL DEFAULT 'parent',
  notes                 text NULL,
  created_by_user_id    uuid NULL REFERENCES public.user_profile (id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  cancelled_at          timestamptz NULL,

  CONSTRAINT transport_daily_exception_type_check CHECK (
    exception_type IN ('NOT_RIDING')
  ),
  CONSTRAINT transport_daily_exception_reason_check CHECK (
    reason IN ('parent', 'admin', 'driver', 'system')
  ),
  CONSTRAINT transport_daily_exception_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

-- One active exception per student/date/type (cancelled rows may be reactivated).
CREATE UNIQUE INDEX IF NOT EXISTS transport_daily_exception_live_uidx
  ON public.transport_daily_exception (
    institute_id,
    student_id,
    service_date,
    exception_type
  )
  WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS transport_daily_exception_institute_date_idx
  ON public.transport_daily_exception (institute_id, service_date)
  WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS transport_daily_exception_student_date_idx
  ON public.transport_daily_exception (student_id, service_date)
  WHERE cancelled_at IS NULL;

DROP TRIGGER IF EXISTS transport_daily_exception_set_updated_at
  ON public.transport_daily_exception;
CREATE TRIGGER transport_daily_exception_set_updated_at
  BEFORE UPDATE ON public.transport_daily_exception
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transport_daily_exception ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transport_daily_exception_select_scoped
  ON public.transport_daily_exception;
CREATE POLICY transport_daily_exception_select_scoped
  ON public.transport_daily_exception FOR SELECT TO authenticated
  USING (
    cancelled_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.has_institute_role(institute_id, 'driver')
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

REVOKE ALL ON TABLE public.transport_daily_exception FROM anon, authenticated;
GRANT SELECT ON TABLE public.transport_daily_exception TO authenticated;
GRANT ALL ON TABLE public.transport_daily_exception TO service_role;

COMMENT ON TABLE public.transport_daily_exception IS
  'Date-scoped transport participation exceptions (e.g. NOT_RIDING). Does not alter permanent transport_enrollment. Writes via Hono service_role.';

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_daily_exception;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
