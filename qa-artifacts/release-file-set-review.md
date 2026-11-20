# LumenX — Release Candidate File-Set Review

**Date:** 2026-10-20  
**Nature:** Inventory + recommendation only. **Not** a cleanup, stage, commit, push, deploy, or release.  
**Sources:** `release-phase2-review.md`, `release-candidate-readiness-report.md`, `final-transport-verification-report.md`, `four-module-reliability-report.md`, `_repair-history-applied-report.md`

---

## 1. Branch and working-tree snapshot (re-checked)

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD | `c384e10e67809016fa221ea8d6310656a49ab2f1` |
| Merge-base vs `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead / behind `origin/main` | **11 / 0** |
| Tracking | `origin/fix/cloudflare-workers-build-upload` — tip in sync |
| Working tree | **Dirty** |
| Modified tracked paths | **90** (was ~87 in Phase 2) |
| Untracked paths | **330** (was ~292; includes new GPS formalization artifacts + repair/probe logs + `dist-out` expansion) |
| Committed paths vs `main` | **~385** |
| `git diff --check` | exit **0** |
| `learner-live.ts` working-tree diff vs HEAD | **none** (file exists in the 11-commit ahead set vs `main`) |
| `apps/admin-desktop/dist-out/` | Present, **not** gitignored; **exclude** |

---

## 2. Recommended release scope

### Recommended: **Core school-management web/API stack**

Include product delivery for:

- **API** (`backend/`)
- **Admin** web
- **Connect** web
- **Transport** web
- **Nexus** web
- **Website** marketing / downloads matrix (env-driven URLs)
- **Supabase migrations** already on the branch tip + new GPS RLS migration file
- Staging QA harness needed to reproduce verification

**Explicitly out of product claims for this cut:**

- **Admissions** and **Careers** apps (product features) — even though Android scaffolding already exists in the 11 commits
- Signed native **APK/EXE** distribution readiness (URLs not live-verified; local `dist-out` binaries must not ship in git)
- Full browser GPS chrome E2E (unit-only for UI labels)

### Alternate “full ecosystem” scope (not recommended without split)

Would require accepting Admissions/Careers Capacitor trees, native release workflows, and verified download CDN — **not** attested by current evidence.

---

## 3. Exact proposed INCLUDE manifest (uncommitted → future commit)

Paths below are relative to repo root. Owner should stage **only** these (or a confirmed subset of the “decision needed” list).

### 3.1 Required product changes

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

### 3.2 Required tests

```
apps/admin/src/lib/diary/list-view.test.ts
apps/admin/src/lib/photos/signed-url.test.ts

apps/connect/src/lib/connect-queries/isolation.test.ts
apps/connect/src/lib/connect-queries/schedule-idle.test.ts
apps/connect/src/lib/leave-utils.test.ts
apps/connect/src/lib/leave/map.test.ts
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

### 3.3 Required migration and documentation

```
supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql

docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls.md
docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql
docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md
```

Rationale: Migration file is the reproducible artifact (already history-repaired on staging). Proposal docs preserve review trail.

### 3.4 QA evidence to retain (optional in product ship; recommended for audit commit or wiki)

```
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
qa-artifacts/_final-transport-realtime-probe.txt
```

### 3.5 Already committed on branch (include via merge of HEAD — do not re-stage)

These are **already in the 11 commits** and form part of any merge of this branch:

- Cloudflare Workers / Wrangler / `cf:upload` / `scripts/prepare-cf-worker-deploy.mjs`
- Docs/certs Admin + API + migrations `2026101613/14/150000_*`
- Transport approach/stop-radius/notifications (committed subset; dirty tree has additional edits)
- Website download matrix + `apps/downloads-host` + desktop packaging scripts
- `package-lock.json` (committed)

**Branch-policy flags (already committed — decide before merge):**

| Theme | Paths (examples) | Recommendation |
|-------|------------------|----------------|
| Admissions Android / Capacitor | `apps/admissions/android/**`, capacitor configs | **Out of approved product scope** — split PR or accept as inert packaging |
| Careers Android fragments | `apps/careers/android/**`, capacitor | Same |
| Nexus Android | `apps/nexus/android/**` | Confirm wanted with native tooling |
| Website bake file | `apps/website/.env.production` | Owner review of public URL matrix (see §5) |
| CF deploy rewriter | `scripts/prepare-cf-worker-deploy.mjs` | Keep for Workers branch purpose; **do not re-run** casually |

---

## 4. Exact EXCLUDE manifest

### 4.1 Generated / local binaries (must exclude)

```
apps/admin-desktop/dist-out/**
```

Includes `LumenX-Admin-Setup.exe`, blockmap, `win-unpacked/**` Chromium DLLs/locales, `app.asar`. Leave on disk; do not stage/delete in this gate.

### 4.2 QA noise / operator scripts (exclude from product ship)

