# Reports & Analytics — implementation notes

## Product separation

| Surface | Role |
|---------|------|
| `/reports` (Reporting Center) | Export / download only (CSV jobs in API mode) |
| `/analytics` | Live KPIs and charts only — no exports |
| Module analytics tabs | Visualize; deep-link to `/reports` for downloads |

## Student Reports Home

Implemented as a category strip on Reporting Center (`ReportsApiCatalogPanel`):

- Directory & enrollment → `students`
- Attendance → attendance CSV family
- Examinations → `marks` (optional `academic_year_id`)
- Fees & dues → `fees`
- Admissions → `admissions`

Year-scoped enrollment printable/Excel packs remain under **Academic Management → Academic years** (historical enrollment rows for the selected year).

## API

```
GET  /api/v1/reports/catalog?institute_id=
GET  /api/v1/reports/jobs?institute_id=
POST /api/v1/reports/jobs
     { institute_id, report_id, from_date?, to_date?, academic_year_id? }
GET  /api/v1/reports/jobs/:id/download

GET  /api/v1/analytics?institute_id=
GET  /api/v1/analytics/series?institute_id=&range=term|year
```

### Filter support

| Filter | Applies to |
|--------|------------|
| `from_date` / `to_date` | Attendance family, audit, leave, events, complaints, admissions (where generators check dates) |
| `academic_year_id` | Attendance registers (`academic_year_id`), marks entries (`academic_year_id`) |
| Neither | Full institute dump for roster/teachers/transport/etc. — UI must not imply year filtering |

## Subscription read-only

`/api/v1/reports` is allowlisted on the subscription write-gate so authorized users can still queue and download exports while institutional writes are locked.

## CSV safety

Generators use `domains/reports/csv.ts`: quote escaping + prefix neutralization for `= + - @` formula injection.

## Deferred / blockers

- Server-side binary PDF / Storage-backed async jobs (foundation migration notes)
- True demo `.xlsx` for Reporting Center Excel button (still CSV-compatible download)
- Attendance hub UI builders remaining demo-backed (backend CSV catalog is live)
- SQL materialized views / `export_report` RPC from older blueprints — not required by current generators

## Safety

No hosted migrations or production data access from this implementation pass.
