-- =============================================================================
-- LumenX Migration — Activity / Sports V2 satellite tables
-- Version: 20260905120000
--
-- Tables (10 — deep sports satellites deferred from 20260827310000):
--   venue
--   equipment
--   tournament
--   match_result
--   coach_note
--   sports_attendance
--   team_selection
--   team_selection_member
--   medical_fitness
--   activity_calendar_event
--
-- Model:
--   venue               — standalone facility
--   equipment           — standalone inventory
--   tournament          — optional link to activity_section + venue
--     └─ match_result   — per-match results
--   coach_note          — per-team (+ optional student)
--   sports_attendance   — per-team session roll-call
--   team_selection      — squad picks
--     └─ team_selection_member
--   medical_fitness     — per-student clearance
--   activity_calendar_event — cross-cutting calendar
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. venue
-- -----------------------------------------------------------------------------
CREATE TABLE public.venue (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  name                    text NOT NULL,
  venue_type              text NULL,
  location_notes          text NULL,
  capacity                integer NULL,
  status                  text NOT NULL DEFAULT 'active',

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT venue_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT venue_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT venue_capacity_check CHECK (capacity IS NULL OR capacity >= 0),

  CONSTRAINT venue_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX venue_institute_status_idx
  ON public.venue (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER venue_set_updated_at
  BEFORE UPDATE ON public.venue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.venue IS 'Sports / activity facility. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. equipment
-- -----------------------------------------------------------------------------
CREATE TABLE public.equipment (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  name                    text NOT NULL,
  category                text NULL,
  quantity                integer NOT NULL DEFAULT 1,
  condition               text NOT NULL DEFAULT 'good',
  status                  text NOT NULL DEFAULT 'active',
  notes                   text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT equipment_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT equipment_condition_check CHECK (
    condition IN ('good', 'fair', 'poor', 'retired')
  ),
  CONSTRAINT equipment_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT equipment_quantity_check CHECK (quantity >= 0),

  CONSTRAINT equipment_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX equipment_institute_status_idx
  ON public.equipment (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER equipment_set_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.equipment IS 'Sports / activity equipment inventory. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 3. tournament
-- -----------------------------------------------------------------------------
CREATE TABLE public.tournament (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  section_id              uuid NULL,
  venue_id                uuid NULL,

  name                    text NOT NULL,
  sport_label             text NULL,
  tournament_type         text NULL,
  starts_on               date NULL,
  ends_on                 date NULL,
  status                  text NOT NULL DEFAULT 'draft',
  description             text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT tournament_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT tournament_status_check CHECK (
    status IN ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled', 'archived')
  ),

  CONSTRAINT tournament_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT tournament_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.activity_section (id, institute_id),

  CONSTRAINT tournament_venue_institute_fkey
    FOREIGN KEY (venue_id, institute_id)
    REFERENCES public.venue (id, institute_id)
);

CREATE INDEX tournament_institute_status_idx
  ON public.tournament (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX tournament_section_idx
  ON public.tournament (section_id)
  WHERE deleted_at IS NULL AND section_id IS NOT NULL;

CREATE TRIGGER tournament_set_updated_at
  BEFORE UPDATE ON public.tournament
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.tournament IS 'Tournament / competition container. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 4. match_result
-- -----------------------------------------------------------------------------
CREATE TABLE public.match_result (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  tournament_id           uuid NOT NULL,

  match_label             text NOT NULL,
  played_on               date NULL,
  venue_text              text NULL,
  home_score              integer NULL,
  away_score              integer NULL,
  result_status           text NOT NULL DEFAULT 'scheduled',
  notes                   text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT match_result_label_check CHECK (char_length(trim(match_label)) >= 1),
  CONSTRAINT match_result_status_check CHECK (
    result_status IN ('scheduled', 'completed', 'walkover', 'cancelled')
  ),

  CONSTRAINT match_result_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT match_result_tournament_institute_fkey
    FOREIGN KEY (tournament_id, institute_id)
    REFERENCES public.tournament (id, institute_id)
);

CREATE INDEX match_result_tournament_idx
  ON public.match_result (tournament_id)
  WHERE deleted_at IS NULL;

CREATE INDEX match_result_institute_played_idx
  ON public.match_result (institute_id, played_on)
  WHERE deleted_at IS NULL;

CREATE TRIGGER match_result_set_updated_at
  BEFORE UPDATE ON public.match_result
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.match_result IS 'Individual match result within a tournament.';

-- -----------------------------------------------------------------------------
-- 5. coach_note
-- -----------------------------------------------------------------------------
CREATE TABLE public.coach_note (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  team_id                 uuid NOT NULL,
  student_id              uuid NULL,

  note_date               date NOT NULL,
  body                    text NOT NULL,
  visibility              text NOT NULL DEFAULT 'staff',

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT coach_note_body_check CHECK (char_length(trim(body)) >= 1),
  CONSTRAINT coach_note_visibility_check CHECK (
    visibility IN ('staff', 'guardians')
  ),

  CONSTRAINT coach_note_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT coach_note_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id),

  CONSTRAINT coach_note_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE INDEX coach_note_team_date_idx
  ON public.coach_note (team_id, note_date)
  WHERE deleted_at IS NULL;

CREATE INDEX coach_note_student_idx
  ON public.coach_note (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE TRIGGER coach_note_set_updated_at
  BEFORE UPDATE ON public.coach_note
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.coach_note IS 'Coaching feedback note per team / student.';

-- -----------------------------------------------------------------------------
-- 6. sports_attendance
-- -----------------------------------------------------------------------------
CREATE TABLE public.sports_attendance (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  team_id                 uuid NOT NULL,
  session_on              date NOT NULL,
  student_id              uuid NOT NULL,

  status                  text NOT NULL DEFAULT 'present',
  notes                   text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT sports_attendance_status_check CHECK (
    status IN ('present', 'absent', 'late', 'excused')
  ),

  CONSTRAINT sports_attendance_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT sports_attendance_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id),

  CONSTRAINT sports_attendance_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE UNIQUE INDEX sports_attendance_team_session_student_uidx
  ON public.sports_attendance (team_id, session_on, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX sports_attendance_student_idx
  ON public.sports_attendance (student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER sports_attendance_set_updated_at
  BEFORE UPDATE ON public.sports_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.sports_attendance IS 'Activity / sports session attendance per student.';

-- -----------------------------------------------------------------------------
-- 7. team_selection
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_selection (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  team_id                 uuid NOT NULL,

  title                   text NOT NULL,
  event_on                date NULL,
  venue_text              text NULL,
  status                  text NOT NULL DEFAULT 'draft',
  notes                   text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT team_selection_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT team_selection_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  ),

  CONSTRAINT team_selection_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT team_selection_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id)
);

CREATE INDEX team_selection_team_idx
  ON public.team_selection (team_id)
  WHERE deleted_at IS NULL;

CREATE INDEX team_selection_institute_status_idx
  ON public.team_selection (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER team_selection_set_updated_at
  BEFORE UPDATE ON public.team_selection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.team_selection IS 'Squad / lineup selection for an event or match.';

-- -----------------------------------------------------------------------------
-- 8. team_selection_member
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_selection_member (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  selection_id            uuid NOT NULL,
  student_id              uuid NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT team_selection_member_selection_institute_fkey
    FOREIGN KEY (selection_id, institute_id)
    REFERENCES public.team_selection (id, institute_id),

  CONSTRAINT team_selection_member_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE UNIQUE INDEX team_selection_member_selection_student_uidx
  ON public.team_selection_member (selection_id, student_id);

CREATE INDEX team_selection_member_student_idx
  ON public.team_selection_member (student_id);

COMMENT ON TABLE public.team_selection_member IS 'Student included in a team_selection squad.';

-- -----------------------------------------------------------------------------
-- 9. medical_fitness
-- -----------------------------------------------------------------------------
CREATE TABLE public.medical_fitness (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  student_id              uuid NOT NULL,

  clearance_status        text NOT NULL DEFAULT 'pending',
  valid_until             date NULL,
  notes                   text NULL,
  assessed_on             date NOT NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT medical_fitness_clearance_check CHECK (
    clearance_status IN ('clear', 'restricted', 'unfit', 'pending')
  ),

  CONSTRAINT medical_fitness_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT medical_fitness_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE INDEX medical_fitness_student_idx
  ON public.medical_fitness (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX medical_fitness_institute_clearance_idx
  ON public.medical_fitness (institute_id, clearance_status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER medical_fitness_set_updated_at
  BEFORE UPDATE ON public.medical_fitness
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.medical_fitness IS 'Student sports medical clearance record.';

-- -----------------------------------------------------------------------------
-- 10. activity_calendar_event
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_calendar_event (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  section_id              uuid NULL,
  team_id                 uuid NULL,

  title                   text NOT NULL,
  event_on                date NOT NULL,
  start_time              time NULL,
  end_time                time NULL,
  venue_text              text NULL,
  event_kind              text NOT NULL DEFAULT 'other',
  source_ref              text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT activity_calendar_event_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT activity_calendar_event_kind_check CHECK (
    event_kind IN ('practice', 'match', 'tournament', 'other')
  ),

  CONSTRAINT activity_calendar_event_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT activity_calendar_event_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.activity_section (id, institute_id),

  CONSTRAINT activity_calendar_event_team_institute_fkey
    FOREIGN KEY (team_id, institute_id)
    REFERENCES public.activity_team (id, institute_id)
);

CREATE INDEX activity_calendar_event_institute_date_idx
  ON public.activity_calendar_event (institute_id, event_on)
  WHERE deleted_at IS NULL;

CREATE INDEX activity_calendar_event_team_idx
  ON public.activity_calendar_event (team_id)
  WHERE deleted_at IS NULL AND team_id IS NOT NULL;

CREATE TRIGGER activity_calendar_event_set_updated_at
  BEFORE UPDATE ON public.activity_calendar_event
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.activity_calendar_event IS 'Cross-cutting activity / sports calendar event.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.venue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_selection_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_fitness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_calendar_event ENABLE ROW LEVEL SECURITY;

-- venue: all institute members see active
CREATE POLICY venue_select_scoped
  ON public.venue FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (status = 'active' AND public.is_institute_member(institute_id))
    )
  );

-- equipment: all institute members see active
CREATE POLICY equipment_select_scoped
  ON public.equipment FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (status = 'active' AND public.is_institute_member(institute_id))
    )
  );

-- tournament: staff see all; members see non-draft
CREATE POLICY tournament_select_scoped
  ON public.tournament FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        status NOT IN ('draft')
        AND public.is_institute_member(institute_id)
      )
    )
  );

-- match_result: same as tournament parent
CREATE POLICY match_result_select_scoped
  ON public.match_result FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        public.is_institute_member(institute_id)
        AND EXISTS (
          SELECT 1 FROM public.tournament t
          WHERE t.id = match_result.tournament_id
            AND t.institute_id = match_result.institute_id
            AND t.deleted_at IS NULL
            AND t.status NOT IN ('draft')
        )
      )
    )
  );

-- coach_note: staff always; guardians see visibility='guardians' + own student
CREATE POLICY coach_note_select_scoped
  ON public.coach_note FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        visibility = 'guardians'
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
          OR student_id IS NULL
        )
      )
    )
  );

