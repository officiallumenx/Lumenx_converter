# Attendance Everywhere — Integration Summary

Frontend only. No backend. Shared helpers live in `@lumenx/module-attendance`.

## Surfaces

| Dashboard | Widgets | Source |
|-----------|---------|--------|
| **Teacher** | Pending Attendance · Completed Attendance · Remaining Classes | Teacher portal dashboard snapshot (`attendanceMarkedClasses` + class list) |
| **Admin** | Attendance Pending · Late Submission · Coordinator Summary | `buildAdminAttendanceDashboard` + pending bridge + registers / notification queue |
| **Student** | Today's Attendance | `resolveLearnerTodayAttendance` (Registers only) |
| **Parent** | Today's Attendance · Attendance Alerts | Same today resolver + Attendance Notification Inbox (`stu:…` child map) |

## Behaviour

- **Teacher** — pending / completed / remaining update when attendance is submitted for a class today.
- **Admin** — pending = classes not submitted today; late = submitted after 10:00; coordinator summary = month % + submitted today + pending + alerts queued.
- **Student / Parent** — today's status from submitted Registers; unmarked = unknown.
- **Parent / Student `/notifications`** — merges Attendance Notification Inbox under category Attendance (same SoT as dashboard alerts).
- **Daily Summary** — auto-flushed in demo; clock-scheduled delivery needs backend (see `ATTENDANCE_NOTIFICATION_WORKFLOW.md`).

## Key files

- `packages/module-attendance/src/dashboard.ts`
- `apps/connect/.../TeacherDashboardPage.tsx`
- `apps/admin/src/routes/index.tsx`
- `apps/connect/.../StudentDashboardPage.tsx`
- `apps/connect/.../ParentDashboardPage.tsx`
