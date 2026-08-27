import { describe, expect, it } from "vitest";
import { complaintDtoToListItem, complaintDtosToListItems } from "./map";
import type { ComplaintDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ComplaintDto> = {}): ComplaintDto {
  return {
    id: "cmp-1",
    instituteId: INST,
    title: "HVAC issue",
    body: "Block B too warm",
    category: "Parent",
    priority: "high",
    status: "pending",
    destination: "principal_admin",
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    studentId: null,
    teacherId: null,
    responseNote: null,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("complaint DTO mapping", () => {
  it("maps pending DTO to list item", () => {
    const item = complaintDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "cmp-1",
      title: "HVAC issue",
      role: "Parent",
      priority: "High",
      status: "pending",
      destination: "principal_admin",
      body: "Block B too warm",
    });
    expect(item?.from).toMatch(/^User bbbbbbbb/);
  });

  it("maps forwarded to review and closed to resolved", () => {
    expect(complaintDtoToListItem(dto({ status: "forwarded" }))?.status).toBe(
      "review",
    );
    expect(complaintDtoToListItem(dto({ status: "closed" }))?.status).toBe(
      "resolved",
    );
  });

  it("skips draft and archived", () => {
    expect(complaintDtoToListItem(dto({ status: "draft" }))).toBeNull();
    expect(complaintDtoToListItem(dto({ status: "archived" }))).toBeNull();
  });

  it("filters skipped statuses from list mapping", () => {
    const items = complaintDtosToListItems([
      dto({ id: "1", status: "pending" }),
      dto({ id: "2", status: "archived" }),
      dto({ id: "3", status: "rejected" }),
    ]);
    expect(items.map((i) => i.id)).toEqual(["1", "3"]);
  });
});
