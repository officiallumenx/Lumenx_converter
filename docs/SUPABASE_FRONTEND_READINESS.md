# LumenX — Supabase Frontend Readiness

**Date:** 2026-07-28  
**Scope:** Admin, Connect, Transport, Nexus (licensing), shared `packages/*`  
**Constraint:** Planning only — **no backend schema, RLS, Edge Functions, or Supabase client wiring in this pass.**

Today every durable domain state is **browser `localStorage` + in-memory mock repositories**. Cross-app sync is **same-origin `storage` events / CustomEvents**. This document maps that surface to Supabase so the frontend can be migrated without inventing a second product model.

---

## 0. Separation of concerns (product)

| Surface | Backend role |
|---------|----------------|
| **Reports** (`/reports`) | Read + export (CSV/Excel/PDF generation or signed file URLs) |
| **Analytics** (`/analytics`) | Read aggregates / views / Realtime dashboards — **no export RPCs** |
| **Auth** | Supabase Auth (+ institute membership claims) |
| **Storage** | Supabase Storage buckets for blobs only |
| **Ops data** | Postgres tables + RLS |

---

## 1. Replace mock repositories (inventory)

### 1.1 Pattern already in Connect

Connect portals already use **`repositories.ts` + `mock-data.ts`** with async `delay()` façades. Those files are the **first swap targets** (keep function signatures; replace bodies with Supabase).

| Domain | Repository (swap) | Mock / seed |
|--------|-------------------|-------------|
| Teacher portal | `apps/connect/src/lib/teacher/repositories.ts` | `teacher/mock-data.ts` |
| Parent portal | `apps/connect/src/lib/parent/repositories.ts` | parent mock / portal data |
| Student portal | `apps/connect/src/lib/student/repositories.ts` | student mock |
| Admissions | `apps/connect/src/lib/admissions/repositories.ts` | `admissions/mock-data.ts` |
| Careers | `apps/connect/src/lib/careers/repositories.ts` | `careers/mock-data.ts` |
| Activity / sports / certificates | `apps/connect/src/lib/activity/**/repositories.ts` | activity mock + stores |

### 1.2 Admin — localStorage “stores” (no repository layer yet)

Introduce Admin repositories behind these stores (same public functions; persistence → Supabase):

| Store / module | Key / persistence | Entities |
|----------------|-------------------|----------|
| `student-directory-store.ts` | `lumenx.admin.students.v2.{profile}` | students, bulk import |
| `parent-directory-store.ts` | `lumenx.admin.parents.v2.{profile}` | parents, child links |
| `class-directory-store.ts` | `lumenx.admin.classes.v2.*` | classes / sections |
| `timetable-directory-store.ts` | `lumenx.admin.timetables.v2.*`, `…timetable-schedule.v1.*` | timetables |
| `subjects-data.ts` | `lumenx.admin.subjects.v2.{profile}` | subjects, assignments |
| Teachers (routes + career-to-teacher) | `lumenx.admin.teachers.v2` | teachers directory |
| `marks-entry-store.ts` | `lumenx.admin.marks-entries.v1` | mark sheets / approve flow |
| `teacher-attendance-store.ts` | (store file) | teacher attendance |
| `transport-store.ts` + ops bridge | `lumenx.admin.transport.v2*`, **`lumenx.transport.ops.v1`** | fleet, enrollments, locks |
| `careers-jobs-store.ts` / sync | `lumenx.admin.careers.jobs.v1`, `ues_careers_*` | jobs, applications |
| Admissions sync | `ues_admissions_sync`, `ues_admissions_applications` | applications bridge |
| `institute-profile-store.ts` | `lumenx_institute_profile_overrides` + shared key | institute profile |
| `institute-billing-store.ts` | `lumenx.admin.instituteBilling.v2` | subscription / plan |
| `roles-access.ts` | `lx_admin_roles_access_v1` | roles, assignees, perms |
| `admin-plan-config.ts` | `lumenx.admin.enabledModules.v1` | module toggles |
| `template-management/store.ts` | `lumenx_template_management_v2` | templates / canvas |
| `audit-activity-data.ts` | `lumenx.admin.audit-log.v1` | audit events |
| `report-exports.ts` | `lumenx-admin-recent-exports` | recent export **client cache only** |
| Hardcoded seeds | `admin-module-data.ts`, analytics data | become seed migrations / views |

