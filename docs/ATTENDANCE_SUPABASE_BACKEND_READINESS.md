# Attendance — Backend Readiness Report (Supabase)

**Date:** 2026-07-28  
**Constraint:** Planning only — **no schema migrations, RLS SQL, Edge Functions, or supabase-js in this pass.**  
**Frontend SoT today:** `@lumenx/module-attendance` (localStorage) + Connect teacher repositories + Admin hub  
**Aligns with:** `docs/SUPABASE_FRONTEND_READINESS.md` (if present), `docs/ATTENDANCE_PERMISSIONS.md`, audit findings

---

## Identity model (canonical — frontend)

Internal identifiers (display labels may differ):

| Entity | Canonical form | Example |
|--------|----------------|---------|
| Class | stripped id | `10` (not `Grade 10` / `Class 10`) |
| Section | `{class}::{section}` | `10::B` |
| Student | `stu:{class}:{section}:{roll}` | `stu:10:B:14` |

Helpers: `packages/module-attendance/src/identity.ts` — Admin/Connect must not invent alternate keys.

---

Attendance is **frontend-ready for Supabase mapping**. Methods, owners, Effective From, frozen registers, notifications, reports vs analytics, and permission personas are explicit enough to become tables + RPCs + RLS without inventing a second product model.

**Cutover blockers (product / identity — not schema inventiveness):**

1. **Section key divergence** — Admin `Grade 10::B` vs Connect/seed `10::B` (normalize to `section_id` UUID + canonical text).  
2. **Parent/Student SoT** — month history still calendar-seeded; notification `student_id` often ≠ parent `child.id`.  
3. **Connect dual-write** — in-memory `attendanceRecords` can diverge from module registers (incl. leave).  
4. **`late_entry` / `early_exit`** — config + simulate only; no mark fields or submit emit.  
5. **Admin Period Wise** — open workflow without timetable `periods` (placeholder slot).

**Out of scope:** Teacher *staff* attendance, Transport trip attendance — separate domains / tables.

---

## 1. Tables

### 1.1 Core (must)

| Table | Purpose | Maps from today |
|-------|---------|-----------------|
| `attendance_config_versions` | Append-only Effective From chain | `lumenx.attendance-config.v1` → `AttendanceConfigVersion` |
| `attendance_slot_registers` | One row per section × date × slot | `lumenx.attendance-registers.v1` → `AttendanceSlotRegister` |
| `attendance_slot_marks` | Per-student status on a register | Normalized from `absentIds[]` / `leaveIds[]` |
| `attendance_notification_config` | Institute timing / triggers / recipients | `lumenx.attendance-notification-config.v1` |
| `attendance_pending_submissions` | Missing submit today (monitor) | `lumenx.attendance-pending.v1` |

### 1.2 Notifications / ops

| Table | Purpose | Maps from today |
|-------|---------|-----------------|
| `attendance_notification_events` | Daily-summary queue events | `…-summary-queue.v1` |
| `attendance_notification_messages` | Outbox audit (queued / delivered / skipped) | `…-outbox.v1` |
| `notification_inbox` *(shared)* | Parent / Student / Teacher in-app rows | `…-inbox.v1` + principal remind payloads |
| `principal_attendance_alerts` | Not-submitted remind batches | `lumenx.principal-attendance-alerts.v1` |

Prefer one institute-wide **inbox** with `module = 'attendance'` long-term; keep attendance outbox/events for audit.

### 1.3 Read models (SQL views — not write tables)

| View | Replaces |
|------|----------|
| `v_attendance_history_report` | `buildAttendanceHistoryReport` |
| `v_attendance_daily_rows` (+ weekly / monthly / student / teacher / class / section) | `buildAttendanceReportByKind` |
| `v_attendance_trends` | `buildAttendanceTrends` |
| `v_attendance_low_sections` | `buildLowAttendanceSections` |
| `v_attendance_frequent_absentees` | `buildFrequentlyAbsentStudents` |
| `v_attendance_admin_dashboard` | `buildAdminAttendanceDashboard` |

