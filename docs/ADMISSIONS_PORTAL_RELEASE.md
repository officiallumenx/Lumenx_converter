# Admissions Portal — Implementation & Changelog

**App:** `apps/admissions` (standalone Vite app, default port **5177**)  
**Theme:** Isolated from Connect; own auth session, shell, and nav. Connect redirects to Admissions via `VITE_ADMISSIONS_ORIGIN`.

**Auth modes:**
- `VITE_ADMISSIONS_AUTH_MODE=demo` — localStorage + demo accounts
- `VITE_ADMISSIONS_AUTH_MODE=api` — Supabase + `/api/v1/admissions/*` REST

---

## 1. Connect hard redirect

Connect no longer embeds Admissions routes. All `/admissions/*` paths redirect to the standalone app:

| Connect route | Redirect target |
|---------------|-----------------|
| `/admissions` | `{VITE_ADMISSIONS_ORIGIN}/` |
| `/admissions/*` | `{VITE_ADMISSIONS_ORIGIN}/*` (splat preserved) |

Implementation mirrors Careers:

- `apps/connect/src/lib/admissions-origin.ts` — origin helper (default `localhost:5177`)
- `apps/connect/src/routes/admissions.tsx` — root redirect
- `apps/connect/src/routes/admissions/$.tsx` — splat redirect

Set `VITE_ADMISSIONS_ORIGIN` in `apps/connect/.env` for production (e.g. `https://admissions.lumenx.app`).

Admin can still open `/admissions/setup-from-admin` on Connect; Connect forwards to the standalone app with query/hash intact.

---

## 2. Routes (standalone app)

### Public / applicant

| Route | Page |
|-------|------|
| `/` | Admissions home |
| `/programs` | Program catalog |
| `/programs/$programId` | Program detail |
| `/apply` | Multi-step apply wizard |
| `/login`, `/signup` | Auth |
| `/dashboard` | Applicant dashboard |
| `/applications` | My applications |
| `/documents` | Document center |
| `/notifications` | Notifications |
| `/profile`, `/settings` | Profile & settings |

### Institute admin

| Route | Page |
|-------|------|
| `/institute` | Institute dashboard |
| `/institute/applications` | Application pipeline |
| `/institute/openings` | Openings management |
| `/institute/form` | Custom form builder |
| `/institute/settings` | Institute settings |
| `/setup-from-admin` | Admin handoff entry |

---

## 3. API wiring (API auth mode)

REST client: `apps/admissions/src/lib/admissions/api.ts`

| Feature | Endpoints |
|---------|-----------|
| Programs | `GET/POST/PATCH/DELETE /admissions/programs` |
| Openings | `GET/POST/PATCH/DELETE /admissions/openings` |
| Applications | `GET/POST /admissions/applications`, `POST .../transition` |
| Documents | `GET/POST/PATCH /admissions/applications/:id/documents` |
| Convert to student | `POST /admissions/applications/:id/convert-to-student` |

Demo mode uses `repositories.ts` and localStorage.

---

## 4. Admin bridge

Admin Admissions (`apps/admin/src/routes/admissions.tsx`) in API mode:

- Lists applications, programs, and openings from the API
- **Convert to student** resolves the selected row from `listView.items` (not demo sync)
- Detail for convert dialog: `getAdmissionApplication` + `listAdmissionDocuments` → `admissionApplicationDtoToAdminDetail`

Open Admissions from Admin via `openAdmissionsFromAdmin()` — Connect redirect or direct origin depending on link target.

---

## 5. Dev commands

```bash
npm run dev:admissions    # port 5177
npm run build:admissions
npm test --workspace=@lumenx/app-admissions
```

Run alongside Connect (5174), Admin (5173), and Careers (5176) for full monorepo local dev.

---

## 6. Environment

**Connect** (`apps/connect/.env`):

```env
VITE_ADMISSIONS_ORIGIN=http://localhost:5177
```

**Admissions** (`apps/admissions/.env`):

```env
VITE_ADMISSIONS_AUTH_MODE=demo
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 7. Testing checklist

- [ ] Connect `/admissions` redirects to standalone app on 5177
- [ ] Connect `/admissions/institute/applications` preserves path after redirect
- [ ] Applicant: browse programs, apply, track applications
- [ ] Institute: review pipeline, approve/reject
- [ ] Admin API mode: list loads; convert dialog prefills from API application payload
- [ ] Admin handoff: `setup-from-admin` from Connect lands in institute workspace
