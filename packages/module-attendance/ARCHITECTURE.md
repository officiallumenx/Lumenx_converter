# Attendance Engine Architecture

**Package:** `@lumenx/module-attendance`  
**Rule:** One engine. Never duplicate attendance mode/ownership logic in Admin or Connect.

---

## Principle

```
Configuration  +  Actor  +  Periods?  →  createAttendanceWorkflow()  →  AttendanceWorkflow
                                              ↓
                                    saveSlotAttendance() / reads
```

- **Method** (from config) → which slots exist  
- **Owner / Taken By** (from config) → which slots this actor may mark  
- Engine **does not** hardcode “class teacher daily flow” vs “period flow” as separate products  

---

## Supported modes (same engine)

| Config field | Values |
|--------------|--------|
| Method | `daily` · `morning_first_period` (Morning First) · `morning_afternoon` · `period_wise` |
| Taken By | `class_teacher` · `current_period_teacher` · `attendance_incharge` (Coordinator) |

---

## Core modules

| File | Responsibility |
|------|----------------|
| `attendance-engine.ts` | **`createAttendanceWorkflow`** — sole factory |
| `slots.ts` | Method → slots |
| `ownership.ts` | Owner → markable slots |
| `engine.ts` | Resolve live config → factory; save / pending / history reads |
| `config-store.ts` | Append-only Effective From versions (Admin writes) |
| `register-store.ts` | Persist marks; freeze method/owner on first write |

---

## App wiring (allowed)

| App | May call | Must not |
|-----|----------|----------|
| Connect Teacher | `openAttendanceWorkflow` / `saveSlotAttendance` | Build slots or owner rules locally |
| Admin config UI | `appendAttendanceConfig` | Implement a second mark engine |
| Reports / history | Read registers + `buildAttendanceSlots(frozen method)` | Fork method semantics |

Timetable → `periods[]` is **input** for Period Wise only; the engine does not invent periods.

---

## Forbidden

- Separate “DailyEngine” / “PeriodEngine” classes  
- Hardcoded if/else workflows in UI (“if daily show X else show Y” **business** rules) beyond rendering `workflow.slots`  
- Duplicating `resolveMarkableSlots` in Connect or Admin  

UI may still branch on `workflow.slots.length` for presentation only.
