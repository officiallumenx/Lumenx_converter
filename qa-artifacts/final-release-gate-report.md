# LumenX — Final Release Gate Report (Core Web/API Only)

**Date:** 2026-10-20  
**Gate type:** Inventory + safe local validation only  
**Approved scope:** Admin · Connect · Transport · Nexus · API · Website  
**Out of product scope:** Admissions · Careers · native APK/EXE distribution

---

## 1. Final verdict

# **READY WITH KNOWN LIMITATIONS**

Safe typechecks and focused regressions for the approved scope **PASS**. Staging Transport probe + GPS RLS migration formalization evidence are green. The working tree is **not clean**, no release commit exists, browser GPS E2E was **not** run, and native downloads remain **excluded / unverified**. Owner must scrub and commit the proposed file set, and decide branch policy for already-committed Admissions/Careers Android trees, before any merge/ship.

**This is a proposed release file set, not a committed release.**

---

## 2. Branch, HEAD, upstream

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD | `c384e10e67809016fa221ea8d6310656a49ab2f1` |
| Subject | Ship downloads-host URLs, desktop packaging updates, and website download matrix links. |
| Merge-base vs `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead / behind `origin/main` | **11 / 0** |
| Tracking | `origin/fix/cloudflare-workers-build-upload` — tip in sync |
| Working tree | **Dirty** — **90** modified tracked · **331** untracked |
| Staged index | **Empty** (nothing staged this gate) |
| `git diff --check` | exit **0** |
| `learner-live.ts` vs HEAD | **unchanged** |
| `apps/admin-desktop/dist-out/` | Present, untouched, **excluded** |

---

## 3. Path-by-path proposed manifest

### 3A. INCLUDE — uncommitted product (future scrubbed commit)

```
apps/admin/src/lib/admin-queries/persist.ts
apps/admin/src/lib/photos/signed-url.ts
apps/admin/src/routes/diary.tsx
apps/admin/src/routes/photos.tsx

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
apps/transport/src/routes/_app/alerts.tsx
apps/transport/src/routes/_app/more/bus-information.tsx
apps/transport/src/routes/_app/more/profile.tsx
apps/transport/src/routes/_app/more/route-setup.tsx
apps/transport/src/routes/_app/more/settings.tsx
apps/transport/src/routes/_app/more/support.tsx

backend/src/domains/transport/approach.ts
backend/src/domains/transport/ops-service.ts
backend/src/domains/transport/transport-notification-severity.ts
backend/src/domains/documents/repository.ts
backend/src/domains/identity/service.ts
backend/src/domains/registrations/review-service.ts
backend/src/domains/subscriptions/ensure-trial.ts
backend/STAGING.md
backend/package.json
backend/scripts/e2e-cross-tenant-probe.mjs
backend/scripts/e2e-login-smoke.mjs
backend/scripts/run-smoke-login-with-shells.mjs

apps/nexus/src/lib/institutes/create-api.ts
apps/nexus/src/components/institutes/CreateInstituteDialog.tsx
apps/nexus/src/lib/api/client.ts
apps/nexus/src/lib/audit-log-store.ts
apps/nexus/src/lib/institute-billing-store.ts
apps/nexus/src/routes/institutes.index.tsx
apps/nexus/src/routes/recycle.tsx

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
```

### 3B. INCLUDE — required tests

```
apps/admin/src/lib/diary/list-view.test.ts
apps/admin/src/lib/photos/signed-url.test.ts
apps/connect/src/lib/connect-queries/isolation.test.ts
apps/connect/src/lib/connect-queries/schedule-idle.test.ts
apps/connect/src/lib/transport/parent-status.test.ts
apps/connect/src/lib/transport-utils.test.ts
apps/transport/src/lib/transport/gps-outbox.test.ts
apps/transport/src/lib/transport/route-setup/api-sync.test.ts
apps/transport/src/lib/transport/trip/api-ops.hydrate.test.ts
apps/transport/src/lib/transport/trip/store.test.ts
backend/src/domains/transport/approach.test.ts
backend/src/domains/transport/transport-notification-severity.test.ts
backend/src/domains/transport/transport-rls-policies.test.ts
backend/tests/identity.test.ts
backend/tests/registrations-approval.test.ts
backend/tests/cross-app-data-sharing.test.ts
backend/tests/helpers/cross-app-fixture.ts
```

### 3C. INCLUDE — migration + proposal docs

```
supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls.md
docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md
```

### 3D. INCLUDE — curated Markdown QA only

```
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

