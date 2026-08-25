# LumenX — Backend Architecture & Database Blueprint (Phase 0)

**Mode:** READ-ONLY / NO IMPLEMENTATION
**Status:** FINALIZED after Phase 0.5 deep review (APPROVED WITH CHANGES applied) — architecture frozen, awaiting Phase 1 approval
**Frontend baseline:** commit `edc8ac869d1aed7c34234e061e8d6ac1092d9352` · tag `frontend-v1.0.0` · branch `main`
**Target stack:** Frontend → HTTPS → Hono (TypeScript) API → domain services → Supabase (Auth/Postgres/Storage/RLS/Realtime) + Firebase (FCM/Analytics/Crashlytics)

> Architectural rule enforced throughout: **frontend never holds service-role/Admin SDK/DB business logic/server secrets**. All privileged operations pass through the Hono API. Nexus is the **platform control plane**, logically separated from institute/school operational data.

> **Phase 0.5 review outcome:** the ~92-table figure was directionally correct but (a) under-counted Activity/Sports, (b) omitted `staff_attendance`/`stored_asset`, and (c) over-counted several derived/config items. The finalized model is **~95–105 tables as the complete long-term product schema**, split across **V1 (~34) / V1.5 (~30) / V2 (~35)**. Only **~34 tables are required to launch.** See the new sections **"Architecture Decisions Frozen Before SQL"**, **"V1 Database Scope"**, **"V1.5 Database Scope"**, and **"V2 Database Scope"** below.

---

## PART 1 — Frontend baseline verification

| Check | Result |
|-------|--------|
| Branch | `main` |
| HEAD | `edc8ac869d1aed7c34234e061e8d6ac1092d9352` |
| Tag `frontend-v1.0.0` | Present, points at HEAD |
| Working tree | Clean (`main...origin/main`) |
| `backend/` directory | Does **not** exist |
| `docs/backend/` | Created for this blueprint only |
| Supabase / Firebase / Hono dependencies | **None** in any `package.json` |

**Conclusion:** Baseline is intact and clean. No backend has been implemented. Safe to design Phase 0.

---

## PART 2 — Codebase re-inspection (diff vs prior audit)

Confirmed against actual code at baseline:

- **Apps (5):** `admin`, `connect`, `nexus`, `transport`, **`website`** (public site — now tracked in this baseline; earlier audits under-reported it).
- **Packages (24):** `auth`, `capacitor`, `config`, `database`, `types`, `ui`, `ui-admin`, `utils`, `notifications`, `teacher-session`, `module-{students,teachers,parents,attendance,notifications,timetable,exams,fees,complaints,analytics,admissions,transport,careers,certificates}`.
- **Module registry** (`packages/config/src/module-ids.ts`, `modules.ts`): 14 modules, plans `core|plus|max`.
- **Subscription domain** (`packages/utils/src/subscription/types.ts`): lifecycle `registered|approved|trial_active|trial_expiring|trial_expired|grace_period|read_only|active`; **no Core/Plus/Max tiering inside subscription** (plan tiering lives in config; commercial model is rate-per-student + duration). This is a real divergence from the older "plan tiers drive billing" mental model.
- **Persistence:** localStorage / sessionStorage / IndexedDB (Admin blob assets) / in-memory / cookie mirrors. No DB, no API client.
- **Notifications:** one shared foundation (`@lumenx/notifications`) with **17 categories**, template registry, `notify*` helpers, localStorage inboxes (phase7/phase8 + category inboxes). Delivery is local only — **no FCM**.
- **`@lumenx/database`:** entity **types only** (Student, Teacher, Parent, Class, Route, Vehicle, Driver, Institute + BaseEntity/TenantScoped). No ORM/driver.

**Differences from previous audit:** (1) website is a full 5th app in-baseline; (2) subscription model is rate/duration, not plan-tier billing; (3) `module-transport`/`module-students` are mock, while the **real** transport SoT lives in `@lumenx/utils` bridges. No other material contradictions found.

---

## PART 3 — Backend domain map

### A. Platform / Nexus
| Domain | Owner | Users | Persistent data | Workflows | Deps | Security | Priority |
|--------|-------|-------|-----------------|-----------|------|----------|----------|
| Institutes registry | Nexus | Operators | Institute records | create/list/detail | Identity | High | P1 |
| Registration & approval | Nexus↔Admin | Operators, Admin | Applications | submit→approve/reject | Institutes | High | P1 |
| Licensing / module entitlements | Nexus | Operators | Licenses, ceilings | grant/adjust | Institutes, Plans | High | P2 |
| Subscriptions / trials / renewals | Nexus↔Admin | Operators, Admin | Subscription, periods, renewals | trial→pay→verify→active | Institutes | High | P2 |
| Billing / quotes / adjustments / payments | Nexus | Operators | Quotes, payments, adjustments | quote→offline pay→verify | Subscriptions | **Critical** | P2 |
| Platform operators & access | Nexus | Root/Ops/Billing/Support/Analyst | Operators, roles | operator RBAC | Identity | **Critical** | P1 |
| Support center | Nexus | Operators, Admin | Threads, messages | open→respond→close | Institutes | Medium | P3 |
| Platform audit | Nexus | Operators | Audit events | append-only log | all | High | P2 |
| Policies / alerts | Nexus | Operators | Rules, alerts | evaluate/notify | metrics | Medium | P3 |
| Storage quotas | Nexus | Operators | Plan storage limits | set/enforce | Plans | Medium | P3 |
| Platform notification templates | Nexus | Operators | Template lifecycle | draft/publish/archive | Notifications | Medium | P2 |
| Certificate template catalog | Nexus | Operators | Templates | publish to institutes | Documents | Medium | P3 |
| Platform analytics / health-risk | Nexus | Operators | **Derived** | aggregate | all | Low | P4 |

