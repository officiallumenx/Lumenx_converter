# Phase 2 — Shared Packages

**Status:** Complete  
**Date:** May 2026  

## What changed

### New packages

| Package | Purpose |
|---------|---------|
| `@lumenx/ui` | 46 shadcn/ui components, `cn()` utility, `useIsMobile` hook |
| `@lumenx/types` | Shared domain types (Connect portal models) |
| `@lumenx/config` | Base tsconfig, ESLint config, platform constants |

### Removed duplication

- Deleted `apps/*/src/components/ui/` (138 files → 46 in one place)
- Deleted per-app `lib/utils.ts` and `hooks/use-mobile.tsx`
- Moved `apps/connect/src/lib/types.ts` → `packages/types`

### App wiring

- Connect imports UI and types from `@lumenx/ui` / `@lumenx/types`
- Admin/Nexus use `@lumenx/ui` via workspace (ui-kit remains app-local for now)
- All apps extend shared tsconfig and ESLint from `@lumenx/config`
- Vite SSR inlines workspace packages via `ssr.noExternal`

### CI

- `.github/workflows/ci.yml` — builds Connect, Admin, and Nexus on push/PR

## Package layout

```
packages/
├── ui/src/
│   ├── components/ui/   # shadcn components
│   ├── lib/utils.ts
│   ├── hooks/use-mobile.tsx
│   └── index.ts         # barrel exports
├── types/src/index.ts
└── config/
    ├── src/index.ts
    ├── tsconfig.base.json
    └── eslint.config.base.js
```

## Next

See [PHASE3-7.md](./PHASE3-7.md) — completed.
