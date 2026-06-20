# LumenX Connect — Admissions Portal V2 Architecture

> **Principle:** Extend V1 only. Preserve Connect theme, colors, typography, navigation, animations, and light/dark mode. No redesign. No Connect architecture changes.

---

## 1. Existing Portal Analysis (V1)

### Strengths
| Area | Status |
|------|--------|
| Isolated `/admissions/*` zone | Complete |
| Separate auth session (`ADMISSIONS_STORAGE_KEYS`) | Complete |
| `AdmissionsShell` — sidebar + mobile bottom nav | Complete |
| Parent + Institute Admin personas | Complete |
| Institute browse (search, state/city/type filters) | Partial |
| 7-step apply wizard + draft save | Complete |
| My applications + status detail | Partial |
| Document center (upload mock) | Partial |
| Notifications (read/unread) | Partial |
| Institute admin dashboard + form builder | Complete |
| Dark/light theme (`AdmissionsThemeProvider`) | Complete |
| Demo accounts + localStorage repos | Complete |

### Gaps vs V2 Target
| Area | V1 | V2 Target |
|------|-----|-----------|
| Institute directory | List + filters | + sort, featured, popular, recently added, rich cards |
| Institute profile | Side panel | Full profile page with media, principal message, history |
| Program pages | List only | Dedicated program detail per institute |
| Application statuses | 8 statuses | 11 granular statuses + progress |
| Document workflow | Basic upload | Full verification lifecycle + admin notes + timeline |
| Interviews | Inline on app detail | Dedicated interview module + modes |
| Inquiries | Contact form only | Inquiry center with history + categories |
| Notifications | Basic list | Filters, mark all read, typed events |
| Applicant dashboard | Applications list | Unified dashboard with quick actions |
| Media center | None | Campus gallery, videos, achievements |
| Multi-institute | Data exists | Per-institute programs, teams, profiles |
| Admin sync | Disconnected | Shared demo bridge (localStorage) |

---

## 2. Missing Features Report

### Public discovery
- [x] Institute card with logo, type, location, program count, Apply + View Profile
- [x] Sort (rating, seats, name, recently added)
- [x] Featured / Popular / Recently Added sections
- [x] Full institute profile (hero, about, principal, vision/mission, awards, facilities, media)
- [x] Program detail page (eligibility, age, subjects, deadline, FAQ, related programs)

### Applicant workflow
- [x] V2 application timeline (11 statuses)
- [x] Document verification states (6 states) + resubmission + preview
- [x] Interview module (date, time, mode, location, instructions, required docs)
- [x] Inquiry center (6 categories, history, responses)
- [x] Notification filters + mark all read
- [x] Applicant dashboard (cards + quick actions)
- [x] Saved institutes / saved programs

### Institute admin (unchanged scope, V2 data feeds)
- Existing institute admin routes remain; V2 enriches data they consume

### Demo / integration
- [x] Admin ↔ Applicant status sync via shared storage key (`ues_admissions_sync`)

---

## 3. Missing Workflow Report

| Workflow | V1 | V2 (implemented) |
|----------|-----|------------------|
| Discover → Compare → Apply | Browse only | Saved institutes/programs; program-scoped apply links |
| Submit → Documents pending → Uploaded → Verified | Jump to verification | Full status chain + timeline progress |
| Verification → Interview → Final review → Decision | Partial | `interview_completed` + `under_final_review` statuses |
| Document reject → Resubmit | Note only | `resubmission_required` + admin notes + verification timeline |
| Interview schedule → Reminder → Complete | Schedule only | `/admissions/interviews` module + demo interview data |
| Inquiry → Response → Close | Contact form | `/admissions/inquiries` with threaded history |
| Admin stage change → Applicant update | None | `admin-bridge` + Admin `admissions-sync.ts` |

---

## 4. Admissions V2 Architecture

### Folder layout (extends V1)

```
apps/connect/src/
├── admissions-portal/
│   ├── core/                    # unchanged
│   ├── features/
│   │   ├── directory/           # Phase 1 — Institute Directory
│   │   ├── institutes/          # Phase 2+10 — Profile + Media
│   │   ├── programs/            # Phase 3 — Program detail
│   │   ├── dashboard/           # Phase 9 — Applicant dashboard
│   │   ├── inquiries/           # Phase 7 — Inquiry center
│   │   ├── interviews/          # Phase 6 — Interview module
│   │   ├── applications/        # Phase 4 — upgraded
│   │   ├── support/             # Phase 5+8 — docs + notifications
│   │   └── ... (existing)
│   └── shared/ui/
│       └── v2/                  # Timeline, document cards, institute cards
└── lib/admissions/
    ├── types.ts                 # Extended V2 types
    ├── programs-data.ts         # Per-institute programs (Phase 11)
    ├── institute-profiles.ts    # Extended profiles + media (Phase 2+10)
    ├── inquiries-store.ts       # Phase 7
    ├── saved-store.ts           # Saved institutes/programs
    ├── admin-bridge.ts          # Phase 12
    ├── repositories.ts          # Extended CRUD
    └── status-utils.ts          # V2 status maps
```

### Route map (additive)

| Path | Phase | Access |
|------|-------|--------|
| `/admissions/institutes` | 1 | Public — Directory |
| `/admissions/institutes/$id` | 2 | Public — Profile |
| `/admissions/programs/$programId` | 3 | Public — Program detail |
| `/admissions/dashboard` | 9 | Parent auth |
| `/admissions/inquiries` | 7 | Parent auth |
| `/admissions/interviews` | 6 | Parent auth |
| *(existing routes preserved)* | — | — |

### V2 status model

**Application:** `draft` → `submitted` → `documents_pending` → `documents_uploaded` → `document_verification` → `interview_scheduled` → `interview_completed` → `under_final_review` → `approved` | `rejected` | `waitlisted`

**Document:** `not_uploaded` | `uploaded` | `under_review` | `verified` | `rejected` | `resubmission_required`

**Interview mode:** `in_person` | `phone` | `video`

### Admin bridge (Phase 12)

```
packages/auth → ADMISSIONS_STORAGE_KEYS.sync
connect/repositories → pushSyncSnapshot() on save
admin/admissions   → readSyncSnapshot() on mount, write on stage change
```

Maps admin `stage` ↔ connect `status` for demo IDs (`APP-24xx`).

---

## 5. Implementation Plan

| Step | Phase | Deliverable |
|------|-------|-------------|
| 1 | Foundation | Types, programs-data, institute-profiles, repos, status-utils |
| 2 | 1 | Institute Directory page (cards, sort, featured sections) |
| 3 | 2+10 | Institute Profile page (full sections + media gallery) |
| 4 | 3 | Program detail route + related programs |
| 5 | 4 | Enhanced timeline + progress on application detail |
| 6 | 5 | Document verification workflow UI |
| 7 | 6 | Interviews page |
| 8 | 7 | Inquiry center |
| 9 | 8 | Notification center filters + mark all read |
| 10 | 9 | Applicant dashboard + saved items |
| 11 | 11 | Per-institute program data throughout |
| 12 | 12 | Admin demo bridge |
| 13 | — | Shell nav updates, home copy, build verify |

### Design constraints (DO NOT CHANGE)
- `@lumenx/ui` components
- `styles.css` theme tokens
- `AdmissionsShell` navigation pattern
- `SectionCard`, `AdmissionsPageHeader`, `animate-in` transitions
- Mobile-first responsive breakpoints

---

## Demo credentials (unchanged)

- Parent: `priya.sharma@example.com` / `demo123`
- Institute: `admin@lumenx.edu` / `demo123`
- OTP: `123456`
