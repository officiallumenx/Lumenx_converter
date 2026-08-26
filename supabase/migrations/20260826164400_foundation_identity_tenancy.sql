-- =============================================================================
-- Migration 001 — Foundation: identity + tenancy + authorization
-- =============================================================================
-- Tables (exactly 9):
--   institute, institute_settings, user_profile, role, membership,
--   membership_role, platform_role, platform_operator, audit_event
--
-- DO NOT apply domain tables (students, attendance, fees, etc.) in this file.
-- Hono remains the authoritative authorization layer; RLS is defense-in-depth.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- updated_at helper (foundation tables only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. institute
-- ---------------------------------------------------------------------------
CREATE TABLE public.institute (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  name        text NOT NULL,
  kind        text NOT NULL,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL,

  CONSTRAINT institute_code_unique UNIQUE (code),
  CONSTRAINT institute_kind_check CHECK (
    kind IN (
      'school',
      'junior_college',
      'degree_college',
      'engineering',
      'university'
    )
  ),
  CONSTRAINT institute_status_check CHECK (
    status IN ('active', 'inactive', 'suspended', 'archived')
  )
);

CREATE INDEX institute_status_active_idx
  ON public.institute (status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER institute_set_updated_at
  BEFORE UPDATE ON public.institute
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.institute IS
  'Canonical tenant. Runtime FKs use id (UUID) only. Legacy LX-INST-*/ins-* are seed mappings, never FKs.';

-- ---------------------------------------------------------------------------
-- 2. institute_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.institute_settings (
  institute_id uuid PRIMARY KEY REFERENCES public.institute (id),
  timezone     text NOT NULL DEFAULT 'Asia/Kolkata',
  locale       text NOT NULL DEFAULT 'en-IN',
  settings     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER institute_settings_set_updated_at
  BEFORE UPDATE ON public.institute_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. user_profile (1:1 with auth.users — no credentials stored here)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profile (
  id           uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email        text NULL,
  phone        text NULL,
  avatar_url   text NULL,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL,

  CONSTRAINT user_profile_status_check CHECK (
    status IN ('active', 'disabled')
  )
);

CREATE UNIQUE INDEX user_profile_email_lower_uidx
  ON public.user_profile (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX user_profile_phone_idx
  ON public.user_profile (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER user_profile_set_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.user_profile IS
  'Person record linked to auth.users. Passwords/OTP/sessions remain in Auth only.';

-- ---------------------------------------------------------------------------
-- 4. role (institute role catalog — frozen vocabulary)
-- ---------------------------------------------------------------------------
CREATE TABLE public.role (
  code          text PRIMARY KEY,
  label         text NOT NULL,
  description   text NULL,
  is_assignable boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. membership (user × institute)
-- ---------------------------------------------------------------------------
CREATE TABLE public.membership (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.user_profile (id),
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL,

  CONSTRAINT membership_status_check CHECK (
    status IN ('active', 'invited', 'suspended', 'ended')
  )
);

CREATE UNIQUE INDEX membership_user_institute_uidx
  ON public.membership (user_id, institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX membership_institute_id_idx
  ON public.membership (institute_id);

CREATE INDEX membership_user_id_idx
  ON public.membership (user_id);

CREATE TRIGGER membership_set_updated_at
  BEFORE UPDATE ON public.membership
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. membership_role (role-set on membership)
-- ---------------------------------------------------------------------------
CREATE TABLE public.membership_role (
  membership_id uuid NOT NULL REFERENCES public.membership (id) ON DELETE CASCADE,
  role_code     text NOT NULL REFERENCES public.role (code),
  created_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (membership_id, role_code)
);

CREATE INDEX membership_role_role_code_idx
  ON public.membership_role (role_code);

-- ---------------------------------------------------------------------------
-- 7. platform_role (Nexus role catalog — frozen vocabulary)
-- ---------------------------------------------------------------------------
CREATE TABLE public.platform_role (
  code       text PRIMARY KEY,
  label      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. platform_operator (platform principal — never an institute membership)
-- ---------------------------------------------------------------------------
CREATE TABLE public.platform_operator (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.user_profile (id),
  role_code    text NOT NULL REFERENCES public.platform_role (code),
  handle       text NOT NULL,
  display_name text NOT NULL,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz NULL,

  CONSTRAINT platform_operator_user_unique UNIQUE (user_id),
  CONSTRAINT platform_operator_handle_unique UNIQUE (handle),
  CONSTRAINT platform_operator_status_check CHECK (
    status IN ('active', 'invited', 'disabled')
  )
);

CREATE INDEX platform_operator_role_code_idx
  ON public.platform_operator (role_code);

CREATE INDEX platform_operator_status_idx
  ON public.platform_operator (status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER platform_operator_set_updated_at
  BEFORE UPDATE ON public.platform_operator
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.platform_operator IS
  'Nexus platform principal. Separate from institute membership.';

-- ---------------------------------------------------------------------------
-- 9. audit_event (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_event (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         text NOT NULL,
  institute_id  uuid NULL REFERENCES public.institute (id),
  actor_user_id uuid NULL REFERENCES public.user_profile (id),
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audit_event_scope_check CHECK (
    scope IN ('institute', 'platform')
  ),
  CONSTRAINT audit_event_scope_institute_consistency CHECK (
    (scope = 'platform' AND institute_id IS NULL)
    OR (scope = 'institute' AND institute_id IS NOT NULL)
  )
);

CREATE INDEX audit_event_institute_created_idx
  ON public.audit_event (institute_id, created_at DESC);

CREATE INDEX audit_event_actor_created_idx
  ON public.audit_event (actor_user_id, created_at DESC);

CREATE INDEX audit_event_entity_idx
  ON public.audit_event (entity_type, entity_id);

COMMENT ON TABLE public.audit_event IS
  'Append-only audit log. No updated_at / soft-delete. Mutations blocked by trigger + RLS.';

-- Prevent UPDATE/DELETE at the database level (append-only).
CREATE OR REPLACE FUNCTION public.deny_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$;

CREATE TRIGGER audit_event_deny_update
  BEFORE UPDATE ON public.audit_event
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_audit_event_mutation();

CREATE TRIGGER audit_event_deny_delete
  BEFORE DELETE ON public.audit_event
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_audit_event_mutation();

-- =============================================================================
-- Seed: frozen role catalogs ONLY (no demo institutes/users)
-- =============================================================================

INSERT INTO public.role (code, label, description) VALUES
  ('institute_admin',     'Institute Admin',     'Full institute administration'),
  ('principal',           'Principal',           'School principal'),
  ('vice_principal',      'Vice Principal',      'Vice principal'),
  ('coordinator',         'Coordinator',         'Academic/ops coordinator'),
  ('teacher',             'Teacher',             'Teaching faculty'),
  ('accountant',          'Accountant',          'Fees and finance'),
  ('admissions_officer',  'Admissions Officer',  'Admissions staff'),
  ('it_admin',            'IT Admin',            'Institute IT administration'),
  ('parent',              'Parent',              'Parent/guardian portal'),
  ('student',             'Student',             'Student portal'),
  ('driver',              'Driver',              'Transport driver (institute-scoped)'),
  ('staff',               'Staff',               'Generic institute staff');

INSERT INTO public.platform_role (code, label) VALUES
  ('nexus_root',  'Nexus Root'),
  ('operations',  'Operations'),
  ('billing',     'Billing'),
  ('support',     'Support'),
  ('analyst',     'Analyst');

-- =============================================================================
-- RLS helpers (SECURITY DEFINER — avoid recursive policy checks)
-- =============================================================================
-- These helpers read membership/operator tables with elevated privileges so
-- institute ↔ membership policies do not recurse. Hono remains authoritative;
-- RLS is defense-in-depth for direct PostgREST access.

CREATE OR REPLACE FUNCTION public.is_institute_member(p_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membership m
    WHERE m.institute_id = p_institute_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_institute_role(
  p_institute_id uuid,
  VARIADIC p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membership m
    JOIN public.membership_role mr ON mr.membership_id = m.id
    WHERE m.institute_id = p_institute_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND mr.role_code = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_operator po
    WHERE po.user_id = auth.uid()
      AND po.status = 'active'
      AND po.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_platform_role(VARIADIC p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_operator po
    WHERE po.user_id = auth.uid()
      AND po.status = 'active'
      AND po.deleted_at IS NULL
      AND po.role_code = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.is_institute_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_institute_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_operator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_platform_role(text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_institute_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_institute_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_platform_role(text[]) TO authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- service_role bypasses RLS (used by Hono admin client).
-- anon has no policies → denied by default.
-- authenticated policies are defense-in-depth for future request-scoped clients.

ALTER TABLE public.institute ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_operator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_event ENABLE ROW LEVEL SECURITY;

-- role / platform_role: catalog read for authenticated; writes via service_role only
CREATE POLICY role_select_authenticated
  ON public.role
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY platform_role_select_authenticated
  ON public.platform_role
  FOR SELECT
  TO authenticated
  USING (true);

-- user_profile: self read/update (safe fields enforced by API)
CREATE POLICY user_profile_select_self
  ON public.user_profile
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY user_profile_update_self
  ON public.user_profile
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid());

-- institute: members can read; privileged roles / platform can manage via API+service_role
CREATE POLICY institute_select_member
  ON public.institute
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_institute_member(id)
      OR public.is_platform_operator()
    )
  );

-- institute_settings: members read; writes via service_role / admin API
CREATE POLICY institute_settings_select_member
  ON public.institute_settings
  FOR SELECT
  TO authenticated
  USING (
    public.is_institute_member(institute_id)
    OR public.is_platform_operator()
  );

-- membership: own rows, or institute admins for their institute, or platform ops
CREATE POLICY membership_select_own_or_admin
  ON public.membership
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR public.has_institute_role(
           institute_id,
           'institute_admin', 'principal', 'vice_principal', 'it_admin'
         )
      OR public.is_platform_operator()
    )
  );

-- membership_role: visible when parent membership is visible (via helper / own membership)
CREATE POLICY membership_role_select_visible
  ON public.membership_role
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.membership m
      WHERE m.id = membership_id
        AND m.deleted_at IS NULL
        AND (
          m.user_id = auth.uid()
          OR public.has_institute_role(
               m.institute_id,
               'institute_admin', 'principal', 'vice_principal', 'it_admin'
             )
          OR public.is_platform_operator()
        )
    )
  );

-- platform_operator: platform operators only (never institute-scoped)
CREATE POLICY platform_operator_select_platform
  ON public.platform_operator
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_platform_operator()
  );

-- audit_event: institute admins see institute scope; platform ops see platform (+ all via service_role)
CREATE POLICY audit_event_select_scoped
  ON public.audit_event
  FOR SELECT
  TO authenticated
  USING (
    (
      scope = 'institute'
      AND institute_id IS NOT NULL
      AND public.has_institute_role(
            institute_id,
            'institute_admin', 'principal', 'vice_principal', 'it_admin'
          )
    )
    OR (
      scope = 'platform'
      AND public.is_platform_operator()
    )
  );

-- Inserts/updates/deletes for membership, institute, audit, etc. are intentionally
-- omitted for authenticated: Hono uses service_role for mutations (authoritative path).
-- This avoids unsafe client-side privilege escalation before auth middleware exists.

-- =============================================================================
-- Grants (API roles). Mutations for foundation tables stay service_role-first.
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.role TO authenticated;
GRANT SELECT ON public.platform_role TO authenticated;

GRANT SELECT, UPDATE ON public.user_profile TO authenticated;
GRANT SELECT ON public.institute TO authenticated;
GRANT SELECT ON public.institute_settings TO authenticated;
GRANT SELECT ON public.membership TO authenticated;
GRANT SELECT ON public.membership_role TO authenticated;
GRANT SELECT ON public.platform_operator TO authenticated;
GRANT SELECT ON public.audit_event TO authenticated;

-- service_role: full access (Hono admin client)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
