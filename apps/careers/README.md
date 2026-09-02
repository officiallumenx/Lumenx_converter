# LumenX Careers

Standalone hiring app — institute recruiter workspace and applicant job seeker portal.

## Dev

```bash
npm run dev:careers
```

Local: [http://localhost:5176](http://localhost:5176)  
Production: `https://careers.lumenx.app`

## Android (Capacitor)

```bash
npm run build:careers:capacitor
npm run cap:sync --workspace=@lumenx/app-careers
npm run cap:open:android --workspace=@lumenx/app-careers
```

App id: `com.lumenx.app.careers`

## Routes

Root paths (no `/careers` prefix):

| Audience | Examples |
|----------|----------|
| Applicant | `/`, `/jobs`, `/dashboard`, `/saved`, `/apply` |
| Institute | `/recruiter`, `/recruiter/jobs`, `/recruiter/applicants` |
| Admin handoff | `/setup-from-admin?handoff=…` |

Connect `/careers/*` hard-redirects to this app.

## Env

See `.env.example` — `VITE_CAREERS_ORIGIN`, API/Supabase vars for production module (Phase 1).
