import { describe, expect, it } from "vitest";
import {
  attentionTotalCount,
  buildNeedsAttentionItems,
  resolveAttentionDisplayMode,
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

  it("shows summary-derived leave/complaints without widget counts (partial load)", () => {
    const partial = buildNeedsAttentionItems({
      pendingLeave: 2,
      openComplaints: 1,
      // widgets not ready — omit, do not invent zeros as confirmed rows
      attendanceDraftCount: undefined,
      diaryMissingYesterdayCount: undefined,
      marksPendingWidgetCount: undefined,
    });
    expect(partial.map((i) => i.id)).toEqual(["leave", "complaints"]);
    expect(attentionTotalCount(partial)).toBe(3);

    const final = buildNeedsAttentionItems({
      pendingLeave: 2,
      openComplaints: 1,
      attendanceDraftCount: 4,
      diaryMissingYesterdayCount: 5,
      marksPendingWidgetCount: 0,
    });
    expect(final.map((i) => i.id).sort()).toEqual(
      ["attendance-drafts", "complaints", "diary-missing", "leave"].sort(),
    );
    expect(attentionTotalCount(final)).toBe(12);
    // Same ids as partial plus new ones — no duplicate leave/complaints rows
    expect(final.filter((i) => i.id === "leave")).toHaveLength(1);
    expect(final.filter((i) => i.id === "complaints")).toHaveLength(1);
  });
});

describe("resolveAttentionDisplayMode", () => {
  it("uses skeleton while summary is loading and there are no items", () => {
    expect(
      resolveAttentionDisplayMode({
        summaryLoading: true,
        widgetsLoading: true,
        itemCount: 0,
      }),
    ).toBe("skeleton");
  });

  it("uses partial-empty when summary is ready but widgets are still loading", () => {
    expect(
      resolveAttentionDisplayMode({
        summaryLoading: false,
        widgetsLoading: true,
        itemCount: 0,
      }),
    ).toBe("partial-empty");
  });

  it("uses ready-empty only after summary and widgets settle with no items", () => {
    expect(
      resolveAttentionDisplayMode({
        summaryLoading: false,
        widgetsLoading: false,
        itemCount: 0,
      }),
    ).toBe("ready-empty");
  });

  it("uses list as soon as any items exist, even while widgets are loading", () => {
    expect(
      resolveAttentionDisplayMode({
        summaryLoading: false,
        widgetsLoading: true,
        itemCount: 2,
      }),
    ).toBe("list");
    expect(
      resolveAttentionDisplayMode({
        summaryLoading: true,
        widgetsLoading: true,
        itemCount: 1,
      }),
    ).toBe("list");
  });
});
