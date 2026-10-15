# Cloudflare Workers Builds (LumenX apps)

Shared deploy model for `lumenx-admin`, `lumenx-nexus`, `lumenx-connect`, `lumenx-transport`, and `lumenx-website`.

## Build output

Each app builds with TanStack Start + **Nitro `cloudflare-module`** (`nitro: true` in `vite.config.ts`). After `vite build`, `scripts/prepare-cf-worker-deploy.mjs` writes:

| Path | Role |
|------|------|
| `dist/server/index.mjs` | Nitro entry |
| `dist/server/server.js` | Single-file Worker bundle for upload |
| `dist/client/` | Static assets (`ASSETS` binding) |
| `dist/server/wrangler.json` | Dist-relative Wrangler config |
| `wrangler.json` (app root, gitignored) | **Deploy-ready** config so default Workers Builds `npx wrangler versions upload` finds `main` + assets |

Committed `wrangler.jsonc` (`main: src/server.ts`) is for the Vite/Nitro toolchain only. After `npm run build`, Wrangler prefers the generated `wrangler.json` when both exist.

## Required Workers Builds settings (dashboard)

For **each** of the five Workers:

| Setting | Value |
|---------|--------|
| Root directory | `apps/<name>` (`admin`, `nexus`, `connect`, `transport`, `website`) |
| Install command | Prefer monorepo root install when the builder supports it; otherwise install from root then build in app root |
| Build command | `npm run build` |
| Deploy / Preview upload command | Default `npx wrangler versions upload` works after prepare (writes root `wrangler.json`). Prefer `npm run cf:upload` or `npx wrangler versions upload --config dist/server/wrangler.json` when customizing. |
| Production deploy (if used) | `npm run deploy` → `wrangler deploy --config dist/server/wrangler.json` |

Worker names in generated config / `wrangler.jsonc`:

| App folder | Worker name |
|------------|-------------|
| `apps/admin` | `lumenx-admin` |
| `apps/nexus` | `lumenx-nexus` |
| `apps/connect` | `lumenx-connect` |
| `apps/transport` | `lumenx-transport` |
| `apps/website` | `lumenx-website` |

## Why builds failed with “Missing entry-point”

Workers Builds often runs bare `npx wrangler versions upload` on non-production branches. That discovers app-root config. Source `wrangler.jsonc` points at `src/server.ts` (TanStack virtual imports), which is not a valid post-build upload entry. Prepare now emits a deployable `wrangler.json` after every production build.

## Local validation (does not publish)

```bash
npm run build --workspace=@lumenx/app-admin
# Prefer explicit config:
npx wrangler deploy --config apps/admin/dist/server/wrangler.json --dry-run
# Or exercise the default Workers Builds discovery path:
cd apps/admin && npx wrangler deploy --dry-run
```

Repeat for the other workspaces. Never run `wrangler versions upload` or `wrangler deploy` without `--dry-run` unless intentionally publishing.
