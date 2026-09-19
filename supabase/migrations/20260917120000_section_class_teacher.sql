-- Section class-teacher link for Admin onboard → Connect portal.
-- One active class teacher per section (nullable until assigned).

ALTER TABLE public.section
  ADD COLUMN IF NOT EXISTS class_teacher_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'section_class_teacher_institute_fkey'
  ) THEN
    ALTER TABLE public.section
      ADD CONSTRAINT section_class_teacher_institute_fkey
      FOREIGN KEY (class_teacher_id, institute_id)
      REFERENCES public.teacher (id, institute_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS section_class_teacher_id_idx
  ON public.section (class_teacher_id)
  WHERE deleted_at IS NULL AND class_teacher_id IS NOT NULL;

COMMENT ON COLUMN public.section.class_teacher_id IS
  'Homeroom / class teacher for this section. Set on Admin teacher onboard or section edit. Connect uses this for isClassTeacher.';
