import { describe, expect, it } from "vitest";
import {
  compareOpsFlushPriority,
  isCriticalOpsEvent,
} from "./ops-outbox";

describe("Issue 4 — outbox flush priority", () => {
  it("marks boarding/drop/lifecycle as critical and GPS as not", () => {
    expect(isCriticalOpsEvent("boarding")).toBe(true);
    expect(isCriticalOpsEvent("drop")).toBe(true);
    expect(isCriticalOpsEvent("trip_end")).toBe(true);
    expect(isCriticalOpsEvent("gps")).toBe(false);
  });

  it("sorts boarding before GPS even when GPS has an earlier sequence", () => {
    const due = [
      { eventType: "gps" as const, sequence: 1 },
      { eventType: "boarding" as const, sequence: 2 },
      { eventType: "gps" as const, sequence: 3 },
      { eventType: "drop" as const, sequence: 4 },
    ].sort(compareOpsFlushPriority);

    expect(due.map((e) => e.eventType)).toEqual([
      "boarding",
      "drop",
      "gps",
      "gps",
    ]);
  });
});

