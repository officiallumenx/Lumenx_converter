import { describe, expect, it } from "vitest";
import {
  attentionTotalCount,
  buildNeedsAttentionItems,
} from "./attention";

describe("buildNeedsAttentionItems", () => {
  it("returns empty when nothing is actionable", () => {
    expect(buildNeedsAttentionItems({})).toEqual([]);
    expect(buildNeedsAttentionItems({ submittedMarks: 0, pendingLeave: 0 })).toEqual([]);
  });

  it("prefers pending-reviews marks over widget marks (dedupe)", () => {
    const items = buildNeedsAttentionItems({
      submittedMarks: 3,
      marksPendingWidgetCount: 3,
    });
    expect(items.filter((i) => i.id === "marks-review")).toHaveLength(1);
    expect(items[0]?.count).toBe(3);
  });

  it("uses widget marks when review queue is empty", () => {
    const items = buildNeedsAttentionItems({
      marksPendingWidgetCount: 2,
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("marks-review");
    expect(items[0]?.count).toBe(2);
  });

  it("sorts critical transport emergencies first", () => {
    const items = buildNeedsAttentionItems({
      pendingLeave: 2,
      transportEmergencyCount: 1,
      attendanceDraftCount: 4,
    });
    expect(items[0]?.id).toBe("transport-sos");
    expect(items[0]?.severity).toBe("critical");
    expect(attentionTotalCount(items)).toBe(7);
  });

  it("includes review queues with routes", () => {
    const items = buildNeedsAttentionItems({
      openComplaints: 1,
      pendingAdmissionConverts: 2,
      pendingCareerHires: 1,
      pendingTransportStops: 1,
      diaryMissingYesterdayCount: 5,
    });
    const ids = items.map((i) => i.id);
    expect(ids).toContain("complaints");
    expect(ids).toContain("admissions");
    expect(ids).toContain("careers");
    expect(ids).toContain("transport-stops");
    expect(ids).toContain("diary-missing");
    expect(items.find((i) => i.id === "admissions")?.to).toBe("/admissions");
  });
});
