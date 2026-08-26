-- =============================================================================
-- LumenX Migration 002 — Foundation privilege hardening
-- Version: 20260826174200
--
-- Purpose:
--   Migration 001 enabled RLS and intended least-privilege GRANTs, but Supabase
--   default privileges left anon/authenticated with full table DML. This
--   migration makes grants explicit and intentional without changing schema,
--   RLS policies, helpers, seeds, or application code.
--
-- Architecture:
--   - Hono + service_role is authoritative for business writes
--   - authenticated retains SELECT (and UPDATE on user_profile only)
--   - anon retains no table privileges on foundation tables
--   - RLS policies remain unchanged (defense-in-depth)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Revoke broad default DML (and ancillary) privileges from client roles
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.institute,
  public.institute_settings,
  public.user_profile,
  public.role,
  public.membership,
  public.membership_role,
  public.platform_role,
  public.platform_operator,
  public.audit_event
FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- Re-grant only intended authenticated privileges (matches Migration 001 intent)
-- -----------------------------------------------------------------------------
GRANT SELECT ON TABLE public.role TO authenticated;
GRANT SELECT ON TABLE public.platform_role TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.user_profile TO authenticated;

GRANT SELECT ON TABLE public.institute TO authenticated;
GRANT SELECT ON TABLE public.institute_settings TO authenticated;
GRANT SELECT ON TABLE public.membership TO authenticated;
GRANT SELECT ON TABLE public.membership_role TO authenticated;
GRANT SELECT ON TABLE public.platform_operator TO authenticated;
GRANT SELECT ON TABLE public.audit_event TO authenticated;

-- anon: intentionally no table privileges on foundation tables
-- (RLS already denies anon; privilege layer now matches)

-- -----------------------------------------------------------------------------
-- Ensure service_role retains full access for Hono admin client
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE
  public.institute,
  public.institute_settings,
  public.user_profile,
  public.role,
  public.membership,
  public.membership_role,
  public.platform_role,
  public.platform_operator,
  public.audit_event
TO service_role;
