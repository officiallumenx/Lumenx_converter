# Admin Forms & Bulk Import Fix Report

**Date:** 2026-10-23 (follow-up pass)  
**Final status:** `PARTIAL — FIXES IMPLEMENTED, SOME INTEGRATION UNVERIFIED`

No commit, push, deploy, or production/remote migration apply.

---

## 1. Create Account navigation — root cause

**Primary cause:** Welcome (and header) CTAs nested `<AuthButton>` / `<button>` **inside** `<Link>`. Invalid HTML; browsers often swallow the first click so navigation appears to bounce until a second click.

**Secondary causes hardened this pass:**
1. Signup step-4 **Create account** submit lived outside the form (`form="…"` association) — moved inside the form earlier.
2. **AuthGate vs post-signup race:** API signup previously navigated immediately while AuthGate could briefly treat an unverified user with a null registration snapshot as `allow` and bounce `/signup` → `/`.

**Fixes:**
- `welcome.tsx` — link-styled CTAs via `linkCtaClassName` (no nested button).
- `signup.tsx` — Create account submit inside the form; **API mode no longer navigates** after `signUp` (AuthGate owns post-auth routing); `submittingRef` / loading stay set on success until unmount (blocks double-submit).
- `registration-gate.ts` — unverified + `snapshot === null` → `pending` (not dashboard `allow`).
- `__root.tsx` AuthGate — if `allow` but user is unverified on `/signup`, send to `/pending-verification` instead of `/`.

**Verified:** Unit tests for CTA helpers + new gate case for unverified/null snapshot. Live browser one-click signup **not** run.

---

## 2. Subject create / edit behavior

| Mode | Behavior |
| --- | --- |
| **Create** | Only **Subject name**, **Subject code**, **Capacity** (optional). No class/period assignment. |
| **Edit** | Class assignment list: checkbox per class + **independent periods/week** per class; default periods + capacity + category + status. |

Create & Add Another on subject create.

---

## 3. How class-specific periods are stored

| Layer | Detail |
| --- | --- |
| Migration (forward-only, **not applied**) | `supabase/migrations/20261023180000_subject_capacity_class_periods.sql` |
| Columns | `subject.capacity` (nullable int ≥ 0); `subject.class_periods` jsonb map `{ "6": 4, "7": 5 }` |
| Legacy | Empty `class_periods` → fall back to `periods_per_week` |
| API | Create/PATCH accept `capacity`, `class_periods`; DTO exposes `capacity`, `classPeriods` |

**Blocker for live API use:** migration must be applied to the target Supabase project (staging first) before hosted API can select the new columns.

---

## 4. Create & Add Another

| Entity | Status |
| --- | --- |
| Subjects | **Implemented** |
| Classes (class+section create modal) | **Implemented** |
| Sections (standalone page) | **N/A as separate form** — sections are created with classes in the same modal; **Import Sections** bulk path added |
| Teachers | **Implemented** this pass (`Onboard` + `Create & Add Another`; busy guard; no duplicate create while in flight) |

Shared helper: `apps/admin/src/lib/forms/create-and-add-another.ts`.

---

## 5–6. Bulk import — issues found and fixed

| Entity | Issues found | Fix |
| --- | --- | --- |
| **Teachers** | Soft-fail catalog load silently skipped section validation; empty catalog skipped relationship checks; contract doc used wrong columns (`full_name` / `email` required) | Fail-closed when labels present and catalog missing/empty; unmatched labels fail the row at commit; parse validates empty catalog; contract aligned to `TEACHER_CSV_HEADERS` |
| **Subjects** | No Admin importer | CSV template + parse + `AcademicsBulkImportDialog` + subjects page Import; fields: `name`, `code`, `capacity`, `category` |
| **Classes** | No Admin importer | CSV template + parse + Import Classes UI; uses active academic year; optional first section columns |
| **Sections** | No Admin importer | CSV template + parse with `class_code` catalog check (fail closed when empty); Import Sections UI |

Dropdown/relationship notes:
- Teacher template uses live institute section labels / subject names (existing Excel path).
- Section import resolves `class_code` against live `listClasses` for the active year — never invents a parent class.
- Subject create import does **not** accept per-class periods (edit form only), matching the simplified create UX.

---

## 7. Files changed & migration

**Migration (do not apply to production without approval):**
- `supabase/migrations/20261023180000_subject_capacity_class_periods.sql`

**Auth / navigation:** `registration-gate.ts`, `__root.tsx`, `signup.tsx`, `create-account-navigation*`

**Subjects / classes / teachers routes:** create-and-add-another wiring; bulk import handlers

**Academics import:** `bulk-import-contract.ts`, `bulk-import-parse.ts` (+ tests), `AcademicsBulkImportDialog.tsx`

**Teachers import:** `bulk-import-parse.ts`, `bulk-import-resolve.test.ts`, `teachers.tsx` commit path

**Backend:** academics subject capacity / `class_periods` (prior pass)

---

## 8. Automated test results (actual)

```text
# Admin (focused) — apps/admin
npm test -- --run …create-account-navigation, api-registration-status,
  forms/create-and-add-another, academics/bulk-import*, teachers/bulk-import*,
  lib/subjects
→ Test Files  14 passed (14)
→ Tests       72 passed (72)

# Backend
npm test -- --run src/domains/academics/subject-class-periods.test.ts
→ Test Files  1 passed (1)
→ Tests       3 passed (3)

# git diff --check (touched paths)
→ exit 0
```

Full Admin typecheck/lint/production builds were not claimed green. Live DB / hosted API / browser E2E for welcome→signup **not run**.

---

## 9. Remaining blockers

1. Apply `20261023180000_subject_capacity_class_periods` on staging before deploying API that selects `capacity` / `class_periods`.
2. Browser verification of welcome → signup one-click navigation and post-signup AuthGate handoff.
3. Class/section/subject bulk import UIs are CSV-first; Excel dropdown sheets (like teachers) not built for academics.
4. Demo `SubjectCatalogItem` still does not persist capacity/classPeriods (API path is source of truth).
5. End-to-end import against a live institute DB not executed in this pass.

---

## 10. Not verified without live DB / services

- End-to-end subject create with capacity against Postgres.
- Per-class period persistence round-trip on staging.
- Hosted registration Create Account after Auth sign-in (unit/gate-level only).
- Successful import counts against real DB writes for classes/sections/subjects/teachers.
- Cross-institution isolation under a live multi-tenant API.

---

**Final status:** `PARTIAL — FIXES IMPLEMENTED, SOME INTEGRATION UNVERIFIED`
