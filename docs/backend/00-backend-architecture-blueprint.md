# LumenX — Backend Architecture & Database Blueprint (Phase 0)

**Mode:** READ-ONLY / NO IMPLEMENTATION
**Status:** Draft for architecture review — must be approved before Phase 1
**Frontend baseline:** commit `edc8ac869d1aed7c34234e061e8d6ac1092d9352` · tag `frontend-v1.0.0` · branch `main`
**Target stack:** Frontend → HTTPS → Hono (TypeScript) API → domain services → Supabase (Auth/Postgres/Storage/RLS/Realtime) + Firebase (FCM/Analytics/Crashlytics)

> Architectural rule enforced throughout: **frontend never holds service-role/Admin SDK/DB business logic/server secrets**. All privileged operations pass through the Hono API. Nexus is the **platform control plane**, logically separated from institute/school operational data.

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
| Quotes | **PERSISTENT** (or derived+snapshotted) |
| Trials | **PERSISTENT** (fields on subscription) |
| Renewals | **PERSISTENT** (immutable history) |
| Adjustments | **PERSISTENT** |
| Payments | **PERSISTENT** |
| Support threads/messages | **PERSISTENT** |
| Platform audit | **PERSISTENT** (append-only) |
| Policies / alert rules | **PERSISTENT** (config-like) |
| Alerts (fired) | **PERSISTENT** or DERIVED |
| Storage quotas | **CONFIGURATION** |
| Platform notifications | shared **Notifications** model |
| Certificate/templates (platform-owned) | **PERSISTENT** (catalog) |
| Platform analytics | **DERIVED** (views) |
| Platform health/risk | **DERIVED** (views) |

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
- **Applicant / Job seeker / Recruiter / Institute-admin (admissions)** = separate portal accounts today; unify under `User` with membership/role of type `applicant|candidate|recruiter`
- **Nexus operator** = **separate principal class** (platform role), NOT an institute membership

Decisions:
- **One user → multiple roles:** YES (dual-role teacher; admin who is also parent). Model as role-set on a membership + multiple memberships.
- **One user → multiple institutes:** YES (multi-campus staff, parent with children in different institutes). Model as multiple memberships.
- **Parent/student relationship:** relationship table keyed by institute (guardianship), not profile fields.
- **Dual-role teacher:** single teacher record + `teacher_assignment` rows typed `subject|activity|both`; portal mode from `@lumenx/teacher-session`.
- **Nexus operators:** distinct table + platform RBAC; never resolved through institute membership.

---

## PART 6 — Multi-tenancy architecture

**Canonical tenant = `institute`.** `branch` is **OPTIONAL** (`TenantScoped.branchId` exists but is unused in features) → keep column, defer branch tables. **UNKNOWN — REQUIRES DESIGN DECISION** whether multi-branch ships in v1 (recommend: no).

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

## PART 9 — Production table estimate (derived)

| Domain | Tables | Candidate tables | Notes |
|--------|-------:|------------------|-------|
| Identity | 4 | user_profile, membership, role, role_permission | User = Supabase Auth |
| Tenancy | 2 | institute, institute_settings | branch deferred |
| People | 5 | student, parent, guardian_link, teacher, staff_account | teacher_assignment under Academics |
| Academics | 6 | academic_year, class, section, subject, enrollment, teacher_assignment | |
| Timetable | 2 | timetable_slot, timetable_publication | |
| Attendance | 4 | attendance_config_version, attendance_register, attendance_mark, attendance_pending | |
| Exams | 2 | exam, exam_subject_schedule | |
| Marks | 2 | mark_entry, mark_publication | |
| Homework/Diary | 2 | homework, diary_submission | |
| Fees | 6 | fee_plan, fee_component, student_fee, fee_payment, receipt, concession | |
| Transport | 8 | vehicle, driver, route, stop, transport_enrollment, trip, boarding_event, emergency | driver gains institute_id |
| Leave | 2 | leave_request, leave_decision | |
| Events | 1 | event | calendar = view over event |
| Announcements | 1 | announcement | |
| Messages | 2 | message_thread, message | |
| Notifications | 5 | notification_template, notification, notification_recipient, delivery_attempt, device_token | shared across all categories |
| Admissions | 5 | admission_program, admission_opening, admission_application, admission_document, admission_inquiry | |
| Careers | 3 | career_job, career_application, candidate_profile | |
| Documents | 2 | document_template, generated_document | |
| Certificates | 2 | certificate_template, issued_certificate | template may be platform-owned |
| ID Cards | 1 | id_card | |
| Activity/Sports/ECA | 5 | activity_section, activity_team, activity_membership, achievement, practice_session | satellite sports = later/JSONB |
| Governance (soft-delete/read-only) | 2 | recycle_item, platform_readonly_state | |
| Audit | 1 | audit_event | shared institute+platform w/ scope column |
| Nexus core | 2 | platform_operator, platform_role | |
| Registration | 1 | institute_registration | |
| Licensing | 2 | license, module_entitlement | |
| Subscriptions | 3 | subscription, subscription_period, renewal_reminder | |
| Billing | 4 | renewal_record, billing_adjustment, payment_record, quote | |
| Support | 2 | support_thread, support_message | |
| Policies/Alerts | 2 | policy_rule, platform_alert | |
| Storage quotas | 1 | storage_quota | |

