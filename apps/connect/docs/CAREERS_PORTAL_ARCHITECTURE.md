# LumenX Connect — Careers Portal Architecture

Public, mobile-first careers zone at `/careers/*`. Isolated from Teacher, Student, Parent, and Admissions portals.

## Do not modify

- Teacher / Student / Parent portals and `AppShell`
- `/admissions/*` and `admissions-portal/`
- Connect theme tokens, global nav, or existing login workflow (additive link only)

## Isolation

- **No `AppShell`** — candidates are not institute `Role` users
- **Separate session** — `CAREERS_STORAGE_KEYS` in `@lumenx/auth`
- **Module folder** — `src/careers-portal/`
- **Data layer** — `src/lib/careers/`

## Routes

| Path | Access | Feature |
|------|--------|---------|
| `/careers` | Public | Home |
| `/careers/jobs` | Public | Open positions (multi-institute filters) |
| `/careers/jobs/$jobId` | Public | Job detail |
| `/careers/faq` | Public | FAQs |
| `/careers/contact` | Public | Contact HR |
| `/careers/login` | Public | Sign in |
| `/careers/signup` | Public | Sign up |
| `/careers/forgot-password` | Public | Reset password |
| `/careers/apply` | Auth | 6-step application wizard |
| `/careers/applications` | Auth | My applications |
| `/careers/applications/$id` | Auth | Application detail |
| `/careers/interviews` | Auth | Interview schedule |
| `/careers/documents` | Auth | Document center |
| `/careers/notifications` | Auth | Notifications |
| `/careers/dashboard` | Auth | Candidate hub |
| `/careers/saved` | Auth | Saved jobs |
| `/careers/institutes` | Public | Institute directory |
| `/careers/institutes/$instituteId` | Public | Institute career page |
| `/careers/profile` | Auth | Profile |
| `/careers/settings` | Auth | Settings |

## Application statuses

`draft` → `submitted` → `under_review` → `shortlisted` → `interview_scheduled` → `selected` | `rejected` | `on_hold`

## Interview modes

`in_person` | `phone` | `video`

## Document statuses

`uploaded` | `under_review` | `verified` | `rejected` | `requires_resubmission`

## Job categories

Academic Faculty, Sports Faculty, Lab Faculty, Administrator, Accountant, Admissions Officer, Transport Staff, Support Staff

## Design system

Reuses `@lumenx/ui`, `styles.css`, `SectionCard`, `PhoneInput`, `StatCard`. Theme: light / dark / system (default light).

## Demo credentials

- OTP: `123456` (`DEMO_CONNECT_OTP`)
- Candidate: `priya.candidate@example.com` / `demo123`

## Entry from Connect login

Additive link on `/login` institute step → `/careers`
