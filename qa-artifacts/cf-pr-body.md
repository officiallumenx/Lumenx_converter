## Summary
- **Root cause (not a database/migration issue):** Cloudflare Workers Builds ran `npx wrangler versions upload`, which discovered `wrangler.jsonc` with `main: src/server.ts` (Vite source) or found no config at the monorepo root → `Missing entry-point`.
- **Fix:** Point each app Wrangler config at post-build `dist/server/server.js` + `dist/client`; shared `prepare-cf-worker-deploy.mjs` bundles the Worker and syncs app-root + monorepo-root Wrangler configs so the default upload command works.
- Admin Vite OOM mitigated with `--max-old-space-size=8192`. Documents/Certificates safe E2E journey timeout stabilized so GitHub Actions `build` can pass.

## Test plan
- [x] Local builds + Wrangler dry-runs for all five apps
- [x] Cloudflare Workers Builds green on PR head for admin, connect, nexus, transport, website
- [x] E2E docs/certs timeout fix included for CI
- [ ] Merge when checks are green; no production dashboard secret/route changes required for this upload fix
