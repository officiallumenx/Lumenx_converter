# Migration formalization — guardian `vehicle_location` Realtime RLS

**Status:** Local migration file landed. Staging schema already matched. **Staging history repair for `20261020160000` completed** (Step B, 2026-10-20). Do **not** re-apply DDL on staging while schema matches. Production denylist still requires a separate CR.  
**Dates:** Draft 2026-10-20 (Phase 2) · Staging read-only reconciliation 2026-10-20 (Phase 3) · Local formalization 2026-10-20 (Step A) · Staging history repair 2026-10-20 (Step B)  
**Branch context:** `fix/cloudflare-workers-build-upload` @ `c384e10e` (working tree may be dirty).  
**Staging project:** `yveadybpntziyryxsrsu`  
**Production / shared denylist:** `kmpzflsurepjwqnfqyld` — never apply without a separate production change request.  
**Do not modify:** `apps/connect/src/lib/transport/learner-live.ts`, `supabase/migrations/20261006020000_transport_phase9_rls_hardening.sql`

**Reviewed proposal sources:**  
[`transport_vehicle_location_guardian_realtime_rls.sql`](./transport_vehicle_location_guardian_realtime_rls.sql) ·  
[`20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`](./20261020160000_transport_vehicle_location_guardian_realtime_rls.sql) ·  
[`transport_vehicle_location_guardian_realtime_rls.md`](./transport_vehicle_location_guardian_realtime_rls.md)

**Active repo migration (Step A complete):**  
`supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`

**State summary:**

| Layer | State |
|-------|--------|
| Staging live schema | Already applied directly from `docs/proposals/` (see apply report) — matches reviewed SQL |
| Local `supabase/migrations/` | **File added** for reproducibility / fresh environments |
| Staging `schema_migrations` | **`20261020160000` recorded as applied** via history-only repair (Step B) |

**Evidence:**  
- Prior apply: `qa-artifacts/_transport-gps-rls-apply-report.md`  
- Phase 3 recon: `qa-artifacts/_phase3-staging-rls-recon-report.md` (+ `_phase3-*.json` / `_phase3-migration-list.txt`)

---

## Phase 3 decision (evidence-based)

### Decision category: **B — Not recorded, schema already matches**

| Question | Result |
|----------|--------|
| Staging project identity | Confirmed `yveadybpntziyryxsrsu` (`lx-staging-transport-rt` count=1, `LX-E2E%` count=2). CLI default link is denylist `kmpzflsurepjwqnfqyld`; all queries used `--linked --project-ref yveadybpntziyryxsrsu`. |
| Version `20261020160000` in history | **Absent** |
| Schema vs proposal | **Matches** (function, policy, grants, publication) |
| Re-apply DDL now? | **No** (not approved; also unnecessary while matching) |
| Mark-applied now? | **No** (not approved this phase) |

**Rationale:** Direct proposal apply already installed the reviewed helper/policy/grants on staging. `supabase_migrations.schema_migrations` tip is `20261016150000` (`document_number_uniqueness`); phase9 `20261006020000` is present; nothing records the guardian Realtime fix. Live definitions match the proposal, including `REVOKE` effect (`anon` has no `EXECUTE`). Therefore staging needs a **history-only** reconciliation after the migration file lands in the repo — not another policy rewrite.

---

## 1. Why formalization is still required

| Concern | Phase 3 state |
|---------|----------------|
| Fresh environments / `db push` from repo | Still lack the migration file under `supabase/migrations/` → parent Realtime GPS would remain broken on new DBs |
| Staging schema | Helper + revised policy + correct grants **present** |
| Staging migration history | **Missing** `20261020160000` |
| Local ↔ remote migration list | Aligned through `20261016150000`; no local `20261020160000` file yet |
| Production denylist | Untouched |

---

## 2. Authorization behavior that must be preserved

Unchanged from the reviewed proposal:

1. **`can_learner_read_vehicle_location(institute_id, trip_id)`** — `SECURITY DEFINER`, `SET search_path = public`, boolean only.  
2. **Institute membership:** `public.is_institute_member(p_institute_id)`.  
3. **Enrollment:** `te.status = 'active'`, `te.deleted_at IS NULL`, `te.approval_status IN ('pending', 'approved')`.  
4. **Active trip filter:** `tt.deleted_at IS NULL`, `tt.institute_id = p_institute_id`, `tt.finalized = false`, `tt.phase <> 'completed'`.  
5. **Learner/guardian:** `is_own_student_row` / `is_guardian_of_student`.  
6. **Policy:** staff / platform / assigned-driver branches unchanged from phase9; guardian/student branch calls helper only.  
7. **Grants:** `REVOKE ALL … FROM PUBLIC`; **`REVOKE ALL … FROM anon`**; `GRANT EXECUTE` to `authenticated` and `service_role` only.  
8. **Ownership:** privileged migrator (`postgres` observed on staging).

Do **not** edit `20261006020000_transport_phase9_rls_hardening.sql`.

---

## 3. Phase 3 read-only evidence (executed)

**Tooling note:** `npx supabase db query` requires `--linked` with `--project-ref` on this CLI (2.121.0). Default linked project is the denylist; always pass `--project-ref yveadybpntziyryxsrsu`. Abort if ref ≠ staging.

`supabase_migrations.schema_migrations` columns on staging: `version`, `statements`, `name` (**no** `inserted_at`).

### 3.1 Identity

```text
current_database = postgres
current_user     = postgres
staging_rt_count = 1
e2e_count        = 2
```

### 3.2 Migration history