### 1.3 Shared packages (bridges → tables)

| Package file | Key | Becomes |
|--------------|-----|---------|
| `transport-ops-bridge.ts` | `lumenx.transport.ops.v1` | `transport_*` tables (SoT) |
| `module-fees` store | `lumenx.fees.v1` | `fee_*` tables |
| `homework-diary-bridge.ts` | homework / diary keys | `homework_*`, `diary_*` |
| `attendance-pending-bridge.ts` | `lumenx.attendance-pending.v1` | attendance submissions + admin alerts |
| `learner-published-marks.ts` | published marks key | marks publish projection |
| `principal-mark-alerts.ts` / `principal-attendance-alerts.ts` | alert keys | notification rows or derived views |
| `certificate-recommendations.ts` | recommendations key | certificate workflow |
| `shared-institute-profile.ts` | `lumenx.shared.instituteProfile.v1` | `institutes` + branding |
| `soft-delete-recycle.ts` | `lumenx.recycle-bin.v1` | `deleted_at` + recycle view |
| `notification-retention.ts` | `lumenx.notification-lifecycle.v1` | notification lifecycle columns |
| `offline-sync-queue.ts` | queue + meta keys | client outbox → API (see §6) |
| `platform-readonly.ts` | readonly flag | billing / academic-year lock flags |

### 1.4 Transport app

| Store | Key | Notes |
|-------|-----|-------|
| `route-setup/store.ts` | `lumenx.transport.route-setup.v1` | merges into ops SoT |
| `trip/store.ts`, `attendance/store.ts`, `alerts/store.ts`, `settings/store.ts`, `support/store.ts` | device-local today | trip live state → Realtime |

### 1.5 Auth stores (→ Supabase Auth, not tables-as-sessions)

| App | Keys | Today |
|-----|------|-------|
| Admin | `lx_admin_session_v1`, remember, demo registered, OTP pending, PINs, setup drafts | Mock JWT in localStorage |
| Connect | `@lumenx/auth` `CONNECT_STORAGE_KEYS.*`, student/parent auth, teacher session | Role + user JSON |
| Admissions / Careers | `ues_admissions_users`, `ues_careers_users`, portal session keys | Password in clear / hash-demo |
| Transport | driver session (demo credentials docs) | Device-local |

**Do not** migrate mock passwords into Postgres as plaintext. Use Auth identities + `profiles` / `memberships`.

### 1.6 Hardcoded datasets that become seed or views

- `apps/admin/src/lib/admin-module-data.ts` — marks, fees students, admissions, careers, transport legacy, leave seeds, report catalog metadata  
- `apps/admin/src/lib/admin-analytics-data.ts` — chart series (prefer SQL views / rollups, not static arrays)  
- `apps/connect/src/lib/mock-data.ts`, teacher/parent/student/activity mocks  
- `packages/types/src/demo-profiles.ts` — multi-institute demo → real `institutes` rows  
- `packages/teacher-session/src/mock-data.ts`  
- Transport `mock/seed.ts`

---

## 2. API boundaries (frontend → Supabase)

Prefer **PostgREST (supabase-js) + RLS** for CRUD. Use **Edge Functions / RPC** only for multi-step workflows, exports, and privileged ops.

### 2.1 Client-direct (table CRUD under RLS)