**Rule:** Reports and Analytics may share views; only Reports call export RPC / Storage.

### 1.4 Shared dependencies (required elsewhere)

`institutes`, `profiles`, `institute_memberships`, `students`, `parents`, `parent_student`, `teachers`, `teacher_section_assignments` (subjects + class-teacher flag), `classes`, `sections`, `timetable_slots` / periods, `academic_years`, `institute_holidays`, roles / coordinator assignments.

### 1.5 Column sketches

**`attendance_config_versions`** (append-only)

| Column | Notes |
|--------|--------|
| `id` | uuid |
| `institute_id` | uuid, RLS tenant |
| `effective_from` | date |
| `method` | `daily` \| `morning_first_period` \| `morning_afternoon` \| `period_wise` |
| `owner` | `class_teacher` \| `current_period_teacher` \| `attendance_incharge` |
| `scope` | `institute` \| `class` \| `section` |
| `class_targets` / `section_targets` | text[] or join tables → prefer FK join tables at cutover |
| `created_at`, `created_by` | |

**Invariant:** no UPDATE/DELETE of past versions (except platform repair).

**`attendance_slot_registers`**

| Column | Notes |
|--------|--------|
| `id` | uuid |
| `institute_id` | |
| `config_version_id` | **Frozen** FK |
| `method`, `owner` | **Frozen** (copy at first write) |
| `section_id` | uuid FK (canonical); optional `section_key` text for migration |
| `class_label`, `section` | display |
| `date` | date |
| `slot_id` | text (`slot:day`, `slot:morning-first`, `slot:morning`, `slot:afternoon`, `slot:period:{n}`) |
| `slot_label`, `slot_kind` | frozen (`day` \| `morning` \| `afternoon` \| `period`) |
| `status` | `draft` \| `submitted` |
| `marked_by` | uuid → teachers/profiles |
| `updated_at`, `submitted_at` | Late *submission* = after institute cutoff (≠ late_entry trigger) |
| **Unique** | `(institute_id, section_id, date, slot_id)` |

**`attendance_slot_marks`**

| Column | Notes |
|--------|--------|
| `register_id`, `student_id` | PK composite |
| `status` | `absent` \| `leave` (and later `late_entry` / `early_exit` **if** product adds them) |

**Present is not stored** — roster − absent − leave for submitted registers.

**`attendance_notification_config`** (1:1 institute)

`timing` ∈ `immediate` \| `daily_summary` \| `no_notification`; `triggers[]`; `recipients[]` ∈ `parent` \| `student`; `updated_at`, `updated_by`.

---

## 2. Relationships

```
institutes
  ├── attendance_config_versions (1:N, append-only)
  ├── attendance_notification_config (1:1)
  ├── sections / classes
  │     └── attendance_slot_registers (1:N per day × slot)
  │           ├── attendance_config_versions (N:1 frozen)
  │           └── attendance_slot_marks (1:N students)
  ├── teachers ── marked_by; assignments → actor flags
  ├── students ── marks; notifications via parent_student
  ├── timetable_slots ── period_wise slot generation (read at open workflow)
  ├── attendance_pending_submissions (section × date × optional slot)
  └── attendance_notification_events → messages → notification_inbox
```

**Config resolution on a date (preserve):** section-scoped → class-scoped → institute-scoped, where `effective_from <= date` (latest wins).

**History rule:** if submitted registers exist for that day, reports use **frozen** `method` / slots — never re-resolve live config over them.

**Identity rule for cutover:** every register/mark/notification uses `section_id` + `student_id` UUIDs; `section_key` is migration-only.

---

## 3. Permissions

Map frontend personas (`permissions.ts`) → Supabase roles / claims.