**TOTAL PRODUCTION TABLES ≈ 92** (core, normalized; excludes deferred branch/satellite-sports).

Secondary estimates:
- **Views:** ~18 (analytics, attendance reports/dashboards/trends, fee dues, platform-users, health-risk, network analytics, calendar).
- **Materialized views:** ~4 (attendance monthly rollup, fee collection rollup, platform network metrics, institute KPI snapshot).
- **Enums:** ~22 (statuses, priorities, notification_category, role_kind, lifecycle, payment_status, application_status, attendance_status, etc.).
- **Functions / RPCs:** ~18 (submit_attendance, approve/reject/return/publish marks, approve_registration, publish_fees, record_offline_payment→verify, issue_certificate, convert_admission_to_student, convert_career_to_teacher, lock_transport_route, soft_delete/restore, export_report, emit_notification/flush_outbox).
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

**Flow:** domain action → Hono orchestration service → render from `notification_template` → persist `notification` + `recipient` rows → enqueue outbox → **Firebase FCM** send → record `delivery_attempt`. In-app inbox = query recipients. Realtime (optional) for live inbox. Preserve existing template IDs + `notify*` names as the API contract.

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
| Notifications | **DERIVED/DISCARD** | LS inboxes not migrated; regenerate from events; keep template registry as seed |
| Admissions/Careers | **TRANSFORM** | `ues_*` → applications/documents/jobs/candidates; unify identity |
| Nexus (institutes/subs/licenses/registrations) | **TRANSFORM** | platform LS → platform tables; map legacy institute IDs → UUID |
| Analytics arrays | **DISCARD** | replaced by views |
| Deep sports satellites, announcements seed | **UI ONLY / DISCARD** | not primary |
| Demo credentials/OTP/PIN | **DISCARD** | replaced by Supabase Auth |
| Template categories/visual themes, plans, module ids | **KEEP AS SEED** (reference/config) | |

**Rule:** never copy LS blob shapes verbatim; normalize first.

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

- **PostgreSQL tables:** **≈ 92** (normalized core; excludes deferred branch + satellite sports)
- **Views:** ≈ 18
- **Materialized views:** ≈ 4
- **Enums:** ≈ 22
- **Functions / RPCs:** ≈ 18
- **Storage buckets:** ≈ 6
- **Major backend domains:** 30 (13 platform/cross + 17 institute)
- **API domain groups:** 26 institute + 11 platform = **37**
- **Firebase services:** 3 (FCM, Analytics, Crashlytics)
- **Nexus platform domains:** 13
- **Institute domains:** 17
- **Multi-branch tables:** UNKNOWN — REQUIRES DESIGN DECISION
- **Real payment-gateway tables:** UNKNOWN — REQUIRES DESIGN DECISION (offline-only today)

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

## Appendix — Assumptions & open decisions

- **UNKNOWN — REQUIRES DESIGN DECISION:** multi-branch support; real payment gateway; Realtime scope; whether certificate templates are platform-owned or institute-owned; whether website needs any authenticated API.
- **FOUND BUT UNUSED:** `TenantScoped.branchId`; offline `enqueueOfflineOp` (no call sites); deep sports satellite repos.
- **MOCK/DEMO ONLY:** analytics series, demo credentials/OTP/PIN, announcements seed.
- **PLANNED / DOCUMENTATION ONLY:** Supabase & Firebase (no code/deps present).

**END OF PHASE 0 BLUEPRINT — STOP. Await approval before Phase 1.**
