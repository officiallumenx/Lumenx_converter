# LumenX development safety (single existing Supabase project)

You are developing Admin, Connect, Transport, and the shared API against **one**
hosted Supabase project that you treat as a personal/test database.

This guide does **not** create a second project. It reduces accidental SMS, FCM
outbox drain, and write-enabled ops scripts.

Full staging optional path (separate project): see [STAGING.md](./STAGING.md).

---

## Identify the configured target

```bash
cd backend
npm run show:supabase-target
```

Prints project ref, hosted yes/no, OTP mode, FCM flags — **never** prints keys.

Confirm the `project_ref` matches the project you intend in the Supabase dashboard.

---

## Safe local commands (no remote DB writes)

From repo root / workspaces:

```bash
# Backend unit tests (in-memory mocks)
npm run test --workspace=@lumenx/api

# App unit tests
npm run test --workspace=@lumenx/app-admin
npm run test --workspace=@lumenx/app-connect
npm run test --workspace=@lumenx/app-transport

# Builds / typecheck
npm run build:api
npm run build:admin
npm run build:connect
npm run build:transport
npm run typecheck:api
npm run typecheck:admin
npm run typecheck:connect

# List migrations only (does not apply)
npm run migrations:list --workspace=@lumenx/api
```

These do not apply schema changes or seed cloud data.

---

## Deliberate cloud integration (API + apps)

Normal CRUD through the apps is **allowed** when you intentionally start the stack.
That writes to your configured cloud project.

```bash
# Terminal 1 — API (loads backend/.env)
npm run dev:api

# Confirm target
cd backend && npm run show:supabase-target

# Terminals 2–4 — apps (point VITE_API_BASE_URL at the API; anon key only)
npm run dev:admin
npm run dev:connect
npm run dev:transport
```

Local defaults for safer routine use:

- `OTP_DELIVERY_MODE=demo` — no live SMS/email for OTP
- `FCM_ALLOW_PROD_OUTBOX=false` — local API will not drain hosted FCM outbox

To test **live** OTP temporarily: set `OTP_DELIVERY_MODE=live` in `backend/.env`,
restart the API, then set it back to `demo`.

Frontend must never contain `SUPABASE_SERVICE_ROLE_KEY` (only `VITE_SUPABASE_ANON_KEY`).

---

## Write-enabled scripts (require explicit ack)

These refuse to run against hosted Supabase unless you set **for that shell only**:

```bash
# PowerShell example — replace <ref> with show:supabase-target project_ref
$env:ALLOW_REMOTE_DB_WRITES="I_CONFIRM_REMOTE_DATABASE_WRITES"
$env:REMOTE_WRITE_PROJECT_REF="<ref>"
```

| Command | Side effects |
|---------|----------------|
| `npm run smoke:login` | Creates/updates smoke Auth users and Connect/Transport fixtures |
| `npm run smoke:tenant` | Seeds probe academic/student rows; updates passwords |
| `npm run smoke` with `SMOKE_ACCESS_TOKEN` | May exercise student write-path |
| `npm run auth:invalidate-connect-passwords -- --apply` | Rotates Auth passwords |
| `node scripts/bootstrap-nexus-operator.mjs` | Creates/updates Nexus operator |

Dry-run `auth:invalidate-connect-passwords` (no `--apply`) still **reads** the cloud DB.

---

## Migrations (manual, confirmed)

1. Review the SQL impact.
2. Preflight (does **not** push):

```bash
cd backend
$env:ALLOW_REMOTE_DB_WRITES="I_CONFIRM_REMOTE_DATABASE_WRITES"
$env:REMOTE_WRITE_PROJECT_REF="<ref>"
$env:CONFIRM_MIGRATION_TARGET="<ref>"
npm run preflight:migration -- 20261009180000_transport_trip_vehicle_date_slot_unique.sql
```

3. Only if preflight passes:

```bash
npx supabase link --project-ref <ref>   # verify matches
npx supabase db push                    # applies pending migrations
```

Do not run `db reset` against a hosted project.

---

## Still requires deliberate approval

- Any `supabase db push` / SQL Editor migration apply
- All smoke / password-invalidate / bootstrap scripts (ack env vars)
- Switching `OTP_DELIVERY_MODE=live`
- Setting `FCM_ALLOW_PROD_OUTBOX=true`
- Playwright / `test:e2e:safe` against a live API
- Deleting or bulk-editing real institute data

Credential files (`.env`, `.env.staging`, `.env.*`) are gitignored except `*.example`.
