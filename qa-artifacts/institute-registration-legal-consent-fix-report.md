# Institute Registration Legal Consent — Fix Report

**Date:** 2026-10-23  
**Scope:** Admin institute registration (`/signup`) legal documents + mandatory consent  
**Final status:** `PARTIAL — UI FIXED, SERVER-SIDE CONSENT OR LEGAL CONTENT NEEDS ATTENTION`

---

## Why the legal documents were not showing

The signup form already rendered links to `/terms`, `/privacy`, and `/cookies`, and those routes existed (`terms.tsx`, `privacy.tsx`, `cookies.tsx` using `@lumenx/legal`).

Unauthenticated navigation was gated in `apps/admin/src/routes/__root.tsx`:

- Only paths in `AUTH_ROUTES` (plus `/welcome`) were allowed without login.
- `/terms`, `/privacy`, and `/cookies` were **not** in that allow-list.
- Clicking a legal link navigated away from `/signup`, then the root guard redirected to `/welcome`, so documents appeared “missing” / unreachable during registration.
- Same-tab navigation also dropped multi-step form state (no draft persistence).

Consent checkbox UI existed but:

- Submit was not disabled when unchecked (only mobile grant gated the button).
- `runApiInstituteSignUp` did not assert `acceptTerms` before calling `submitRegistration`.

---

## Legal routes used

| Label | Route | Content source |
| --- | --- | --- |
| Privacy Policy | `/privacy` | `ADMIN_PRIVACY` from `@lumenx/legal` |
| Terms of Service | `/terms` | `ADMIN_TERMS` from `@lumenx/legal` (binding Admin user agreement) |
| Cookie Policy | `/cookies` | `COOKIE_POLICY` from `@lumenx/legal` |

Declared in `LEGAL_PUBLIC_ROUTES` / `SIGNUP_LEGAL_LINKS` (`apps/admin/src/auth/constants.ts`).  
Root guard uses `isUnauthenticatedAllowedPath()` so these routes no longer bounce to `/welcome`.

Links open with `target="_blank"` `rel="noopener noreferrer"` so the registration form stays mounted. Session draft persistence (`sessionStorage` + in-memory fallback) also covers same-tab return / refresh.

### Missing legal document

**No separate User Agreement** exists in `@lumenx/legal` or Admin routes.  
Terms of Service (`ADMIN_TERMS`) is the binding agreement for Admin. Consent copy states this explicitly. A separate `/user-agreement` page was **not** invented (would duplicate or fabricate legal claims).

---

## Consent validation behavior

1. Checkbox defaults to **unchecked** (`acceptTerms: false`).
2. Clicking a legal link does **not** set consent.
3. Step-4 validation shows:  
   `You must read and agree to the Privacy Policy, Terms of Service, and Cookie Policy before creating your account.`  
   (`role="alert"`, `aria-invalid`, `aria-describedby`, labeled via `htmlFor` / `signup-accept-legal-agreements`).
4. **Create account** is disabled while `!acceptTerms` (and while mobile OTP grant is missing in API mode).
5. `handleSubmit` re-validates consent and blocks submit if unchecked.
6. `AuthContext.signUp` throws if `!acceptTerms`.
7. `runApiInstituteSignUp` calls `assertSignupLegalConsent` **before** `submitRegistration`.
8. Unchecking after checking disables the button and fails validation again.

Nexus approval / `/pending-verification` behavior is unchanged. Consent does not approve an institute.

---

## Whether consent is recorded and where

| Layer | Recorded? | Details |
| --- | --- | --- |
| Client (session) | Yes, after success only | `recordSignupLegalConsent(email)` → key `lumenx.admin.signupLegalConsent.v1` (sessionStorage / memory). Cleared on registration failure. |
| Registration API payload | No | `InstituteRegistrationPayload` has no consent fields; `normalizeRegistrationPayload` would strip unknown keys. |
| Database / server validation | No | No consent column or server check on `POST /registrations`. Not added (no unauthorized schema/migration). |

**Attention still required:** durable server-side consent capture and enforcement if product/legal policy requires it.

---

## Files changed

| File | Change |
| --- | --- |
| `apps/admin/src/auth/constants.ts` | `LEGAL_PUBLIC_ROUTES`, `isUnauthenticatedAllowedPath`, `SIGNUP_LEGAL_LINKS` |
| `apps/admin/src/routes/__root.tsx` | Allow legal routes without auth; public shell for legal pages |
| `apps/admin/src/auth/signup-legal-consent.ts` | **New** — links helpers, assert/validate, draft + consent storage |
| `apps/admin/src/auth/signup-legal-consent.test.ts` | **New** — automated coverage for links, consent, draft, API gate |
| `apps/admin/src/auth/api-signup-flow.ts` | Enforce consent; record only after success |
| `apps/admin/src/auth/AuthContext.tsx` | Reject signup without `acceptTerms` |
| `apps/admin/src/auth/validation.ts` | Clearer consent error copy |
| `apps/admin/src/routes/signup.tsx` | Legal panel + links, a11y checkbox, disable submit, draft restore |
| `apps/admin/src/routes/terms.tsx` | Page title → “Terms of Service” |
| `qa-artifacts/institute-registration-legal-consent-fix-report.md` | This report |

---

## Actual test results

Commands (from `apps/admin`):

```text
npm test -- --run src/auth/signup-legal-consent.test.ts src/auth/api-registration-signup.test.ts
→ Test Files  2 passed (2)
→ Tests       21 passed (21)

npm run typecheck
→ exit 0

npx eslint src/auth/signup-legal-consent.ts src/auth/signup-legal-consent.test.ts \
  src/auth/api-signup-flow.ts src/auth/constants.ts src/auth/validation.ts \
  src/routes/signup.tsx src/routes/__root.tsx src/routes/terms.tsx
→ exit 0

git diff --check -- <changed files>
→ exit 0 (no whitespace errors)
```

Coverage mapped to requested cases:

| # | Case | Result |
| --- | --- | --- |
| 1 | Legal links + correct routes | PASS |
| 2 | Checkbox unchecked initially | PASS (validation / default `false`) |
| 3 | Cannot submit without consent | PASS (`runApiInstituteSignUp` + assert) |
| 4 | Visible validation message | PASS (message content + checkbox id for a11y) |
| 5 | Consent checked allows submit path | PASS |
| 6 | Uncheck blocks again | PASS |
| 7 | Form state preserved | PASS (draft save/load) |
| 8 | No consent record on submit failure | PASS |
| 9 | Consent recorded on success | PASS (client session record) |
| 10 | Existing registration signup tests | PASS (`api-registration-signup.test.ts` 7/7) |
| 11 | Keyboard / accessible labeling | PASS (stable checkbox id + label association; full RTL keyboard e2e not in suite) |

No real institute registrations were created. No production config, deploy, commit, or push.

---

## Remaining gaps

1. **Server-side consent** — not stored or validated on the registrations API; authorize a schema/API change if required.
2. **Separate User Agreement** — does not exist; Terms of Service is used. Add only with approved legal content.
3. Full React Testing Library keyboard traversal of the signup page was not added; labeling contracts are covered in unit tests.

---

## Final status

**`PARTIAL — UI FIXED, SERVER-SIDE CONSENT OR LEGAL CONTENT NEEDS ATTENTION`**

Legal links are reachable and visible; mandatory client consent is enforced end-to-end through UI + submit + API signup flow. Durable server-side consent recording and a separate User Agreement document remain open.
