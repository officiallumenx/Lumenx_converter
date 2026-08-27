-- =============================================================================
-- LumenX Migration 020 — Leave foundation
-- Version: 20260827220000
--
-- Tables (exactly 2 — step 4.2 / blueprint V1.5):
--   leave_request
--   leave_decision
--
-- Out of scope (defer):
--   leave balances/quotas, attendance auto-apply on approve,
--   notifications/outbox, class-teacher-only decide, demo seeds
--
-- Model:
--   institute → leave_request (student | teacher subject)
--   leave_request → leave_decision (0..1; written on decide)
--
-- Product:
--   Parent applies student leave → teacher/admin decide
--   Teacher applies own leave → admin/principal decide
--   Cancel only while pending (requester / linked parent / self teacher)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. leave_request
-- -----------------------------------------------------------------------------
CREATE TABLE public.leave_request (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  subject_kind            text NOT NULL,
  student_id              uuid NULL,
  teacher_id              uuid NULL,
  requested_by_user_id    uuid NOT NULL REFERENCES public.user_profile (id),

  leave_type              text NOT NULL,
  intended_approver_role  text NULL,

  start_date              date NOT NULL,
  end_date                date NOT NULL,
  reason                  text NOT NULL,
  status                  text NOT NULL DEFAULT 'pending',

  -- Optional enrollment snapshot for student leave (all-or-none)
  academic_year_id        uuid NULL,
  class_id                uuid NULL,
  section_id              uuid NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT leave_request_subject_kind_check CHECK (
    subject_kind IN ('student', 'teacher')
  ),
  CONSTRAINT leave_request_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'ignored', 'cancelled')
  ),
  CONSTRAINT leave_request_dates_check CHECK (end_date >= start_date),
  CONSTRAINT leave_request_reason_check CHECK (char_length(trim(reason)) >= 1),
  CONSTRAINT leave_request_leave_type_check CHECK (
    (subject_kind = 'student' AND leave_type = 'general')
    OR (
      subject_kind = 'teacher'
      AND leave_type IN ('sick', 'casual', 'emergency', 'permission')
    )
  ),
  CONSTRAINT leave_request_subject_refs_check CHECK (
    (subject_kind = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL)
    OR (subject_kind = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL)
  ),
  CONSTRAINT leave_request_approver_check CHECK (
    (subject_kind = 'student' AND intended_approver_role IS NULL)
    OR (
      subject_kind = 'teacher'
      AND intended_approver_role IN ('institute_admin', 'principal')
    )
  ),
  CONSTRAINT leave_request_section_all_or_none_check CHECK (
    (
      academic_year_id IS NULL
      AND class_id IS NULL
      AND section_id IS NULL
    )
    OR (
      academic_year_id IS NOT NULL
      AND class_id IS NOT NULL
      AND section_id IS NOT NULL
    )
  ),

  CONSTRAINT leave_request_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT leave_request_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT leave_request_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id),

  CONSTRAINT leave_request_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id)
);

CREATE INDEX leave_request_institute_id_idx
  ON public.leave_request (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX leave_request_institute_status_idx
  ON public.leave_request (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX leave_request_student_id_idx
  ON public.leave_request (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE INDEX leave_request_teacher_id_idx
  ON public.leave_request (teacher_id)
  WHERE deleted_at IS NULL AND teacher_id IS NOT NULL;

CREATE INDEX leave_request_requested_by_idx
  ON public.leave_request (requested_by_user_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER leave_request_set_updated_at
  BEFORE UPDATE ON public.leave_request
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.leave_request IS
  'Student or teacher leave application. Soft-delete via deleted_at. Decision lives in leave_decision.';

COMMENT ON COLUMN public.leave_request.subject_kind IS
  'student = parent/guardian (or staff) applies for a learner; teacher = staff applies for self.';

COMMENT ON COLUMN public.leave_request.intended_approver_role IS
  'Teacher leave routing hint: institute_admin | principal. Null for student leave.';

COMMENT ON COLUMN public.leave_request.status IS
  'pending | approved | rejected | ignored | cancelled. Terminal statuses set by decide/cancel.';

-- -----------------------------------------------------------------------------
-- 2. leave_decision
-- -----------------------------------------------------------------------------
CREATE TABLE public.leave_decision (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  leave_request_id        uuid NOT NULL,

  outcome                 text NOT NULL,
  note                    text NULL,
  decided_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),
  decided_at              timestamptz NOT NULL DEFAULT now(),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leave_decision_outcome_check CHECK (
    outcome IN ('approved', 'rejected', 'ignored')
  ),

  CONSTRAINT leave_decision_leave_request_uidx UNIQUE (leave_request_id),

  CONSTRAINT leave_decision_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT leave_decision_request_institute_fkey
    FOREIGN KEY (leave_request_id, institute_id)
    REFERENCES public.leave_request (id, institute_id)
);

CREATE INDEX leave_decision_institute_id_idx
  ON public.leave_decision (institute_id);

CREATE INDEX leave_decision_decided_by_idx
  ON public.leave_decision (decided_by_user_id);

CREATE TRIGGER leave_decision_set_updated_at
  BEFORE UPDATE ON public.leave_decision
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.leave_decision IS
  'Single decision per leave_request (approve/reject/ignore). Written by Hono on decide.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.leave_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_decision ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_request_select_scoped
  ON public.leave_request FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
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
          WHERE t.id = leave_request.teacher_id
            AND t.institute_id = leave_request.institute_id
            AND t.user_profile_id = auth.uid()
            AND t.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY leave_decision_select_scoped
  ON public.leave_decision FOR SELECT TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR EXISTS (
      SELECT 1
      FROM public.leave_request lr
      WHERE lr.id = leave_decision.leave_request_id
        AND lr.institute_id = leave_decision.institute_id
        AND lr.deleted_at IS NULL
        AND (
          lr.requested_by_user_id = auth.uid()
          OR (
            lr.student_id IS NOT NULL
            AND (
              public.is_own_student_row(lr.student_id)
              OR public.is_guardian_of_student(lr.student_id)
            )
          )
          OR (
            lr.teacher_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.teacher t
              WHERE t.id = lr.teacher_id
                AND t.institute_id = lr.institute_id
                AND t.user_profile_id = auth.uid()
                AND t.deleted_at IS NULL
            )
          )
        )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.leave_request FROM anon, authenticated;
REVOKE ALL ON TABLE public.leave_decision FROM anon, authenticated;

GRANT SELECT ON TABLE public.leave_request TO authenticated;
GRANT SELECT ON TABLE public.leave_decision TO authenticated;

GRANT ALL ON TABLE public.leave_request TO service_role;
GRANT ALL ON TABLE public.leave_decision TO service_role;