### B. Institute / School
Tenancy, Identity/memberships, People (students/parents/teachers/staff/accounts), Academics (years/classes/sections/subjects/enrollment), Timetable, Attendance, Exams/Marks/Results, Homework/Diary, Fees, Transport ops, Leave, Events/Calendar, Announcements/Alerts, Messages, Complaints, Admissions, Careers, Documents/Certificates/ID cards, Activity/Sports/ECA. Owners: Admin + Connect + Transport. Priority P1–P4 per PART 18.

### C. Cross-domain services
Notifications (orchestration + outbox), Audit, Soft-delete/recycle, Offline outbox, Platform read-only/entitlement gating, Institute profile/branding, Storage/file handling, Search.

### D. Infrastructure
Auth/session, tenant resolution middleware, RBAC, config/feature flags, logging/observability, environments/secrets, FCM token registry.

---

## PART 4 — Nexus platform architecture

| Concern | Classification |
|---------|----------------|
| Platform users (aggregate counts) | **DERIVED** (from institute memberships) |
| Nexus operators + roles | **PERSISTENT** |
| Institutes | **PERSISTENT** |
| Institute registration | **PERSISTENT** |
| Registration approval decision | **PERSISTENT** (state on application) |
| Plans | **CONFIGURATION** (code registry today → optional reference table) |
| Modules | **CONFIGURATION** (`MODULE_IDS`) |
| Module entitlements (per institute) | **PERSISTENT** |
| Licenses | **PERSISTENT** |
| Subscriptions | **PERSISTENT** |
| Quotes | **DERIVED** (computed rate × students × duration; accepted snapshot already lives on `subscription_period`) |
| Trials | **PERSISTENT** (fields on subscription) |
| Renewals | **PERSISTENT** (immutable history) |
| Adjustments | **PERSISTENT** |
| Payments | **PERSISTENT** (provider-agnostic `payment` record) |
| Support threads/messages | **PERSISTENT** |
| Platform audit | **PERSISTENT** (append-only) |
| Policies / alert rules | **PERSISTENT** (config-like) |
| Renewal reminders / fired alerts | **DERIVED** from subscription dates + policy rules — persist ONLY if acknowledgement/dismissal state is required |
| Storage quotas | **CONFIGURATION** |
| Platform notifications | shared **Notifications** model |
| Certificate/templates | **PERSISTENT** (one polymorphic `template` table with `owner_scope ∈ {platform, institute}` + `type`) |
| Platform analytics | **DERIVED** (views) |
| Platform health/risk | **DERIVED** (views) |
| Platform read-only / write-gate state | **DERIVED** from subscription lifecycle + academic-year lock — NOT a table |

---

## PART 5 — Identity architecture (conceptual)

**Model:** `User` (auth principal) → `Profile` (person data) → `Membership` (User × Institute × Role(s)) → `Institute`. Roles/permissions attach to **membership**, not the user.

```
User (Supabase Auth uid)
 └── Profile (name, phone, email, avatar)      1:1
      └── Membership (institute_id, role_set, status)   1:N
           └── Institute
```

Role-specific extensions hang off membership/profile:
- **Student** record (academic identity) ↔ profile
- **Teacher** record (employment) ↔ profile, + **teacher assignment** (subject/class/dual-role)
- **Parent**–**Student** links = relationship rows (belong to **membership/relationship layer**, not profile)
- **Staff/Admin/Principal/VP/Coordinator/Accountant** = membership role variants
- **Driver** = membership role (transport scope); must gain an `institute_id` (currently missing on session)
- **Applicant / Job seeker / Recruiter / Institute-admin (admissions/careers)** = **FROZEN:** use the central `User`/`Profile` identity; represent applicant/candidate/recruiter/institute-admin **capabilities through role/membership**, NOT independent auth systems. The current 5+ parallel auth stores (`admin/auth-store`, `connect/portal-auth-store`, `student-auth-store`, `parent-auth-store`, `teacher-session`, careers/admissions bespoke accounts) collapse onto this one model.
- **Nexus operator** = **separate principal class** (platform role), NOT an institute membership

**FROZEN identity decisions:**
- **Canonical chain:** `Supabase Auth User → Profile → Membership → Institute → Role`. Roles/permissions attach to membership.
- **One user → multiple roles:** YES (dual-role teacher; admin who is also parent). Model as role-set on a membership + multiple memberships.
- **One user → multiple institutes:** YES (multi-campus staff, parent with children in different institutes). Model as multiple memberships.
- **Parent/student relationship:** relationship table keyed by institute (guardianship), not profile fields.
- **Dual-role teacher:** single teacher record + `teacher_assignment` rows typed `subject|activity|both`; portal mode from `@lumenx/teacher-session`.
- **Institute-scoped drivers:** driver is a membership role and **carries `institute_id`** (currently missing on session — must be added).
- **Nexus operators:** distinct table + platform RBAC; never resolved through institute membership.

---

## PART 6 — Multi-tenancy architecture

**Canonical tenant = `institute`, keyed by server-generated `institute_id` (UUID).** `branch` is **FROZEN as: no separate branch model in V1.** `TenantScoped.branchId` exists but is unused in features → keep the column/architecture extensible for a future branch model, but ship no branch tables in V1/V1.5. Legacy IDs (`LX-INST-*`, `ins-*`, demo scopes) are **migration/seed mappings only**, never runtime FKs.

