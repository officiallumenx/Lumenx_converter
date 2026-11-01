# LumenX Admin — Pre-Release Review (Data Integrity)

**Date:** 2026-10-23  
**Status:** `PARTIAL`

**Recommendation:** **GO for controlled rollout of code** only after the migration is applied to the target database in an authorized window. **NO-GO** for deploying the API/Admin that selects `capacity` / `class_periods` before that migration. No staging/production actions performed in this review.

Constraints: code-only review + local automated tests. No staging, no production connection, no migration apply, no deploy/commit/push. No live DB or browser claims.

---

## Findings by severity

### High (rollout dependency — not a code defect)

| ID | Finding |
| --- | --- |
| H1 | `SUBJECT_COLS` already selects `capacity, class_periods`. Deploying this API **before** `20261023180000_subject_capacity_class_periods.sql` will fail subject list/get/create. Migration **must** precede API deploy. |

### Medium (documented contract / design)

| ID | Finding |
| --- | --- |
| M1 | **UI vs API period coercion:** Admin `buildClassPeriodsMap` soft-falls back invalid/blank inputs to catalog default; Zod + `assertClassPeriodsForWrite` **reject** invalid writes. Valid Admin saves still produce API-safe integers. |
| M2 | **No DB FK** from `class_periods` keys to `class.code` (same denormalized pattern as `applicable_class_codes`). Unknown codes are not redirected to other classes; they are stored as keys. Admin only emits selected catalog codes. |
| M3 | Imports are **partial-success** by design. Counts are honest after remaining-failure fix; not transactional. |
| M4 | Backend `npm run lint` has **no package eslint.config**. Probe with existing `packages/config/eslint.config.base.js` works for academics files after a one-line `prefer-const` fix; full backend lint remains unconfigured (do not invent a new config). |

### Low

| ID | Finding |
| --- | --- |
| L1 | Backend `npm run typecheck` fails on pre-existing `@lumenx/utils` DOM/`window` typing — unrelated to this change set; API `build` still succeeds. |
| L2 | Migration adds no jsonb shape check for `class_periods` values (enforced in Zod/service). |
| L3 | No commit-handler RTL tests; parse/count/write helpers covered. |

### Fixed / verified this review pass

| ID | Finding |
| --- | --- |
| F1 | Write contract tests expanded: null/undefined/empty OK; reject 0/negative/&gt;40/fractional/non-numeric/array/empty key; coerce whole numeric strings. |
| F2 | UI tests: fallback coercion documented; unchecked codes omitted (cannot inject via ghost keys). |
| F3 | Import outer-error remaining counts; year-scoped section catalog; in-file duplicates — prior pass, still green. |
| F4 | `prefer-const` in `service.ts` section create (found via shared eslint base probe). |

---

## Explicit class-period write contract

| Input | Write (`assertClassPeriodsForWrite`) | Read (`normalizeClassPeriodsForRead`) | HTTP Zod |
| --- | --- | --- | --- |
| `null` / omitted / `{}` | `{}` (compatible) | `{}` | optional |
| Integer 1–40 | Accepted per key | Accepted | Accepted |
| Numeric string `"4"` | Coerced to `4` | Floor if finite ≥1 | Zod expects number (JSON) |
| `0`, negative, `>40`, fractional, `"abc"` | **Rejected** | Stripped | Rejected at edge |
| Empty key `""` | **Rejected** | Skipped | N/A |
| Array / non-object | **Rejected** | `{}` | Rejected |

**Isolation:** Edit PATCH sends full map from selected classes; `isolateClassPeriodUpdate` / build-map only touch selected keys. Updating class 7 does not rewrite 6/8 when both are present in the saved map.

**Client compatibility:** Omitting `class_periods` / sending `{}` remains valid. Existing clients that never send the field are unchanged. Clients sending invalid values now get validation errors instead of silent strip (intentional hardening).

---

## Class / section import review

| Risk | Verdict |
| --- | --- |
| Counts vs reality | Created only after successful `await create*`; failed includes row errors; outer interrupt uses `remainingFailedAfterOuterError` (no double-count of created) |
| Misleading full success | Summaries include `failed` when &gt;0 |
| Retry duplicates | In-file dup codes rejected; server unique indexes / conflict handling for existing; year-scoped parents |
| Active year | Section catalog + commit both use active academic year |
| Constraints agree | Class/section unique within year/class assumptions match existing APIs |

