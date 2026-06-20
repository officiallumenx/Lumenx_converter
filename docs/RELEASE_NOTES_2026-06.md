# LumenX Release Notes — June 2026

**Branch:** `main`  
**Baseline commit:** `0dcbfb8` (Monorepo Phase 1)  
**Scope:** Connect Careers & Admissions portals, shared packages, Admin/Nexus UI consolidation, Connect portal refactor, dev performance, documentation.

---

## Summary

This release extends the LumenX monorepo from Phase 1 (app shells) into **runnable multi-portal Connect**, **Careers V2 + Recruiter workspace**, **Admissions portal**, **shared `@lumenx/*` packages**, and **Admin feature expansion**. Local UI duplicates were removed in favor of `@lumenx/ui`.

---

## Added

### Shared packages (`packages/`)

| Package | Purpose |
|---------|---------|
| `@lumenx/ui` | Shared shadcn/Radix component library (used by Connect, Admin, Nexus) |
| `@lumenx/ui-admin` | Admin-specific UI primitives |
| `@lumenx/auth` | Browser auth storage keys and helpers |
| `@lumenx/types` | Shared TypeScript domain types |
| `@lumenx/utils` | Error capture, error page rendering |
| `@lumenx/config` | Shared configuration |
| `@lumenx/database` | Database layer scaffold |
| `@lumenx/module-*` | Domain module scaffolds (students, teachers, fees, transport, careers, admissions, etc.) |
| `tooling/` | Shared ESLint/TypeScript tooling |

### Connect — Careers portal (`/careers/*`)

- **Job seeker:** job board with keyword, experience, work mode, role type, location filters; quick apply; dashboard; applications pipeline; saved jobs; profile; documents; notifications; interviews.
- **Recruiter workspace (Phase 2):**
  - Routes: `/careers/recruiter`, `/careers/recruiter/jobs`, `/careers/recruiter/jobs/new`, `/careers/recruiter/jobs/$jobId/edit`, `/careers/recruiter/applicants`, `/careers/recruiter/talent`
  - Post job form: overview, full description, responsibilities, qualifications, benefits, experience picker, salary, status (draft/open/closed)
  - **Edit after create:** redirect to edit page; Edit on My jobs and Browse market (own listings)
  - Applicant pipeline and talent discovery (demo data)
- **Careers home:** role-aware landing (job seeker vs recruiter), merged job board featured listings, browse-by-role chips
- **Browse market:** recruiter-primary nav; market view without Apply/Save on competitor jobs; Edit/Preview on own listings
- Data: `recruiter-jobs-store.ts`, `recruiter-talent.ts`, merged `getJobs()` (static + open recruiter posts), cross-industry `JobCategory` values

See [CAREERS_PORTAL_RELEASE.md](./CAREERS_PORTAL_RELEASE.md) for routes, demo accounts, and file map.

### Connect — Admissions portal (`/admissions/*`)

- Isolated admissions zone with own shell, auth, theme, apply flow, institute admin pages, programs, inquiries, documents, dashboard.

### Connect — Role portals refactor

- **Parent portal:** `parent-portal/features/*`, scoped context and repositories
- **Teacher portal:** `teacher-portal/features/*`
- **Student portal:** `student-portal/features/*`
- New routes: alerts, leave, sports, transport, certificates, academic history, achievements, classes, remarks, students, verify QR, etc.

### Connect — App features

- Assignments detail dialog and status utilities
- Attendance calendar/overview components
- Leave request flows (parent/teacher)
- Fees, marks, sports, transport, ID card, timetable enhancements
- `ConnectPortalProviders.tsx` for lazy-loaded main-app context

### Admin app

- New routes: admissions, careers sync, calendar, fees, institute, leave, marks, reports, subjects, teacher-attendance, teacher-performance, transport
- Analytics, timetable, and module data libraries
- Admin chrome, page transitions, action toasts

### Nexus app

- Migrated to `@lumenx/ui`; aligned with Admin shell patterns

### Transport

- `apps/transport_flutter/` — Flutter driver app (Phase 1)
- Transport docs under `docs/TRANSPORT_*.md`

### CI

- `.github/workflows/ci.yml` — monorepo CI workflow

### Documentation

- `docs/CAREERS_PORTAL_RELEASE.md` — Careers + recruiter detail
- `docs/RELEASE_NOTES_2026-06.md` — this file
- `apps/connect/docs/` — Admissions and Careers architecture notes
- Transport and migration phase docs under `docs/`