**Observed ID formats (inconsistent):** `LX-INST-001` (Admin demo), `ins-*` (Connect/admissions catalog), Nexus-created ids, `lumenx_demo_profile` scopes (`multi_institute|single_institute|inter_college`), bound-institute key. Ad-hoc mappers exist (`admissionsInstituteIdForAdminInstitute`).

**Recommendation — ONE canonical strategy:**
- Every institute gets a **server-generated UUID** `institute_id` (primary key).
- Keep an optional human `code`/slug for display; never use it as FK.
- All tenant-scoped tables carry `institute_id UUID NOT NULL`.
- Legacy string IDs map to UUIDs during seed import only (mapping is a one-time seed concern, not a runtime concept).
- Drop the demo-profile scoping concept in production; scope by membership.

Cross-institute access = multiple memberships only. Nexus→institute is a platform relationship, not a membership.

---

## PART 7 — Database entity discovery (classified)

**Persistent business entities (candidate tables):** Institute; Profile; User (Supabase Auth-owned); Membership; Role; Student; Parent; Guardian-link; Teacher; TeacherAssignment; StaffAccount; AcademicYear; Class; Section; Subject; Enrollment; TimetableSlot; AttendanceConfigVersion; AttendanceRegister; AttendanceMark; Exam; ExamSubjectSchedule; MarkEntry; MarkPublication; Homework; DiarySubmission; FeePlan/Component; StudentFee; FeePayment; Receipt; Concession; Vehicle; Driver; Route; Stop; TransportEnrollment; Trip; BoardingEvent; Emergency; LeaveRequest; LeaveDecision; Event; Complaint; NotificationTemplate; Notification; NotificationRecipient; NotificationDeliveryAttempt; DeviceToken; AdmissionProgram; AdmissionOpening; AdmissionApplication; AdmissionDocument; AdmissionInquiry; CareerJob; CareerApplication; CandidateProfile; DocumentTemplate; GeneratedDocument; IssuedCertificate; IdCard; ActivitySection; ActivityTeam/Group; ActivityMembership; Achievement; PracticeSession; AuditEvent; RecycleItem; InstituteRegistration; PlatformOperator; PlatformRole; ModuleEntitlement; License; Subscription; SubscriptionPeriod; RenewalRecord; BillingAdjustment; PaymentRecord; RenewalReminder; SupportThread; SupportMessage; PolicyRule; PlatformAlert; StorageQuota.

**Derived data (views, not tables):** analytics series, attendance dashboards/reports/trends, platform-users counts, health-risk, network analytics, home "needs attention", fee dues rollups.

**Configuration:** MODULE_IDS/registry, plans, storage plan limits, attendance config (versioned → table), module toggles, institute settings, platform settings.

**Reference data:** subject option catalogs, status enums, template categories, visual themes.

**UI state:** dashboard widget layout, theme, hub `?view=` selection.

**Temporary:** OTP pending, app-unlock session, login-flow drafts, setup drafts, recent-exports cache.

**Mock/demo only:** static analytics arrays, deep-sports satellite stores (equipment/venues/medical/etc.), announcements seed, demo credentials.

---

## PART 8 — Table vs View vs Enum vs Config (rules)

| Entity class | Representation | Why |
|--------------|----------------|-----|
| Institute, People, Academics, Fees, Transport ops, Admissions, Careers, Documents, Nexus commercial | **TABLE** | Durable, queried, relational |
| Attendance marks | **TABLE** (normalized from `absentIds[]`/`leaveIds[]`) | Per-student status; never JSON blobs |
| Notifications (all categories) | **shared TABLES** (`notification`, `recipient`, `delivery_attempt`, `template`) | One model, category = enum column — NOT 17 tables |
| Analytics / dashboards / reports | **VIEW** (+ **MATERIALIZED VIEW** for heavy rollups) | Derived from base tables |
| Lifecycle/status/priority/category/role-kind | **ENUM** | Fixed vocabularies |
| Plans, module ids, storage limits, attendance triggers | **CONFIG** (table or seeded reference) | Slowly-changing config |
| Template blocks, ID-card fields, activity metadata, flexible payloads | **JSONB field** on owning table | Schema-flexible, not separately queried |
| Certificates PDFs, ID images, admission docs, avatars, logos | **STORAGE OBJECT** (+ metadata row) | Binary belongs in buckets |
| Home "attention", pending aggregates | **DERIVED / NO TABLE** | Computed on read |
| OTP/app-unlock/drafts | **NO DB** or short-lived (cache/Auth) | Transient |

---

## PART 9 — Production table estimate (finalized after Phase 0.5 review)

> This is the **complete long-term product schema (~95–105 tables)**, NOT the launch requirement. The launch requirement is **V1 ≈ 34 tables** (see "V1 Database Scope"). Phase column: which phase the table lands in.

