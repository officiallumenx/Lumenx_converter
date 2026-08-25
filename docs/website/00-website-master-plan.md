# 00 — LumenX Website Master Plan

**Status:** Spec for `apps/website`  
**Audience:** Product, design, engineering  
**Depends on:** [LumenX Master](../LUMENX_MASTER.md), live commercial policy in `@lumenx/utils/subscription`

---

## 1. Purpose

`apps/website` is the public face of the LumenX ecosystem. It is not an operations console. It exists to:

1. Explain the four products (Admin, Connect, Transport, Nexus) as one platform.
2. Let an institute principal or group operator understand pricing in under two minutes.
3. Convert: start a 60-day trial, request a quote, or download the Android apps.
4. Let visitors *feel* the products through interactive demos — without a login.

Backend (`backend/`) is out of scope. Lead capture, APK hosting, and analytics stay client-side or placeholder until that layer exists.

---

## 2. What this site is / is not

| Is | Is not |
|----|--------|
| Marketing + conversion site | A fifth operations app |
| Public, indexable, SSR | Capacitor / Android wrapper |
| Shared `@lumenx/ui` primitives + a marketing skin | A fork of Admin or Nexus chrome |
| Quotes from the **live** subscription policy | Core / Plus / Max SKUs (those are internal module gates, not public plans) |

Internal plan names (`lumenx.plan.core|plus|max`) still gate modules inside Nexus. The **website never sells three plan cards**. Commercial pricing is per-student + monthly floor. See [09-pricing-conversion](./09-pricing-conversion.md).

---

## 3. Primary audiences

| Audience | Job to be done | Landing emphasis |
|----------|----------------|------------------|
| Institute principal / admin | Replace spreadsheets and WhatsApp with one ops console | Admin + pricing calculator |
| Group / trust operator | Multi-institute control, licensing, SLA | Nexus |
| Parent (secondary) | Trust that the school’s parent app is real | Connect + Transport tracking |
| Driver coordinator (secondary) | Dedicated driver app, not a portal leftover | Transport |
| Teacher (secondary) | Attendance and class work on phone | Connect |

Primary conversion persona: **principal of a 200–2,000 student school in India**.

---

## 4. Information architecture

```
/                     Homepage
/products             Suite overview
/products/admin       LumenX Admin
/products/connect     LumenX Connect
/products/transport   LumenX Transport
/products/nexus       LumenX Nexus
/solutions            Audiences + modules as outcomes
/demos                Interactive product stages
/pricing              Calculator + trial + tenure
/download             Web apps + Android downloads
/contact              Trial / quote / partnership
```

Global chrome: logo, Products, Solutions, Demos, Pricing, Download, **Start trial**.

---

## 5. Success metrics (launch)

| Metric | Target |
|--------|--------|
| LCP (homepage, 4G mid-tier) | < 2.5s |
| Pricing calculator usable without JS failure | SSR HTML still explains the formula |
| Primary CTA click → `/contact` or `/pricing` | Track when analytics lands |
| Demo interaction (product tab change) | Proof of “show, don’t tell” |
| Accessibility | WCAG 2.2 AA on chrome, forms, contrast |

---

## 6. Implementation phases

| Phase | Outcome |
|-------|---------|
| **W1 — Foundation (this drop)** | App in monorepo, IA, brand, homepage, product pages, calculator, demos, download, contact |
| **W2 — Depth** | Real screenshots / recorded loops, APK artifact URLs, sitemap + OG images |
| **W3 — Conversion** | Backend lead inbox, CRM, analytics, A/B on hero |
| **W4 — Localization** | en-IN first; hi later |

---

## 7. Repo placement

```
apps/website/          # @lumenx/app-website
docs/website/          # this spec set
backend/               # later — not created here
```

Workspace scripts: `npm run dev:website`, `npm run build:website`.

---

## 8. Document map

| Doc | Owns |
|-----|------|
| [01 Discovery & architecture](./01-discovery-architecture.md) | Stack, routes, SSR, content model |
| [02 Brand & visual system](./02-brand-visual-system.md) | Marketing tokens vs product accents |
| [03 Design system](./03-design-system.md) | Layout, components, density |
| [04 Motion system](./04-motion-system.md) | Motion language + reduced motion |
| [05 Homepage](./05-homepage.md) | Sections and copy |
| [06 Product pages](./06-product-pages.md) | Four product narratives |
| [07 Interactive demos](./07-interactive-demos.md) | Device stages, no auth |
| [08 Solutions & features](./08-solutions-features.md) | Audiences and modules |
| [09 Pricing & conversion](./09-pricing-conversion.md) | Live commercial policy |
| [10 Download center](./10-download-center.md) | Web + Android |
| [11 Responsive & a11y](./11-responsive-accessibility.md) | Breakpoints, WCAG |
| [12 Performance & SEO](./12-performance-seo.md) | CWV, meta, sitemap |
| [13 Final audit](./13-final-audit.md) | Launch checklist vs current build |
| [14 3D / motion experience](./14-3d-experience-master-plan.md) | Immersive CSS/SVG depth, tiers, hero ecosystem |

---

## 9. Experience upgrade (W1.5)

Premium immersion is an **enhancement layer** on the existing site — not a rebuild.

- **Stack:** CSS 3D + SVG data-flow + lightweight hooks (no Three.js / Framer / GSAP in current phase).  
- **Gate:** Existing `html.site-motion` + automatic `data-experience` tiers.  
- **Spec:** [14 — 3D experience master plan](./14-3d-experience-master-plan.md).  
