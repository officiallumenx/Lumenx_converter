# LumenX API (`@lumenx/api`)

Server-only backend workspace. Frontend apps must never import this package directly —
call it over HTTPS.

## Quick start (dev)

```bash
npm run dev:api
```

Health: `GET http://127.0.0.1:8787/api/v1/health`

## Production packaging

Build compiled Node and deploy with Docker, PM2, or systemd:

→ **[DEPLOY.md](./DEPLOY.md)** (Phase 1 Step 5)

```bash
npm run build --workspace=@lumenx/api
npm run start --workspace=@lumenx/api
npm run smoke --workspace=@lumenx/api
```

## Layout

```
backend/
├── src/           # Hono API + domains + workers
├── dist/          # esbuild emit (production start)
├── deploy/        # docker-compose, PM2, systemd
├── scripts/       # build, migrations list/bundle, prod smoke
├── Dockerfile
├── DEPLOY.md
└── package.json
```
