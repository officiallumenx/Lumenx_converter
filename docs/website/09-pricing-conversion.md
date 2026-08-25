# 09 — Pricing & Conversion

Route: `/pricing`  
**Source of truth:** `packages/utils/src/subscription/policy.ts` + `pricing.ts`  
**Do not** publish Core / Plus / Max as commercial SKUs.

## 1. Public formula

```
monthlyPrice = max(minMonthly, activeStudents × assignedRate)
payable     = monthlyPrice × (durationMonths − freeMonths)
```

| Constant | Value | Public language |
|----------|-------|-----------------|
| Min monthly | ₹8,000 | Base subscription floor |
| Default rate | ₹12 / student | “Typical starting rate” |
| Normal band | ₹12–15 | Assigned by LumenX (Nexus); institutes cannot edit |
| Trial | 60 days | After the institute is approved |
| Grace | 7 days | After expiry, before read-only |
| Durations | 1 / 6 / 12 months | 0 / 0 / 2 free months respectively |

Public calculator uses **₹12** unless we later expose a “rate hint” query. Copy must say: *Your assigned rate is confirmed when you join; this estimate uses the standard ₹12 rate.*

## 2. Page structure

1. Formula in plain language  
2. `QuoteCalculator` (students input, tenure tabs, three quote cards)  
3. Worked example (400 students)  
4. Trial + grace  
5. What billing does **not** include (devices, SMS packs — if true)  
6. CTA → `/contact?intent=quote`

### Calculator UX

- Student count: number input, min 1, max 50,000, default 400  
- Tenure: Monthly · 6 months · Yearly  
- Each card: monthly price, free months, payable, “floor applied” note when `showAsBaseSubscription`  
- `tabular-nums`, INR `en-IN`  
- Call `calculateSubscriptionQuote` / `quoteAllDurations` — no hand-rolled math

### Worked example (keep in copy)

400 students × ₹12 = ₹4,800 → floor raises to **₹8,000 / month**.  
Yearly: 2 months free → payable = ₹8,000 × 10 = **₹80,000**.

## 3. Conversion intents

| Intent | Query | Form default |
|--------|-------|----------------|
| Trial | `?intent=trial` | Message prefill trial |
| Quote | `?intent=quote` | Prefill student count if `?students=` |
| Partnership | `?intent=partner` | Group / reseller |

Primary button label: **Start 60-day trial** (not “Sign up”).

## 4. Trust copy

- No public credit-card checkout on this site (W1). Payment happens inside Admin after approval (online coming soon / offline verification).  
- Read-only after grace is an operations fact — mention gently so buyers aren’t surprised.

## 5. What never appears

- Fake “popular” plan ribbons  
- USD-only prices  
- Discount codes  
- Per-module price list