| Persona | Scope | Mark | Monitor | View |
|---------|-------|------|---------|------|
| Teacher | Own taught sections | Yes (Taken By = current period teacher) | No | Yes |
| Class Teacher | Assigned class section(s) | Yes (Taken By = class teacher) | No | Yes |
| Attendance Coordinator | Assigned section allow-list | Yes (Taken By = incharge **or** flags allowing mark on assigned) | Yes | Yes |
| Admin | Institute | **No** | Yes | Yes |
| Principal | Institute | **No** | **No** | Yes |
| Parent | Linked children | No | No | Own children’s marks + inbox |
| Student | Self | No | No | Own marks + inbox (if recipient enabled) |

**Orthogonal Taken By (`ownership.ts`) — must be enforced server-side:**

| Owner | Who may mark |
|-------|----------------|
| `attendance_incharge` | Coordinator / incharge flag only |
| `class_teacher` | Class teacher for section |
| `current_period_teacher` | Teaches section; period slots filtered by subject |

**Do not trust client-only checks.** Encode `resolveMarkableSlots` / `actorCanMarkSlot` inside draft/submit RPCs.

**Actor inputs needed server-side:** teacher id, subjects for section, `is_class_teacher`, `is_attendance_incharge`, `teaches_section`, assigned section allow-list.

**Roles note:** Admin UI role `ROL-003` (Academic Coordinator) ≠ Attendance Coordinator persona — backend must key off attendance coordinator role / assignments, not academic coordinator alone.

---

## 4. RLS (conceptual)

### 4.1 Tenant

Every attendance table: `institute_id = auth_institute_id()` (JWT / membership).

### 4.2 Suggested policies

| Table | SELECT | INSERT / UPDATE |
|-------|--------|-----------------|
| `attendance_config_versions` | Admin + staff who need active config | Admin via `rpc_append_attendance_config` only (revoke direct write) |
| `attendance_slot_registers` | Admin: all; Teacher: taught / CT / incharge sections; Parent/Student: via marks for linked student | Teachers via RPC only |
| `attendance_slot_marks` | Same; Parent: `student_id IN parent_children()`; Student: self | Via RPC only |
| `attendance_pending_submissions` | Admin + relevant teachers | Service / RPC on submit |
| `attendance_notification_config` | Admin | Admin |
| `attendance_notification_*` | Admin audit; recipients see own inbox | RPC / trigger on submit |
| Report / analytics views | Admin (+ optional teacher scoped) | — |

### 4.3 Freeze enforcement

- Trigger or RPC: reject UPDATE to `method`, `owner`, `config_version_id`, `slot_kind`, `slot_label` after first insert (or after ever `submitted`).
- Config versions: revoke UPDATE/DELETE for non-platform roles.

---

## 5. Realtime

| Channel / topic | Intent | Subscribers |
|-----------------|--------|-------------|
| `attendance_pending:{institute_id}` | Pending created / cleared | Admin Home, Monitor |
| `attendance_register:{section_id}:{date}` | Draft / submit updates | Teachers on same section (optional) |
| `notifications:{user_id}` | Inbox insert (absence, summary, not-submitted remind) | Parent, Student, Teacher |
| Admin dashboard KPIs | Optional broadcast or poll view | Admin Home |

**Low priority:** historical Reports / Analytics (refresh on navigate or poll).

---

## 6. Offline

| Requirement | Detail |
|-------------|--------|
| **Must queue** | `rpc_save_attendance_draft`, `rpc_submit_attendance` (Teacher Connect / Capacitor) |
| **Conflict** | Unique `(section, date, slot)` — LWW on draft; **submitted wins** over later draft; never rewrite frozen metadata |
| **Client outbox** | Reuse `lumenx.offline-sync-queue.v1`; ops: `attendance.save_draft`, `attendance.submit` (**not wired today**) |
| **Read offline** | Cache roster + open-workflow snapshot + local draft marks |
| **Pending / Admin monitor** | Online-only or eventual |
| **Parent / Student** | Read-mostly; optional cached month |
| **Idempotency** | Client `op_id` on submit RPC — avoid double submit / double notify |

