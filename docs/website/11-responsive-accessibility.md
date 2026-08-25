# 11 — Responsive & Accessibility

## 1. Breakpoints

Align with Tailwind defaults used across apps:

| Token | Width | Website layout |
|-------|-------|----------------|
| base | 0 | Single column, hamburger, phone demo |
| sm | 640 | Product grid 2 |
| md | 768 | Header may still collapse (busy nav) |
| lg | 1024 | Full nav, hero split, tablet demos |
| xl | 1280 | Max width 72rem centered |

Touch: all tap targets ≥ 44px in header, calculator steppers, demo tabs.

## 2. Header

- `< lg`: logo + Start trial + menu button  
- `≥ lg`: full links  
- Menu: `Sheet` with the same links, focus trap, Esc to close  

## 3. Typography & zoom

Honor `@lumenx/ui` text scale if `TypographyProvider` is mounted. Body must remain readable at 200% zoom without clipping primary CTAs.

## 4. Color contrast

Ink on paper and ink on gold must meet WCAG 2.2 AA. Gold-on-white text is **not** allowed for body copy — gold is fill, ink is text. Muted foreground vs paper must stay ≥ 4.5:1.

## 5. Semantics

- One `h1` per page  
- Landmark: `header`, `main`, `footer`, skip link  
- Calculator: `fieldset` / `legend` for tenure  
- Contact: associated `label`s, `autocomplete` attributes  

## 6. Keyboard

- All nav and calculator controls reachable  
- Demo tabs: arrow keys inside tablist  
- No keyboard trap except modal sheet  

## 7. Content

- Language `en` (en-IN copy, `lang="en"`)  
- INR amounts also in text, not color alone (“floor applied” label)  
- Motion: see [04](./04-motion-system.md)

## 8. Testing (W1)

- Keyboard pass on `/`, `/pricing`, `/demos`, `/contact`  
- axe or browser a11y on those four  
- iPhone SE width and 1440px desktop