| Domain | Tables | Candidate tables | Phase | Notes |
|--------|-------:|------------------|-------|-------|
| Identity | 3 (+1 later) | user_profile, membership, role | V1 | `role_permission` promoted only when custom roles ship (V1.5); role = enum+config in V1 |
| Tenancy | 2 | institute, institute_settings | V1 | branch column kept, no branch tables |
| People | 5 | student, parent, guardian_link, teacher, staff_account | V1 | |
| Academics | 6 | academic_year, class, section, subject, enrollment, teacher_assignment | V1 | |
| Timetable | 2 | timetable_slot, timetable_publication | V1/V1.5 | publication = V1.5 |
| Attendance | 3 | attendance_config_version, attendance_register, attendance_mark | V1 | `attendance_pending` is a **VIEW**, not a table |
| Staff attendance | 1 | staff_attendance | V1.5 | **ADDED** (teacher/staff attendance distinct from student) |
| Exams | 2 | exam, exam_subject_schedule | V1.5 | |
| Marks | 3 | mark_entry, mark_publication, grade_scheme | V1.5 | grade_scheme = config table |
| Homework/Diary | 2 | homework, diary_submission | V1.5 | |
| Fees | 5 | fee_plan, fee_component, student_fee, fee_payment, concession | V1.5 | `receipt` = generated document (storage + view), not a base table |
| Transport | 9 | vehicle, driver, route, stop, transport_enrollment, trip, boarding_event, emergency, transport_settings | V1.5 | **driver carries institute_id** |
| Leave | 2 | leave_request, leave_decision | V1.5 | |
| Events | 1 | event | V1.5 | calendar = view over event |
| Announcements | 1 | announcement | V1.5 | |
| Messages | 2 | message_thread, message | V2 | **NOT V1** — deferred; notifications cover V1 comms |
| Notifications | 5 | notification_template, notification, notification_recipient, notification_delivery_attempt, device_token | V1 | ONE shared model; read/unread per recipient; category = column |
| Admissions | 5 | admission_program, admission_opening, admission_application, admission_document, admission_inquiry | V2 | `saved` = UI-only, not a table |
| Careers | 6 | career_job, career_application, candidate_profile, career_inquiry, talent_pool_entry, user_saved_item | V2 | personalization (follow/save) folded into one `user_saved_item` |
| Documents + Certificates + ID cards | 3 | template, generated_document, issued_certificate | V1.5/V2 | **MERGED:** one polymorphic `template` (owner_scope+type); `id_card` collapsed into `generated_document` |
| Activity/Sports/ECA | 14–20 | activity_section, activity_team, activity_membership, achievement, practice_session, match_result, tournament, coach_note, sports_attendance, team_selection, equipment, venue, medical_fitness, activity_calendar_event (+satellites) | V2 | **BUDGET 14–20** — deep model deferred to V2; do NOT build now |
| Assets | 1 | stored_asset | V1.5 | **ADDED** — generic storage-object metadata (replaces IndexedDB blob-asset store) |
| Governance | 1 | recycle_item | V1.5 | `platform_readonly_state` is **DERIVED**, not a table |
| Audit | 1 | audit_event | V1 | shared institute+platform w/ scope column |
| Nexus core | 2 | platform_operator, platform_role | V1 | |
| Registration | 1 | institute_registration | V1 | |
| Licensing | 2 | license, module_entitlement | V1 | |
| Subscriptions | 2 | subscription, subscription_period | V1 | `renewal_reminder` = DERIVED unless ack-state needed |
| Billing | 3 | renewal_record, billing_adjustment, payment | V1.5 | provider-agnostic `payment`; `quote` = DERIVED |
| Support | 2 | support_thread, support_message | V1.5 | |
| Policies/Alerts | 1 | policy_rule | V1.5 | fired `platform_alert` = DERIVED unless ack-state needed |
| Storage quotas | 1 | storage_quota | V1.5 | config-like |

**TOTAL LONG-TERM PRODUCTION TABLES ≈ 95–105** (complete product, all phases; range driven mainly by the Activity/Sports 14–20 budget and whether messaging/ack-state tables are built).

**Phase split (see dedicated scope sections):** **V1 ≈ 34 · V1.5 ≈ 30 · V2 ≈ 35.**

**Removed / merged vs the original ~92 (net −7):** `platform_readonly_state`→derived; `attendance_pending`→view; `quote`→derived; `renewal_reminder`/`platform_alert`→derived (unless ack-state); `document_template`+`certificate_template`→one `template`; `id_card`→`generated_document`; `role_permission`→deferred to V1.5.

**Added vs the original (net +new):** `staff_attendance`, `stored_asset`, `grade_scheme`, `transport_settings`, `career_inquiry`/`talent_pool_entry`/`user_saved_item`, and the expanded Activity/Sports budget (+~10–15).

Secondary estimates:
- **Views:** ~20 (analytics, attendance reports/dashboards/trends, **attendance_pending**, fee dues, **quote**, **platform_readonly_state**, platform-users, health-risk, network analytics, calendar, receipt).
- **Materialized views:** ~4 (attendance monthly rollup, fee collection rollup, platform network metrics, institute KPI snapshot).
- **Enums:** ~22 (statuses, priorities, notification_category, role_kind, lifecycle, payment_status/method, application_status, attendance_status, template_type, owner_scope, etc.).
- **Functions / RPCs:** ~18 (submit_attendance, approve/reject/return/publish marks, approve_registration, publish_fees, record_offline_payment→verify, issue_certificate/generate_document, convert_admission_to_student, convert_career_to_teacher, lock_transport_route, soft_delete/restore, export_report, emit_notification/flush_outbox).
- **Storage buckets:** ~6 (institute-branding, student-media/id, certificates, admission-docs, career-docs, generated-documents).
- **Storage object categories:** logos, avatars, ID-card images, certificate PDFs, admission attachments, resumes, generated docs.

---

## PART 10 — Domain-by-domain (implemented status)

