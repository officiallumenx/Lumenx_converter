# LumenX Records pillar

Implementation notes for academic-year lifecycle, five-year retention review, cross-institution transfers, and server-side year exports.

## Product rules (enforced)

1. **Retention:** five calendar years after the authoritative `student.graduated_on`. Expiry means **administrative review**, never automatic permanent deletion.
2. **Academic-year overlap:** live (`upcoming` / `active` / `completed`), non-deleted years in the same institute may not overlap by date. Different institutes are independent.
3. **First / new years:** always created as `upcoming`. Activation requires an authorized admin `PATCH` to `active`. Only one active year per institute (partial unique index + service demotion).
4. **Transfers:** source student row is never re-homed. Destination creates a new student from **explicitly shared fields** and a new enrollment.
5. **Exports:** `academic-year-records` report job generates CSV server-side with auth, institute/year ownership checks, and audit events (`report.export.ready` / `report.export.failed`). No student PII in audit metadata.
6. **Recycle bin:** existing 90-day soft-delete recycle policy is unchanged and separate from retention review.

## Migration (create in repo; do not apply to production from this workstream)

- `supabase/migrations/20261014120000_records_retention_transfer.sql`
  - Partial unique index: one active academic year per institute
  - `student.graduated_on`
  - `student_retention_review`
  - `student_transfer_request`

## Retention job trigger

`processRetentionReviewEligibilitySystem` is invoked from:

1. Background jobs loop (`runBackgroundJobs` → `retention` result)
2. Authenticated `POST /api/v1/retention/jobs/mark-eligible`

It only flips eligible rows to `review_eligible`. It **never** deletes students.

Automatic scheduling depends on the API process running the existing background-jobs runner. Do not claim cloud cron unless the deployment host configures one.

## API surfaces

| Area | Paths |
|------|--------|
| Academic years | existing `/api/v1/academic-years` (create forced upcoming; overlap; safe delete) |
| Graduation | `POST /api/v1/enrollments/graduate` (+ optional `graduated_on`) |
| Retention | `/api/v1/retention/reviews`, `.../decide`, `.../jobs/mark-eligible` |
| Transfers | `/api/v1/transfers`, `.../accept`, `.../reject`, `.../cancel` |
| Export | `POST /api/v1/reports/jobs` with `report_id=academic-year-records` + `academic_year_id` |

## Admin UI

Academic Management hub tabs: Years, Promotion, Graduation, **Retention review**, **Transfers**, Status, Settings.

API-mode year export uses audited server CSV (not client XLSX/HTML-as-PDF).

## Known gaps / blockers

- Destination transfer **accept** UI is documented for API use; hub lists initiate/reject/cancel. Full accept form (year/class/section pickers across institutes) can be extended without schema changes.
- Mandatory longer retention for board/financial/legal regimes is modeled via **extend** and **legal_hold**; specific statutory periods are not hard-coded (requires verified institutional requirements).
- Historical students without `graduated_on` are `pending_graduation_date` — no fabricated dates.
- Certificate / document / dispute blockers beyond outstanding fees are partially covered; expand `evaluateRetentionDeletionBlockers` as those domains expose reliable graduate-scoped queries.

## Production prerequisites

1. Run read-only preflight: `docs/records-preflight.sql` (or equivalent linked `supabase db query --linked` SELECTs). Duplicate active years must be zero.
2. Confirm recovery options (PITR / snapshot) via authorized dashboard metadata before applying DDL. Do not assume a backup exists.
3. Commit and ship API + Admin builds that include this code **together** (schema + handlers must match).
4. Apply `20261014120000_records_retention_transfer.sql` via approved `supabase db push` (or reviewed SQL Editor paste) only after explicit approval.
5. Ensure background-jobs runner is enabled in the API process if automatic eligibility flips are desired (`BACKGROUND_JOBS_INTERVAL_MS`).
6. Train admins: activation is explicit; retention expiry ≠ delete; transfers do not move source rows.

Migrations are **not** auto-applied by the API process start — see `backend/DEPLOY.md`.
