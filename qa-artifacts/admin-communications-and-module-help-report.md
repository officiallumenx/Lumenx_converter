# LumenX Admin — Communications Redesign & Universal Module Help

**Date:** 2026-10-23  
**Status:** PARTIAL  
**Scope:** Admin Communications Send consolidation, Messages recipient targeting, universal ModuleHero help  
**Constraints honored:** no staging env, no remote migrations, no prod data changes, no deploy/commit/push

---

## Summary

Communications nav now exposes **Send** instead of separate Announcements/Alerts entries. Notifications is inbox-only (legacy `?tab=broadcast` redirects to `/send`). Messages compose supports multi-select + class/section targeting via existing recipient APIs. Every ModuleHero that should have help gets a registry-backed info modal.

Code-level tests for the new contracts pass. Admin typecheck still reports pre-existing hub `view: any` errors. Full Admin eslint has pre-existing errors outside this change set. Live browser/DB verification was **not** performed.

---

## Files changed (primary)

### Communications / Send
- `apps/admin/src/routes/send.tsx` — new Send module (Category → Announcements | Alerts)
- `apps/admin/src/components/send/AnnouncementSendForm.tsx` — announcement create/publish/schedule
- `apps/admin/src/components/send/AlertSendForm.tsx` — `broadcastSchoolAlert` contract
- `apps/admin/src/lib/communications/send-category.ts` (+ tests)
- `apps/admin/src/lib/communications/nav-contract.test.ts`
- `apps/admin/src/components/send/send-forms.behavior.test.ts`
- `apps/admin/src/lib/admin-nav.ts` — Communications: Notifications, Messages, **Send**, Complaints
- `apps/admin/src/lib/admin-module-labels.ts` — `send`
- `apps/admin/src/lib/admin-module-colors.ts` — `/send`
- `apps/admin/src/lib/admin-plan-config.ts` — catalog entry `send`
- `apps/admin/src/routes/notifications.tsx` — inbox only; redirect broadcast/send tabs → `/send`
- `apps/admin/src/routes/announcements.tsx` — New → `/send?category=announcements`; history retained
- `apps/admin/src/routes/alerts.tsx` — broadcast panel removed from API page; link to Send; rules retained
- `apps/admin/src/routeTree.gen.ts` — regenerated with `/send`

### Messages recipient targeting
- `apps/admin/src/lib/messages/recipient-targeting.ts` (+ tests)
- `apps/admin/src/lib/messages/compose-multi-send.ts` (+ tests)
- `apps/admin/src/components/messages/MessageRecipientPicker.tsx`
- `apps/admin/src/routes/messages.tsx` — multi-recipient direct send + class group mode

### Module help
- `apps/admin/src/lib/module-help/types.ts`, `registry.ts`, `index.ts`, `registry.coverage.test.ts`
- `apps/admin/src/components/module-help/ModuleHelpButton.tsx`, `ModuleHelpModal.tsx`, `ModuleHelpControl.tsx`
- `apps/admin/src/components/module-shell/ModuleHero.tsx` — optional `helpKey`
- `apps/admin/src/styles.css` — help button + always-visible action / `--has-help` grid
- ~50 route/component files — `helpKey="…"` on `ModuleHero`
- `apps/admin/scripts/inject-module-help-keys.mjs` — one-shot injector (dev utility)

---

## 1. Communications navigation

| Before | After |
|--------|--------|
| Notifications, Messages, Announcements, Alerts, Complaints | Notifications, Messages, **Send**, Complaints |

- `/announcements` and `/alerts` remain as history/management routes (not in nav).
- Plan catalog keeps announcements/alerts for gating; adds `send` (minPlan: plus).

---

## 2. Send category → API contracts

| Category | UI form | Existing contract |
|----------|---------|-------------------|
| Announcements | `AnnouncementSendForm` | `createAnnouncement` (publish/schedule/draft, audience scopes, class/section) |
| Alerts | `AlertSendForm` | `broadcastSchoolAlert` (severity, category, audience, optional student) |