---

## 7. Notification APIs

### 7.1 Preserve model

| Dimension | Values |
|-----------|--------|
| Timing | `immediate` \| `daily_summary` \| `no_notification` (UI: Disabled) |
| Triggers | `daily_absence` \| `period_absence` \| `late_entry` \| `early_exit` |
| Recipients | `parent` \| `student` |

### 7.2 Backend surfaces

| API | Behavior |
|-----|----------|
| Inside `rpc_submit_attendance` | Emit absence events for absent students (period → `period_absence`, else `daily_absence`); honor timing / triggers / recipients |
| `rpc_flush_attendance_daily_summary` | Drain queue → messages + inbox (cron Edge + Admin) |
| `rpc_notify_attendance_not_submitted` | Principal remind → teacher inbox / push |
| Config GET/PUT | `attendance_notification_config` under Admin RLS |
| Inbox GET / mark-read | Shared `notification_inbox` filtered by recipient user |

**Channels:** in-app inbox first; SMS / WhatsApp / email = later adapters reading the same outbox.

### 7.3 Gaps before claiming parity

- Implement or remove **late_entry / early_exit** (need mark fields or separate events).
- Wire **student** recipient end-to-end.
- Replace Admin “Simulate” with production emit only.
- Align `student_id` with Parent/Student profile ids.

---

## 8. Storage

| Blob? | Verdict |
|-------|---------|
| Registers, marks, config, notifications | **Postgres only** — not Storage |
| Report Excel / PDF / CSV | Optional bucket `reports/{institute_id}/attendance/{export_id}` via Reporting Center |
| Attendance photos / biometric | **Not in product** — do not invent |

---

## 9. Attendance APIs

### 9.1 Client-direct (PostgREST + RLS)

| Operation | Target |
|-----------|--------|
| List config versions / active | `attendance_config_versions` |
| Load register + marks for mark UI | registers + marks |
| Teacher / section history | registers by section/date |
| Parent / Student day + month | marks joined to student |
| Notification config read | `attendance_notification_config` |
| Inbox read | `notification_inbox` |
| Pending list (Admin) | `attendance_pending_submissions` |
| Analytics / report preview | SQL views (`GET` only) |

### 9.2 RPC / Edge (workflow)

| RPC | Why |
|-----|-----|
| `rpc_append_attendance_config` | Append-only + validate Effective From + scope |
| `rpc_open_attendance_workflow` *(optional)* | Resolve config + timetable periods + markable slot ids |
| `rpc_save_attendance_draft` | Ownership check + upsert register/marks; `draft` |
| `rpc_submit_attendance` | Ownership + submit + freeze + pending update + absence notify |
| `rpc_flush_attendance_daily_summary` | Cron / Admin |
| `rpc_notify_attendance_not_submitted` | Principal remind |
| `rpc_export_report` | Reporting Center only |

### 9.3 Explicit non-APIs

- Demo seeds (`ensureDemoAttendanceHistorySeed`, static heatmaps)
- Client theme / demo profile switcher
- Derived present counts (view or client from marks + roster)

---

## 10. Repository Interfaces

Keep **function names** in `@lumenx/module-attendance`; swap localStorage implementations for Supabase adapters. Apps must not talk to tables directly except through these façades + RPCs.

### 10.1 Config repository

```ts
interface AttendanceConfigRepository {
  listVersions(instituteId: string): Promise<AttendanceConfigVersion[]>;
  resolveForDate(input: {
    instituteId: string;
    date: string;
    classLabel?: string;
    sectionId?: string;
    sectionKey?: string;
  }): Promise<AttendanceConfigVersion | null>;
  append(input: NewAttendanceConfigInput & {
    instituteId: string;
    createdBy: string;
  }): Promise<AttendanceConfigVersion>; // → rpc_append_attendance_config
  buildHistoryTimeline(from: string, to: string): Promise<AttendanceConfigHistoryEntry[]>;
}
```

