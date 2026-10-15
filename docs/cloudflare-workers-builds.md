# Cloudflare Workers Builds (LumenX apps)

Shared deploy model for `lumenx-admin`, `lumenx-nexus`, `lumenx-connect`, `lumenx-transport`, and `lumenx-website`.

## Root cause (fixed in repo)

Cloudflare’s default deploy command is:

```text
npx wrangler versions upload
```

That discovers app-root `wrangler.jsonc`. The old config used `main: src/server.ts` (Vite/TanStack source entry), which is **not** a valid post-build Worker entry → `Missing entry-point`.

**Fix:**

1. Each app’s `wrangler.jsonc` points at `dist/server/server.js` + `dist/client`.
2. `prepare-cf-worker-deploy.mjs` re-syncs those paths after every build.
3. Prepare also writes **monorepo-root** `wrangler.json` / `wrangler.jsonc` with
   `apps/<name>/dist/...` paths so bare `npx wrangler versions upload` works when
   Cloudflare’s build root is the repository root (common monorepo misconfig).

## Required Workers Builds settings (dashboard)

| Setting | Value |
|---------|--------|
| Root directory | `apps/<name>` (`admin`, `nexus`, `connect`, `transport`, `website`) |
| Install command | Monorepo-capable install (npm workspaces must resolve `@lumenx/*`) |
| Build command | `npm run build` |
| Deploy / Preview (incl. non-production) | Default `npx wrangler versions upload` works after this fix. Prefer `npm run cf:upload` when customizing. |

| App folder | Worker name |
|------------|-------------|
| `apps/admin` | `lumenx-admin` |
| `apps/nexus` | `lumenx-nexus` |
| `apps/connect` | `lumenx-connect` |
| `apps/transport` | `lumenx-transport` |
| `apps/website` | `lumenx-website` |

### Admin heap

Admin’s Vite SSR build can OOM on Workers Builds. Admin `build` runs Vite with `--max-old-space-size=8192`. If OOM persists, set dashboard env `NODE_OPTIONS=--max-old-space-size=8192`.

## Build output

| Path | Role |
|------|------|
| `dist/server/server.js` | Worker bundle |
| `dist/client/` | Static assets |
| `dist/server/wrangler.json` | Dist-relative config (`cf:upload` / `deploy`) |
| `wrangler.jsonc` | App-root config discovered by default `versions upload` |
| `wrangler.json` (gitignored) | Same deploy paths; written by prepare |

Server entry for TanStack/Nitro comes from `vite.config.ts` (`tanstackStart.server.entry` / `nitro: true`), not from `wrangler.jsonc` `main`.

## Local validation (does not publish)

```bash
npm run build --workspace=@lumenx/app-nexus
cd apps/nexus && npx wrangler deploy --dry-run
# or explicit:
npx wrangler deploy --config apps/nexus/dist/server/wrangler.json --dry-run
```

Never run `wrangler versions upload` or `wrangler deploy` without `--dry-run` unless intentionally publishing.
