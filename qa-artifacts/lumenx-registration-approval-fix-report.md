# LumenX — Registration Approval, Status Recovery & Admin Access Fix Report

**Date:** 2026-10-23  
**Upstream:** `qa-artifacts/lumenx-registration-approval-complete-audit.md`  
**Staging Supabase:** `yveadybpntziyryxsrsu` (not mutated)  
**Production:** untouched  
**FCM / real OTP / device:** not enabled / not claimed  

---

## Final status

# `PARTIAL — AUTOMATED TESTS PASS, DEVICE OR EXTERNAL SERVICES UNVERIFIED`

---

## 1. Defects found and evidence

| # | Defect | Evidence |
|---|--------|----------|
| D1 | Pending page could keep a **stale in-memory `pending`** after Nexus approval until poll/Check Status — entry path called `ensure` **without** `force`, and a secondary effect **skipped refresh when `loadState === "ready"`** | `ensureApiRegistrationForUser` + pending-verification effects (pre-fix) |
| D2 | Failed `GET /registrations/me` left `syncError` set but UI still treated snapshot as **ready pending**, hiding Retry | `getApiApplicationStatus()` preferred snapshot over `syncError` |
| D3 | After activation (`gate === allow`), user could remain on `/pending-verification` until manually tapping Enter dashboard | `__root.tsx` leave-registration list omitted pending route |
| D4 | Concurrent Check Status + poll could race duplicate GETs | No in-flight dedupe on `syncApiRegistrationFromBackend` |

Prior audit SLA copy fix remains in place (no invented “1–2 business days”).

---

## 2. Fixes implemented

1. **Force server refresh on pending-verification entry** — `ensureApiRegistrationForUser(userId, { force: true })` then apply `getApplicationStatusForEmail` / activation.  
2. **Surface sync failures** — if `syncError` is set with a stale snapshot, `loadState: "error"` + `errorMessage` (does not invent approved/rejected).  
3. **Navigate away when approved + activated** — `/pending-verification` included in registration leave routes when `registrationGate.kind === "allow"`.  
4. **Dedupe concurrent registration syncs** — single in-flight promise per bound user.  

No schema, Nexus policy, FCM, or Connect self-registration changes.

---

## 3. Files changed

| File | Change |
|------|--------|
| `apps/admin/src/auth/api-registration-state.ts` | Sync in-flight dedupe; clear on bind/logout |
| `apps/admin/src/auth/pending-verification-data.ts` | Error loadState when sync fails with stale snapshot |
| `apps/admin/src/routes/pending-verification.tsx` | Force refresh on entry |
| `apps/admin/src/routes/__root.tsx` | Leave pending when gate allows |
| `apps/admin/src/auth/approval-status-recovery.test.ts` | **Added** recovery/dedupe/error/gate tests |

---

## 4. Actual tests and results

| Suite | Result |
|-------|--------|
| Admin approval recovery + leave-return + gate + status + activation + registrations api | **37 PASS / 6 files** |
| Backend `registrations-approval.test.ts` | **18 PASS** |
| Connect recovery/guards (unchanged shared auth) | **9 PASS** |
| Admin `tsc --noEmit` | **PASS** |
| `git diff --check` (touched paths) | **PASS** |

---

## 5. Status refresh and stale-cache behavior

- Registration snapshot remains **in-memory only** (not localStorage).  
- Pending entry **always** forces `GET /registrations/me`.  
- Check Status → `refreshApplicationStatus` → same sync (deduped with poll).  
- Stale pending + force ensure → approved → gate `allow` (automated).  
- Failed sync → error UI / Retry; does not flip to approved/rejected.

---

## 6. Approved / pending / rejected navigation

| State | Behavior |
|-------|----------|
| Pending | Gate → `/pending-verification`; dashboard blocked |
| Rejected | Gate → pending page + resubmit when API supports; dashboard blocked |
| Approved + institute bound | Gate `allow`; root leaves `/pending-verification` → `/` (app lock may apply) |
| Approved needing activation | Gate `loading` until membership bind; failure shows activation Retry |

Backend still enforces membership on APIs independently of the UI gate.

---

## 7. Session expiry and app-reopen (automated)

| Scenario | Result |
|----------|--------|
| Approved while “closed” (memory cleared) then refetch approved | PASS (leave-return + force ensure) |
| Pending reopen requires server refetch | PASS |
| Logout clears registration view; cross-user isolation | PASS |
| Session expired during activation (`no_token`) | Covered by activation module tests |
| Device kill/reinstall / real OTP | **NOT RUN** |

---

## 8. Security and institution isolation

- Gate never trusts URL/localStorage for approval.  
- Snapshot bound to `userId`; mismatch → loading.  
- Nexus approve/reject auth + idempotency: backend suite PASS.  
- Pending/rejected cannot `allow` into Admin chrome.

---

## 9. Remaining device-only limitations

- Physical reopen of Admin Capacitor/WebView.  
- Real PIN unlock timing after auto-leave pending.  
- Network flakiness UX on real devices.

---

## 10. FCM and real OTP limitations

- Staging FCM still blocked (empty Admin credentials / worker off).  
- Approval discovery does **not** require push — Check Status + entry refresh + 30s pending poll + visibility refresh.  
- Real SMS OTP not exercised this pass.

---

## 11. Exact next steps (optional)

1. Manual staging: submit registration → Nexus approve → reopen Admin / Check Status → confirm dashboard.  
2. After human FCM staging config (separate checklist), optional approve/reject push — not required for status recovery.

---

## Explicit answers

| Question | Answer |
|----------|--------|
| Does Check Status retrieve the latest server status? | **Yes** — `refreshApplicationStatus` → `syncApiRegistrationFromBackend` → `GET /registrations/me`. |
| Does an approved Admin proceed without registering again? | **Yes** — activation binds membership; gate `allow`; no second `POST /registrations`. |
| App closed before approval, reopened after? | Memory empty → fetch on entry → approved → activate → leave pending. Automated for state machine; device unverified. |
| If notification is never received? | User still learns via entry refresh, poll, or Check Status. No push claimed. |
| Can pending/rejected users access protected features? | **No** via registration gate; APIs still require membership. |
| What remains unverified? | Device reopen, real OTP SMS, FCM delivery. |

---

## Conclusion

Verified status-recovery and post-approval navigation defects are fixed with focused Admin changes and regression tests. External delivery channels remain out of scope for this pass.
