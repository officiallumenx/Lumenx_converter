import { describe, expect, it } from "vitest";
import {
  deadlinePriorityFromDueAt,
  escalatePriorityFromDueAt,
  notificationEntityPayload,
} from "./deadline-priority";

describe("deadlinePriorityFromDueAt", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("maps far-away due dates to normal", () => {
    expect(deadlinePriorityFromDueAt("2026-10-01", now)).toBe("normal");
  });

  it("maps within 3 days to important", () => {
    expect(deadlinePriorityFromDueAt("2026-09-23T12:00:00.000Z", now)).toBe("important");
  });

  it("maps within 24 hours and past due to critical", () => {
    expect(deadlinePriorityFromDueAt("2026-09-22T00:00:00.000Z", now)).toBe("critical");
    expect(deadlinePriorityFromDueAt("2026-09-20T12:00:00.000Z", now)).toBe("critical");
  });
});

describe("escalatePriorityFromDueAt", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("does not downgrade stored critical or rewrite success", () => {
    expect(escalatePriorityFromDueAt("critical", "2026-12-01", now)).toBe("critical");
    expect(escalatePriorityFromDueAt("success", "2026-09-20", now)).toBe("success");
  });

  it("escalates normal when due soon", () => {
    expect(escalatePriorityFromDueAt("normal", "2026-09-22T00:00:00.000Z", now)).toBe(
      "critical",
    );
  });
});

describe("notificationEntityPayload", () => {
  it("sets entityType and entityId", () => {
    expect(notificationEntityPayload("homework", "hw-1", { kind: "published" })).toEqual({
      entityType: "homework",
      entityId: "hw-1",
      kind: "published",
    });
  });
});
