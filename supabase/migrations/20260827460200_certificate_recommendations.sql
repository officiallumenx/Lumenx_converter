-- =============================================================================
-- LumenX Migration — Certificate recommendations (Activity → Admin queue)
-- Version: 20260827460200
-- =============================================================================

CREATE TABLE public.certificate_recommendation (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),

  achievement_id        text NULL,
  achievement_title     text NOT NULL,
  achievement_type      text NOT NULL,

  student_id            uuid NOT NULL,
  student_name          text NOT NULL,
  student_class_label   text NULL,

  recommended_by_user_id uuid NULL REFERENCES public.user_profile (id),
  recommended_by_name   text NOT NULL DEFAULT 'Activity Teacher',
  note                  text NULL,

  status                text NOT NULL DEFAULT 'pending',
  issued_certificate_id uuid NULL,
  issued_at             timestamptz NULL,
  dismissed_at          timestamptz NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT certificate_recommendation_title_check CHECK (
    char_length(trim(achievement_title)) >= 1
  ),
  CONSTRAINT certificate_recommendation_type_check CHECK (
    char_length(trim(achievement_type)) >= 1
  ),
  CONSTRAINT certificate_recommendation_student_name_check CHECK (
    char_length(trim(student_name)) >= 1
  ),
  CONSTRAINT certificate_recommendation_status_check CHECK (
    status IN ('pending', 'issued', 'dismissed')
  ),
  CONSTRAINT certificate_recommendation_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT certificate_recommendation_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT certificate_recommendation_issued_certificate_fkey
    FOREIGN KEY (issued_certificate_id, institute_id)
    REFERENCES public.issued_certificate (id, institute_id)
);

CREATE INDEX certificate_recommendation_institute_status_idx
  ON public.certificate_recommendation (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX certificate_recommendation_student_idx
  ON public.certificate_recommendation (student_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX certificate_recommendation_pending_achievement_uidx
  ON public.certificate_recommendation (institute_id, achievement_id)
  WHERE deleted_at IS NULL
    AND status = 'pending'
    AND achievement_id IS NOT NULL;

CREATE TRIGGER certificate_recommendation_set_updated_at
  BEFORE UPDATE ON public.certificate_recommendation
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.certificate_recommendation IS
  'Activity teacher recommendations for admin certificate issuance.';

ALTER TABLE public.certificate_recommendation ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificate_recommendation_select_scoped
  ON public.certificate_recommendation FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
  );

REVOKE ALL ON TABLE public.certificate_recommendation FROM anon, authenticated;
GRANT SELECT ON TABLE public.certificate_recommendation TO authenticated;
GRANT ALL ON TABLE public.certificate_recommendation TO service_role;
