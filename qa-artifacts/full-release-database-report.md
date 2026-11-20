# LumenX — Full Release Database Report (Preflight)

**Date:** 2026-10-20  
**Mode:** Read-only preflight. **No migration applied by this report.**

---

## 1. Project identity

| Item | Value |
|------|--------|
| CLI default / linked ref | `kmpzflsurepjwqnfqyld` (**production**) |
| Evidence | `supabase/.temp/project-ref`; `npm run show:supabase-target --workspace=@lumenx/api` |
| Staging ref | `yveadybpntziyryxsrsu` |
| Confusion risk | **HIGH** — default link is production; always pass `--project-ref` explicitly |

Secrets (service role / DB passwords / tokens): **not printed**.

---

## 2. Migration `20261020160000` status

| Target | Local file | Remote history | Action |
|--------|------------|----------------|--------|
| Staging `yveadybpntziyryxsrsu` | Present | **Applied** (`remote=20261020160000`) | None — already reconciled earlier |
| Production `kmpzflsurepjwqnfqyld` | Present | **Missing** (`remote=""`) | **Pending apply** after approval |

Source of truth for list: `npx supabase migration list --linked` and `--project-ref yveadybpntziyryxsrsu` (read-only).

---

## 3. Pending production migration review

**File:** `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`

| Aspect | Assessment |
|--------|------------|
| Destructive DDL (DROP TABLE / TRUNCATE / DELETE data) | **Not present** |
| Policy replace | `DROP POLICY IF EXISTS vehicle_location_select_scoped` + recreate |
| Function | `CREATE OR REPLACE FUNCTION can_learner_read_vehicle_location` (`SECURITY DEFINER`) |
| Privileges | `REVOKE` from `PUBLIC`/`anon`; `GRANT EXECUTE` to `authenticated`/`service_role` |
| Predicates | Membership + enrollment approval + active trip (aligned with staging apply) |
| Lock risk | Moderate (policy swap on hot Realtime table) — prefer low-traffic window |
| Backup | Confirm Supabase PITR / backup posture for `kmpzflsurepjwqnfqyld` before apply |

---

## 4. History integrity

- No duplicate version IDs observed for `20261020160000`.  
- Ordering is tip-of-chain after `20261016150000`.  
- Staging used prior **repair --status applied** after DDL-already-present reconcile — **do not** use repair to fake a failed production apply.  
- Production must receive **real DDL apply** (`db push` / equivalent) when approved — not repair-only.

---

## 5. Apply status this workflow

| Step | Status |
|------|--------|
| Production apply | **BLOCKED** — awaiting explicit owner approval |
| Staging re-apply | **NOT RUN** (already applied; no need) |
| Verification queries post-apply | **NOT RUN** |

### Exact approval required

Reply with:

```text
APPROVE: Apply migration 20261020160000 to production Supabase project kmpzflsurepjwqnfqyld
```

Only after that approval will this workflow run (example, subject to CLI):

```text
npx supabase db push --linked --project-ref kmpzflsurepjwqnfqyld
```

followed by `migration list` verification and policy/function grant checks — never against staging by mistake.

---

## 6. Application health note

Production parent GPS Realtime remains dependent on this migration. Staging evidence (32/32 probe) does **not** prove production until applied and verified separately.
