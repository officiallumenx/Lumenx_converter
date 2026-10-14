-- =============================================================================
-- LumenX Migration — Records: retention review + cross-institute transfers
-- Version: 20261014120000
--
-- Additive only. Does not alter academic_year activation of existing institutes.
-- Does not auto-purge student data. Recycle-bin 90-day policy unchanged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. One active academic year per institute (concurrent-safe)
-- Does not change any existing rows' status; fails only if duplicates already exist.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS academic_year_one_active_per_institute_uidx
  ON public.academic_year (institute_id)
  WHERE deleted_at IS NULL AND status = 'active';

-- -----------------------------------------------------------------------------
-- 1. Authoritative graduation date on student (nullable — unknown = needs review)
-- -----------------------------------------------------------------------------
ALTER TABLE public.student
  ADD COLUMN IF NOT EXISTS graduated_on date;

COMMENT ON COLUMN public.student.graduated_on IS
  'Authoritative graduation/pass-out date. NULL means date unknown — retention review required before eligibility.';

-- -----------------------------------------------------------------------------
-- 2. Student retention review (5 calendar years after graduated_on)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_retention_review (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  student_id              uuid NOT NULL,
  graduating_enrollment_id uuid NULL,
  graduated_on            date NULL,
  review_eligible_on      date NULL,
  status                  text NOT NULL,
  legal_hold              boolean NOT NULL DEFAULT false,
  extended_until          date NULL,
  last_reviewed_at        timestamptz NULL,
  last_reviewed_by_user_id uuid NULL,
  last_decision           text NULL,
  last_decision_reason    text NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT student_retention_review_status_check CHECK (
    status IN (
      'pending_graduation_date',
      'active_retention',
      'review_eligible',
      'extended',
      'legal_hold',
      'deletion_approved',
      'closed'
    )
  ),
  CONSTRAINT student_retention_review_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),
  CONSTRAINT student_retention_review_dates_check CHECK (
    graduated_on IS NULL
    OR review_eligible_on IS NULL
    OR review_eligible_on >= graduated_on
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_retention_review_student_uidx
  ON public.student_retention_review (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS student_retention_review_institute_status_idx
  ON public.student_retention_review (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS student_retention_review_eligible_on_idx
  ON public.student_retention_review (review_eligible_on)
  WHERE deleted_at IS NULL
    AND status IN ('active_retention', 'extended');

DROP TRIGGER IF EXISTS student_retention_review_set_updated_at
  ON public.student_retention_review;
CREATE TRIGGER student_retention_review_set_updated_at
  BEFORE UPDATE ON public.student_retention_review
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student_retention_review IS
  'Five-year retention review eligibility after graduation. Expiry means review, never automatic permanent deletion.';

-- -----------------------------------------------------------------------------
-- 3. Cross-institute student transfer requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_transfer_request (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_institute_id        uuid NOT NULL REFERENCES public.institute (id),
  destination_institute_id   uuid NOT NULL REFERENCES public.institute (id),
  source_student_id          uuid NOT NULL,
  destination_student_id     uuid NULL,
  destination_academic_year_id uuid NULL,
  destination_class_id       uuid NULL,
  destination_section_id     uuid NULL,
  status                     text NOT NULL,
  effective_on               date NULL,
  initiated_by_user_id       uuid NOT NULL,
  decided_by_user_id         uuid NULL,
  decision_reason            text NULL,
  shared_fields              jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_request_id          text NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  deleted_at                 timestamptz NULL,

  CONSTRAINT student_transfer_request_status_check CHECK (
    status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')
  ),
  CONSTRAINT student_transfer_request_distinct_institutes_check CHECK (
    source_institute_id <> destination_institute_id
  ),
  CONSTRAINT student_transfer_request_source_student_fkey
    FOREIGN KEY (source_student_id, source_institute_id)
    REFERENCES public.student (id, institute_id),
  CONSTRAINT student_transfer_request_shared_fields_object CHECK (
    jsonb_typeof(shared_fields) = 'object'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_transfer_request_client_uidx
  ON public.student_transfer_request (source_institute_id, client_request_id)
  WHERE deleted_at IS NULL AND client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_transfer_request_one_pending_uidx
  ON public.student_transfer_request (source_student_id)
  WHERE deleted_at IS NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS student_transfer_request_dest_status_idx
  ON public.student_transfer_request (destination_institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS student_transfer_request_source_status_idx
  ON public.student_transfer_request (source_institute_id, status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS student_transfer_request_set_updated_at
  ON public.student_transfer_request;
CREATE TRIGGER student_transfer_request_set_updated_at
  BEFORE UPDATE ON public.student_transfer_request
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student_transfer_request IS
  'Cross-institute transfer workflow. Source student row is never re-homed; destination creates a new student on completion with explicitly shared fields only.';

-- -----------------------------------------------------------------------------
-- 4. RLS defense-in-depth (service_role remains write path)
-- -----------------------------------------------------------------------------
ALTER TABLE public.student_retention_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transfer_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_retention_review_select_scoped
  ON public.student_retention_review;
CREATE POLICY student_retention_review_select_scoped
  ON public.student_retention_review FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
  );

DROP POLICY IF EXISTS student_transfer_request_select_scoped
  ON public.student_transfer_request;
CREATE POLICY student_transfer_request_select_scoped
  ON public.student_transfer_request FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(source_institute_id)
      OR public.is_staff_of_institute(destination_institute_id)
    )
  );

REVOKE ALL ON TABLE public.student_retention_review FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_transfer_request FROM anon, authenticated;
GRANT SELECT ON TABLE public.student_retention_review TO authenticated;
GRANT SELECT ON TABLE public.student_transfer_request TO authenticated;
GRANT ALL ON TABLE public.student_retention_review TO service_role;
GRANT ALL ON TABLE public.student_transfer_request TO service_role;
