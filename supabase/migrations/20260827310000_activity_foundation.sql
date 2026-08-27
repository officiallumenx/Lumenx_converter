-- =============================================================================
-- LumenX Migration 032 — Activity / Sports / ECA foundation
-- Version: 20260827310000
--
-- Tables (exactly 5 — step 6.3 / blueprint V2 Activity core):
--   activity_section
--   activity_team
--   activity_membership
--   achievement
--   practice_session
--
-- Out of scope (defer — deep sports satellites):
--   match_result, tournament, coach_note, sports_attendance,
--   team_selection, equipment, venue, medical_fitness,
--   activity_calendar_event, Storage media, notification fan-out
--
-- Model:
--   activity_section (sport / ECA activity)
--     └─ activity_team (team | group)
--          ├─ activity_membership → student
--          └─ practice_session
--   achievement → student (+ optional section/team)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. activity_section
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_section (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  domain                  text NOT NULL,
  sports_category         text NULL,
  name                    text NOT NULL,
  slug                    text NOT NULL,
  description             text NULL,
  status                  text NOT NULL DEFAULT 'draft',

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT activity_section_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT activity_section_slug_check CHECK (char_length(trim(slug)) >= 1),
  CONSTRAINT activity_section_domain_check CHECK (
    domain IN ('sports', 'eca')
  ),
  CONSTRAINT activity_section_sports_category_check CHECK (
    (domain = 'sports' AND sports_category IN ('indoor', 'outdoor'))
    OR (domain = 'eca' AND sports_category IS NULL)
  ),
  CONSTRAINT activity_section_status_check CHECK (
    status IN ('draft', 'active', 'archived')
  ),

  CONSTRAINT activity_section_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX activity_section_institute_slug_uidx
  ON public.activity_section (institute_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_section_institute_status_idx
  ON public.activity_section (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_section_institute_domain_idx
  ON public.activity_section (institute_id, domain)
  WHERE deleted_at IS NULL;

CREATE TRIGGER activity_section_set_updated_at
  BEFORE UPDATE ON public.activity_section
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.activity_section IS
  'Sport or ECA activity container. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. activity_team
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_team (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  section_id              uuid NOT NULL,

  kind                    text NOT NULL,
  name                    text NOT NULL,
  status                  text NOT NULL DEFAULT 'active',

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT activity_team_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT activity_team_kind_check CHECK (
    kind IN ('team', 'group')
  ),
  CONSTRAINT activity_team_status_check CHECK (
    status IN ('active', 'archived')
  ),

  CONSTRAINT activity_team_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT activity_team_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.activity_section (id, institute_id)
);

CREATE INDEX activity_team_section_idx
  ON public.activity_team (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_team_institute_status_idx
  ON public.activity_team (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER activity_team_set_updated_at
  BEFORE UPDATE ON public.activity_team
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.activity_team IS
  'Team (sports) or Group (ECA) under an activity_section.';

-- -----------------------------------------------------------------------------
-- 3. activity_membership
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_membership (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  team_id                 uuid NOT NULL,
  student_id              uuid NOT NULL,

  role                    text NOT NULL DEFAULT 'member',
  status                  text NOT NULL DEFAULT 'active',
  joined_at               timestamptz NOT NULL DEFAULT now(),

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT activity_membership_role_check CHECK (
    role IN ('member', 'captain', 'coach_assist')
  ),
  CONSTRAINT activity_membership_status_check CHECK (
    status IN ('active', 'left')
  ),

  CONSTRAINT activity_membership_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT activity_membership_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id),

  CONSTRAINT activity_membership_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE UNIQUE INDEX activity_membership_team_student_uidx
  ON public.activity_membership (team_id, student_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX activity_membership_student_idx
  ON public.activity_membership (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_membership_team_idx
  ON public.activity_membership (team_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER activity_membership_set_updated_at
  BEFORE UPDATE ON public.activity_membership
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.activity_membership IS
  'Student roster entry on an activity_team.';

-- -----------------------------------------------------------------------------
-- 4. achievement
-- -----------------------------------------------------------------------------
CREATE TABLE public.achievement (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  student_id              uuid NOT NULL,
  section_id              uuid NULL,
  team_id                 uuid NULL,

  title                   text NOT NULL,
  kind                    text NOT NULL DEFAULT 'award',
  awarded_on              date NOT NULL,
  notes                   text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT achievement_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT achievement_kind_check CHECK (
    kind IN ('award', 'certificate', 'participation', 'other')
  ),

  CONSTRAINT achievement_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT achievement_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT achievement_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.activity_section (id, institute_id),

  CONSTRAINT achievement_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id)
);

CREATE INDEX achievement_student_idx
  ON public.achievement (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX achievement_institute_awarded_idx
  ON public.achievement (institute_id, awarded_on)
  WHERE deleted_at IS NULL;

CREATE TRIGGER achievement_set_updated_at
  BEFORE UPDATE ON public.achievement
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.achievement IS
  'Student activity achievement / award record.';

-- -----------------------------------------------------------------------------
-- 5. practice_session
-- -----------------------------------------------------------------------------
CREATE TABLE public.practice_session (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  team_id                 uuid NOT NULL,

  title                   text NOT NULL,
  scheduled_on            date NOT NULL,
  start_time              time NULL,
  end_time                time NULL,
  location                text NULL,
  notes                   text NULL,
  status                  text NOT NULL DEFAULT 'scheduled',

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT practice_session_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT practice_session_status_check CHECK (
    status IN ('scheduled', 'completed', 'cancelled')
  ),

  CONSTRAINT practice_session_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT practice_session_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id)
);

CREATE INDEX practice_session_team_idx
  ON public.practice_session (team_id)
  WHERE deleted_at IS NULL;

CREATE INDEX practice_session_institute_date_idx
  ON public.practice_session (institute_id, scheduled_on)
  WHERE deleted_at IS NULL;

CREATE TRIGGER practice_session_set_updated_at
  BEFORE UPDATE ON public.practice_session
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.practice_session IS
  'Practice / training session for an activity_team.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.activity_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_section_select_scoped
  ON public.activity_section FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        status IN ('active', 'archived')
        AND public.is_institute_member(institute_id)
      )
    )
  );

CREATE POLICY activity_team_select_scoped
  ON public.activity_team FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        public.is_institute_member(institute_id)
        AND EXISTS (
          SELECT 1
          FROM public.activity_section s
          WHERE s.id = activity_team.section_id
            AND s.institute_id = activity_team.institute_id
            AND s.deleted_at IS NULL
            AND s.status IN ('active', 'archived')
        )
      )
    )
  );

CREATE POLICY activity_membership_select_scoped
  ON public.activity_membership FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY achievement_select_scoped
  ON public.achievement FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY practice_session_select_scoped
  ON public.practice_session FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        public.is_institute_member(institute_id)
        AND EXISTS (
          SELECT 1
          FROM public.activity_team t
          JOIN public.activity_section s
            ON s.id = t.section_id
           AND s.institute_id = t.institute_id
          WHERE t.id = practice_session.team_id
            AND t.institute_id = practice_session.institute_id
            AND t.deleted_at IS NULL
            AND s.deleted_at IS NULL
            AND s.status IN ('active', 'archived')
        )
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.activity_section FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_team FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_membership FROM anon, authenticated;
REVOKE ALL ON TABLE public.achievement FROM anon, authenticated;
REVOKE ALL ON TABLE public.practice_session FROM anon, authenticated;

GRANT SELECT ON TABLE public.activity_section TO authenticated;
GRANT SELECT ON TABLE public.activity_team TO authenticated;
GRANT SELECT ON TABLE public.activity_membership TO authenticated;
GRANT SELECT ON TABLE public.achievement TO authenticated;
GRANT SELECT ON TABLE public.practice_session TO authenticated;

GRANT ALL ON TABLE public.activity_section TO service_role;
GRANT ALL ON TABLE public.activity_team TO service_role;
GRANT ALL ON TABLE public.activity_membership TO service_role;
GRANT ALL ON TABLE public.achievement TO service_role;
GRANT ALL ON TABLE public.practice_session TO service_role;
