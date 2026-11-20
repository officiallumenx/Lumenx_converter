# LumenX Admin — Final Forms & Import Readiness Audit

**Date:** 2026-10-23  
**Final status:** `PARTIAL — CODE TESTS PASS, DATABASE OR BROWSER INTEGRATION UNVERIFIED`

Constraints honored: no commit, push, deploy, staging service, remote migration apply, or production config changes. No fabricated DB/browser results.

---

## 1. Findings and remaining defects

### Fixed / verified in code (this audit)

| Area | Finding |
| --- | --- |
| Create Account CTA | Nested button-in-Link removed; `linkCtaClassName` on welcome CTAs. |
| AuthGate race | Unverified + null registration → `pending`; API signup does not navigate; submit lock held until unmount; AuthGate helper routes unverified `/signup` → `/pending-verification`. |
| Class Add Another | **Defect found & fixed:** success path cleared `customClassName`, wiping parent class when adding another section. Now `keepClassContext` preserves class name on add-another. |
| SubjectDto fixtures | Timetable map test missing `capacity` / `classPeriods` (broke Admin typecheck) — fixed. |
| Import preview gate | Academics dialog uses `previewCommitEligible` so Import stays disabled when parse errors exist. |
| Section import year scope | **Follow-up fix:** Import Sections catalog now loads class codes for the **active academic year** only (matches commit). |
| Class/section parse hardening | **Follow-up fix:** `sort_order` must be ≥ 0; in-file duplicate class codes and `(class_code, code)` sections rejected. |
| Teacher in-file phone dupes | **Follow-up fix:** duplicate phones in the same file fail at parse. |
| Subject map capacity/periods | **Follow-up:** map test asserts `capacity` / `classPeriods` pass-through. |

### Remaining defects / gaps (not blockers for automated readiness claim, but block full PASS)

1. **No real browser** verification of first-click Create Account or post-signup handoff.
2. **No real database** round-trip for subject `capacity` / `class_periods` or any bulk import commits.
3. Migration `20261023180000_subject_capacity_class_periods.sql` **not applied** anywhere (by design this pass).
4. Academics importers are **CSV-only** (teachers retain Excel + dropdown lists).
5. Class/section/subject/teacher import commit loops are **per-row best-effort** (partial success reported in toast counts), not transactional all-or-nothing.
6. Demo local subject catalog still does not persist capacity/classPeriods (API path is source of truth).
7. Repo-wide Admin eslint reports pre-existing errors/warnings; **touched audit files lint clean**. Backend `tsc` fails on pre-existing `@lumenx/utils` DOM typing (not introduced here).
8. No route-level commit-handler tests for the four import loops (parse/contract covered; handlers untested).
9. Teachers Create & Add Another still clears subject/section context after each success (intentional blank next teacher; not a class-parent workflow).

---

## 2. Exact migration filename and safety review

**Filename:** `supabase/migrations/20261023180000_subject_capacity_class_periods.sql`

| Check | Result |
| --- | --- |
| Forward-only | Yes — `ADD COLUMN IF NOT EXISTS` only; no DROP/REWRITE of existing rows |
| Defaults | `class_periods jsonb NOT NULL DEFAULT '{}'::jsonb`; `capacity` nullable |
| Constraints | `subject_capacity_check`: `capacity IS NULL OR capacity >= 0` (idempotent DO block) |
| Legacy data | Existing rows get `{}` class_periods; app falls back to `periods_per_week` |
| Overwrite risk | Does not rewrite per-class assignments; empty map = use catalog default |
| Rollback | No down migration shipped. Forward recovery: leave columns in place (nullable / default `{}`) or manually drop only after API stops selecting them |
| Applied? | **No** (not applied to any remote DB in this audit) |

---

## 3. Signup regression results

