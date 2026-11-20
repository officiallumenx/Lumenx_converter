# LumenX — Final Core Web/API Release Validation Report

**Date:** 2026-10-20  
**Nature:** Validation only. **Not** a stage, commit, push, deploy, migration, or release.  
**Approved scope:** Admin · Connect · Transport · Nexus · Backend API · Website  
**Out of product claims:** Admissions · Careers · native APK/EXE distribution  
**Manifest:** `qa-artifacts/final-release-file-manifest.md`  
**Prior gate:** `qa-artifacts/final-release-gate-report.md`

---

## 1. Final recommendation

# **READY FOR OWNER RELEASE APPROVAL**

Fresh typechecks (6/6) and focused approved-scope vitest suites **PASS**. Manifest INCLUDE paths (117) all exist; no secrets, `dist-out`, or temp logs in the proposed set. Remaining gaps are documented limitations or owner policy items — **no code/test blockers** for approving a future scrubbed release commit of the curated manifest only.

**This is not a committed release and not deployment readiness.**

---

## 2. Branch / HEAD / upstream

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD | `c384e10e67809016fa221ea8d6310656a49ab2f1` |
| Subject | Ship downloads-host URLs, desktop packaging updates, and website download matrix links. |
| Merge-base vs `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead / behind `origin/main` | **11 / 0** |
| Tracking | `origin/fix/cloudflare-workers-build-upload` — tip in sync |
| Modified tracked | **90** |
| Untracked (short / `-uall`) | **252** / **343** (includes prior untracked QA + this report) |
| Staged | **0** |
| `git diff --check` | exit **0** |
| Release commit | **Does not exist** |

---

## 3. Manifest verification

| Check | Result |
|-------|--------|
| Manifest file present | **Yes** |
| Copy-ready INCLUDE path count | **117** |
| Paths missing on disk | **0** |
| Secrets / `.env` / credentials in INCLUDE | **None** |
| `dist-out` / `.exe` / `.apk` / `.aab` in INCLUDE | **None** |
| Temp logs (`_gate-*`, `*.txt` probes) in INCLUDE | **None** (curated Markdown QA only) |
| Leave/teacher/activity/`packages/*` churn in INCLUDE | **None** (remain EXCLUDE on disk) |
| Migration `20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` in INCLUDE | **Yes** (present, untracked) |
| Discrepancies vs tree | Untracked counts rose by +1 short / +1 `-uall` vs manifest snapshot due to this validation report; **not** a path-set error |

Manifest EXCLUDE items (`dist-out/**`, leave lib churn, probe JSON/txt, operator scripts) remain on disk and were **not** staged or deleted.

---

## 4. Test / typecheck evidence

### Script safety (inspected before run)

| Script | Behavior |
|--------|----------|
| `typecheck*` (api/admin/connect/transport/nexus/website) | `tsc --noEmit` only — **safe** |
| Workspace `test` / `vitest run <files>` | Local unit tests — **safe** |
| App `build` scripts | Invoke `prepare-cf-worker-deploy.mjs` — **NOT RUN** |
| Staging probe / migrations | DB-mutating or remote — **NOT RUN** |

### Fresh runs (this validation)

| Check | Command | Result |
|-------|---------|--------|
| API typecheck | `npm run typecheck:api` | **PASS** |
| Admin typecheck | `npm run typecheck:admin` | **PASS** |
| Connect typecheck | `npm run typecheck:connect` | **PASS** |
| Transport typecheck | `npm run typecheck --workspace=@lumenx/app-transport` | **PASS** |
| Nexus typecheck | `npm run typecheck --workspace=@lumenx/app-nexus` | **PASS** |
| Website typecheck | `npm run typecheck:website` | **PASS** |
| API focused vitest (6 INCLUDE files) | `npx vitest run` approach / severity / rls-policies / identity / registrations / cross-app | **PASS — 55 tests / 6 files** |
| Admin focused vitest | diary + photos | **PASS — 23 tests / 2 files** |
| Connect focused vitest (INCLUDE only) | parent-status + transport-utils + isolation + schedule-idle | **PASS — 34 tests / 4 files** (GPS mapping subset **20**) |
| Transport focused vitest | gps-outbox + api-sync + hydrate + store | **PASS — 24 tests / 4 files** |

**Fresh focused total:** 55 + 23 + 34 + 24 = **136 PASS / 0 FAIL**

### Historical evidence (not rerun this validation)

| Evidence | Source | Classification |
|----------|--------|----------------|
| Prior gate typechecks 6× PASS (~17:15) | `qa-artifacts/_gate-tsc-*.txt` | **HISTORICAL PASS** — superseded by fresh PASS above |
| Prior gate vitest 143 PASS (included `leave-utils` + `ops-notifications-audience`) | `qa-artifacts/_gate-vitest-*.txt` | **HISTORICAL PASS** — broader than INCLUDE subset |
| Staging Transport probe **32/32 PASS** | `final-transport-verification-report.md` | **HISTORICAL PASS** — **NOT RUN** this validation (staging DB / probe side effects) |
| Browser GPS E2E | Same report | **NOT RUN** (no harness; protected `learner-live.ts`) |
| Full app `build` / CF deploy prep | Inspected scripts | **NOT RUN** (`prepare-cf-worker-deploy`) |
| Nexus / Website focused vitest | No INCLUDE unit suites required | **NOT RUN** |
| Production DB / migrations | Policy | **NOT RUN** |

---

## 5. Critical safeguards

| Safeguard | Result |
|-----------|--------|
| `apps/connect/src/lib/transport/learner-live.ts` vs HEAD | **Unchanged** |
| Migration identity `20261020160000_transport_vehicle_location_guardian_realtime_rls.sql` | **Present**; contains `can_learner_read_vehicle_location`, `SECURITY DEFINER`, `REVOKE … FROM anon` (file review) |
| Production DB change this validation | **None** |
| Staging STOP_APPROACHING | **HISTORICAL 32/32 PASS** (not rerun) |
| GPS status-mapping units | **Fresh 20 PASS** (15 + 5) |
| Browser GPS E2E | **NOT RUN** |
| Native downloads / `dist-out` | **Excluded**; URL targets **unverified** |
| `apps/website/.env.production` | Committed; public `VITE_*` keys non-empty HTTPS-shaped; **reachability unverified** (values not printed) |
| Production GPS RLS | **Separate CR** — not part of this release |

---

## 6. Blockers / limitations / owner decisions

### BLOCKER

*None identified for core web/API validation.*

### ACCEPTED LIMITATION

| Item | Notes |
|------|-------|
| Dirty working tree; no release commit | Expected; only curated manifest should be staged in a **future approved** step |
| Browser GPS E2E NOT RUN | Compatible with documented Transport limitation |
| Native APK/EXE excluded / unverified | Out of scope |
| Website download URL reachability unverified | Do not claim native download readiness |
| Production GPS RLS not applied | Separate CR |
| Staging probe not rerun this validation | Prior same-day 32/32 evidence retained as historical |
| Admissions/Careers Android scaffolding on branch tip | Keep branch; exclude from product claims (manifest §6) |
| Fresh API count 55 vs historical 60 | Historical included `ops-notifications-audience.test.ts` (already on HEAD, not dirty INCLUDE) |
| Fresh Connect 34 vs historical 36 | Historical included EXCLUDE `leave-utils.test.ts` |

### OWNER DECISION

| Topic | Decision needed |
|-------|-----------------|
| Authorize scrubbed commit of manifest §3 INCLUDE only | Required before merge/ship |
| Confirm merge policy allows Admissions/Careers Android trees on tip while excluding product claims | Org policy |
| Accept unverified website download `VITE_*` targets for this cut | Business / release-notes scope |
| Accept browser GPS E2E gap in release notes | Product risk acceptance |

### INFORMATIONAL

| Item | Notes |
|------|-------|
| `git diff --check` exit 0 | CRLF warnings only |
| App builds invoke deploy prep | Correctly skipped |
| Manifest untracked count drift | +1 from this report |

---

## 7. Exact next steps before an approved release commit

1. Owner approves this validation + manifest limitations.  
2. In a **separately authorized** task: stage **only** paths listed in `final-release-file-manifest.md` §3 (INCLUDE). Do **not** stage EXCLUDE paths (`dist-out`, leave/teacher/activity/`packages/*` churn, probe logs, secrets).  
3. Create the release commit (message/owner process).  
4. Merge/ship under existing branch policy with release notes stating: core web/API only; natives excluded; browser GPS E2E not run; production GPS RLS separate CR; website download URLs unverified.  
5. Do **not** run production migration `20261020160000` without a dedicated production CR.

---

## 8. Proposed file set vs committed release

| Concept | Status |
|---------|--------|
| Proposed INCLUDE | Validated present — **not staged** |
| Committed release / tag | **Does not exist** |
| Deployment readiness | **Not claimed** |

---

## Safety confirmation (this validation)

- Only new intentional artifact: `qa-artifacts/final-release-validation-report.md`  
- No `git add` / staging / unstaging  
- No delete, revert, stash, overwrite of product files  
- No commit, push, merge, rebase, deploy, publish  
- No database or migration commands  
- No `prepare-cf-worker-deploy` / mutating deploy prep  
- No secrets printed  
- `learner-live.ts` unchanged  
- `apps/admin-desktop/dist-out/**` untouched  
- Entire dirty working tree preserved  
