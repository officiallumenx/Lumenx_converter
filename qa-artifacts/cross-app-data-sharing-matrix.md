# Cross-App Data Sharing Matrix — Admin · Connect (Parent/Student) · Teacher

**Scope:** Local API integration (Vitest + mock Supabase) **and** hosted staging multi-role browser E2E where gated.  
**Teacher app:** Implemented inside Connect (`apps/connect/src/teacher-portal/`), not a separate app.  
**Business data path:** Clients → Hono `/api/v1` → domain services (**service_role**) → Supabase tables.  
**Sync default:** TanStack Query invalidation after mutations / manual refresh. Realtime primarily for transport.

| Entity | Source of truth | Writers | Authorized readers | Key APIs | Sync | Verification |
|--------|-----------------|---------|--------------------|----------|------|--------------|
| Students / enrollment | `student`, `parent`, `guardian_link`, `enrollment`, `academic_year`, `class`, `section` | Admin (staff write) | Teacher: institute staff-read list; Parent/Student: linked/self | `/students`, `/parents`, `/enrollments`, … | Query invalidate | **PASS** (lifecycle Vitest) |
| Attendance | `attendance_*` | Admin config; Teacher assigned registers | Admin full; Teacher assigned; Parent/Student own | `/attendance/registers`, `/attendance/portal/*` | Mutation invalidate | **PASS** (Vitest + staging multi-role UI/API) |
| Timetable | `timetable_slot`, `timetable_publication` | Admin manage/publish | Teacher assigned; Learner published | `/timetable`, `/timetable/publish-section`, portals | Query invalidate | **PASS** (lifecycle Vitest) |
| Exams / marks | `exam`, `mark_entry`, `mark_score` | Teacher submit; Admin publish | Teacher sheet; Parent/Student published | `/marks/entries`, `/marks/portal/*` | Mutation invalidate | **PASS** (Vitest + staging multi-role UI/API) |
| Homework | `homework`, `homework_submission` | Teacher publish | Parent/Student published | `/homework`, portals | Mutation invalidate | **PASS** (Vitest + staging multi-role UI/API) |
| Fees | `fee_plan`, `fee_payment`, … | Admin publish/pay | Parent published; Teacher roster (no pay) | `/fees/*`, portals | Mutation invalidate | **PASS** (Vitest + staging multi-role UI/API 2026-10-20) |
| Leave | `leave_request`, `leave_decision` | Parent/Teacher create; class-teacher decide | Scoped lists | `/leave/requests` | Soft refresh | **PASS** (Vitest + staging multi-role UI/API 2026-10-20) |
| Announcements | `announcement` + RLS `announcement_select_scoped` | Admin publish; limited teacher scopes | Audience-filtered (draft/teachers-only hidden from parents) | `/announcements` | Query + FCM | **PASS** (Vitest + staging multi-role UI/API 2026-10-20) |
| Certificates | `issued_certificate` | Admin issue | Linked parent/student issued | `/certificates` | Signed URL / public verify | **PASS** (Vitest + staging multi-role UI/API `metadata_only` 2026-10-20) |
| Documents (institute) | `template`, `generated_document` | Admin staff | Connect parent **create/manage denied**; active template list may 200 for members | `/documents` | n/a | **PASS** (parent POST denied; PDF/parent-doc UX **NOT RUN**) |
| Transport | `vehicle`, `route`, `stop`, `transport_enrollment`, … | Admin/driver write paths | Parent learner portal; Teacher class roster; Teacher cannot create vehicles | `/transport/portal/*` | Realtime + poll | **PASS** (mocked lifecycle; `learner-live.ts` untouched) |

## Actor fixture (lifecycle suite)

| Actor | Token (mock) | Role |
|-------|--------------|------|
| Admin A | `token-admin` | `institute_admin` @ INST_A |
| Admin B | `token-admin-b` | `institute_admin` @ INST_B |
| Teacher A | `token-teacher` | Assigned SECTION_A |
| Teacher B | `token-teacher-b` | Assigned SECTION_C |
| Parent A / B | `token-parent` / `token-parent-b` | Guardians of STUDENT_A / B |
| Student A / B | `token-student` / `token-student-b` | Self |

## Authorization boundary note (API vs RLS)