| Scenario | Coverage | Result |
| --- | --- | --- |
| Nested interactive / first-click bounce root cause | Unit (`create-account-navigation`) | PASS — detects nested button; CTA classes are link-only |
| Unauthenticated private → welcome | Unit (`auth-gate-navigation`) | PASS |
| Unauthenticated `/signup` allowed | Unit + `isUnauthenticatedAllowedPath` | PASS |
| Gate `loading` stays put | Unit | PASS |
| Pending → `/pending-verification` | Unit + `api-registration-status` | PASS |
| Unverified + null snapshot → pending (not allow) | `api-registration-status` | PASS |
| Unverified allow on `/signup` → pending (not `/`) | Unit AuthGate helper | PASS |
| Duplicate submit while locked | `signup-submit-guard` + signup uses it | PASS |
| Success lock retained in API mode | `shouldReleaseSignupSubmitLockAfterSuccess(true) === false` | PASS |
| Genuine failure unlocks for retry | signup catch clears `submittingRef` / loading | Code review PASS (no component mount test) |
| Real browser one-click | — | **NOT RUN** |

---

## 4. Subject-period persistence coverage

| Layer | Coverage | Real DB? |
| --- | --- | --- |
| Migration SQL review | Manual | No |
| Backend DTO normalize / legacy / invalid strip / class isolation | `subject-class-periods.test.ts` **4 PASS** | No (pure DTO) |
| Admin parse / isolate / rebuild round-trip | `class-periods.test.ts` **5 PASS** | No |
| Admin create posts capacity + empty `class_periods` | `mutations.test.ts` (mocked client) | No |
| Admin patch independent class periods map | `mutations.test.ts` (mocked client) | No |
| Create UI fields name/code/capacity only | Code review of `subjects.tsx` | No |
| Edit UI per-class periods | Code review | No |
| Postgres read-after-write | — | **NOT RUN** |

---

## 5. Create & Add Another by entity

| Entity | UI | Busy guard | Reset only after success | Parent context | Tests |
| --- | --- | --- | --- | --- | --- |
| Classes (+ section in shared modal) | Yes | `creating` + ignore duplicate | Yes (catch does not reset) | **Yes after fix** — keeps `customClassName` on add-another; clears section/room/students | Helper unit tests; no RTL |
| Sections (standalone form) | N/A — created via class modal / Import Sections | — | — | Class preserved on add-another | Documented |
| Subjects | Yes | `formSaving` | Yes | `keepClassContext` on add-another (grades) | Helper + mutations mocks |
| Teachers | Yes | `creatingTeacher` | Yes (catch keeps form) | N/A (full reset of identity fields after success) | Helper unit |

Shared contract: `outcomeAfterSuccessfulCreate` now includes `keepParentContext`; `shouldResetFormAfterCreateAttempt` documents failure-preserves-data rule.

---

## 6. Import readiness by entity

| Entity | Template | Parser | UI | Persistence path | Fail-closed relationships | Institution boundary | Live DB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Teachers | Excel (+ CSV) live catalog dropdowns | `bulk-import-parse` aligned to headers | `TeacherBulkImportDialog` | `createTeacherApi({ instituteId })` | Empty catalog / unmatched labels fail row | Active institute only | **Unverified** |
| Subjects | CSV (`name,code,capacity,category`) | `parseSubjectImportCsv` | `AcademicsBulkImportDialog` on subjects | `createSubjectApi({ instituteId, … })` | Duplicate codes / bad capacity at parse | Active institute only | **Unverified** |
| Classes | CSV (`name,code,sort_order,section_*`) | `parseClassImportCsv` | Import Classes on classes page | `createClass` (+ optional `createSection`) under **active academic year** | Missing columns / bad sort | Active institute + active year | **Unverified** |
| Sections | CSV (`class_code,name,code,capacity,room`) | `parseSectionImportCsv` + class code catalog | Import Sections | `createSection` after resolving `class_code` | Empty/unknown `class_code` fails | Active institute + year | **Unverified** |

**Contract alignment:** `TEACHER_BULK_IMPORT_FIELDS` locked to `TEACHER_CSV_HEADERS` via `teacherContractMatchesParser()`.