---

## Changed

### UI consolidation

- **Connect, Admin, Nexus:** removed per-app `src/components/ui/*` copies; imports now use `@lumenx/ui`
- **Connect root:** `@lumenx/ui/sonner` subpath export for lightweight Toaster import
- Removed duplicate `hooks/use-mobile`, `lib/utils`, `lib/error-*` from apps where shared packages apply

### Careers UX (job board)

- Removed institute-centric nav and “Followed institutes” from primary flows; `/careers/institutes/*` redirects to jobs
- **Quick apply:** job locked when applying from listing; profile prefilled; optional per-job `applicationExtras`
- Job cards show title, overview, location, experience, deadline, salary consistently (including recruiter-created jobs)

### Careers home & browse

- Featured/recent/trending/recommended jobs use `getJobs()` (includes recruiter listings)
- Copy updated for cross-industry job board (not education-only)
- Recruiter hero: Post job, Manage listings, Browse market, Workspace

### Dev & load performance (`apps/connect`)

- Fixed invalid Vite flag (`experimental.enableCodeSplitting` removed; use `autoCodeSplitting` only)
- Disabled sandbox-only dev SSR/server-fn loggers locally
- `importProtection`: mock in dev, error in build
- Shared Vite cache: `node_modules/.vite-connect`
- Route code splitting enabled via TanStack Start router config
- Root shell: lazy `ConnectPortalProviders`; skip Connect contexts on `/careers` and `/admissions`
- Async Google Fonts (non-blocking first paint)
- Lazy home dashboards (parent/teacher/student)
- Router preload on intent (`defaultPreloadStaleTime: 30s`)

### Monorepo

- Root `package.json` workspaces for `apps/*` and `packages/*`
- App `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`
- `README.md` updated for workspace scripts

---

## Fixed

- Dev server crash from duplicate code-splitting config flags
- Recruiter jobs missing from featured/browse sections (recommendations now use `getJobs()`)
- Browse market showing Apply/Save for recruiters on competitor listings
- Post-create flow now lands on edit page instead of list-only
- `CareersPageHeader` supports optional `action` slot (e.g. Post a job on browse)

---

## Deleted

- Per-app UI kit duplicates: `apps/{connect,admin,nexus}/src/components/ui/*` (~45 components each)
- `apps/{connect,admin,nexus}/src/components/ui-kit.tsx`
- Per-app `hooks/use-mobile.tsx`, `lib/utils.ts`, `lib/error-capture.ts`, `lib/error-page.ts` (moved to packages)
- Connect: `lib/types.ts` (superseded by `@lumenx/types` and portal-specific types)
- `packages/.gitkeep` (replaced by real packages)

**Note:** Institute career pages remain in codebase for redirect/legacy but are not primary nav.

---

## Demo credentials (Careers)

| Role | Email | Password | OTP |
|------|-------|----------|-----|
| Job seeker | `priya.candidate@example.com` | `demo123` | `123456` |
| Recruiter | `hr@lumenx.edu` | `demo123` | `123456` |

---

## How to run

```bash
# From repo root
npm install
npm run dev:connect    # http://localhost:8080
npm run dev:admin
npm run dev:nexus

# Build
npm run build:connect
```

**First dev load:** Vite may pre-bundle dependencies once (~20–40s). Subsequent reloads are faster. Restart dev server after pulling this release.

---

## Key paths

| Area | Path |
|------|------|
| Careers portal UI | `apps/connect/src/careers-portal/` |
| Careers data | `apps/connect/src/lib/careers/` |
| Careers routes | `apps/connect/src/routes/careers/` |
| Admissions portal | `apps/connect/src/admissions-portal/` |
| Shared UI | `packages/ui/` |
| Connect Vite config | `apps/connect/vite.config.ts` |

---

## Related docs

- [CAREERS_PORTAL_RELEASE.md](./CAREERS_PORTAL_RELEASE.md)
- [apps/connect/docs/CAREERS_PORTAL_V2_ARCHITECTURE.md](../apps/connect/docs/CAREERS_PORTAL_V2_ARCHITECTURE.md)
- [apps/connect/docs/ADMISSIONS_PORTAL_V2_ARCHITECTURE.md](../apps/connect/docs/ADMISSIONS_PORTAL_V2_ARCHITECTURE.md)
- [LUMENX_MASTER.md](./LUMENX_MASTER.md)
- [migration/PHASE2.md](./migration/PHASE2.md)
