# LumenX Release Candidate Readiness Report

**Date:** 2026-10-20  
**Authoring gate:** inspection + safe local checks only (no commit / push / deploy / migration / DB writes this run)

---

## 1. Candidate branch and commit

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| HEAD (committed) | `c384e10e67809016fa221ea8d6310656a49ab2f1` — *Ship downloads-host URLs, desktop packaging updates, and website download matrix links.* |
| Merge-base with `origin/main` | `47c2086666389e5bebcd96183dbb10d6306ae207` |
| Ahead of `origin/main` | **11** commits (committed history) |
| Behind `origin/main` | **0** (at merge-base comparison) |
| Tracking remote | `origin/fix/cloudflare-workers-build-upload` — **in sync** with remote tip (`0/0` ahead/behind) |
| Working tree | **Dirty** — large uncommitted + untracked set (see §2 / §9) |

---

## 2. Working-tree cleanliness status

**Not clean.** Cannot treat HEAD alone as the release candidate content.

- **~87 tracked files modified** vs HEAD (`git diff --stat`: +1493 / −3521 lines, approximate).
- **Large untracked** set: `e2e/staging/`, `docs/proposals/`, `qa-artifacts/**`, Connect lazy/preload sources, Nexus create-api, Transport RouteLazyFallback, Admin desktop `dist-out/`, etc.
- **`package.json` modified**; no `package-lock.json` / yarn / pnpm lockfile change in this status snapshot.
- **No new files under `supabase/migrations/`** for the GPS RLS fix (staging applied from `docs/proposals/` only).
- **`apps/connect/src/lib/transport/learner-live.ts`:** unchanged (confirmed).
- **`git diff --check`:** exit 0 (CRLF warnings only).

---

## 3. Included and excluded scope

### Intended product / reliability scope (candidate content if scrubbed into a commit)

| Area | Examples |
|------|----------|
| Admin diary/photos | View-only diary; signed-URL cache (`photos`, `signed-url`, persist) |
| Connect performance | Prefetch restore gates, schedule-idle, background-preload, lazy pages/routes |
| Transport | Approach coalesce, notify-on-status-change, lazy non-critical routes, staging realtime probe |
| Nexus / API | Trial seed, reject lifecycle, institute create API helper |
| Cross-app QA harness | `e2e/staging/*`, cross-app tests/helpers |
| GPS RLS proposal | `docs/proposals/transport_vehicle_location_guardian_realtime_rls.{sql,md}` |

### Tests

Admin diary/photos vitest; Connect schedule-idle/isolation/persist/leave-utils/transport UI units; backend approach/severity/audience/RLS-policy/source + registrations/identity.

### QA evidence (keep for audit; usually not “shipped” as product)

`qa-artifacts/four-module-reliability-report.md`, `transport-staging-realtime-verification.md`, `_transport-gps-rls-apply-report.md`, `cross-app-data-sharing-*.md`, `_rc-*` logs from this run, staging probe logs.

### Local build output / unsafe-to-ship (exclude from any release commit)

| Path | Why |
|------|-----|
| `apps/admin-desktop/dist-out/` | Unpacked Electron + `LumenX-Admin-Setup.exe` / blockmap — **generated binary**, not reviewed for signing/distribution |
| `qa-artifacts/*.png`, large build logs | Local evidence noise |
| Any `.env*` / credentials | **Must never commit** (not listed as modified here; still denylist) |

### Out of approved release scope

- **Admissions** and **Careers** apps (separate branches/history; not in this RC scope).
- Production/shared Supabase `kmpzflsurepjwqnfqyld`.

### Unrelated / mixed user work (needs human triage before commit)

Leave/types/map changes across Admin/Connect; teacher repositories; activity sports/extra-curricular pages; `playwright.config.ts`; `packages/types`, `packages/auth` crash-reporting; backend documents repository; assorted Transport store/test touch-ups. **Do not auto-include or discard.**

---

## 4. Typecheck and test results (this run)

### Typecheck — all PASS

