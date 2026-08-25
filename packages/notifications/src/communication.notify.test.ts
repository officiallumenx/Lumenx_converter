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

vi.stubGlobal("window", {
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

describe("communication notifications (phase 5)", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("pushes admissions lifecycle into portal key + foundation", async () => {
    const { notifyAdmissionsLifecycle, ADMISSIONS_NOTIFICATIONS_KEY } = await import(
      "./admissions/notify"
    );
    const result = notifyAdmissionsLifecycle({
      event: "interview",
      applicantId: "parent-1",
      applicationId: "ADM-1",
      studentName: "Asha",
      detail: "Entrance test on Monday",
    });
    expect(result.portal.title.toLowerCase()).toContain("interview");
    expect(result.foundation.category).toBe("admissions");
    expect(result.foundation.metadata?.applicationId).toBe("ADM-1");
    const stored = JSON.parse(memory.get(ADMISSIONS_NOTIFICATIONS_KEY)!) as unknown[];
    expect(stored.length).toBe(1);
  });

  it("pushes careers shortlist / reject lifecycle", async () => {
    const { notifyCareersLifecycle, CAREERS_NOTIFICATIONS_KEY } = await import("./careers/notify");
    notifyCareersLifecycle({
      event: "shortlisted",
      candidateId: "cand-1",
      applicationId: "JOB-1",
      jobTitle: "Math Teacher",
      instituteName: "LumenX",
    });
    notifyCareersLifecycle({
      event: "rejected",
      candidateId: "cand-1",
      applicationId: "JOB-2",
      jobTitle: "Science Teacher",
      instituteName: "LumenX",
    });
    const stored = JSON.parse(memory.get(CAREERS_NOTIFICATIONS_KEY)!) as Array<{ title: string }>;
    expect(stored.some((n) => n.title.toLowerCase().includes("shortlisted"))).toBe(true);
    expect(stored.some((n) => n.title.toLowerCase().includes("not selected"))).toBe(true);
  });

  it("publishes broadcast with sender, audience, priority, optional attachment", async () => {
    const { publishBroadcastNotification } = await import("./announcements/notify");
    const { loadBroadcastInbox } = await import("@lumenx/utils");
    const result = publishBroadcastNotification({
      title: "PTM Saturday",
      message: "Parents meeting at 10 AM",
      audienceLabel: "All Parents",
      audienceKind: "parents",
      priority: "high",
      sender: "Admin",
      attachmentName: "ptm.pdf",
      href: "/events",
    });
    expect(result.foundation.category).toBe("announcements");
    expect(result.broadcast.sender).toBe("Admin");
    expect(result.broadcast.attachmentName).toBe("ptm.pdf");
    expect(loadBroadcastInbox()[0]?.title).toBe("PTM Saturday");
  });

  it("builds DM pointer without embedding full message body", async () => {
    const { notifyDirectMessage } = await import("./messages/notify");
    const result = notifyDirectMessage({
      messageId: "msg-9",
      threadId: "thread-9",
      senderName: "Ms. Rao",
      subjectPreview: "Homework reminder",
      recipientRole: "parent",
    });
    expect(result.appNotification.href).toBe("/messages");
    expect(result.foundation.metadata?.messageId).toBe("msg-9");
    expect(result.foundation.metadata?.threadId).toBe("thread-9");
    expect(result.appNotification.desc).toContain("Homework reminder");
    expect(result.appNotification.detail).not.toMatch(/full body secret/);
  });
});