Directories, profiles, classes, subjects, timetable cells, fees snapshot fields, transport vehicles/routes/stops/enrollments (non-live), notifications read/star/delete, leaves CRUD (status transitions guarded), complaints, events, homework/diary rows, admissions/careers applications (status-gated), templates metadata, academic year settings.

### 2.2 RPC / Edge Function (workflow boundaries)

| Endpoint (conceptual) | Why not raw table write |
|-----------------------|-------------------------|
| `auth.*` (Supabase Auth) | Sessions, OTP, password recovery |
| `rpc_approve_marks` / `reject` / `return` | Admin cannot edit scores; status machine |
| `rpc_publish_marks` | Fan-out to learner published marks + alerts |
| `rpc_submit_attendance` | Teacher submit + clear pending + principal alert |
| `rpc_approve_leave` / `reject` | Side effects / notifications |
| `rpc_issue_certificate` | Recommend → Admin issue |
| `rpc_convert_admission_to_student` | Creates student + parent links + portal access |
| `rpc_convert_career_to_teacher` | Creates teacher + Connect access |
| `rpc_publish_fees` | Scope publish + Connect visibility |
| `rpc_lock_transport_route` | Admin lock after driver setup |
| `rpc_soft_delete` / `rpc_restore_recycle` | Soft delete + 90d retention |
| `rpc_export_report` | Reports Center only — Excel/PDF/CSV |
| `rpc_bulk_import_students` | Validate + insert batch |
| Nexus: `rpc_license_institute` | Platform operator only |

### 2.3 Explicit non-APIs (stay client)

- Theme keys (`luminexa-theme`, nexus theme)  
- UI scroll positions, recent search, map provider preference  
- Recent exports list (optional cache after real export)  
- Demo profile switcher (`lumenx_demo_profile`) — remove in production  

### 2.4 Analytics vs Reports API split

- **Analytics:** `GET` views / rollup tables / Realtime subscriptions — **no** `rpc_export_*`  
- **Reports:** `rpc_export_report` or Storage signed URLs only  

---

## 3. Storage usage (blobs → Supabase Storage)

| Use case | Current behavior | Bucket (proposed) | Path pattern |
|----------|------------------|-------------------|--------------|
| Institute logo | data URL / profile override | `institute-assets` | `{institute_id}/logo` |
| Admin / parent / student avatars | FileReader → data URL | `avatars` | `{institute_id}/{user_id}` |
| Document signatures | data URL in documents UI | `signatures` | `{institute_id}/{user_id}` |
| Admissions application docs | filename stub in repositories | `admissions-docs` | `{institute_id}/{application_id}/{doc_id}` |
| Careers CVs / docs | filename stub | `careers-docs` | `{institute_id}/{application_id}/…` |
| Template design imports | parsed locally | `templates` | `{institute_id}/{template_id}/source` |
| Generated certificates / PDFs | demo download | `certificates` | `{institute_id}/{cert_id}.pdf` |
| Student bulk import files | parsed client-side | optional `imports` staging | `{institute_id}/imports/{job_id}` |
| Report export artifacts | client blob download | `reports` (optional) | `{institute_id}/{export_id}` |
| Storage usage UI | mock GB counters | derive from Storage API / DB | — |

**Not Storage:** CSV/JSON domain state, fees amounts, marks numbers, transport GPS points (those are rows).

---

## 4. Auth requirements

### 4.1 Personas / apps

| Persona | App | Auth method today | Supabase need |
|---------|-----|-------------------|---------------|
| Principal / Admin staff | Admin | Email/phone + password, email+SMS OTP demo, remember me, app PIN lock | Email + phone OTP; MFA optional; app PIN remains local |
| Teacher | Connect | Teacher session + portal access overrides | Email/phone; claim `role=teacher` |
| Parent | Connect | Parent directory match | Phone OTP preferred; link `parent_student` |
| Student | Connect | `studentAuth` accounts | Student ID + OTP / password policy per institute |
| Admissions applicant | Connect Admissions | Email/password demo | Magic link or email+password |
| Institute admissions officer | Admissions admin | Demo password | Same as Admin membership or separate `admissions_officer` |
| Careers candidate / recruiter | Careers portal | Demo users | Candidate + recruiter roles |
| Driver | Transport | Demo credentials | Phone OTP; `role=driver`; vehicle assignment |
| Nexus operator | Nexus | Licensing store | Platform role outside institute RLS |