### 3E. INCLUDE via branch HEAD (already committed — merge review)

Core CF Workers / docs-certs / website / downloads-host / Transport / Admin docs work in the **11 commits** ahead of `main` (~385 paths). Website product code is in scope. **Do not** treat Admissions/Careers Android scaffolding as approved product (see owner-review).

### 3F. EXCLUDE (preserve on disk; do not stage)

```
apps/admin-desktop/dist-out/**

apps/admin/src/lib/leave-data.ts
apps/admin/src/lib/leave/types.ts
apps/connect/src/activity-workspace/features/extra-curricular/ActivityExtraCurricularPage.tsx
apps/connect/src/activity-workspace/features/sports/ActivitySportsPage.tsx
apps/connect/src/components/app/leave/LeaveRequestCalendar.tsx
apps/connect/src/features/boundaries.ts
apps/connect/src/lib/connect-inbox/map-teacher.ts
apps/connect/src/lib/dashboard/map.ts
apps/connect/src/lib/leave-utils.ts
apps/connect/src/lib/leave/map.ts
apps/connect/src/lib/leave/types.ts
apps/connect/src/lib/leave-utils.test.ts
apps/connect/src/lib/leave/map.test.ts
apps/connect/src/lib/parent-portal-data.ts
apps/connect/src/lib/teacher/repositories.ts
apps/connect/src/lib/teacher/types.ts
packages/auth/src/firebase/crash-reporting.ts
packages/module-attendance/src/dashboard.ts
packages/types/src/index.ts

qa-artifacts/_*.txt                    # temporary command logs
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
qa-artifacts/_gate-*.txt                   # this gate’s raw logs
```

Also exclude from **product claims** (already on HEAD): native release workflows as ship attestation; Admissions/Careers product features.

### 3G. NEEDS OWNER REVIEW

| Path / topic | Why |
|--------------|-----|
| `apps/admissions/android/**` (in 11 commits) | Out of approved product scope but already on branch — split vs accept as inert packaging |
| `apps/careers/android/**` (in 11 commits) | Same |
| `apps/nexus/android/**` (in 11 commits) | Native scaffolding; confirm with core web/API cut |
| `apps/website/.env.production` (committed) | Public `VITE_*` bake keys only (origins + download URLs). **Required** for website production builds that bake origins/download matrix. **Targets not live-verified** this gate; includes Admissions/Careers URL keys outside product claims |
| `scripts/prepare-cf-worker-deploy.mjs` / Wrangler configs | Part of branch purpose; do not re-run mutating deploy prep casually |
| Whether Connect `_authenticated/leave.tsx` alone is enough without leave lib churn | Route is in INCLUDE (lazy/prefetch work); leave **lib** files stay EXCLUDE unless product owns leave status work |

---

## 4. Final typecheck and test results (this gate)

### Typecheck — all PASS

| Command | Result |
|---------|--------|
| `npm run typecheck:api` | **PASS** |
| `npm run typecheck:admin` | **PASS** |
| `npm run typecheck:connect` | **PASS** |
| `npm run typecheck --workspace=@lumenx/app-transport` | **PASS** |
| `npm run typecheck --workspace=@lumenx/app-nexus` | **PASS** |
| `npm run typecheck:website` | **PASS** |

Logs: `qa-artifacts/_gate-tsc-*.txt`

### Focused vitest — this gate

| Suite | Command | Result |
|-------|---------|--------|
| API / Transport / identity / registrations / cross-app | `npx vitest run` 7 files | **60 PASS** |
| Admin diary + photos | workspace vitest 2 files | **23 PASS** |
| Connect transport UI + prefetch isolation + schedule-idle (+ leave-utils*) | workspace vitest 5 files | **36 PASS** |
| Transport client | workspace vitest 4 files | **24 PASS** |