-- sports_attendance: staff + own student records
CREATE POLICY sports_attendance_select_scoped
  ON public.sports_attendance FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

-- team_selection: staff see all; members see published
CREATE POLICY team_selection_select_scoped
  ON public.team_selection FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (status = 'published' AND public.is_institute_member(institute_id))
    )
  );

-- team_selection_member: visible when parent selection is visible
CREATE POLICY team_selection_member_select_scoped
  ON public.team_selection_member FOR SELECT TO authenticated
  USING (
    public.is_platform_operator()
    OR EXISTS (
      SELECT 1 FROM public.team_selection ts
      WHERE ts.id = team_selection_member.selection_id
        AND ts.institute_id = team_selection_member.institute_id
        AND ts.deleted_at IS NULL
        AND (
          public.is_staff_of_institute(ts.institute_id)
          OR (ts.status = 'published' AND public.is_institute_member(ts.institute_id))
        )
    )
  );

-- medical_fitness: staff + own student records
CREATE POLICY medical_fitness_select_scoped
  ON public.medical_fitness FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

-- activity_calendar_event: all institute members
CREATE POLICY activity_calendar_event_select_scoped
  ON public.activity_calendar_event FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_institute_member(institute_id)
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.venue FROM anon, authenticated;
REVOKE ALL ON TABLE public.equipment FROM anon, authenticated;
REVOKE ALL ON TABLE public.tournament FROM anon, authenticated;
REVOKE ALL ON TABLE public.match_result FROM anon, authenticated;
REVOKE ALL ON TABLE public.coach_note FROM anon, authenticated;
REVOKE ALL ON TABLE public.sports_attendance FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_selection FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_selection_member FROM anon, authenticated;
REVOKE ALL ON TABLE public.medical_fitness FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_calendar_event FROM anon, authenticated;

