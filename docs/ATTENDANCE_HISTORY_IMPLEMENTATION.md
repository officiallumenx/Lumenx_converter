# Attendance Configuration History — Implementation Summary

## Goal

Changing **Attendance Method** must never modify historical attendance. Every configuration has an **Effective From** date. Reports (**Attendance %**, **Working Days**) stay accurate across mid-year method changes.

## Example chain

| Effective From | Method | Applies |
|----------------|--------|---------|
| 2026-04-01 | Daily | Apr → May |
| 2026-06-01 | Morning + Afternoon | Jun → Aug |
| 2026-09-01 | Period Wise | Sep onwards |

June marks stay Morning + Afternoon after September switches to Period Wise.

## Rules

1. **Append-only config** — `appendAttendanceConfig` adds a version; history rows are never edited or deleted.
2. **Effective From required** — every version has `effectiveFrom`; active rules = latest version with `effectiveFrom ≤ date` (scoped).
3. **Frozen registers** — each submitted slot freezes `method`, `owner`, `configVersionId`, slot identity. Re-save cannot rewrite policy fields.
4. **Historical day resolve** — submitted registers win; unmarked days fall back to config effective that day.
5. **Reports** — `buildAttendanceHistoryReport` computes Working Days and Attendance % per day using frozen/config method; method segments span June MA → September Period Wise correctly.

## Admin UI

- **Attendance Configuration** (Settings / Academic Management) — save new version with Effective From.
- **Configuration History** — chronological timeline with applicability ranges (`buildConfigHistoryTimeline`).

## Engine files

| File | Role |
|------|------|
| `config-store.ts` | Append-only Effective From versions |
| `register-store.ts` | Freeze policy fields on upsert |
| `history.ts` | Historical day resolve + config timeline |
| `reports.ts` | Attendance % · Working Days · method segments |
| `history-verify.ts` | Integrity checks |
| `AttendanceConfigurationHistory.tsx` | Admin history timeline |

## Verification

```bash
npx tsx packages/module-attendance/scripts/run-history-verify.ts
```

Asserts: config append leaves registers untouched; July stays Morning+Afternoon; September stays Period Wise; resave cannot rewrite frozen method; reports retain both method segments.
