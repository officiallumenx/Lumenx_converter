# Careers Portal — Implementation & Changelog

**App:** `apps/careers` (standalone Vite app, default port **5176**)  
**Theme:** Isolated from Connect; own auth session, shell, and nav. Connect redirects to Careers via `VITE_CAREERS_ORIGIN`.

**Auth modes:**
- `VITE_CAREERS_AUTH_MODE=demo` — localStorage + demo accounts
- `VITE_CAREERS_AUTH_MODE=api` — Supabase + `/api/v1/careers/*` REST

---

## 1. Routes

### Public / job seeker

| Route | Page |
|-------|------|
| `/` | Careers home (search, featured jobs, role-aware CTAs) |
| `/jobs` | Job board + filters (`?q=` keyword) |
| `/jobs/$jobId` | Job detail |
| `/apply?job=` | Quick apply wizard |
| `/login`, `/signup` | Auth |
| `/dashboard` | Candidate dashboard |
| `/applications` | My applications |
| `/saved` | Saved jobs |
| `/profile` | Profile editor |
| `/documents` | Document center |
| `/notifications` | Notifications (API inbox in API mode) |
| `/interviews` | Interviews |
| `/settings` | Settings |

### Recruiter

| Route | Page |
|-------|------|
| `/recruiter` | Workspace hub (stats, quick actions) |
| `/recruiter/jobs` | My job posts |
| `/recruiter/jobs/new` | Post a job |
| `/recruiter/jobs/$jobId/edit` | Edit job |
| `/recruiter/applicants` | Applicant pipeline |
| `/recruiter/talent` | Talent discovery |
| `/jobs` | **Browse market** (competitor research; own jobs show Edit) |

### Redirects / deprecated nav

- `/institutes/*` → `/jobs` (institute directory not in primary nav)

---

## 2. API wiring (API auth mode)

REST client: `apps/careers/src/lib/careers/api/`

| Feature | Endpoints | Hooks / pages |
|---------|-----------|---------------|
| Jobs | `GET/POST/PATCH/DELETE /careers/jobs` | `useCareersJobs`, browse, recruiter CRUD |
| Applications | `GET/POST /careers/applications`, `POST .../transition` | `useCareersApplications`, apply wizard |
| Profile | `GET/PUT /careers/me/profile` | `useCareersProfile` |
| Saved jobs | `GET/POST/DELETE /careers/saved` | `useCareersSaved`, SaveJobButton |
| Talent pool | `GET /careers/talent-pool` | `useCareersTalent` |
| Notifications | `GET/PATCH /notifications` | `useCareersApiInbox` |
| Interviews | Derived from applications (`interview_scheduled` / payload) | `useCareersInterviews` |

Institute context: `resolveCareersInstituteId(user)` from `activeInstituteId` or `organizationId`.

Demo mode continues to use `repositories.ts`, `recruiter-jobs-store.ts`, and localStorage.

---

## 3. Recruiter job lifecycle

1. **Post** — `/recruiter/jobs/new` → API `POST /careers/jobs` (or demo store)
2. **Edit** — update fields, change status (draft / open / closed)
3. **Manage** — My jobs: Publish, Close, Edit, Preview
4. **Market** — Browse market: View listing (others) or Edit + Preview (own)

---

## 4. Shell navigation

**Job seeker primary:** Home, Jobs, Dashboard, Applications  

**Recruiter primary:** Workspace, My jobs, Applications, **Browse market**  

**Recruiter more:** Discover talent, Careers home, Settings  

Branding: **LumenX Careers** (minimal auth shell).

---

## 5. Files (careers app)

```
apps/careers/src/
  careers-portal/     pages, shell, widgets
  lib/careers/
    api/              REST repository (types, api, map, load, mutations)
    institute-context.ts
    repositories.ts   demo mode aggregate
    recruiter-jobs-store.ts
    profile-repository.ts
  hooks/
    use-careers-jobs.ts
    use-careers-applications.ts
    use-careers-profile.ts
    use-careers-saved.ts
    use-careers-talent.ts
    use-careers-interviews.ts
    use-careers-api-inbox.ts
```

---

## 6. Demo accounts

| Account | Email | Password |
|---------|-------|----------|
| Candidate | priya.candidate@example.com | demo123 |
| Recruiter | hr@lumenx.edu | demo123 |

After recruiter login, default hub: `/recruiter`.

---

## 7. Dev commands

```bash
npm run dev:careers    # port 5176
npm test --workspace=@lumenx/app-careers
```

---

## 8. Testing checklist

- [ ] Job seeker: browse, filter, apply from job detail
- [ ] Recruiter: post job → edit → open on board
- [ ] API mode: jobs, applications, profile, saved, talent pool load
- [ ] Home search passes `?q=` to jobs page
- [ ] `/` loads without Connect parent/teacher/student context
