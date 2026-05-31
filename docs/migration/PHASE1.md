# Phase 1 — Monorepo Migration

**Status:** Complete  
**Date:** May 2026  

## What changed

| Before | After |
|--------|-------|
| `lumina-connect-main/` | `apps/connect/` |
| `luminexa admin/luminexa-command-center-main/` | `apps/admin/` |
| `lumenx nexus/` | `apps/nexus/` |

## Added

- Root `package.json` with npm workspaces (`apps/*`, `packages/*`)
- `turbo.json` for future task orchestration
- `packages/` placeholder for shared packages (M2+)
- `docs/LUMENX_MASTER.md` — ecosystem master documentation
- `docs/migration/PHASE1.md` — this file

## Package names

| App | npm name |
|-----|----------|
| Connect | `@lumenx/app-connect` |
| Admin | `@lumenx/app-admin` |
| Nexus | `@lumenx/app-nexus` |

## Intentionally unchanged

- Wrangler deploy names
- localStorage keys (`ues_*`, `luminexa-theme`)
- Demo password in Connect login
- App source code and routes

## Next (Phase 2)

1. Extract `@lumenx/ui` from duplicated shadcn components
2. Add `@lumenx/types` and `@lumenx/config`
3. Wire apps to shared packages
4. Add CI build pipeline