All domains 1–29 are **implemented in frontend (demo persistence)** and mapped above, except:
- **Branch/multi-campus:** NOT FOUND as features (column only).
- **Hostel, Payroll, Inventory, Library (module), Biometric, Visitor-management ops, Gate-pass ops, Alumni, Surveys, Counseling, Discipline, Health records:** **NOT FOUND** as modules (only template categories / label strings / platform "health-risk" naming).
- **Real payment gateway:** NOT FOUND (offline pay + verify only).
Table counts per domain are in PART 9.

---

## PART 11 — Relationship graph (corrected to code)

```
Institute
 └── Membership ──> Profile ──> {Student | Teacher | Parent | Staff}
                                   │
Parent ──< GuardianLink >── Student

AcademicYear ─< Class ─< Section ─< Enrollment >─ Student
Subject ─< TeacherAssignment >─ Teacher ─(class/section)─ TimetableSlot

AttendanceConfigVersion ─(section)─ AttendanceRegister ─< AttendanceMark >─ Student
Exam ─< ExamSubjectSchedule ; Exam ─< MarkEntry >─ Student ; MarkEntry ─ MarkPublication
Fees: FeePlan ─< FeeComponent ; StudentFee >─ Student ; StudentFee ─< FeePayment ─ Receipt ; Concession >─ Student

Transport: Vehicle ─ Route ─< Stop ; TransportEnrollment >─ Student ; Route ─< Trip ─< BoardingEvent >─ Student ; Trip ─ Emergency ; Driver ─ Route
Communication: Event/Trigger ─> Notification ─< NotificationRecipient >─ (Profile) ; Notification ─< DeliveryAttempt ─ DeviceToken
Admissions: AdmissionApplication ─ Review/Decision ─> Student (convert) ; Application ─< AdmissionDocument
Careers: CareerJob ─< CareerApplication >─ CandidateProfile ─ Hiring ─> Teacher (convert)
Nexus: Institute ─ (Plan/config) ─ Subscription ─< SubscriptionPeriod ; Institute ─ License ─< ModuleEntitlement ; Subscription ─< RenewalRecord/Payment/Adjustment
```

Corrections vs template: Attendance keys off **section+config version** (not student directly); Marks has explicit **publication** stage; Notifications use **shared recipient/delivery** tables; Driver session must carry institute.

---

## PART 12 — Notification architecture

**Single shared model** (category is a column, never per-category tables):
- `notification_template` (id, category enum, audience, title, body, priority, deep_link, status draft/published/archived, version) — matches existing registry; platform-managed via Nexus.
- `notification` (institute_id, template_id, category, priority, payload JSONB, deep_link, created_at, dedupe_key).
- `notification_recipient` (notification_id, profile_id/audience, read_at) — read/unread **required** (UI uses it).
- `notification_delivery_attempt` (notification_id, channel, device_token_id, status, error, attempted_at) — outbox/audit.
- `device_token` (profile_id, app, platform, token, valid, last_seen).

**Flow:** domain action → Hono orchestration service → render from `notification_template` → persist `notification` + `recipient` rows → enqueue outbox → **Firebase FCM** send → record `delivery_attempt`. In-app inbox = query recipients. Realtime (V1 scope) for live inbox. Preserve existing template IDs + `notify*` names as the API contract.

> **FROZEN:** exactly ONE shared notification model across all 17 categories — `notification_template`, `notification`, `notification_recipient`, `notification_delivery_attempt`, `device_token`. **Read/unread is persisted per recipient.** **No domain-specific notification tables** (no attendance_notification / fee_notification / etc.). The multiple current inbox stores (`admin/notification-center`, `connect/student|parent/notification-store`, `connect/alert-store`, per-sport notification modules) all collapse into this recipient-based inbox.

---

## PART 13 — Firebase architecture

| Service | Placement |
|---------|-----------|
| **FCM send** | Backend only (Firebase Admin) |
| **Analytics** | Frontend client SDK (product telemetry, not SoT KPIs) |
| **Crashlytics** | Native/app (Capacitor Android) + web error client |
| **Firebase Admin SDK** | Backend only — never in frontend |

**Device token model:** `device_token(profile_id, app ∈ {connect,admin,transport,nexus}, platform ∈ {android,ios,web}, token, valid, created_at, last_seen)`. Ownership = profile. Lifecycle: register on login/permission-grant → refresh on FCM rotation → **invalidate on logout** → mark `valid=false` on FCM "unregistered"/failure. One profile → many tokens.

---

## PART 14 — Supabase architecture

| Capability | Responsibility |
|------------|----------------|
| Auth | Identities, sessions, OTP/password; backend validates + resolves membership |
| PostgreSQL | System of record |
| Storage | Binary buckets + signed URLs |
| RLS | **Defense in depth** (every tenant table keyed by institute membership) |
| Realtime | Optional (inbox, transport live) — gated |
| Edge Functions | Only if a workflow must run at DB edge; default is Hono |

**Authoritative authorization = Hono API.** Frontend does **not** get broad PostgREST access; it calls Hono, which uses a server Supabase client. RLS is the second wall, not the primary gate.

---

## PART 15 — API architecture (Hono, conceptual)

**Institute namespace:** `/auth`, `/institutes`, `/profiles`, `/memberships`, `/students`, `/parents`, `/teachers`, `/classes`, `/timetable`, `/attendance`, `/exams`, `/marks`, `/homework`, `/fees`, `/transport`, `/leave`, `/events`, `/announcements`, `/messages`, `/complaints`, `/notifications`, `/admissions`, `/careers`, `/documents`, `/certificates`, `/activity`.
**Platform namespace (Nexus):** `/platform/operators`, `/platform/institutes`, `/platform/registrations`, `/platform/licenses`, `/platform/subscriptions`, `/platform/billing`, `/platform/support`, `/platform/audit`, `/platform/policies`, `/platform/templates`, `/platform/analytics`.

