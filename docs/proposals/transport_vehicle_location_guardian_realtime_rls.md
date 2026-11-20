# Proposal: Parent `vehicle_location` Realtime RLS Fix (revised)

**Status:** Proposal only — not applied  
**Revision:** 2026-10-20 (post security review)  
**Staging target (first apply, if approved):** `yveadybpntziyryxsrsu`  
**Denylist:** `kmpzflsurepjwqnfqyld`  
**SQL artifact:** [`transport_vehicle_location_guardian_realtime_rls.sql`](./transport_vehicle_location_guardian_realtime_rls.sql)  
**References:** `qa-artifacts/transport-staging-realtime-verification.md`, `qa-artifacts/four-module-reliability-report.md`  
**Do not modify:** `apps/connect/src/lib/transport/learner-live.ts`, `supabase/migrations/20261006020000_transport_phase9_rls_hardening.sql`

**Recommendation after this revision:** **APPROVE FOR STAGING REVIEW**  
(Authorization gaps from the security review are addressed in the proposed SQL using existing helpers and API-aligned predicates. Staging apply still requires explicit operator approval.)

---

## 1. Root cause (unchanged)

Phase 9 `vehicle_location_select_scoped` (`20261006020000_transport_phase9_rls_hardening.sql`) authorizes guardians via `EXISTS (transport_trip JOIN transport_enrollment …)`. Invoker RLS on `transport_trip` denies parents, so the join is empty and Realtime never delivers `vehicle_location` changes. Parent live GPS via Hono still works (service_role + `resolveLinkedStudentIds`).

Classification: inaccessible joined row under invoker RLS — not missing grants, not a publication bug.

---

## 2. Proposed design (revised)

### Helper: `can_learner_read_vehicle_location(p_institute_id, p_trip_id)`

| Check | Source of truth | Proposed predicate |
|-------|-----------------|-------------------|
| Institute membership | `assertInstituteAccess` / `requireInstituteId` | `public.is_institute_member(p_institute_id)` — existing `SECURITY DEFINER` helper (`20260908160000` hardening: active membership + active institute) |
| Guardian / student | `resolveLinkedStudentIds` + `listGuardianStudentIds` / own student | `is_own_student_row` / `is_guardian_of_student` |
| Enrollment active | `findActiveTripForStudent` | `te.status = 'active' AND te.deleted_at IS NULL` |
| Enrollment approval | `findActiveTripForStudent` `.in('pending','approved')` | `te.approval_status IN ('pending', 'approved')` — CHECK allows only `pending\|approved\|rejected` (`20260827215000`) |
| Trip institute | API institute scope | `tt.institute_id = p_institute_id` |
| Trip active (live GPS) | `findActiveTripForStudent` | `tt.finalized = false AND tt.phase <> 'completed' AND tt.deleted_at IS NULL` |
| Route match | API route-scoped trip | `te.route_id = tt.route_id` |

Staff / platform / assigned-driver branches of `vehicle_location_select_scoped` are **unchanged** from phase9.

### Institute membership parity

**Chosen design:** wrap the guardian/student EXISTS with `public.is_institute_member(p_institute_id)`.

| Why this helper | Evidence |
|-----------------|----------|
| Existing, not invented | `20260826164400` created; `20260908160000` hardened |
| SECURITY DEFINER + `SET search_path = public` | Same migration |
| Active membership only | `m.status = 'active' AND m.deleted_at IS NULL` |
| Active institute | Hardening also requires `i.status = 'active' AND i.deleted_at IS NULL` |
| EXECUTE for authenticated | Granted in foundation migration |
| Matches API membership gate | `assertInstituteAccess` requires `actor.memberships` for non-platform users |

**Revoked membership:** soft-delete (`membership.deleted_at`) or set status to a non-active allowed value (`invited` / `suspended` / `ended` — not `inactive`, which violates `membership_status_check`) → `is_institute_member` false → helper false → no GPS SELECT / Realtime, even if `guardian_link` remains.

**Platform operators / staff:** continue to use `is_platform_operator` / `is_staff_of_institute` branches; they do not rely on this helper for elevated reads.

**Not required:** inventing a new membership RPC or granting parents SELECT on `transport_trip`.

### Completed / soft-deleted / inactive trips

| State | Product (live API) | Proposed RLS (parent/learner helper) |
|-------|--------------------|--------------------------------------|
| Soft-deleted trip | Excluded (`deleted_at IS NULL`) | Excluded |
| Completed / finalized | No active trip → no `latestLocation`; publish rejected | Excluded (`phase <> 'completed'`, `finalized = false`) |
| “Cancelled” trip | **No such phase** in CHECK | N/A |
| Rejected enrollment | Excluded from live trip lookup | Excluded (`approval_status` filter) |
| History API | Boarding metadata only — **no lat/lng** | Parent helper does not grant historical GPS |

