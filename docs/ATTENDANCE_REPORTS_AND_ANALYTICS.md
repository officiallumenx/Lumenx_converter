# Attendance Reports & Analytics — Report

Frontend only. No backend. Hub: **Admin → Attendance Insights** (`/attendance`).

## Separation rule

| Area | What it is | What it is not |
|------|------------|----------------|
| **Reports** | Tabular builders + Reporting Center exports | Charts / insight lists |
| **Analytics** | Attendance Trends · Low Attendance · Frequently Absent | Tables / CSV · Excel · PDF |

## Reports

Path: `/attendance?view=reports`

| Kind | Output |
|------|--------|
| **Daily** | Per-section snapshot for one date (present / absent / leave / rate / status) |
| **Weekly** | Monday–Sunday week aggregates by section |
| **Monthly** | Month-to-date aggregates by section |
| **Student** | Per-student attendance % in range |
| **Teacher** | Who submitted registers (marker log) |
| **Class** | Rollup across sections of a class |
| **Section** | Full section history + method segments |

Engine: `buildAttendanceReportByKind` → `buildAttendanceHistoryReport` (frozen method / Working Days / Attendance %).

Exports: Reporting Center IDs  
`attendance-daily` · `attendance-weekly` · `attendance` (monthly) · `attendance-student` · `attendance-teacher` · `attendance-class` · `attendance-section`

## Analytics

Path: `/attendance?view=analytics`

| Insight | Builder |
|---------|---------|
| **Attendance Trends** | `buildAttendanceTrends` (chart) |
| **Low Attendance** | `buildLowAttendanceSections` (≤90% watch / ≤80% critical) |
| **Frequently Absent** | `buildFrequentlyAbsentStudents` |

No export buttons on Analytics. Downloads stay in Reporting Center / Reports.

## Key files

- `packages/module-attendance/src/admin-reports.ts`
- `packages/module-attendance/src/analytics.ts`
- `packages/module-attendance/src/reports.ts`
- `apps/admin/.../AttendanceReportsView.tsx`
- `apps/admin/.../AttendanceAnalyticsView.tsx`
- `apps/admin/src/lib/report-exports.ts`
