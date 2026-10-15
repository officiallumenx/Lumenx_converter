# Cloudflare Workers Builds (LumenX apps)

Shared deploy model for `lumenx-admin`, `lumenx-nexus`, `lumenx-connect`, `lumenx-transport`, and `lumenx-website`.

## Required Workers Builds settings (dashboard)

**Confirmed remote failure (2026-10-15 logs):** Cloudflare still runs

```text
Executing user deploy command: npx wrangler versions upload
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

That default command does **not** use `dist/server/wrangler.json`. It must be changed.

For **each** of the five Workers:

| Setting | Value |
|---------|--------|
| Root directory | `apps/<name>` (`admin`, `nexus`, `connect`, `transport`, `website`) |
| Install command | Monorepo-capable install (npm workspaces must resolve `@lumenx/*`) |
| Build command | `npm run build` |
| Deploy / Preview upload command | **`npm run cf:upload`** (required — do not leave the default) |
| Production deploy (if used) | `npm run deploy` |

`npm run cf:upload` runs:

```bash
wrangler versions upload --config dist/server/wrangler.json
```

From the monorepo root: `npm run cf:upload:admin` (also `:nexus`, `:connect`, `:transport`, `:website`).

| App folder | Worker name | Dashboard root |
|------------|-------------|----------------|
| `apps/admin` | `lumenx-admin` | `apps/admin` |
| `apps/nexus` | `lumenx-nexus` | `apps/nexus` |
| `apps/connect` | `lumenx-connect` | `apps/connect` |
| `apps/transport` | `lumenx-transport` | `apps/transport` |
| `apps/website` | `lumenx-website` | `apps/website` |

### Admin heap (Cloudflare OOM)

Admin’s Vite SSR build can exceed the default Node heap on Workers Builds (`FATAL ERROR: ... JavaScript heap out of memory`). The Admin `build` script runs Vite with `--max-old-space-size=8192`. If OOM persists, also set dashboard env `NODE_OPTIONS=--max-old-space-size=8192`.

## Build output

Each app builds with TanStack Start + **Nitro `cloudflare-module`** (`nitro: true` in `vite.config.ts`). After `vite build`, `scripts/prepare-cf-worker-deploy.mjs` writes:

| Path | Role |
|------|------|
| `dist/server/index.mjs` | Nitro entry |
| `dist/server/server.js` | Single-file Worker bundle for upload |
| `dist/client/` | Static assets (`ASSETS` binding) |
| `dist/server/wrangler.json` | **Authoritative** Wrangler config for `cf:upload` / `deploy` |
| `wrangler.json` (app root, gitignored) | Local helper only; not a substitute for `npm run cf:upload` on Cloudflare |

Committed `wrangler.jsonc` (`main: src/server.ts`) is for the Vite/Nitro toolchain only.

## Why bare `npx wrangler versions upload` fails

Workers Builds defaults to bare `npx wrangler versions upload`. That command does not pass `--config dist/server/wrangler.json`. Remote logs show it failing with **Missing entry-point** even after a successful app build. Source `wrangler.jsonc` is not a valid post-build upload entry, and there is no Wrangler config at the monorepo root.

**Dashboard fix:** set Deploy / Preview to `npm run cf:upload` with root `apps/<name>`, then Retry build.

## Local validation (does not publish)

```bash
npm run build --workspace=@lumenx/app-admin
npx wrangler deploy --config apps/admin/dist/server/wrangler.json --dry-run
```

Repeat for the other workspaces. Never run `wrangler versions upload` or `wrangler deploy` without `--dry-run` unless intentionally publishing.
