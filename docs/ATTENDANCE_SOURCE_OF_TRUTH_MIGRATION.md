# Attendance Source of Truth — Migration Summary

**Date:** 2026-07-28  
**Scope:** Frontend / demo localStorage only — no backend, no UI redesign.

## Verdict

**Attendance Registers** (`lumenx.attendance-registers.v2` via `@lumenx/module-attendance`) are the **only** write and read path for marked attendance. Dual-write to in-memory `attendanceRecords`, the pending localStorage bridge, and calendar seed absences are removed from active consumers.

---

## Canonical SoT

| Concern | Source |
|--------|--------|
| Mark / draft / submit | `saveSlotAttendance` → Registers |
| Leave applied to days | `upsertSlotRegister` on Registers |
| Teacher history / record | `listRegistersForSection` / `getSlotAttendance` |
| Teacher / Admin reports & analytics | Register-backed builders + demo register seed |
| Admin / Connect pending | `listPendingAttendanceFromRegisters` (expected classes minus submitted registers) |
| Parent / Student month & today | `buildLearnerAttendanceDays` / `resolveStudentStatusFromRegisters` |
| Dashboards (Admin home, Monitor, Teacher) | Pending/completed from Registers |

Unmarked working days render as **`unknown`** (not invented present/absent).

---

## What was removed / retired

| Former source | Status |
|---------------|--------|
| Connect teacher in-memory `attendanceRecords` | Removed — no longer written or read |
| `markAttendanceSubmitted` / pending localStorage dual-write | Stubs only in `@lumenx/utils`; Admin uses register-derived pending |
| Calendar **seed** present/absent (`seedFromString` consumers) | Parent/Student Overview, Growth, dashboards use Registers |
| `attendanceHistorySeed` as live SoT | Deprecated export; history from Registers + `ensureDemoAttendanceHistorySeed` |

---

## Consumer map (after)

| Surface | Reads | Writes |
|---------|-------|--------|
| Teacher Mark | Registers (engine) | Registers only (`engineCtx` required) |
| Leave approval → attendance | — | Registers (`upsertSlotRegister`) |
| Teacher History / Reports | Registers | — |
| Admin Mark / Monitor / Home pending | Registers | Mark via engine → Registers |
| Admin Analytics / Reports / exports | Registers | — |
| Parent Attendance Overview | Registers | — |
| Parent Dashboard / Growth `attendanceDays` | Registers | — |
| Student Attendance Overview | Registers | — |
| Student Dashboard / snapshot days | Registers | — |

---

## Compatibility left on purpose

- **`AttendanceRecord`** type + `registerToAttendanceRecord` — UI/history adapters; not a second store.
- **`buildAttendanceDays(year, month)`** — holiday/future/unknown **skeleton** only; seed arg ignored.
- **`packages/utils` pending bridge** — deprecated empty API so old imports do not resurrect dual-write.
- **Demo register seed** (`ensureDemoAttendanceHistorySeed`) — populates Registers for demos/reports, not a parallel SoT.

---

## Not in this change

- Backend / Supabase persistence
- UI redesign
- Removing portal person IDs outside Attendance (still mapped via roll → canonical `stu:…`)
- Deleting unused deprecated symbols (`attendanceHistorySeed`, `seedFromString`) — safe cleanup later

---

## How to verify

1. Mark attendance as Teacher → Parent/Student calendar for that student/date updates; no separate pending key write.
2. Approve leave → Registers show leave; dual history store not updated.
3. Admin Monitor / Home pending shrinks only after a **submitted** register for that section/date.
4. Module scripts: `packages/module-attendance` workflow + history verify (expect PASS).
