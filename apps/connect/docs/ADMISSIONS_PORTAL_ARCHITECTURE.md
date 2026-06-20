# LumenX Connect — Admissions Portal Architecture

Public, mobile-first admissions zone at `/admissions/*`. Isolated from Teacher, Student, and Parent portals.

## Isolation

- **No `AppShell`** — applicants are not institute `Role` users
- **Separate session** — `ADMISSIONS_STORAGE_KEYS` in `@lumenx/auth`
- **Module folder** — `src/admissions-portal/` (mirrors `teacher-portal/`)
- **Data layer** — `src/lib/admissions/`

## Routes

| Path | Access | Feature |
|------|--------|---------|
| `/admissions` | Public | Home |
| `/admissions/programs` | Public | Programs |
| `/admissions/faq` | Public | FAQs |
| `/admissions/contact` | Public | Contact |
| `/admissions/login` | Public | Sign in |
| `/admissions/signup` | Public | Sign up |
| `/admissions/forgot-password` | Public | Reset password |
| `/admissions/apply` | Auth | 8-step wizard |
| `/admissions/applications` | Auth | My applications |
| `/admissions/applications/$id` | Auth | Status detail |
| `/admissions/documents` | Auth | Document center |
| `/admissions/notifications` | Auth | Notifications |
| `/admissions/profile` | Auth | Profile |
| `/admissions/settings` | Auth | Settings |

## Design system

Reuses `@lumenx/ui`, `styles.css`, `SectionCard`, `PhoneInput`. No new theme tokens.

## Status mapping (Connect ↔ Admin)

| Connect status | Admin stage |
|----------------|-------------|
| draft | local |
| submitted | review |
| under_review | review |
| document_verification | verification |
| interview_scheduled | interview |
| approved | approved |
| rejected | terminal |
| waitlisted | waitlist |

## Demo credentials

- OTP: `123456` (from `DEMO_CONNECT_OTP`)
- Password: any 6+ chars on signup; demo accounts use stored hash

## Entry from Connect login

Additive link on `/login` institute step → `/admissions`