**Today:** `config-store.ts` (`loadAttendanceConfigVersions`, `appendAttendanceConfig`, `resolveAttendanceConfigForDate`, …).

### 10.2 Register / mark repository

```ts
interface AttendanceRegisterRepository {
  getSlot(sectionId: string, date: string, slotId: string): Promise<AttendanceSlotRegister | null>;
  listForSection(sectionId: string, opts?: { from?: string; to?: string }): Promise<AttendanceSlotRegister[]>;
  listMarks(registerId: string): Promise<{ studentId: string; status: "absent" | "leave" }[]>;
  saveDraft(input: SaveSlotAttendanceInput & { instituteId: string; opId?: string }): Promise<SaveSlotAttendanceResult>;
  submit(input: SaveSlotAttendanceInput & { instituteId: string; opId?: string }): Promise<SaveSlotAttendanceResult>;
  listPendingSlots(sectionId: string, date: string, expectedSlotIds: string[]): Promise<string[]>;
}
```

**Today:** `register-store.ts` + `engine.ts` (`saveSlotAttendance`, `getSlotAttendance`, `getSectionAttendanceHistory`, `listPendingSlots`).

### 10.3 Workflow repository (read orchestration)

```ts
interface AttendanceWorkflowRepository {
  open(input: OpenAttendanceWorkflowInput & {
    instituteId: string;
    actor: AttendanceActor;
  }): Promise<AttendanceWorkflow | null>; // optional RPC; else config + timetable client-side
}
```

**Today:** `openAttendanceWorkflow` / `createAttendanceWorkflow` + Connect `periodsFromTimetable`.

### 10.4 Notification repository

```ts
interface AttendanceNotificationRepository {
  getConfig(instituteId: string): Promise<AttendanceNotificationConfig>;
  saveConfig(instituteId: string, config: AttendanceNotificationConfig, updatedBy: string): Promise<void>;
  listOutbox(instituteId: string): Promise<AttendanceNotificationMessage[]>;
  listQueue(instituteId: string): Promise<AttendanceNotificationEvent[]>;
  listInbox(userId: string, opts?: { studentId?: string }): Promise<InboxItem[]>;
  flushDailySummary(instituteId: string, date: string): Promise<AttendanceNotificationMessage[]>;
  // emit is side-effect of submit RPC — not a separate client API in production
}
```

**Today:** `notification-config-store.ts`, `notification-flow.ts`.

### 10.5 Reports / analytics / dashboard (read-only)

```ts
interface AttendanceReportsRepository {
  buildByKind(kind: AttendanceReportKind, input: AttendanceReportCommonInput): Promise<AttendanceReportBundle>;
  // export → rpc_export_report only from Reporting Center
}

interface AttendanceAnalyticsRepository {
  trends(input: { instituteId: string; from: string; to: string; sectionIds?: string[] }): Promise<AttendanceTrendPoint[]>;
  lowSections(input: { instituteId: string; threshold?: number }): Promise<LowAttendanceSection[]>;
  frequentAbsentees(input: { instituteId: string; from: string; to: string }): Promise<FrequentlyAbsentStudent[]>;
}

interface AttendanceDashboardRepository {
  adminDashboard(instituteId: string): Promise<AdminAttendanceDashboard>;
  learnerToday(input: { studentId: string; date: string; sectionId?: string }): Promise<LearnerTodayAttendance>;
  learnerNotifications(input: { studentId: string }): Promise<InboxItem[]>;
}
```

**Today:** `admin-reports.ts`, `analytics.ts`, `dashboard.ts`, `reports.ts` — become view/RPC-backed adapters.

### 10.6 Permissions (client helper + server truth)

```ts
interface AttendancePermissionRepository {
  resolve(input: {
    persona: AttendancePersona;
    assignedSectionIds?: string[];
  }): AttendancePermissionDecision; // pure policy — can stay client + mirrored in RPC
  // Server derives persona from memberships / roles; never trust client persona alone
}
```

