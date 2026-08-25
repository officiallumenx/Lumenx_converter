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

describe("Phase 8 — complaints / documents / certificates / system", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("notifies requester through complaint lifecycle including rejection reason", async () => {
    const { notifyComplaintSubmitted, notifyComplaintLifecycle, listPhase8Inbox } =
      await import("./index");
    notifyComplaintSubmitted({
      complaintId: "CMP-1",
      title: "Bus delay",
      requesterRole: "Parent",
    });
    notifyComplaintLifecycle({
      complaintId: "CMP-1",
      title: "Bus delay",
      stage: "under_review",
      requesterRole: "Parent",
    });
    notifyComplaintLifecycle({
      complaintId: "CMP-1",
      title: "Bus delay",
      stage: "rejected",
      requesterRole: "Parent",
      reason: "Outside policy",
    });
    const parent = listPhase8Inbox("parent");
    expect(parent.some((n) => n.id.includes("complaint-received"))).toBe(true);
    expect(parent.some((n) => n.id.includes("complaint-under_review"))).toBe(true);
    expect(parent.some((n) => n.desc.toLowerCase().includes("outside policy"))).toBe(true);
  });

  it("notifies document approve / reject / ready with deep links", async () => {
    const {
      notifyDocumentRequestApproved,
      notifyDocumentRequestRejected,
      notifyDocumentReady,
      listPhase8Inbox,
    } = await import("./index");
    notifyDocumentRequestApproved({
      requestId: "REQ-1",
      documentLabel: "TC",
      studentName: "Asha",
    });
    notifyDocumentRequestRejected({
      requestId: "REQ-2",
      documentLabel: "Bonafide",
      reason: "Incomplete form",
      studentName: "Asha",
    });
    notifyDocumentReady({
      requestId: "REQ-1",
      documentId: "DOC-9",
      documentLabel: "TC",
      studentName: "Asha",
    });
    const rows = listPhase8Inbox("parent");
    expect(rows.some((n) => n.href?.includes("requestId=REQ-1"))).toBe(true);
    expect(rows.some((n) => n.href?.includes("id=DOC-9"))).toBe(true);
    expect(rows.some((n) => n.desc.toLowerCase().includes("incomplete"))).toBe(true);
  });

  it("notifies certificate issued/published", async () => {
    const { notifyCertificateIssued, notifyCertificatePublished, listPhase8Inbox } =
      await import("./index");
    notifyCertificateIssued({
      certificateId: "CERT-1",
      certificateName: "Merit",
      studentName: "Asha",
      certificateNumber: "M-001",
    });
    notifyCertificatePublished({
      certificateId: "CERT-1",
      certificateName: "Merit",
      studentName: "Asha",
    });
    expect(listPhase8Inbox("student").some((n) => n.href?.includes("CERT-1"))).toBe(true);
    expect(listPhase8Inbox("parent").some((n) => n.id.includes("cert-issued"))).toBe(true);
  });

  it("keeps system notifications minimal and persistent (not toast-only)", async () => {
    const {
      notifySystemOpsCritical,
      notifyAccountSecurityChange,
      notifyMaintenance,
      listPhase8Inbox,
    } = await import("./index");
    notifySystemOpsCritical({ title: "Campus closed", message: "Storm warning" });
    notifyAccountSecurityChange({ message: "PIN updated" });
    notifyMaintenance({ title: "Weekend window", message: "Sat 2–4 AM" });
    expect(listPhase8Inbox("admin").some((n) => n.desc.includes("PIN"))).toBe(true);
    expect(listPhase8Inbox("parent").some((n) => n.title.toLowerCase().includes("alert"))).toBe(
      true,
    );
    expect(listPhase8Inbox("institute").length).toBeGreaterThan(0);
  });
});
