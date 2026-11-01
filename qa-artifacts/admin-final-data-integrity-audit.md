# LumenX Admin — Final Data Integrity Audit

**Date:** 2026-10-23  
**Final status:** `PARTIAL — CODE CHECKS PASS, DATABASE/BROWSER VERIFICATION UNAVAILABLE`

Constraints: code/tests only. No staging, no remote migration apply, no production mutation, no deploy/commit/push, no real institute records, no fabricated live DB/browser results.

---

## 1. Migration safety findings

**File:** `supabase/migrations/20261023180000_subject_capacity_class_periods.sql`  
**Review type:** Static SQL review + automated static test (`subject-capacity-migration.static.test.ts`). **Not executed against PostgreSQL.**

| Check | Result |
| --- | --- |
| Forward-only | `ADD COLUMN IF NOT EXISTS` only; no DROP/TRUNCATE |
| Legacy subjects | `class_periods NOT NULL DEFAULT '{}'::jsonb`; `capacity` nullable |
| Capacity constraint | `subject_capacity_check`: `NULL OR >= 0` (idempotent) |
| Per-class independence | Map keys are class codes; values independent; empty map → app uses `periods_per_week` |
| Existing uniqueness | Pre-existing `subject_institute_code_uidx` on `(institute_id, code)` still governs duplicates |
| FK | No new FKs (jsonb map is denormalized codes, matching `applicable_class_codes` pattern) |
| Applied? | **No** |

**Rollout order (future authorized window):**  
1) Apply migration → 2) Deploy API that SELECTs/writes `capacity` / `class_periods` → 3) Deploy Admin. Never deploy API expecting these columns before migration.

---

## 2. Subject-period data integrity findings

### Verified (code)

| Behavior | Mechanism |
| --- | --- |
| Independent per-class values | jsonb map + Admin `buildClassPeriodsMap` / `isolateClassPeriodUpdate`; PATCH replaces full map from edit form |
| Invalid capacity rejected | Zod `min(0)` + service `capacity < 0` validation + DB check |
| Invalid periods on **write** | **Fixed this pass:** `assertClassPeriodsForWrite` rejects &lt;1 / &gt;40 / non-integer / empty keys (no silent drop) |
| Dirty legacy on **read** | `normalizeClassPeriodsForRead` still strips junk for DTO safety |
| Duplicate class codes in assignment list | **Fixed:** `uniqueClassCodes` on create/update |
| HTTP edge | Zod `class_periods: record(string, int 1–40)` |

### Defect fixed

Service previously called `normalizeClassPeriods` then looped for `&lt;1` (dead code after strip). Write path now **asserts** before persist.

### Not verified on Postgres

Read-after-write, constraint enforcement under concurrent writes, RLS/institute isolation under live multi-tenant traffic.

---

## 3. Import correctness by entity

| Entity | Parser guards | Persistence | Counts | Institution |
| --- | --- | --- | --- | --- |
| **Classes** | Required cols; `sort_order ≥ 0`; in-file duplicate codes | `createClass` (+ optional section) under **active year** | Per-row; outer-error remaining count **fixed** (no double-count of created) | `instituteCtx.activeInstituteId` only |
| **Sections** | Required cols; empty/unknown `class_code` fail-closed; in-file dup `(class_code,code)`; catalog = **active year** | `createSection` after year-scoped resolve | Same remaining-count fix | Same |
| **Subjects** | Required cols; bad capacity; in-file duplicate codes | `createSubjectApi` with capacity; `classPeriods: {}` (create form contract) | Per-row created/failed | Same |
| **Teachers** | Phone 10-digit; empty catalog fail-closed; unmatched labels; in-file duplicate phones | `createTeacherApi`; section labels re-checked at commit | Per-row; phone dupes vs existing + in-file | Same |

**Atomicity model:** All four are **partial-success** (row-independent). None promise all-or-nothing. Summaries include `failed` when any row fails (`isFullySuccessfulImport` / `assertSummaryReflectsPartialFailures`).

