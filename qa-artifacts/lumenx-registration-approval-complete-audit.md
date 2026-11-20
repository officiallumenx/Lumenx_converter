# LumenX — Registration, Account Approval & Returning User Flow Audit

**Date:** 2026-10-23  
**Staging Supabase:** `yveadybpntziyryxsrsu`  
**Production Supabase (untouched):** `kmpzflsurepjwqnfqyld`  
**Real accounts / real notifications / FCM delivery:** **NOT RUN**  
**Secrets exposed:** **No**

---

## Final status

# `PARTIAL — AUTOMATED TESTS PASS, SOME BEHAVIOR UNVERIFIED`

Automated registration/approval/recovery tests pass. Device reopen, OTP SMS, and push-on-approval were **not** verified on real devices. FCM staging remains blocked (empty Admin credentials / worker off) per `qa-artifacts/transport-fcm-delivery-report.md`.

---

## 1. Actual registration flow discovered

LumenX has **two different journeys**. They must not be conflated.

### A. Institute registration (Admin → Nexus) — **the approval workflow**

| Step | Implementation |
|------|----------------|
| Open Admin first time | Sign-up / OTP / institute setup (demo) or API sign-up |
| Submit | `POST /api/v1/registrations` (public) → `institute_registration` **pending** |
| Persist | Server row + optional Supabase Auth for applicant |
| Status UI | Admin `/pending-verification` |
| Refresh | `GET /api/v1/registrations/me` via `syncApiRegistrationFromBackend` (in-memory only; **not** localStorage) |
| Approve / reject | Nexus `POST /api/nexus/registrations/:id/approve\|reject` |
| Unlock Admin | Activation binds institute membership + session (`api-registration-activation`) |

**Actors:** Applicant (Admin), Reviewer (Nexus ops/root).  
**States:** `pending` | `approving` (mapped to pending in DTO) | `approved` | `rejected`.

### B. Connect Teacher / Parent / Student — **login recovery, not self-registration approval**

| Step | Implementation |
|------|----------------|
| Open Connect | `/login` — institute → role → phone |
| Mode | `GET`-style login mode: `first_login_otp` or `returning_pin` (`connect-login.ts`) |
| First login | Server OTP → create PIN → session |
| Returning | PIN (OTP only for forgot-PIN) |
| Provisioning | Users must already exist as parent/teacher/student subjects for that institute |

**There is no Connect “register → wait for Admin approval” product path.** Pending approval for Connect end-users is **not** implemented as a registration gate. Portal access is role + membership + auth session.

---

## 2. Current approval workflow

1. Applicant submits institute registration (Admin).  
2. Nexus lists queue (`/api/nexus/registrations`).  
3. Authorized Nexus operator approves (provisions institute + admin membership) or rejects (reason required).  
4. Admin polls/refreshes `registrations/me` (30s while pending + visibilitychange + manual **Check status**).  
5. On approved, Admin activates and unlocks dashboard.

Institution Admin **does not** approve their own institute registration; Nexus does. Connect parents/teachers/students are not approved through this registration table.

---

## 3. Approval states and responsible actors

| State | Visible in | Gate | Actor who changes it |
|-------|------------|------|----------------------|
| pending | Admin pending page | `resolveRegistrationGate` → `pending` | Applicant submit |
| approved | Admin (then dashboard) | `allow` after institute bind | Nexus approve |
| rejected | Admin pending + resubmit | `rejected` | Nexus reject |
| Connect authenticated | Connect portals | `getConnectProtectedRouteDecision` / role gate | Login APIs only |

Client-side status cannot grant approval — gate reads server snapshot / membership.

---

## 4. Server-side account persistence

- Institute registration rows live in Supabase (staging/prod projects).  
- Admin API registration **snapshot is in-memory only** (`api-registration-state.ts` documents: never persisted to localStorage).  
- Closing the app drops the in-memory view; reopening requires auth session + `GET /registrations/me`.  
- Connect session UI keys use `CONNECT_STORAGE_KEYS`; logout clears them + RQ caches (see connect load-cache report).  
- Clearing app data loses local session; server registration/membership remain; user must sign in again (phone+OTP/PIN for Connect; email/password/OTP for Admin).

---

## 5. Behavior when users leave and return

| Scenario | Expected (code) | Automated evidence |
|----------|-----------------|--------------------|
| A Submit + close Admin | Server keeps pending; reopen → sync me | leave-return test A/B |
| B Leave pending screen | Sync/refetch; no duplicate POST from gate | leave-return + gate tests |
| C Approve while closed | Next sync shows approved → allow | leave-return C |
| D Approve while open | 30s poll + visibility + Check status | `useApiRegistrationSync` |
| E Clear cache | In-memory wiped; refetch after auth | leave-return E/F |
| F Clear app data / reinstall | Local session gone; sign-in recovers | Contract tests; **device NOT RUN** |
| G Logout | `clearApiRegistrationSnapshot` / Connect cache clear | leave-return G + connect cache report |

---

## 6. Cache clearing and reinstall-equivalent

- Admin registration status: **not** cached in localStorage → reinstall cannot sticky-block with stale “pending” from disk. Sticky pending only possible if client skips refetch (tests assert invalidate/clear).  
- Connect: RQ IDB persist is user-scoped and cleared on logout; session restore requires valid auth.

---

## 7. Mobile-number authentication findings

