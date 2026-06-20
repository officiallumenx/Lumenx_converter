# Careers Portal — Implementation & Changelog

**Zone:** `/careers/*` on LumenX Connect  
**Theme:** Isolated from main Connect shell; own auth session and nav.

---

## 1. Routes

### Public / job seeker

| Route | Page |
|-------|------|
| `/careers` | Careers home (search, featured jobs, role-aware CTAs) |
| `/careers/jobs` | Job board + filters |
| `/careers/jobs/$jobId` | Job detail |
| `/careers/apply?job=` | Quick apply wizard |
| `/careers/login`, `/careers/signup` | Auth |
| `/careers/dashboard` | Candidate dashboard |
| `/careers/applications` | My applications |
| `/careers/saved` | Saved jobs |
| `/careers/profile` | Profile editor |
| `/careers/documents` | Document center |
| `/careers/notifications` | Notifications |
| `/careers/interviews` | Interviews |
| `/careers/settings` | Settings |

### Recruiter

| Route | Page |
|-------|------|
| `/careers/recruiter` | Workspace hub (stats, quick actions) |
| `/careers/recruiter/jobs` | My job posts (JobCard grid) |
| `/careers/recruiter/jobs/new` | Post a job |
| `/careers/recruiter/jobs/$jobId/edit` | **Edit job** (same form as create, prefilled) |
| `/careers/recruiter/applicants` | Applicant pipeline |
| `/careers/recruiter/talent` | Talent discovery |
| `/careers/jobs` | **Browse market** (competitor research; own jobs show Edit) |

### Redirects / deprecated nav

- `/careers/institutes/*` → jobs (institutes removed from primary nav)
- Institute directory pages exist but are not promoted in shell

---

## 2. Recruiter job lifecycle

1. **Post** — `/careers/recruiter/jobs/new` → submit → redirect to **edit** page
2. **Edit** — update fields, change status (draft / open / closed), Save changes
3. **Manage** — My jobs: Publish, Close, Edit, Preview
4. **Market** — Browse market: View listing (others) or Edit + Preview (own)

### Store API (`recruiter-jobs-store.ts`)

- `createRecruiterJob(recruiterId, orgId, orgName, input)`
- `updateRecruiterJob(jobId, orgId, input)`
- `updateRecruiterJobStatus(jobId, status)`
- `getRecruiterJobsForOrg(orgId)`
- `getRecruiterJobById(jobId)`
- `canRecruiterEditJob(jobId, orgId)`

Recruiter jobs persist in `localStorage` key `ues_careers_recruiter_jobs`. Open listings merge into public board via `getJobs()` in `repositories.ts`.

---

## 3. Job board filters

Implemented in `JobsBrowsePage` + `filterAllJobs()`:

- Keyword (title, company, skills)
- Experience band
- Work mode (onsite / remote / hybrid)
- Role type (`JobCategory`)
- State, city
- Employment type
- Sort: recent, deadline, title

Sections when no filters: Recommended (seekers), Featured, Trending, Recently posted — all sourced from `getJobs()`.

---

## 4. Job card (`CareersShellWidgets.tsx`)

Displays: title, company · department, category/employment/work mode badges, location, overview, experience, deadline, salary.

Props:

- `compact` — smaller card
- `hideActions` — recruiter manage view
- `browseMarket` — recruiter market mode (no save; Edit on own listings)
- `footer` — custom footer (status badges, actions)

---

## 5. Post / edit job form sections

1. Role basics (title, department, category, employment, work mode)
2. Experience & compensation (experience picker, salary, deadline)
3. Location (city, state, optional address)
4. Overview (card summary)
5. Full job description
6. Responsibilities & qualifications (line-based lists)
7. Benefits
8. Status: publish checkbox (create) or status dropdown (edit)

---

## 6. Shell navigation

**Job seeker primary:** Home, Jobs, Dashboard, Applications  

**Recruiter primary:** Workspace, My jobs, **Browse market**, Applicants  

**Recruiter more:** Discover talent, Careers home, Settings  

---

## 7. Data & types

- `JobPosting.description` — optional full description
- `RecruiterJobStatus` — `draft` | `open` | `closed`
- Extended `JobCategory`: IT, sales/marketing, finance, HR, operations, healthcare, etc.
- Sample cross-industry jobs in `jobs-data.ts`
- `JOB_EXPERIENCE_OPTIONS` — structured experience picker labels

---

## 8. Files added (careers-specific)

```
apps/connect/src/careers-portal/
  core/          CareersAuthProvider, CareersThemeProvider, guards
  features/
    home/        CareersHomePage
    jobs/        JobsBrowsePage, JobDetailPage
    apply/       ApplyWizardPage
    dashboard/   CandidateDashboardPage
    recruiter/   RecruiterWorkspacePage, RecruiterJobsPage, RecruiterPostJobPage,
                 RecruiterApplicantsPage, RecruiterTalentPage
    ...          profile, applications, saved, auth, support, interviews
  shared/ui/     CareersShell, CareersShellWidgets, CareersPageHeader

apps/connect/src/lib/careers/
  recruiter-jobs-store.ts
  recruiter-talent.ts
  repositories.ts, jobs-data.ts, recommendations.ts, types.ts, mock-data.ts, ...

apps/connect/src/routes/careers/
  ...            all route files including recruiter/jobs/$jobId/edit.tsx
```

---

## 9. Demo accounts

| Account | Email | Password |
|---------|-------|----------|
| Candidate | priya.candidate@example.com | demo123 |
| Recruiter | hr@lumenx.edu | demo123 |

OTP for signup/verify flows: `123456`

After recruiter login, default hub: `/careers/recruiter`.

---

## 10. Testing checklist

- [ ] Job seeker: browse, filter, apply from job detail
- [ ] Recruiter: post job → lands on edit → save → appears on public board when open
- [ ] Recruiter: Edit from My jobs and Browse market (own listing badge)
- [ ] Careers home shows merged featured jobs including recruiter posts
- [ ] `/careers` loads without full Connect parent/teacher/student context
- [ ] `npm run dev:connect` starts without Vite config errors
