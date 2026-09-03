# LumenX API — production deploy packaging

This is the Phase 1 Step 5 runbook for shipping `@lumenx/api` as a real process
(not only local `tsx`). Full ops narrative (OTP / billing lock / cron) is Step 6.

## 1. Apply Supabase migrations (prod)

Preferred (linked CLI):

```bash
supabase link --project-ref <prod-ref>
supabase db push
```

Checklist / SQL Editor fallback:

```bash
npm run migrations:list --workspace=@lumenx/api
npm run migrations:bundle --workspace=@lumenx/api > all-migrations.sql
```

Paste `all-migrations.sql` into Supabase SQL Editor only when CLI push is unavailable.
Always include `20260827470400_login_otp_challenge.sql` before live multi-instance OTP.

## 2. Production environment

Copy `backend/.env.example` → `backend/.env` and set:

| Variable | Production requirement |
|----------|------------------------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` (defaulted when unset in production) |
| `PORT` | e.g. `8787` (TLS at reverse proxy) |
| `CORS_ORIGINS` | **Required** — real https app origins (not localhost-only) |
| `SUPABASE_*` | **Required** |
| `FIREBASE_*` | **Required** (FCM worker) |
| `OTP_SMS_PROVIDER` / `OTP_EMAIL_PROVIDER` | At least one non-`none` |
| `SUBSCRIPTION_LIFECYCLE_SYNC_MS` | `3600000` (or `0` to disable) |

The process **refuses to start** if production packaging checks fail.

## 3. Build & run (compiled Node)

```bash
npm ci
npm run build --workspace=@lumenx/api   # esbuild → backend/dist/index.js
npm run start --workspace=@lumenx/api   # node dist/index.js
```

Dev still uses `npm run dev:api` (tsx watch).

### Docker

From monorepo root:

```bash
docker build -f backend/Dockerfile -t lumenx-api .
docker run --env-file backend/.env -p 8787:8787 lumenx-api
```

Or:

```bash
docker compose -f backend/deploy/docker-compose.yml up --build
```

### PM2

```bash
cd backend
npm run build
pm2 start deploy/ecosystem.config.cjs
```

### systemd

1. Install compiled tree under `/opt/lumenx/backend` (`dist/` + `.env`)
2. Copy `backend/deploy/lumenx-api.service` → `/etc/systemd/system/`
3. `systemctl enable --now lumenx-api`

## 4. Smoke

```bash
# Health only
SMOKE_SKIP_AUTH=1 npm run smoke --workspace=@lumenx/api

# Auth + academic path + subscription surface
SMOKE_ACCESS_TOKEN=<jwt> SMOKE_INSTITUTE_ID=<uuid> npm run smoke --workspace=@lumenx/api
```

Expected path: live → ready → `/me` → students list → subscription current → write-path probe.

## 5. Reverse proxy / TLS

Terminate TLS at nginx/Caddy/cloud LB; forward to `HOST:PORT`.
Do not expose the Node port publicly without TLS.