### 4.2 Claims / membership model (required)

Every authenticated user needs:

- `auth.users.id`  
- `profiles` (name, phone, avatar_path)  
- `institute_memberships (user_id, institute_id, role, access_role_id?, status)`  
- Optional `admin_access_roles` mirroring `roles-access.ts` (module route → `full|read|none`)

Multi-tenant rule: **all institute data filtered by `institute_id`**. Demo profile ID becomes real `institute_id`.

### 4.3 Flows to preserve in UX (implement via Auth)

1. Admin login / register / OTP verify email+mobile  
2. Password recovery overrides → Auth recovery  
3. Institute setup / registration submitted → Nexus approval + membership  
4. Connect role picker + institute remember (`ues_last_institute`)  
5. App lock PIN (device-local; not Auth)  
6. Platform read-only when subscription expired / year locked (`platform-readonly` + billing)

---

## 5. Realtime requirements

Today = `window` `storage` listeners + CustomEvents. Map 1:1 to Realtime.

| Channel / topic (proposed) | Trigger | Consumers |
|----------------------------|---------|-----------|
| `transport_ops:{institute_id}` | enrollments, stops, route locks | Admin Transport, Driver, Connect read-only |
| `transport_trip:{trip_id}` | live trip / ETA / attendance on bus | Driver, Parent/Student Connect |
| `fees:{institute_id}` | publish / amounts | Admin Fees, Connect fee views |
| `marks:{institute_id}` or class scoped | submit / approve / publish | Teacher, Admin, learners |
| `attendance_pending:{institute_id}` | teacher submit / missing | Admin Home alerts |
| `notifications:{user_id}` | insert / soft-delete | Connect + Admin chrome |
| `admissions_applications:{institute_id}` | status changes | Admin + Admissions portal |
| `careers_applications:{institute_id}` | pipeline | Admin + Careers |
| `homework_diary:{class_id}` | logs / submissions | Teacher + Admin view-only |
| `institute_profile:{institute_id}` | branding / lock flags | All apps |
| `offline_sync` | N/A server | Client-only meta |

**Low priority Realtime:** Reporting Center, Analytics historical charts (poll or materialized views on load).

---

## 6. Offline sync requirements

**Current:** `packages/utils/src/offline-sync-queue.ts` — outbox in localStorage; `flushOfflineQueue` **simulates** success; **`enqueueOfflineOp` is not yet called from feature code** (UI status bar only).

**Target behavior:**

| Requirement | Design |
|-------------|--------|
| Outbox | Keep client queue; on flush POST/upsert via supabase-js or Edge |
| Ops to queue first | Attendance submit, marks save, homework save, diary, leave create, complaint create, driver stop GPS updates |
| Idempotency | `client_mutation_id` on each queued item |
| Auto sync | `online` event + interval (already sketched) |
| Conflict | Server wins for Admin locks; last-write-wins for driver GPS with timestamp |
| Read-only gate | Do not flush when `platform_readonly` / year locked |
| Cap | Existing 500-item client cap |

Driver + Teacher mobile (Capacitor) are primary offline clients; Admin web secondary.

---

## 7. Generated artifacts (not implemented)

### 7.1 Tables required

Core tenancy & people:

- `institutes`
- `profiles`
- `institute_memberships`
- `admin_access_roles`
- `admin_access_assignees`
- `students`
- `parents`
- `parent_student_links`
- `teachers`
- `staff`
- `classes`
- `sections`
- `class_enrollments`
- `subjects`
- `subject_assignments` (teacher ↔ subject ↔ class)

