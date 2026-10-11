# Dashboard & Performance — implementation notes

## Surfaces

| Surface | Role |
|---------|------|
| Admin `/` (Home Command Center) | KPI overview, setup checklist, attention, widgets — **no Recharts** |
| Admin `/analytics` | Charts / series (Recharts) — export stays on `/reports` |
| Setup checklist (`/setup` + home banner) | Derived from authoritative list APIs |

Home summary SoT: `GET /api/v1/analytics?institute_id=`  
There is no separate `/api/v1/home` route.

## Correctness rules

- KPI **zeros only when summary status is `ready`** with a successful API payload.
- Demo mode must not present fabricated live totals as production data.
- Core directory counts (students / teachers / parents) **fail the analytics summary** if their list APIs fail — never silent zero.
- Secondary counters (complaints / leave / homework) may degrade to zero.
- Widget slices fail independently; overall `error` only when all live slices fail (birthdays loaded separately).

## Known unavailable metrics (honest)

| Metric | Why |
|--------|-----|
| Attendance today (institute-wide) | No institute rollup endpoint yet — card stays unavailable |
| Fee overdue | Snapshot has outstanding totals, not due-date aging |

## Performance notes

- Home shell excludes Recharts via chart stub + split query hooks.
- Widgets / birthdays / inbox are separate React Query keys (day-scoped where needed).
- Analytics charts stay on `/analytics` to keep Home light.

## Migrations

No new migration required for this pass. Materialized KPI rollups remain an optional future optimization (document if introduced later).

## Safety

Implementation and mocked/unit tests only — no hosted DB, deploy, or production data access.
