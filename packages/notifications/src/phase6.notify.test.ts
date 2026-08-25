import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

describe("phase 6 homework / fees / leave notifications", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("assigns homework to parent + student and cancels reminders after submit", async () => {
    const hw = await import("./homework/notify");
    const assigned = hw.notifyHomeworkAssigned({
      assignmentId: "asg-1",
      title: "Algebra sheet",
      subject: "Math",
      dueDate: "2026-08-25",
      studentId: "S1",
      studentName: "Asha",
    });
    expect(assigned.parent.foundation.audience).toBe("parent");
    expect(assigned.student.foundation.audience).toBe("student");

    const reminder = hw.notifyHomeworkReminder({
      assignmentId: "asg-1",
      title: "Algebra sheet",
      subject: "Math",
      dueDate: "2026-08-25",
      studentId: "S1",
      studentName: "Asha",
    });
    expect(reminder).not.toBeNull();

    const submitted = hw.notifyHomeworkSubmitted({
      assignmentId: "asg-1",
      title: "Algebra sheet",
      subject: "Math",
      studentId: "S1",
      studentName: "Asha",
    });
    expect(submitted.foundation.priority).toBe("success");

    const after = hw.notifyHomeworkReminder({
      assignmentId: "asg-1",
      title: "Algebra sheet",
      subject: "Math",
      dueDate: "2026-08-25",
      studentId: "S1",
    });
    expect(after).toBeNull();

    const notSub = hw.notifyHomeworkNotSubmitted({
      assignmentId: "asg-1",
      title: "Algebra sheet",
      subject: "Math",
      dueDate: "2026-08-25",
      studentId: "S2",
      studentName: "Ravi",
    });
    expect(notSub.foundation.priority).toBe("important");
  });

  it("emits fee lifecycle notifications without payment gateway", async () => {
    const fees = await import("./fees/notify");
    const inbox = await import("./fees/inbox");
    const added = fees.notifyFeeAdded({
      feeLabel: "Lab fee",
      amount: "₹500",
    });
    inbox.pushFeesParentInbox(added.appNotification);
    const paid = fees.notifyFeePaymentReceived({
      feeLabel: "Tuition",
      amount: "₹2,000",
      receiptId: "RCP-1",
      studentId: "S1",
    });
    const receipt = fees.notifyFeeReceiptAvailable({
      feeLabel: "Tuition",
      amount: "₹2,000",
      receiptId: "RCP-1",
      studentId: "S1",
    });
    expect(paid.foundation.priority).toBe("success");
    expect(receipt.appNotification.title.toLowerCase()).toContain("receipt");
    expect(inbox.listFeesParentInbox().length).toBeGreaterThan(0);
  });

  it("notifies leave requesters only and includes rejection reason", async () => {
    const leave = await import("./leave/notify");
    const teacherReq = leave.notifyTeacherOfStudentLeave({
      leaveId: "lv-1",
      studentName: "Asha",
      dateRange: "2026-08-22",
      reason: "Family function",
    });
    expect(teacherReq.foundation.audience).toBe("teacher");

    const rejected = leave.notifyParentLeaveDecision({
      leaveId: "lv-1",
      studentName: "Asha",
      dateRange: "2026-08-22",
      decision: "rejected",
      reason: "Exams week — please reapply",
    });
    expect(rejected.appNotification.desc).toContain("Exams week");

    const admin = leave.notifyAdminOfTeacherLeave({
      leaveId: "tlr-1",
      teacherName: "Ms. Rao",
      leaveType: "casual",
      dateRange: "2026-08-25",
      reason: "Personal",
    });
    expect(admin.foundation.audience).toBe("admin");

    const teacherDecision = leave.notifyTeacherLeaveDecision({
      leaveId: "tlr-1",
      dateRange: "2026-08-25",
      decision: "rejected",
      reason: "Coverage unavailable",
    });
    expect(teacherDecision.foundation.audience).toBe("teacher");
    expect(teacherDecision.appNotification.desc).toContain("Coverage unavailable");
  });
});
