# Sports Module — Architecture (Step 3)

**Status:** Design only — awaiting approval before implementation.

**Scope:** Activity Workspace → Sports module (`/activity/sports`).

**Constraints:**
- Subject Teacher Portal is frozen (read-only).
- No backend, APIs, Firebase, or database.
- Mock data only.
- Reuse Activity Hub shared types — do not duplicate domain models.
- Follow LumenX Connect design system (StatCard, cards, spacing, typography).

---

## 1. Purpose

The Sports module lets Activity Coordinators manage **sports-specific activities** within the institute: training sessions, matches, trials, tournaments, and team registrations.

It is a **workspace module**, not the workspace landing page. The Dashboard (`/activity`) surfaces summaries; Sports owns the full sports workflow.

---

## 2. Position in Activity Workspace

```
Activity Workspace
├── Dashboard          ← landing page (implemented)
├── Sports             ← THIS MODULE
├── Events
├── Competitions
├── Clubs
├── Workshops
├── Attendance
├── Achievements
├── Certificates
├── Messages
├── Notifications
└── Profile
```

**Route (existing, unchanged):** `/activity/sports`  
**Nav entry:** Activity nav → Sports (Trophy icon)

---

## 3. Activity Hub dependencies

Sports imports shared concepts from `@/activity-workspace/hub` — never redefines them.

| Hub area | Sports usage |
|----------|----------------|
| **activity-types** | `BaseActivity`, `ActivityCreateInput`, `ActivityLifecycleStatus`, `toDisplayStatus()` |
| **categories** | Fixed `category: "sports"` on all sports records |
| **audience** | `ActivityAudienceSelection`, `summarizeAudience()` in create flow and cards |
| **calendar** | `isoDate`, `formatDisplayDate`, `CalendarActivityMark` for sports calendar strip |
| **notifications** | `ActivityNotificationDispatch` when publishing a sports activity |
| **attachments** | `ActivityAttachment` on create form (mock upload) |
| **certificates** | `ActivityCertificateRef` for match participation certs (read-only list in Sports) |
| **timeline** | `ActivityTimelineItem` for sports audit entries |

**No Activity Hub UI or routes** — Sports module composes hub types in its own screens.

---

## 4. Domain model

### 4.1 `SportActivity` (extends hub)

```ts
interface SportActivity extends BaseActivity {
  category: "sports";
  sportType: SportType;
  format: SportFormat;
  teams: SportTeamRef[];
  participantCount: number;
  coachName?: string;
  registrationOpen: boolean;
}
```

### 4.2 Sports-specific enums

```ts
type SportType =
  | "basketball" | "cricket" | "football" | "volleyball"
  | "table_tennis" | "athletics" | "swimming" | "badminton";

type SportFormat = "match" | "tournament" | "training" | "trials" | "friendly";

type SportTeamRef = {
  id: string;
  name: string;
  house?: string;
  playerCount: number;
};
```

### 4.3 Filters and list state

```ts
interface SportListFilters {
  sportType?: SportType;
  format?: SportFormat;
  status?: ActivityLifecycleStatus;
  query?: string;
}
```

---

## 5. Data layer

**Location:** `lib/activity/sports/` (separate from dashboard `lib/activity/`)

```
lib/activity/sports/
  types.ts
  mock-data.ts
  repositories.ts
  index.ts
```

### Repository API (mock)

```ts
interface SportsRepository {
  list(filters?: SportListFilters): Promise<SportActivity[]>;
  getById(id: string): Promise<SportActivity | null>;
  create(input: SportCreateInput): Promise<SportActivity>;
  update(id: string, patch: Partial<ActivityCreateInput>): Promise<SportActivity>;
  publish(id: string): Promise<SportActivity>;
}
```

`SportCreateInput = ActivityCreateInput & { sportType, format, teams?, coachName? }`

**Sign-out:** `sportsRepository.reset()` added to `resetAllConnectStores()`.

---

## 6. Feature module structure

```
activity-portal/features/sports/
  ARCHITECTURE.md
  index.ts
  ActivitySportsPage.tsx
  types.ts
  hooks/
    useSportsActivities.ts
    useSportCreateFlow.ts
  components/
    SportsHeader.tsx
    SportsStatsRow.tsx
    SportsFilterBar.tsx
    SportsActivityList.tsx
    SportActivityCard.tsx
    SportActivityDetailSheet.tsx
    SportCreateWizard.tsx
    SportAudienceStep.tsx
    SportAttachmentsStep.tsx
    SportReviewStep.tsx
  views/
    SportsListView.tsx
    SportsCalendarView.tsx
```

**Shared UI reuse:**
- `@/teacher-portal/shared/ui/StatCard` (read-only import)
- `@/activity-workspace/shared/ui/PageSkeleton`
- `@/components/app/PageHeader`

**No new routes** — single page with tabs and sheets.

---

## 7. UI screens

### Sports home

- PageHeader with "+ New sport activity" CTA
- 4 module stat cards
- Tabs: List | Calendar
- Filter bar: sport type, format, status, search
- Grouped activity list (Today / Upcoming / Past)

### Sport activity card

Title, badges, date/time/venue, audience summary, participants, status chip. Tap opens detail sheet.

### Detail sheet

Overview, audience, attachments, linked certificates. Stub link to attendance module.

### Create wizard (4 steps)

1. Details — hub `ActivityCreateInput` + sport type/format
2. Audience — hub `ActivityAudienceSelection`
3. Attachments — hub `ActivityAttachment[]` (mock)
4. Review and publish — mock `ActivityNotificationDispatch`

---

## 8. Workflows

**Browse:** `/activity/sports` → `sportsRepository.list()` → client filters → grouped list.

**Detail:** Tap card → `getById()` → detail sheet.

**Create:** Wizard → `create()` + `publish()` → mock notification toast → list refresh.

**Calendar:** Map activities to `CalendarActivityMark[]` → week strip via hub calendar utils.

---

## 9. Mock data plan

12 `SportActivity` records across basketball, cricket, football, table tennis, athletics with mixed lifecycle statuses and all audience scope types.

---

## 10. Context integration

**Option A (Step 3):** Sports loads via `useSportsActivities` directly from `sportsRepository` — no `ActivityPortalContext` change.

---

## 11. Out of scope

- Live scoring, roster editing, real uploads, backend notifications
- New routes or Hub screens
- Dashboard changes in Step 3

---

## 12. Approval gate

After approval, implement Sports only — no parallel module work.
