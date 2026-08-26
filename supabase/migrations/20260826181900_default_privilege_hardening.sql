-- =============================================================================
-- LumenX Migration 003 — Default privilege hardening
-- Version: 20260826181900
--
-- Purpose:
--   Prevent FUTURE public tables created by the migration role (postgres)
--   from automatically receiving broad DML privileges for anon/authenticated.
--
-- Scope:
--   ALTER DEFAULT PRIVILEGES only (public schema, TABLES) for role postgres.
--   Does NOT modify existing tables, columns, RLS, policies, roles,
--   functions, triggers, seeds, or application grants from Migration 002.
--
-- Inspected facts (Dev):
--   - Migration runner / foundation table owner: postgres
--   - public.tables default ACLs also exist for supabase_admin, but the
--     migration role cannot ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
--     (permission denied). Those platform defaults are left unchanged.
--
-- service_role defaults are intentionally preserved.
-- Future migrations must GRANT explicit table privileges as needed.
-- =============================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
