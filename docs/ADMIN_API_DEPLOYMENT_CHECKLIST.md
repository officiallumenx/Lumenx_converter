# Admin ↔ Backend API deployment checklist

Verified requirements from the current LumenX monorepo (`apps/admin`, `backend`).  
Do not paste real secrets or production hostnames into this file.

## Backend (`@lumenx/api`)

Set at process runtime (e.g. `backend/.env` or host secrets):

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | Use `production` so Supabase credentials are required at startup |
| `HOST` | Default binds to loopback only; set a reachable bind address for your platform (e.g. `0.0.0.0` behind a reverse proxy) |
| `PORT` | Listen port (default `8787` if unset) |
| `CORS_ORIGINS` | Comma-separated **exact** Admin frontend origins (no wildcards) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server anon client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never expose to Admin/Vite |

Start: `npm run start --workspace=@lumenx/api` (or `npm run dev:api` for local).

## Admin (`@lumenx/app-admin`)

Set at **Vite build time** (see `apps/admin/.env.example`):

| Variable | Notes |
|----------|--------|
| `VITE_ADMIN_AUTH_MODE` | Must be `api` for production API mode |
| `VITE_API_BASE_URL` | Public backend origin Admin will call |
| `VITE_SUPABASE_URL` | Same project URL as backend |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe anon key only |

Build: `npm run build:admin`.

## Operations

1. Apply all `supabase/migrations/` to the **target** Supabase project before relying on API mode.
2. Put the exact production Admin origin(s) in backend `CORS_ORIGINS`.
3. Ensure the backend process is reachable on the URL used as `VITE_API_BASE_URL` (correct `HOST` / proxy / TLS).
4. In the Supabase dashboard, set Auth **Site URL** to the production Admin origin.
5. Add the production Admin origin(s) to the Auth **redirect URL allowlist**.
6. Build Admin with the production `VITE_*` values above (do not ship localhost API defaults).
7. Confirm no service role key appears in Admin env, CI logs, or frontend bundles.
