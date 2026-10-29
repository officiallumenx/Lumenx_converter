# LumenX Connect — Final Critical-Path Latency Report

**Date:** 2026-10-29  
**Verification mode:** Read-only target verification — no application code, config, dependency, or test changes; no deploy/commit/push/migrations/production  
**Environment:** Local Connect `:5174` + local API `:8787` → staging Supabase `yveadybpntziyryxsrsu`  
**Accounts:** Synthetic E2E `9000000091` / `9000000092` / `9000000093`  
**Overall status:** **PARTIAL — MIXED OR INSUFFICIENT EVIDENCE**

Parent and Student cold usable Home improved under comparable measurement. Teacher cold usable did **not** improve (flat within run noise; staging API RTT remains dominant). No fixed numeric “target threshold” exists in the prior reports beyond beating prior cold usable medians.

This is **not** production performance verification.

---

## 0. Verification summary (this pass)

| Item | Result |
|------|--------|
| Final measurement source | `qa-artifacts/connect-browser-final-latency-raw.json` (`finishedAt`: 2026-10-29T12:16:01.338Z); console summary in terminal run of `_final-latency-connect-browser-verify.mjs` |
| Benchmark rerun | **Not required** — complete 3-run/role raw JSON + screenshots already present |
| Methodology match | Same harness family as low-latency: IDB/RQ clear, keep auth, cold `/`, identical usable selectors |
| Teacher vs readiness / low-latency | **Unchanged** |
| Parent / Student | **Improved** (both baselines) |
| Request reduction | Separate outcome — Parent/Student counts lower; not treated as proof of latency |

---

## 1. Measurement methodology and evidence sources

### Harness

| Item | Detail |
|------|--------|
| Script | `qa-artifacts/_final-latency-connect-browser-verify.mjs` (cloned from `_low-latency-connect-browser-verify.mjs`) |
| Cold method | Login → clear TanStack Query memory + IDB persist (auth kept) → new page → `goto /` |
| Teacher usable | First match: `you have N class(es) today` (or load-error copy) |
| Parent / Student usable | First match: `Good morning\|Good afternoon\|Good evening` |
| Runs | **3** cold runs per role |
| Request window | API calls observed until usable + settle (Teacher **3 s**, Parent/Student **2 s**) |
| Warm | Teacher warm restore measured separately (`teacherWarmRestore.usableMs`) |

### Evidence artifacts

| Artifact | Role |
|----------|------|
| `qa-artifacts/connect-browser-final-latency-raw.json` | **Authoritative final timings** |
| `qa-artifacts/connect-browser-final-latency/*.png` | Cold Home screenshots |
| `qa-artifacts/connect-browser-low-latency-raw.json` | Immediate prior comparable medians |
| `qa-artifacts/connect-final-readiness-report.md` | Historical readiness baseline (Teacher 3 880; Parent ~7 500; Student ~5 400) |
| `qa-artifacts/connect-low-latency-optimization-report.md` | Low-latency medians 3 897 / 8 022 / 6 934 |
| `qa-artifacts/connect-phase6-critical-path-performance-report.md` | Earlier Phase 6 context (Teacher median then ~14 308 ms) |

### Comparability

| Factor | Readiness → Final | Low-latency → Final |
|--------|-------------------|---------------------|
| Environment | Local Connect + local API → same staging Supabase | Same |
| Accounts | Synthetic E2E phones | Same |
| Cache state | Cold = cleared RQ/IDB, auth kept | Same |
| Usable selectors | Same hero text gates | Same |
| Caveat | Parent/Student **product** path now paints greeting before full widgets; harness selector unchanged, so time-to-greeting is comparable | Same caveat |
| Caveat | Request totals can under-count late background GETs when usable fires earlier under fixed settle | Same |

Formula used:  
**Percentage improvement = ((baseline median − final median) / baseline median) × 100**  
Positive = improvement; negative = slower than baseline.

---

## 2. Final comparison table

### A. Vs readiness / Prompt-1 historical baseline

| Portal | Baseline median | Final median (range) | Δ ms | Improvement % | Assessment |
|--------|----------------:|---------------------:|-----:|--------------:|------------|
| Teacher | **3 880 ms** | **3 944 ms** (3 369–4 488) | **+64** | **−1.6%** | **Unchanged** |
| Parent | **~7 500 ms** | **4 875 ms** (4 873–5 458) | **−2 625** | **+35.0%** | **Improved** |
| Student | **~5 400 ms** | **2 871 ms** (2 853–2 875) | **−2 529** | **+46.8%** | **Improved** |

Readiness footnotes (same report family): Parent confirmation single-run **7 481 ms**; Student confirmation **6 480 ms**. Using the user’s stated approximate baselines (~7 500 / ~5 400) for the primary table. Against the Student confirmation 6 480 ms, final 2 871 ms is still **+55.7%** improvement.

### B. Vs latest prior measured set (low-latency pass)

| Portal | Prior median (range) | Final median (range) | Δ ms | Improvement % | Assessment |
|--------|---------------------:|---------------------:|-----:|--------------:|------------|
| Teacher | **3 897 ms** (3 353–4 893) | **3 944 ms** (3 369–4 488) | **+47** | **−1.2%** | **Unchanged** |
| Parent | **8 022 ms** (7 953–8 430) | **4 875 ms** (4 873–5 458) | **−3 147** | **+39.2%** | **Improved** |
| Student | **6 934 ms** (6 433–6 934) | **2 871 ms** (2 853–2 875) | **−4 063** | **+58.6%** | **Improved** |

Teacher ranges heavily overlap; the +47 / +64 ms median moves are treated as run-to-run noise, not a regression claim.

### Per-portal detail (final raw runs)