Cross-cutting:
- **Versioning:** `/api/v1/...`.
- **Middleware order:** request-id → auth (verify session) → tenant resolve (institute from membership) → RBAC → validation → handler.
- **Validation:** schema (e.g. zod) per route; typed DTOs shared via a contracts package.
- **Errors:** single JSON envelope `{ error: { code, message, details, requestId } }`.
- **Pagination:** cursor-based default; `limit`+`cursor`.
- **Filtering/sorting:** allow-listed query params per resource.
- **Idempotency:** `Idempotency-Key` on payments, registration approve, mark publish, notification emit, conversions.

---

## PART 16 — Security architecture (must be server-side)

| Item | Severity |
|------|----------|
| Password/OTP verification, session issuance/validation | **CRITICAL** |
| Membership resolution + tenant isolation (institute_id) | **CRITICAL** |
| RBAC on every mutation | **CRITICAL** |
| Nexus operator authorization (platform plane) | **CRITICAL** |
| Billing / payment verification / subscription locks | **CRITICAL** |
| Registration approval | **HIGH** |
| Mark approve/publish | **HIGH** |
| Document/certificate issuance | **HIGH** |
| Privileged notification sending (broadcast) | **HIGH** |
| Fee publish, transport route lock | **MEDIUM** |
| Read filtering (per-role field visibility) | **MEDIUM** |
| Rate limiting, audit logging | **MEDIUM** |
| Analytics telemetry | **LOW** |

Current client-side guards (`roles-access`, `canAdminMutate`, portal guards, Nexus operator picker) become **UX hints only**; authority moves to API.

---

## PART 17 — Mock data migration strategy

| Domain | Action | Mapping notes |
|--------|--------|---------------|
| Students/Parents/Teachers/Classes | **TRANSFORM** | LS directories → normalized people + memberships; assign UUIDs; resolve demo profile scope → institute_id |
| Attendance | **TRANSFORM** | registers/marks → `attendance_register`+`attendance_mark`; normalize section key `10::B` vs `Grade 10::B` |
| Fees | **TRANSFORM** | `lumenx.fees.v1` → fee_plan/component/student_fee/payment/receipt |
| Transport | **TRANSFORM** | utils ops bridges (SoT) → vehicle/route/stop/enrollment/trip/boarding/emergency; add institute_id to driver |
| Exams/Marks | **TRANSFORM** | marks-entries key → mark_entry + publication |
| Admissions/Careers | **TRANSFORM** | `ues_*` → applications/documents/jobs/candidates; **central User/Profile identity** (no separate auth) |
| Nexus (institutes/subs/licenses/registrations) | **TRANSFORM** | platform LS → platform tables; map legacy institute IDs → UUID |
| Notification templates | **SEED** | template registry (17 categories) seeded as reference |
| Plans, module definitions, reference/config | **SEED** | config tables |
| Local notification inboxes | **DISCARD** | regenerate from recipient rows |
| OTP/PIN demo sessions, temporary auth state | **DISCARD** | replaced by Supabase Auth |
| Static analytics arrays | **DISCARD** | replaced by views |
| Analytics, attendance pending, platform read-only state | **DERIVE** | computed as views, not stored |
| Quotes (unless historical snapshot) | **DERIVE** | accepted snapshot lives on `subscription_period` |
| Deep sports satellites, announcements seed | **UI ONLY / DISCARD** | not primary |

**Rule:** never copy LS blob shapes verbatim; normalize first. localStorage keys are NOT tables.

---

## PART 18 — Migration order (dependency-adjusted)

1. **Foundation** — backend scaffold, shared contracts/DTOs, Supabase project, env wiring.
2. **Identity** — Supabase Auth + user_profile.
3. **Tenancy** — institute + membership + role (+ RLS baseline).
4. **Nexus security** — platform_operator + platform RBAC (must precede commercial ops).
5. **Attendance** — first institute vertical (best-mapped SoT).
6. **People/Academics** — students/parents/teachers/classes/sections/subjects/enrollment.
7. **Fees.**
8. **Transport.**
9. **Notifications + FCM** (device tokens, outbox).
10. **Exams/Marks.**
11. **Admissions.**
12. **Careers.**
13. **Documents/Certificates/ID cards.**
14. **Activity/Sports.**
15. **Nexus commercial** — licensing/subscriptions/billing/support.
16. **Production hardening** — audit, rate limits, observability, offline outbox wiring.

---

## PART 19 — Backend project structure (recommended, same monorepo)

```
backend/
├── api/            # Hono app entry, route registration, versioning
├── modules/        # domain modules (attendance, fees, ...), one folder each
├── middleware/     # auth, tenant, rbac, request-id, error
├── services/       # orchestration (notifications, billing, conversions)
├── integrations/   # supabase (server client), firebase-admin, storage
├── validation/     # schemas
├── config/         # env loading, feature flags
├── errors/         # error types + envelope
├── logging/        # structured logger, request context
└── tests/          # unit/integration/contract
packages/
└── api-contracts/  # shared DTOs + types (frontend + backend import)
```

