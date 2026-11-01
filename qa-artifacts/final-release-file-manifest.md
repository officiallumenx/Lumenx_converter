# LumenX — Final Release File-Set Manifest (Core Web/API)

**Date:** 2026-10-20  
**Nature:** Proposed file-set approval preparation only. **Not** a stage, commit, push, deploy, migration, or release.  
**Approved scope:** Admin · Connect · Transport · Nexus · Backend API · Website  
**Out of product claims:** Admissions · Careers · native APK/EXE distribution  

**Sources re-checked:** `final-release-gate-report.md`, `release-file-set-review.md`, `release-candidate-readiness-report.md`, `final-transport-verification-report.md`, current working tree, `origin/main...HEAD` (11 commits).

---

## 1. Repository snapshot (re-checked this pass)

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD | `c384e10e67809016fa221ea8d6310656a49ab2f1` |
| Subject | Ship downloads-host URLs, desktop packaging updates, and website download matrix links. |
| Merge-base vs `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead / behind `origin/main` | **11 / 0** |
| Tracking | `origin/fix/cloudflare-workers-build-upload` — tip in sync |
| Modified tracked | **90** |
| Untracked (`git status --porcelain`) | **251** status lines (dirs collapsed) |
| Untracked (`-uall`) | **342** paths |
| Staged | **0** |
| `git diff --check` | exit **0** |
| `apps/connect/src/lib/transport/learner-live.ts` vs HEAD | **unchanged** |
| `apps/admin-desktop/dist-out/**` | Present on disk, **EXCLUDE** |

**Note:** Earlier “331 untracked” figures are stale; use the counts above.

---

## 2. Final recommendation

# **READY FOR FINAL VALIDATION**

The proposed **uncommitted** include set below is sufficient for a **core web/API** release cut **with documented limitations**. Outstanding Android scaffolding already on the branch does **not** block that cut if native/Admissions/Careers product claims stay out of release notes.

This document is a **proposed file set**, not a committed release. A future explicitly authorized scrubbed commit of §3 only is still required before merge/ship.

---

## 3. INCLUDE — uncommitted paths for a future scrubbed commit

### 3A. Product code (core web/API)

| Path | Rationale |
|------|-----------|
| `apps/admin/src/lib/admin-queries/persist.ts` | Admin query persistence for core Admin web |
| `apps/admin/src/lib/photos/signed-url.ts` | Diary/photos signed URL handling |
| `apps/admin/src/routes/diary.tsx` | Admin diary route |
| `apps/admin/src/routes/photos.tsx` | Admin photos route |
| `apps/connect/src/components/app/RouteLazyFallback.tsx` | Shared lazy-route fallback (used by authenticated routes including leave) |
| `apps/connect/src/lazy-pages/ComplaintsPage.tsx` | Connect lazy page split |
| `apps/connect/src/lazy-pages/ExamsPage.tsx` | Connect lazy page split |
| `apps/connect/src/lazy-pages/FeesPage.tsx` | Connect lazy page split |
| `apps/connect/src/lazy-pages/GrowthPage.tsx` | Connect lazy page split |
| `apps/connect/src/lazy-pages/MarksPage.tsx` | Connect lazy page split |
| `apps/connect/src/lib/connect-queries/background-preload.ts` | Connect prefetch/preload |
| `apps/connect/src/lib/connect-queries/persist.ts` | Connect query persistence |
| `apps/connect/src/lib/connect-queries/prefetch-parent.ts` | Parent prefetch |
| `apps/connect/src/lib/connect-queries/prefetch-student.ts` | Student prefetch |
| `apps/connect/src/lib/connect-queries/prefetch-teacher.ts` | Teacher prefetch |
| `apps/connect/src/lib/connect-queries/schedule-idle.ts` | Idle scheduling for prefetch |
| `apps/connect/src/context/ActivityWorkspaceContext.tsx` | Portal context wiring for lazy routes |
| `apps/connect/src/context/ParentPortalContext.tsx` | Portal context wiring |
| `apps/connect/src/context/StudentPortalContext.tsx` | Portal context wiring |
| `apps/connect/src/context/TeacherPortalContext.tsx` | Portal context wiring |
| `apps/connect/src/routes/_authenticated/academic-history.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/assignments.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/certificates.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/complaints.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/diary.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/exams.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/fees.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/growth.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/_authenticated/index.tsx` | Dashboard route wiring |
| `apps/connect/src/routes/_authenticated/leave.tsx` | Leave **route** lazy shell only (imports `RouteLazyFallback` + existing leave stores; does **not** require dirty leave-lib files) |
| `apps/connect/src/routes/_authenticated/marks.tsx` | Lazy/authenticated route wiring |
| `apps/connect/src/routes/login.tsx` | Login route |
| `apps/connect/tsconfig.json` | Required for Connect typecheck/lazy paths |
| `apps/transport/package.json` | Transport package scripts/deps for web app |
| `apps/transport/src/components/app/RouteLazyFallback.tsx` | Transport lazy fallback |
| `apps/transport/src/features/route-setup/RouteSetupPage.tsx` | Route setup feature |
| `apps/transport/src/lib/notification-inbox/api.ts` | Inbox API client |
| `apps/transport/src/lib/transport-queries/hooks.ts` | Transport query hooks |
| `apps/transport/src/lib/transport/api-roster.ts` | Roster API |
| `apps/transport/src/lib/transport/attendance/repository.ts` | Attendance repository |
| `apps/transport/src/routes/_app/alerts.tsx` | Alerts route |
| `apps/transport/src/routes/_app/more/bus-information.tsx` | More → bus info |
| `apps/transport/src/routes/_app/more/profile.tsx` | More → profile |
| `apps/transport/src/routes/_app/more/route-setup.tsx` | More → route setup |
| `apps/transport/src/routes/_app/more/settings.tsx` | More → settings |
| `apps/transport/src/routes/_app/more/support.tsx` | More → support |
| `apps/nexus/src/lib/institutes/create-api.ts` | Institute create API helper |
| `apps/nexus/src/components/institutes/CreateInstituteDialog.tsx` | Create institute UI |
| `apps/nexus/src/lib/api/client.ts` | Nexus API client |
| `apps/nexus/src/lib/audit-log-store.ts` | Audit log store |
| `apps/nexus/src/lib/institute-billing-store.ts` | Billing store |
| `apps/nexus/src/routes/institutes.index.tsx` | Institutes index |
| `apps/nexus/src/routes/recycle.tsx` | Recycle route |
| `backend/src/domains/transport/approach.ts` | Approach / STOP_APPROACHING logic |
| `backend/src/domains/transport/ops-service.ts` | Transport ops service |
| `backend/src/domains/transport/transport-notification-severity.ts` | Notification severity |
| `backend/src/domains/documents/repository.ts` | Documents repository (docs/certs) |
| `backend/src/domains/identity/service.ts` | Identity service |
| `backend/src/domains/registrations/review-service.ts` | Registration review |
| `backend/src/domains/subscriptions/ensure-trial.ts` | Trial ensure helper |
| `backend/STAGING.md` | Staging operator doc for API |
| `backend/package.json` | API package scripts |
| `backend/scripts/e2e-cross-tenant-probe.mjs` | Cross-tenant probe harness |
| `backend/scripts/e2e-login-smoke.mjs` | Login smoke harness |
| `backend/scripts/run-smoke-login-with-shells.mjs` | Smoke runner |
| `package.json` | Root workspace scripts used by checks |
| `playwright.config.ts` | E2E config for approved harnesses |
| `e2e/admin-auth-boundaries.spec.ts` | Admin auth boundary E2E |
| `e2e/admin-documents-certificates-safe.spec.ts` | Docs/certs safe E2E |
| `e2e/connect-auth-boundaries.spec.ts` | Connect auth boundary E2E |
| `e2e/staging/ensure-multi-role-fixtures.mjs` | Staging multi-role fixtures |
| `e2e/staging/live-gate.ts` | Staging live gate helper |
| `e2e/staging/multi-role-announcements.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-attendance.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-certificates.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-fees.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-homework.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-leave.spec.ts` | Staging multi-role |
| `e2e/staging/multi-role-marks.spec.ts` | Staging multi-role |
| `e2e/staging/run-multi-role-with-shells.mjs` | Staging runner |
| `e2e/staging/staging-session.ts` | Staging session helper |
| `e2e/staging/transport-realtime-probe.mjs` | Transport realtime probe (32/32 evidence) |

### 3B. Required regression tests

| Path | Rationale |
|------|-----------|
| `apps/admin/src/lib/diary/list-view.test.ts` | Admin diary regression |
| `apps/admin/src/lib/photos/signed-url.test.ts` | Photos signed-url regression |
| `apps/connect/src/lib/connect-queries/isolation.test.ts` | Prefetch isolation |
| `apps/connect/src/lib/connect-queries/schedule-idle.test.ts` | Idle scheduler |
| `apps/connect/src/lib/transport/parent-status.test.ts` | GPS status mapping (15) |
| `apps/connect/src/lib/transport-utils.test.ts` | Transport UI utils (5); with parent-status = **20** |
| `apps/transport/src/lib/transport/gps-outbox.test.ts` | GPS outbox |
| `apps/transport/src/lib/transport/route-setup/api-sync.test.ts` | Route-setup sync |
| `apps/transport/src/lib/transport/trip/api-ops.hydrate.test.ts` | Trip hydrate |
| `apps/transport/src/lib/transport/trip/store.test.ts` | Trip store |
| `backend/src/domains/transport/approach.test.ts` | Approach units |
| `backend/src/domains/transport/transport-notification-severity.test.ts` | Severity units |
| `backend/src/domains/transport/transport-rls-policies.test.ts` | RLS policy unit expectations |
| `backend/tests/identity.test.ts` | Identity |
| `backend/tests/registrations-approval.test.ts` | Registrations |
| `backend/tests/cross-app-data-sharing.test.ts` | Cross-app sharing |
| `backend/tests/helpers/cross-app-fixture.ts` | Cross-app test helper |

**Note:** Final-gate API vitest also executed `backend/src/domains/transport/ops-notifications-audience.test.ts` (**already on HEAD**, not dirty). It is **not** required in the uncommitted scrubbed set.

### 3C. Migration + proposal documentation

| Path | Rationale |
|------|-----------|
| `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` | **Required** GPS guardian Realtime RLS migration (staging applied + history repaired; production **not** applied) |
| `docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql` | Proposal SQL |
| `docs/proposals/transport_vehicle_location_guardian_realtime_rls.md` | Proposal write-up |
| `docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` | Formalization snapshot |
| `docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md` | Formalization notes |

### 3D. Curated Markdown QA reports only

| Path | Rationale |
|------|-----------|
| `qa-artifacts/final-release-file-manifest.md` | This manifest |
| `qa-artifacts/final-release-gate-report.md` | Final gate results |
| `qa-artifacts/release-file-set-review.md` | Prior file-set review |
| `qa-artifacts/release-phase2-review.md` | Phase 2 inventory |
| `qa-artifacts/release-candidate-readiness-report.md` | RC readiness |
| `qa-artifacts/final-transport-verification-report.md` | Transport 32/32 + GPS unit evidence |
| `qa-artifacts/transport-staging-realtime-verification.md` | Staging realtime verification |
| `qa-artifacts/four-module-reliability-report.md` | Four-module reliability |
| `qa-artifacts/cross-app-data-sharing-report.md` | Cross-app report |
| `qa-artifacts/cross-app-data-sharing-matrix.md` | Cross-app matrix |
| `qa-artifacts/_transport-gps-rls-apply-report.md` | Staging GPS RLS apply evidence |
| `qa-artifacts/_phase3-staging-rls-recon-report.md` | Staging RLS recon |
| `qa-artifacts/_repair-history-applied-report.md` | Migration history repair (no DDL re-apply) |

### Exact INCLUDE path list (copy-ready)

```
apps/admin/src/lib/admin-queries/persist.ts
apps/admin/src/lib/photos/signed-url.ts
apps/admin/src/routes/diary.tsx
apps/admin/src/routes/photos.tsx
apps/admin/src/lib/diary/list-view.test.ts
apps/admin/src/lib/photos/signed-url.test.ts

apps/connect/src/components/app/RouteLazyFallback.tsx
apps/connect/src/lazy-pages/ComplaintsPage.tsx
apps/connect/src/lazy-pages/ExamsPage.tsx
apps/connect/src/lazy-pages/FeesPage.tsx
apps/connect/src/lazy-pages/GrowthPage.tsx
apps/connect/src/lazy-pages/MarksPage.tsx
apps/connect/src/lib/connect-queries/background-preload.ts
apps/connect/src/lib/connect-queries/persist.ts
apps/connect/src/lib/connect-queries/prefetch-parent.ts
apps/connect/src/lib/connect-queries/prefetch-student.ts
apps/connect/src/lib/connect-queries/prefetch-teacher.ts
apps/connect/src/lib/connect-queries/schedule-idle.ts
apps/connect/src/lib/connect-queries/isolation.test.ts
apps/connect/src/lib/connect-queries/schedule-idle.test.ts
apps/connect/src/lib/transport/parent-status.test.ts
apps/connect/src/lib/transport-utils.test.ts
apps/connect/src/context/ActivityWorkspaceContext.tsx
apps/connect/src/context/ParentPortalContext.tsx
apps/connect/src/context/StudentPortalContext.tsx
apps/connect/src/context/TeacherPortalContext.tsx
apps/connect/src/routes/_authenticated/academic-history.tsx
apps/connect/src/routes/_authenticated/assignments.tsx
apps/connect/src/routes/_authenticated/certificates.tsx
apps/connect/src/routes/_authenticated/complaints.tsx
apps/connect/src/routes/_authenticated/diary.tsx
apps/connect/src/routes/_authenticated/exams.tsx
apps/connect/src/routes/_authenticated/fees.tsx
apps/connect/src/routes/_authenticated/growth.tsx
apps/connect/src/routes/_authenticated/index.tsx
apps/connect/src/routes/_authenticated/leave.tsx
apps/connect/src/routes/_authenticated/marks.tsx
apps/connect/src/routes/login.tsx
apps/connect/tsconfig.json

apps/transport/package.json
apps/transport/src/components/app/RouteLazyFallback.tsx
apps/transport/src/features/route-setup/RouteSetupPage.tsx
apps/transport/src/lib/notification-inbox/api.ts
apps/transport/src/lib/transport-queries/hooks.ts
apps/transport/src/lib/transport/api-roster.ts
apps/transport/src/lib/transport/attendance/repository.ts
apps/transport/src/lib/transport/gps-outbox.test.ts
apps/transport/src/lib/transport/route-setup/api-sync.test.ts
apps/transport/src/lib/transport/trip/api-ops.hydrate.test.ts
apps/transport/src/lib/transport/trip/store.test.ts
apps/transport/src/routes/_app/alerts.tsx
apps/transport/src/routes/_app/more/bus-information.tsx
apps/transport/src/routes/_app/more/profile.tsx
apps/transport/src/routes/_app/more/route-setup.tsx
apps/transport/src/routes/_app/more/settings.tsx
apps/transport/src/routes/_app/more/support.tsx

apps/nexus/src/lib/institutes/create-api.ts
apps/nexus/src/components/institutes/CreateInstituteDialog.tsx
apps/nexus/src/lib/api/client.ts
apps/nexus/src/lib/audit-log-store.ts
apps/nexus/src/lib/institute-billing-store.ts
apps/nexus/src/routes/institutes.index.tsx
apps/nexus/src/routes/recycle.tsx

backend/src/domains/transport/approach.ts
backend/src/domains/transport/ops-service.ts
backend/src/domains/transport/transport-notification-severity.ts
backend/src/domains/transport/approach.test.ts
backend/src/domains/transport/transport-notification-severity.test.ts
backend/src/domains/transport/transport-rls-policies.test.ts
backend/src/domains/documents/repository.ts
backend/src/domains/identity/service.ts
backend/src/domains/registrations/review-service.ts
backend/src/domains/subscriptions/ensure-trial.ts
backend/STAGING.md
backend/package.json
backend/scripts/e2e-cross-tenant-probe.mjs
backend/scripts/e2e-login-smoke.mjs
backend/scripts/run-smoke-login-with-shells.mjs
backend/tests/identity.test.ts
backend/tests/registrations-approval.test.ts
backend/tests/cross-app-data-sharing.test.ts
backend/tests/helpers/cross-app-fixture.ts

package.json
playwright.config.ts
e2e/admin-auth-boundaries.spec.ts
e2e/admin-documents-certificates-safe.spec.ts
e2e/connect-auth-boundaries.spec.ts
e2e/staging/ensure-multi-role-fixtures.mjs
e2e/staging/live-gate.ts
e2e/staging/multi-role-announcements.spec.ts
e2e/staging/multi-role-attendance.spec.ts
e2e/staging/multi-role-certificates.spec.ts
e2e/staging/multi-role-fees.spec.ts
e2e/staging/multi-role-homework.spec.ts
e2e/staging/multi-role-leave.spec.ts
e2e/staging/multi-role-marks.spec.ts
e2e/staging/run-multi-role-with-shells.mjs
e2e/staging/staging-session.ts
e2e/staging/transport-realtime-probe.mjs

supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls.md
docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md

qa-artifacts/final-release-file-manifest.md
qa-artifacts/final-release-gate-report.md
qa-artifacts/release-file-set-review.md
qa-artifacts/release-phase2-review.md
qa-artifacts/release-candidate-readiness-report.md
qa-artifacts/final-transport-verification-report.md
qa-artifacts/transport-staging-realtime-verification.md
qa-artifacts/four-module-reliability-report.md
qa-artifacts/cross-app-data-sharing-report.md
qa-artifacts/cross-app-data-sharing-matrix.md
qa-artifacts/_transport-gps-rls-apply-report.md
qa-artifacts/_phase3-staging-rls-recon-report.md
qa-artifacts/_repair-history-applied-report.md
```

---

## 4. INCLUDE via branch HEAD (already committed — merge with claim limits)

The **11 commits** ahead of `origin/main` contain **385** paths. For this core web/API release:

**In product claim when merging the branch tip (plus §3 scrubbed commit):**

- Cloudflare Workers / Wrangler upload fixes
- Admin / Connect / Transport / Nexus / API / Website product work already committed
- Docs/certs and related E2E hardening already on HEAD
- Website marketing + downloads **matrix code** (`apps/website/**`, 61 paths) and committed `apps/website/.env.production` (public `VITE_*` bake keys)

**Not in product claim (remain on branch as inert/out-of-scope content):**

- Admissions/Careers product features
- Native APK/EXE distribution readiness
- Android/Capacitor scaffolding and native release tooling (see §6)

Do **not** rewrite history in this task. Practical handling is documented in §6.

---

## 5. EXCLUDE — preserve on disk; do not stage

### 5A. Generated / native binaries

| Pattern | Rationale |
|---------|-----------|
| `apps/admin-desktop/dist-out/**` | Generated EXE/unpacked Electron output; uncommitted; not release-verified |
| Native APK/AAB/EXE installers and signing material (any local build outputs) | Outside approved scope |
| `apps/admissions/android/**`, `apps/careers/android/**`, `apps/nexus/android/**` as **product claims** | Already on HEAD; exclude from release attestation (see §6) |
| `apps/*/capacitor.config.ts`, `apps/*/vite.config.capacitor.ts` (Admissions/Careers/Nexus) as ship claims | Native scaffolding only |

### 5B. Unrelated dirty working-tree churn

| Path | Rationale |
|------|-----------|
| `apps/admin/src/lib/leave-data.ts` | Leave-status churn not required for approved core cut |
| `apps/admin/src/lib/leave/types.ts` | Same |
| `apps/connect/src/activity-workspace/features/extra-curricular/ActivityExtraCurricularPage.tsx` | Activity workspace out of required cut |
| `apps/connect/src/activity-workspace/features/sports/ActivitySportsPage.tsx` | Same |
| `apps/connect/src/components/app/leave/LeaveRequestCalendar.tsx` | Leave UI churn; leave **route** shell does not import this dirty file |
| `apps/connect/src/features/boundaries.ts` | Not demonstrated necessary for approved cut |
| `apps/connect/src/lib/connect-inbox/map-teacher.ts` | Teacher inbox churn |
| `apps/connect/src/lib/dashboard/map.ts` | Dashboard map churn |
| `apps/connect/src/lib/leave-utils.ts` | Leave lib; EXCLUDE (route uses stores, not this dirty file) |
| `apps/connect/src/lib/leave/map.ts` | Leave lib |
| `apps/connect/src/lib/leave/types.ts` | Leave lib |
| `apps/connect/src/lib/leave-utils.test.ts` | Leave test; may be run for safety but not in scrubbed product set |
| `apps/connect/src/lib/leave/map.test.ts` | Leave test |
| `apps/connect/src/lib/parent-portal-data.ts` | Unrelated portal data churn |
| `apps/connect/src/lib/teacher/repositories.ts` | Teacher repository churn |
| `apps/connect/src/lib/teacher/types.ts` | Teacher types churn |
| `packages/auth/src/firebase/crash-reporting.ts` | Shared package churn not proven required |
| `packages/module-attendance/src/dashboard.ts` | Package churn not proven required |
| `packages/types/src/index.ts` | Package churn not proven required |

### 5C. Temporary logs, probes, operator artifacts

```
qa-artifacts/_*.txt
qa-artifacts/_gate-*.txt
qa-artifacts/_phase3-*.json
qa-artifacts/_repair-pre-*.json
qa-artifacts/_repair-post-*.json
qa-artifacts/_repair-command-result.txt
qa-artifacts/_transport-gps-rls-*.json
qa-artifacts/_transport-gps-rls-matrix*
qa-artifacts/configure-staging-env.mjs
qa-artifacts/ensure-staging-smoke-secrets.mjs
qa-artifacts/provision-staging-fixtures.mjs
qa-artifacts/staging-*-probe.mjs
qa-artifacts/signed-out-probe.json
qa-artifacts/aab-build-*.txt
qa-artifacts/phase7-*.txt
qa-artifacts/e2e-docs-certs-*.txt
qa-artifacts/release-*-typecheck.txt
qa-artifacts/release-*-auth.txt
qa-artifacts/release-build-*.txt
qa-artifacts/api-test-run*.txt
qa-artifacts/*-typecheck*.txt
qa-artifacts/*-auth-client-test.txt
qa-artifacts/typecheck-errors.txt
qa-artifacts/cf-pr-body.md
qa-artifacts/verify-security-*-ro.sql
qa-artifacts/staging-project-creation-status.md
qa-artifacts/native-releases-status.md
```

### 5D. Secrets / local env

| Pattern | Rationale |
|---------|-----------|
| `backend/.env*`, local credential files, keystores | Never stage |
| Uncommitted local operator secrets | Never stage |
| `apps/website/.env.production` **values** | Already committed on HEAD; do not reprint; do not treat download URL targets as verified (see §7) |

---

## 6. Branch Android scaffolding — resolution

### Facts

| Tree | Status |
|------|--------|
| `apps/admissions/android/**` | **54 paths already committed** in the 11 commits; **not** in dirty uncommitted set |
| `apps/careers/android/**` | **2 paths already committed**; capacitor configs also committed |
| `apps/nexus/android/**` | **54 paths already committed** |
| Uncommitted Android/native binaries | Only `apps/admin-desktop/dist-out/**` (generated EXE) — **EXCLUDE** |
| Related committed tooling | `apps/downloads-host/**`, `scripts/collect-android-apks.mjs`, Capacitor configs, `qa-artifacts/native-releases-status.md` on HEAD |

### Options (not executed)

1. **Keep the branch intact; exclude native/Admissions/Careers product claims from this release** (recommended).  
2. Create a separate core-only release branch in a **future explicitly approved** task (history rewrite / cherry-pick cost).  
3. Request further owner decision only if merge policy forbids any Admissions/Careers paths on the branch tip.

### Recommendation

**Option 1 — least risk.** Android scaffolding on HEAD does **not** prevent a safe **core web/API** release if release notes and publish checklist:

- claim Admin/Connect/Transport/Nexus/API/Website only;
- state Admissions/Careers are out of scope;
- state native APK/EXE distribution is **not** release-verified;
- do **not** stage `dist-out/**`.

No history rewrite in this workflow.

---

## 7. Website public URL configuration

**File:** `apps/website/.env.production` (committed at HEAD `c384e10e`; **values not printed here**).

### Keys present (names only)

Origins: `VITE_SITE_ORIGIN`, `VITE_ADMIN_ORIGIN`, `VITE_CONNECT_ORIGIN`, `VITE_TRANSPORT_ORIGIN`, `VITE_NEXUS_ORIGIN`  

Download matrix: `VITE_ADMIN_APK_URL`, `VITE_NEXUS_APK_URL`, `VITE_CONNECT_APK_URL`, `VITE_TRANSPORT_APK_URL`, `VITE_ADMISSIONS_APK_URL`, `VITE_CAREERS_APK_URL`, `VITE_ADMIN_DESKTOP_URL`, `VITE_NEXUS_DESKTOP_URL`

Shape check (no values shown): all keys non-empty and `https`-like.

### Build paths that require them

| Consumer | Needs |
|----------|--------|
| `apps/website/src/lib/login-apps.ts` | Origin `VITE_*_ORIGIN` for login deep-links (Admin/Connect/Transport/Nexus; Admissions/Careers origins optional with Connect fallback in code) |
| `apps/website/src/content/downloads.ts` | APK/desktop `VITE_*_URL` for downloads matrix cards |
| `apps/website/src/lib/site.ts` | `VITE_SITE_ORIGIN` |

Production website builds that bake the downloads/login matrix **require** these public `VITE_*` keys. They are **not** secrets.

### Verification status

| Claim | Status |
|-------|--------|
| Keys exist and are non-empty HTTPS-shaped | **Yes** (repo inspection) |
| Target URLs live / assets reachable | **UNVERIFIED** this workflow |
| Admissions/Careers download keys | Present on HEAD but **outside product claims** for this cut |

**Consequence:** Website web/API release may proceed for **origin links and marketing site**, but release notes must **not** claim native download readiness. Broken or stale APK/EXE URLs would affect the downloads page only, not Admin/Connect/Transport/Nexus/API runtime.

---

## 8. Transport / GPS / production RLS limitations (release notes)

| Item | Status |
|------|--------|
| Staging `STOP_APPROACHING` path | **32/32 PASS** (final Transport verification; staging `yveadybpntziyryxsrsu`) |
| GPS status-mapping units | **20 PASS** (`parent-status` 15 + `transport-utils` 5) |
| Browser GPS E2E | **NOT RUN** — no suitable harness; `learner-live.ts` unchanged / must not be edited |
| Staging GPS RLS migration `20261020160000` | Applied + history reconciled (repair applied; no DDL re-apply) — see `_repair-history-applied-report.md` |
| Production GPS RLS | **Not applied** — **separate change request**; not part of this release gate |

---

## 9. NEEDS OWNER REVIEW (only unresolved)

| Topic | Risk | Why evidence cannot fully close it |
|-------|------|-------------------------------------|
| Live reachability of website download `VITE_*` URL targets | Downloads page may link to missing or stale native assets | No HTTP/CDN verification performed; values not live-probed |
| Merge policy if org forbids any Admissions/Careers paths on the ship branch | Process/policy conflict even when product claims exclude them | Repo evidence shows scaffolding is already committed; policy is organizational |

All other prior “owner review” items are **resolved for this cut** by approved scope + §6 recommendation:

- Android scaffolding → keep branch; exclude native claims  
- Leave lib churn → EXCLUDE; leave route shell INCLUDE  
- Production RLS → separate CR  
- Browser GPS E2E → documented limitation  

---

## 10. Release-note recommendation

Proceed as a **core web/API** release candidate **after** a future authorized scrubbed commit of §3, with explicit limitations:

1. Working tree is currently **dirty**; **no release commit** exists yet.  
2. Native APK/EXE distribution is **excluded / not release-verified**.  
3. Browser GPS E2E **was not run**.  
4. Staging Transport probe **32/32** and GPS mapping units **20** support Transport web/API confidence with the above gap.  
5. Production GPS RLS is **out of this release**.  
6. Admissions/Careers are **out of product scope** (scaffolding may still sit on the branch tip).  
7. Website download matrix URLs are **baked but unverified**.  
8. Homework student-submission completeness and diary photo attachments remain known product gaps from prior QA (do not over-claim).

---

## 11. Proposed file set vs committed release

| Concept | Status |
|---------|--------|
| Proposed uncommitted INCLUDE (§3) | Documented here — **not staged** |
| Branch HEAD (11 commits) | Required for CF/website/docs-certs baseline; carry Android trees as non-claimed content |
| Committed release / tag | **Does not exist** |
| Next authorized step (not this task) | Scrubbed `git add` of §3 only → commit → final validation → merge/ship under owner approval |

---

## Safety confirmation (this pass)

- Created/updated only: `qa-artifacts/final-release-file-manifest.md`  
- No `git add` / staging  
- No delete, reset, stash, revert  
- No commit, push, deploy, publication  
- No database or migration commands  
- No secrets or env values printed  
- `learner-live.ts` unchanged  
- `apps/admin-desktop/dist-out/**` untouched and excluded  
- `git diff --check` exit **0**  