**Today:** `permissions.ts` + Admin `attendance-coordinator-access.ts` + Connect `teacher-permissions.ts`.

### 10.7 Pending / principal alerts

```ts
interface AttendancePendingRepository {
  listForDate(instituteId: string, date: string): Promise<PendingRow[]>;
  // mutations only via submit / remind RPCs
}

interface PrincipalAttendanceAlertRepository {
  list(instituteId: string): Promise<PrincipalAttendanceAlert[]>;
  sendNotSubmittedRemind(input: { instituteId: string; date: string; teacherIds: string[] }): Promise<void>;
}
```

**Today:** `packages/utils` pending bridge + principal alerts — fold into attendance domain at cutover (`classId` → `section_id`).

### 10.8 Offline outbox adapter

```ts
interface AttendanceOfflineQueue {
  enqueue(op: "attendance.save_draft" | "attendance.submit", payload: unknown, opId: string): void;
  flush(): Promise<void>; // calls RPCs when online
}
```

**Today:** generic `enqueueOfflineOp` — **no attendance call sites yet**.

---

## 11. Frontend swap map

| Façade | Action |
|--------|--------|
| `packages/module-attendance/*` stores | Implement repository interfaces with supabase-js / RPC; keep exports |
| Connect `teacher/repositories.ts` `saveAttendance` | Single path → register RPC; **delete** parallel `attendanceRecords` SoT |
| Connect leave `applyApprovedLeave` | Write marks/registers, not only in-memory list |
| Admin mark / config / notify panels | Point at repositories |
| Parent / Student dashboards | Marks views — kill production calendar seed |
| Pending bridge | `attendance_pending_submissions` + Realtime |
| Reporting Center | `rpc_export_report` only for Attendance exports |

---

## 12. Migration order (recommended)

1. Tables + RLS skeletons + `rpc_append_attendance_config` / `rpc_submit_attendance`  
2. Canonical `section_id` / `student_id`; stop string-key drift  
3. Swap `@lumenx/module-attendance` persistence; keep public APIs  
4. Teacher Connect save/load → RPC; remove `attendanceRecords` dual-write  
5. Parent / Student → marks views; fix notification student ids  
6. Pending + Realtime  
7. Notification config + submit emit + daily flush cron  
8. Report / analytics views; Reporting Center export  
9. Offline outbox for draft/submit  
10. Decide late/early: implement mark statuses or drop from config UI  
11. Fix Admin Period Wise to pass timetable periods (frontend) before claiming period parity  

---

## 13. Explicit non-goals (this report)

- No SQL migrations, RLS SQL, Edge Function code, or supabase-js wiring  
- No new ERP features (biometric, GPS classroom, payroll attendance)  
- No merging Transport bus attendance into student class registers  

---

## Summary checklist

| Identify | Outcome |
|----------|---------|
| **Tables** | Config versions, registers, marks, notification config/events/messages, pending, principal alerts; SQL views for reports/analytics |
| **Relationships** | Institute → config → frozen registers → marks; timetable → period slots; students/parents via marks + inbox |
| **Permissions** | Five personas + Taken By ownership; Parent/Student read-only; server-enforced mark rights |
| **RLS** | `institute_id` everywhere; student-scoped marks; freeze triggers; RPC-only writes for marks |
| **Realtime** | Pending + inbox (+ optional live register) |
| **Offline** | Queue draft/submit with `op_id`; submitted wins; Admin optional online |
| **Notification APIs** | Submit emit + flush summary + not-submitted remind + config/inbox reads |
| **Storage** | Report artifacts only |
| **Attendance APIs** | PostgREST reads + RPCs for append/draft/submit/flush/remind/export |
| **Repository Interfaces** | Config, Register, Workflow, Notification, Reports, Analytics, Dashboard, Permissions, Pending, Offline — keep module façades |