---

## Migration review (static — not executed on PostgreSQL)

**File:** `supabase/migrations/20261023180000_subject_capacity_class_periods.sql`

| Item | Static verdict |
| --- | --- |
| Syntax / conventions | Timestamped forward migration; `IF NOT EXISTS`; idempotent constraint DO block; comments |
| Defaults | `capacity` NULL; `class_periods` `'{}'::jsonb NOT NULL` — legacy rows compatible |
| Constraints | `capacity IS NULL OR >= 0` only; no jsonb value CHECK |
| Indexes / FKs / grants | None added (acceptable for additive columns) |
| App dependency | API SELECT list already includes new columns → **migration before deploy** |

Automated static checks: `subject-capacity-migration.static.test.ts` (4) — file content only.

---

## Exact files changed (this integrity / pre-release workstream)

**Backend**
- `backend/src/domains/academics/class-periods.ts` (+ tests)
- `backend/src/domains/academics/service.ts` (write assert, unique codes, prefer-const)
- `backend/src/domains/academics/repository.ts`, `types.ts`
- `backend/src/domains/academics/subject-class-periods.test.ts`
- `backend/src/domains/academics/subject-capacity-migration.static.test.ts`
- `supabase/migrations/20261023180000_subject_capacity_class_periods.sql`

**Admin**
- `apps/admin/src/lib/subjects/class-periods.ts` (+ tests), `map.ts`, `mutations.ts`, `types.ts` (+ related tests)
- `apps/admin/src/lib/academics/*` (contract, parse, result, counts)
- `apps/admin/src/routes/classes.index.tsx`, `subjects.tsx`, `teachers.tsx` (imports / add-another; prior)
- Auth helpers/tests for signup/AuthGate (prior integrity stream)

**QA**
- `qa-artifacts/admin-final-data-integrity-audit.md`
- `qa-artifacts/admin-pre-release-review.md` (this file)

---

## Tests and actual results

```text
# Admin integrity suite
Test Files  19 passed (19)
Tests       103 passed (103)

# Backend integrity
Test Files  3 passed (3)
Tests       14 passed (14)
```

| Check | Result |
| --- | --- |
| Admin `npm run typecheck` | **PASS** |
| Backend `npm run typecheck` | **FAIL** (pre-existing `@lumenx/utils` DOM types) |
| Backend `npm run build` | **PASS** |
| Admin eslint (touched academics/subjects/classes) | **PASS** |
| Backend `npm run lint` | **Unavailable** (no `eslint.config` in backend package) |
| Backend lint probe via `packages/config/eslint.config.base.js` on academics files | **PASS** after prefer-const fix (ad hoc; not package script) |
| `git diff --check` (touched paths) | **PASS** |

**All tests above are unit/mocked/static. Zero PostgreSQL or browser runs.**

---

## Unverified assumptions

- Postgres accepts migration cleanly on target project.
- RLS/institute isolation under live multi-tenant traffic.
- Concurrent PATCH of `class_periods` last-write-wins behavior acceptable.
- Operator will follow migration → API → Admin order.
- Real-browser Create Account one-click.

---

## Migration rollout dependencies

1. Authorize non-denylist target (or explicit production approval).
2. Backup.
3. Apply `20261023180000_subject_capacity_class_periods.sql`.
4. Verify columns + `subject_capacity_check`.
5. Deploy API (write-assert path).
6. Deploy Admin.
7. Smoke subject capacity + per-class periods + one partial import.

---

## Go / no-go

| Decision | Scope |
| --- | --- |
| **GO (code)** | Code-level integrity checks pass for controlled rollout **after** migration. |
| **NO-GO (deploy now)** | Do **not** deploy API/Admin to an environment that has not applied the migration. |
| **NO-GO (this session)** | Do not apply migration, stage, or production-change from this review. |

**Final label:** `PARTIAL` — automated code checks green; database/browser verification unavailable; rollout blocked until migration is applied by authorization.
