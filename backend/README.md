# LumenX API (`@lumenx/api`)

Server-only backend workspace. Frontend apps must **never** import this package —
call it over HTTPS and share DTOs via contracts where applicable.

## Quick start (dev)

```bash
# from monorepo root
cp backend/.env.example backend/.env   # fill Supabase for real auth
npm run dev:api
```

| Check | URL |
|-------|-----|
| Liveness | `GET http://127.0.0.1:8787/api/v1/health` |
| Readiness | `GET http://127.0.0.1:8787/api/v1/health/ready` |
| Nexus | `GET http://127.0.0.1:8787/api/nexus/health` |

Default listen: `HOST=127.0.0.1` `PORT=8787`. Add every browser origin to `CORS_ORIGINS`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev:api` | tsx watch (local) |
| `npm run build:api` | esbuild → `backend/dist/index.js` |
| `npm run start:api` | `node dist/index.js` |
| `npm run test --workspace=@lumenx/api` | Vitest |
| `npm run smoke --workspace=@lumenx/api` | Prod smoke probes |
| `npm run migrations:list --workspace=@lumenx/api` | Ordered migration checklist |
| `npm run migrations:bundle --workspace=@lumenx/api` | Concat SQL for editor apply |

## Environment

See **`backend/.env.example`**. Highlights:

- **Supabase** — Auth + Postgres (required in production)
- **Firebase** — FCM worker (required in production)
- **OTP** — `OTP_DELIVERY_MODE`, SMS/email providers (see OPS.md)
- **Lifecycle** — `SUBSCRIPTION_LIFECYCLE_SYNC_MS` (hourly sync; `0` disables)
- **CORS** — explicit https origins required in production

Production boot runs a **fail-closed packaging gate** (missing Supabase/Firebase/CORS/OTP provider → process exits). Details: [DEPLOY.md](./DEPLOY.md).

## Migrations

```bash
supabase link --project-ref <prod-ref>
supabase db push
```

Fallback: bundle and paste in SQL Editor (`migrations:bundle`).  
Must include `login_otp_challenge` before multi-instance live OTP.

## Deploy

→ **[DEPLOY.md](./DEPLOY.md)** — Docker, PM2, systemd, smoke, TLS notes.

```bash
npm run build --workspace=@lumenx/api
npm run start --workspace=@lumenx/api
# or
docker build -f backend/Dockerfile -t lumenx-api .
```

## Operations runbook

→ **[OPS.md](./OPS.md)** — OTP, billing write-lock, lifecycle cron, incidents.

| Module | Product workflow |
|--------|------------------|
| Parent / staff login | Request OTP → durable hashed challenge → deliver → verify → session |
| School mutations | Blocked with `SUBSCRIPTION_READ_ONLY` when locked; billing paths stay open |
| Commercial lifecycle | Hourly (or Nexus flush) trial → grace → read_only; renewals → overdue |
| FCM | Worker starts with API when Firebase + Supabase are configured |

## Phase 1 (production launch blockers)

| Step | Item | Done |
|------|------|------|
| 1 | Real OTP delivery | ✓ |
| 2 | Durable OTP store | ✓ |
| 3 | Subscription write-gate | ✓ |
| 4 | Lifecycle automation | ✓ |
| 5 | Deploy packaging | ✓ |
| 6 | Ops docs | ✓ |

## Layout

```
backend/
├── src/           # Hono API, domains, workers
├── dist/          # production bundle
├── deploy/        # docker-compose, PM2, systemd
├── scripts/       # build, migrations, smoke
├── Dockerfile
├── DEPLOY.md      # how to ship
├── OPS.md         # how to operate
├── .env.example
└── package.json
```