**Not UI-only:** all four commit handlers call create APIs when API mode + writes enabled. Preview Import is disabled when parse errors exist.

**Count accuracy:** toasts report created/failed from actual loop outcomes; no claim of success without `await create*`. Skipped duplicates (e.g. teacher phone) increment failed/skip messaging in teacher path. No transactional rollback of earlier successful rows on later failure.

---

## 7. Actual test / tool results

### Automated unit/integration (mocked — no live DB)

```text
# apps/admin (focused readiness suite)
Test Files  18 passed (18)
Tests       95 passed (95)

# backend
Test Files  1 passed (1)
Tests       4 passed (4)   # subject-class-periods.test.ts
```

**All of the above are mocked / pure-function / mocked-HTTP client tests. Zero tests hit Postgres.**

### Typecheck / lint / build / whitespace

| Check | Result |
| --- | --- |
| Admin `npm run typecheck` | **PASS** (exit 0) after SubjectDto fixture fix |
| Backend `npm run typecheck` | **FAIL** — pre-existing `@lumenx/utils` DOM/`window` typing (unrelated to this audit) |
| Admin eslint (touched audit paths, `--quiet`) | **PASS** (0 errors) |
| Admin eslint (full package) | **FAIL** — 10 errors / 115 warnings pre-existing elsewhere |
| Backend `npm run build` | **PASS** — `dist/index.js` built |
| `git diff --check` (touched paths) | **PASS** (exit 0) |

### Not run

- Playwright / real browser Create Account
- Any Supabase migration apply
- Any import against a live institute database
- Hosted staging (explicitly declined)

---

## 8. Future production rollout checklist

Do **not** execute these steps in this session; order for a future authorized window:

1. **Backup** target Supabase project; confirm project is **not** production denylist `kmpzflsurepjwqnfqyld` unless production change is explicitly authorized.
2. Apply migration **`20261023180000_subject_capacity_class_periods.sql`** (forward-only).
3. Verify columns: `subject.capacity`, `subject.class_periods`, constraint `subject_capacity_check`.
4. Deploy API build that selects/writes `capacity` / `class_periods` **only after** migration succeeds.
5. Deploy Admin build with subject create/edit + import UIs.
6. Smoke: create subject (name/code/capacity) → edit per-class periods → reload → values independent.
7. Smoke: Create & Add Another for class sections (parent class retained) and teachers (no double account).
8. Smoke: one CSV import per entity with intentional bad row — counts match server outcomes; no cross-institute IDs.
9. Browser smoke: single-click Create Account from welcome → lands on pending verification without bounce.

---

## 9. Unverified behaviors

- Real-browser first-click Create Account and AuthGate handoff after signup.
- Postgres persistence / read-after-write for `capacity` and `class_periods`.
- Live bulk import create counts vs database rows for classes, sections, subjects, teachers.
- Cross-institution isolation under a multi-tenant live API (code uses active `instituteId` only; not integration-proven).
- Excel dropdown UX for class/section/subject imports (CSV only today).
- All-or-nothing import transactions (not implemented; partial success by design today).
- Backend full-workspace typecheck green (blocked by existing utils DOM types).

---

## 10. Final status

**`PARTIAL — CODE TESTS PASS, DATABASE OR BROWSER INTEGRATION UNVERIFIED`**

Rationale: Admin readiness suite **95 PASS** (plus follow-up parse/map tests **24 PASS** in focused re-run), backend subject-period tests **4 PASS**, Admin typecheck **PASS**, API build **PASS**, touched-path lint/diff-check **PASS**. Migration reviewed but unapplied; no live DB or browser proof.

### Follow-up after exploratory audits

Findings from [Audit subject periods + add-another](b3be3da1-923d-4ba9-bcde-3d0dbab01f09) and [Audit bulk import end-to-end](38d3cefe-2c16-4a8a-9986-ef30e8f74a5f) drove the year-scoped section catalog fix, nonnegative `sort_order`, in-file duplicate guards, and map pass-through assertion. Status remains **PARTIAL** — still no live DB/browser proof.