Academics:

- `academic_years`
- `timetable_grids`
- `timetable_slots`
- `attendance_sessions`
- `attendance_records` (student)
- `teacher_attendance_records`
- `attendance_submission_status` (pending / submitted per class-day)
- `exams`
- `mark_sheets`
- `mark_entries` (status: draft / submitted / approved / returned / rejected)
- `published_marks` (learner projection)
- `homework_assignments`
- `homework_submissions` / activity logs
- `diary_entries` / submissions
- `leave_requests` (student + teacher)
- `complaints`
- `institute_events`
- `certificates` + `certificate_recommendations`

Fees & finance:

- `fee_categories`
- `fee_class_defaults`
- `fee_student_overrides`
- `fee_transport_stop_rates`
- `fee_publish_state`
- `fee_payments` (if/when collected)

Transport:

- `transport_vehicles`
- `transport_drivers`
- `transport_routes`
- `transport_stops`
- `transport_route_stops`
- `transport_enrollments` (student ↔ vehicle)
- `transport_route_locks`
- `transport_trips`
- `transport_trip_attendance`
- `transport_alerts` / SOS

Admissions & careers:

- `admission_programs` / `admission_openings`
- `admission_applications` + `admission_documents` (metadata)
- `career_jobs`
- `career_applications` + documents metadata
- `career_inquiries`

Comms & platform:

- `notifications` (+ starred, deleted_at, recycle fields)
- `messages` / threads (if product keeps chat — **exclude from Admin audit private content**)
- `announcements` / alerts
- `audit_events` (Admin-only; no private chat bodies)
- `documents_registry`
- `templates` + `template_assets` metadata
- `recycle_bin_items` **or** rely on `deleted_at` columns (prefer columns)
- `institute_billing` / subscriptions
- `enabled_modules`
- `storage_usage_stats` (optional aggregate)
- Nexus: `institute_licenses`

Analytics support (prefer views):

- Materialized / SQL views for enrollment, attendance, fees, engagement — **not** denormalized export tables

### 7.2 Storage required (buckets)

| Bucket | Public? | Notes |
|--------|---------|-------|
| `avatars` | signed / public-read optional | profile photos |
| `institute-assets` | public-read logos | branding |
| `signatures` | private | staff signatures |
| `admissions-docs` | private | applicant uploads |
| `careers-docs` | private | CV / certificates |
| `templates` | private | imported designs |
| `certificates` | private | issued PDFs |
| `reports` | private | optional generated exports |
| `imports` | private | bulk upload staging |

### 7.3 Realtime channels

See §5. Bind as:

- `postgres_changes` on tables filtered by `institute_id`  
- or private channels `institute:{id}:transport`, `user:{id}:notifications`

### 7.4 RLS boundaries

**Global rules**

1. Deny all by default.  
2. `institute_id` must match a row in `institute_memberships` for `auth.uid()`.  
3. Role checks via membership `role` + optional `admin_access_roles.permissions`.  
4. Platform read-only: block INSERT/UPDATE/DELETE when billing expired or academic year locked (except Nexus / billing tables).  
5. Soft-deleted rows: hide from normal SELECT; recycle restore = Admin only.  
6. Audit log: **Admin roles only**; never store private chat plaintext.  
7. Analytics views: SELECT for Admin (+ optionally teachers on own classes); **no** client UPDATE.  
8. Reports export RPCs: Admin (+ permission `reports`); teachers do not get institute-wide export by default.

**Role sketches**

