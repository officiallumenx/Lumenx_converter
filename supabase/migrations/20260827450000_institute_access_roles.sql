-- =============================================================================
-- LumenX Migration — Institute access roles + module ACL + staff assignments
-- Version: 20260827450000
--
-- Tables:
--   institute_access_role
--   institute_access_role_permission
--   membership_access_assignment
-- =============================================================================

CREATE TABLE public.institute_access_role (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id  uuid NOT NULL REFERENCES public.institute (id),
  name          text NOT NULL,
  scope         text NOT NULL DEFAULT '',
  description   text NULL,
  is_system     boolean NOT NULL DEFAULT false,
  system_key    text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL
);

CREATE INDEX institute_access_role_institute_idx
  ON public.institute_access_role (institute_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX institute_access_role_institute_system_key_uidx
  ON public.institute_access_role (institute_id, system_key)
  WHERE system_key IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER institute_access_role_set_updated_at
  BEFORE UPDATE ON public.institute_access_role
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.institute_access_role IS
  'Institute-scoped Admin access roles. System rows are seeded; custom rows are admin-defined.';

-- ---------------------------------------------------------------------------
CREATE TABLE public.institute_access_role_permission (
  access_role_id uuid NOT NULL REFERENCES public.institute_access_role (id) ON DELETE CASCADE,
  module_route   text NOT NULL,
  permission     text NOT NULL,

  PRIMARY KEY (access_role_id, module_route),

  CONSTRAINT institute_access_role_permission_check CHECK (
    permission IN ('full', 'read', 'none')
  )
);

CREATE INDEX institute_access_role_permission_route_idx
  ON public.institute_access_role_permission (module_route);

COMMENT ON TABLE public.institute_access_role_permission IS
  'Module ACL matrix (route → full|read|none) for an institute access role.';

-- ---------------------------------------------------------------------------
CREATE TABLE public.membership_access_assignment (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id          uuid NOT NULL REFERENCES public.membership (id) ON DELETE CASCADE,
  institute_id           uuid NOT NULL REFERENCES public.institute (id),
  access_role_id         uuid NOT NULL REFERENCES public.institute_access_role (id),
  linked_teacher_id      uuid NULL REFERENCES public.teacher (id),
  linked_staff_id        uuid NULL REFERENCES public.staff_account (id),
  assigned_section_keys  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz NULL,

  CONSTRAINT membership_access_assignment_person_check CHECK (
    NOT (linked_teacher_id IS NOT NULL AND linked_staff_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX membership_access_assignment_membership_uidx
  ON public.membership_access_assignment (membership_id)
  WHERE deleted_at IS NULL;

CREATE INDEX membership_access_assignment_institute_idx
  ON public.membership_access_assignment (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX membership_access_assignment_role_idx
  ON public.membership_access_assignment (access_role_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER membership_access_assignment_set_updated_at
  BEFORE UPDATE ON public.membership_access_assignment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.membership_access_assignment IS
  'Links a membership to a custom access role and optional teacher/staff directory row.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.institute_access_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_access_role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_access_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY institute_access_role_select_scoped
  ON public.institute_access_role
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY institute_access_role_permission_select_scoped
  ON public.institute_access_role_permission
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.institute_access_role r
      WHERE r.id = access_role_id
        AND r.deleted_at IS NULL
        AND (
          public.is_staff_of_institute(r.institute_id)
          OR public.is_platform_operator()
        )
    )
  );

CREATE POLICY membership_access_assignment_select_scoped
  ON public.membership_access_assignment
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.membership m
        WHERE m.id = membership_id
          AND m.user_id = auth.uid()
          AND m.deleted_at IS NULL
      )
    )
  );

REVOKE ALL ON TABLE public.institute_access_role FROM anon, authenticated;
REVOKE ALL ON TABLE public.institute_access_role_permission FROM anon, authenticated;
REVOKE ALL ON TABLE public.membership_access_assignment FROM anon, authenticated;

GRANT SELECT ON TABLE public.institute_access_role TO authenticated;
GRANT SELECT ON TABLE public.institute_access_role_permission TO authenticated;
GRANT SELECT ON TABLE public.membership_access_assignment TO authenticated;

GRANT ALL ON TABLE public.institute_access_role TO service_role;
GRANT ALL ON TABLE public.institute_access_role_permission TO service_role;
GRANT ALL ON TABLE public.membership_access_assignment TO service_role;