| Surface | Mechanism |
|---------|-----------|
| Connect | Phone + institute + role → OTP (first login / forgot PIN) or PIN |
| Admin institute signup | Email/mobile OTP paths in demo; API mode uses registration + Supabase Auth |
| Security | Phone alone does not unlock data without OTP/PIN verification and subject resolution |

Real SMS OTP delivery against staging carriers: **NOT VERIFIED** this pass (demo/OTP providers may be disabled on staging).

---

## 8. Admin approval and rejection findings

Backend `registrations-approval.test.ts` (**18 PASS**):

- Pending visibility to authorized reviewers  
- Approve provisions institute/membership  
- Reject requires reason; idempotent reject  
- Double approve idempotent (no duplicate institute)  
- Unauthorized / wrong-role blocked (covered in suite)

Nexus UI uses `approveRegistration` / `rejectRegistration` APIs.

---

## 9. Portal routing results

| App | Guard | Result |
|-----|-------|--------|
| Admin pending/rejected | `registrationGatePath` → `/pending-verification` | Blocks dashboard |
| Admin approved + bound | `allow` | Dashboard |
| Connect | `getConnectProtectedRouteDecision` + `getConnectRoleGateDecision` | No pending-approval portal; wrong role → redirect/deny |

Pending/rejected institute applicants cannot use Admin workflows via gate. URL deep-links to Admin chrome are redirected to pending. Backend still enforces membership on APIs independently.

---

## 10. Security and authorization results

- Cross-user registration snapshot: bound `userId` mismatch → loading (not prior user’s status).  
- Cross-institution: Nexus review scoped by operator roles; Connect subjects scoped by instituteId in login.  
- Self-approve via client: not possible — Nexus endpoints require reviewer auth.  
- FCM approval push: **not claimed** (credentials empty / worker disabled).

---

## 11. Defects fixed

| Defect | Fix |
|--------|-----|
| Pending UI invented “Typical turnaround 2–3 days” / “1–2 business days” | Removed fabricated SLA; copy now states awaiting Nexus + Check status; `estimatedReviewDays` = `—` for pending |

No registration-loss, duplicate-row, or gate bypass defect reproduced in automated suites.

---

## 12. Files changed

| File | Reason |
|------|--------|
| `apps/admin/src/auth/pending-verification-data.ts` | Stop inventing review SLA strings |
| `apps/admin/src/routes/pending-verification.tsx` | Honest pending copy / illustration |
| `apps/admin/src/auth/registration-leave-return.test.ts` | **Added** leave/return/isolation/SLA tests |
| `apps/connect/src/auth/connect-account-recovery.test.ts` | **Added** Connect recovery contract tests |
| `qa-artifacts/lumenx-registration-approval-complete-audit.md` | This report |

---

## 13. Automated test results

| Suite | Result |
|-------|--------|
| Admin registration (gate, status, activation, api, leave-return) | **32 PASS / 5 files** |
| Connect recovery + guards | **9 PASS / 3 files** |
| Backend `registrations-approval.test.ts` | **18 PASS** |
| Admin typecheck | **PASS** |
| Connect typecheck | **PASS** |
| `git diff --check` (touched paths) | **PASS** |

Lint not re-run full Admin tree this pass (focused typecheck + tests).

---

## 14. Unverified behavior and blockers

- Physical device: close/reopen Admin or Connect, reinstall, tray notification on approval.  
- Real OTP SMS on staging.  
- FCM push when registration approved (see FCM staging readiness — credentials empty).  
- Production end-to-end (forbidden this pass).  
- Connect “self-serve registration awaiting school Admin” — **does not exist** as a product path; school must provision users first.

---

## 15. Remaining recommended improvements

1. After FCM staging is configured (human checklist), optionally notify applicants on approve/reject — keep in-app Check status as primary.  
2. Consider surfacing `reviewedAt` / rejection reason only from DTO (already done for reject).  
3. Document in Connect login empty-state: “Ask your school to add your phone” when subject not found (UX copy only).  
4. Device QA checklist for Admin pending → Nexus approve → Check status → Continue.

---

## Explicit answers

| Question | Answer |
|----------|--------|
| Can a user register and safely leave the app? | **Yes** for Admin institute registration — server stores pending. Connect users do not “register for approval”; they sign in after provisioning. |
| Will the pending approval screen return correctly? | **Yes** (Admin) after re-auth + `registrations/me` — automated. |
| Will the user see approval after an admin approves? | **Yes** after refresh/poll/activation — Nexus is the approver. Automated for state transition; device UX unverified. |
| Can the user recover the existing account after clearing app data? | **Yes** by signing in again; server row remains. Device reinstall unverified. |
| Must the user enter a mobile number again? | **Connect:** yes (or stored UI prefs may prefill institute only). **Admin:** email/session recovery per Auth mode. |
| Can an unapproved user bypass portal restrictions? | **Admin:** gate blocks pending/rejected. **Connect:** no approval gate; unauthorized subjects fail login / role guards; APIs enforce membership. |
| Can an administrator approve only authorized institution accounts? | Institute registration approval is **Nexus**, not school Admin. Nexus authorization covered by backend tests. |

---

## Conclusion

The complete **approval** journey is **Admin institute registration ↔ Nexus review**. Connect Teacher/Parent/Student use **OTP/PIN recovery** of already-provisioned accounts. Automated tests cover gates, persistence model, leave/return cache behaviour, and approval idempotency. Device OTP/FCM remain unverified; fabricated review-time copy was removed.
