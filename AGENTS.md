<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

---

# LumenX Engineering & Agent Guidelines

## 1. What LumenX Is
LumenX is a multi-tenant education management and operations platform for schools and educational institutions. It is structured as an **npm workspaces monorepo** containing React 19/TanStack frontends, a **Hono TypeScript API** (`backend/`, `@lumenx/api`), **Supabase PostgreSQL** (107 migrations, RLS, Storage, Realtime), **Firebase Cloud Messaging (FCM)**, **Cloudflare Workers/Pages** for web hosting, and **Capacitor/Electron** for native Android and Windows distribution.

---

## 2. Complete Product Ecosystem
- **LumenX Admin (`apps/admin`):** School administration console (students, faculty, attendance, fees, exams, timetable, transport, settings).
- **LumenX Nexus (`apps/nexus`):** Platform control plane (school registrations, licensing, subscriptions, operators, platform templates, audit).
- **LumenX Connect (`apps/connect`):** Multi-role portal for parents, teachers, learners, and activity/sports workspace with live bus tracking.
- **LumenX Transport (`apps/transport`):** Driver application with offline outbox, GPS tracking engine, and student boarding checklists.
- **LumenX Admissions (`apps/admissions`):** Standalone public applicant portal for school admissions.
- **LumenX Careers (`apps/careers`):** Standalone institutional recruitment and faculty hiring portal.
- **LumenX Website (`apps/website`):** Public marketing site built for Cloudflare Pages (`lumenx-website`), pricing calculator, and download center.
- **LumenX Backend API (`backend/`):** Hono REST API, actor authorization, FCM outbox worker, and PostgreSQL repository.
- **Desktop Shells (`apps/admin-desktop`, `apps/nexus-desktop`):** Electron Windows NSIS installers.
- **Downloads Host (`apps/downloads-host`):** Cloudflare Worker serving compiled APK and EXE binaries.

---

## 3. Important Architectural Rules & Invariants
1. **Never Expose Service-Role Keys to Frontends:** Frontends must **never** hold `SUPABASE_SERVICE_ROLE_KEY`. All privileged operations, cross-table mutations, and subscription gates must pass through `@lumenx/api`.
2. **Strict Multi-Tenant Scoping:** Every institutional query and database mutation must be scoped by `institute_id`.
3. **Actor Identity Resolution:** The Hono API verifies Bearer JWTs, extracts the caller's profile ID, and validates active institutional memberships before executing business logic.
4. **Subscription Write-Gating:** All mutating backend endpoints must verify that the target institute's subscription is not in `read_only` or `expired` state via `assertSubscriptionWritable`.
5. **Idempotency on Critical Endpoints:** Boarding actions, fee receipts, and telemetry pings must supply client-generated UUIDs (`client_event_id`) to prevent duplicate writes during network retries.

---

## 4. Database & RLS Conventions
- **Migrations:** Managed in `supabase/migrations/` using versioned timestamp prefixes (e.g. `20261101140000_*.sql`).
- **Row-Level Security (RLS):** Enabled on all tenant tables. Policies evaluate `auth.uid()` against `user_membership` or parent-child joins.
- **Security-Invoker Views:** All views must declare `WITH (security_invoker = true)` to inherit the calling user's RLS constraints.
- **Foreign Keys:** Cascading deletes are restricted to intra-tenant child records. Root entities enforce `ON DELETE RESTRICT`.

---

## 5. Development, Test & Build Commands
On Windows PowerShell, use `npm.cmd` rather than `npm` to adhere to script execution policies:

```bash
# ── Verification & Tests ──
npm.cmd run test:connect                           # Run Connect test suite (228 tests)
npm.cmd run test --workspace=@lumenx/app-transport # Run Transport test suite (120 tests)
npm.cmd run test --workspace=@lumenx/app-nexus     # Run Nexus test suite (51 tests)
npm.cmd run test --workspace=@lumenx/app-admissions# Run Admissions test suite (33 tests)
npm.cmd --prefix backend run test                  # Run Backend API test suite (1,176 tests)

# ── Local Development ──
npm.cmd run dev:connect                            # Start Connect dev server
npm.cmd run dev:admin                              # Start Admin dev server
npm.cmd run dev:nexus                              # Start Nexus dev server
npm.cmd run dev:transport                          # Start Transport dev server
npm.cmd run dev:api                                # Start Backend API server (port 3001)

# ── Typecheck & Builds ──
npm.cmd run typecheck                              # Monorepo typecheck
npm.cmd run build                                  # Build all apps for Cloudflare Workers
npm.cmd run build:connect:capacitor                # Build Connect for Android
npm.cmd run dist:admin-desktop                     # Package Admin Windows installer (.exe)
```

---

## 6. Deployment Boundaries
- **Cloudflare Workers:** Edge SSR and static bundle serving for `admin`, `nexus`, `connect`, `transport`, `admissions`, `careers`, `downloads-host`, `legal-host`.
- **Cloudflare Pages:** Public marketing website (`lumenx-website`).
- **Railway:** Backend API container (`@lumenx/api`).
- **Supabase Cloud:** PostgreSQL 15+, Supabase Auth, Storage Buckets, and Realtime WebSocket channels.
- **Google Firebase:** Cloud Messaging (FCM) HTTP v1 API.

---

## 7. Documentation Locations
Canonical technical audit documents are preserved under `docs/antigravity-audit/`:
- [Master Index](docs/antigravity-audit/MASTER_INDEX.md)
- [Executive Summary](docs/antigravity-audit/00_EXECUTIVE_SUMMARY.md)
- [Complete Product Ecosystem](docs/antigravity-audit/02_COMPLETE_PRODUCT_ECOSYSTEM.md)
- [System Architecture](docs/antigravity-audit/05_SYSTEM_ARCHITECTURE.md)
- [Database Architecture](docs/antigravity-audit/06_DATABASE_ARCHITECTURE.md)
- [API Inventory](docs/antigravity-audit/08_API_INVENTORY.md)
- [Testing and QA Audit](docs/antigravity-audit/21_TESTING_AND_QA.md)
- [Technical Debt & Roadmap](docs/antigravity-audit/23_TECHNICAL_DEBT_AND_ROADMAP.md)