| Version | Name | Present? |
|---------|------|----------|
| `20261016150000` | `document_number_uniqueness` | Yes (tip) |
| `20261006020000` | `transport_phase9_rls_hardening` | Yes |
| `20261020160000` | (guardian realtime) | **No** |
| Any `20261020*` / name matching guardian helper | — | **No** |

`npx supabase migration list --linked --project-ref yveadybpntziyryxsrsu` shows local and remote versions aligned through `20261016150000`.

### 3.3 Function / policy / grants / publication

| Check | Observed |
|-------|----------|
| Function | Present: `(p_institute_id uuid, p_trip_id uuid)` |
| Owner | `postgres` |
| SECURITY DEFINER | `true` |
| Config | `{search_path=public}` |
| Body markers | `is_institute_member`, `approval_status IN ('pending', 'approved')`, `finalized = false`, `phase <> 'completed'`, own/guardian helpers |
| Policy `vehicle_location_select_scoped` | Staff / platform / driver branches + `can_learner_read_vehicle_location(institute_id, trip_id)` — **no** bare `transport_trip` join in policy |
| EXECUTE grants | `authenticated`, `service_role`, `postgres` |
| `anon` EXECUTE | **Absent** |
| Publication | `supabase_realtime` → `public.vehicle_location` |

### 3.4 Convergence assessment

Proposed SQL is idempotent (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, explicit REVOKE/GRANT). Re-applying would converge to the same schema, but is **not** the preferred staging path while definitions already match (avoids policy drop/create flaps on live trips).

---

## 4. Selected path — Option B1

### Step A — Repo only — **DONE** (local formalization)

1. Copied reviewed SQL into  
   `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`  
   (authorization body identical to proposal; retains `REVOKE … FROM anon`).  
2. Extended `backend/src/domains/transport/transport-rls-policies.test.ts` for helper predicates, grants, and policy shape.  
3. Phase9 migration left untouched.

### Step B — Staging history mark-applied — **DONE**

Executed (history-only; no DDL):

```bash
npx supabase migration repair \
  --status applied \
  --linked \
  --project-ref yveadybpntziyryxsrsu \
  20261020160000
```

Result: `Repaired migration history: [20261020160000] => applied`  
Artifacts: `qa-artifacts/_repair-command-result.txt`, `_repair-post-*.json`

**Do not** run `db push` / migration apply against staging for this version while schema already matches, unless a later inspection shows drift.

#### Step B verification (read-only, after repair)

Re-run the Phase 3 SELECTs for function owner/grants/policy/publication. Fail closed if `anon` gains `EXECUTE` or owner is untrusted.

Optional probe / RLS matrix: separate staging-write approval.

### Step C — Other environments / production (**not executed**)

- Fresh envs: normal apply of `20261020160000` after phase9.  
- Production denylist: separate CR; same identity + schema checks; never reuse staging fixtures.

### Paths not selected now

| Option | Why not |
|--------|---------|
| A — Already recorded + schema matches | History lacks `20261020160000` |
| C — Schema differs / incomplete | Schema matches proposal |
| D — Ambiguous | Evidence is conclusive for staging |
| Re-apply DDL on staging | Unnecessary while matching; not approved |

---

## 5. Rollback considerations

If the formalized migration must be undone on an environment:

1. Restore phase9 `vehicle_location_select_scoped` from  
   `supabase/migrations/20261006020000_transport_phase9_rls_hardening.sql` (lines 87–123).  
2. `DROP FUNCTION IF EXISTS public.can_learner_read_vehicle_location(uuid, uuid);`  
3. If history was marked applied:  
   `npx supabase migration repair --status reverted --linked --project-ref <target> 20261020160000`  
   (staging ref only unless production CR exists).  
4. Expect parent Realtime GPS to fail again; Hono live GPS (service_role) remains.

Rollback destroys the verified staging fix — require explicit approval.

---

## 6. Post-change verification checklist

### Owner / grants

- Fail if owner ∈ (`authenticated`, `anon`).  
- Fail if `anon` has `EXECUTE`.

### RLS regression cases

| Case | Expect |
|------|--------|
| Approved enrollment + active trip + parent membership | Parent SELECT + Realtime |
| Pending enrollment + active trip | Allowed |
| Rejected / inactive / deleted enrollment | Denied |
| Completed / finalized / soft-deleted trip | Denied for helper |
| Membership soft-deleted; guardian_link remains | Denied |
| Unrelated same-institute parent | Denied |
| Cross-institute / isolation parent | Denied |
| Anonymous | Denied |
| Parent SELECT `transport_trip` | Still 0 usable rows |
| Staff / driver branches | Unchanged |

### Local non-mutating

```bash
npx vitest run backend/src/domains/transport/transport-rls-policies.test.ts
npx vitest run backend/src/domains/transport/approach.test.ts
```

---

## 7. Explicit non-goals (this formalization pass)

- No DDL/DML on staging or production.  
- No `migration repair` / history insert/update/delete.  
- No `db push` / migration apply.  
- No commit, push, deploy, or release.  
- No production denylist operations.  
- No modification of `learner-live.ts` or phase9 migration.

---

## 8. Approval decisions still required

1. ~~Approve Step A~~ — **done locally** (migration file + RLS source tests).  
2. ~~Approve Step B~~ — **done** (`migration repair --status applied` on `yveadybpntziyryxsrsu` for `20261020160000`).  
3. **Separate CR** before any production denylist work.  
4. Optionally update companion proposal `.md` status line (still says “not applied”; staging schema + history are now aligned).
