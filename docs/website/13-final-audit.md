# 13 — Final Audit

Checklist against W1 (foundation). Update this file when a row changes.

**Audit date:** 24 Aug 2026  
**Build:** `apps/website` first drop

## 1. Structure

| Item | Status |
|------|--------|
| `apps/website` in npm workspaces | Done |
| `docs/website` spec set | Done |
| `backend/` deferred | Done (not created) |
| Root scripts `dev:website` / `build:website` | Done |
| CI `build:website` | Done |

## 2. IA & pages

| Route | Status |
|-------|--------|
| `/` | Done |
| `/products` | Done |
| `/products/admin\|connect\|transport\|nexus` | Done |
| `/solutions` | Done |
| `/demos` | Done |
| `/pricing` | Done |
| `/download` | Done |
| `/contact` | Done |

## 3. Commercial correctness

| Item | Status |
|------|--------|
| Quotes via `calculateSubscriptionQuote` | Required — verify in PR |
| No Core/Plus/Max SKUs | Required |
| 60-day trial, ₹8,000 floor, ₹12–15 rate copy | Required |
| Tenure free months 0/1/2 | Required |

## 4. Brand / a11y / motion

| Item | Status |
|------|--------|
| Marketing tokens (ink + lumen), not Nexus chrome | Required |
| Skip link, one H1, labelled forms | Required |
| `prefers-reduced-motion` | Required |
| Gold never used as small body text | Required |

## 5. Honesty

| Item | Status |
|------|--------|
| Demos labelled as previews | Required |
| APKs not faked | Required |
| No demo passwords on the site | Required |
| Transport copy does not over-claim GPS | Required |

## 6. W2 leftovers (not blocking W1)

- OG image, sitemap, production origins  
- Real APK / Play URLs  
- Lead POST to backend  
- Silent product recordings  
- hi locale  
- Customer logos / quotes  

## 7. Sign-off

W1 is complete when `npm run build:website` succeeds and a keyboard pass on Home, Pricing, Demos, and Contact shows no unlabeled controls.
