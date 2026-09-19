-- LumenX local seed (supabase db reset).
-- Intentionally empty of demo institutes/users — production and API tests
-- provision data via the Hono API / Nexus registration flows.
-- Keep this file so config.toml [db.seed] sql_paths resolves successfully.
--
-- Cold-start Nexus reviewer (required before Admin registration approval):
--   cd backend && node scripts/bootstrap-nexus-operator.mjs
--   Requires NEXUS_BOOTSTRAP_PASSWORD in backend/.env

SELECT 1;
