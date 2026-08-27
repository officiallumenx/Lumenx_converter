-- =============================================================================
-- LumenX Migration 031 — Careers foundation
-- Version: 20260827300000
--
-- Tables (exactly 6 — step 6.2 / blueprint V2 Careers):
--   career_job
--   career_application
--   candidate_profile
--   career_inquiry
--   talent_pool_entry
--   user_saved_item
--
-- Out of scope (defer):
--   convert_career_to_teacher RPC, Storage resume binaries,
--   interview scheduling table, assessment/demo pipelines,
--   notification fan-out, anonymous public apply
--
-- Model:
--   job (draft|open|closed) → application → staff transitions
--   candidate_profile is institute-scoped central identity record
--   talent_pool_entry / user_saved_item are recruiter & seeker personalization
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. career_job
-- -----------------------------------------------------------------------------
CREATE TABLE public.career_job (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  title                   text NOT NULL,
  slug                    text NOT NULL,
  description             text NULL,
  category                text NOT NULL DEFAULT 'academic_faculty',
  employment_type         text NOT NULL DEFAULT 'full_time',
  work_mode               text NOT NULL DEFAULT 'onsite',
  location_label          text NULL,
  openings_count          integer NOT NULL DEFAULT 1,

  status                  text NOT NULL DEFAULT 'draft',
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT career_job_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT career_job_slug_check CHECK (char_length(trim(slug)) >= 1),
  CONSTRAINT career_job_openings_check CHECK (openings_count >= 0),
  CONSTRAINT career_job_status_check CHECK (
    status IN ('draft', 'open', 'closed')
  ),
  CONSTRAINT career_job_employment_type_check CHECK (
    employment_type IN ('full_time', 'part_time', 'contract')
  ),
  CONSTRAINT career_job_work_mode_check CHECK (
    work_mode IN ('onsite', 'remote', 'hybrid')
  ),

  CONSTRAINT career_job_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX career_job_institute_slug_uidx
  ON public.career_job (institute_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX career_job_institute_status_idx
  ON public.career_job (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER career_job_set_updated_at
  BEFORE UPDATE ON public.career_job
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.career_job IS
  'Institute job posting. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. candidate_profile
-- -----------------------------------------------------------------------------
CREATE TABLE public.candidate_profile (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id         uuid NOT NULL REFERENCES public.user_profile (id),

  display_name            text NOT NULL,
  headline                text NULL,
  summary                 text NULL,
  phone                   text NULL,
  email                   text NULL,
  payload                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT candidate_profile_display_name_check CHECK (
    char_length(trim(display_name)) >= 1
  ),
  CONSTRAINT candidate_profile_payload_is_object CHECK (
    jsonb_typeof(payload) = 'object'
  ),

  CONSTRAINT candidate_profile_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX candidate_profile_institute_user_uidx
  ON public.candidate_profile (institute_id, user_profile_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER candidate_profile_set_updated_at
  BEFORE UPDATE ON public.candidate_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.candidate_profile IS
  'Institute-scoped job-seeker profile bound to central user_profile.';

-- -----------------------------------------------------------------------------
-- 3. career_application
-- -----------------------------------------------------------------------------
CREATE TABLE public.career_application (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  job_id                  uuid NOT NULL,
  candidate_profile_id    uuid NULL,

  applicant_user_id       uuid NOT NULL REFERENCES public.user_profile (id),
  status                  text NOT NULL DEFAULT 'draft',
  cover_letter            text NULL,
  payload                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_note           text NULL,
  converted_teacher_id    uuid NULL,

  submitted_at            timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT career_application_payload_is_object CHECK (
    jsonb_typeof(payload) = 'object'
  ),
  CONSTRAINT career_application_status_check CHECK (
    status IN (
      'draft',
      'submitted',
      'under_review',
      'shortlisted',
      'assessment',
      'demo_class',
      'interview_scheduled',
      'interview_completed',
      'offer_sent',
      'offer_accepted',
      'selected',
      'rejected',
      'on_hold',
      'withdrawn'
    )
  ),
  CONSTRAINT career_application_submit_check CHECK (
    (status = 'draft' AND submitted_at IS NULL)
    OR (status <> 'draft')
  ),

  CONSTRAINT career_application_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT career_application_job_institute_fkey
    FOREIGN KEY (job_id, institute_id)
    REFERENCES public.career_job (id, institute_id),

  CONSTRAINT career_application_candidate_profile_fkey
    FOREIGN KEY (candidate_profile_id, institute_id)
    REFERENCES public.candidate_profile (id, institute_id),

  CONSTRAINT career_application_converted_teacher_fkey
    FOREIGN KEY (converted_teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE INDEX career_application_institute_status_idx
  ON public.career_application (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX career_application_applicant_idx
  ON public.career_application (applicant_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX career_application_job_id_idx
  ON public.career_application (job_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER career_application_set_updated_at
  BEFORE UPDATE ON public.career_application
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.career_application IS
  'Job application. Convert-to-teacher deferred (converted_teacher_id reserved).';

-- -----------------------------------------------------------------------------
-- 4. career_inquiry
-- -----------------------------------------------------------------------------
CREATE TABLE public.career_inquiry (
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

  CONSTRAINT career_inquiry_subject_check CHECK (char_length(trim(subject)) >= 1),
  CONSTRAINT career_inquiry_body_check CHECK (char_length(trim(body)) >= 1),
  CONSTRAINT career_inquiry_contact_name_check CHECK (
    char_length(trim(contact_name)) >= 1
  ),
  CONSTRAINT career_inquiry_category_check CHECK (
    category IN ('job', 'application', 'recruitment', 'general')
  ),
  CONSTRAINT career_inquiry_status_check CHECK (
    status IN ('open', 'responded', 'closed')
  ),

  CONSTRAINT career_inquiry_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX career_inquiry_institute_status_idx
  ON public.career_inquiry (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER career_inquiry_set_updated_at
  BEFORE UPDATE ON public.career_inquiry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.career_inquiry IS
  'Careers contact inquiry (not an application).';

-- -----------------------------------------------------------------------------
-- 5. talent_pool_entry
-- -----------------------------------------------------------------------------
CREATE TABLE public.talent_pool_entry (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  candidate_user_id       uuid NOT NULL REFERENCES public.user_profile (id),
  candidate_profile_id    uuid NULL,

  notes                   text NULL,
  status                  text NOT NULL DEFAULT 'active',
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT talent_pool_entry_status_check CHECK (
    status IN ('active', 'archived')
  ),

  CONSTRAINT talent_pool_entry_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT talent_pool_entry_candidate_profile_fkey
    FOREIGN KEY (candidate_profile_id, institute_id)
    REFERENCES public.candidate_profile (id, institute_id)
);

CREATE UNIQUE INDEX talent_pool_entry_institute_user_uidx
  ON public.talent_pool_entry (institute_id, candidate_user_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER talent_pool_entry_set_updated_at
  BEFORE UPDATE ON public.talent_pool_entry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.talent_pool_entry IS
  'Recruiter talent-pool bookmark for a candidate user in an institute.';

-- -----------------------------------------------------------------------------
-- 6. user_saved_item (careers personalization; extensible kind)
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_saved_item (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id         uuid NOT NULL REFERENCES public.user_profile (id),

  item_kind               text NOT NULL,
  item_id                 uuid NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT user_saved_item_kind_check CHECK (
    item_kind IN ('career_job')
  ),

  CONSTRAINT user_saved_item_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX user_saved_item_owner_kind_item_uidx
  ON public.user_saved_item (institute_id, user_profile_id, item_kind, item_id)
  WHERE deleted_at IS NULL;

CREATE INDEX user_saved_item_user_idx
  ON public.user_saved_item (user_profile_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER user_saved_item_set_updated_at
  BEFORE UPDATE ON public.user_saved_item
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.user_saved_item IS
  'User personalization saves (career_job first). Soft-delete via deleted_at.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.career_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_inquiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_job_select_scoped
  ON public.career_job FOR SELECT TO authenticated
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

CREATE POLICY candidate_profile_select_scoped
  ON public.candidate_profile FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR user_profile_id = auth.uid()
    )
  );

CREATE POLICY career_application_select_scoped
  ON public.career_application FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR applicant_user_id = auth.uid()
    )
  );

CREATE POLICY career_inquiry_select_scoped
  ON public.career_inquiry FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR requested_by_user_id = auth.uid()
    )
  );

CREATE POLICY talent_pool_entry_select_scoped
  ON public.talent_pool_entry FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
  );

CREATE POLICY user_saved_item_select_scoped
  ON public.user_saved_item FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR user_profile_id = auth.uid()
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.career_job FROM anon, authenticated;
REVOKE ALL ON TABLE public.candidate_profile FROM anon, authenticated;
REVOKE ALL ON TABLE public.career_application FROM anon, authenticated;
REVOKE ALL ON TABLE public.career_inquiry FROM anon, authenticated;
REVOKE ALL ON TABLE public.talent_pool_entry FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_saved_item FROM anon, authenticated;

GRANT SELECT ON TABLE public.career_job TO authenticated;
GRANT SELECT ON TABLE public.candidate_profile TO authenticated;
GRANT SELECT ON TABLE public.career_application TO authenticated;
GRANT SELECT ON TABLE public.career_inquiry TO authenticated;
GRANT SELECT ON TABLE public.talent_pool_entry TO authenticated;
GRANT SELECT ON TABLE public.user_saved_item TO authenticated;

GRANT ALL ON TABLE public.career_job TO service_role;
GRANT ALL ON TABLE public.candidate_profile TO service_role;
GRANT ALL ON TABLE public.career_application TO service_role;
GRANT ALL ON TABLE public.career_inquiry TO service_role;
GRANT ALL ON TABLE public.talent_pool_entry TO service_role;
GRANT ALL ON TABLE public.user_saved_item TO service_role;