\* `leave-utils.test.ts` was executed for safety (suite green) but the corresponding leave **source** files remain on the **EXCLUDE** list unless the owner expands leave scope.

**Total focused tests this gate:** 60 + 23 + 36 + 24 = **143 PASS / 0 FAIL**

### Not run this gate

- Staging probe re-run (uses prior final Transport verification: **32 PASS**)
- Browser GPS E2E
- Full deploy / CF upload / `prepare-cf-worker-deploy`
- Database / migration commands

---

## 5. Migration reproducibility and staging evidence

| Check | Evidence | Status |
|-------|----------|--------|
| Local migration file present | `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` (untracked) | **Yes** |
| Predicates preserved | `is_institute_member`, `approval_status IN ('pending','approved')`, `finalized = false`, `phase <> 'completed'`, `SECURITY DEFINER`, `REVOKE … FROM anon` | **Yes** (file review) |
| Staging project | `yveadybpntziyryxsrsu` | Documented in `_repair-history-applied-report.md` |
| History reconciliation | `migration repair --status applied` — **no DDL re-apply** | Documented |
| Production denylist | `kmpzflsurepjwqnfqyld` not updated by this workflow | Documented |
| This gate DB access | None | Confirmed |

**Uncertainty (flagged, not blocking local formalization):** This gate did **not** re-query staging; history tip and grants are trusted from `_repair-history-applied-report.md` + `_phase3-staging-rls-recon-report.md` same-day evidence. Fresh environments still need normal migrate of `20261020160000`.

---

## 6. Known limitations and scope exclusions

1. Working tree **dirty**; **no release commit** created.  
2. Transport staging probe (prior same-day final run): **`STOP_APPROACHING` path green — 32/32 PASS**.  
3. GPS status mapping units (this gate Connect suite includes parent-status + transport-utils): **20 tests** in those two files alone (15 + 5); full Connect focused suite **36 PASS**.  
4. **Browser GPS E2E NOT RUN** — no suitable harness; do **not** claim browser-level verification.  
5. **Native APK/EXE excluded** — not release-verified; `dist-out` excluded.  
6. **Admissions / Careers** outside product scope (scaffolding may still sit on branch HEAD).  
7. **Homework student submission** — staging multi-role visibility previously PASS; deeper student-submission product completeness **not** claimed as verified end-to-end for this cut.  
8. Diary photo attachments previously noted unimplemented.  
9. Website download URL targets **not** live-verified.  
10. Production GPS RLS **not** applied.

---

## 7. Remaining owner decisions

1. Approve scrubbed stage/commit of §3A–3D only (leave §3F on disk).  
2. Branch policy: split or accept Admissions/Careers/Nexus Android trees already in the 11 commits.  
3. Confirm website `.env.production` public URL matrix is intentional for bake (values not printed here).  
4. Accept known limitations (§6) or require browser GPS E2E / native verification before merge.  
5. Separate CR for production denylist GPS RLS when ready.

---

## 8. Proposed file set vs committed release

| Concept | Status |
|---------|--------|
| Proposed include list | Documented in §3 — **not staged** |
| Committed release / tag | **Does not exist** |
| Merge of current HEAD alone | Incomplete vs proposed product (dirty-tree reliability work missing) + carries Admissions/Careers Android trees needing policy |
| Clean shippable RC | Requires future explicit commit of §3A–3D after owner scrub |

---

## Safety confirmation (this gate)

- No `git add` / staging of files  
- No delete, reset, stash, revert, or destructive cleanup  
- No commit, push, deploy, or publication  
- No database or migration command  
- No secrets printed (`apps/website/.env.production` keys only, values redacted)  
- `apps/connect/src/lib/transport/learner-live.ts` unchanged vs HEAD  
- `apps/admin-desktop/dist-out/**` untouched and excluded  
- `prepare-cf-worker-deploy` not run  
