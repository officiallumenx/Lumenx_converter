# LumenX Connect — Careers Portal V2 Architecture

> **Principle:** Extend V1 only. Preserve Connect theme, colors, typography, navigation, animations, and light/dark mode. No redesign. No changes to Teacher, Student, Parent, or Admissions portals.

---

## 1. Existing Portal Analysis (V1)

### Strengths
| Area | Status |
|------|--------|
| Isolated `/careers/*` zone | Complete |
| Separate auth session (`CAREERS_STORAGE_KEYS`) | Complete |
| `CareersShell` — sidebar + mobile bottom nav | Complete |
| Candidate-only persona | Complete |
| Job browse + filters | Partial |
| 6-step apply wizard + draft save | Complete |
| My applications + status detail | Partial |
| Document center (upload mock) | Partial |
| Notifications (read/unread) | Partial |
| Dark/light theme (`CareersThemeProvider`) | Complete |
| Demo accounts + localStorage repos | Complete |

### Gaps vs V2 Target
| Area | V1 | V2 Target |
|------|-----|-----------|
| Candidate profile | Read-only % | Rich editable profile + teaching sections |
| Institute career pages | None | Directory + full profile with culture, gallery |
| Job discovery | Basic filters | Featured, trending, recommended, sort, saved route |
| Application statuses | 8 statuses | 14 granular statuses + demo class + offer |
| Demo class workflow | None | Upload, schedule, evaluation, feedback |
| Dashboard | None | `/careers/dashboard` hub |
| Talent pool | None | Demo enrollment on rejection |
| Institute follow | None | Follow + hiring alerts |
| Recommendations | None | Rule-based job scoring |
| Admin sync | Disconnected | Shared demo bridge (`ues_careers_sync`) |

---

## 2. Missing Features Report

- [x] Rich candidate profile + teaching profile tabs
- [x] Institute directory + career pages
- [x] Job discovery sections (featured, trending, recent, recommended)
- [x] `/careers/saved` route
- [x] V2 apply wizard (Personal → Professional → Teaching → Documents → Review)
- [x] 14-status pipeline + timeline widgets
- [x] Demo class workflow
- [x] Candidate dashboard
- [x] Expanded notifications + filters
- [x] Talent pool + follow institutes
- [x] Smart recommendations (frontend demo)
- [x] Admin ↔ Connect sync

---

## 3. Missing Workflow Report

| Workflow | V2 |
|----------|-----|
| Sign up → OTP → profile → password → dashboard | `/careers/dashboard` |
| Profile pre-fills apply wizard | `profile-repository` |
| Discover institute → follow → job alert | `follow-store` |
| Apply → acknowledgement with application ID | Success step |
| Assessment → demo class → interview → offer | Extended statuses |
| Rejected → talent pool | `talent-pool-store` |
| Admin stage change → candidate update | `admin-bridge.ts` |

---

## 4. Architecture

```
apps/connect/src/
├── careers-portal/
│   ├── features/{dashboard,institutes,profile,saved,...}
│   ├── shared/ui/v2/CareersV2Widgets.tsx
│   └── index.ts
├── lib/careers/
│   ├── types.ts, status-utils.ts, schemas.ts
│   ├── profile-repository.ts, saved-store.ts, follow-store.ts
│   ├── talent-pool-store.ts, recommendations.ts
│   ├── institute-profiles.ts, jobs-data.ts
│   ├── admin-bridge.ts, repositories.ts, mock-data.ts
└── routes/careers/**
```

### Extended status pipeline

`draft` → `submitted` → `under_review` → `shortlisted` → `assessment` → `demo_class` → `interview_scheduled` → `interview_completed` → `offer_sent` → `offer_accepted` | `rejected` | `on_hold`

Legacy `selected` maps to `offer_accepted`.

---

## 5. Responsive Strategy

- Mobile: bottom nav, sticky filters, full-width CTAs, safe-area padding
- Tablet: 2-column grids, collapsible filters
- Desktop: sidebar nav, 3-column discovery
- `PageSkeleton` on heavy routes; horizontal scroll for filter chips

---

## 6. Candidate Journey

Discover (`/careers`, institutes, jobs) → Engage (sign up, profile, follow) → Apply (wizard, acknowledgement) → Track (dashboard, timeline, notifications) → Outcome (offer / talent pool)

---

## 7. Institute Journey (demo)

Admin posts job → `ues_careers_sync` → Connect job board → Institute career page → Candidate applies → Admin pipeline → Sync → Candidate timeline

---

## 8. Implementation Stages

| Stage | Scope | Status |
|-------|-------|--------|
| 1 | Auth + candidate profile | Done |
| 2 | Institute career pages | Done |
| 3 | Job discovery + job details | Done |
| 4 | Applications + documents | Done |
| 5 | Interviews + demo classes | Done |
| 6 | Dashboard + notifications | Done |
| 7 | Talent pool + recommendations | Done |
| 8 | Polish + admin sync | Done |

---

## Demo credentials

- OTP: `123456`
- Candidate: `priya.candidate@example.com` / `demo123`