```
qa-artifacts/_*.txt                    # command logs (except curated list in §3.4)
qa-artifacts/_phase3-*.json
qa-artifacts/_repair-pre-*.json
qa-artifacts/_repair-post-*.json
qa-artifacts/_repair-command-result.txt
qa-artifacts/_transport-gps-rls-*.json
qa-artifacts/_transport-gps-rls-matrix*.{mjs,sql,txt}
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
qa-artifacts/*-typecheck-review.txt
qa-artifacts/*-auth-client-test.txt
qa-artifacts/typecheck-errors.txt
qa-artifacts/cf-pr-body.md
qa-artifacts/verify-security-*-ro.sql
qa-artifacts/staging-project-creation-status.md
```

### 4.3 Unrelated changes — preserve locally, exclude from this release cut unless owner confirms

```
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
apps/connect/src/lib/parent-portal-data.ts
apps/connect/src/lib/teacher/repositories.ts
apps/connect/src/lib/teacher/types.ts

packages/auth/src/firebase/crash-reporting.ts
packages/module-attendance/src/dashboard.ts
packages/types/src/index.ts
```

Rationale: leave/teacher/activity/shared-package churn was not the Transport/GPS/docs-certs reliability drive; keep in working tree until product owner claims them.

### 4.4 Sensitive / unsafe

| Path | Classification |
|------|----------------|
| Any local `.env` / `.env.staging` (gitignored) | Never commit |
| `apps/website/.env.production` (already committed) | See §5 — public `VITE_*` bake config; owner must confirm URL correctness |
| Secrets in probe JSON under `qa-artifacts/` | Exclude |

---

## 5. `apps/website/.env.production` (safe review — values not printed)

| Finding | Detail |
|---------|--------|
| Key classes | `VITE_SITE_ORIGIN`, `VITE_*_ORIGIN`, `VITE_*_APK_URL`, `VITE_*_DESKTOP_URL` |
| Secret material observed? | **No** — keys are public client bake-time Vite vars (origins + download HTTPS URLs) |
| Includes Admissions/Careers URL keys? | **Yes** — out of product scope but present as download matrix wiring |
| Recommendation | Treat as **public build config**, not a credential store. **Owner must verify** the redacted URL targets are intentional before merge/ship. Do not treat as proof that downloads are live/signed. |

---

## 6. Remaining known limitations (release claims)

1. **Browser GPS E2E** live/stale/disconnected/recovered — **NOT RUN** (units PASS; no Playwright harness; `learner-live.ts` protected).  
2. **Native APK/EXE** signing, CDN, and public download URLs — **NOT VERIFIED**; local `dist-out` EXE is not a release attestation.  
3. **Admissions / Careers** product apps — out of approved scope (scaffolding may still merge with branch).  
4. **Diary photo attachments** — previously noted unimplemented.  
5. **Homework student submission** depth — multi-role publish/visibility PASS in cross-app report; deeper submission UX not re-audited as a release claim.  
6. Working tree remains **dirty** — HEAD alone is not the candidate content until scrubbed commit.  
7. Production denylist GPS RLS — **not** applied (staging only).

---

## 7. Ambiguous files requiring an owner decision

| Item | Decision needed |
|------|-----------------|
| Leave / teacher / activity / `packages/*` dirty paths (§4.3) | Include with product scrub, or leave uncommitted |
| Admissions/Careers/Nexus Android trees in 11 commits | Split before merge vs accept as inert packaging |
| Curated `qa-artifacts/*.md` (§3.4) | Commit for audit trail vs keep local-only |
| Website download URL matrix in `.env.production` | Confirm public URLs before merge |
| Whether CF Workers tooling ships in same PR as all reliability dirty-tree work | Prefer one scrubbed commit set or split |

---

## 8. Checks performed this review

```text
git rev-parse HEAD / branch / status -sb
git rev-list --left-right --count origin/main...HEAD   → 0 11
git diff --name-only HEAD                              → 90 paths
git ls-files --others --exclude-standard               → 330 paths
git diff --name-only origin/main...HEAD                → ~385 paths
git show HEAD:apps/website/.env.production             → keys only, values redacted
git diff --check                                       → exit 0
git diff --name-only HEAD -- apps/connect/src/lib/transport/learner-live.ts → empty
```

No database access. No staging/commit/push/deploy. No deletion or cleanup of `dist-out` or other user files.

---

## 9. Recommendation

**Proposed cut:** core school-management web/API + GPS RLS migration + staging harness + curated QA reports, after scrubbing §4.3 unrelated dirty paths and excluding §4.1–4.2.

**Blockers before declaring ship-ready:**

1. Owner-approved scrubbed stage/commit of §3 include list.  
2. Branch-policy decision on Admissions/Careers Android trees already on HEAD.  
3. Accept browser GPS E2E + native download gaps as known limitations, or close them.  
4. Owner confirmation of website `VITE_*` download URL matrix.

**Status of this document:** inventory only — working tree preserved; nothing staged, deleted, committed, pushed, or deployed.
