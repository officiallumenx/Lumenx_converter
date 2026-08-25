# 07 — Interactive Demos

Route: `/demos`  
Query: `?product=admin|connect|transport|nexus`

Demos exist so a principal can **see** the products without demo passwords. They are not the real apps.

## 1. Principles

- No authentication, no localStorage session from Admin/Connect.  
- No live institute data.  
- Clearly labelled **“Interactive preview”** — never “log in”.  
- Optional later: “Open full demo” deep-links via `VITE_*_ORIGIN` when those URLs are public.

## 2. Stage layout

Desktop: left rail (product list) + `DeviceFrame` (tablet for Admin/Nexus, phone for Connect/Transport).  
Mobile: product segmented control + phone frame.

`DeviceFrame` props: `device: "phone" | "tablet"`, `accent`, `title`.

## 3. What each stage shows (W1 — illustrative)

| Product | Panels (tabs inside frame) |
|---------|----------------------------|
| Admin | Command snapshot (KPIs), people list, attendance strip |
| Connect | Parent home (child switcher), attendance, fees due |
| Transport | Driver trip card, stop list, boarding counts |
| Nexus | Institute list, trial/subscription pill, module chips |

Keep each panel under ~80 lines. Stylized lists, not real tables from `@lumenx/ui-admin`.

## 4. Interaction budget

Allowed:

- Switch product  
- Switch inner tab  
- Toggle a mock attendance chip (visual only)  
- Switch mock child in Connect parent bar  

Not allowed:

- Forms that pretend to save to the real backend  
- Payments  
- File uploads  

## 5. Motion

Crossfade 200ms. Honour `prefers-reduced-motion`.

## 6. Accessibility

- Product switcher is a `tablist`  
- Frame `role="img"` is wrong — treat inner UI as real controls with names  
- Announce product change via visually hidden live region

## 7. W2+

Replace mock panels with short silent screen recordings (WebM) or iframe sandboxes of the real apps on a demo tenant. Recordings must not include real student names.
