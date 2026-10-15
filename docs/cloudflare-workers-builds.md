# Cloudflare Workers Builds (LumenX apps)

Shared deploy model for `lumenx-admin`, `lumenx-nexus`, `lumenx-connect`, `lumenx-transport`, and `lumenx-website`.

## Required Workers Builds settings (dashboard)

Do **not** rely on Wrangler auto-discovery (`wrangler.json` vs `wrangler.jsonc`). Use the explicit upload script.

For **each** of the five Workers:

| Setting | Value |
|---------|--------|
| Root directory | `apps/<name>` (`admin`, `nexus`, `connect`, `transport`, `website`) |
| Install command | Monorepo-capable install (npm workspaces must resolve `@lumenx/*`) |
| Build command | `npm run build` |
| Deploy / Preview upload command | **`npm run cf:upload`** (required) |
| Production deploy (if used) | `npm run deploy` |

`npm run cf:upload` runs:

```bash
wrangler versions upload --config dist/server/wrangler.json
```

From the monorepo root you can also run `npm run cf:upload:admin` (and `:nexus`, `:connect`, `:transport`, `:website`).

| App folder | Worker name | Dashboard root |
|------------|-------------|----------------|
| `apps/admin` | `lumenx-admin` | `apps/admin` |
| `apps/nexus` | `lumenx-nexus` | `apps/nexus` |
| `apps/connect` | `lumenx-connect` | `apps/connect` |
| `apps/transport` | `lumenx-transport` | `apps/transport` |
| `apps/website` | `lumenx-website` | `apps/website` |

## Build output

Each app builds with TanStack Start + **Nitro `cloudflare-module`** (`nitro: true` in `vite.config.ts`). After `vite build`, `scripts/prepare-cf-worker-deploy.mjs` writes:

| Path | Role |
|------|------|
| `dist/server/index.mjs` | Nitro entry |
| `dist/server/server.js` | Single-file Worker bundle for upload |
| `dist/client/` | Static assets (`ASSETS` binding) |
| `dist/server/wrangler.json` | **Authoritative** Wrangler config for `cf:upload` / `deploy` |
| `wrangler.json` (app root, gitignored) | Local helper only; not the dashboard contract |

Committed `wrangler.jsonc` (`main: src/server.ts`) is for the Vite/Nitro toolchain only.

## Why bare `npx wrangler versions upload` fails

Workers Builds defaults to bare `npx wrangler versions upload`, which discovers app-root config. Source `wrangler.jsonc` points at `src/server.ts` (TanStack virtual imports), which is not a valid post-build upload entry. There is also no Wrangler config at the monorepo root, so a repo-root Cloudflare root directory fails the same way.

**Dashboard fix:** set Deploy / Preview to `npm run cf:upload` with root `apps/<name>`.

## Local validation (does not publish)

```bash
npm run build --workspace=@lumenx/app-admin
npx wrangler deploy --config apps/admin/dist/server/wrangler.json --dry-run
```

Repeat for the other workspaces. Never run `wrangler versions upload` or `wrangler deploy` without `--dry-run` unless intentionally publishing.
