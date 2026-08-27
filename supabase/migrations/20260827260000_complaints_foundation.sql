-- =============================================================================
-- LumenX Migration 026 — Complaints foundation
-- Version: 20260827260000
--
-- Tables (exactly 1 — step 4.6 / blueprint entity Complaint):
--   complaint
--
-- Out of scope (defer):
--   complaint comments/attachments, SLA timers, Nexus support threads,
--   notification fan-out, multi-assignee inbox
--
-- Model:
--   Parent/student/teacher submit → destination triage → resolve/reject/close
--   Unified status covers Admin triage + teacher portal lifecycle
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.complaint (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  title                   text NOT NULL,
  body                    text NOT NULL,
  category                text NOT NULL,
  priority                text NOT NULL DEFAULT 'medium',
  status                  text NOT NULL DEFAULT 'pending',
  destination             text NULL,

  requested_by_user_id    uuid NOT NULL REFERENCES public.user_profile (id),
  student_id              uuid NULL,
  teacher_id              uuid NULL,

  response_note           text NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT complaint_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT complaint_body_check CHECK (char_length(trim(body)) >= 1),
  CONSTRAINT complaint_category_check CHECK (char_length(trim(category)) >= 1),
  CONSTRAINT complaint_priority_check CHECK (
    priority IN ('low', 'medium', 'high')
  ),
  CONSTRAINT complaint_status_check CHECK (
    status IN (
      'draft',
      'pending',
      'review',
      'forwarded',
      'resolved',
      'rejected',
      'closed',
      'archived'
    )
  ),
  CONSTRAINT complaint_destination_check CHECK (
    destination IS NULL
    OR destination IN ('class_teacher', 'principal_admin')
  ),
  CONSTRAINT complaint_destination_required_when_open CHECK (
    status = 'draft'
    OR destination IS NOT NULL
  ),

  CONSTRAINT complaint_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT complaint_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT complaint_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE INDEX complaint_institute_id_idx
  ON public.complaint (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX complaint_institute_status_idx
  ON public.complaint (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX complaint_requested_by_idx
  ON public.complaint (requested_by_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX complaint_student_id_idx
  ON public.complaint (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE INDEX complaint_destination_idx
  ON public.complaint (institute_id, destination)
  WHERE deleted_at IS NULL AND destination IS NOT NULL;

CREATE TRIGGER complaint_set_updated_at
  BEFORE UPDATE ON public.complaint
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.complaint IS
  'Institute complaint case. Admin triage + Connect submit/track. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.complaint.status IS
  'draft|pending|review|forwarded|resolved|rejected|closed|archived — unified Admin+teacher lifecycle.';

COMMENT ON COLUMN public.complaint.destination IS
  'class_teacher | principal_admin. Required when status is not draft.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.complaint ENABLE ROW LEVEL SECURITY;

CREATE POLICY complaint_select_scoped
  ON public.complaint FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.has_institute_role(
        institute_id,
        'institute_admin',
        'principal',
        'vice_principal',
        'coordinator',
        'it_admin',
        'accountant',
        'admissions_officer',
        'staff'
      )
      OR requested_by_user_id = auth.uid()
      OR (
        student_id IS NOT NULL
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
      OR (
        teacher_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.teacher t
          WHERE t.id = complaint.teacher_id
            AND t.institute_id = complaint.institute_id
            AND t.user_profile_id = auth.uid()
            AND t.deleted_at IS NULL
        )
      )
      OR (
        destination = 'class_teacher'
        AND status <> 'draft'
        AND public.has_institute_role(institute_id, 'teacher')
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.complaint FROM anon, authenticated;

GRANT SELECT ON TABLE public.complaint TO authenticated;
GRANT ALL ON TABLE public.complaint TO service_role;
