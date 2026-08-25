# 12 — Performance & SEO

## 1. Performance budget (W1)

| Item | Budget |
|------|--------|
| JS (gzip, homepage) | Stay lean: no Recharts, no Capacitor, no ui-admin |
| Fonts | DM Sans + JetBrains Mono, `preconnect`, `display=swap`, two weights max in the URL |
| Images | SVG logo only; no hero raster |
| LCP | Hero headline (text) — good |
| CLS | Reserve device-frame min-height |

Lucide: import icons by name (tree-shake).

## 2. SSR

All IA routes SSR. Demos hydrate; first HTML should include the default stage (Connect parent home) so crawlers see content.

## 3. Metadata

Per route `head()`:

- `title` unique, `{Page} — LumenX`  
- `description` 140–160 chars  
- `og:title`, `og:description`  
- `og:image` W2 (static `public/og.png`)  
- Canonical host W2 when domain exists  

Root default description: *LumenX is the institute platform for administration, families, and transport.*

## 4. Sitemap / robots (W2)

`/sitemap.xml` and `/robots.txt` via Start server routes when the public domain is known. W1: noindex optional on preview Workers.

## 5. Analytics

None in W1. When added: consent-friendly, no PII in events. Do not send calculator student counts to third parties.

## 6. Security headers (Workers)

When wrangler is productionized: `Referrer-Policy`, `X-Content-Type-Options`, CSP allowing Google Fonts. Forms POST only to own origin.

## 7. SEO content

- Unique H1 and intro on every product page (not identical boilerplate)  
- Internal links: homepage ↔ products ↔ pricing ↔ contact  
- Do not keyword-stuff “best school ERP”