Placement: **Supabase server client** and **Firebase Admin** live only in `backend/integrations` (never in `apps/*` or shared UI packages). Shared **DTO/contract types** in a frontend-safe `packages/api-contracts` (types only, no secrets). Reuse `@lumenx/database` entity types as DTO seeds.

---

## PART 20 — Testing strategy (minimum before production)

- **Unit:** domain services (fee calc, attendance rollups, subscription lifecycle, notification render).
- **Integration:** API + Supabase (happy paths per domain).
- **Authorization tests:** every mutation × role.
- **Tenant-isolation tests:** cross-institute access must fail (RLS + API). **Mandatory gate.**
- **Notification tests:** emit → persist → outbox → (mock) FCM → delivery attempt.
- **Database/migration tests:** migrations apply/rollback; seed integrity.
- **Contract tests:** DTOs vs frontend consumers.
Minimum for prod: identity, tenancy isolation, RBAC, attendance vertical, notifications, billing.

---

## PART 21 — Observability

- **Structured logging** (JSON) with **request IDs** propagated through middleware.
- **Server error tracking** (e.g. Sentry-class) + **Crashlytics** for native/client.
- **Audit events** table for privileged actions (approvals, billing, issuance, deletes).
- **Metrics:** request latency, error rate, notification delivery success/failure, outbox depth.
- **Notification delivery failures** recorded in `delivery_attempt` + alerting.

---

## PART 22 — Production environments

| Env | Supabase | Firebase | Notes |
|-----|----------|----------|-------|
| Development | dev project | dev project | seeded demo data |
| Staging | staging project | staging project | prod-like, sanitized |
| Production | prod project | prod project | least privilege |

- **Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (**backend only**), `FIREBASE_ADMIN_CREDENTIALS` (**backend only**), `FCM_*`, API base URLs.
- **Secrets:** never committed; injected via platform secret manager. Frontend gets only public anon/config.
- Deployment boundaries: frontend (Cloudflare) ↔ Hono API (separate deploy) ↔ Supabase/Firebase managed.

---

## PART 23 — Final backend blueprint

```
Frontend (admin, connect, transport, nexus, website)
        │  HTTPS (public config only)
        ▼
Hono API  ── middleware: request-id → auth → tenant → rbac → validate
        │
        ▼
Domain services ── orchestration (notifications, billing, conversions)
        │
        ├──> Supabase (Auth · Postgres · Storage · RLS · Realtime)
        └──> Firebase Admin (FCM)     Firebase client (Analytics/Crashlytics)

Separation:
  Nexus Platform plane   → /platform/* , platform_* tables, operator RBAC
  Institute Operations   → /* , institute-scoped tables, membership RBAC
  Infrastructure         → auth, tenant, notifications, audit, storage
```

---

## PART 24 — Final numbers

- **PostgreSQL tables (complete long-term product):** **≈ 95–105** — NOT the launch requirement
  - **V1 (launch):** ≈ 34
  - **V1.5 (soon after):** ≈ 30 additional
  - **V2 (later):** ≈ 35 additional (incl. Activity/Sports 14–20)
- **Views:** ≈ 20
- **Materialized views:** ≈ 4
- **Enums:** ≈ 22
- **Functions / RPCs:** ≈ 18
- **Storage buckets:** ≈ 6
- **Major backend domains:** 30 (13 platform/cross + 17 institute)
- **API domain groups:** 26 institute + 11 platform = **37**
- **Firebase services:** 3 (FCM, Analytics, Crashlytics)
- **Nexus platform domains:** 13
- **Institute domains:** 17
- **Multi-branch tables:** 0 in V1 (architecture kept extensible; FROZEN — no branch model until a later phase)
- **Payment tables:** provider-agnostic `payment` (offline/manual first; no provider lock-in)

---

## PART 25 — Final risk register

| Area | Severity | Risk |
|------|----------|------|
| Security | **CRITICAL** | All current auth/RBAC is client-side & forgeable; Nexus has no real auth |
| Tenancy | **CRITICAL** | Inconsistent institute IDs (`LX-INST-*` / `ins-*` / demo scopes); isolation not enforced |
| Identity | **HIGH** | Connect `u_demo` non-stable ids; duplicate credential stores; parent/student links ad-hoc |
| Data migration | **HIGH** | LS blob shapes ≠ normalized model; attendance section-key divergence |
| Notifications | **HIGH** | Multiple ad-hoc inbox systems; must consolidate to one shared model; no FCM yet |
| Nexus | **HIGH** | Platform vs institute data not physically separated today |
| Performance | **MEDIUM** | Analytics as static arrays → must become views/materialized views |
| Architecture | **MEDIUM** | Module registry stubs vs real Admin stores (dual models); offline enqueue unused |
| Frontend/backend coupling | **MEDIUM** | Admin lacks repository façades (direct stores) → needs adapters before API swap |
| Governance | **LOW** | Soft-delete/read-only partially wired |

---

## Appendix — Assumptions & resolved decisions

- **RESOLVED (see "Architecture Decisions Frozen Before SQL"):** multi-branch, payments, certificate template ownership, threaded messaging, realtime scope, admissions/careers identity — all previously open items are now frozen.
- **FOUND BUT UNUSED:** `TenantScoped.branchId` (kept for future extensibility); offline `enqueueOfflineOp` (no call sites); deep sports satellite repos (V2).
- **MOCK/DEMO ONLY:** analytics series, demo credentials/OTP/PIN, announcements seed.
- **PLANNED / DOCUMENTATION ONLY:** Supabase & Firebase (no code/deps present).
- Remaining note: whether the public `website` needs any authenticated API is still open but out of scope for the DB schema.

