-- =============================================================================
-- LumenX Migration 029 — Certificates (issued ledger) foundation
-- Version: 20260827280000
--
-- Tables (exactly 1 — step 5.2 / blueprint Documents triad completion):
--   issued_certificate
--
-- Completes Documents/certificates budget with 5.1:
--   template + generated_document + issued_certificate
--
-- Out of scope (defer):
--   public anonymous verify page, Storage/PDF bytes, numbering format
--   settings table, batch issue jobs, Nexus catalog sync
--
-- Model:
--   published certificate generated_document → issue → immutable ledger row
--   Revoke is the only post-issue mutation (status flip + audit fields)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.issued_certificate (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),

  generated_document_id     uuid NULL,
  template_id               uuid NOT NULL REFERENCES public.template (id),

  student_id                uuid NULL,
  teacher_id                uuid NULL,

  certificate_number        text NOT NULL,
  sequence                  integer NOT NULL,
  year                      integer NOT NULL,

  title                     text NOT NULL,
  category                  text NULL,
  template_name             text NOT NULL,
  template_version          integer NOT NULL DEFAULT 1,

  recipient_name            text NOT NULL,
  recipient_ref             text NULL,

  status                    text NOT NULL DEFAULT 'issued',
  issued_at                 timestamptz NOT NULL DEFAULT now(),
  issued_by_user_id         uuid NOT NULL REFERENCES public.user_profile (id),

  revoked_at                timestamptz NULL,
  revoked_by_user_id        uuid NULL REFERENCES public.user_profile (id),
  revoke_reason             text NULL,

  asset_path                text NULL,
  file_kind                 text NULL,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT issued_certificate_number_check CHECK (
    char_length(trim(certificate_number)) >= 1
  ),
  CONSTRAINT issued_certificate_title_check CHECK (
    char_length(trim(title)) >= 1
  ),
  CONSTRAINT issued_certificate_recipient_check CHECK (
    char_length(trim(recipient_name)) >= 1
  ),
  CONSTRAINT issued_certificate_template_name_check CHECK (
    char_length(trim(template_name)) >= 1
  ),
  CONSTRAINT issued_certificate_sequence_check CHECK (sequence >= 1),
  CONSTRAINT issued_certificate_year_check CHECK (
    year >= 2000 AND year <= 2100
  ),
  CONSTRAINT issued_certificate_template_version_check CHECK (
    template_version >= 1
  ),
  CONSTRAINT issued_certificate_status_check CHECK (
    status IN ('issued', 'revoked', 'superseded')
  ),
  CONSTRAINT issued_certificate_file_kind_check CHECK (
    file_kind IS NULL OR file_kind IN ('pdf', 'html', 'pptx')
  ),
  CONSTRAINT issued_certificate_revoke_consistency CHECK (
    (status = 'issued' AND revoked_at IS NULL AND revoke_reason IS NULL)
    OR (status IN ('revoked', 'superseded'))
  ),

  CONSTRAINT issued_certificate_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT issued_certificate_generated_document_fkey
    FOREIGN KEY (generated_document_id, institute_id)
    REFERENCES public.generated_document (id, institute_id),

  CONSTRAINT issued_certificate_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT issued_certificate_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

-- One live certificate number per institute
CREATE UNIQUE INDEX issued_certificate_institute_number_uidx
  ON public.issued_certificate (institute_id, certificate_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX issued_certificate_generated_document_uidx
  ON public.issued_certificate (generated_document_id)
  WHERE deleted_at IS NULL AND generated_document_id IS NOT NULL;

CREATE INDEX issued_certificate_institute_id_idx
  ON public.issued_certificate (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX issued_certificate_student_id_idx
  ON public.issued_certificate (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE INDEX issued_certificate_status_idx
  ON public.issued_certificate (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX issued_certificate_year_seq_idx
  ON public.issued_certificate (institute_id, year, sequence)
  WHERE deleted_at IS NULL;

CREATE TRIGGER issued_certificate_set_updated_at
  BEFORE UPDATE ON public.issued_certificate
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.issued_certificate IS
  'Immutable certificate number ledger. Issue once; revoke/supersede only. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.issued_certificate.certificate_number IS
  'Institute-unique issued number. Immutable after insert.';

COMMENT ON COLUMN public.issued_certificate.generated_document_id IS
  'Optional link to published certificate generated_document (at most one live issue).';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.issued_certificate ENABLE ROW LEVEL SECURITY;

CREATE POLICY issued_certificate_select_scoped
  ON public.issued_certificate FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        status = 'issued'
        AND student_id IS NOT NULL
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.issued_certificate FROM anon, authenticated;

GRANT SELECT ON TABLE public.issued_certificate TO authenticated;
GRANT ALL ON TABLE public.issued_certificate TO service_role;
