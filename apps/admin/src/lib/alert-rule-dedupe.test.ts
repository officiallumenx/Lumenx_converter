import { describe, expect, it } from "vitest";
import {
  attendanceDedupeKey,
  complaintDedupeKey,
  isActiveDedupe,
  reconcileComplaintFires,
  weakPerformanceDedupeKey,
  type AlertFireRecord,
} from "./alert-rule-dedupe";
import { DEMO_COMPLAINTS_SEED } from "./complaints-data";
import { findUnresolvedHighPriorityAdminComplaints } from "./alert-rule-evaluators";

function fire(partial: Partial<AlertFireRecord> & Pick<AlertFireRecord, "dedupeKey">): AlertFireRecord {
  return {
    id: "fire-1",
    ruleId: "3",
    title: "Test",
    at: "2026-08-19T10:00:00.000Z",
    ...partial,
  };
}

describe("alert rule dedupe", () => {
  it("builds stable keys from rule, record, and event/date", () => {
    expect(attendanceDedupeKey("1", "STU-1", "2026-08-19")).toBe(
      "1|student:STU-1|day:2026-08-19",
    );
    expect(weakPerformanceDedupeKey("2", "ST-1", ["EX-UT1", "EX-UT2"])).toBe(
      "2|student:ST-1|exams:EX-UT1+EX-UT2",
    );
    expect(complaintDedupeKey("3", "CMP-201")).toBe("3|complaint:CMP-201");
  });

  it("treats only unresolved keys as active duplicates", () => {
    const key = complaintDedupeKey("3", "CMP-201");
    const rows = [
      fire({ dedupeKey: key, complaintId: "CMP-201" }),
      fire({ dedupeKey: key, complaintId: "CMP-201", resolvedAt: "2026-08-20T10:00:00.000Z" }),
    ];
    expect(isActiveDedupe(rows, key)).toBe(true);
    expect(isActiveDedupe([rows[1]!], key)).toBe(false);
  });

  it("marks complaint fires resolved when the complaint is handled", () => {
    const active = findUnresolvedHighPriorityAdminComplaints(DEMO_COMPLAINTS_SEED);
    const key = complaintDedupeKey("3", "CMP-201");
    const reconciled = reconcileComplaintFires(
      [fire({ dedupeKey: key, complaintId: "CMP-201", ruleId: "3" })],
      active,
      "3",
      "2026-08-19T12:00:00.000Z",
    );
    expect(reconciled[0]?.resolvedAt).toBeUndefined();

    const resolved = reconcileComplaintFires(
      [fire({ dedupeKey: key, complaintId: "CMP-201", ruleId: "3" })],
      [],
      "3",
      "2026-08-19T12:00:00.000Z",
    );
    expect(resolved[0]?.resolvedAt).toBe("2026-08-19T12:00:00.000Z");
  });
});