- Hono uses **service_role** after JWT verification (`require-auth.ts`). Mocked Vitest suites assert **API Actor/RBAC**, not Postgres RLS enforcement.
- RLS policies exist (e.g. `announcement_select_scoped`, attendance `*_select_scoped`) for direct `authenticated` client access — **defense in depth**.
- Live API auth isolation: **PASS** (`smoke:tenant:staging` 95/95 — prior).
- Live anon-client RLS: **PASS** (`qa-artifacts/staging-anon-rls-probe.mjs` 8/8 — prior).
- Live Admin→Teacher announcement via API: **PASS** (`staging-cross-app-api-probe.mjs` — prior).

## Staging identity — fees/leave/announcements/certificates expansion 2026-10-20

| Check | Result |
|-------|--------|
| Staging project | `yveadybpntziyryxsrsu` (`lumenx-staging`) |
| Shared/default denylist | `kmpzflsurepjwqnfqyld` (**untouched**) |
| `staging_ref_differs_from_default` | **true** |
| Institutes | `LumenX E2E Test Institute`, `LumenX E2E Isolation Institute` |
| Synthetic roles | Operator, Teacher, Parent, Student, Inst-B Teacher/Parent |
| Playwright staging multi-role | **PASS** 14/14 (two shell batches; see report) |
| Connect Documents (parent write) | **PASS** denied |
| Certificate PDF download | **NOT RUN** (`metadata_only` issue path) |
| Payment-provider callbacks | **NOT IMPLEMENTED** / **NOT RUN** (no fake callbacks) |
| Certificate concurrency/number allocator stress | **NOT RUN** (unsafe in shared staging harness) |

### Fees staging coverage

| Scenario | Layer | Result |
|----------|-------|--------|
| Admin publish fee plan for section | API | **PASS** |
| Draft/unpublished hidden from parent portal | API | **PASS** |
| Parent/Student see billed amount after publish | API + UI | **PASS** |
| Teacher roster read; teacher pay denied | API | **PASS** |
| Inst-B parent portal denied | API | **PASS** |
| Soft cleanup of created plan/component | API | **PASS** |

### Leave staging coverage

| Scenario | Layer | Result |
|----------|-------|--------|
| Parent create pending leave | API + UI | **PASS** |
| Teacher approve | API | **PASS** |
| Cancel ≠ reject (cancel path) | API | **PASS** |
| Inst-B parent create / teacher decide denied | API | **PASS** |
| Soft cleanup of created requests | API | **PASS** |

### Announcements staging coverage

| Scenario | Layer | Result |
|----------|-------|--------|
| Admin create draft — hidden from parent | API | **PASS** |
| Publish → Teacher/Parent/Student see | API + UI | **PASS** |
| Teachers-only audience hidden from parent | API | **PASS** |
| Inst-B isolation | API | **PASS** |
| Soft archive/delete of created rows | API | **PASS** |

### Certificates staging coverage

| Scenario | Layer | Result |
|----------|-------|--------|
| Issue `metadata_only` with permanent `CERT/YYYY/NNNN` | API | **PASS** |
| Duplicate number rejected | API | **PASS** |
| Parent/Student list issued cert | API + UI shell | **PASS** |
| Public verify (no auth) | API | **PASS** |
| Parent cannot create templates | API | **PASS** |
| Inst-B parent cannot see Inst-A cert | API | **PASS** |
| Revoke cleanup (no hard delete) | API | **PASS** |
| PDF render / download | — | **NOT RUN** |

## Sync notes (Connect)

- Resume soft-refresh does **not** invalidate marks/homework/fees/attendance.
- Logout: `removeConnectPortalQueries` — **PASS** (isolation tests).
- Child/institute keys scoped via `scopedConnectKey` — **PASS**.

## Four-module reliability (2026-10-20 current-run)

| Stream | Verdict | Evidence |
|--------|---------|----------|
| Admin diary + photos | **PASS** | View-only diary; signed-URL cache reuse; Admin tsc + vitest |
| Connect startup / lazy | **PASS** | Idle tiered prefetch; lazy route chunks in Connect build; tsc + vitest |
| Transport notify / realtime | **PARTIAL** | Approach stop-level coalesce + status-change notify **PASS**; staging realtime **NOT RUN** |
| Nexus lifecycle | **PASS** | Reject from approving; reject idempotent; trial on create; Nexus/API tsc |

Full write-up: `qa-artifacts/four-module-reliability-report.md`.  
Protected: `learner-live.ts` unmodified; staging/production not written this run.
