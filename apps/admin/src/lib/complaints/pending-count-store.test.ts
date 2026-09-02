import { describe, expect, it } from "vitest";
import { countAdminComplaintsFromDtos } from "./pending-count-store";
import type { ComplaintDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(status: ComplaintDto["status"], destination: ComplaintDto["destination"]): ComplaintDto {
  return {
    id: "cmp-1",
    instituteId: INST,
    title: "Test",
    body: "Body long enough",
    category: "general",
    priority: "medium",
    status,
    destination,
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    studentId: null,
    teacherId: null,
    responseNote: null,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  };
}

describe("countAdminComplaintsFromDtos", () => {
  it("counts principal admin queue items that are still open", () => {
    const count = countAdminComplaintsFromDtos([
      dto("pending", "principal_admin"),
      dto("review", "principal_admin"),
      dto("forwarded", "principal_admin"),
      dto("resolved", "principal_admin"),
      dto("pending", "class_teacher"),
    ]);
    expect(count).toBe(3);
  });
});