**Subject import vs periods:** Import intentionally does **not** send per-class periods (edit form only). Capacity does reach the API.

---

## 4. Partial-write and duplicate-prevention

| Risk | Status |
| --- | --- |
| Report full success with failures | Guarded by summary helpers + toast patterns include `failed` |
| Outer catch inflating failure counts after partial creates | **Fixed** via `remainingFailedAfterOuterError` |
| In-file duplicate class/section/subject codes | Rejected at parse |
| In-file duplicate teacher phones | Rejected at parse |
| Existing teacher phone | Failed at commit (existing set) |
| Existing subject code | API conflict |
| Wrong class via stale year catalog | Section catalog scoped to active year |
| Silent wrong entity ID from label | Teachers/sections fail unmatched; no fuzzy assign |

---

## 5. Create & Add Another results

| Entity | Save before reset | Failure preserves input | Parent context | Busy / no double create |
| --- | --- | --- | --- | --- |
| Classes (+ section) | Yes | Yes | Class name kept on add-another (`keepClassContext`) | `creating` |
| Sections | Via class modal | Yes | Same | Same |
| Subjects | Yes | Yes | Grades kept flag (API create has no grades UI) | `formSaving` |
| Teachers | Yes | Yes | Identity fields reset after success (next teacher blank) | `creatingTeacher` |

Teacher invites: create API called once per successful submit; busy guard blocks duplicates.

---

## 6. Signup / AuthGate results

| Check | Evidence | Browser? |
| --- | --- | --- |
| First-click nested button removed | `create-account-navigation` + welcome Link CTAs | No |
| Unauthenticated → welcome / signup allowed | `auth-gate-navigation` + constants | No |
| Loading gate does not bounce | Unit | No |
| Pending / unverified+null → pending-verification | Gate + registration-status | No |
| Success submit lock (API) | `signup-submit-guard` + signup handler | No |
| Failure unlocks retry | signup `catch` clears lock | No |

**No real-browser verification claimed.**

---

## 7. Actual tests and build results

### Automated (mocked / static — **no live Postgres**)

```text
# apps/admin integrity suite
Test Files  19 passed (19)
Tests       101 passed (101)

# backend
Test Files  3 passed (3)
Tests       12 passed (12)
  - subject-class-periods.test.ts (4)
  - class-periods.test.ts (4)          # write reject + unique codes
  - subject-capacity-migration.static.test.ts (4)  # SQL file review only
```

### Tooling

| Check | Result |
| --- | --- |
| Admin `npm run typecheck` | **PASS** |
| Backend `npm run build` | **PASS** |
| Admin eslint (touched academics / classes import) | **PASS** (`--quiet`) |
| Backend `npm run lint` | **FAIL** — missing `eslint.config` (pre-existing tooling gap) |
| `git diff --check` (touched paths) | **PASS** |

---

## 8. Remaining blockers

1. Migration not applied; no Postgres integration proof.
2. No browser E2E for Create Account.
3. No commit-handler RTL/integration tests for import loops (parse + count helpers covered).
4. Backend eslint package config missing.
5. Partial imports remain non-transactional by design.
6. Academics imports are CSV-only (teachers Excel retained).

---

## 9. Safe future production rollout sequence

1. Authorize target project (not denylist unless explicitly approved).
2. Backup DB.
3. Apply `20261023180000_subject_capacity_class_periods.sql`.
4. Verify columns + `subject_capacity_check`.
5. Deploy API build with write-assert path.
6. Deploy Admin.
7. Smoke: subject create capacity → edit per-class periods → reload isolation.
8. Smoke: one partial CSV import per entity — counts match rows; year-scoped sections.
9. Browser: one-click Create Account → pending verification.

---

## 10. Final status

**`PARTIAL — CODE CHECKS PASS, DATABASE/BROWSER VERIFICATION UNAVAILABLE`**

Code-level integrity improved (write-time period rejection, duplicate class-code dedupe, honest import remaining counts, static migration review). Live database and browser remain unverified by policy.
