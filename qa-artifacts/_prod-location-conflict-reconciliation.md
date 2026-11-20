# Production legacy location asymmetries — reconciliation worksheet

**Read-only.** No production records were changed.  
**Source inventory:** `qa-artifacts/_prod-location-conflict-inventory.json`  
**Enriched:** 2026-11-01 via production `SELECT` (stop names joined).  
**Project:** LumenX / `kmpzflsurepjwqnfqyld`

Common-location product rule (for later operator decisions only): one stop for pickup and drop.  
`resolveCommonLocationStopId` prefers **pickup when set**, else **drop**.  
**Do not invent** a common location. Preserve both sides until an owner confirms.

---

## Summary

| # | Enrollment | Kind | Pickup | Drop | Auto-determinable common location? | Owner decision needed? |
|---|------------|------|--------|------|------------------------------------|------------------------|
| 1 | `1c34f730-…` | null pickup + drop | *(none)* | Narendra center | **Candidate:** drop only (pickup null) | Confirm whether drop should become the common location |
| 2 | `35832608-…` | null pickup + drop | *(none)* | Narendra center | **Candidate:** drop only | Same as #1 |
| 3 | `5a79ee07-…` | **true conflict** | E2E Gate | E2E School | **No** — both set and differ | Explicit choose Gate vs School (or a third stop) |
| 4 | `83f61528-…` | null pickup + drop | *(none)* | E2E School | **Candidate:** drop only | Confirm School as common |
| 5 | `f0966e17-…` | null pickup + drop | *(none)* | School | **Candidate:** drop only | Confirm School as common |

---

## Record 1

| Field | Value |
|-------|--------|
| Enrollment ID | `1c34f730-5c18-4fa2-ab3f-13dd816d6819` |
| Institute ID | `107dc3de-2d23-4400-aef4-f22fc9dd179d` |
| Student ID | `e4440ad9-14ce-401e-bd29-f89b3d9ded41` |
| Route ID | `fdb2dcd1-0db6-4421-b5ff-3c695cd23584` |
| Existing pickup | **null** (no stop) |
| Existing drop | `02ee5824-d11d-4dd4-b3c1-081a0b5ee8f7` — **Narendra center** (`16.75438, 81.68638`) |
| Conflict? | Asymmetry (missing pickup), not two competing non-null stops |
| Common location determinable? | Only as a **proposal**: use drop (Narendra center). Not confirmed. |
| Business decision required | Confirm dual-write of Narendra center to both sides, or assign a different stop |

---

## Record 2

| Field | Value |
|-------|--------|
| Enrollment ID | `35832608-5b62-4939-9409-c2ae408b3e95` |
| Institute ID | `107dc3de-2d23-4400-aef4-f22fc9dd179d` |
| Student ID | `904b36ac-0e1a-4b29-9b6d-afcb39026c07` |
| Route ID | `fdb2dcd1-0db6-4421-b5ff-3c695cd23584` |
| Existing pickup | **null** |
| Existing drop | `02ee5824-…` — **Narendra center** |
| Conflict? | Asymmetry (missing pickup) |
| Common location determinable? | Proposal only: Narendra center |
| Business decision required | Same confirmation as Record 1 |

---

## Record 3 — TRUE CONFLICT

| Field | Value |
|-------|--------|
| Enrollment ID | `5a79ee07-1421-42bc-a042-df7d3820b96b` |
| Institute ID | `4124db7c-ddd0-4bf1-947f-f41088326787` |
| Student ID | `874aa099-b711-4e01-8c71-18cd7a3319ac` |
| Route ID | `00763f6f-7922-49b8-9ace-1057d0a12339` |
| Existing pickup | `fee5403d-5c44-4d42-8414-73f80410ca6c` — **E2E Gate** |
| Existing drop | `424e5160-b0c8-4306-81a6-b3527f87403f` — **E2E School** |
| Conflict? | **Yes** — both non-null and different |
| Common location determinable? | **No** without discarding one historical side |
| Read-path behavior today | Prefer pickup → **E2E Gate** for “common” display |
| Business decision required | Owner must choose: keep Gate, keep School, or pick another stop. Do not auto-merge. |

---

## Record 4

| Field | Value |
|-------|--------|
| Enrollment ID | `83f61528-9abe-4c17-8e8b-f22022a9dfc5` |
| Institute ID | `4124db7c-ddd0-4bf1-947f-f41088326787` |
| Student ID | `8eb2dfa5-9429-49b3-9666-f7818884a13b` |
| Route ID | `00763f6f-7922-49b8-9ace-1057d0a12339` |
| Existing pickup | **null** |
| Existing drop | `424e5160-…` — **E2E School** |
| Conflict? | Asymmetry (missing pickup) |
| Common location determinable? | Proposal only: E2E School |
| Business decision required | Confirm School as common location |

---

## Record 5

| Field | Value |
|-------|--------|
| Enrollment ID | `f0966e17-4c55-484c-af20-2f98db21d67a` |
| Institute ID | `107dc3de-2d23-4400-aef4-f22fc9dd179d` |
| Student ID | `24a51a2b-9ce3-422f-8b08-18ea47ce164c` |
| Route ID | `fdb2dcd1-0db6-4421-b5ff-3c695cd23584` |
| Existing pickup | **null** |
| Existing drop | `60cbced4-9c1c-42d4-8fe3-80e2c13f6e2b` — **School** (`School · 16.76259, 81.67940`) |
| Conflict? | Asymmetry (missing pickup) |
| Common location determinable? | Proposal only: School |
| Business decision required | Confirm School as common location |

---

## Preservation rule

- Migration `20261101140000` **must not** rewrite these rows.
- No bulk UPDATE to force `pickup = drop` without explicit authorization per enrollment (or documented institute policy).
- After migration, dual-write occurs only when drivers/admins intentionally change location.
