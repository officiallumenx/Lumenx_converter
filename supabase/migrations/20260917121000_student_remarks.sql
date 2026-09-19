-- Student remarks (Connect teacher → parent/admin visibility).
-- Additive only. Writes via LumenX API (service_role); authenticated SELECT scoped by institute.

CREATE TABLE IF NOT EXISTS public.student_remark (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),
  student_id            uuid NOT NULL,
  author_teacher_id     uuid NOT NULL,
  author_user_id        uuid NOT NULL REFERENCES public.user_profile (id),
  remark_type           text NOT NULL,
  body                  text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,

  CONSTRAINT student_remark_type_check CHECK (
    remark_type IN ('academic', 'behaviour', 'improvement', 'parent_note')
  ),
  CONSTRAINT student_remark_body_check CHECK (char_length(trim(body)) >= 8),
  CONSTRAINT student_remark_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT student_remark_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),
  CONSTRAINT student_remark_teacher_institute_fkey
    FOREIGN KEY (author_teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE INDEX IF NOT EXISTS student_remark_institute_id_idx
  ON public.student_remark (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS student_remark_institute_student_idx
  ON public.student_remark (institute_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS student_remark_institute_author_idx
  ON public.student_remark (institute_id, author_teacher_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS student_remark_set_updated_at ON public.student_remark;
CREATE TRIGGER student_remark_set_updated_at
  BEFORE UPDATE ON public.student_remark
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student_remark IS
  'Teacher remarks on a student. Visible to teacher/parent/admin surfaces; never to students.';

ALTER TABLE public.student_remark ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_remark_select_scoped ON public.student_remark;
CREATE POLICY student_remark_select_scoped
  ON public.student_remark
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_guardian_of_student(student_id)
      OR author_user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.student_remark FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.student_remark TO authenticated;
GRANT ALL ON TABLE public.student_remark TO service_role;
