import { describe, expect, it } from "vitest";
import {
  complaintDtoToConnectItem,
  complaintDtoToTeacherItem,
  labelToPriority,
  priorityToLabel,
  splitTeacherComplaints,
  statusToLabel,
  teacherPriorityToApi,
} from "./map";
import type { ComplaintDto } from "./types";

const baseDto = (patch: Partial<ComplaintDto> = {}): ComplaintDto => ({
  id: "ae111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Broken desk",
  body: "Desk leg is loose in room 12",
  category: "Infrastructure",
  priority: "medium",
  status: "pending",
  destination: "class_teacher",
  requestedByUserId: "55555555-5555-4555-8555-555555555555",
  studentId: "ac111111-1111-4111-8111-111111111111",
  teacherId: null,
  responseNote: null,
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  updatedAt: new Date().toISOString(),
  ...patch,
});

describe("connect complaints map", () => {
  it("maps priority and status labels for learner items", () => {
    expect(priorityToLabel("high")).toBe("High");
    expect(labelToPriority("Low")).toBe("low");
    expect(statusToLabel("review")).toBe("Under Review");

    const item = complaintDtoToConnectItem(baseDto({ status: "review", priority: "high" }));
    expect(item.priorityLabel).toBe("High");
    expect(item.statusLabel).toBe("Under Review");
  });

  it("maps teacher item with class inbox flag", () => {
    const teacherOwn = complaintDtoToTeacherItem(
      baseDto({ studentId: null, teacherId: "bb111111-1111-4111-8111-111111111111" }),
    );
    expect(teacherOwn.isClassInbox).toBe(false);

    const inbox = complaintDtoToTeacherItem(baseDto());
    expect(inbox.isClassInbox).toBe(true);
    expect(inbox.status).toBe("open");
  });

  it("maps teacher priority to API values", () => {
    expect(teacherPriorityToApi("urgent")).toBe("high");
    expect(teacherPriorityToApi("normal")).toBe("medium");
  });

  it("splits mine vs class inbox", () => {
    const items = [
      complaintDtoToTeacherItem(baseDto()),
      complaintDtoToTeacherItem(
        baseDto({ studentId: null, teacherId: "bb111111-1111-4111-8111-111111111111" }),
      ),
    ];
    const { mine, classInbox } = splitTeacherComplaints(items);
    expect(mine).toHaveLength(1);
    expect(classInbox).toHaveLength(1);
  });
});