---

## ARCHITECTURE DECISIONS FROZEN BEFORE SQL

These are locked. SQL/migrations in Phase 1 must conform to them.

1. **Canonical tenancy:** server-generated **UUID `institute_id`**. Legacy `LX-INST-*` / `ins-*` / demo scopes are **migration/seed mappings only**, never runtime FKs. Every tenant table carries `institute_id UUID NOT NULL`.
2. **Identity chain:** **Supabase Auth User → Profile → Membership → Institute → Role.** Supports multiple memberships, multiple roles per membership, dual-role teachers (`teacher_assignment` typed `subject|activity|both`), and **institute-scoped drivers (driver carries `institute_id`)**. One unified identity replaces the 5+ parallel auth stores.
3. **Nexus operators = platform principals**, never institute memberships. Platform-owned data (operators, registrations, subscriptions, licenses, module entitlements, billing, support, policies, quotas, platform audit) is **API-gated**; institute apps reach it only through the API, never directly.
4. **Notifications:** exactly ONE shared model (`notification_template`, `notification`, `notification_recipient`, `notification_delivery_attempt`, `device_token`). Read/unread persisted per recipient. Category is a column. **No domain-specific notification tables.**
5. **Templates:** one polymorphic `template` model with **`type`** and **`owner_scope ∈ {platform, institute}`** — merges `document_template` + `certificate_template` and supports both platform-catalog and institute-owned templates.
6. **`id_card`** collapses into **`generated_document`** where appropriate.
7. **Derived, NOT tables:** `platform_readonly_state`, `attendance_pending`, `quote` (accepted snapshot lives on `subscription_period`). `renewal_reminder` / fired `platform_alert` are **derived unless acknowledgement/dismissal state must be persisted**.
8. **Added tables:** `staff_attendance`, `stored_asset` (generic storage-object metadata), plus `grade_scheme`, `transport_settings`, and careers personalization consolidated to `user_saved_item`.
9. **Branch / multi-campus:** **no separate branch model in V1**; keep architecture extensible for a future branch model.
10. **Payments:** manual/offline first; **provider-agnostic payment abstraction** — schema not locked to Razorpay or any provider.
11. **Certificate template ownership:** support **both** platform catalog and institute-owned via `owner_scope`.
12. **Threaded messaging:** **not a V1 requirement** — V1 uses notifications/announcements; messaging can be added later without breaking the notification model.
13. **Realtime scope (V1):** notification inbox where useful + transport live operational events where required; everything else is normal request/response initially.
14. **Admissions/Careers identity:** central User/Profile; applicant/candidate/recruiter/institute-admin expressed via role/membership, **not** independent auth systems.

---

## V1 DATABASE SCOPE (≈ 34 tables — required to launch)

**Identity & tenancy (5):** institute, institute_settings, user_profile, membership, role*(enum/config).
**People (5):** student, parent, guardian_link, teacher, staff_account.
**Academics & timetable (7):** academic_year, class, section, subject, enrollment, teacher_assignment, timetable_slot.
**Attendance (3):** attendance_config_version, attendance_register, attendance_mark. *(attendance_pending = view.)*
**Notifications (5):** notification_template, notification, notification_recipient, notification_delivery_attempt, device_token.
**Cross-cutting (1):** audit_event.
**Nexus security & commercial core (8):** platform_operator, platform_role, institute_registration, license, module_entitlement, subscription, subscription_period. *(role catalog config counted under identity.)*

**≈ 34 tables.** This is the launch surface: identity, tenancy, people, academics, attendance vertical, notifications/FCM, audit, and the Nexus security + subscription core needed to gate access.

---

## V1.5 DATABASE SCOPE (≈ 30 additional tables — required soon after launch)

**Fees (5):** fee_plan, fee_component, student_fee, fee_payment, concession. *(receipt = generated doc/view.)*
**Transport (9):** vehicle, driver (institute-scoped), route, stop, transport_enrollment, trip, boarding_event, emergency, transport_settings.
**Exams & marks (5):** exam, exam_subject_schedule, mark_entry, mark_publication, grade_scheme.
**Homework/diary (2):** homework, diary_submission.
**Leave (2):** leave_request, leave_decision.
**Communications (2):** event, announcement.
**Staff & assets & governance (4):** staff_attendance, stored_asset, recycle_item, timetable_publication.
**Nexus commercial + support (5):** renewal_record, billing_adjustment, payment (provider-agnostic), support_thread, support_message, policy_rule, storage_quota, role_permission — *phased in as needed*.

**≈ 30 additional tables.**

---

## V2 DATABASE SCOPE (≈ 35 additional tables — later)

**Admissions (5):** admission_program, admission_opening, admission_application, admission_document, admission_inquiry.
**Careers (6):** career_job, career_application, candidate_profile, career_inquiry, talent_pool_entry, user_saved_item.
**Documents/certificates (3):** template (polymorphic), generated_document (incl. id_card), issued_certificate.
**Messaging (2):** message_thread, message.
**Activity / Sports / ECA (14–20):** activity_section, activity_team, activity_membership, achievement, practice_session, match_result, tournament, coach_note, sports_attendance, team_selection, equipment, venue, medical_fitness, activity_calendar_event, + remaining satellites. **Budget 14–20; do not build now.**

**≈ 35 additional tables** (range driven by the Activity/Sports budget).

---

**END OF PHASE 0 BLUEPRINT (finalized) — STOP. Await approval before Phase 1.**
