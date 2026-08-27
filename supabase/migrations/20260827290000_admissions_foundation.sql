-- =============================================================================
-- LumenX Migration 030 — Admissions foundation
-- Version: 20260827290000
--
-- Tables (exactly 5 — step 6.1 / blueprint V2 Admissions):
--   admission_program
--   admission_opening
--   admission_application
--   admission_document
--   admission_inquiry
--
-- Out of scope (defer):
--   convert_admission_to_student RPC, Storage uploads/binaries,
--   interview scheduling, waitlist expiry jobs, anonymous public apply,
--   saved/favorites UI store, notification fan-out
--
-- Model:
--   program → opening (intake) → application → documents[]
--   inquiry is parallel contact channel (not an application)
--
-- Identity:
--   Applicants use central user_profile (applicant_user_id).
--   Institute access via membership (parent/member apply; staff triage).
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. admission_program
-- -----------------------------------------------------------------------------
CREATE TABLE public.admission_program (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  name                    text NOT NULL,
  slug                    text NOT NULL,
  description             text NULL,
  duration                text NULL,
  eligibility             text NULL,
  age_criteria            text NULL,
  seats_available         integer NOT NULL DEFAULT 0,
  grades                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  academic_year_label     text NULL,
  application_deadline    date NULL,

  status                  text NOT NULL DEFAULT 'draft',
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT admission_program_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT admission_program_slug_check CHECK (char_length(trim(slug)) >= 1),
  CONSTRAINT admission_program_seats_check CHECK (seats_available >= 0),
  CONSTRAINT admission_program_grades_is_array CHECK (jsonb_typeof(grades) = 'array'),
  CONSTRAINT admission_program_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  ),

  CONSTRAINT admission_program_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX admission_program_institute_slug_uidx
  ON public.admission_program (institute_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX admission_program_institute_status_idx
  ON public.admission_program (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER admission_program_set_updated_at
  BEFORE UPDATE ON public.admission_program
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admission_program IS
  'Institute admission program catalog entry. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. admission_opening
-- -----------------------------------------------------------------------------
CREATE TABLE public.admission_opening (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  program_id              uuid NOT NULL,

  name                    text NOT NULL,
  slug                    text NOT NULL,
  description             text NULL,
  seats_available         integer NOT NULL DEFAULT 0,
  academic_year_label     text NULL,
  application_deadline    date NULL,

  status                  text NOT NULL DEFAULT 'draft',
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT admission_opening_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT admission_opening_slug_check CHECK (char_length(trim(slug)) >= 1),
  CONSTRAINT admission_opening_seats_check CHECK (seats_available >= 0),
  CONSTRAINT admission_opening_status_check CHECK (
    status IN ('draft', 'open', 'closed')
  ),

  CONSTRAINT admission_opening_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT admission_opening_program_institute_fkey
    FOREIGN KEY (program_id, institute_id)
    REFERENCES public.admission_program (id, institute_id)
);

CREATE UNIQUE INDEX admission_opening_institute_slug_uidx
  ON public.admission_opening (institute_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX admission_opening_program_id_idx
  ON public.admission_opening (program_id)
  WHERE deleted_at IS NULL;

CREATE INDEX admission_opening_institute_status_idx
  ON public.admission_opening (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER admission_opening_set_updated_at
  BEFORE UPDATE ON public.admission_opening
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admission_opening IS
  'Published intake window for a program (draft|open|closed).';

-- -----------------------------------------------------------------------------
-- 3. admission_application
-- -----------------------------------------------------------------------------
CREATE TABLE public.admission_application (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  opening_id              uuid NOT NULL,
  program_id              uuid NOT NULL,

  applicant_user_id       uuid NOT NULL REFERENCES public.user_profile (id),
  student_display_name    text NOT NULL,
  status                  text NOT NULL DEFAULT 'draft',
  payload                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_note           text NULL,
  converted_student_id    uuid NULL,

  submitted_at            timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT admission_application_student_name_check CHECK (
    char_length(trim(student_display_name)) >= 1
  ),
  CONSTRAINT admission_application_payload_is_object CHECK (
    jsonb_typeof(payload) = 'object'
  ),
  CONSTRAINT admission_application_status_check CHECK (
    status IN (
      'draft',
      'submitted',
      'review',
      'verification',
      'parent_confirmation',
      'waitlisted',
      'approved',
      'rejected',
      'withdrawn'
    )
  ),
  CONSTRAINT admission_application_submit_check CHECK (
    (status = 'draft' AND submitted_at IS NULL)
    OR (status <> 'draft')
  ),

  CONSTRAINT admission_application_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT admission_application_opening_institute_fkey
    FOREIGN KEY (opening_id, institute_id)
    REFERENCES public.admission_opening (id, institute_id),

  CONSTRAINT admission_application_program_institute_fkey
    FOREIGN KEY (program_id, institute_id)
    REFERENCES public.admission_program (id, institute_id),

  CONSTRAINT admission_application_converted_student_fkey
    FOREIGN KEY (converted_student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE INDEX admission_application_institute_status_idx
  ON public.admission_application (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX admission_application_applicant_idx
  ON public.admission_application (applicant_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX admission_application_opening_id_idx
  ON public.admission_application (opening_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER admission_application_set_updated_at
  BEFORE UPDATE ON public.admission_application
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admission_application IS
  'Applicant admission case. Convert-to-student deferred (converted_student_id reserved).';

-- -----------------------------------------------------------------------------
-- 4. admission_document
-- -----------------------------------------------------------------------------
CREATE TABLE public.admission_document (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  application_id          uuid NOT NULL,

  doc_type                text NOT NULL,
  label                   text NOT NULL,
  file_name               text NULL,
  asset_path              text NULL,
  status                  text NOT NULL DEFAULT 'not_uploaded',
  note                    text NULL,

  uploaded_by_user_id     uuid NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT admission_document_label_check CHECK (char_length(trim(label)) >= 1),
  CONSTRAINT admission_document_type_check CHECK (
    doc_type IN (
      'birth_certificate',
      'transfer_certificate',
      'marks_memo',
      'student_photo',
      'parent_id',
      'additional'
    )
  ),
  CONSTRAINT admission_document_status_check CHECK (
    status IN (
      'not_uploaded',
      'uploaded',
      'under_review',
      'verified',
      'rejected',
      'resubmission_required'
    )
  ),

  CONSTRAINT admission_document_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT admission_document_application_institute_fkey
    FOREIGN KEY (application_id, institute_id)
    REFERENCES public.admission_application (id, institute_id)
);

CREATE INDEX admission_document_application_id_idx
  ON public.admission_document (application_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER admission_document_set_updated_at
  BEFORE UPDATE ON public.admission_document
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admission_document IS
  'Application attachment metadata. Binary lives in Storage (asset_path); upload APIs deferred.';

-- -----------------------------------------------------------------------------
-- 5. admission_inquiry
-- -----------------------------------------------------------------------------
CREATE TABLE public.admission_inquiry (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  category                text NOT NULL DEFAULT 'general',
  subject                 text NOT NULL,
  body                    text NOT NULL,
  contact_name            text NOT NULL,
  contact_email           text NULL,
  contact_phone           text NULL,

  status                  text NOT NULL DEFAULT 'open',
  response_note           text NULL,

  requested_by_user_id    uuid NULL REFERENCES public.user_profile (id),
  responded_by_user_id    uuid NULL REFERENCES public.user_profile (id),
  responded_at            timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT admission_inquiry_subject_check CHECK (char_length(trim(subject)) >= 1),
  CONSTRAINT admission_inquiry_body_check CHECK (char_length(trim(body)) >= 1),
  CONSTRAINT admission_inquiry_contact_name_check CHECK (
    char_length(trim(contact_name)) >= 1
  ),
  CONSTRAINT admission_inquiry_category_check CHECK (
    category IN ('admission', 'program', 'fees', 'transport', 'hostel', 'general')
  ),
  CONSTRAINT admission_inquiry_status_check CHECK (
    status IN ('open', 'responded', 'closed')
  ),

  CONSTRAINT admission_inquiry_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX admission_inquiry_institute_status_idx
  ON public.admission_inquiry (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER admission_inquiry_set_updated_at
  BEFORE UPDATE ON public.admission_inquiry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admission_inquiry IS
  'Admissions contact inquiry (not an application). Soft-delete via deleted_at.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.admission_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_opening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_inquiry ENABLE ROW LEVEL SECURITY;

-- Programs: staff see all; members see published
CREATE POLICY admission_program_select_scoped
  ON public.admission_program FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        status = 'published'
        AND public.is_institute_member(institute_id)
      )
    )
  );

-- Openings: staff see all; members see open|closed (not drafts)
CREATE POLICY admission_opening_select_scoped
  ON public.admission_opening FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        status IN ('open', 'closed')
        AND public.is_institute_member(institute_id)
      )
    )
  );

-- Applications: staff institute-wide; applicant owns own rows
CREATE POLICY admission_application_select_scoped
  ON public.admission_application FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR applicant_user_id = auth.uid()
    )
  );

-- Documents: staff or applicant of parent application
CREATE POLICY admission_document_select_scoped
  ON public.admission_document FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR EXISTS (
        SELECT 1
        FROM public.admission_application a
        WHERE a.id = admission_document.application_id
          AND a.institute_id = admission_document.institute_id
          AND a.deleted_at IS NULL
          AND a.applicant_user_id = auth.uid()
      )
    )
  );

-- Inquiries: staff see all; requester sees own
CREATE POLICY admission_inquiry_select_scoped
  ON public.admission_inquiry FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR requested_by_user_id = auth.uid()
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.admission_program FROM anon, authenticated;
REVOKE ALL ON TABLE public.admission_opening FROM anon, authenticated;
REVOKE ALL ON TABLE public.admission_application FROM anon, authenticated;
REVOKE ALL ON TABLE public.admission_document FROM anon, authenticated;
REVOKE ALL ON TABLE public.admission_inquiry FROM anon, authenticated;

GRANT SELECT ON TABLE public.admission_program TO authenticated;
GRANT SELECT ON TABLE public.admission_opening TO authenticated;
GRANT SELECT ON TABLE public.admission_application TO authenticated;
GRANT SELECT ON TABLE public.admission_document TO authenticated;
GRANT SELECT ON TABLE public.admission_inquiry TO authenticated;

GRANT ALL ON TABLE public.admission_program TO service_role;
GRANT ALL ON TABLE public.admission_opening TO service_role;
GRANT ALL ON TABLE public.admission_application TO service_role;
GRANT ALL ON TABLE public.admission_document TO service_role;
GRANT ALL ON TABLE public.admission_inquiry TO service_role;
