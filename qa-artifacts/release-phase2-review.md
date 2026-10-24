# LumenX Release Gate — Phase 2: Candidate Inventory and Migration Proposal

**Date:** 2026-10-20  
**Nature of this document:** Inventory + proposal only. **Not** a release candidate cut, **not** a migration execution, **not** an approve-to-ship attestation.  
**Safety:** No commit, push, deploy, release, staging/production DB writes, migration apply, file deletion, stash, revert, or destructive cleanup. `learner-live.ts` not modified. `prepare-cf-worker-deploy` not run. Secrets/env values not printed.

---

## 1. Branch and commit information

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD | `c384e10e67809016fa221ea8d6310656a49ab2f1` |
| HEAD subject | Ship downloads-host URLs, desktop packaging updates, and website download matrix links. |
| Merge-base vs `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead of `origin/main` | **11** commits |
| Behind `origin/main` | **0** |
| Tracking | `origin/fix/cloudflare-workers-build-upload` — tip in sync with local HEAD |
| Working tree | **Dirty** — 87 tracked modifications; ~292 untracked paths (excl. ignored) |
| Repo instructions | Root `AGENTS.md` (Turborepo agent rules block present) |

### Commits ahead of `origin/main` (oldest → newest)

| SHA | Subject |
|-----|---------|
| `644cd8a3` | Fix Cloudflare Workers Builds upload configuration |
| `63966ad3` | Fix default Cloudflare Workers upload configuration |
| `3ccd3944` | Make Cloudflare Workers upload use explicit cf:upload contract |
| `38ef951b` | Raise Admin Workers build heap and require cf:upload deploy command |
| `c4c9e131` | Point Wrangler configs at post-build dist for default CF upload |
| `8c4361d2` | Write monorepo-root Wrangler config for Cloudflare deploy cwd |
| `12bcf5fb` | Clarify CF root cause and stabilize docs-certs E2E for CI |
| `9b42eb1e` | Stabilize docs/certs E2E without wall-clock loading races |
| `787b8131` | Harden document numbering and ship docs/certs plus related client auth fixes |
| `e8274c2e` | Ship website download matrix, native release tooling, and shadcn marketing UI |
| `c384e10e` | Ship downloads-host URLs, desktop packaging updates, and website download matrix links |

**Committed delta size:** ~385 paths vs `origin/main` (includes `package-lock.json`).

---

## 2. Complete file classification and proposed manifest

### 2A. Classification of **uncommitted** working-tree changes

#### Intended product code (candidate include — pending owner scrub)

| Paths | Rationale |
|-------|-----------|
| `apps/admin/src/routes/diary.tsx`, `photos.tsx`, `lib/photos/signed-url.ts`, `lib/admin-queries/persist.ts` | Diary/photos reliability |
| `apps/connect/src/context/{Parent,Student,Teacher,Activity}Workspace*.tsx`, `lib/connect-queries/{persist,prefetch-*,background-preload,schedule-idle}.ts`, `components/app/RouteLazyFallback.tsx`, `lazy-pages/*`, `_authenticated/{complaints,exams,fees,growth,marks,diary,leave,assignments,certificates,academic-history,index}.tsx`, `routes/login.tsx`, `tsconfig.json` | Prefetch / lazy-route performance |
| `apps/transport/src/routes/_app/{alerts,more/*}.tsx`, `features/route-setup/RouteSetupPage.tsx`, `components/app/RouteLazyFallback.tsx`, `lib/notification-inbox/api.ts`, `lib/transport-queries/hooks.ts`, `lib/transport/{api-roster,attendance/repository}.ts`, `package.json` | Transport UX lazy + ops client |
| `backend/src/domains/transport/{approach,ops-service,transport-notification-severity}.ts` | Approach coalesce / notify severity |
| `backend/src/domains/registrations/review-service.ts`, `identity/service.ts`, `subscriptions/ensure-trial.ts` (untracked), `documents/repository.ts` | API reliability / trial / docs |
| `apps/nexus/src/lib/institutes/create-api.ts` (untracked), `CreateInstituteDialog.tsx`, `institutes.index.tsx`, `recycle.tsx`, `api/client.ts`, billing/audit stores | Nexus institute create |
| `docs/proposals/transport_vehicle_location_guardian_realtime_rls.{sql,md}` | Reviewed GPS RLS proposal |
| `docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md` | This Phase 2 formalization plan |
| `docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` | Ready-to-copy migration body (**still under proposals/**) |
| `e2e/staging/**` | Staging harness (no secrets in tree review) |
| `backend/STAGING.md`, `backend/scripts/{e2e-*,run-smoke-login-with-shells.mjs}`, root/`backend` `package.json` script touches | Staging ops docs/scripts |
| `e2e/{admin,connect}-auth-boundaries.spec.ts`, `e2e/admin-documents-certificates-safe.spec.ts`, `playwright.config.ts` | E2E hardening |

#### Tests (include with matching product)

| Paths |
|-------|
| `apps/admin/src/lib/{diary/list-view,photos/signed-url}.test.ts` |
| `apps/connect/src/lib/{connect-queries/isolation,leave/map,leave-utils,connect-queries/schedule-idle}.test.ts` (+ untracked leave-utils / schedule-idle tests) |
| `apps/transport/src/lib/transport/{gps-outbox,route-setup/api-sync,trip/*}.test.ts` |
| `backend/src/domains/transport/{approach,transport-notification-severity}.test.ts` |
| `backend/tests/{identity,registrations-approval,cross-app-data-sharing}.test.ts` |
| `backend/tests/helpers/cross-app-fixture.ts` |

#### QA evidence (audit keep; optional in product ship)

| Paths | Notes |
|-------|-------|
| `qa-artifacts/release-candidate-readiness-report.md` | Prior RC gate |
| `qa-artifacts/release-phase2-review.md` | This report |
| `qa-artifacts/{four-module-reliability,transport-staging-realtime-verification,cross-app-data-sharing-{report,matrix}}.md` | Reliability evidence |
| `qa-artifacts/_transport-gps-rls-*` | Staging RLS apply + matrix artifacts |
| `qa-artifacts/_rc-*`, `_baseline-*`, `_final-*`, `_phase*`, `release-*-typecheck.txt`, etc. | Local command logs |

#### Generated build output — **exclude**

| Path | Detail |
|------|--------|
| `apps/admin-desktop/dist-out/` | **77 files, ~364 MB**; unpackaged Electron + `LumenX-Admin-Setup.exe` + blockmap + Chromium locales/DLLs. **Not** gitignored. Unreviewed for signing/distribution. |

#### Local-only / sensitive / unsafe-to-release — **exclude**

| Path / class | Why |
|--------------|-----|
| `qa-artifacts/configure-staging-env.mjs`, `ensure-staging-smoke-secrets.mjs`, `provision-staging-fixtures.mjs` | Staging operator scripts — risk of env/fixture coupling; keep out of product ship unless deliberately published |
| `qa-artifacts/*probe*.json`, matrix seed SQL with fixture IDs | May contain staging identifiers; treat as local evidence |
| Any `.env` / credentials (denylist) | Must never commit; none newly listed as modified in this status snapshot |
| Admissions / Careers product scope | Out of **approved** release scope for this gate (note: already present in **committed** history — see §2C) |

#### Unrelated / needs human triage before include

| Paths | Why flagged |
|-------|-------------|
| `apps/admin/src/lib/leave-{data,types}` | Leave status churn — confirm intentional |
| `apps/connect/src/lib/leave/*`, `leave-utils.ts`, activity sports/extra-curricular pages, teacher repositories/types, `connect-inbox/map-teacher.ts`, `features/boundaries.ts`, `parent-portal-data.ts`, `dashboard/map.ts` | Mixed portal/leave/teacher edits |
| `packages/auth/src/firebase/crash-reporting.ts`, `packages/types/src/index.ts`, `packages/module-attendance/src/dashboard.ts` | Shared-package touch-ups |
| Transport store/test micro-edits beyond approach/notify | Confirm vs noise |

### 2B. `apps/admin-desktop/dist-out/` inventory (must exclude)

| Artifact | Role |
|----------|------|
| `LumenX-Admin-Setup.exe` | NSIS installer binary |
| `LumenX-Admin-Setup.exe.blockmap` | updater blockmap |
| `builder-debug.yml` | electron-builder debug |
| `.icon-ico/icon.ico` | packaging icon |
| `win-unpacked/LumenX Admin.exe` | unpacked app |
| `win-unpacked/**` (Chromium `.pak`/`.dll`, `app.asar`, `elevate.exe`, locales) | runtime payload |

**Action for any future commit:** leave untracked / add ignore; do **not** stage. Do **not** delete in this phase (user tree preserved).

### 2C. Review of the **11 commits** ahead of `origin/main`

These are already on the branch tip (and remote). They are **in scope for merge review** even when the dirty working tree is scrubbed separately.

| Theme | Assessment |
|-------|------------|
| Cloudflare Workers upload / Wrangler / `cf:upload` / `prepare-cf-worker-deploy.mjs` | Core branch purpose — **requires deploy-config review** before production Workers use; do not re-run rewrite scripts casually |
| Docs/certs + document numbering migration `20261016150000_*` + Admin/API docs UI | Product — **in-scope** for a docs/certs-capable release; needs its own acceptance |
| Transport approach/stop-radius/notifications (committed) | Product — overlaps dirty-tree Transport work; review for double-edit |
| Website marketing + download matrix + `apps/downloads-host` | Product/marketing — native URLs env-driven |
| Native tooling (`release-downloads.yml`, collect APK/EXE scripts, desktop packaging) | Tooling — **does not** prove signed CDN artifacts |
| `apps/website/.env.production` | Tracked bake-time `VITE_*` origins + download URL keys (values redacted in this review). **Review before merge** for correctness of public URLs; not a secret dump, but ships download matrix wiring including Admissions/Careers URL keys |
| **Admissions + Careers Android scaffolding** (`apps/admissions/android/**`, careers android fragments, capacitor) | **Out of currently approved release scope** but already committed — needs explicit product decision: strip/split PR vs accept as inert packaging |
| Nexus Android scaffolding | Same “native packaging” theme — confirm wanted on this branch |
| `apps/connect/.../learner-live.ts` | Appears in committed ahead set vs `main`; **working tree has no further diff** vs HEAD. Protected-file rule: do not modify further without separate approval |
| Blueprint security_invoker view migrations (`20261016130000`, `20261016140000`) | Schema — verify staging/prod apply status separately from GPS RLS |

**Additional review required before treating HEAD as shippable:** Admissions/Careers native trees, CF deploy contract, website `.env.production` URL matrix, and whether docs/certs migrations are applied on target DBs.

### 2D. Proposed release manifest (future commit scrub)

#### INCLUDE (proposed)

1. **Dirty-tree product + tests** listed in §2A (after human confirmation of leave/teacher/activity triage).  
2. **GPS RLS proposal + formalization** under `docs/proposals/` (not yet under `supabase/migrations/`).  
3. **`e2e/staging/**` harness.**  
4. **Selected QA reports** (recommended):  
   `release-candidate-readiness-report.md`, `release-phase2-review.md`, `four-module-reliability-report.md`, `transport-staging-realtime-verification.md`, `_transport-gps-rls-apply-report.md`, `cross-app-data-sharing-report.md`, `cross-app-data-sharing-matrix.md`.  
5. **Already committed** CF/docs-certs/downloads work at HEAD — merge review as a unit or split (see §8).

#### EXCLUDE (must)

- `apps/admin-desktop/dist-out/**`  
- Bulk `qa-artifacts/_*.txt` command logs (noise) unless audit archive desired  
- Operator secret/fixture scripts unless intentionally published  
- Any env files with credentials  
- Unrelated leave/teacher/activity paths until confirmed  

#### SEPARATE FOLLOW-UP (not part of this inventory commit)

- Promote GPS RLS into `supabase/migrations/` per formalization proposal (Part B).  
- Production denylist apply.  
- Native signing + live download URL attestation.

---

## 3. Files that must be excluded from a release cut

| Must exclude | Justification |
|--------------|---------------|
| `apps/admin-desktop/dist-out/**` | Generated binaries (~364 MB); unsigned/unpublished; not ignored |
| Secrets / local `.env*` (except reviewed tracked examples / website bake file under explicit review) | Credential risk |
| Most `qa-artifacts/_*.txt` / probe JSON | Local evidence noise / fixture IDs |
| Staging matrix seed SQL used for RLS mutation tests | Not product; fixture coupling |
| Admissions/Careers **product** claims | Out of approved scope (committed android trees still need a branch-policy decision) |

---

## 4. Migration-formalization proposal path

| Artifact | Path |
|----------|------|
| Formalization plan | `docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md` |
| Ready-to-copy SQL (still under proposals) | `docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` |
| Reviewed source SQL | `docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql` |
| Design / security notes | `docs/proposals/transport_vehicle_location_guardian_realtime_rls.md` |
| Staging apply evidence | `qa-artifacts/_transport-gps-rls-apply-report.md` |
| Phase9 baseline (do not edit) | `supabase/migrations/20261006020000_transport_phase9_rls_hardening.sql` |
| **Intended eventual path** | `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` (**not created there**) |

Preserved behavior: membership via `is_institute_member`, enrollment approval `pending|approved`, active-trip filters (`finalized`, `phase <> completed`, soft-delete), helper-only guardian branch, **`REVOKE … FROM anon`**.

---

## 5. Staging-versus-migration-history reconciliation plan

Summary of the formalization doc (do **not** execute now):

1. **Read-only** confirm project ref `yveadybpntziyryxsrsu`.  
2. **Inspect** `supabase_migrations.schema_migrations` for version `20261020160000` / guardian GPS name — **uncertainty: not inspected this phase**.  
3. **Compare** live function def, owner, grants (`anon` must lack EXECUTE), and policy `USING` to proposal.  
4. If schema matches and version missing → **mark-applied / repair** preferred over re-DDL.  
5. If schema missing/drifted → apply via normal migrator, then re-verify owner/grants + RLS matrix + probe (probe needs separate write approval).  
6. Production denylist only under a separate CR.  
7. Rollback = restore phase9 policy body + `DROP FUNCTION` + history repair if needed.

**Flag:** Companion proposal `.md` still says “Proposal only — not applied”; staging schema **was** applied (apply report). Docs status drift should be fixed when formalization lands.

---

## 6. Outstanding Transport and native-download limitations

| Limitation | Status |
|------------|--------|
| Parent GPS Realtime on staging | Verified earlier same day (probe 30 PASS) — evidence on disk; not re-run this Phase 2 |
| GPS RLS in `supabase/migrations/` | **Missing** — formalization proposed only |
| `STOP_APPROACHING` staging emit / sibling coalesce | **NOT RUN** (needs post-grace distant pings / DB writes) |
| Browser E2E live/stale/disconnected/recovered GPS | **NOT RUN** (no harness; must not edit `learner-live.ts`) |
| Native APK/EXE signing + CDN URLs live | **NOT VERIFIED**; website uses env `VITE_*_*_URL`; local `dist-out` EXE is not a release attestation |
| Admissions / Careers | Out of approved product scope |
| Homework student submission depth | Not re-audited this phase (prior cross-app homework visibility PASS only) |
| `four-module-reliability-report.md` §D GPS FAIL | Superseded for staging by RLS apply report — doc drift remains |

---

## 7. Exact checks performed (this Phase 2)

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` / branch / `status -sb` | HEAD `c384e10e`; dirty; tracking in sync |
| `git rev-list --left-right --count origin/main...HEAD` | `0 11` (behind/ahead) |
| `git log --oneline origin/main..HEAD` | 11 commits listed §1 |
| `git diff --name-only origin/main...HEAD` | ~385 committed paths reviewed at summary level |
| `git status --short` + untracked inventory | 87 modified; ~292 untracked |
| `git diff --stat HEAD` | 87 files, +1493 / −3521 |
| `git diff --check` | **exit 0** (CRLF replacement warnings only) |
| `apps/admin-desktop/dist-out` listing | 77 files, ~364.09 MB |
| `git check-ignore` on dist-out EXE | **Not ignored** |
| Read proposals + apply report + phase9 policy excerpt | Done |
| Confirm no working-tree diff on `learner-live.ts` vs HEAD | Clean vs HEAD |
| Database queries / migration apply | **NOT RUN** |
| Typecheck / vitest re-run | **NOT RUN** this phase (see prior RC report for last results) |
| Commit / push / deploy / delete | **NOT DONE** |

---

## 8. Recommended next approval decisions

1. **Approve a scrubbed include-list** for a future commit (product + tests + selected proposals/QA; **exclude** `dist-out` and log noise).  
2. **Decide branch policy for Admissions/Careers Android trees** already in the 11 commits (split PR vs accept as inert packaging vs defer merge).  
3. **Approve migration formalization Step A** (copy SQL into `supabase/migrations/` + RLS source tests) — repo-only.  
4. **Approve staging read-only history/schema inspection** (§5 / formalization §3), then choose mark-applied vs re-apply.  
5. **Accept or schedule** `STOP_APPROACHING` staging + browser GPS E2E gaps.  
6. **Do not claim native distribution ready** until signed artifacts + live HTTPS URLs are verified.  
7. Keep **production denylist** on a separate change request.

---

## Closing statement

This Phase 2 deliverable is an **inventory and migration-formalization proposal only**. It does **not** declare a clean release candidate, does **not** execute migrations, and does **not** alter database state. Working-tree user changes and generated binaries were preserved in place.
