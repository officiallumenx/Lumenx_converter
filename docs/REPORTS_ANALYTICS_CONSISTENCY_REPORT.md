# Reports vs Analytics — Consistency Report

**Date:** 2026-07-28  
**Scope:** Admin app surfaces for institute reporting and analytics  
**Rule:** Keep Reports and Analytics separate.

| Surface | Allowed | Forbidden |
|---------|---------|-----------|
| **Reports** (`/reports`) | Download / Export — Excel, PDF, CSV | Charts, live dashboards, insights UI |
| **Analytics** (`/analytics` + module analytics views) | Live dashboard, charts, insights | Any export / download logic |

---

## Verdict

Separation is enforced on the two primary routes and the Transport hub was corrected (former “Reports” view was KPI/analytics). Copy and dead export affordances that mixed the two concepts were fixed.

---

## Primary surfaces

### Reports — Reporting Center (`/reports`)

| Check | Status |
|-------|--------|
| Export Excel / PDF / CSV | Pass — three download actions per catalog row |
| No charts / Recharts / KPI trend dashboards | Pass |
| Copy states export-only | Pass |
| Implementation | `apps/admin/src/routes/reports.tsx` + `apps/admin/src/lib/report-exports.ts` |

Excel and CSV both emit CSV files (Excel opens natively). PDF emits printable HTML (Print → Save as PDF). Demo/mock data only.

### Analytics — Live Analytics (`/analytics`)

| Check | Status |
|-------|--------|
| Live KPIs, charts, insights | Pass |
| No Download / Export / CSV / PDF / Excel handlers | Pass |
| Copy states visualize-only + points exports to Reporting Center | Pass |
| Implementation | `apps/admin/src/routes/analytics.tsx` |

---

## Fixes applied this pass

1. **Transport hub** — Renamed nav/view `reports` → `analytics` (`TransportAnalyticsView`). Legacy `?view=reports` redirects to analytics. Removed “exports coming later” language; link to `/reports` for downloads.
2. **Teacher Performance** — Removed non-functional Export button; replaced with link to Reporting Center. Treated as analytics (ratings/trends only).
3. **Welcome** — Analytics desc no longer mentions export; Reporting Center desc is Excel/PDF/CSV downloads.
4. **Plan catalog** — Attendance no longer says “reports”; Analytics/Reports descriptions aligned with the rule.
5. **Settings FAQ** — Export guidance points only to Reporting Center; clarifies Analytics has no export.
6. **Reporting Center UI** — Explicit Excel, PDF, and CSV buttons; subtitle clarifies no charts.

---

## Intentional exceptions (module-local, not Analytics export)

These are **not** Analytics pages. They are operational helpers. Institute-wide exports still belong in Reporting Center.

| Location | Behavior | Notes |
|----------|----------|-------|
| Students directory | “Export CSV” | Roster helper on `/students` |
| Student bulk import | Download Excel/CSV template | Import workflow, not reporting |
| Academic Years | PDF download | Year-pack export helper |
| Templates generated docs | Demo download | Document delivery, not analytics |
| Modules billing | Download invoice | Billing artifact |

None of these live on `/analytics` or Transport Analytics.

---

## Nav & product language

| Item | Placement | Role |
|------|-----------|------|
| Analytics | Intelligence → Analytics | Visualize |
| Reporting Center | Insights / Intelligence → Reporting Center | Export |
| Transport → Analytics | Transport hub tab | Visualize (module) |
| Teacher Performance | Intelligence | Visualize (link out for export) |

---

## Remaining risks / follow-ups

1. **True `.xlsx`** — Excel button currently downloads `.csv`. Acceptable for demo; real Excel binary can be added later without touching Analytics.
2. **Scheduled report emails** — Removed from FAQ (overstated). Reintroduce only on Reports, never on Analytics.
3. **Template hub `view: "reports"`** — Template-management vocabulary (document reports), unrelated to Reporting Center vs Analytics. Leave as-is unless product wants rename.
4. **Module “Export CSV” on Students** — Keep or eventually funnel deep-links into Reporting Center catalog for one export SoT.

---

## Consistency checklist (regression)

- [ ] `/reports` — Excel, PDF, CSV only; no charts
- [ ] `/analytics` — charts/KPIs/insights only; no export buttons
- [ ] `/transport?view=analytics` — KPIs/insights; link to Reporting Center
- [ ] `/transport?view=reports` — lands on analytics (legacy)
- [ ] Teacher Performance — no Export; Reporting Center link OK
- [ ] Welcome + plan + FAQ copy match the rule table above
