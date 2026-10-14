# Cloudflare Workers Builds (LumenX apps)

Shared deploy model for `lumenx-admin`, `lumenx-nexus`, `lumenx-connect`, `lumenx-transport`, and `lumenx-website`.

## Build output

Each app builds with TanStack Start + **Nitro `cloudflare-module`** (`nitro: true` in `vite.config.ts`). After `vite build`, `scripts/prepare-cf-worker-deploy.mjs` writes:

| Path | Role |
|------|------|
| `dist/server/index.mjs` | Nitro entry |
| `dist/server/server.js` | Single-file Worker bundle for upload |
| `dist/client/` | Static assets (`ASSETS` binding) |
| `dist/server/wrangler.json` | **Authoritative** Wrangler config for upload/deploy |

App-root `wrangler.jsonc` (`main: src/server.ts`) is for the Vite/Nitro toolchain only. Do **not** point Workers Builds at it.

## Required Workers Builds settings (dashboard)

For **each** of the five Workers:

| Setting | Value |
|---------|--------|
| Root directory | `apps/<name>` (`admin`, `nexus`, `connect`, `transport`, `website`) |
| Install command | (default monorepo install from repo root is fine if Cloudflare installs at repo root; otherwise install from root then build in app root) |
| Build command | `npm run build` |
| Deploy / Preview upload command | `npx wrangler versions upload --config dist/server/wrangler.json` |
| Production deploy (if used) | `npm run deploy` → `wrangler deploy --config dist/server/wrangler.json` |

Worker names in generated config / `wrangler.jsonc`:

| App folder | Worker name |
|------------|-------------|
| `apps/admin` | `lumenx-admin` |
| `apps/nexus` | `lumenx-nexus` |
| `apps/connect` | `lumenx-connect` |
| `apps/transport` | `lumenx-transport` |
| `apps/website` | `lumenx-website` |

## Local validation (does not publish)

```bash
npm run build --workspace=@lumenx/app-admin
npx wrangler deploy --config apps/admin/dist/server/wrangler.json --dry-run
```

Repeat for the other workspaces. Never run `wrangler versions upload` or `wrangler deploy` without `--dry-run` unless intentionally publishing.
