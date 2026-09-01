-- =============================================================================
-- LumenX Migration — Homework submissions + PDF attachment link
-- Version: 20260827460000
--
-- Adds teacher-verified offline submission tracking and optional PDF attachment.
-- Students/parents do not submit online; teachers mark submitted/missing in app.
-- =============================================================================

ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS attachment_asset_id uuid NULL;

ALTER TABLE public.homework
  ADD CONSTRAINT homework_attachment_asset_fkey
  FOREIGN KEY (attachment_asset_id, institute_id)
  REFERENCES public.stored_asset (id, institute_id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.homework.attachment_asset_id IS
  'Optional PDF worksheet attached by teacher (stored_asset in generated-documents).';

CREATE TABLE public.homework_submission (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  homework_id         uuid NOT NULL,
  student_id          uuid NOT NULL,
  enrollment_id       uuid NOT NULL,
  status              text NOT NULL,
  marked_at           timestamptz NULL,
  marked_by_user_id   uuid NULL REFERENCES public.user_profile (id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT homework_submission_status_check CHECK (
    status IN ('missing', 'submitted')
  ),
  CONSTRAINT homework_submission_homework_fkey
    FOREIGN KEY (homework_id, institute_id)
    REFERENCES public.homework (id, institute_id),
  CONSTRAINT homework_submission_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT homework_submission_homework_enrollment_key UNIQUE (homework_id, enrollment_id)
);

CREATE INDEX homework_submission_homework_idx
  ON public.homework_submission (homework_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_submission_student_idx
  ON public.homework_submission (institute_id, student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER homework_submission_set_updated_at
  BEFORE UPDATE ON public.homework_submission
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.homework_submission IS
  'Teacher-marked offline submission status per enrolled student. Seeded on publish.';

ALTER TABLE public.homework_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY homework_submission_select_scoped
  ON public.homework_submission FOR SELECT TO authenticated
  USING (public.is_staff_of_institute(institute_id));

REVOKE ALL ON TABLE public.homework_submission FROM anon, authenticated;
GRANT SELECT ON TABLE public.homework_submission TO authenticated;
GRANT ALL ON TABLE public.homework_submission TO service_role;