GRANT SELECT ON TABLE public.venue TO authenticated;
GRANT SELECT ON TABLE public.equipment TO authenticated;
GRANT SELECT ON TABLE public.tournament TO authenticated;
GRANT SELECT ON TABLE public.match_result TO authenticated;
GRANT SELECT ON TABLE public.coach_note TO authenticated;
GRANT SELECT ON TABLE public.sports_attendance TO authenticated;
GRANT SELECT ON TABLE public.team_selection TO authenticated;
GRANT SELECT ON TABLE public.team_selection_member TO authenticated;
GRANT SELECT ON TABLE public.medical_fitness TO authenticated;
GRANT SELECT ON TABLE public.activity_calendar_event TO authenticated;

GRANT ALL ON TABLE public.venue TO service_role;
GRANT ALL ON TABLE public.equipment TO service_role;
GRANT ALL ON TABLE public.tournament TO service_role;
GRANT ALL ON TABLE public.match_result TO service_role;
GRANT ALL ON TABLE public.coach_note TO service_role;
GRANT ALL ON TABLE public.sports_attendance TO service_role;
GRANT ALL ON TABLE public.team_selection TO service_role;
GRANT ALL ON TABLE public.team_selection_member TO service_role;
GRANT ALL ON TABLE public.medical_fitness TO service_role;
GRANT ALL ON TABLE public.activity_calendar_event TO service_role;