| Portal | Run usable ms | Median | Failed | Notable dupes |
|--------|---------------|--------|--------|---------------|
| Teacher | 4488, 3369, 3944 | 3944 | 0 / 0 / 0 | assignment/subject **0**; `portal/me` **1**; notifications sometimes ×2 (non-shell) |
| Parent | 5458, 4875, 4873 | 4875 | 0 / 0 / 0 | notifications **0**; `/students/:id` **0** |
| Student | 2871, 2875, 2853 | 2871 | 0 / 0 / 0 | notifications **0**; placeholder labels **false** |

---

## 3. API request and failure comparisons

Request reduction is reported **separately** from latency (not used as proof of faster usable paint).

| Portal | Readiness reqs | Low-latency reqs | Final reqs | Failed (final) |
|--------|---------------:|-----------------:|-----------:|---------------:|
| Teacher | 21 | 21 | **21** | **0** |
| Parent | 17 | 15 | **11** | **0** |
| Student | 29 | 28 | **25** | **0** |

| Duplicate / special counts (final medians) | Value |
|--------------------------------------------|-------|
| Teacher assignment dupes | 0 |
| Teacher subjects dupes | 0 |
| Teacher `portal/me` | 1 |
| Parent notifications dupes | 0 |
| Parent `/students/:id` dupes | 0 |
| Student notifications dupes | 0 |

**Limitation:** Final Parent/Student request medians are measured until usable + 2 s. Earlier greeting paint shortens that window vs older slower usable medians, so some background enrich traffic may be excluded from the count.

---

## 4. Warm navigation (separate from cold)

| Measurement | Value | Source |
|-------------|------:|--------|
| Teacher warm restore (final) | **1 350 ms** | `connect-browser-final-latency-raw.json` → `teacherWarmRestore.usableMs` |
| Teacher warm restore (low-latency) | 1 314 ms | low-latency raw |
| Teacher warm restore (readiness confirmation) | 1 821 ms | readiness report |

Warm is **not** averaged into cold medians.

---

## 5. Dominant remaining waits

| Portal | Primary remaining cost | Client vs network |
|--------|------------------------|-------------------|
| Teacher | `GET /me` → `portal/me` (~1.6–2.6 s sample) + parallel catalog/timetable (~1.0–1.5 s each) | **Network/API (staging RTT)** |
| Parent | Greeting now linked-children path; **widgets** still wait on snapshot enrich | Greeting: lighter API path; widgets: network |
| Student | Greeting now profile **base**; enrich (marks/exams/events/…) continues after | Greeting: fewer sequential waits; enrich: network |

Client-side processing remains secondary to staging round-trips (~0.8–1.8 s/request band cited across prior reports).

---

## 6. Quality-check results (final working tree)

| Check | Latest verified result | Evidence |
|-------|------------------------|----------|
| Connect tests | **PASS — 70 files / 225 tests** (~9.26 s in final suite run) | Final tree includes `apps/connect/src/lib/students/load-portal-base.test.ts` (added in critical-path pass; raises count from low-latency **224** → **225**). The pasted **70 / 225** output matches that tree. |
| TypeScript typecheck | **PASS** (`tsc --noEmit` exit 0) | Run after final latency code; exit 0 |
| Lint | **PASS** (0 errors; pre-existing warnings) | Combined lint+build after final edits; exit 0 |
| Production build | **PASS** | Same combined run; Vite/Nitro completed (`✓ built`) |
| `git diff --check` | **PASS** (exit 0) | No conflict/whitespace errors; **CRLF→LF warnings** on unrelated/touched files are **not** failures |
| Synthetic E2E | **PASS** (exit 0) | `STAGING_E2E=1 FINAL_RUNS=3 node qa-artifacts/_final-latency-connect-browser-verify.mjs` → raw JSON `status: "PASS"` |

Other checks were **not** inferred from the test result alone; each has its own recorded exit/output.

---

## 7. Optimizations that produced the Parent/Student gains (context only)

Already landed before this verification (not re-applied here):

1. Parent Home hero from `linkedChildren` without waiting for full snapshot widgets.  
2. Student portal `base` then `enrich` query split; loading gates on base only.  
3. Student Home prefetch no longer re-fetches marks/events.

Teacher had no further safe client critical-path change in the final pass; cold usable stayed ~4 s.

---

## 8. Remaining bottlenecks and limitations

1. **Teacher ~4 s cold usable** is staging-API bound; frontend sequencing for Teacher is already largely exhausted.  
2. Parent/Student **widget** completeness still tracks enrich latency — greeting ≠ full Home healthy.  
3. Approximate readiness Parent/Student baselines (~7 500 / ~5 400) are less precise than Teacher’s 3 880; low-latency 8 022 / 6 934 are the best like-for-like prior set.  
4. Request-count deltas can be inflated by earlier usable + fixed settle.  
5. Synthetic staging only — no production RUM.  
6. Unrelated dirty tree (website / admin-desktop) must not mix into a Connect release without separate review.

---

## 9. Final status

**PARTIAL — MIXED OR INSUFFICIENT EVIDENCE**

| Portal | Verdict |
|--------|---------|
| Teacher | **Unchanged** vs 3 880 and 3 897 baselines |
| Parent | **Improved** (+35.0% vs ~7 500; +39.2% vs 8 022) |
| Student | **Improved** (+46.8% vs ~5 400; +58.6% vs 6 934) |

Evidence supports a **real** cold time-to-greeting improvement for Parent and Student under the shared harness. It does **not** support a Teacher wall-clock win. Remaining absolute latency is primarily **network/API waiting** on staging, not unresolved client sequencing for Teacher shell.

No further optimization cycle started. No deploy/commit/push performed.