| Role | SELECT | INSERT/UPDATE | DELETE |
|------|--------|---------------|--------|
| `admin` / principal | institute-wide | per access_role | soft-delete where allowed |
| `teacher` | own classes / own submissions | attendance, marks draft, homework, diary | limited |
| `parent` | linked children only | leave/complaints for children | own drafts |
| `student` | own row + published artifacts | homework submit, limited profile | — |
| `driver` | assigned routes/vehicles/enrollments | stops GPS, trip attendance | — |
| `admissions_applicant` | own applications | own docs | own draft |
| `recruiter` / careers admin | institute jobs pipeline | job CRUD | soft-delete jobs |
| `nexus_operator` | licenses cross-tenant | license updates | — |

**Sensitive columns:** passwords never in tables; phone/email on profiles with RLS; document Storage paths only in DB (objects private).

### 7.5 API endpoints (catalog — not implemented)

Auth (Supabase built-in):

- `POST /auth/v1/signup` · `token` · `otp` · `recover` · `logout`

REST (PostgREST examples):

- `GET/POST/PATCH /rest/v1/students`  
- `GET/POST/PATCH /rest/v1/teachers`  
- `GET/POST/PATCH /rest/v1/parents`  
- `GET/POST/PATCH /rest/v1/classes`  
- `GET/PATCH /rest/v1/timetable_slots`  
- `GET/POST/PATCH /rest/v1/mark_entries`  
- `GET/POST /rest/v1/attendance_records`  
- `GET/PATCH /rest/v1/fee_*`  
- `GET/POST/PATCH /rest/v1/transport_*`  
- `GET/POST/PATCH /rest/v1/admission_applications`  
- `GET/POST/PATCH /rest/v1/career_applications`  
- `GET/PATCH /rest/v1/notifications`  
- `GET /rest/v1/audit_events`  
- `GET /rest/v1/analytics_*` (views)

RPC / Functions:

- `POST /rest/v1/rpc/approve_marks`  
- `POST /rest/v1/rpc/reject_marks`  
- `POST /rest/v1/rpc/return_marks`  
- `POST /rest/v1/rpc/publish_marks`  
- `POST /rest/v1/rpc/submit_attendance`  
- `POST /rest/v1/rpc/approve_leave`  
- `POST /rest/v1/rpc/issue_certificate`  
- `POST /rest/v1/rpc/convert_admission_to_student`  
- `POST /rest/v1/rpc/convert_career_to_teacher`  
- `POST /rest/v1/rpc/publish_fees`  
- `POST /rest/v1/rpc/lock_transport_route`  
- `POST /rest/v1/rpc/soft_delete_entity`  
- `POST /rest/v1/rpc/restore_recycle_item`  
- `POST /rest/v1/rpc/export_report` ← **Reports only**  
- `POST /rest/v1/rpc/bulk_import_students`  
- `POST /functions/v1/flush-offline-batch` (optional batch outbox)

Storage:

- `POST /storage/v1/object/{bucket}/…`  
- `GET` signed URLs for private objects  

Realtime:

- `ws` subscribe per §5  

---

## 8. Frontend preparation order (recommended, no code in this pass)

1. **Freeze SoT keys** listed above as the migration dictionary.  
2. **Keep Connect `repositories.ts` APIs**; add the same façade on Admin stores.  
3. **Auth first** — swap Admin `auth-store` / OTP service and Connect `AppProvider` to Supabase session.  
4. **Tenancy** — `institutes` + memberships; remove `lumenx_demo_profile` branching.  
5. **Transport ops** — replace `lumenx.transport.ops.v1` with tables + Realtime (already unified SoT).  
6. **Fees / marks / attendance** — highest cross-app churn.  
7. **Storage buckets** for admissions/careers/avatars.  
8. **Wire `enqueueOfflineOp`** at teacher/driver mutation sites before going to production mobile.  
9. **Reports export RPC** last among reads; never attach to Analytics.

---

## 9. Out of scope (this document)

- No SQL migrations, no Supabase project config, no `@supabase/supabase-js` dependency added  
- No RLS policies authored  
- No mock repository bodies replaced  
- No Edge Function source  

When implementation starts, treat this file as the contract checklist.
