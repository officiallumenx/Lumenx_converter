# LumenX — Final Product Audit

**Date:** 2026-07-28  
**Apps:** Admin · Connect · Transport  
**Basis:** Finalized ownership architecture + Reports/Analytics split + Supabase readiness map  
**Rule:** Only real problems. Intentionally excluded: backend, true `.xlsx`, scheduled report email, same-origin demo `localStorage` limits (Supabase removes those).

Legend: ✔ Correct · ⚠ Needs Improvement · ❌ Broken

---

## Cross-cutting

| Check | Status | Real problem (if any) |
|-------|--------|----------------------|
| Ownership (marks / attendance / HW / diary / leave) | ✔ / ❌ | Domain rules match UI **except** teacher marks → Admin SoT (see Marks) |
| Workflow | ⚠ | Most flows coherent; certificates recommend path dead; some toast-only CTAs |
| Navigation | ✔ | Home, Reports vs Analytics, Transport Analytics, Homework/Diary labels OK |
| Consistency (Reports ≠ Analytics) | ✔ | `/reports` export-only; `/analytics` + Transport Analytics visualize-only |
| Permissions | ⚠ | `none` hides/redirects; Roles UI is full/none only (`read` unused). OK for demo gate |
| Offline | ❌ | Queue UI + demo seed; `enqueueOfflineOp` never called from Admin/Connect/Transport features |
| Soft Delete | ❌ | Recycle Bin UI + demo seed; `softDeleteToRecycleBin` never called from delete flows |
| Read Only | ❌ | Banner + billing/AY flags exist; **mutations not gated**; `PlatformReadOnlyGate` unused; AY lock derived from static seed, not Academic Years UI |

---

## Domain checklist

| Domain | Status | Notes |
|--------|--------|-------|
| **Reports** | ✔ | Excel / PDF / CSV; no charts |
| **Analytics** | ✔ | Charts/insights; no export; Transport hub renamed to Analytics |
| **Certificates** | ❌ | Admin Issue UI can load recommendations, but live Activity Achievements page never calls `pushCertificateRecommendation`; `/activity/certificates` redirects away |
| **Achievements** | ✔ | Live `ActivityAchievementsPage` records achievements |
| **Events** | ⚠ | Institute create/publish OK; **Edit** and **Calendar view** are toast-only |
| **Complaints** | ⚠ | Destination + priority model present; Admin can act on Class Teacher–destined items (no destination gate) |
| **Transport** | ✔ | Ops SoT Admin enroll / Driver stops / Connect read-only; Analytics not Reports |
| **Diary** | ✔ | Teacher submits; Admin view-only |
| **Homework** | ✔ | Teacher owns; Admin logs view-only |
| **Attendance** | ✔ | Teacher submit → pending bridge; Admin notify / cannot edit rolls |
| **Marks** | ❌ | Admin approve/reject/return (no score edit) is correct **in Admin**, but teacher `submitMarks` only updates in-memory Connect cache — **does not write** `lumenx.admin.marks-entries.v1` |
| **Leave** | ✔ | Student leave view-only in Admin; teacher leave Accept/Reject/Ignore |
| **Academic Year** | ⚠ | Promotion/graduation/year views work as demo; lock flag not driven by that UI |
| **Subscription** | ⚠ | Billing ↔ `subscriptionExpired` sync works for banner; writes still allowed when unpaid |

---

## App rollup

### Admin
- ✔ Marks review policy, attendance oversight, HW/diary view-only, leave split, reports/analytics, transport analytics, nav, module `none` gating  
- ⚠ Complaints destination enforcement; events edit; AY lock wiring; subscription write block  
- ❌ Read-only enforcement; offline enqueue; soft-delete wiring  

### Connect
- ✔ Attendance/HW/diary ownership; leave/complaints/events role paths; teacher portal access guards; transport projection; achievements recording  
- ⚠ Teacher/activity notification soft-delete/retention incomplete vs parent/student  
- ❌ Marks submit → Admin bridge; certificates route + recommend→Admin path  

### Transport
- ✔ Driver stop ownership via ops bridge; ID model STU-*; no export-as-reports confusion  
- ❌ Offline queue unused (same platform gap)  

---

## Is LumenX ready for Supabase implementation?

### **No**

Architecture is **mostly stable** (ownership rules, nav, Reports vs Analytics, transport SoT, repository façades on Connect), and the planning map in `docs/SUPABASE_FRONTEND_READINESS.md` is usable — but several **product SoT links are still broken or cosmetic**. Encoding them into Postgres/RLS now would freeze incomplete workflows.

### Remaining blockers (fix before / as first Supabase slice)

1. **Marks SoT bridge** — Teacher submit must become Admin `submitted` rows (shared table / RPC contract). Today Connect and Admin disagree.  
2. **Certificates recommend → Admin issue** — Restore live recommend from Achievements (or drop the claim); certificates route must not be a dead redirect if product still owns that module.  
3. **Platform read-only enforcement** — Gate writes when subscription expired / academic year locked; drive AY lock from Academic Management, not static seed.  
4. **Soft delete wiring** — Entity deletes must call recycle path (or drop the feature from the architecture claim).  
5. **Offline outbox wiring** — At least attendance / marks / driver GPS must `enqueueOfflineOp` (or defer Offline from v1 Supabase scope explicitly).

### Non-blockers (can ship after first schema)

- Events Edit / Calendar toast stubs  
- Complaints destination gate  
- Unused `read` permission level  
- Teacher notification retention parity  
- Excel-as-CSV demo format  

---

## Why the architecture is *almost* stable

Ownership boundaries (who writes vs who reviews), Reports≠Analytics, and Transport ops SoT are consistent across Admin / Connect / Transport. Connect already has repository façades; shared bridges exist for attendance, homework/diary, fees, transport, and published marks. Those are the right seams for Supabase — once the five blockers above are closed or explicitly scoped out of v1.
