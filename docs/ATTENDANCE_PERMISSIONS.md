# Attendance Permissions — Report

**Date:** 2026-07-28  
**Scope:** Frontend demo — no backend.  
**SoT:** `packages/module-attendance/src/permissions.ts`

## Verdict

Roles, route permissions, persona, and navigation now share **one** attendance matrix.  
**Academic Coordinator (`ROL-003`) ≠ Attendance Coordinator (`ROL-ATT-COORD`)** — fixed.

---

## Persona matrix

| Persona | Scope | Mark | Monitor | View | `/student-attendance` | `/attendance` |
|---------|-------|------|---------|------|------------------------|---------------|
| **Teacher** | Own classes | Yes | No | Yes | full (Connect) | — |
| **Class Teacher** | Assigned class | Yes | No | Yes | full (Connect) | — |
| **Attendance Coordinator** | Assigned classes | Yes | Yes | Yes | full | full |
| **Academic Coordinator** | Institute | **No** | Yes | Yes | **read** | **read** |
| **Admin** | Institute | No | Yes | Yes | read | full |
| **Principal** | Institute | No | No | Yes | read | read |

---

## Admin role → persona → navigation

| Role id | Role name | Persona | Nav `/student-attendance` | Nav `/attendance` | Can mark |
|---------|-----------|---------|---------------------------|-------------------|----------|
| `ROL-001` | Principal · Root | `principal` | read | read | No |
| `ROL-002` | Vice Principal | `admin` | read | full | No |
| `ROL-ATT-ADMIN` | Admin · Attendance Monitor | `admin` | read | full | No |
| `ROL-003` | Academic Coordinator | `academic_coordinator` | **read** (was full) | **read** (was full) | **No** |
| `ROL-ATT-COORD` | Attendance Coordinator | `attendance_coordinator` | full | full | Yes (assigned) |

Navigation (`AdminChrome` / `__root`) uses `getRolePermission` → role.permissions.  
Those attendance routes are **force-synced** from `attendanceAdminRoutePermissionsForRole(persona)` on every Roles & Access load — they cannot drift from persona.

---

## Academic Coordinator mismatch (fixed)

| Before | After |
|--------|--------|
| Roles gave `full` on Student Attendance + Insights | Caps forced to `read` / `read` |
| Persona fell through to `admin` (implicit) | Explicit `academic_coordinator` persona |
| UI could imply mark access via route `full` while engine blocked mark | Nav + workspace + banner all say View / Monitor Only |
| Easy to confuse with Attendance Coordinator | Distinct label + banner: marking requires `ROL-ATT-COORD` |

---

## Connect (Teacher / Class Teacher)

| Persona | Source | Mark gate |
|---------|--------|-----------|
| Teacher | Not class teacher, not incharge | Own taught sections + Taken By |
| Class Teacher | `selectedClass.isClassTeacher` | Assigned class + Taken By |
| Attendance Coordinator (Connect) | `profile.isAttendanceIncharge` | Assigned/taught list + Taken By = Coordinator |

Connect does not use Admin role ids. Markability = **permission scope** (`canMark` + section allow) **and** configuration **Taken By** (`resolveMarkableSlots`). No second ownership matrix in the portal.

---

## Single-check rule (no duplicates)

| Layer | Responsibility | Source |
|-------|----------------|--------|
| **Roles & Access** | Which Admin routes appear | Persona route caps |
| **Persona** | canMark / canMonitor / canView / scope | `resolveAttendancePermission` |
| **Navigation** | Hide `none` routes | `getRolePermission` (= synced caps) |
| **Workspace** | Read-only vs mark UI | `access.canMark` only |
| **Engine** | Who may mark which slots | Config Taken By + factual actor flags |

Do **not** re-check `getRolePermission("/student-attendance")` inside mark panels — persona already encodes that.

---

## Demo accounts

| Login | Role | Attendance behavior |
|-------|------|---------------------|
| `principal@…` | Principal | View only |
| `vp@…` | Admin monitor | Insights full · Student Attendance read |
| `coordinator@…` | Attendance Coordinator | Mark assigned classes |

---

## Key files

- `packages/module-attendance/src/permissions.ts` — persona + route caps + Admin role map
- `apps/admin/src/lib/roles-access.ts` — syncs route permissions from module
- `apps/admin/src/lib/attendance-coordinator-access.ts` — persona resolve + access helper
- `apps/connect/src/lib/attendance/teacher-permissions.ts` — Connect persona
- `apps/connect/.../useAttendanceWorkflow.ts` — scope + engine gate only
