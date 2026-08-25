# 04 — Motion System

Motion should feel like **light**, not a consumer social app. Short, ease-out, no bounce on primary CTAs.

## 1. Tokens

| Name | Value |
|------|-------|
| `--ease-emph` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Duration enter | 280–400ms |
| Duration hover | 150–200ms |
| Duration page | Instant route swap + 200ms fade on hero only |

Do not copy Admin’s 340ms module-slide transitions — those are in-app navigation.

## 2. Allowed motions (W1)

1. **Header** — background opacity as you scroll (no hide-on-scroll; principals lose the CTA).  
2. **Hero** — opacity + 12px rise on first paint (`animate-entrance`).  
3. **Cards** — hover lift.  
4. **Demo stage** — crossfade panel 200ms when switching product.  
5. **Calculator** — number tween optional; W1 may snap. Prefer `tabular-nums`.  
6. **Mobile nav** — sheet from right (`@lumenx/ui` Sheet).

## 3. Disallowed

- Auto-playing video with sound  
- Infinite parallax that fights scroll  
- Confetti, streak flames, gamification  
- Layout shift from webfonts (use `display=swap`, preconnect)

## 4. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Demo auto-advance (if added in W2) must pause when reduced motion is on.

## 6. Immersive depth (W1.5)

See [14 — 3D experience master plan](./14-3d-experience-master-plan.md).

Allowed additions when `html.site-motion` and experience tier allow:

1. Multi-layer parallax via CSS variables (pointer / scroll) — subtle.  
2. SVG data-flow along ecosystem connectors.  
3. Perspective tilt on product cards (fine pointer only).  
4. Optional canvas particles on HIGH tier only, behind content.

Still disallowed: scroll-hijacking, custom cursor replacing OS pointer, neon overload, fighting orbit node centering transforms.


## 5. Page titles / loading

TanStack default pending: keep `defaultPendingMs` high enough that marketing pages don’t flash a spinner. Prefer preload on intent (header links).
