# Teacher Attendance — Marking Workflow Report

**Date:** 2026-07-28  
**Surface:** Connect → Teacher → Attendance (module always visible)  
**Engine:** `@lumenx/module-attendance` · gate: `resolveTeacherMarkGate`

---

## Configuration → Teacher behaviour

| Attendance Taken By (config) | Who can mark in Teacher portal | UI behaviour |
|------------------------------|--------------------------------|--------------|
| **Current Period Teacher** | Teachers assigned to the section; period slots filtered by subject | Mark actions enabled for markable slots |
| **Class Teacher** | Only the class teacher for that section | Non–class teachers: actions disabled + ownership banner |
| **Attendance Coordinator** | **No teacher** in this portal | Actions disabled · banner: *This institute uses Attendance Coordinator for attendance.* |

---

## Rules

1. **Do not hide** the Attendance module when marking is disabled.
2. **Disable actions:** roster toggles, All present/absent, Save draft, Submit, markable slot chips.
3. History / Reports / My attendance tabs remain available (read-only paths).
4. Submit is blocked in UI and rejected with toast if gate is closed.
5. Coordinator policy is enforced in the Teacher portal even if an actor flag says incharge — Coordinator capture is not this Teacher mark screen.

---

## Implementation map

| Piece | Role |
|-------|------|
| `resolveTeacherMarkGate` | Maps `workflow.owner` → enable/disable + banner |
| `useAttendanceWorkflow` | Opens one engine workflow + returns `markGate` |
| `TeacherAttendancePage` | Shows banner; `canMarkActiveSlot = markGate.markingEnabled && slot markable` |
| `AttendanceRow` | `disabled` when marking not allowed |
| Engine `resolveMarkableSlots` | Class Teacher / Period Teacher ownership for cases 1–2 |

---

## Example flows

### A — Current Period Teacher + Mathematics teacher
1. Config owner = `current_period_teacher`
2. Workflow builds period slots from timetable
3. Math teacher: Math period chip enabled; other subjects disabled
4. Can draft/submit Math slot

### B — Class Teacher only
1. Config owner = `class_teacher`
2. Class teacher of 10-B: all slots markable
3. Other teachers of 10-B: banner from engine blocked reason; actions disabled

### C — Attendance Coordinator
1. Config owner = `attendance_incharge`
2. Teacher opens Attendance → module visible
3. Banner: **This institute uses Attendance Coordinator for attendance.**
4. All mark actions disabled; History/Reports still open

---

## Verification checklist

- [ ] Switch Admin config to Current Period Teacher → subject teacher can mark periods
- [ ] Switch to Class Teacher → only class teacher can mark
- [ ] Switch to Attendance Coordinator → teacher sees exact banner; Save/Submit disabled
- [ ] Attendance nav/tab still present in all three modes
