# 01 — Discovery & Architecture

## 1. Role in the monorepo

`apps/website` is a TanStack Start app, same family as Admin / Connect / Nexus / Transport.

| Concern | Decision |
|---------|----------|
| Package name | `@lumenx/app-website` |
| Path | `apps/website/` |
| Capacitor | **No** — public web only |
| Shared UI | `@lumenx/ui` (primitives). Do **not** pull `@lumenx/ui-admin` shell/sidebar. |
| Commercial math | `@lumenx/utils` subscription helpers — never re-implement quotes |
| Auth | None. Contact form is local until `backend/` |
| Deploy | Cloudflare Workers (`wrangler.jsonc`), Worker name `lumenx-website` |

## 2. Stack (must match sibling apps)

- React 19, TypeScript, Vite 7
- TanStack Start + TanStack Router (file routes in `src/routes/`)
- TanStack Query (light use: none required at W1)
- Tailwind CSS 4 + `tw-animate-css`
- `@lovable.dev/vite-tanstack-config`
- `ssr.noExternal: [/^@lumenx\//]`

Entry files (copy the proven pattern from Nexus, minus admin chrome):

- `src/server.ts` — Worker fetch + branded 500
- `src/start.ts` — error middleware
- `src/router.tsx` — `getRouter()`, scroll restoration, intent preload
- `src/routes/__root.tsx` — `html[data-app="website"]`, fonts, CSS

## 3. Route table

| File | Path |
|------|------|
| `index.tsx` | `/` |
| `products.index.tsx` | `/products` |
| `products.$slug.tsx` | `/products/$slug` (`admin` \| `connect` \| `transport` \| `nexus`) |
| `solutions.tsx` | `/solutions` |
| `demos.tsx` | `/demos` |
| `pricing.tsx` | `/pricing` |
| `download.tsx` | `/download` |
| `contact.tsx` | `/contact` |

Unknown `$slug` → 404. Titles: `{Page} — LumenX` (see Master §8.3; website is the ecosystem name, not a product wordmark).

## 4. Content model

All marketing copy and product facts live in `src/content/` as typed modules — not scattered JSX strings.

```
src/content/
  nav.ts            # header/footer links
  products.ts       # four products: slug, tagline, users, capabilities
  downloads.ts      # web URLs + APK placeholders
  modules.ts        # module catalog for Solutions
```

Pricing numbers **must** import from `@lumenx/utils` (`SUBSCRIPTION_POLICY`, `calculateSubscriptionQuote`, `quoteAllDurations`). If policy changes, the site changes.

## 5. Environment

W1: no `.env` required.

Later:

| Variable | Use |
|----------|-----|
| `VITE_ADMIN_ORIGIN` | Deep-link to demo Admin |
| `VITE_CONNECT_ORIGIN` | Deep-link to demo Connect |
| `VITE_TRANSPORT_ORIGIN` | Deep-link to demo Transport |
| `VITE_NEXUS_ORIGIN` | Deep-link to demo Nexus |
| `VITE_LEAD_ENDPOINT` | POST contact form |

Until those exist, “Open live demo” buttons go to `/demos` (in-site stages) rather than broken origins.

## 6. Boundaries

- Do not import Admin/Connect route modules or stores. Demos are **illustrative UI**, not the real apps.
- Do not expose demo passwords on the website.
- Do not invent Core/Plus/Max prices.
- `backend/` is not created in W1.

## 7. Caching / SSR

- Default: SSR all marketing pages (SEO).
- Calculator: hydrate; formula is also visible as static text.
- Demos: client-only interaction inside a device frame; first paint shows the default stage.