| Command | Result |
|---------|--------|
| `npm run typecheck:api` | **PASS** |
| `npm run typecheck:admin` | **PASS** |
| `npm run typecheck:connect` | **PASS** |
| `npm run typecheck --workspace=@lumenx/app-transport` | **PASS** |
| `npm run typecheck --workspace=@lumenx/app-nexus` | **PASS** |
| `npm run typecheck:website` | **PASS** |

Logs: `qa-artifacts/_rc-tsc-*.txt`

### Focused regression tests — this run

| Suite | Command | Result |
|-------|---------|--------|
| Approach / severity / audience | `npx vitest run` those 3 files | **25 PASS** |
| Transport RLS source + identity + registrations | 6 files | **49 PASS** |
| Admin photos + diary list-view | `npm run test --workspace=@lumenx/app-admin -- …` | **23 PASS** |
| Connect schedule-idle + isolation | root vitest | **14 PASS** |
| Connect persist | `persist.test.ts` | **7 PASS** |
| Connect transport UI units + leave-utils | workspace vitest | **25 PASS** (`parent-status`, `transport-utils`, `learner-live` unit, leave-utils) |

**Total focused vitest this run:** 25 + 49 + 23 + 14 + 7 + 25 = **143 PASS** (no FAIL).

### Staging E2E / live — this Phase A/C run

| Check | Result | Notes |
|-------|--------|-------|
| Staging DB mutations / probe re-run | **NOT RUN** | Phase A forbids staging DB writes this gate |
| Browser E2E live/stale/disconnected GPS | **NOT RUN** | No focused Playwright covering those Connect transport chrome states without protected-file work; would need browser + staging/live data |
| Historical staging probe (prior same-day, post-RLS) | **30 PASS / 0 FAIL / 1 NOT RUN** | Evidence: `_transport-gps-rls-probe-post.txt` / apply report — **not re-executed this gate** |
| Historical multi-role 14/14 | Prior evidence only | `cross-app-data-sharing-report.md` |

---

## 5. Transport realtime status and remaining gaps

| Item | Status |
|------|--------|
| Parent live API GPS | **PASS** (prior staging) |
| Parent `vehicle_location` SELECT + Postgres Changes | **PASS** after staging RLS apply (prior; apply report) |
| Boarding/drop lifecycle + isolation | **PASS** (prior staging) |
| `STOP_ARRIVED` sibling coalesce | **PASS** (prior staging) |
| `STOP_APPROACHING` staging emit + sibling coalesce | **NOT RUN** this gate; unit grace/coalesce **PASS** (25). Staging path needs trip + distant pings after 90s grace — **DB-mutating**, blocked in Phase A |
| Browser live / stale / disconnected / recovered UI | **Unit coverage PASS** (`parent-status` / `transport-utils` / `learner-live` tests); **browser E2E NOT RUN**. Blocker: no existing Playwright scenario; must not edit `learner-live.ts` |
| Staging GPS RLS in migration history | **Gap** — applied from `docs/proposals/` only (see §6) |

---

## 6. Security / migration reproducibility notes

1. **Staging-only GPS RLS** applied from  
   `docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql`  
   via Management API / `supabase db query --project-ref yveadybpntziyryxsrsu`.  
   **Not** recorded in `supabase/migrations/` → a fresh `db push` / new environment **will not** reproduce the fix.

2. Proposal includes **`REVOKE … FROM anon`** (line 95) after staging discovered PUBLIC default EXECUTE.

3. **Follow-up (do not perform in this gate):**  
   - Promote SQL into a dated file under `supabase/migrations/` (e.g. intended name in proposal header).  
   - Review + apply to staging via normal migration process (idempotent / already-applied handling).  
   - Separate production change request for `kmpzflsurepjwqnfqyld` — **out of scope here**.

4. Production denylist project untouched this run.

---

## 7. Native APK / EXE download, signing, distribution

