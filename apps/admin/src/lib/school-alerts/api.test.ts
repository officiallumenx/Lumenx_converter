import { describe, it, expect, vi, beforeEach } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  vi.resetModules();
});

describe("school-alerts api", () => {
  it("posts broadcast with snake_case body", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    const client = {
      post: vi.fn().mockResolvedValue({ alertId: "a1", recipientCount: 3 }),
      get: vi.fn(),
    };
    vi.doMock("@/lib/admin-api", () => ({ getAdminApiClient: () => client }));

    const { broadcastSchoolAlert } = await import("./api");
    await broadcastSchoolAlert({
      instituteId: INST,
      title: "Holiday",
      summary: "Closed tomorrow",
      severity: "mandatory",
      category: "holiday",
      audience: "parents_and_students",
    });

    expect(client.post).toHaveBeenCalledWith("/api/v1/school-alerts/broadcast", {
      institute_id: INST,
      title: "Holiday",
      summary: "Closed tomorrow",
      detail: undefined,
      severity: "mandatory",
      category: "holiday",
      source_label: undefined,
      student_id: undefined,
      audience: "parents_and_students",
    });
  });

  it("lists recent broadcasts with institute_id query", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    const client = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn(),
    };
    vi.doMock("@/lib/admin-api", () => ({ getAdminApiClient: () => client }));

    const { listRecentSchoolAlerts } = await import("./api");
    await listRecentSchoolAlerts(INST, client as never);

    expect(client.get).toHaveBeenCalledWith(
      `/api/v1/school-alerts/recent?institute_id=${INST}`,
    );
  });
});
