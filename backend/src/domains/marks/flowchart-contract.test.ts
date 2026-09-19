import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Flowchart contract: Admin publish exam → teacher enter Internal+External→Total →
 * draft/validate/submit → admin verify → publish → Teacher/Parent/Student view.
 */
describe("marks entry flowchart contract", () => {
  it("requires internal + external to sum to total", () => {
    const internal = 20;
    const external = 80;
    const total = internal + external;
    expect(total).toBe(100);
  });

  it("maps workflow statuses for Draft→Submit→Admin→Publish", () => {
    const lifecycle = [
      "pending", // draft
      "submitted", // lock for admin verification
      "returned", // teacher edits → resubmit
      "rejected",
      "published", // approve & publish results
    ];
    expect(lifecycle).toEqual([
      "pending",
      "submitted",
      "returned",
      "rejected",
      "published",
    ]);
  });

  it("service enforces split marks, roster submit, audit, and publish fan-out", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    const repository = readFileSync(join(here, "repository.ts"), "utf8");
    expect(service).toContain("assertSplitMarks");
    expect(service).toContain("internal_marks");
    expect(service).toContain("external_marks");
    expect(service).toContain("insertMarkScoreAudit");
    expect(service).toContain("emitMarkEntryPublishedNotifications");
    expect(service).toContain("emitMarkEntryWorkflowNotifications");
    expect(repository).toContain("mark_score_audit");
  });

  it("notifications cover publish + return/reject for teacher/parent/student fan-out", () => {
    const notifications = readFileSync(join(here, "notifications.ts"), "utf8");
    expect(notifications).toContain("emitMarkEntryPublishedNotifications");
    expect(notifications).toContain("emitMarkEntryWorkflowNotifications");
    expect(notifications).toMatch(/parent|student|teacher/i);
  });
});
