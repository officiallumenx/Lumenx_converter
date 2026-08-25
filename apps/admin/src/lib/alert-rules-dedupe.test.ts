import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attendanceDedupeKey,
  complaintDedupeKey,
  isActiveDedupe,
  type AlertFireRecord,
} from "./alert-rule-dedupe";

describe("alert rule duplicate prevention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks a second active fire for the same dedupe key", () => {
    const key = attendanceDedupeKey("1", "STU-1", "2026-08-19");
    const reserve = (fired: AlertFireRecord[]) => {
      if (isActiveDedupe(fired, key)) return null;
      const record: AlertFireRecord = {
        id: "fire-att-STU-1-2026-08-19",
        dedupeKey: key,
        ruleId: "1",
        title: "Low attendance",
        at: "2026-08-19T10:00:00.000Z",
        studentId: "STU-1",
      };
      return record;
    };

    const first = reserve([]);
    expect(first).not.toBeNull();
    const second = reserve(first ? [first] : []);
    expect(second).toBeNull();
  });

  it("allows a new fire after the prior one was resolved", () => {
    const key = complaintDedupeKey("3", "CMP-201");
    const resolved: AlertFireRecord = {
      id: "fire-cmp-CMP-201",
      dedupeKey: key,
      ruleId: "3",
      title: "Handled",
      at: "2026-08-18T10:00:00.000Z",
      complaintId: "CMP-201",
      resolvedAt: "2026-08-19T09:00:00.000Z",
    };
    expect(isActiveDedupe([resolved], key)).toBe(false);
  });

  it("coalesces duplicate schedule calls within the same microtask queue", async () => {
    const calls: number[] = [];
    let queued = false;

    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        calls.push(Date.now());
      });
    };

    schedule();
    schedule();
    schedule();
    await Promise.resolve();
    expect(calls).toHaveLength(1);
  });
});
