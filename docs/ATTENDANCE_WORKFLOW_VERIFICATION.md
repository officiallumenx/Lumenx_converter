# Attendance Workflow Verification Report

Generated: 2026-07-28T14:36:38.713Z

**Result:** PASS · 19 passed · 0 failed

## Engine rules

| Attendance Method | Slots produced |
|-------------------|----------------|
| Daily | 1 · Full day (`slot:day`) |
| Morning First | 1 · Morning first (`slot:morning-first`) |
| Morning + Afternoon | 2 · Morning, Afternoon |
| Period Wise | N · one per timetable period |

| Attendance Owner | Who may mark |
|------------------|--------------|
| Class Teacher | Class teacher of the section — all slots |
| Current Period Teacher | Assigned section teachers; period slots filtered by subject |
| Attendance Coordinator | Coordinator only — all slots |

## Case results

| Case | Status | Detail |
|------|--------|--------|
| `daily-class_teacher-ct` | PASS | OK · slots=1 markable=1 |
| `daily-class_teacher-other` | PASS | OK · slots=1 markable=0 |
| `daily-period_teacher-assigned` | PASS | OK · slots=1 markable=1 |
| `daily-incharge` | PASS | OK · slots=1 markable=1 |
| `daily-incharge-blocked-ct` | PASS | OK · slots=1 markable=0 |
| `ma-class_teacher` | PASS | OK · slots=2 markable=2 |
| `ma-period_teacher` | PASS | OK · slots=2 markable=2 |
| `ma-incharge` | PASS | OK · slots=2 markable=2 |
| `period-class_teacher-all` | PASS | OK · slots=3 markable=3 |
| `period-period_teacher-math-only` | PASS | OK · slots=3 markable=1 |
| `period-incharge-all` | PASS | OK · slots=3 markable=3 |
| `period-other-blocked` | PASS | OK · slots=3 markable=0 |
| `period-no-timetable-periods` | PASS | OK · slots=0 markable=0 |
| `mf-class_teacher` | PASS | OK · slots=1 markable=1 |
| `mf-cpt-math-blocked` | PASS | OK · slots=1 markable=0 |
| `mf-cpt-english-ok` | PASS | OK · slots=1 markable=1 |
| `mf-incharge` | PASS | OK · slots=1 markable=1 |
| `mf-incharge-blocked-ct` | PASS | OK · slots=1 markable=0 |
| `history-slot-identity-stable` | PASS | OK · daily / morning-first / morning+afternoon use distinct slot shapes |

## Notes

- One engine: `createAttendanceWorkflow` (config + actor + periods) → all methods & owners.
- `openAttendanceWorkflow` only resolves live config, then calls the same factory.
- Method → slots; owner → markable slots. Apps must not duplicate either.
- Registers freeze `method`, `owner`, and `configVersionId` at save time so mid-year config changes never rewrite history.
