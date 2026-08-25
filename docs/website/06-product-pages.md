# 06 — Product Pages

Route: `/products` (suite) and `/products/$slug`

Shared template: product hero (accent tint) → who it’s for → capabilities → how it connects → demo CTA → download/web CTA.

Unknown slug: 404.

---

## 1. Suite (`/products`)

Intro: four products, one platform. Table or cards repeating homepage but with **primary users** and **does not replace** lines.

| Product | Replaces | Does not replace |
|---------|----------|------------------|
| Admin | Spreadsheets, office WhatsApp groups | Parent-facing app |
| Connect | Separate parent / teacher / student apps | Institute configuration |
| Transport | Driver WhatsApp + paper manifests | Fee collection |
| Nexus | Multi-branch Excel trackers | Day-to-day school office work |

---

## 2. Admin — `/products/admin`

**Tagline:** Institute operations console  
**Users:** Institute admin, principal, accountant, front office  

**Capabilities (public):**

- People: students, teachers, parents  
- Academics: classes, attendance, timetable, exams  
- Operations: fees, documents, complaints, announcements  
- Transport assignment (when the module is on)  
- Admissions and careers (when enabled for the institute)

**Narrative:** Admin is where the institute writes the source of truth. Connect only shows what each role is allowed to see.

**CTA:** View Admin demo → `/demos?product=admin`  
Secondary: Download Android → `/download#admin`

---

## 3. Connect — `/products/connect`

**Tagline:** Education ecosystem for parents, teachers, and students  
**Users:** Parent, teacher, student  

**Capabilities:**

- Role-isolated login (institute → portal → credentials → OTP)  
- Parent: multi-child, attendance, fees, messages, complaints  
- Teacher: class attendance, assignments, timetable  
- Student: timetable, marks, profile, ID  
- Transport status for linked children when Transport is active  

**Narrative:** One app, three roles, no shared navigation. Mobile-first.

**CTA:** View Connect demo → `/demos?product=connect`

---

## 4. Transport — `/products/transport`

**Tagline:** Fleet and route intelligence  
**Users:** Driver, transport coordinator; parents track via Connect  

**Capabilities:**

- Routes, stops, vehicles, drivers  
- Daily trip execution and student boarding  
- Delay / status for operations  
- Incidents  
- Admin assigns students to routes; Connect shows parent view  

**Honesty:** Public copy should describe **operations and status**, not promise production telematics until that integration ships.

**CTA:** View Transport demo → `/demos?product=transport`

---

## 5. Nexus — `/products/nexus`

**Tagline:** Institute intelligence center  
**Users:** LumenX platform operators, group / trust heads  

**Capabilities:**

- Multi-institute directory and onboarding  
- Subscription, billing, renewals  
- Module activation for an institute  
- Cross-tenant health and support  

**Narrative:** Nexus configures and observes. Admin executes. A single school may never log into Nexus; a group will.

**CTA:** View Nexus demo → `/demos?product=nexus`  
Do not offer a public Android download for Nexus unless a build exists (W1: web only).

---

## 6. Cross-links

Each product page ends with “Also in the ecosystem” (the other three). Footer repeats the four.