| Evidence | Status |
|----------|--------|
| Website download matrix (committed HEAD) | Marketing CTAs use env-driven `VITE_*_APK_URL` / `VITE_*_DESKTOP_URL`; null until set (`apps/website/src/content/downloads.ts`) |
| Local `apps/admin-desktop/dist-out/LumenX-Admin-Setup.exe` | Present **untracked** — **not** treated as signed/published artifact |
| Signed Play/App Store / CDN URLs verified this run | **NOT VERIFIED** |
| AAB build logs in qa-artifacts | Historical text logs only — **not** a distribution attestation |

**Conclusion:** Native distribution is **not** release-ready based on this gate’s evidence.

---

## 8. Remaining known limitations

1. Dirty working tree + unreviewed binaries → cannot cut a clean RC from this tree as-is.  
2. GPS RLS not in migration history → reproducibility risk.  
3. Staging `STOP_APPROACHING` path **NOT RUN** (grace / at-stop); units cover grace + dedupe keys.  
4. Browser GPS live/stale/disconnect E2E **NOT RUN**.  
5. Connect first-usable timing instrumentation **NOT RUN** (four-module report).  
6. Certificate PDF download / payment-provider settlement **NOT RUN** (cross-app report).  
7. Diary photo attachments **NOT IMPLEMENTED**.  
8. Admissions / Careers **out of scope**.  
9. Homework: staging multi-role marked PASS for publish/visibility in cross-app report; any deeper “student submission” product gaps remain as previously scoped — **not re-audited end-to-end this gate**.  
10. `four-module-reliability-report.md` §D still mentions pre-RLS FAIL for GPS realtime; **superseded** by `_transport-gps-rls-apply-report.md` for staging — report drift to reconcile on next doc pass.

---

## 9. Exact files that would need inclusion in a *proposed* release commit

Human selection required. **Minimum intended set** (illustrative — confirm before any future commit):

**Product**

- Admin: `apps/admin/src/routes/diary.tsx`, `photos.tsx`, `lib/photos/signed-url.ts`, `lib/admin-queries/persist.ts`, related tests  
- Connect: portal contexts, prefetch/*, `schedule-idle.ts`, `background-preload.ts`, `lazy-pages/*`, `RouteLazyFallback.tsx`, lazy route files under `_authenticated/`, leave/map helpers if intentional  
- Transport: approach/notify/ops-service, lazy routes + `RouteLazyFallback.tsx`  
- Nexus/API: ensure-trial, registrations review, identity service, create-api + dialog/index routes, related tests  
- `docs/proposals/transport_vehicle_location_guardian_realtime_rls.*`  
- `e2e/staging/**` (harness; no secrets)

**Exclude**

- `apps/admin-desktop/dist-out/**`  
- Secrets / `.env*`  
- Unrelated leave/teacher/activity churn unless product owner confirms  
- Optional: most `qa-artifacts/*` (keep selected reports only if team wants them in-repo)

**Separate PR (required for env parity):** migration formalization of GPS RLS.

---

## 10. Recommendation

# **NOT READY**

### Precise blockers before release cut

1. **Scrub and stage a deliberate commit set** — dirty tree + `dist-out` binaries prevent a clean RC.  
2. **Formalize staging GPS RLS** into `supabase/migrations/` (reviewable follow-up; not applied here).  
3. **Accept or close** `STOP_APPROACHING` staging + browser GPS E2E gaps.  
4. **Do not claim native APK/EXE ready** without verified HTTPS artifact URLs + signing.

### What *is* green for a future review

- Scoped typechecks (API/Admin/Connect/Transport/Nexus/Website) **PASS** this run.  
- Focused vitest **143 PASS** this run.  
- Staging Transport GPS realtime **was** verified earlier same day after RLS apply (probe 30 PASS) — evidence on disk; not re-run under Phase A no-write rule.

---

## Safety confirmation (this gate)

- No commit, push, deploy, publish, or release created.  
- No migrations applied; no staging/production DB writes.  
- Production project untouched.  
- `learner-live.ts` unmodified.  
- No destructive cleanup of user working tree.  
- `prepare-cf-worker-deploy` not run.