Field order on Send page: **Category →** (form: Title → Body → Audience → Send).  
Duplicate submit ignored while `sending`. Validation/loading/success/failure via existing toast patterns.  
No silent generic notification fallback when a category-specific path is required.

Compatible redirects:
- `/notifications?tab=broadcast` or `?tab=send` → `/send`
- Announcements “New” → `/send?category=announcements`
- Alerts banner → `/send?category=alerts`

---

## 3. Messages recipient targeting

- Reuses `listMessageRecipients`, `createDirectThread`, `createGroupThread` (no new backend APIs).
- Picker: role filter, search, class/section filters, select-all filtered, class/section bulk add with **explicit** student vs parent audience.
- Parents filtered by class via student `linkedParentUserIds` (API attaches class labels on students only).
- Dedupe by stable `userId`; resolved count shown before send.
- Multi-direct send loops `createDirectThread` (server authorizes each counterpart); partial failures summarized in toast.
- Class group thread mode preserved.

**Backend/schema:** none required for this work.

---

## 4. Module inventory & help coverage

- Registry keys cover all `adminNav` modules except `/` and `/analytics` (no ModuleHero), plus history pages (announcements, alerts), institute, setup.
- Coverage test asserts: complete content, nav coverage, `helpKey` integration in routes/components.
- Modal: `@lumenx/ui-admin` `Modal` size `xl`, Escape-to-close, scrollable body, three sections.
- Icon: stopPropagation / preventDefault; visible on mobile via `--has-help` grid.

---

## 5. Tests & tooling results (actual)

### Code-level (ran)

```
apps/admin: vitest — 8 files / 24 tests PASS
  - communications send-category, nav-contract
  - send-forms.behavior
  - messages recipient-targeting, compose-multi-send
  - module-help registry.coverage + content contract
  - admin-navigation-contract
```

### Backend messages tests
- No `src/domains/messages` vitest files found (exit 1 / no tests) — not a regression from this change.

### Typecheck (`apps/admin` `tsc --noEmit`)
- **14 errors** remain, all hub `Route.useSearch().view` typed as `any` indexing title maps:
  - `academic-management`, `documents`, `fees`, `templates`, `transport`
- Confirmed **pre-existing** vs helpKey-only change (same errors with original `academic-management.tsx` contents).
- No errors in Send/module-help/messages change files after ModuleHero fix.

### Lint (`apps/admin` `eslint .`)
- **10 errors, 115 warnings** repo-wide (pre-existing pattern).
- Targeted eslint on changed Communications/help paths: **clean (exit 0)**.

### `git diff --check`
- Pass (exit 0); CRLF warnings only on unrelated files.

### API / Admin production build
- Not completed in this pass (timeboxed). Recommend local `apps/admin` / `backend` build before release.

### Live verification
- **Not run:** browser UI, institute auth, real announcement/alert delivery, message recipient authorization against live DB.

---

## Unverified / remaining blockers

1. Live Send flows (announcement publish + school alert broadcast) against a real institute.
2. Live Messages multi-recipient / class-section parent resolution against production-like data.
3. Full Admin typecheck green blocked by pre-existing hub search typing (`view: any`).
4. Full Admin eslint green blocked by pre-existing errors outside this diff.
5. Confirm plan gating for Send vs Alerts (Send is `plus`; alerts historically `max`) in product policy.
6. `AlertsBroadcastPanel` still exists in codebase for potential reuse but is no longer mounted on `/alerts` API page — history of recent broadcasts is not duplicated on `/alerts` after panel removal (Send success still links to `/alerts`).

---

## Verdict

**PARTIAL** — Implementation and focused unit coverage are in place; navigation/contracts match the brief; live delivery and full-repo typecheck/lint cleanliness are not verified/cleared.