Staff/driver visibility of historical GPS rows is unchanged (out of guardian helper scope).

### SECURITY DEFINER ownership

- Fixed `search_path = public`
- Boolean-only return; uses existing nested definers for identity
- ``REVOKE ALL … FROM PUBLIC` **and** `REVOKE … FROM anon` (Supabase default PUBLIC grants can leave `anon` EXECUTE); `GRANT EXECUTE` to `authenticated` + `service_role` only
- **Must apply under privileged migrator role** so the function owner can bypass invoker RLS on `transport_trip` / `transport_enrollment`
- **Fail validation** if owner is `authenticated`, `anon`, or other untrusted role (checklist query below — do not run until apply is approved)

Direct `EXECUTE` by authenticated callers yields a boolean oracle (trip/route intersection). Acceptable under existing `can_learner_read_*` conventions; does not leak coordinates.

### Realtime

Postgres Changes re-checks `vehicle_location` SELECT RLS. Helper removes the need for parent SELECT on `transport_trip`. Publication already includes `vehicle_location`.

---

## 3. Rollback

1. Drop and recreate phase9 `vehicle_location_select_scoped` body from `20261006020000_transport_phase9_rls_hardening.sql` (lines 87–123).  
2. `DROP FUNCTION IF EXISTS public.can_learner_read_vehicle_location(uuid, uuid);`  
3. Re-run staging probe — expect parent GPS realtime to fail again.

---

## 4. Staging checklist (after explicit apply approval — do not run now)

**Gate:** staging ref `yveadybpntziyryxsrsu` only.

### A. Ownership / grants (read-only)

```sql
-- Expect owner = postgres or supabase_admin (or project migrator), NEVER authenticated/anon
SELECT
  p.proname,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'can_learner_read_vehicle_location';

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'can_learner_read_vehicle_location';
```

**Fail closed** if owner ∈ (`authenticated`, `anon`) or if `anon` has EXECUTE.

### B. Functional cases

| Case | Expect |
|------|--------|
| Approved enrollment + active trip + parent membership | Parent SELECT + Realtime `vehicle_location` |
| Pending enrollment + active trip + membership | Allowed (API treats pending as operationally usable) |
| Rejected / inactive / deleted enrollment | Denied |
| Active trip vs completed / finalized / soft-deleted | Only active non-completed non-finalized non-deleted |
| Valid institute membership | Allowed (with other predicates) |
| Membership revoked (status/deleted) while guardian_link remains | Denied |
| Unrelated same-institute parent | Denied |
| Cross-institute parent | Denied (403 live API / 0 GPS rows) |
| Anonymous | Denied |
| Driver location publish / unauthorized parent publish | Unchanged |
| Parent Realtime with own JWT | Events for eligible trip GPS only |
| Parent SELECT `transport_trip` | Still 0 usable rows (no broader trip grant) |
| Isolation institute parent | Denied |

### C. Probe

```bash
node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs
# Expect: vehicle_location_rls_parent PASS; realtime_location_event PASS; isolation PASS
```

---

## 5. Non-mutating local tests (safe now)

```bash
npx vitest run backend/src/domains/transport/transport-rls-policies.test.ts
npx vitest run backend/src/domains/transport/approach.test.ts
```

After promotion into `supabase/migrations/`, extend `transport-rls-policies.test.ts` to assert the active migration contains:

- `can_learner_read_vehicle_location`
- `is_institute_member`
- `approval_status IN ('pending', 'approved')`
- `finalized = false` and `phase <> 'completed'`
- `SECURITY DEFINER` + `SET search_path = public`
- No bare `FROM public.transport_trip tt` inside the policy `USING` (helper only)

---

## 6. Additional Transport gaps (unchanged, inspect-only)

| Gap | Status |
|-----|--------|
| `STOP_APPROACHING` staging emit | Verifiable without product change after grace / distant pings |
| Live/stale/disconnected UI | Exists; browser E2E limited; improves after RLS apply via Realtime |
| `learner-live.ts` | Must remain untouched |

---

## 7. Remaining unresolved decisions

None that block staging **review** of this proposal. Explicit product/operator decisions still required before apply:

1. **Apply window / change owner** for staging (and later production denylist project).  
2. **Staff/driver historical GPS** for completed trips remains as phase9 (wider than parent live API) — intentional unless a separate proposal narrows those branches.  
3. **Boolean EXECUTE oracle** accepted as repo-standard; tighten only if product forbids PostgREST RPC probing.

---

## 8. Explicit approval required before

- Copying SQL into `supabase/migrations/`  
- Applying to staging or any other project  
- Commit / push / deploy  

This proposal does **not** claim the defect is fixed in any database.
